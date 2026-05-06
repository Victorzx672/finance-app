import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const handler = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        usuario: {},
        senha: {},
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { usuario: credentials?.usuario },
        });

        if (!user) return null;

        const senhaValida = await bcrypt.compare(
          credentials!.senha,
          user.senha
        );

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
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };