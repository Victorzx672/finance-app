import { NOME_APP } from "@/lib/app";
import { LIMITE_GASTOS_PERCENT, type StatusLimite } from "@/lib/calculos";
import { enviar, esc, urlBase } from "@/lib/email";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function cartao(titulo: string, corpo: string, rodape: string) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e7f0;border-radius:14px;padding:28px;color:#1c2536">
      <h1 style="font-size:20px;margin:0 0 14px">${titulo}</h1>
      ${corpo}
      <p style="font-size:13px;color:#5b6678;margin:22px 0 0">${rodape}</p>
    </div>
  </div>`;
}

const linha = (rotulo: string, valor: string, forte = false) =>
  `<tr><td style="padding:6px 0;color:#5b6678">${rotulo}</td><td style="padding:6px 0;text-align:right;${forte ? "font-weight:700" : ""}">${valor}</td></tr>`;

export interface DadosAlerta {
  mesLabel: string;
  renda: number;
  totalGastos: number;
  limite: number;
}

/** Aviso (uma vez por mês) de que os gastos passaram do limite. */
export function enviarAlertaLimite(para: string, usuario: string, d: DadosAlerta) {
  const acima = d.totalGastos - d.limite;
  const percentual = d.renda > 0 ? ((d.totalGastos / d.renda) * 100).toFixed(0) : "0";
  const link = urlBase();

  return enviar({
    para,
    assunto: `Você passou do limite de gastos de ${d.mesLabel} - ${NOME_APP}`,
    texto: `Olá, ${usuario}!\n\nEm ${d.mesLabel} você já gastou ${moeda(d.totalGastos)} (${percentual}% da renda), ${moeda(acima)} acima do limite de ${LIMITE_GASTOS_PERCENT}% (${moeda(d.limite)}).\n\nEvite novos gastos até o fim do mês.\n${link}`,
    html: cartao(
      `Você passou do limite de gastos 🙀`,
      `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">Olá, ${esc(usuario)}! Em <b>${esc(d.mesLabel)}</b> você já gastou <b>${moeda(d.totalGastos)}</b> (${percentual}% da renda), <b style="color:#dc2626">${moeda(acima)} acima</b> do limite de ${LIMITE_GASTOS_PERCENT}% (${moeda(d.limite)}).</p>
       <p style="font-size:15px;margin:0">Evite novos gastos até o fim do mês.</p>`,
      `Você pode desligar esses avisos em Preferências, dentro do ${NOME_APP}. <a href="${link}">Abrir o app</a>`
    ),
  });
}

export interface DadosResumo extends DadosAlerta {
  saldo: number;
  investimento: number;
  status: StatusLimite;
  categorias: { nome: string; valor: number }[];
}

const TEXTO_STATUS: Record<StatusLimite, string> = {
  "sem-renda": "Sem renda cadastrada neste mês.",
  ok: "Dentro do limite de gastos.",
  atencao: "Atenção: perto do limite de gastos.",
  excedido: "Acima do limite de gastos.",
};

/** Resumo do mês, enviado quando o usuário pede. */
export function enviarResumoMensal(para: string, usuario: string, d: DadosResumo) {
  const percentual = d.renda > 0 ? ((d.totalGastos / d.renda) * 100).toFixed(0) : "0";
  const top = d.categorias.slice(0, 6);
  const link = urlBase();

  const textoCategorias = top.map((c) => `  - ${c.nome}: ${moeda(c.valor)}`).join("\n");

  return enviar({
    para,
    assunto: `Resumo de ${d.mesLabel} - ${NOME_APP}`,
    texto: `Olá, ${usuario}!\n\nResumo de ${d.mesLabel}\nRenda: ${moeda(d.renda)}\nGastos: ${moeda(d.totalGastos)} (${percentual}% da renda, limite ${LIMITE_GASTOS_PERCENT}%)\nSobra: ${moeda(d.saldo)}\nPara investir: ${moeda(d.investimento)}\n${TEXTO_STATUS[d.status]}\n\nPara onde foi o dinheiro:\n${textoCategorias || "  (nenhum gasto)"}\n\n${link}`,
    html: cartao(
      `Resumo de ${esc(d.mesLabel)}`,
      `<p style="font-size:15px;margin:0 0 12px">Olá, ${esc(usuario)}! Veja como foi o mês:</p>
       <table style="width:100%;border-collapse:collapse;font-size:15px">
         ${linha("Renda", moeda(d.renda))}
         ${linha(`Gastos (${percentual}% da renda)`, moeda(d.totalGastos))}
         ${linha("Sobra", moeda(d.saldo), true)}
         ${linha("Para investir", moeda(d.investimento))}
       </table>
       <p style="font-size:14px;margin:12px 0 0;font-weight:600">${TEXTO_STATUS[d.status]} (limite de ${LIMITE_GASTOS_PERCENT}%: ${moeda(d.limite)})</p>
       ${
         top.length > 0
           ? `<h2 style="font-size:15px;margin:20px 0 4px">Para onde foi o dinheiro</h2>
              <table style="width:100%;border-collapse:collapse;font-size:14px">${top.map((c) => linha(esc(c.nome), moeda(c.valor))).join("")}</table>`
           : ""
       }`,
      `<a href="${link}">Abrir o ${NOME_APP}</a>`
    ),
  });
}
