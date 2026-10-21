"use client";

import { Modal } from "./modal";

const ATALHOS: [string[], string][] = [
  [["N"], "Lançar um gasto novo"],
  [["Ctrl", "S"], "Salvar as alterações do mês"],
  [["←", "→"], "Mês anterior / próximo mês"],
  [["1", "…", "5"], "Ir para Mês, Metas, Ano, Dicas, Preferências"],
  [["O"], "Ocultar ou mostrar os valores"],
  [["T"], "Alternar modo claro e escuro"],
  [["?"], "Mostrar esta lista"],
];

/** Lista de atalhos do teclado (abre com "?"). */
export function JanelaAtalhos({ onFechar }: { onFechar: () => void }) {
  return (
    <Modal titulo="Atalhos do teclado" descricao="Funcionam quando você não está digitando em um campo." onFechar={onFechar}>
      <ul className="atalhos">
        {ATALHOS.map(([teclas, texto]) => (
          <li key={texto}>
            <span>{texto}</span>
            <span className="atalho-teclas">
              {teclas.map((t) => (t === "…" ? <span key={t}>…</span> : <kbd key={t}>{t}</kbd>))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** O foco está num campo de texto? (aí as teclas são do campo, não atalhos) */
export const digitando = (alvo: EventTarget | null) => {
  const el = alvo as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};
