"use client";

import { useId } from "react";

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
  /** dia do mês da compra (1 a 31), opcional */
  dia?: number | null;
  /** Presente quando o item é uma parcela de compra parcelada (não vai no autosave). */
  parcela?: { numero: number; total: number; parcelamentoId: number };
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

