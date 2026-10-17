import { createHash, randomBytes } from "crypto";
import type { TipoToken } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const VALIDADE_MS: Record<TipoToken, number> = {
  VERIFICACAO: 24 * 60 * 60 * 1000,
  RECUPERACAO: 60 * 60 * 1000,
};

/** Intervalo mínimo entre dois e-mails do mesmo tipo para o mesmo usuário. */
const INTERVALO_MIN_MS = 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Cria um token novo (apagando os anteriores do mesmo tipo) e devolve o valor
 * puro, que só vai por e-mail. No banco fica apenas o hash.
 * Retorna null se já foi enviado um e-mail há menos de 1 minuto.
 */
export async function criarToken(userId: number, tipo: TipoToken) {
  const recente = await prisma.tokenEmail.findFirst({
    where: {
      userId,
      tipo,
      criadoEm: { gt: new Date(Date.now() - INTERVALO_MIN_MS) },
    },
  });

  if (recente) return null;

  const token = randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.tokenEmail.deleteMany({ where: { userId, tipo } }),
    prisma.tokenEmail.create({
      data: {
        userId,
        tipo,
        tokenHash: hash(token),
        expiraEm: new Date(Date.now() + VALIDADE_MS[tipo]),
      },
    }),
  ]);

  return token;
}

/** Valida o token e o consome (uso único). Retorna o userId ou null. */
export async function consumirToken(token: string, tipo: TipoToken) {
  if (!token) return null;

  const registro = await prisma.tokenEmail.findUnique({
    where: { tokenHash: hash(token) },
  });

  if (!registro || registro.tipo !== tipo) return null;

  await prisma.tokenEmail.delete({ where: { id: registro.id } });

  if (registro.expiraEm < new Date()) return null;

  return registro.userId;
}
