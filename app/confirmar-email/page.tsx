import { NOME_APP } from "@/lib/app";
import Link from "next/link";
import { LogoIcon } from "../ui";

export default async function ConfirmarEmail({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ok = status === "ok";

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-logo">
            <LogoIcon size={22} />
          </div>
          <span className="brand-name">{NOME_APP}</span>
        </div>

        <div className="auth-form">
          <h1 className="auth-title">{ok ? "E-mail confirmado!" : "Link inválido ou expirado"}</h1>

          <p className="auth-sub">
            {ok
              ? "Sua conta está ativa. Agora é só entrar."
              : "Esse link não funciona mais. Se você já confirmou, é só entrar. Se não, entre com sua senha e peça um novo e-mail de confirmação."}
          </p>

          <Link href="/" className="btn btn-primary">
            Ir para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
