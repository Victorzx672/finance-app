"use client";

import { useEffect, useRef, useState } from "react";
import { fmt } from "./ui";

/** Quem pediu ao sistema menos animação vê os valores mudarem direto. */
export const reduzMovimento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Valor que "corre" até o alvo (contagem animada). Começa do zero na primeira vez,
 * e depois anima de onde está até o novo valor sempre que ele muda.
 */
export function useContagem(alvo: number, duracaoMs = 650) {
  const [valor, setValor] = useState(0);
  const atual = useRef(0);

  useEffect(() => {
    const de = atual.current;
    const imediato = de === alvo || reduzMovimento();
    const inicio = performance.now();
    let quadro = 0;

    const passo = (agora: number) => {
      const p = imediato ? 1 : Math.min(1, (agora - inicio) / duracaoMs);
      const suave = 1 - (1 - p) ** 3;
      atual.current = p === 1 ? alvo : de + (alvo - de) * suave;
      setValor(atual.current);
      if (p < 1) quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracaoMs]);

  return valor;
}

/** Valor em reais com contagem animada. */
export function Dinheiro({ valor }: { valor: number }) {
  return <>{fmt(useContagem(valor))}</>;
}
