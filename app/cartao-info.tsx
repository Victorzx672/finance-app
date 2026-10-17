"use client";

import type { ConfigCartao } from "@/lib/cartoes";
import { diasAteVencimento, textoVencimento } from "@/lib/vencimentos";
import { fmt } from "./ui";

/** Limite usado, fechamento e vencimento da fatura do cartão. */
export function CartaoInfo({
  mes,
  config,
  usado,
  ehMesAtual,
  paga,
  onPagar,
}: {
  mes: string;
  config: ConfigCartao | undefined;
  /** total das compras do cartão neste mês */
  usado: number;
  ehMesAtual: boolean;
  paga: boolean;
  onPagar: (pago: boolean) => void;
}) {
  if (!config || (!config.limite && !config.vencimento && !config.fechamento)) {
    return (
      <p className="cartao-dica">
        Informe o limite, o fechamento e o vencimento do cartão na aba <b>Preferências</b> para acompanhar a fatura.
      </p>
    );
  }

  const percentual = config.limite ? Math.min(100, (usado / config.limite) * 100) : 0;
  const classe = percentual >= 90 ? "danger" : percentual >= 70 ? "warning" : "ok";

  return (
    <div className="cartao-info">
      {config.limite && (
        <div className="cartao-limite">
          <div className="spend-head">
            <span>
              Limite usado: {fmt(usado)} de {fmt(config.limite)}
            </span>
            <strong>{percentual.toFixed(0)}%</strong>
          </div>
          <div className="spend-track">
            <div className={`spend-fill ${classe}`} style={{ width: `${percentual}%` }} />
          </div>
          {usado > config.limite && <span className="spend-note spend-note--excedido">Acima do limite do cartão</span>}
        </div>
      )}

      {(config.fechamento || config.vencimento) && (
        <div className="cartao-datas">
          {config.fechamento && <span>Fecha dia {config.fechamento}</span>}

          {config.vencimento && (
            <span>
              Vence dia {config.vencimento}
              {ehMesAtual && !paga && usado > 0 && ` (${textoVencimento(diasAteVencimento(config.vencimento, mes))})`}
            </span>
          )}

          {config.vencimento && usado > 0 && (
            <label className="check-row cartao-paga">
              <input type="checkbox" checked={paga} onChange={(e) => onPagar(e.target.checked)} />
              Fatura paga
            </label>
          )}
        </div>
      )}
    </div>
  );
}
