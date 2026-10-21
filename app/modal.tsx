"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconeX } from "./icones";

let abertos = 0; // janelas abertas ao mesmo tempo (a rolagem da página só volta quando fecham todas)

/**
 * Janela por cima da página: fecha com Esc, clique fora ou no X, trava a rolagem do fundo
 * e devolve o foco para onde estava. No celular, `folha` vira uma gaveta que sobe de baixo.
 */
export function Modal({
  titulo,
  descricao,
  onFechar,
  children,
  larga,
  folha,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  onFechar: () => void;
  children: React.ReactNode;
  larga?: boolean;
  folha?: boolean;
}) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);

  useEffect(() => {
    fechar.current = onFechar;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const alvo =
      caixa.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      caixa.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.modal-x)");
    alvo?.focus({ preventScroll: true });

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fechar.current();
      }
    };

    abertos++;
    document.body.classList.add("sem-rolagem");
    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      if (--abertos === 0) document.body.classList.remove("sem-rolagem");
      anterior?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className={`modal-fundo ${folha ? "modal-fundo--folha" : ""}`} role="presentation" onClick={() => fechar.current()}>
      <div
        ref={caixa}
        className={`modal ${larga ? "modal--larga" : ""} ${folha ? "modal--folha" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        onClick={(e) => e.stopPropagation()}
      >
        {folha && <span className="modal-alca" aria-hidden="true" />}

        <div className="modal-cabeca">
          <div>
            <h2 id={`${id}-titulo`}>{titulo}</h2>
            {descricao && <p className="modal-desc">{descricao}</p>}
          </div>
          <button type="button" className="btn-icon modal-x" onClick={() => fechar.current()} aria-label="Fechar">
            <IconeX size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

export interface PedidoConfirmacao {
  titulo: string;
  texto: React.ReactNode;
  /** texto do botão de confirmar (padrão: "Confirmar") */
  botao?: string;
  /** ação destrutiva: o botão fica vermelho */
  perigo?: boolean;
}

/**
 * Substitui o window.confirm por uma janela do próprio app.
 * `await confirmar({...})` devolve true se a pessoa confirmou.
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState<(PedidoConfirmacao & { responder: (ok: boolean) => void }) | null>(null);

  const confirmar = (p: PedidoConfirmacao) =>
    new Promise<boolean>((resolve) =>
      setPedido({
        ...p,
        responder: (ok) => {
          setPedido(null);
          resolve(ok);
        },
      })
    );

  const dialogo = pedido && (
    <Modal titulo={pedido.titulo} onFechar={() => pedido.responder(false)}>
      <p className="modal-texto">{pedido.texto}</p>
      <div className="modal-acoes modal-acoes--linha">
        {/* em ação destrutiva, o Enter sem querer cai no "Cancelar" */}
        <button className="btn btn-outline" onClick={() => pedido.responder(false)} data-autofocus={pedido.perigo || undefined}>
          Cancelar
        </button>
        <button
          className={`btn ${pedido.perigo ? "btn-perigo" : "btn-primary"}`}
          onClick={() => pedido.responder(true)}
          data-autofocus={!pedido.perigo || undefined}
        >
          {pedido.botao ?? "Confirmar"}
        </button>
      </div>
    </Modal>
  );

  return { confirmar, dialogo };
}
