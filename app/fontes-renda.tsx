"use client";

import { Icon, fmt, numero } from "./ui";

export interface FonteRenda {
  id: string | number;
  nome: string;
  valor: number;
}

export const novaFonte = (): FonteRenda => ({ id: crypto.randomUUID(), nome: "", valor: 0 });

/** Lista de fontes de renda (salário, extra...) com o total no final. */
export function FontesRenda({
  fontes,
  total,
  onChange,
}: {
  fontes: FonteRenda[];
  total: number;
  onChange: (fontes: FonteRenda[]) => void;
}) {
  const alterar = (id: FonteRenda["id"], parte: Partial<FonteRenda>) =>
    onChange(fontes.map((f) => (f.id === id ? { ...f, ...parte } : f)));

  // Sempre sobra uma linha: apagar a última só a limpa
  const remover = (id: FonteRenda["id"]) => {
    const resto = fontes.filter((f) => f.id !== id);
    onChange(resto.length > 0 ? resto : [novaFonte()]);
  };

  return (
    <div className="fontes">
      <div className="fontes-lista">
        {fontes.map((f, i) => (
          <div key={f.id} className="fonte-row">
            <div className="input-wrap">
              <input
                type="text"
                placeholder={i === 0 ? "Ex.: Salário" : "Ex.: Freelance, aluguel..."}
                aria-label={`Nome da fonte de renda ${i + 1}`}
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
                aria-label={`Valor da fonte de renda ${i + 1}`}
                value={f.valor || ""}
                onChange={(e) => alterar(f.id, { valor: numero(e.target.value) })}
              />
            </div>

            <button
              className="btn-icon btn-icon--danger"
              onClick={() => remover(f.id)}
              aria-label={`Remover fonte de renda ${i + 1}`}
              title="Remover"
            >
              <Icon size={16}>
                <path d="M18 6L6 18M6 6l12 12" />
              </Icon>
            </button>
          </div>
        ))}
      </div>

      <button className="btn btn-outline btn-sm fonte-add" onClick={() => onChange([...fontes, novaFonte()])}>
        + Adicionar fonte de renda
      </button>

      <div className="fonte-total">
        <span>Total de renda</span>
        <strong>{fmt(total)}</strong>
      </div>
    </div>
  );
}
