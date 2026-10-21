"use client";

import { useEffect, useRef, useState } from "react";
import { MESES_CURTOS, anoDe, labelMes, montarMes } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { IconeCalendario, IconeSetaBaixo, IconeSetaDir, IconeSetaEsq } from "./icones";

/**
 * Escolha do mês: setas para o mês anterior/próximo e um calendário que abre por cima,
 * com o ano (setas) e os 12 meses. O mês escolhido fica destacado, o mês de hoje ganha
 * um contorno e os meses que já têm dados salvos mostram um pontinho.
 */
export function SeletorMes({
  mes,
  mesAtual,
  mesesComDados,
  anoMin,
  anoMax,
  onChange,
}: {
  /** "AAAA-MM" selecionado */
  mes: string;
  /** "AAAA-MM" de hoje */
  mesAtual: string;
  mesesComDados: Set<string>;
  anoMin: number;
  anoMax: number;
  onChange: (mes: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [anoVisto, setAnoVisto] = useState(anoDe(mes));
  const raiz = useRef<HTMLDivElement>(null);

  const anterior = somarMes(mes, -1);
  const proximo = somarMes(mes, 1);

  useEffect(() => {
    if (!aberto) return;

    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);

    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const alternar = () => {
    setAnoVisto(anoDe(mes));
    setAberto((v) => !v);
  };

  const escolher = (chave: string) => {
    setAberto(false);
    onChange(chave);
  };

  return (
    <div className="seletor-mes" ref={raiz}>
      <div className="seletor-controle">
        <button
          className="seletor-seta"
          onClick={() => onChange(anterior)}
          disabled={anoDe(anterior) < anoMin}
          aria-label={`Mês anterior (${labelMes(anterior)})`}
          title="Mês anterior (←)"
        >
          <IconeSetaEsq size={18} />
        </button>

        <button className="seletor-botao" onClick={alternar} aria-haspopup="dialog" aria-expanded={aberto}>
          <IconeCalendario size={17} />
          <span aria-live="polite">{labelMes(mes)}</span>
          <IconeSetaBaixo size={16} />
        </button>

        <button
          className="seletor-seta"
          onClick={() => onChange(proximo)}
          disabled={anoDe(proximo) > anoMax}
          aria-label={`Próximo mês (${labelMes(proximo)})`}
          title="Próximo mês (→)"
        >
          <IconeSetaDir size={18} />
        </button>
      </div>

      {mes !== mesAtual && (
        <button className="btn btn-ghost btn-sm seletor-hoje" onClick={() => onChange(mesAtual)}>
          Voltar para hoje
        </button>
      )}

      {aberto && (
        <div className="seletor-popover" role="dialog" aria-label="Escolher mês">
          <div className="seletor-ano" role="group" aria-label="Ano">
            <button
              className="seletor-seta"
              onClick={() => setAnoVisto(anoVisto - 1)}
              disabled={anoVisto <= anoMin}
              aria-label="Ano anterior"
            >
              <IconeSetaEsq size={16} />
            </button>
            <strong className="seletor-ano-valor">{anoVisto}</strong>
            <button
              className="seletor-seta"
              onClick={() => setAnoVisto(anoVisto + 1)}
              disabled={anoVisto >= anoMax}
              aria-label="Próximo ano"
            >
              <IconeSetaDir size={16} />
            </button>
          </div>

          <div className="seletor-meses" role="group" aria-label="Mês">
            {MESES_CURTOS.map((nome, i) => {
              const chave = montarMes(anoVisto, i + 1);
              const selecionado = chave === mes;

              return (
                <button
                  key={chave}
                  className={`mes-chip ${selecionado ? "mes-chip--ativo" : ""} ${chave === mesAtual ? "mes-chip--hoje" : ""}`}
                  aria-pressed={selecionado}
                  aria-label={labelMes(chave)}
                  title={labelMes(chave)}
                  onClick={() => escolher(chave)}
                >
                  {nome}
                  {mesesComDados.has(chave) && <span className="mes-ponto" aria-label="tem dados salvos" />}
                </button>
              );
            })}
          </div>

          <p className="seletor-legenda">
            <span className="mes-ponto mes-ponto--legenda" /> mês com dados salvos
          </p>
        </div>
      )}
    </div>
  );
}
