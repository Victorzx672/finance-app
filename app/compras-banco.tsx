"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { labelMes } from "@/lib/meses";
import { IconeCheck, IconeX } from "./icones";
import { fmt } from "./ui";

// O widget da Pluggy mexe no window; só carrega no navegador.
const PluggyConnect = dynamic(() => import("react-pluggy-connect").then((m) => m.PluggyConnect), { ssr: false });

export interface CompraPendente {
  id: number;
  descricao: string;
  valor: number;
  data: string;
  cartao: boolean;
  categoriaBanco: string | null;
}

interface Conexao {
  id: number;
  nomeBanco: string;
  status: string;
  ultimaSync: string | null;
}

const PROBLEMA: Record<string, string> = {
  LOGIN_ERROR: "o login no banco falhou: reconecte",
  OUTDATED: "acesso vencido: reconecte",
  WAITING_USER_INPUT: "o banco pediu uma confirmação: reconecte",
};

/** 1 compra, 2 compras */
export const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const atualizadoHa = (quando: string | null) => {
  if (!quando) return "ainda não atualizado";
  const min = Math.round((Date.now() - new Date(quando).getTime()) / 60_000);
  if (min < 1) return "atualizado agora";
  if (min < 60) return `atualizado há ${min} min`;
  if (min < 24 * 60) return `atualizado há ${Math.round(min / 60)} h`;
  return `atualizado em ${new Date(quando).toLocaleDateString("pt-BR")}`;
};

/**
 * Compras que chegaram do banco conectado (Open Finance, via Pluggy). Elas esperam aqui até
 * o usuário adicionar ao mês ou ignorar. Adicionar só põe a compra no mês (falta Salvar); quem
 * marca como importada é o painel, depois que o mês é salvo. Assim, descartar não perde nada.
 */
export function ComprasBanco({
  mes,
  adicionadas,
  versao,
  onAdicionar,
  onAviso,
}: {
  mes: string;
  /** já postas no mês e ainda não salvas: somem da lista enquanto isso */
  adicionadas: number[];
  /** muda quando o painel marca compras como importadas, para recarregar a lista */
  versao: number;
  onAdicionar: (compras: CompraPendente[]) => void;
  onAviso: (tipo: "ok" | "error", texto: string) => void;
}) {
  const [dados, setDados] = useState<{ configurado: boolean; conexoes: Conexao[]; pendentes: CompraPendente[] } | null>(
    null
  );
  const [token, setToken] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/banco");
      if (res.ok) setDados(await res.json());
    } catch {
      // sem conexão: o cartão só não aparece
    }
  }, []);

  useEffect(() => {
    fetch("/api/banco")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => d && setDados(d))
      .catch(() => {});
  }, [versao]);

  const enviar = async (url: string, metodo: string, corpo?: object) => {
    const res = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
    }).catch(() => null);

    const json = await res?.json().catch(() => ({}));
    if (!res?.ok) throw new Error(json?.error ?? "Não foi possível conectar ao servidor.");
    return json;
  };

  const tarefa = async (fn: () => Promise<string | void>) => {
    setOcupado(true);
    try {
      const msg = await fn();
      if (msg) onAviso("ok", msg);
    } catch (e) {
      onAviso("error", (e as Error).message);
    } finally {
      setOcupado(false);
      carregar();
    }
  };

  const conectar = () =>
    tarefa(async () => {
      const { accessToken } = await enviar("/api/banco/connect-token", "POST");
      setToken(accessToken);
    });

  const conectou = (itemId: string) => {
    setToken(null);
    tarefa(async () => {
      const { novas, importando } = await enviar("/api/banco", "POST", { itemId });
      return importando && novas === 0
        ? "Banco conectado. Ele ainda está enviando as compras: clique em Atualizar em alguns minutos."
        : `Banco conectado. ${plural(novas, "compra encontrada", "compras encontradas")}.`;
    });
  };

  const atualizar = () =>
    tarefa(async () => {
      const { novas } = await enviar("/api/banco/sincronizar", "POST");
      return novas > 0 ? `${plural(novas, "compra nova", "compras novas")} do banco.` : "Nenhuma compra nova.";
    });

  const desconectar = (c: Conexao) =>
    tarefa(async () => {
      await enviar(`/api/banco?id=${c.id}`, "DELETE");
      return `${c.nomeBanco} desconectado.`;
    });

  const ignorar = (compras: CompraPendente[]) =>
    tarefa(async () => {
      await enviar("/api/banco/transacoes", "PUT", { ids: compras.map((c) => c.id), estado: "ignorada" });
      return `${plural(compras.length, "compra ignorada", "compras ignoradas")}.`;
    });

  if (!dados?.configurado) return null;

  // a data vem como dia do calendário ("AAAA-MM-DD..."); ler pelo texto evita o fuso mudar o dia
  const visiveis = dados.pendentes.filter((p) => !adicionadas.includes(p.id));
  const doMes = visiveis.filter((p) => p.data.slice(0, 7) === mes);
  const outrosMeses = visiveis.length - doMes.length;

  return (
    <section className="card compras-banco">
      <div className="compras-banco-topo">
        <div>
          <h2 className="panel-title">
            Compras do banco
            {visiveis.length > 0 && <span className="compras-banco-contador">{visiveis.length}</span>}
          </h2>
          {dados.conexoes.length === 0 ? (
            <p className="field-hint">Conecte seu banco pelo Open Finance e as compras aparecem aqui sozinhas.</p>
          ) : (
            <ul className="compras-banco-conexoes">
              {dados.conexoes.map((c) => (
                <li key={c.id} className={`conexao-pill ${PROBLEMA[c.status] ? "conexao-pill--problema" : ""}`}>
                  <span className="conexao-pill-ponto" aria-hidden />
                  <strong>{c.nomeBanco}</strong>
                  <span>{PROBLEMA[c.status] ?? atualizadoHa(c.ultimaSync)}</span>
                  <button className="link-btn" disabled={ocupado} onClick={() => desconectar(c)}>
                    Desconectar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="compras-banco-acoes">
          {dados.conexoes.length > 0 && (
            <button className="btn btn-outline btn-sm" disabled={ocupado} onClick={atualizar}>
              Atualizar
            </button>
          )}
          <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={conectar}>
            Conectar banco
          </button>
        </div>
      </div>

      {doMes.length > 0 && (
        <>
          <ul className="importar-lista">
            {doMes.map((p) => (
              <li key={p.id} className="importar-linha compras-banco-linha">
                <span className="linha-data">{p.data.slice(8, 10)}</span>
                <span className="linha-nome" title={p.descricao}>
                  <span className="linha-texto">{p.descricao}</span>
                  {p.cartao && <span className="expense-tag">cartão</span>}
                </span>
                <span className="expense-value linha-valor">{fmt(p.valor)}</span>
                <button
                  className="btn-icon"
                  title="Ignorar"
                  aria-label={`Ignorar ${p.descricao}`}
                  disabled={ocupado}
                  onClick={() => ignorar([p])}
                >
                  <IconeX size={16} />
                </button>
                <button
                  className="btn-icon compras-banco-add"
                  title="Adicionar ao mês"
                  aria-label={`Adicionar ${p.descricao}`}
                  disabled={ocupado}
                  onClick={() => onAdicionar([p])}
                >
                  <IconeCheck size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="modal-acoes modal-acoes--linha">
            <button className="btn btn-outline btn-sm" disabled={ocupado} onClick={() => ignorar(doMes)}>
              Ignorar todas
            </button>
            <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => onAdicionar(doMes)}>
              Adicionar {doMes.length} ({fmt(doMes.reduce((a, p) => a + p.valor, 0))})
            </button>
          </div>
        </>
      )}

      {dados.conexoes.length > 0 && doMes.length === 0 && (
        <p className="field-hint">Nenhuma compra nova do banco em {labelMes(mes)}.</p>
      )}
      {outrosMeses > 0 && (
        <p className="field-hint">{plural(outrosMeses, "compra esperando", "compras esperando")} em outros meses.</p>
      )}

      {/* vai direto no body: a animação do layout do mês deixa um transform, e com ele a janela
          "fixa" da Pluggy ficava presa dentro da seção, fora da tela */}
      {token &&
        createPortal(
          <PluggyConnect
            connectToken={token}
            includeSandbox={process.env.NODE_ENV !== "production"}
            onSuccess={({ item }) => conectou(item.id)}
            onError={({ message }) => onAviso("error", message)}
            onClose={() => setToken(null)}
          />,
          document.body
        )}
    </section>
  );
}
