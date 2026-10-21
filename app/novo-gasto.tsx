"use client";

import { useState } from "react";
import { CATEGORIAS, corDaCategoria } from "@/lib/categorias";
import { labelMes } from "@/lib/meses";
import { Modal } from "./modal";
import { fmt, numero } from "./ui";

export type DestinoGasto = "cartao" | "outros";

export interface NovoGastoDados {
  destino: DestinoGasto;
  nome: string;
  valor: number;
  categoria: string | null;
  pessoa: string | null;
  dia: number | null;
  /** só compras no cartão */
  parcelas: { atual: number; total: number } | null;
}

/**
 * Lançamento rápido de um gasto, de qualquer aba (botão "+" ou tecla N).
 * Categorias e pessoas viram botões, para lançar com poucos toques no celular.
 */
export function NovoGasto({
  mes,
  ehMesAtual,
  cartao,
  pessoas,
  onFechar,
  onAdicionar,
}: {
  mes: string;
  ehMesAtual: boolean;
  cartao: string;
  pessoas: string[];
  onFechar: () => void;
  /** Devolve uma mensagem de erro, ou null se deu certo. */
  onAdicionar: (dados: NovoGastoDados) => Promise<string | null>;
}) {
  const [destino, setDestino] = useState<DestinoGasto>("cartao");
  const [valor, setValor] = useState(0);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [pessoa, setPessoa] = useState<string | null>(null);
  const [dia, setDia] = useState(ehMesAtual ? String(new Date().getDate()) : "");
  const [parcelado, setParcelado] = useState(false);
  const [atual, setAtual] = useState("1");
  const [total, setTotal] = useState("2");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const comParcelas = destino === "cartao" && parcelado;
  const nAtual = Math.floor(Number(atual)) || 0;
  const nTotal = Math.floor(Number(total)) || 0;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (valor <= 0) return setErro("Digite o valor do gasto.");
    if (!nome.trim()) return setErro("Diga o que foi comprado.");
    if (comParcelas && !(nTotal >= 2 && nTotal <= 60 && nAtual >= 1 && nAtual <= nTotal)) {
      return setErro("Confira as parcelas: o total deve ser de 2 a 60 e a parcela atual não pode passar do total.");
    }

    const d = Math.floor(Number(dia));

    setEnviando(true);
    const falha = await onAdicionar({
      destino,
      nome: nome.trim(),
      valor,
      categoria,
      pessoa,
      dia: d >= 1 && d <= 31 ? d : null,
      parcelas: comParcelas ? { atual: nAtual, total: nTotal } : null,
    });
    setEnviando(false);

    if (falha) setErro(falha);
    else onFechar();
  };

  return (
    <Modal titulo="Novo gasto" descricao={`Entra em ${labelMes(mes)}.`} onFechar={onFechar} folha>
      <form className="novo-gasto" onSubmit={enviar}>
        <label className="valor-grande">
          <span className="valor-grande-moeda">R$</span>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            aria-label={comParcelas ? "Valor da parcela" : "Valor"}
            value={valor || ""}
            onChange={(e) => setValor(numero(e.target.value))}
            // o campo cresce com o número, para o "R$" ficar colado nele
            style={{ width: `${Math.max(4, String(valor || "").length) + 0.5}ch` }}
            data-autofocus
          />
        </label>

        <div className="segmentos" role="radiogroup" aria-label="Como pagou">
          <button
            type="button"
            role="radio"
            aria-checked={destino === "cartao"}
            className="segmento"
            onClick={() => setDestino("cartao")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nubank-card.png" alt="" width={26} height={17} className="segmento-cartao" />
            Cartão {cartao}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={destino === "outros"}
            className="segmento"
            onClick={() => {
              setDestino("outros");
              setParcelado(false);
            }}
          >
            Pix, débito ou dinheiro
          </button>
        </div>

        <div className="input-wrap">
          <input
            type="text"
            placeholder="O que você comprou?"
            aria-label="Descrição"
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <fieldset className="chips-grupo">
          <legend>Categoria</legend>
          <div className="chips">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                className="chip-escolha"
                aria-pressed={categoria === c}
                style={{ "--cor": corDaCategoria(c) } as React.CSSProperties}
                onClick={() => setCategoria(categoria === c ? null : c)}
              >
                <span className="chip-cat-dot" />
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        {pessoas.length > 0 && (
          <fieldset className="chips-grupo">
            <legend>Quem gastou</legend>
            <div className="chips">
              {pessoas.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="chip-escolha chip-escolha--pessoa"
                  aria-pressed={pessoa === p}
                  onClick={() => setPessoa(pessoa === p ? null : p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="novo-gasto-linha">
          {!comParcelas && (
            <label className="field novo-gasto-dia">
              <span className="field-label">Dia da compra</span>
              <div className="input-wrap">
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  placeholder="Opcional"
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                />
              </div>
            </label>
          )}

          {destino === "cartao" && (
            <label className="check-row">
              <input type="checkbox" checked={parcelado} onChange={(e) => setParcelado(e.target.checked)} />
              Compra parcelada
            </label>
          )}
        </div>

        {comParcelas && (
          <div className="parcelas-box">
            <div className="parcelas-fields">
              <label>
                Parcela atual
                <div className="input-wrap">
                  <input type="number" min={1} inputMode="numeric" value={atual} onChange={(e) => setAtual(e.target.value)} />
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
                  />
                </div>
              </label>
            </div>
            <p className="field-hint">
              {valor > 0 && nTotal >= 2
                ? `${nTotal}x de ${fmt(valor)} = ${fmt(valor * nTotal)}. Aparece sozinha nos próximos meses.`
                : "O valor acima é o de cada parcela, como aparece na fatura."}
            </p>
          </div>
        )}

        {erro && <p className="auth-msg error">{erro}</p>}

        <p className="field-hint novo-gasto-nota">
          {comParcelas
            ? "Compras parceladas são gravadas na hora."
            : "O gasto entra como alteração do mês: depois é só clicar em Salvar."}
        </p>

        <div className="modal-acoes modal-acoes--linha">
          <button type="button" className="btn btn-outline" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? <span className="btn-spinner" /> : valor > 0 ? `Adicionar ${fmt(valor)}` : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
