"use client";

import { signOut, useSession } from "next-auth/react";
import AuthScreen from "./auth-screen";
import { TelaCarregando } from "./carregando";
import Painel from "./painel";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <TelaCarregando />;

  if (status !== "authenticated") return <AuthScreen />;

  return (
    <Painel
      key={session?.user?.id}
      nomeUsuario={session?.user?.name}
      onSair={() => signOut({ redirect: false })}
    />
  );
}
