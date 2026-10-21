import { reduzMovimento } from "./animacao";

const CORES = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#facc15"];

/**
 * Comemoração rápida (meta concluída, dinheiro guardado): confetes saem do ponto dado
 * (ou do centro da tela) e somem sozinhos. Desenha num canvas temporário, sem bibliotecas.
 */
export function soltarConfete(origem?: { x: number; y: number }, quantidade = 110) {
  if (typeof window === "undefined" || reduzMovimento()) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const escala = window.devicePixelRatio || 1;
  const largura = window.innerWidth;
  const altura = window.innerHeight;

  canvas.className = "confete";
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  ctx.scale(escala, escala);
  document.body.appendChild(canvas);

  const x0 = origem?.x ?? largura / 2;
  const y0 = origem?.y ?? altura / 2;

  const pedacos = Array.from({ length: quantidade }, () => {
    const angulo = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const velocidade = 7 + Math.random() * 9;

    return {
      x: x0,
      y: y0,
      vx: Math.cos(angulo) * velocidade,
      vy: Math.sin(angulo) * velocidade,
      giro: Math.random() * Math.PI,
      vGiro: (Math.random() - 0.5) * 0.4,
      tamanho: 5 + Math.random() * 6,
      cor: CORES[Math.floor(Math.random() * CORES.length)],
    };
  });

  const inicio = performance.now();
  const DURACAO = 1800;

  const quadro = (agora: number) => {
    const t = agora - inicio;
    ctx.clearRect(0, 0, largura, altura);
    ctx.globalAlpha = Math.max(0, 1 - t / DURACAO);

    for (const p of pedacos) {
      p.vy += 0.32; // gravidade
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vGiro;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.cor;
      ctx.fillRect(-p.tamanho / 2, -p.tamanho / 4, p.tamanho, p.tamanho / 2);
      ctx.restore();
    }

    if (t < DURACAO) requestAnimationFrame(quadro);
    else canvas.remove();
  };

  requestAnimationFrame(quadro);
}

/** Centro do elemento que disparou a comemoração (botão clicado). */
export const centroDe = (el: Element | null) => {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
