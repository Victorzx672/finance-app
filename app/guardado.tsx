"use client";

import { useRef, useState } from "react";
import { variacaoGuardado, type SaldoMes } from "@/lib/evolucao-guardado";
import { labelCurto } from "@/lib/meses";
import { Dinheiro } from "./animacao";
import { centroDe, soltarConfete } from "./confete";
import { IconeCofre, IconeTendencia } from "./icones";
import { fmt, numero } from "./ui";

/** Linha com a evolução do total guardado, desenhada direto em SVG (cabe no cartão). */
function Minigrafico({ serie }: { serie: SaldoMes[] }) {
  if (serie.length < 2) return null;

  const L = 240;
  const A = 64;
  const valores = serie.map((s) => s.total);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;

  const pontos = valores.map((v, i) => [(i / (valores.length - 1)) * L, A - 6 - ((v - min) / faixa) * (A - 14)]);
  const linha = pontos.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [ux, uy] = pontos[pontos.length - 1];

  return (
    <svg className="minigrafico" viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="mg-fundo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linha} L${L},${A} L0,${A} Z`} fill="url(#mg-fundo)" />
      <path d={linha} className="minigrafico-linha" />
      <circle cx={ux} cy={uy} r="3.5" className="minigrafico-ponto" />
    </svg>
  );
}

/** O número principal do app: quanto já está guardado (metas + dinheiro sem meta). */
export function CartaoGuardado({
  total,
  semMeta,
  naMetas,
  quantidadeMetas,
  serie,
  onAporte,
}: {
  total: number;
  semMeta: number;
  naMetas: number;
  quantidadeMetas: number;
  /** total guardado ao fim de cada mês (para o minigráfico) */
  serie: SaldoMes[];
  onAporte: (valor: number) => Promise<string | null>;
}) {
  const [valor, setValor] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const botaoGuardar = useRef<HTMLButtonElement>(null);

  const variacao = variacaoGuardado(serie);

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
      if (sinal === 1) soltarConfete(centroDe(botaoGuardar.current), 70);
    }
  };

  return (
    <section className="guardado-card" aria-label="Total guardado">
      <div className="guardado-brilho" aria-hidden="true" />

      <div className="guardado-topo">
        <span className="guardado-label">
          <IconeCofre size={18} />
          Total guardado
        </span>

        {serie.length >= 2 && (
          <span className={`guardado-variacao ${variacao < 0 ? "guardado-variacao--caiu" : ""}`}>
            <IconeTendencia size={14} />
            {variacao >= 0 ? "+" : "−"}
            {fmt(Math.abs(variacao))} desde {labelCurto(serie[0].mes)}
          </span>
        )}
      </div>

      <strong className="guardado-valor">
        <Dinheiro valor={total} />
      </strong>

      <span className="guardado-sub">
        {total <= 0 && quantidadeMetas === 0
          ? "Anote abaixo quanto vocês já têm guardado."
          : `${fmt(semMeta)} sem meta · ${fmt(naMetas)} em ${quantidadeMetas} ${quantidadeMetas === 1 ? "meta" : "metas"}`}
      </span>

      <Minigrafico serie={serie.slice(-12)} />

      <div className="guardado-acoes">
        <div className="input-wrap input-wrap--vidro">
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

        <button ref={botaoGuardar} className="btn btn-claro btn-sm" disabled={enviando} onClick={() => movimentar(1)}>
          Guardar
        </button>
        <button className="btn btn-vidro btn-sm" disabled={enviando} onClick={() => movimentar(-1)}>
          Retirar
        </button>
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
  /** devolve true se deu certo */
  onGuardar: (valor: number) => Promise<boolean>;
}) {
  const [enviando, setEnviando] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);

  const enviar = async (valor: number) => {
    const origem = centroDe(botao.current);
    setEnviando(true);
    const ok = await onGuardar(valor);
    setEnviando(false);
    if (ok && valor > jaGuardado) soltarConfete(origem, 60);
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
        ref={botao}
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
