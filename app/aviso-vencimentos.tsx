"use client";

import { textoVencimento, type SituacaoConta } from "@/lib/vencimentos";
import { Icon } from "./ui";

export interface ItemVencimento {
  nome: string;
  dias: number;
  situacao: SituacaoConta;
}

/** Contas atrasadas ou prestes a vencer (só no mês atual). */
export function AvisoVencimentos({ itens }: { itens: ItemVencimento[] }) {
  if (itens.length === 0) return null;

  const atrasadas = itens.some((i) => i.situacao === "atrasada");

  return (
    <section className={`card limite-aviso limite-aviso--${atrasadas ? "excedido" : "atencao"}`} role="alert">
      <div className="limite-icone">
        <Icon size={22}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </Icon>
      </div>

      <div className="limite-texto">
        <strong>
          {itens.length === 1 ? "1 conta pede atenção" : `${itens.length} contas pedem atenção`}
        </strong>
        <ul className="aviso-lista">
          {itens.map((i) => (
            <li key={i.nome}>
              <b>{i.nome}</b>: {textoVencimento(i.dias)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
