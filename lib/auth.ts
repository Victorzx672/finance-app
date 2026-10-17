import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizarEmail } from "@/lib/validacao";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identificador: {},
        senha: {},
      },
      async authorize(credentials) {
        const identificador = credentials?.identificador?.trim();

        if (!identificador || !credentials?.senha) return null;

        // Usuários não podem ter "@", então não há ambiguidade com e-mail.
        const user = await prisma.user.findFirst({
          where: identificador.includes("@")
            ? { email: normalizarEmail(identificador) }
            : { usuario: identificador },
        });

        if (!user) return null;

        const senhaCorreta = await bcrypt.compare(credentials.senha, user.senha);

        if (!senhaCorreta) return null;

        // Só avisa depois de acertar a senha, para não revelar quem tem conta.
        if (!user.emailVerificado) throw new Error("EMAIL_NAO_VERIFICADO");

        return {
          id: String(user.id),
          name: user.usuario,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = Number(user.id);
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "number") {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Retorna o id do usuário autenticado ou null se não houver sessão. */
export async function getUserIdFromSession(): Promise<number | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
