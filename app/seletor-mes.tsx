"use client";

import { MESES_CURTOS, anoDe, labelMes, montarMes, numeroDoMes } from "@/lib/meses";

/**
 * Escolha de mês em dois passos: o ano (com setas) e os 12 meses como botões.
 * O mês escolhido fica azul, o mês de hoje ganha um contorno e os meses que já
 * têm dados salvos mostram um pontinho.
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
  const ano = anoDe(mes);
  const numero = numeroDoMes(mes);

  // Trocar de ano mantém o mesmo mês (outubro de 2026 -> outubro de 2025)
  const irParaAno = (novo: number) => onChange(montarMes(novo, numero));

  return (
    <div className="seletor-mes">
      <div className="seletor-topo">
        <div className="seletor-ano" role="group" aria-label="Ano">
          <button
            className="month-btn"
            onClick={() => irParaAno(ano - 1)}
            disabled={ano <= anoMin}
            aria-label="Ano anterior"
          >
            ‹
          </button>

          <strong className="seletor-ano-valor" aria-live="polite">
            {ano}
          </strong>

          <button
            className="month-btn"
            onClick={() => irParaAno(ano + 1)}
            disabled={ano >= anoMax}
            aria-label="Próximo ano"
          >
            ›
          </button>
        </div>

        <span className="seletor-titulo">{labelMes(mes)}</span>

        {mes !== mesAtual && (
          <button className="btn btn-outline btn-sm" onClick={() => onChange(mesAtual)}>
            Ir para o mês atual
          </button>
        )}
      </div>

      <div className="seletor-meses" role="group" aria-label="Mês">
        {MESES_CURTOS.map((nome, i) => {
          const chave = montarMes(ano, i + 1);
          const selecionado = chave === mes;

          return (
            <button
              key={chave}
              className={`mes-chip ${selecionado ? "mes-chip--ativo" : ""} ${chave === mesAtual ? "mes-chip--hoje" : ""}`}
              aria-pressed={selecionado}
              aria-label={labelMes(chave)}
              title={labelMes(chave)}
              onClick={() => onChange(chave)}
            >
              {nome}
              {mesesComDados.has(chave) && <span className="mes-ponto" aria-label="tem dados salvos" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
