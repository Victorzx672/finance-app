"use client";

import { useId } from "react";
import { corDaCategoria } from "@/lib/categorias";

export const fmt = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numero = (v: string) => Math.max(0, Number(v) || 0);

export interface Gasto {
  id: string | number;
  nome: string;
  valor: number;
  /** nulo/ausente = gasto avulso; senão, o nome do cartão */
  cartao?: string | null;
  categoria?: string | null;
  /** quem gastou (ver Preferências) */
  pessoa?: string | null;
  /** dia do mês da compra (1 a 31), opcional */
  dia?: number | null;
  /** Presente quando o item é uma parcela de compra parcelada (não entra no salvamento do mês). */
  parcela?: { numero: number; total: number; parcelamentoId: number };
}

/** Etiqueta de quem gastou. */
export function ChipPessoa({ pessoa }: { pessoa: string }) {
  return (
    <span className="chip-pessoa" title={`Quem gastou: ${pessoa}`}>
      {pessoa}
    </span>
  );
}

/** Etiqueta da categoria, com a cor dela. */
export function ChipCategoria({ categoria }: { categoria: string }) {
  return (
    <span className="chip-cat" title={categoria}>
      <span className="chip-cat-dot" style={{ background: corDaCategoria(categoria) }} />
      {categoria}
    </span>
  );
}

export function Icon({ size = 18, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Lista vazia: ícone + texto, no lugar de um espaço em branco. */
export function Vazio({ texto, busca }: { texto: React.ReactNode; busca?: boolean }) {
  return (
    <div className="empty-state">
      <span className="empty-icone" aria-hidden="true">
        <Icon size={22}>
          {busca ? (
            <>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </>
          ) : (
            <>
              <path d="M4 7h16l-1.5 12a2 2 0 01-2 1.8H7.5a2 2 0 01-2-1.8L4 7z" />
              <path d="M9 7V5a3 3 0 016 0v2" />
            </>
          )}
        </Icon>
      </span>
      <p>{texto}</p>
    </div>
  );
}

export const LogoIcon = ({ size }: { size?: number }) => (
  <Icon size={size}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </Icon>
);

export function InputField({
  label,
  hint,
  prefix,
  suffix,
  type = "text",
  value,
  placeholder,
  max,
  autoComplete,
  action,
  onChange,
}: {
  label: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
  type?: string;
  value: string | number;
  placeholder?: string;
  max?: number;
  autoComplete?: string;
  action?: React.ReactNode;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const numerico = type === "number";

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>

      <div className="input-wrap">
        {prefix && <span className="input-affix">{prefix}</span>}

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value === 0 && numerico ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          {...(numerico && { min: 0, max, step: "0.01", inputMode: "decimal" as const })}
        />

        {suffix && <span className="input-affix end">{suffix}</span>}
        {action}
      </div>

      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

