"use client";

import { NOME_APP } from "@/lib/app";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { AuthLayout } from "./auth-layout";
import { InputField, LogoIcon } from "./ui";

type Tela = "login" | "cadastro" | "esqueci" | "verifique" | "enviado";

/** Força da senha (0 a 4) para o medidor do cadastro. */
function forcaSenha(senha: string) {
  if (senha.length < 8) return senha ? 1 : 0;

  let pontos = 1;
  if (senha.length >= 12) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) pontos++;
  return Math.min(4, pontos);
}

const ROTULO_FORCA = ["", "Fraca", "Razoável", "Boa", "Forte"];

interface Aviso {
  tipo: "error" | "ok";
  texto: string;
}

async function post(url: string, corpo: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  return res.json();
}

export default function AuthScreen() {
  const [tela, setTela] = useState<Tela>("login");
  const [identificador, setIdentificador] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [carregando, setCarregando] = useState(false);
  // E-mail (ou usuário) da conta que aguarda confirmação, usado no reenvio
  const [pendente, setPendente] = useState("");

  const irPara = (destino: Tela) => {
    setTela(destino);
    setAviso(null);
  };

  const executar = async (acao: () => Promise<void>) => {
    setCarregando(true);
    setAviso(null);

    try {
      await acao();
    } catch {
      setAviso({ tipo: "error", texto: "Não foi possível conectar ao servidor." });
    } finally {
      setCarregando(false);
    }
  };

  const entrar = () =>
    executar(async () => {
      const res = await signIn("credentials", {
        identificador,
        senha,
        redirect: false,
      });

      if (!res?.error) return; // a sessão atualiza e o painel aparece

      if (res.error === "EMAIL_NAO_VERIFICADO") {
        setPendente(identificador);
        irPara("verifique");
      } else {
        setAviso({ tipo: "error", texto: "Usuário/e-mail ou senha incorretos." });
      }
    });

  const cadastrar = () =>
    executar(async () => {
      const data = await post("/api/register", { usuario, email, senha });

      if (!data.success) {
        setAviso({ tipo: "error", texto: data.error ?? "Erro ao criar a conta." });
        return;
      }

      setPendente(email);
      setTela("verifique");
      setAviso(
        data.emailEnviado === false
          ? { tipo: "error", texto: "Conta criada, mas não conseguimos enviar o e-mail. Toque em reenviar." }
          : null
      );
    });

  const recuperar = () =>
    executar(async () => {
      await post("/api/forgot-password", { email });
      irPara("enviado");
    });

  const reenviar = () =>
    executar(async () => {
      await post("/api/resend-verification", { identificador: pendente });
      setAviso({ tipo: "ok", texto: "Pronto! Se o e-mail ainda não chegou, aguarde 1 minuto e confira o spam." });
    });

  const enviarFormulario = (e: React.FormEvent) => {
    e.preventDefault();
    if (tela === "login") entrar();
    else if (tela === "cadastro") cadastrar();
    else if (tela === "esqueci") recuperar();
  };

  const campoSenha = (
    <InputField
      label="Senha"
      placeholder={tela === "cadastro" ? "Crie uma senha" : "Digite sua senha"}
      hint={tela === "cadastro" ? "Mínimo de 8 caracteres." : undefined}
      type={mostrarSenha ? "text" : "password"}
      value={senha}
      autoComplete={tela === "cadastro" ? "new-password" : "current-password"}
      onChange={setSenha}
      action={
        <button type="button" className="input-action" onClick={() => setMostrarSenha((v) => !v)}>
          {mostrarSenha ? "Ocultar" : "Mostrar"}
        </button>
      }
    />
  );

  const forca = forcaSenha(senha);

  const podeEnviar =
    !carregando &&
    (tela === "login"
      ? identificador.trim() && senha
      : tela === "cadastro"
      ? usuario.trim() && email.trim() && senha
      : email.trim());

  return (
    <AuthLayout>
      <div className="brand auth-card-marca">
        <div className="brand-logo">
          <LogoIcon size={22} />
        </div>
        <span className="brand-name">{NOME_APP}</span>
      </div>

      {(tela === "login" || tela === "cadastro") && (
        <>
          <h1 className="auth-title">
            {tela === "cadastro" ? "Crie sua conta" : "Bem-vindo de volta"}
          </h1>
          <p className="auth-sub">
            {tela === "cadastro"
              ? "Preencha os dados. Vamos enviar um e-mail para confirmar."
              : "Entre para ver suas finanças."}
          </p>

          <div className="tabs" role="tablist">
            <button type="button" role="tab" className="tab" aria-selected={tela === "login"} onClick={() => irPara("login")}>
              Entrar
            </button>
            <button type="button" role="tab" className="tab" aria-selected={tela === "cadastro"} onClick={() => irPara("cadastro")}>
              Criar conta
            </button>
          </div>

          <form className="auth-form" onSubmit={enviarFormulario}>
            {tela === "login" ? (
              <InputField
                label="Usuário ou e-mail"
                placeholder="Digite seu usuário ou e-mail"
                value={identificador}
                autoComplete="username"
                onChange={setIdentificador}
              />
            ) : (
              <>
                <InputField
                  label="Usuário"
                  placeholder="Escolha um nome de usuário"
                  hint="De 3 a 30 caracteres, sem espaços."
                  value={usuario}
                  autoComplete="username"
                  onChange={setUsuario}
                />
                <InputField
                  label="E-mail"
                  placeholder="voce@exemplo.com"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={setEmail}
                />
              </>
            )}

            {campoSenha}

            {tela === "cadastro" && senha && (
              <div className={`forca forca--${forca}`} aria-live="polite">
                <div className="forca-barras" aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={n <= forca ? "cheia" : ""} />
                  ))}
                </div>
                <span>Senha {ROTULO_FORCA[forca].toLowerCase()}</span>
              </div>
            )}

            {tela === "login" && (
              <button type="button" className="link-btn" onClick={() => irPara("esqueci")}>
                Esqueci minha senha
              </button>
            )}

            {aviso && <p className={`auth-msg ${aviso.tipo}`}>{aviso.texto}</p>}

            <button type="submit" className="btn btn-primary" disabled={!podeEnviar}>
              {carregando ? <span className="btn-spinner" /> : tela === "cadastro" ? "Criar conta" : "Entrar"}
            </button>
          </form>
        </>
      )}

      {tela === "esqueci" && (
        <>
          <h1 className="auth-title">Esqueceu a senha?</h1>
          <p className="auth-sub">
            Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
          </p>

          <form className="auth-form" onSubmit={enviarFormulario}>
            <InputField
              label="E-mail"
              placeholder="voce@exemplo.com"
              type="email"
              value={email}
              autoComplete="email"
              onChange={setEmail}
            />

            {aviso && <p className={`auth-msg ${aviso.tipo}`}>{aviso.texto}</p>}

            <button type="submit" className="btn btn-primary" disabled={!podeEnviar}>
              {carregando ? <span className="btn-spinner" /> : "Enviar link"}
            </button>

            <button type="button" className="link-btn center" onClick={() => irPara("login")}>
              Voltar para o login
            </button>
          </form>
        </>
      )}

      {tela === "enviado" && (
        <div className="auth-form">
          <h1 className="auth-title">Confira seu e-mail</h1>
          <p className="auth-sub">
            Se existir uma conta com o e-mail <strong>{email}</strong>, enviamos um link para
            criar uma nova senha. Ele vale por 1 hora. Não achou? Olhe o spam.
          </p>

          <button type="button" className="btn btn-primary" onClick={() => irPara("login")}>
            Voltar para o login
          </button>
        </div>
      )}

      {tela === "verifique" && (
        <div className="auth-form">
          <h1 className="auth-title">Confirme seu e-mail</h1>
          <p className="auth-sub">
            Enviamos um link de confirmação para <strong>{pendente}</strong>. Clique nele para
            ativar sua conta e depois é só entrar. O link vale por 24 horas.
          </p>

          {aviso && <p className={`auth-msg ${aviso.tipo}`}>{aviso.texto}</p>}

          <button type="button" className="btn btn-outline" onClick={reenviar} disabled={carregando}>
            {carregando ? "Enviando..." : "Reenviar e-mail"}
          </button>

          <button type="button" className="link-btn center" onClick={() => irPara("login")}>
            Voltar para o login
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
