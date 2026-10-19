"use client";

import { LIMITE_GASTOS_PERCENT } from "@/lib/calculos";
import type { Previsao } from "@/lib/previsao";
import { Icon, fmt } from "./ui";

/** "No ritmo de hoje, o mês fecha em R$ X": o aviso vem antes de o limite estourar. */
export function PrevisaoMes({ previsao, limite }: { previsao: Previsao; limite: number }) {
  const { projetado, percentual, passaDoLimite, diaDoEstouro, porDiaParaSegurar } = previsao;

  return (
    <section className={`card previsao ${passaDoLimite ? "previsao--alerta" : "previsao--ok"}`}>
      <div className="previsao-icone">
        <Icon size={22}>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M14 7h7v7" />
        </Icon>
      </div>

      <div className="previsao-texto">
        <strong>Previsão do mês</strong>
        <p>
          {passaDoLimite ? (
            <>
              No ritmo atual você deve passar do limite de {fmt(limite)} ({LIMITE_GASTOS_PERCENT}% da renda) por volta do{" "}
              <b>dia {diaDoEstouro}</b>, fechando o mês em <b>{fmt(projetado)}</b> ({percentual.toFixed(0)}% da renda).
              {porDiaParaSegurar > 0
                ? ` Para ficar dentro, gaste no máximo ${fmt(porDiaParaSegurar)} por dia daqui até o fim do mês.`
                : " Já não sobra folga para os próximos dias."}
            </>
          ) : (
            <>
              No ritmo atual o mês fecha em <b>{fmt(projetado)}</b> ({percentual.toFixed(0)}% da renda), dentro do limite
              de {fmt(limite)}.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
