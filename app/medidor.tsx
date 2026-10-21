"use client";

import { LIMITE_GASTOS_PERCENT, type StatusLimite } from "@/lib/calculos";
import { Dinheiro, useContagem } from "./animacao";
import { fmt } from "./ui";

const RAIO = 54;
const VOLTA = 2 * Math.PI * RAIO;

/** Anel com o quanto da renda já foi gasto e a marca do limite. */
export function Anel({
  percentual,
  status,
  marca,
  tamanho = 148,
  children,
}: {
  /** 0 a 100 */
  percentual: number;
  status: StatusLimite | "azul";
  /** onde fica a marca do limite (0 a 100); sem marca se omitido */
  marca?: number;
  tamanho?: number;
  children?: React.ReactNode;
}) {
  const p = Math.max(0, Math.min(100, percentual));
  const anguloMarca = marca !== undefined ? (marca / 100) * 360 : null;

  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <circle className="anel-trilho" cx="64" cy="64" r={RAIO} />
        <circle
          className={`anel-arco anel-arco--${status}`}
          cx="64"
          cy="64"
          r={RAIO}
          strokeDasharray={VOLTA}
          strokeDashoffset={VOLTA * (1 - p / 100)}
          transform="rotate(-90 64 64)"
        />
        {anguloMarca !== null && (
          <line
            className="anel-marca"
            x1="64"
            y1="2"
            x2="64"
            y2="18"
            transform={`rotate(${anguloMarca} 64 64)`}
          />
        )}
      </svg>
      <div className="anel-centro">{children}</div>
    </div>
  );
}

const ROTULO_STATUS: Record<StatusLimite, string> = {
  ok: "Dentro do limite",
  atencao: "Perto do limite",
  excedido: "Acima do limite",
  "sem-renda": "Sem renda no mês",
};

/** Cartão do limite de gastos: anel animado + quanto ainda dá para gastar. */
export function CartaoLimite({
  percentual,
  status,
  renda,
  totalGastos,
  limite,
  folga,
}: {
  percentual: number;
  status: StatusLimite;
  renda: number;
  totalGastos: number;
  limite: number;
  folga: number;
}) {
  const p = useContagem(percentual);

  return (
    <section className="card limite-card" aria-label="Gastos em relação à renda">
      <div className="limite-corpo">
        <Anel percentual={percentual} status={status} marca={LIMITE_GASTOS_PERCENT}>
          <strong className="anel-valor">{p.toFixed(0)}%</strong>
          <span className="anel-rotulo">da renda</span>
        </Anel>

        <div className="limite-info">
          <span className={`pilula pilula--${status}`}>{ROTULO_STATUS[status]}</span>

          <dl className="limite-numeros">
            <div>
              <dt>Gastos do mês</dt>
              <dd>
                <Dinheiro valor={totalGastos} />
              </dd>
            </div>
            <div>
              <dt>Limite ({LIMITE_GASTOS_PERCENT}% da renda)</dt>
              <dd>{fmt(limite)}</dd>
            </div>
            <div>
              <dt>Renda do mês</dt>
              <dd>{fmt(renda)}</dd>
            </div>
          </dl>

          {status !== "sem-renda" ? (
            <p className={`limite-folga limite-folga--${status}`}>
              {folga > 0
                ? `Ainda pode gastar ${fmt(folga)}`
                : folga === 0
                ? "Você chegou ao limite"
                : `${fmt(-folga)} acima do limite`}
            </p>
          ) : (
            <p className="limite-folga">Cadastre sua renda para acompanhar o limite.</p>
          )}
        </div>
      </div>
    </section>
  );
}
