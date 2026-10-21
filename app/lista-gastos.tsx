"use client";

import { useState } from "react";
import { filtroAtivo, filtrarGastos, type FiltroGastos } from "@/lib/filtro";
import { labelCurto } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { CATEGORIAS, corDaCategoria } from "@/lib/categorias";
import { IconeLapis, IconeX } from "./icones";
import { ChipCategoria, ChipPessoa, Vazio, fmt, numero, type Gasto } from "./ui";

/** Quantas linhas aparecem antes do "Ver todas". */
const LINHAS_INICIAIS = 10;

export interface EdicaoGasto {
  nome: string;
  valor: number;
  categoria: string | null;
  dia: number | null;
  pessoa: string | null;
}

export function SelectCategoria({
  value,
  onChange,
  rotulo,
  vazio = "Sem categoria",
}: {
  value: string;
  onChange: (v: string) => void;
  rotulo: string;
  vazio?: string;
}) {
  return (
    <select
      className="select-categoria"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={rotulo}
    >
      <option value="">{vazio}</option>
      {CATEGORIAS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** Quem gastou. Só aparece quando há pessoas cadastradas nas Preferências. */
export function SelectPessoa({
  value,
  onChange,
  pessoas,
  rotulo,
}: {
  value: string;
  onChange: (v: string) => void;
  pessoas: string[];
  rotulo: string;
}) {
  return (
    <select className="select-categoria select-pessoa" value={value} onChange={(e) => onChange(e.target.value)} aria-label={rotulo}>
      <option value="">Quem gastou?</option>
      {pessoas.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

/** "12" -> dia válido (1 a 31) ou null */
const lerDia = (v: string) => {
  const n = Math.floor(Number(v));
  return n >= 1 && n <= 31 ? n : null;
};

export function ListaGastos({
  titulo,
  descricao,
  placeholder,
  vazio,
  gastos,
  mes,
  filtro,
  extra,
  icone,
  parcelavel,
  onAdicionar,
  onAdicionarParcelado,
  onEditar,
  onRemover,
  tema,
  embutido,
  pessoas,
}: {
  /** quem divide os gastos (Preferências); vazio esconde o campo "Quem gastou?" */
  pessoas: string[];
  /** dentro de outro cartão (abas): sem moldura nem cabeçalho próprios */
  embutido?: boolean;
  titulo: string;
  descricao: string;
  placeholder: string;
  vazio: string;
  gastos: Gasto[];
  /** "AAAA-MM", para mostrar a data da compra como dd/mm */
  mes: string;
  filtro: FiltroGastos;
  /** conteúdo extra logo abaixo do título (ex.: dados do cartão) */
  extra?: React.ReactNode;
  icone?: string;
  /** Mostra a opção "Compra parcelada" no formulário. */
  parcelavel?: boolean;
  onAdicionar: (nome: string, valor: number, categoria: string | null, dia: number | null, pessoa: string | null) => void;
  onAdicionarParcelado?: (
    nome: string,
    valorParcela: number,
    atual: number,
    total: number,
    categoria: string | null,
    pessoa: string | null
  ) => Promise<string | null>;
  /** Devolve uma mensagem de erro, ou null se deu certo. */
  onEditar: (gasto: Gasto, novo: EdicaoGasto) => Promise<string | null>;
  onRemover: (gasto: Gasto) => void;
  tema?: string;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [pessoa, setPessoa] = useState("");
  const [dia, setDia] = useState("");
  const [parcelado, setParcelado] = useState(false);
  const [atual, setAtual] = useState("1");
  const [total, setTotal] = useState("2");
  // valor total da compra parcelada (opcional): se preenchido, calcula a parcela
  const [totalCompra, setTotalCompra] = useState(0);
  const [erro, setErro] = useState("");
  // cartão: mostrar todas as compras, só as à vista ou só as parceladas
  const [tipo, setTipo] = useState<"todas" | "vista" | "parceladas">("todas");

  const [editando, setEditando] = useState<string | number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValor, setEditValor] = useState(0);
  const [editCategoria, setEditCategoria] = useState("");
  const [editDia, setEditDia] = useState("");
  const [editPessoa, setEditPessoa] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");
  const [verTodas, setVerTodas] = useState(false);

  const porTipo = tipo === "todas" ? gastos : gastos.filter((g) => (tipo === "parceladas") === !!g.parcela);
  const visiveis = filtrarGastos(porTipo, filtro);
  const filtrando = filtroAtivo(filtro) || tipo !== "todas";
  const temParcelas = gastos.some((g) => g.parcela);
  const somaLista = visiveis.reduce((acc, g) => acc + g.valor, 0);
  // A linha em edição nunca fica escondida atrás do "Ver todas"
  const mostradas =
    verTodas || visiveis.length <= LINHAS_INICIAIS + 2
      ? visiveis
      : visiveis.filter((g, i) => i < LINHAS_INICIAIS || g.id === editando);
  const Raiz = embutido ? "div" : "section";
  const mm = mes.slice(5, 7);

  const nAtual = Math.floor(Number(atual)) || 0;
  const nTotal = Math.floor(Number(total)) || 0;
  const parcelasOk = nTotal >= 2 && nTotal <= 60 && nAtual >= 1 && nAtual <= nTotal;

  /** Com o valor total preenchido, a parcela é calculada (total ÷ número de parcelas). */
  const calcularParcela = (totalDaCompra: number, parcelas: number) => {
    if (totalDaCompra > 0 && parcelas >= 2) setValor(Math.round((totalDaCompra / parcelas) * 100) / 100);
  };

  const adicionar = async () => {
    if (!nome.trim() || valor <= 0) return;

    setErro("");

    if (parcelado && onAdicionarParcelado) {
      if (!parcelasOk) {
        setErro("Confira as parcelas: o total deve ser de 2 a 60 e a parcela atual não pode passar do total.");
        return;
      }

      const falha = await onAdicionarParcelado(nome.trim(), valor, nAtual, nTotal, categoria || null, pessoa || null);

      if (falha) {
        setErro(falha);
        return;
      }

      setParcelado(false);
      setAtual("1");
      setTotal("2");
      setTotalCompra(0);
    } else {
      onAdicionar(nome.trim(), valor, categoria || null, lerDia(dia), pessoa || null);
    }

    setNome("");
    setValor(0);
    setCategoria("");
    setDia("");
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") adicionar();
  };

  const iniciarEdicao = (g: Gasto) => {
    setEditando(g.id);
    setEditNome(g.nome);
    setEditValor(g.valor);
    setEditCategoria(g.categoria ?? "");
    setEditDia(g.dia ? String(g.dia) : "");
    setEditPessoa(g.pessoa ?? "");
    setErroEdicao("");
  };

  const salvarEdicao = async (g: Gasto) => {
    if (!editNome.trim() || editValor <= 0) {
      setErroEdicao("Informe o nome e um valor maior que zero.");
      return;
    }

    const falha = await onEditar(g, {
      nome: editNome.trim(),
      valor: editValor,
      categoria: editCategoria || null,
      dia: lerDia(editDia),
      pessoa: editPessoa || null,
    });

    if (falha) setErroEdicao(falha);
    else setEditando(null);
  };

  return (
    <Raiz className={embutido ? "lista-embutida" : `card ${tema ? `tema-${tema}` : ""}`}>
      {!embutido && (
        <div className="panel-head panel-head--icon">
          {icone && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icone} alt="" className="panel-icon" width={64} height={40} />
          )}

          <div>
            <h2 className="panel-title">{titulo}</h2>
            <p className="panel-sub">{descricao}</p>
          </div>
        </div>
      )}

      {extra}

      <div className="expense-form">
        <div className="form-cabeca">
          <span className="form-titulo">{parcelavel ? "Nova compra no cartão" : "Novo gasto"}</span>

          {parcelavel && (
            <div className="segmentos segmentos--mini" role="radiogroup" aria-label="Forma de pagamento">
              <button type="button" role="radio" aria-checked={!parcelado} className="segmento" onClick={() => setParcelado(false)}>
                À vista
              </button>
              <button type="button" role="radio" aria-checked={parcelado} className="segmento" onClick={() => setParcelado(true)}>
                Parcelado
              </button>
            </div>
          )}
        </div>

        <div className="expense-add-row">
          <div className="input-wrap">
            <input
              type="text"
              placeholder={placeholder}
              aria-label={`Nome - ${titulo}`}
              value={nome}
              maxLength={80}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={aoTeclar}
            />
          </div>

          <div className="input-wrap short">
            <span className="input-affix">R$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder={parcelado ? "Parcela" : "0,00"}
              aria-label={parcelado ? `Valor da parcela - ${titulo}` : `Valor - ${titulo}`}
              title={parcelado ? "Valor de cada parcela, como aparece na fatura" : undefined}
              value={valor || ""}
              onChange={(e) => {
                setValor(numero(e.target.value));
                setTotalCompra(0);
              }}
              onKeyDown={aoTeclar}
            />
          </div>

          <SelectCategoria value={categoria} onChange={setCategoria} rotulo={`Categoria - ${titulo}`} />

          {pessoas.length > 0 && (
            <SelectPessoa value={pessoa} onChange={setPessoa} pessoas={pessoas} rotulo={`Quem gastou - ${titulo}`} />
          )}

          {!parcelado && (
            <div className="input-wrap tiny">
              <input
                type="number"
                min={1}
                max={31}
                inputMode="numeric"
                placeholder="Dia"
                aria-label={`Dia da compra - ${titulo}`}
                title="Dia do mês da compra (opcional)"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                onKeyDown={aoTeclar}
              />
            </div>
          )}

          <button className="btn btn-primary btn-add" onClick={adicionar}>
            Adicionar
          </button>
        </div>

        {parcelavel && parcelado && (
          <div className="parcelas-box">
            <div className="parcelas-fields">
              <label>
                Parcela atual
                <div className="input-wrap">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={atual}
                    onChange={(e) => setAtual(e.target.value)}
                    aria-label="Parcela deste mês"
                  />
                </div>
              </label>

              <span className="parcelas-de">de</span>

              <label>
                Total de parcelas
                <div className="input-wrap">
                  <input
                    type="number"
                    min={2}
                    max={60}
                    inputMode="numeric"
                    value={total}
                    onChange={(e) => {
                      setTotal(e.target.value);
                      calcularParcela(totalCompra, Math.floor(Number(e.target.value)) || 0);
                    }}
                    aria-label="Total de parcelas"
                  />
                </div>
              </label>

              <label className="parcelas-total">
                Valor total (opcional)
                <div className="input-wrap">
                  <span className="input-affix">R$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Calcula a parcela"
                    value={totalCompra || ""}
                    onChange={(e) => {
                      const v = numero(e.target.value);
                      setTotalCompra(v);
                      calcularParcela(v, nTotal);
                    }}
                    aria-label="Valor total da compra"
                  />
                </div>
              </label>
            </div>

            {parcelasOk && valor > 0 ? (
              <p className="parcelas-previa">
                <b>
                  {nTotal}x de {fmt(valor)}
                </b>{" "}
                = {fmt(valor * nTotal)} · entra agora como {nAtual}/{nTotal}
                {nTotal > nAtual
                  ? ` · última parcela em ${labelCurto(somarMes(mes, nTotal - nAtual))}`
                  : " · é a última parcela"}
              </p>
            ) : (
              <p className="field-hint">
                Digite o valor de cada parcela (ou o valor total, que ele divide). Já está na 4ª de 10? Coloque 4 e 10.
              </p>
            )}
          </div>
        )}

        {erro && <p className="auth-msg error">{erro}</p>}
      </div>

      {parcelavel && temParcelas && (
        <div className="segmentos segmentos--mini lista-tipos" role="radiogroup" aria-label="Mostrar compras">
          {(
            [
              ["todas", "Todas", gastos.length],
              ["vista", "À vista", gastos.filter((g) => !g.parcela).length],
              ["parceladas", "Parceladas", gastos.filter((g) => g.parcela).length],
            ] as const
          ).map(([id, rotulo, qtd]) => (
            <button key={id} type="button" role="radio" aria-checked={tipo === id} className="segmento" onClick={() => setTipo(id)}>
              {rotulo}
              <span className="lancamento-qtd">{qtd}</span>
            </button>
          ))}
        </div>
      )}

      {gastos.length === 0 ? (
        <Vazio texto={vazio} />
      ) : visiveis.length === 0 ? (
        <Vazio texto="Nenhum item encontrado com esse filtro." busca />
      ) : (
        <ul className="linhas">
          <li className="linhas-cabecalho" aria-hidden="true">
            <span>Data</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Valor</span>
            <span />
          </li>

          {mostradas.map((gasto) =>
            editando === gasto.id ? (
              <li key={gasto.id} className="linha-edicao">
                <div className="edit-row">
                  <div className="input-wrap">
                    <input
                      type="text"
                      value={editNome}
                      maxLength={80}
                      aria-label="Nome"
                      onChange={(e) => setEditNome(e.target.value)}
                    />
                  </div>

                  <div className="input-wrap short">
                    <span className="input-affix">R$</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={editValor || ""}
                      aria-label={gasto.parcela ? "Valor da parcela" : "Valor"}
                      onChange={(e) => setEditValor(numero(e.target.value))}
                    />
                  </div>

                  <SelectCategoria value={editCategoria} onChange={setEditCategoria} rotulo="Categoria" />

                  {pessoas.length > 0 && (
                    <SelectPessoa value={editPessoa} onChange={setEditPessoa} pessoas={pessoas} rotulo="Quem gastou" />
                  )}

                  {!gasto.parcela && (
                    <div className="input-wrap tiny">
                      <input
                        type="number"
                        min={1}
                        max={31}
                        inputMode="numeric"
                        placeholder="Dia"
                        aria-label="Dia da compra"
                        value={editDia}
                        onChange={(e) => setEditDia(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {gasto.parcela && (
                  <p className="field-hint">Vale para as {gasto.parcela.total} parcelas, em todos os meses.</p>
                )}

                {erroEdicao && <p className="auth-msg error">{erroEdicao}</p>}

                <div className="edit-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => salvarEdicao(gasto)}>
                    Salvar
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditando(null)}>
                    Cancelar
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={gasto.id}
                className="linha"
                style={{ "--cor": gasto.categoria ? corDaCategoria(gasto.categoria) : "transparent" } as React.CSSProperties}
              >
                <span className="linha-data" title="Data da compra">
                  {gasto.dia ? `${String(gasto.dia).padStart(2, "0")}/${mm}` : "—"}
                </span>

                <span className="linha-nome" title={gasto.nome}>
                  <span className="linha-texto">{gasto.nome}</span>
                  {gasto.parcela && (
                    <span className="badge-parcela" title={`Parcela ${gasto.parcela.numero} de ${gasto.parcela.total}`}>
                      {gasto.parcela.numero}/{gasto.parcela.total}
                      <span className="badge-parcela-barra">
                        <span style={{ width: `${(gasto.parcela.numero / gasto.parcela.total) * 100}%` }} />
                      </span>
                    </span>
                  )}
                  {gasto.pessoa && <ChipPessoa pessoa={gasto.pessoa} />}
                </span>

                <span className="linha-cat">{gasto.categoria && <ChipCategoria categoria={gasto.categoria} />}</span>

                <span className="expense-value linha-valor">{fmt(gasto.valor)}</span>

                <span className="linha-acoes">
                  <button
                    className="btn-icon"
                    onClick={() => iniciarEdicao(gasto)}
                    aria-label={`Editar ${gasto.nome}`}
                    title="Editar"
                  >
                    <IconeLapis size={16} />
                  </button>

                  <button
                    className="btn-icon btn-icon--danger"
                    onClick={() => onRemover(gasto)}
                    aria-label={`Remover ${gasto.nome}`}
                    title={gasto.parcela ? "Remover a compra parcelada inteira" : "Remover"}
                  >
                    <IconeX size={16} />
                  </button>
                </span>
              </li>
            )
          )}

          {visiveis.length > LINHAS_INICIAIS + 2 && (
            <li className="linhas-mais">
              <button className="link-btn center" onClick={() => setVerTodas((v) => !v)}>
                {verTodas ? "Mostrar menos" : `Ver todas (${visiveis.length})`}
              </button>
            </li>
          )}

          <li className="expense-total">
            <span>{filtrando ? `Total filtrado (${visiveis.length} de ${gastos.length})` : "Total"}</span>
            <span>{fmt(somaLista)}</span>
          </li>
        </ul>
      )}
    </Raiz>
  );
}
