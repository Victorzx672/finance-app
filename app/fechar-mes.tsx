"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITE_GASTOS_PERCENT, somar, type StatusLimite } from "@/lib/calculos";
import {
  prepararProximoMes,
  quantasPendencias,
  type BaseDoMes,
  type Pendencias,
  type SituacaoMes,
} from "@/lib/fechamento";
import { labelMes } from "@/lib/meses";
import { somarMes } from "@/lib/parcelas";
import { centroDe, soltarConfete } from "./confete";
import { buscarContas, buscarFinanca, buscarParcelas, buscarRendasFixas } from "./dados";
import { IconeAlerta, IconeCheck } from "./icones";
import { Modal } from "./modal";
import { fmt } from "./ui";

/** "2026-11" -> "novembro" */
export const nomeDoMes = (mes: string) => labelMes(mes).split(" ")[0].toLowerCase();

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// ─── Situação do mês, ao lado do seletor ──────────────────────────────────────

/**
 * Diz em que pé o mês está (dias que faltam, concluído...) e oferece a ação certa:
 * concluir o mês em andamento ou um que já terminou, ou reabrir um concluído.
 */
export function StatusMes({
  situacao,
  concluidoEm,
  pendencias,
  podeAgir,
  onConcluir,
  onReabrir,
}: {
  situacao: SituacaoMes;
  concluidoEm: string | null;
  /** quantas coisas valem conferir antes de concluir */
  pendencias: number;
  /** o mês terminou de carregar */
  podeAgir: boolean;
  onConcluir: () => void;
  onReabrir: () => void;
}) {
  let texto: string;
  let tom: "neutro" | "alerta" | "ok" = "neutro";

  if (situacao.tipo === "concluido") {
    tom = "ok";
    texto = concluidoEm
      ? `Concluído em ${new Date(concluidoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`
      : "Concluído";
  } else if (situacao.tipo === "terminou") {
    tom = "alerta";
    texto = "Terminou, falta concluir";
  } else if (situacao.tipo === "futuro") {
    texto = "Ainda não começou";
  } else if (situacao.diasRestantes === null) {
    texto = "Em andamento";
  } else {
    if (situacao.diasRestantes <= 3) tom = "alerta";
    texto = situacao.diasRestantes === 1 ? "Último dia do mês" : `Termina em ${situacao.diasRestantes} dias`;
  }

  return (
    <div className="status-mes">
      <span className={`status-mes-chip status-mes-chip--${tom}`}>
        {tom === "ok" ? <IconeCheck size={14} /> : <span className="status-mes-ponto" aria-hidden="true" />}
        {texto}
      </span>

      {situacao.tipo === "concluido" ? (
        <button className="btn btn-outline btn-sm" onClick={onReabrir} disabled={!podeAgir}>
          Reabrir
        </button>
      ) : situacao.tipo !== "futuro" ? (
        <button className="btn btn-primary btn-sm status-mes-concluir" onClick={onConcluir} disabled={!podeAgir}>
          <IconeCheck size={16} />
          <span>
            Concluir<span className="status-mes-palavra"> mês</span>
          </span>
          {pendencias > 0 && (
            <span className="status-mes-badge" title={`${plural(pendencias, "item", "itens")} para conferir`}>
              {pendencias}
            </span>
          )}
        </button>
      ) : null}
    </div>
  );
}

/** Lembrete no mês em andamento quando o anterior ficou aberto. */
export function AvisoMesAberto({ mes, onRevisar }: { mes: string; onRevisar: () => void }) {
  return (
    <section className="card copy-banner aviso-mes-aberto">
      <p>
        <strong>{labelMes(mes)} ainda está aberto.</strong> Conclua para fechar as contas dele e manter o histórico em
        dia.
      </p>

      <div className="copy-actions">
        <button className="btn btn-primary btn-sm" onClick={onRevisar}>
          Revisar e concluir
        </button>
      </div>
    </section>
  );
}

// ─── Janela de fechamento ─────────────────────────────────────────────────────

interface Previa {
  jaTemDados: boolean;
  temRendasFixas: boolean;
  rendaFixa: number;
  contas: { quantidade: number; total: number };
  parcelas: { quantidade: number; total: number };
}

function Checagem({
  ok,
  titulo,
  detalhe,
  acao,
}: {
  ok: boolean;
  titulo: React.ReactNode;
  detalhe: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <li className={`fech-item ${ok ? "fech-item--ok" : "fech-item--pendente"}`}>
      <span className="fech-item-icone" aria-label={ok ? "em ordem" : "pendente"}>
        {ok ? <IconeCheck size={13} /> : <IconeAlerta size={13} />}
      </span>
      <span className="fech-item-textos">
        <span className="fech-item-titulo">{titulo}</span>
        <span className="fech-item-detalhe">{detalhe}</span>
      </span>
      {acao}
    </li>
  );
}

/**
 * Fechamento do mês: como o mês terminou, o que vale conferir antes (com as ações ali
 * mesmo) e com o que o mês seguinte vai começar. Nada impede de concluir: as pendências
 * são só um lembrete.
 */
export function JanelaFechamento({
  mes,
  resultado,
  gastosMesAnterior,
  pendencias,
  investimento,
  investimentoGuardado,
  quantidadeContas,
  cartao,
  atual,
  podeGuardar,
  onSalvar,
  onPagarContas,
  onPagarFatura,
  onGuardar,
  onConcluir,
  onFechar,
}: {
  mes: string;
  resultado: { renda: number; totalGastos: number; saldo: number; percentGastos: number; statusLimite: StatusLimite };
  /** total gasto no mês anterior, para comparar (null = sem dados) */
  gastosMesAnterior: number | null;
  pendencias: Pendencias;
  investimento: number;
  investimentoGuardado: number;
  quantidadeContas: number;
  cartao: { nome: string; total: number };
  /** valores do mês como estão agora (para mostrar o que será copiado) */
  atual: BaseDoMes;
  /** o "Guardar" só funciona com o mês salvo */
  podeGuardar: boolean;
  onSalvar: () => Promise<unknown>;
  onPagarContas: () => Promise<unknown>;
  onPagarFatura: () => Promise<unknown>;
  onGuardar: (valor: number) => Promise<unknown>;
  /** devolve uma mensagem de erro, ou null se concluiu */
  onConcluir: () => Promise<string | null>;
  onFechar: () => void;
}) {
  const proximo = somarMes(mes, 1);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelado = false;

    Promise.all([buscarFinanca(proximo), buscarRendasFixas(proximo), buscarContas(proximo), buscarParcelas(proximo)]).then(
      ([financa, rendasFixas, { contas }, parcelas]) => {
        if (cancelado) return;

        setPrevia({
          jaTemDados: !!financa?.finance,
          temRendasFixas: rendasFixas.length > 0,
          rendaFixa: somar(rendasFixas),
          contas: { quantidade: contas.length, total: somar(contas) },
          parcelas: { quantidade: parcelas.length, total: somar(parcelas) },
        });
      }
    );

    return () => {
      cancelado = true;
    };
  }, [proximo]);

  const agir = async (id: string, acao: () => Promise<unknown>) => {
    setOcupado(id);
    setErro("");
    try {
      await acao();
    } finally {
      setOcupado(null);
    }
  };

  const concluir = async () => {
    const origem = centroDe(botao.current);
    setOcupado("concluir");
    setErro("");

    const falha = await onConcluir();

    // deu certo: a janela fecha sozinha (o painel já foi para o mês seguinte)
    if (!falha) {
      if (resultado.saldo >= 0) soltarConfete(origem, 120);
      return;
    }

    setOcupado(null);
    setErro(falha);
  };

  const { saldo, renda, totalGastos, percentGastos, statusLimite } = resultado;
  const percentual = Math.round(percentGastos);
  const diferenca = gastosMesAnterior !== null && gastosMesAnterior > 0 ? totalGastos - gastosMesAnterior : null;
  const copia = previa && !previa.jaTemDados ? prepararProximoMes(atual, previa.temRendasFixas) : null;

  const itensProximo = previa
    ? [
        previa.rendaFixa > 0 && { rotulo: "Renda fixa", valor: fmt(previa.rendaFixa) },
        copia && copia.rendas.length > 0 && { rotulo: "Renda (copiada)", valor: fmt(somar(copia.rendas)) },
        previa.contas.quantidade > 0 && {
          rotulo: plural(previa.contas.quantidade, "conta fixa", "contas fixas"),
          valor: fmt(previa.contas.total),
        },
        previa.parcelas.quantidade > 0 && {
          rotulo: plural(previa.parcelas.quantidade, "parcela", "parcelas"),
          valor: fmt(previa.parcelas.total),
        },
        copia && copia.gastosFixos > 0 && { rotulo: "Outros gastos fixos", valor: fmt(copia.gastosFixos) },
        copia && copia.gastosVariaveis > 0 && { rotulo: "Gastos variáveis (estimativa)", valor: fmt(copia.gastosVariaveis) },
        copia && copia.percentualInvestimento > 0 && {
          rotulo: "Para investir",
          valor: `${copia.percentualInvestimento}% da sobra`,
        },
      ].filter((i): i is { rotulo: string; valor: string } => !!i)
    : [];

  const pendentes = quantasPendencias(pendencias);

  return (
    <Modal
      titulo={`Concluir ${labelMes(mes)}`}
      descricao={
        <>
          Confira como o mês fechou. Depois de concluído, ele fica guardado como está e o FluxoPay segue para{" "}
          <strong>{nomeDoMes(proximo)}</strong>.
        </>
      }
      onFechar={() => !ocupado && onFechar()}
      folha
    >
      <div className={`fech-resultado fech-resultado--${saldo >= 0 ? "ok" : "neg"}`}>
        <span className="fech-resultado-rotulo">{saldo >= 0 ? "Sobrou no mês" : "Faltou no mês"}</span>
        <strong className="fech-resultado-valor fech-valor">{fmt(Math.abs(saldo))}</strong>

        <div
          className={`fech-barra fech-barra--${statusLimite}`}
          role="img"
          aria-label={`Gastos: ${percentual}% da renda. Limite: ${LIMITE_GASTOS_PERCENT}%.`}
        >
          <span className="fech-barra-uso" style={{ width: `${Math.min(100, percentGastos)}%` }} />
          <span className="fech-barra-limite" style={{ left: `${LIMITE_GASTOS_PERCENT}%` }} title="Limite de 60%" />
        </div>

        <dl className="fech-numeros">
          <div>
            <dt>Renda</dt>
            <dd className="fech-valor">{fmt(renda)}</dd>
          </div>
          <div>
            <dt>Gastos</dt>
            <dd className="fech-valor">{fmt(totalGastos)}</dd>
          </div>
          <div>
            <dt>Da renda</dt>
            <dd>{renda > 0 ? `${percentual}%` : "—"}</dd>
          </div>
        </dl>

        {diferenca !== null && Math.abs(diferenca) >= 0.01 && (
          <p className="fech-comparacao fech-valor">
            {diferenca < 0
              ? `Gastou ${fmt(-diferenca)} a menos que em ${nomeDoMes(somarMes(mes, -1))}.`
              : `Gastou ${fmt(diferenca)} a mais que em ${nomeDoMes(somarMes(mes, -1))}.`}
          </p>
        )}
      </div>

      <section className="fech-secao" aria-label="Antes de concluir">
        <h3>{pendentes === 0 ? "Tudo em ordem" : "Antes de concluir"}</h3>

        <ul className="fech-lista">
          {pendencias.salvar && (
            <Checagem
              ok={false}
              titulo="Alterações não salvas"
              detalhe="Elas são salvas junto com o fechamento."
              acao={
                <button className="btn btn-outline btn-sm" disabled={!!ocupado} onClick={() => agir("salvar", onSalvar)}>
                  {ocupado === "salvar" ? "Salvando..." : "Salvar agora"}
                </button>
              }
            />
          )}

          {quantidadeContas > 0 &&
            (pendencias.contas.quantidade === 0 ? (
              <Checagem
                ok
                titulo="Contas fixas pagas"
                detalhe={`${plural(quantidadeContas, "conta marcada", "contas marcadas")} como paga${quantidadeContas === 1 ? "" : "s"}.`}
              />
            ) : (
              <Checagem
                ok={false}
                titulo={`${plural(pendencias.contas.quantidade, "conta fixa", "contas fixas")} sem marcar como paga${pendencias.contas.quantidade === 1 ? "" : "s"}`}
                detalhe={<span className="fech-valor">{fmt(pendencias.contas.total)}</span>}
                acao={
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={!!ocupado}
                    onClick={() => agir("contas", onPagarContas)}
                  >
                    {ocupado === "contas" ? "Marcando..." : "Marcar como pagas"}
                  </button>
                }
              />
            ))}

          {cartao.total > 0 &&
            (pendencias.fatura === 0 ? (
              <Checagem ok titulo={`Fatura do ${cartao.nome} paga`} detalhe="Marcada como paga neste mês." />
            ) : (
              <Checagem
                ok={false}
                titulo={`Fatura do ${cartao.nome} em aberto`}
                detalhe={<span className="fech-valor">{fmt(pendencias.fatura)}</span>}
                acao={
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={!!ocupado}
                    onClick={() => agir("fatura", onPagarFatura)}
                  >
                    {ocupado === "fatura" ? "Marcando..." : "Marcar como paga"}
                  </button>
                }
              />
            ))}

          {(investimento > 0 || investimentoGuardado > 0) &&
            (pendencias.investir === 0 ? (
              <Checagem
                ok
                titulo="Sobra guardada"
                detalhe={
                  <>
                    <span className="fech-valor">{fmt(investimentoGuardado)}</span> somados ao total guardado.
                  </>
                }
              />
            ) : (
              <Checagem
                ok={false}
                titulo={
                  <>
                    Falta guardar <span className="fech-valor">{fmt(pendencias.investir)}</span>
                  </>
                }
                detalhe={
                  podeGuardar
                    ? "Do que você separou para investir. Some ao total guardado se já guardou."
                    : "Salve o mês primeiro para somar ao total guardado."
                }
                acao={
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={!!ocupado || !podeGuardar}
                    onClick={() => agir("guardar", () => onGuardar(investimento))}
                  >
                    {ocupado === "guardar" ? "Guardando..." : "Guardei"}
                  </button>
                }
              />
            ))}

          {pendencias.semRenda && (
            <Checagem
              ok={false}
              titulo="Mês sem renda"
              detalhe="Sem a renda, o resumo do mês fica incompleto. Dá para concluir mesmo assim."
            />
          )}

          {pendentes === 0 && quantidadeContas === 0 && cartao.total === 0 && investimento === 0 && (
            <Checagem ok titulo="Nada pendente" detalhe="Pode concluir quando quiser." />
          )}
        </ul>
      </section>

      <section className="fech-secao fech-proximo" aria-label={`Como ${nomeDoMes(proximo)} começa`}>
        <h3>{labelMes(proximo)} começa com</h3>

        {!previa ? (
          <div className="esqueleto fech-proximo-carregando" aria-label="Carregando" />
        ) : (
          <>
            {itensProximo.length > 0 ? (
              <ul className="fech-proximo-lista">
                {itensProximo.map((i) => (
                  <li key={i.rotulo}>
                    <span>{i.rotulo}</span>
                    <b className="fech-valor">{i.valor}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fech-proximo-nota">Nada ainda: ele começa vazio.</p>
            )}

            {previa.jaTemDados && (
              <p className="fech-proximo-nota">Ele já tem valores salvos, então nada deste mês é copiado.</p>
            )}
          </>
        )}
      </section>

      {erro && <p className="auth-msg error">{erro}</p>}

      <div className="modal-acoes modal-acoes--linha fech-acoes">
        <button className="btn btn-outline" onClick={onFechar} disabled={!!ocupado}>
          Cancelar
        </button>
        <button ref={botao} className="btn btn-primary" onClick={concluir} disabled={!!ocupado} data-autofocus>
          {ocupado === "concluir" ? "Concluindo..." : pendencias.salvar ? "Salvar e concluir" : `Concluir ${nomeDoMes(mes)}`}
        </button>
      </div>
    </Modal>
  );
}
