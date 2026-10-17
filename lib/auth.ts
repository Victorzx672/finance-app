import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        usuario: {},
        senha: {},
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.senha) return null;

        const user = await prisma.user.findUnique({
          where: { usuario: credentials.usuario },
        });

        if (!user) return null;

        const senhaValida = await bcrypt.compare(credentials.senha, user.senha);

        if (!senhaValida) return null;

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
