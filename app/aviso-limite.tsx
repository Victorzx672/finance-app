"use client";

import { LIMITE_GASTOS_PERCENT, type StatusLimite } from "@/lib/calculos";
import { Icon, fmt } from "./ui";

/** Aviso do limite de gastos. Só aparece quando o mês está perto de passar ou já passou. */
export function AvisoLimite({
  status,
  renda,
  totalGastos,
  limite,
  folga,
}: {
  status: StatusLimite;
  renda: number;
  totalGastos: number;
  limite: number;
  /** limite - gastos; negativo = quanto passou */
  folga: number;
}) {
  if (status !== "excedido" && status !== "atencao") return null;

  const excedido = status === "excedido";
  const percentual = renda > 0 ? (totalGastos / renda) * 100 : 0;

  return (
    <section className={`card limite-aviso limite-aviso--${excedido ? "excedido" : "atencao"}`} role="alert">
      <div className="limite-icone">
        <Icon size={22}>
          <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </Icon>
      </div>

      <div className="limite-texto">
        {excedido ? (
          <>
            <strong>Você passou do limite de gastos do mês.</strong>
            <p>
              O limite é de {LIMITE_GASTOS_PERCENT}% da renda ({fmt(limite)}) e você já gastou{" "}
              {fmt(totalGastos)} ({percentual.toFixed(0)}% da renda), ou seja,{" "}
              <b>{fmt(-folga)} acima</b>. Evite novos gastos até o fim do mês.
            </p>
          </>
        ) : (
          <>
            <strong>Atenção: você está chegando no limite de gastos.</strong>
            <p>
              O limite é de {LIMITE_GASTOS_PERCENT}% da renda ({fmt(limite)}) e você já gastou{" "}
              {fmt(totalGastos)} ({percentual.toFixed(0)}% da renda).{" "}
              {folga > 0 ? (
                <>
                  Ainda pode gastar <b>{fmt(folga)}</b>.
                </>
              ) : (
                <b>Qualquer novo gasto passa do limite.</b>
              )}
            </p>
          </>
        )}
      </div>

      {excedido && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/gato-bravo.jpg"
          alt="Gato de cara fechada, bravo com o gasto acima do limite"
          className="limite-gato"
          width={220}
          height={124}
        />
      )}
    </section>
  );
}
