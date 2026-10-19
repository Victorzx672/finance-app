"use client";

import { useState } from "react";
import { fmt, numero } from "./ui";

/** O número principal do app: quanto já está guardado (metas + dinheiro sem meta). */
export function CartaoGuardado({
  total,
  semMeta,
  naMetas,
  quantidadeMetas,
  onAporte,
}: {
  total: number;
  semMeta: number;
  naMetas: number;
  quantidadeMetas: number;
  onAporte: (valor: number) => Promise<string | null>;
}) {
  const [valor, setValor] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const movimentar = async (sinal: 1 | -1) => {
    if (valor <= 0) {
      setErro("Digite quanto você quer guardar ou retirar.");
      return;
    }

    setEnviando(true);
    const falha = await onAporte(sinal * valor);
    setEnviando(false);

    if (falha) setErro(falha);
    else {
      setErro("");
      setValor(0);
    }
  };

  return (
    <section className="card guardado-card" aria-label="Total guardado">
      <div className="guardado-topo">
        <div className="guardado-numero">
          <span className="guardado-label">Total guardado</span>
          <strong className="guardado-valor">{fmt(total)}</strong>
          <span className="guardado-sub">
            {total <= 0 && quantidadeMetas === 0
              ? "Anote abaixo quanto vocês já têm guardado."
              : `${fmt(semMeta)} guardados sem meta · ${fmt(naMetas)} em ${quantidadeMetas} ${
                  quantidadeMetas === 1 ? "meta" : "metas"
                }`}
          </span>
        </div>

        <div className="guardado-acoes">
          <div className="input-wrap short">
            <span className="input-affix">R$</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              aria-label="Valor para guardar ou retirar"
              value={valor || ""}
              onChange={(e) => setValor(numero(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && movimentar(1)}
            />
          </div>

          <button className="btn btn-primary btn-sm" disabled={enviando} onClick={() => movimentar(1)}>
            Guardar
          </button>
          <button className="btn btn-outline btn-sm" disabled={enviando} onClick={() => movimentar(-1)}>
            Retirar
          </button>
        </div>
      </div>

      {erro && <p className="auth-msg error">{erro}</p>}
    </section>
  );
}

/**
 * "Guardei o que sobrou": no cartão "Para investir", soma o valor do mês ao total
 * guardado. Só some a diferença, então clicar de novo não conta em dobro.
 */
export function AcaoGuardar({
  investimento,
  jaGuardado,
  podeGuardar,
  onGuardar,
}: {
  investimento: number;
  jaGuardado: number;
  /** o mês precisa estar salvo (e sem alterações) para o valor bater com o do servidor */
  podeGuardar: boolean;
  onGuardar: (valor: number) => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);

  const enviar = async (valor: number) => {
    setEnviando(true);
    await onGuardar(valor);
    setEnviando(false);
  };

  const diferenca = Math.round((investimento - jaGuardado) * 100) / 100;

  if (jaGuardado > 0 && diferenca === 0) {
    return (
      <span className="acao-guardada">
        ✓ {fmt(jaGuardado)} já no total guardado
        <button className="link-btn" disabled={enviando} onClick={() => enviar(0)}>
          Desfazer
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        className="btn btn-outline btn-sm"
        disabled={!podeGuardar || enviando}
        title={podeGuardar ? undefined : "Salve o mês para guardar o que sobrou"}
        onClick={() => enviar(investimento)}
      >
        {diferenca > 0 ? `Guardei ${fmt(diferenca)}` : `Ajustar guardado (${fmt(diferenca)})`}
      </button>
      {!podeGuardar && <span className="field-hint">Salve o mês antes.</span>}
    </>
  );
}
