"use client";

import { IconeX } from "./icones";
import { fmt, numero } from "./ui";

export interface FonteRenda {
  id: string | number;
  nome: string;
  valor: number;
}

export const novaFonte = (): FonteRenda => ({ id: crypto.randomUUID(), nome: "", valor: 0 });

/** Rendas extras só deste mês (freelance, 13º...), com o total de renda do mês no final. */
export function FontesRenda({
  fontes,
  total,
  onChange,
  onTornarFixa,
}: {
  fontes: FonteRenda[];
  /** renda total do mês: rendas fixas + extras */
  total: number;
  onChange: (fontes: FonteRenda[]) => void;
  /** transforma uma renda extra em renda fixa (se a tela oferecer isso) */
  onTornarFixa?: (fonte: FonteRenda) => void;
}) {
  const alterar = (id: FonteRenda["id"], parte: Partial<FonteRenda>) =>
    onChange(fontes.map((f) => (f.id === id ? { ...f, ...parte } : f)));

  const remover = (id: FonteRenda["id"]) => onChange(fontes.filter((f) => f.id !== id));

  return (
    <div className="fontes">
      <span className="subsecao-titulo">Rendas extras (só este mês)</span>

      {fontes.length > 0 && (
        <div className="fontes-lista">
          {fontes.map((f, i) => (
            <div key={f.id} className="fonte-row">
              <div className="input-wrap">
                <input
                  type="text"
                  placeholder="Ex.: Freelance, 13º, venda..."
                  aria-label={`Nome da renda extra ${i + 1}`}
                  value={f.nome}
                  maxLength={60}
                  onChange={(e) => alterar(f.id, { nome: e.target.value })}
                />
              </div>

              <div className="input-wrap short">
                <span className="input-affix">R$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-label={`Valor da renda extra ${i + 1}`}
                  value={f.valor || ""}
                  onChange={(e) => alterar(f.id, { valor: numero(e.target.value) })}
                />
              </div>

              {onTornarFixa && f.nome.trim() && f.valor > 0 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onTornarFixa(f)}
                  title="Repetir esta renda todo mês, a partir deste"
                >
                  Tornar fixa
                </button>
              )}

              <button
                className="btn-icon btn-icon--danger"
                onClick={() => remover(f.id)}
                aria-label={`Remover renda extra ${i + 1}`}
                title="Remover"
              >
                <IconeX size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-outline btn-sm fonte-add" onClick={() => onChange([...fontes, novaFonte()])}>
        + Adicionar renda extra
      </button>

      <div className="fonte-total">
        <span>Total de renda do mês</span>
        <strong>{fmt(total)}</strong>
      </div>
    </div>
  );
}
