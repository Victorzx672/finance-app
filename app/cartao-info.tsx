"use client";

import { useRef } from "react";
import { agruparPorCategoria } from "@/lib/calculos";
import type { ConfigCartao } from "@/lib/cartoes";
import { SEM_CATEGORIA, corDaCategoria } from "@/lib/categorias";
import { limiteLivre, parcelasFuturas, restanteParcelas, resumoFatura, situacaoFatura } from "@/lib/fatura-cartao";
import { labelCurto, labelMes } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { Dinheiro, reduzMovimento } from "./animacao";
import { IconeAjustes, IconeCalendario, IconeCheck, IconeRelogio } from "./icones";
import { fmt, type Gasto } from "./ui";

/** Quantas categorias aparecem na legenda da fatura (o resto vira "Outras"). */
const MAX_CATEGORIAS = 5;

/** Cartão desenhado que se inclina acompanhando o mouse. */
function CartaoVisual({
  nome,
  mes,
  total,
  fechamento,
  vencimento,
}: {
  nome: string;
  mes: string;
  total: number;
  fechamento: number | null;
  vencimento: number | null;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mover = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || reduzMovimento()) return;

    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const soltar = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="cartao-visual" ref={ref} onPointerMove={mover} onPointerLeave={soltar} aria-hidden="true">
      <div className="cartao-visual-topo">
        <span className="cartao-visual-marca">{nome}</span>
        <span className="cartao-visual-tipo">Crédito</span>
      </div>

      <div className="cartao-visual-chip-linha">
        <span className="cartao-visual-chip" />
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M8.5 7.5a6 6 0 010 9M12 5a9.5 9.5 0 010 14M15.5 3a13 13 0 010 18" />
        </svg>
      </div>

      <div className="cartao-visual-fatura">
        <span>Fatura de {labelMes(mes).split(" de ")[0].toLowerCase()}</span>
        <strong className="cartao-visual-valor">
          <Dinheiro valor={total} />
        </strong>
      </div>

      <div className="cartao-visual-rodape">
        <span>
          {fechamento && `Fecha ${String(fechamento).padStart(2, "0")}`}
          {fechamento && vencimento && " · "}
          {vencimento && `Vence ${String(vencimento).padStart(2, "0")}`}
        </span>
        <span className="cartao-visual-bandeira">
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

/**
 * Painel da fatura do cartão: cartão desenhado, situação, limite livre (com as parcelas
 * futuras reservadas), datas, resumo, categorias (clique filtra a lista) e próximas faturas.
 */
export function CartaoInfo({
  nome,
  mes,
  config,
  compras,
  ehMesAtual,
  paga,
  categoriaFiltrada,
  onPagar,
  onFiltrarCategoria,
  onConfigurar,
}: {
  nome: string;
  mes: string;
  config: ConfigCartao | undefined;
  /** compras do cartão neste mês (à vista e parcelas) */
  compras: Gasto[];
  ehMesAtual: boolean;
  paga: boolean;
  /** categoria do filtro da lista ("" = todas) */
  categoriaFiltrada: string;
  onPagar: (pago: boolean) => void;
  onFiltrarCategoria: (categoria: string) => void;
  /** leva às Preferências para cadastrar limite e datas */
  onConfigurar: () => void;
}) {
  const resumo = resumoFatura(compras);
  const proximas = parcelasFuturas(compras, 3);
  const futuras = restanteParcelas(compras);
  const situacao = situacaoFatura({
    total: resumo.total,
    paga,
    vencimento: config?.vencimento ?? null,
    mes,
    ehMesAtual,
  });

  const limite = config?.limite ?? null;
  const livre = limite ? limiteLivre({ limite, fatura: resumo.total, paga, futuras }) : 0;
  const naFatura = paga ? 0 : resumo.total;
  // barra do limite: fatura em aberto + parcelas futuras + o que sobra
  const pct = (v: number) => (limite ? Math.min(100, (v / limite) * 100) : 0);

  const categorias = agruparPorCategoria(compras);
  const principais = categorias.slice(0, MAX_CATEGORIAS);
  const resto = categorias.slice(MAX_CATEGORIAS).reduce((acc, c) => acc + c.valor, 0);
  const maiorProxima = Math.max(...proximas.map((p) => p.valor), 1);
  const configurado = !!(config?.limite || config?.fechamento || config?.vencimento);

  return (
    <div className="fatura">
      <div className="fatura-topo">
        <CartaoVisual
          nome={nome}
          mes={mes}
          total={resumo.total}
          fechamento={config?.fechamento ?? null}
          vencimento={config?.vencimento ?? null}
        />

        <div className="fatura-info">
          <span className={`fatura-situacao fatura-situacao--${situacao.tipo}`}>
            {situacao.tipo === "paga" ? <IconeCheck size={14} /> : <IconeRelogio size={14} />}
            {situacao.texto}
          </span>

          {limite ? (
            <div className="fatura-limite">
              <div className="fatura-limite-topo">
                <span>{livre >= 0 ? "Limite disponível (estimado)" : "Acima do limite"}</span>
                <strong className={`fatura-disponivel ${livre < 0 ? "fatura-disponivel--negativo" : ""}`}>
                  <Dinheiro valor={Math.abs(livre)} />
                </strong>
                <span className="fatura-limite-de">de {fmt(limite)}</span>
              </div>

              <div className="fatura-barra" role="img" aria-label="Uso do limite do cartão">
                <span className="fatura-barra-fatura" style={{ width: `${pct(naFatura)}%` }} />
                <span className="fatura-barra-futuras" style={{ width: `${Math.min(pct(futuras), 100 - pct(naFatura))}%` }} />
              </div>

              <ul className="fatura-legenda">
                <li>
                  <i className="fatura-ponto fatura-ponto--fatura" />
                  Fatura {paga ? "(paga)" : "atual"} <b>{fmt(naFatura)}</b>
                </li>
                <li title="O banco reserva no limite o valor das parcelas que ainda vão vencer">
                  <i className="fatura-ponto fatura-ponto--futuras" />
                  Parcelas futuras <b>{fmt(futuras)}</b>
                </li>
              </ul>
            </div>
          ) : (
            <p className="fatura-dica">Informe o limite do cartão para ver quanto ainda dá para usar.</p>
          )}

          {configurado ? (
            <div className="fatura-datas">
              {config?.fechamento && (
                <span className="fatura-data">
                  <IconeCalendario size={15} />
                  <span>
                    Fecha <b>dia {config.fechamento}</b>
                  </span>
                </span>
              )}
              {config?.vencimento && (
                <span className="fatura-data">
                  <IconeRelogio size={15} />
                  <span>
                    Vence <b>dia {config.vencimento}</b>
                  </span>
                </span>
              )}
              {config?.fechamento && (
                <span
                  className="fatura-data fatura-data--dica"
                  title="Compras feitas a partir do dia do fechamento só entram na fatura seguinte: você ganha quase 40 dias para pagar."
                >
                  <IconeCheck size={15} />
                  <span>
                    Melhor dia de compra: <b>dia {config.fechamento}</b>
                  </span>
                </span>
              )}
            </div>
          ) : (
            <button className="btn btn-outline btn-sm fatura-configurar" onClick={onConfigurar}>
              <IconeAjustes size={16} />
              Cadastrar limite, fechamento e vencimento
            </button>
          )}

          {resumo.total > 0 && (
            <div className="fatura-pagar">
              {paga ? (
                <>
                  <span className="fatura-paga-ok">
                    <IconeCheck size={16} /> Fatura marcada como paga
                  </span>
                  <button className="link-btn" onClick={() => onPagar(false)}>
                    Desfazer
                  </button>
                </>
              ) : (
                <button className="btn btn-sm fatura-btn-pagar" onClick={() => onPagar(true)}>
                  <IconeCheck size={16} />
                  Marcar fatura como paga
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {resumo.total > 0 && (
        <div className="fatura-detalhes">
          <div className="fatura-bloco">
            <span className="fatura-bloco-titulo">Nesta fatura</span>
            <dl className="fatura-stats">
              <div className="fatura-stat">
                <dt>À vista</dt>
                <dd>
                  <strong>{fmt(resumo.aVista.valor)}</strong>
                  <small>
                    {resumo.aVista.quantidade} {resumo.aVista.quantidade === 1 ? "compra" : "compras"}
                  </small>
                </dd>
              </div>
              <div className="fatura-stat">
                <dt>Parcelas</dt>
                <dd>
                  <strong>{fmt(resumo.parcelas.valor)}</strong>
                  <small>
                    {resumo.parcelas.quantidade} {resumo.parcelas.quantidade === 1 ? "parcela" : "parcelas"}
                  </small>
                </dd>
              </div>
              {resumo.maior && (
                <div className="fatura-stat">
                  <dt>Maior compra</dt>
                  <dd>
                    <strong>{fmt(resumo.maior.valor)}</strong>
                    <small title={resumo.maior.nome}>{resumo.maior.nome}</small>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="fatura-bloco">
            <span className="fatura-bloco-titulo" title="Parcelas de compras já feitas que caem nos próximos meses">
              Próximas faturas (parcelas já feitas)
            </span>
            {proximas[0].valor > 0 ? (
              <ul className="fatura-proximas">
                {proximas.map((p) => (
                  <li key={p.delta}>
                    <span className="fatura-proxima-barra">
                      <span style={{ height: `${Math.max(4, (p.valor / maiorProxima) * 100)}%` }} />
                    </span>
                    <strong className="fatura-proxima-valor">{fmt(p.valor)}</strong>
                    <small>{labelCurto(somarMes(mes, p.delta))}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fatura-dica">Nenhuma parcela para os próximos meses.</p>
            )}
          </div>

          <div className="fatura-bloco fatura-bloco--largo">
            <span className="fatura-bloco-titulo">Por categoria · clique para filtrar a lista</span>
            <div className="fatura-categorias-barra" aria-hidden="true">
              {principais.map((c) => (
                <span
                  key={c.nome}
                  style={{ width: `${(c.valor / resumo.total) * 100}%`, background: corDaCategoria(c.nome) }}
                />
              ))}
              {resto > 0 && <span style={{ width: `${(resto / resumo.total) * 100}%`, background: "var(--border-strong)" }} />}
            </div>
            <div className="fatura-categorias">
              {principais.map((c) => (
                <button
                  key={c.nome}
                  className="chip-escolha"
                  aria-pressed={categoriaFiltrada === c.nome}
                  style={{ "--cor": corDaCategoria(c.nome) } as React.CSSProperties}
                  onClick={() => onFiltrarCategoria(c.nome)}
                  title={c.nome === SEM_CATEGORIA ? "Compras sem categoria" : `Ver só ${c.nome}`}
                >
                  <span className="chip-cat-dot" />
                  {c.nome}
                  <b>{fmt(c.valor)}</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
