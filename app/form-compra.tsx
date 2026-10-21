"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CATEGORIAS, corDaCategoria } from "@/lib/categorias";
import { chaveMes, labelCurto } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { nomesConhecidos, sugerirPeloNome, type CompraConhecida } from "@/lib/sugestao";
import { IconeCheck } from "./icones";
import { fmt, numero } from "./ui";

/** Dia de hoje, se o mês da lista for o mês em andamento ("" nos outros meses). */
const diaDeHoje = (mes: string) => (mes === chaveMes(new Date()) ? String(new Date().getDate()) : "");

/**
 * Formulário de compra: rótulos visíveis, categoria e pessoa em botões (sugeridas pelo nome
 * enquanto se digita), atalhos de dia, autocompletar com compras anteriores e, no cartão,
 * à vista ou parcelado (com o valor total que calcula a parcela).
 */
export function FormularioCompra({
  titulo,
  placeholder,
  mes,
  pessoas,
  parcelavel,
  aprenderDe,
  onAdicionar,
  onAdicionarParcelado,
}: {
  titulo: string;
  placeholder: string;
  /** "AAAA-MM" da lista */
  mes: string;
  pessoas: string[];
  /** mostra "À vista / Parcelado" */
  parcelavel?: boolean;
  /** compras já lançadas, para sugerir categoria, pessoa e nomes */
  aprenderDe: CompraConhecida[];
  onAdicionar: (nome: string, valor: number, categoria: string | null, dia: number | null, pessoa: string | null) => void;
  onAdicionarParcelado?: (
    nome: string,
    valorParcela: number,
    atual: number,
    total: number,
    categoria: string | null,
    pessoa: string | null
  ) => Promise<string | null>;
}) {
  const id = useId();
  const campoNome = useRef<HTMLInputElement>(null);
  const campoValor = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [categoria, setCategoria] = useState("");
  const [pessoa, setPessoa] = useState("");
  // escolha feita à mão não é trocada pela sugestão
  const [categoriaManual, setCategoriaManual] = useState(false);
  const [pessoaManual, setPessoaManual] = useState(false);
  const [dia, setDia] = useState(() => diaDeHoje(mes));
  const [parcelado, setParcelado] = useState(false);
  const [atual, setAtual] = useState("1");
  const [total, setTotal] = useState("2");
  // valor total da compra parcelada (opcional): se preenchido, calcula a parcela
  const [totalCompra, setTotalCompra] = useState(0);
  const [erro, setErro] = useState("");
  const [faltando, setFaltando] = useState<{ nome: boolean; valor: boolean }>({ nome: false, valor: false });
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState("");

  // confirmação "adicionada" some sozinha
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(""), 3500);
    return () => clearTimeout(t);
  }, [ok]);

  const hoje = new Date();
  const ehMesAtual = mes === chaveMes(hoje);
  const nAtual = Math.floor(Number(atual)) || 0;
  const nTotal = Math.floor(Number(total)) || 0;
  const parcelasOk = nTotal >= 2 && nTotal <= 60 && nAtual >= 1 && nAtual <= nTotal;
  const sugerida = !!categoria && !categoriaManual;
  const nomes = nomesConhecidos(aprenderDe);

  const mudarNome = (v: string) => {
    setNome(v);
    if (faltando.nome) setFaltando((f) => ({ ...f, nome: false }));

    const s = sugerirPeloNome(v, aprenderDe);
    if (!categoriaManual) setCategoria(s.categoria ?? "");
    if (!pessoaManual && s.pessoa && pessoas.includes(s.pessoa)) setPessoa(s.pessoa);
  };

  /** Com o valor total preenchido, a parcela é calculada (total ÷ número de parcelas). */
  const calcularParcela = (totalDaCompra: number, parcelas: number) => {
    if (totalDaCompra > 0 && parcelas >= 2) setValor(Math.round((totalDaCompra / parcelas) * 100) / 100);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;

    const semNome = !nome.trim();
    const semValor = valor <= 0;

    if (semNome || semValor) {
      setFaltando({ nome: semNome, valor: semValor });
      setErro(
        semNome && semValor
          ? "Diga o que você comprou e o valor."
          : semNome
          ? "Diga o que você comprou."
          : parcelado
          ? "Digite o valor da parcela (ou o valor total)."
          : "Digite o valor da compra."
      );
      (semNome ? campoNome : campoValor).current?.focus();
      return;
    }

    if (parcelado && !parcelasOk) {
      setErro("Confira as parcelas: o total deve ser de 2 a 60 e a parcela atual não pode passar do total.");
      return;
    }

    setErro("");
    const nomeFinal = nome.trim();

    if (parcelado && onAdicionarParcelado) {
      setEnviando(true);
      const falha = await onAdicionarParcelado(nomeFinal, valor, nAtual, nTotal, categoria || null, pessoa || null);
      setEnviando(false);

      if (falha) {
        setErro(falha);
        return;
      }

      setOk(`"${nomeFinal}" cadastrada em ${nTotal}x`);
      setParcelado(false);
      setAtual("1");
      setTotal("2");
      setTotalCompra(0);
    } else {
      onAdicionar(nomeFinal, valor, categoria || null, Number(dia) >= 1 && Number(dia) <= 31 ? Math.floor(Number(dia)) : null, pessoa || null);
      setOk(`"${nomeFinal}" adicionada. Não esqueça de salvar.`);
    }

    // pronto para a próxima: a pessoa continua escolhida (costuma lançar várias seguidas)
    setNome("");
    setValor(0);
    setCategoria("");
    setCategoriaManual(false);
    setPessoaManual(false);
    setDia(diaDeHoje(mes));
    setFaltando({ nome: false, valor: false });
    campoNome.current?.focus();
  };

  const rotuloBotao =
    valor > 0 ? (parcelado && parcelasOk ? `Adicionar ${nTotal}x de ${fmt(valor)}` : `Adicionar ${fmt(valor)}`) : "Adicionar";

  return (
    <form className="expense-form form-compra" onSubmit={enviar} noValidate>
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

      <div className="form-compra-principal">
        <label className="field">
          <span className="field-label">O que você comprou?</span>
          <div className={`input-wrap ${faltando.nome ? "input-wrap--erro" : ""}`}>
            <input
              ref={campoNome}
              type="text"
              placeholder={placeholder}
              aria-label={`Nome - ${titulo}`}
              aria-invalid={faltando.nome || undefined}
              list={`${id}-nomes`}
              autoComplete="off"
              value={nome}
              maxLength={80}
              onChange={(e) => mudarNome(e.target.value)}
            />
          </div>
          <datalist id={`${id}-nomes`}>
            {nomes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span className="field-label">{parcelado ? "Valor da parcela" : "Valor"}</span>
          <div className={`input-wrap input-wrap--valor ${faltando.valor ? "input-wrap--erro" : ""}`}>
            <span className="input-affix">R$</span>
            <input
              ref={campoValor}
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              aria-label={parcelado ? `Valor da parcela - ${titulo}` : `Valor - ${titulo}`}
              aria-invalid={faltando.valor || undefined}
              value={valor || ""}
              onChange={(e) => {
                setValor(numero(e.target.value));
                setTotalCompra(0);
                if (faltando.valor) setFaltando((f) => ({ ...f, valor: false }));
              }}
            />
          </div>
        </label>
      </div>

      <div className="form-compra-grupo">
        <span className="field-label">
          Categoria
          {sugerida && <span className="tag-sugerida">sugerida pelo nome</span>}
        </span>
        <div className="chips chips--pequenos" role="group" aria-label={`Categoria - ${titulo}`}>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              className="chip-escolha"
              aria-pressed={categoria === c}
              style={{ "--cor": corDaCategoria(c) } as React.CSSProperties}
              onClick={() => {
                setCategoria(categoria === c ? "" : c);
                setCategoriaManual(true);
              }}
            >
              <span className="chip-cat-dot" />
              {c}
            </button>
          ))}
        </div>
      </div>

      {(pessoas.length > 0 || !parcelado) && (
        <div className="form-compra-linha">
          {pessoas.length > 0 && (
            <div className="form-compra-grupo">
              <span className="field-label">Quem gastou</span>
              <div className="chips chips--pequenos" role="group" aria-label={`Quem gastou - ${titulo}`}>
                {pessoas.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="chip-escolha chip-escolha--pessoa"
                    aria-pressed={pessoa === p}
                    onClick={() => {
                      setPessoa(pessoa === p ? "" : p);
                      setPessoaManual(true);
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!parcelado && (
            <div className="form-compra-grupo">
              <span className="field-label">Dia da compra</span>
              <div className="form-compra-dia">
                {ehMesAtual && (
                  <>
                    <button
                      type="button"
                      className="chip-escolha"
                      aria-pressed={dia === String(hoje.getDate())}
                      onClick={() => setDia(String(hoje.getDate()))}
                    >
                      Hoje
                    </button>
                    {hoje.getDate() > 1 && (
                      <button
                        type="button"
                        className="chip-escolha"
                        aria-pressed={dia === String(hoje.getDate() - 1)}
                        onClick={() => setDia(String(hoje.getDate() - 1))}
                      >
                        Ontem
                      </button>
                    )}
                  </>
                )}
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
                  />
                </div>
              </div>
            </div>
          )}
        </div>
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
                    if (v > 0 && faltando.valor) setFaltando((f) => ({ ...f, valor: false }));
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
              {nTotal > nAtual ? ` · última parcela em ${labelCurto(somarMes(mes, nTotal - nAtual))}` : " · é a última parcela"}
            </p>
          ) : (
            <p className="field-hint">
              Digite o valor de cada parcela (ou o valor total, que ele divide). Já está na 4ª de 10? Coloque 4 e 10.
            </p>
          )}
        </div>
      )}

      {erro && <p className="auth-msg error">{erro}</p>}

      <div className="form-compra-rodape">
        <span className="form-compra-ok" role="status">
          {ok && (
            <>
              <IconeCheck size={15} /> {ok}
            </>
          )}
        </span>

        <button type="submit" className="btn btn-primary btn-add" disabled={enviando}>
          {enviando ? <span className="btn-spinner" /> : rotuloBotao}
        </button>
      </div>
    </form>
  );
}
