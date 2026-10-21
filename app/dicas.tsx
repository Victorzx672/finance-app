"use client";

import { economiaPotencial, type Dica } from "@/lib/dicas";
import { OPCOES, type Passo } from "@/lib/investimentos";
import { IconeEscudo, IconeLampada, IconeTendencia } from "./icones";
import { Icon, Vazio, fmt } from "./ui";

const ROTULO_TIPO = { cortar: "Cortar", atencao: "Atenção", ok: "Tudo certo" } as const;

/** Onde cortar (a partir dos números do mês) e guia educativo de como guardar com segurança. */
export function PainelDicas({
  mesLabel,
  dicas,
  totalGastos,
  passos,
}: {
  mesLabel: string;
  dicas: Dica[];
  totalGastos: number;
  passos: Passo[];
}) {
  const economia = economiaPotencial(dicas, totalGastos);
  const temCortes = dicas.some((d) => d.tipo !== "ok");

  return (
    <div className="dicas-layout">
      <section className="card">
        <div className="panel-head panel-head--icone">
          <span className="panel-icone panel-icone--amber" aria-hidden="true">
            <IconeLampada size={20} />
          </span>
          <div>
            <h2 className="panel-title">Onde dá para gastar menos em {mesLabel}</h2>
            <p className="panel-sub">Calculado com os números que você lançou. Quanto mais completo o mês, melhores as dicas.</p>
          </div>
        </div>

        {dicas.length === 0 ? (
          <Vazio texto="Preencha a renda e os gastos do mês para receber dicas personalizadas." />
        ) : (
          <div className="dicas-corpo">
            {temCortes && economia > 0 && (
              <div className="dicas-resumo">
                <span>Se você seguir as dicas de corte, pode liberar cerca de</span>
                <strong>{fmt(economia)} por mês</strong>
                <span>({fmt(economia * 12)} em 12 meses, sem contar rendimento)</span>
              </div>
            )}

            <ul className="dicas-lista">
              {dicas.map((d) => (
                <li key={d.id} className={`dica dica--${d.tipo}`}>
                  <div className="dica-topo">
                    <span className="dica-tipo">{ROTULO_TIPO[d.tipo]}</span>
                    <strong>{d.titulo}</strong>
                    {d.economia > 0 && <span className="dica-economia">até {fmt(d.economia)}/mês</span>}
                  </div>
                  <p>{d.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <div className="panel-head panel-head--icone">
          <span className="panel-icone panel-icone--teal" aria-hidden="true">
            <IconeEscudo size={20} />
          </span>
          <div>
            <h2 className="panel-title">Guardando com segurança</h2>
            <p className="panel-sub">A ordem de prioridades que educadores financeiros costumam ensinar, com a sua situação.</p>
          </div>
        </div>

        <ol className="passos">
          {passos.map((p) => (
            <li key={p.id} className={`passo passo--${p.status}`}>
              <span className="passo-marca" aria-hidden="true">
                {p.status === "feito" ? (
                  <Icon size={16}>
                    <path d="M20 6L9 17l-5-5" />
                  </Icon>
                ) : p.status === "pendente" ? (
                  "!"
                ) : (
                  "•"
                )}
              </span>
              <div>
                <strong>{p.titulo}</strong>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <div className="panel-head panel-head--icone">
          <span className="panel-icone panel-icone--blue" aria-hidden="true">
            <IconeTendencia size={20} />
          </span>
          <div>
            <h2 className="panel-title">Opções de renda fixa de baixo risco</h2>
            <p className="panel-sub">Cada uma serve a um prazo diferente. Não há uma &quot;melhor&quot; para tudo: depende de quando você vai precisar do dinheiro.</p>
          </div>
        </div>

        <div className="opcoes-grid">
          {OPCOES.map((o) => (
            <article key={o.id} className="opcao-card">
              <h3>{o.nome}</h3>
              <p className="opcao-para">{o.paraQue}</p>

              <dl>
                <dt>Liquidez</dt>
                <dd>{o.liquidez}</dd>
                <dt>Risco</dt>
                <dd>{o.risco}</dd>
                <dt>Garantia</dt>
                <dd>{o.garantia}</dd>
                <dt>Imposto</dt>
                <dd>{o.imposto}</dd>
              </dl>

              <p className="opcao-atencao">{o.atencao}</p>
            </article>
          ))}
        </div>

        <p className="aviso-educativo">
          Conteúdo educativo, não é recomendação de investimento nem substitui um assessor ou analista credenciado. As
          taxas mudam o tempo todo e não aparecem aqui: compare em simuladores da própria corretora ou do Tesouro Direto.
          Aplique só por instituições autorizadas pelo Banco Central ou pela CVM, e desconfie de promessa de retorno alto
          sem risco.
        </p>
      </section>
    </div>
  );
}
