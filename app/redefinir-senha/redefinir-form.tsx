"use client";

import { NOME_APP } from "@/lib/app";
import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "../auth-layout";
import { InputField, LogoIcon } from "../ui";

export default function RedefinirForm({ token }: { token: string }) {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json();

      if (data.success) setConcluido(true);
      else setErro(data.error ?? "Não foi possível redefinir a senha.");
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const botaoMostrar = (
    <button type="button" className="input-action" onClick={() => setMostrar((v) => !v)}>
      {mostrar ? "Ocultar" : "Mostrar"}
    </button>
  );

  return (
    <AuthLayout>
      <div className="brand auth-card-marca">
        <div className="brand-logo">
          <LogoIcon size={22} />
        </div>
        <span className="brand-name">{NOME_APP}</span>
      </div>

      {concluido ? (
        <div className="auth-form">
          <h1 className="auth-title">Senha alterada!</h1>
          <p className="auth-sub">Use a nova senha para entrar.</p>
          <Link href="/" className="btn btn-primary">
            Ir para o login
          </Link>
        </div>
      ) : !token ? (
        <div className="auth-form">
          <h1 className="auth-title">Link inválido</h1>
          <p className="auth-sub">Peça um novo link na tela de login, em &ldquo;Esqueci minha senha&rdquo;.</p>
          <Link href="/" className="btn btn-primary">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="auth-title">Crie uma nova senha</h1>
          <p className="auth-sub">Escolha uma senha com pelo menos 8 caracteres.</p>

          <form className="auth-form" onSubmit={enviar}>
            <InputField
              label="Nova senha"
              placeholder="Digite a nova senha"
              type={mostrar ? "text" : "password"}
              value={senha}
              autoComplete="new-password"
              onChange={setSenha}
              action={botaoMostrar}
            />

            <InputField
              label="Repita a nova senha"
              placeholder="Digite de novo"
              type={mostrar ? "text" : "password"}
              value={confirmacao}
              autoComplete="new-password"
              onChange={setConfirmacao}
            />

            {erro && <p className="auth-msg error">{erro}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={carregando || !senha || !confirmacao}
            >
              {carregando ? <span className="btn-spinner" /> : "Salvar nova senha"}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
