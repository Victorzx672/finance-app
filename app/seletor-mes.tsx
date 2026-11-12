"use client";

import { useEffect, useRef, useState } from "react";
import { MESES_CURTOS, anoDe, labelMes, montarMes } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { IconeCalendario, IconeCheck, IconeSetaBaixo, IconeSetaDir, IconeSetaEsq } from "./icones";

/**
 * Escolha do mês: setas para o mês anterior/próximo e um calendário que abre por cima,
 * com o ano (setas) e os 12 meses. O mês escolhido fica destacado, o mês em andamento ganha
 * um contorno, os meses com dados salvos mostram um pontinho e os concluídos, um visto.
 */
export function SeletorMes({
  mes,
  mesAtual,
  rotuloAtual = "Voltar para hoje",
  mesesComDados,
  mesesConcluidos,
  anoMin,
  anoMax,
  onChange,
}: {
  /** "AAAA-MM" selecionado */
  mes: string;
  /** "AAAA-MM" do mês em andamento (o de hoje, ou o seguinte se ele já foi concluído) */
  mesAtual: string;
  /** texto do botão que volta para o mês em andamento */
  rotuloAtual?: string;
  mesesComDados: Set<string>;
  mesesConcluidos: Set<string>;
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
          {rotuloAtual}
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
                  aria-label={`${labelMes(chave)}${mesesConcluidos.has(chave) ? ", concluído" : ""}`}
                  title={labelMes(chave)}
                  onClick={() => escolher(chave)}
                >
                  {nome}
                  {mesesConcluidos.has(chave) ? (
                    <span className="mes-check" aria-hidden="true">
                      <IconeCheck size={10} />
                    </span>
                  ) : (
                    mesesComDados.has(chave) && <span className="mes-ponto" aria-label="tem dados salvos" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="seletor-legenda">
            <span>
              <span className="mes-ponto mes-ponto--legenda" /> com dados salvos
            </span>
            <span>
              <span className="mes-check mes-check--legenda">
                <IconeCheck size={10} />
              </span>{" "}
              concluído
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
