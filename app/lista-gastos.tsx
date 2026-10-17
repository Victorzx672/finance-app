"use client";

import { useState } from "react";
import { CATEGORIAS } from "@/lib/categorias";
import { filtroAtivo, filtrarGastos, type FiltroGastos } from "@/lib/filtro";
import { Icon, fmt, numero, type Gasto } from "./ui";

export interface EdicaoGasto {
  nome: string;
  valor: number;
  categoria: string | null;
  dia: number | null;
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
}: {
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
  onAdicionar: (nome: string, valor: number, categoria: string | null, dia: number | null) => void;
  onAdicionarParcelado?: (
    nome: string,
    valorParcela: number,
    atual: number,
    total: number,
    categoria: string | null
  ) => Promise<string | null>;
  /** Devolve uma mensagem de erro, ou null se deu certo. */
  onEditar: (gasto: Gasto, novo: EdicaoGasto) => Promise<string | null>;
  onRemover: (gasto: Gasto) => void;
  tema?: string;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [dia, setDia] = useState("");
  const [parcelado, setParcelado] = useState(false);
  const [atual, setAtual] = useState("1");
  const [total, setTotal] = useState("2");
  const [erro, setErro] = useState("");

  const [editando, setEditando] = useState<string | number | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValor, setEditValor] = useState(0);
  const [editCategoria, setEditCategoria] = useState("");
  const [editDia, setEditDia] = useState("");
  const [erroEdicao, setErroEdicao] = useState("");

  const visiveis = filtrarGastos(gastos, filtro);
  const filtrando = filtroAtivo(filtro);
  const somaLista = visiveis.reduce((acc, g) => acc + g.valor, 0);
  const mm = mes.slice(5, 7);

  const nAtual = Math.floor(Number(atual)) || 0;
  const nTotal = Math.floor(Number(total)) || 0;
  const parcelasOk = nTotal >= 2 && nTotal <= 60 && nAtual >= 1 && nAtual <= nTotal;

  const adicionar = async () => {
    if (!nome.trim() || valor <= 0) return;

    setErro("");

    if (parcelado && onAdicionarParcelado) {
      if (!parcelasOk) {
        setErro("Confira as parcelas: o total deve ser de 2 a 60 e a parcela atual não pode passar do total.");
        return;
      }

      const falha = await onAdicionarParcelado(nome.trim(), valor, nAtual, nTotal, categoria || null);

      if (falha) {
        setErro(falha);
        return;
      }

      setParcelado(false);
      setAtual("1");
      setTotal("2");
    } else {
      onAdicionar(nome.trim(), valor, categoria || null, lerDia(dia));
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
    });

    if (falha) setErroEdicao(falha);
    else setEditando(null);
  };

  return (
    <section className={`card ${tema ? `tema-${tema}` : ""}`}>
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

      {extra}

      <div className="expense-form">
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
              value={valor || ""}
              onChange={(e) => setValor(numero(e.target.value))}
              onKeyDown={aoTeclar}
            />
          </div>

          <SelectCategoria value={categoria} onChange={setCategoria} rotulo={`Categoria - ${titulo}`} />

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

        {parcelavel && (
          <label className="check-row">
            <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />
            Compra parcelada
          </label>
        )}

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
                    onChange={(e) => setTotal(e.target.value)}
                    aria-label="Total de parcelas"
                  />
                </div>
              </label>
            </div>

            <p className="field-hint">
              {parcelasOk && valor > 0
                ? `${nTotal}x de ${fmt(valor)}. Entra neste mês como ${nAtual}/${nTotal} e aparece em mais ${nTotal - nAtual} ${nTotal - nAtual === 1 ? "mês" : "meses"}.`
                : "Digite o valor de cada parcela, como aparece na fatura. Já está na 4ª de 10? Coloque 4 e 10."}
            </p>
          </div>
        )}

        {erro && <p className="auth-msg error">{erro}</p>}
      </div>

      {gastos.length === 0 ? (
        <div className="empty-state">{vazio}</div>
      ) : visiveis.length === 0 ? (
        <div className="empty-state">Nenhum item encontrado com esse filtro.</div>
      ) : (
        <ul className="expense-list">
          {visiveis.map((gasto) =>
            editando === gasto.id ? (
              <li key={gasto.id} className="expense-item expense-item--edit">
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
              <li key={gasto.id} className="expense-item">
                <span className="expense-name">
                  {gasto.dia && (
                    <span className="expense-dia" title="Data da compra">
                      {String(gasto.dia).padStart(2, "0")}/{mm}
                    </span>
                  )}
                  {gasto.nome}
                  {gasto.parcela && (
                    <span className="expense-badge" title="Parcela deste mês">
                      {gasto.parcela.numero}/{gasto.parcela.total}
                    </span>
                  )}
                  {gasto.categoria && <span className="expense-tag">{gasto.categoria}</span>}
                </span>
                <span className="expense-value">{fmt(gasto.valor)}</span>

                <button
                  className="btn-icon"
                  onClick={() => iniciarEdicao(gasto)}
                  aria-label={`Editar ${gasto.nome}`}
                  title="Editar"
                >
                  <Icon size={16}>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </Icon>
                </button>

                <button
                  className="btn-icon btn-icon--danger"
                  onClick={() => onRemover(gasto)}
                  aria-label={`Remover ${gasto.nome}`}
                  title={gasto.parcela ? "Remover a compra parcelada inteira" : "Remover"}
                >
                  <Icon size={16}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </Icon>
                </button>
              </li>
            )
          )}

          <li className="expense-total">
            <span>{filtrando ? `Total filtrado (${visiveis.length} de ${gastos.length})` : "Total"}</span>
            <span>{fmt(somaLista)}</span>
          </li>
        </ul>
      )}
    </section>
  );
}
