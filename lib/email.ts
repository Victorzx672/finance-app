import nodemailer from "nodemailer";

import { NOME_APP } from "@/lib/app";

export const urlBase = () =>
  (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function enviar({
  para,
  assunto,
  texto,
  html,
}: {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}) {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP não configurado (defina SMTP_HOST, SMTP_USER e SMTP_PASS)");
    }

    // Desenvolvimento sem SMTP: mostra o e-mail no terminal do servidor.
    console.log(`\n── E-mail simulado ───────────────\nPara: ${para}\nAssunto: ${assunto}\n\n${texto}\n──────────────────────────────────\n`);
    return;
  }

  const porta = Number(process.env.SMTP_PORT ?? 587);

  const transporter = nodemailer.createTransport({
    host,
    port: porta,
    secure: porta === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? `${NOME_APP} <${process.env.SMTP_USER}>`,
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

function layout(titulo: string, mensagem: string, botao: string, link: string, aviso: string) {
  return `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e7f0;border-radius:14px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px;color:#1c2536">${titulo}</h1>
      <p style="font-size:15px;line-height:1.5;color:#1c2536;margin:0 0 20px">${mensagem}</p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${botao}</a>
      <p style="font-size:13px;color:#5b6678;margin:20px 0 4px">Se o botão não funcionar, copie este link no navegador:</p>
      <p style="font-size:12px;color:#5b6678;word-break:break-all;margin:0 0 16px">${link}</p>
      <p style="font-size:13px;color:#5b6678;margin:0">${aviso}</p>
    </div>
  </div>`;
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function enviarConfirmacaoEmail(para: string, usuario: string, token: string) {
  const link = `${urlBase()}/api/verify-email?token=${token}`;

  return enviar({
    para,
    assunto: `Confirme seu e-mail - ${NOME_APP}`,
    texto: `Olá, ${usuario}!\n\nConfirme seu e-mail para ativar sua conta:\n${link}\n\nO link vale por 24 horas. Se você não criou essa conta, ignore este e-mail.`,
    html: layout(
      `Olá, ${esc(usuario)}!`,
      "Falta só um passo: confirme seu e-mail para ativar sua conta.",
      "Confirmar e-mail",
      link,
      "O link vale por 24 horas. Se você não criou essa conta, ignore este e-mail."
    ),
  });
}

export function enviarRecuperacaoSenha(para: string, usuario: string, token: string) {
  const link = `${urlBase()}/redefinir-senha?token=${token}`;

  return enviar({
    para,
    assunto: `Redefinir sua senha - ${NOME_APP}`,
    texto: `Olá, ${usuario}!\n\nRecebemos um pedido para redefinir sua senha. Crie uma nova senha neste link:\n${link}\n\nO link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.`,
    html: layout(
      `Olá, ${esc(usuario)}!`,
      "Recebemos um pedido para redefinir sua senha. Clique no botão para criar uma nova.",
      "Criar nova senha",
      link,
      "O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma."
    ),
  });
}
