"use client";

import { useEffect, useRef, useState } from "react";
import { NOME_APP } from "@/lib/app";
import {
  IconeAjustes,
  IconeAlvo,
  IconeDownload,
  IconeEmail,
  IconeGrafico,
  IconeLampada,
  IconeLua,
  IconeMes,
  IconeOlho,
  IconeSair,
  IconeSol,
  IconeTeclado,
} from "./icones";
import { LogoIcon } from "./ui";

export const ABAS = [
  { id: "mes", rotulo: "Este mês", curto: "Mês", Icone: IconeMes },
  { id: "metas", rotulo: "Metas", curto: "Metas", Icone: IconeAlvo },
  { id: "ano", rotulo: "Resumo do ano", curto: "Ano", Icone: IconeGrafico },
  { id: "dicas", rotulo: "Dicas", curto: "Dicas", Icone: IconeLampada },
  { id: "prefs", rotulo: "Preferências", curto: "Ajustes", Icone: IconeAjustes },
] as const;

export type Aba = (typeof ABAS)[number]["id"];

export function Marca({ pequena }: { pequena?: boolean }) {
  return (
    <div className={`brand ${pequena ? "small" : ""}`}>
      <div className="brand-logo">
        <LogoIcon size={pequena ? 18 : 22} />
      </div>
      <span className="brand-name">{NOME_APP}</span>
    </div>
  );
}

/** Menu lateral (computador). O destaque desliza até a aba escolhida. */
export function BarraLateral({
  aba,
  onAba,
  children,
}: {
  aba: Aba;
  onAba: (a: Aba) => void;
  /** conteúdo do rodapé do menu */
  children?: React.ReactNode;
}) {
  const indice = ABAS.findIndex((a) => a.id === aba);

  return (
    <aside className="sidebar">
      <Marca />

      <nav className="sidebar-nav" aria-label="Seções">
        <span className="sidebar-destaque" style={{ transform: `translateY(${indice * 100}%)` }} aria-hidden="true" />
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            className="sidebar-item"
            aria-current={aba === a.id ? "page" : undefined}
            onClick={() => onAba(a.id)}
            title={`${a.rotulo} (${i + 1})`}
          >
            <a.Icone size={19} />
            <span>{a.rotulo}</span>
            <kbd className="sidebar-atalho">{i + 1}</kbd>
          </button>
        ))}
      </nav>

      <div className="sidebar-rodape">{children}</div>
    </aside>
  );
}

/** Abas embaixo da tela (celular), como num app instalado. */
export function BarraInferior({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  const indice = ABAS.findIndex((a) => a.id === aba);

  return (
    <nav className="bottom-nav" aria-label="Seções">
      <span
        className="bottom-nav-destaque"
        style={{ transform: `translateX(${indice * 100}%)` }}
        aria-hidden="true"
      />
      {ABAS.map((a) => (
        <button
          key={a.id}
          className="bottom-nav-item"
          aria-current={aba === a.id ? "page" : undefined}
          onClick={() => onAba(a.id)}
        >
          <a.Icone size={21} />
          <span>{a.curto}</span>
        </button>
      ))}
    </nav>
  );
}

const iniciais = (nome: string) =>
  nome
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

/** Avatar com o menu da conta: tema, valores, e-mail, CSV, atalhos e sair. */
export function MenuUsuario({
  nome,
  escuro,
  ocultar,
  onTema,
  onOcultar,
  onResumo,
  onAtalhos,
  onSair,
}: {
  nome: string;
  escuro: boolean;
  ocultar: boolean;
  onTema: () => void;
  onOcultar: () => void;
  onResumo: () => void;
  onAtalhos: () => void;
  onSair: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);

    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  /** fecha o menu e executa a ação */
  const e = (acao: () => void) => () => {
    setAberto(false);
    acao();
  };

  return (
    <div className="menu-usuario" ref={raiz}>
      <button
        className="avatar"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu da conta"
        title={nome}
      >
        {iniciais(nome)}
      </button>

      {aberto && (
        <div className="menu" role="menu">
          <div className="menu-cabeca">
            <span className="avatar avatar--grande" aria-hidden="true">
              {iniciais(nome)}
            </span>
            <div>
              <strong>{nome}</strong>
              <span>Sua conta {NOME_APP}</span>
            </div>
          </div>

          <button role="menuitemcheckbox" aria-checked={escuro} className="menu-item" onClick={onTema}>
            {escuro ? <IconeSol /> : <IconeLua />}
            Modo escuro
            <span className={`mini-interruptor ${escuro ? "ligado" : ""}`} aria-hidden="true" />
          </button>

          <button role="menuitemcheckbox" aria-checked={ocultar} className="menu-item" onClick={onOcultar}>
            <IconeOlho fechado={ocultar} />
            Ocultar valores
            <span className={`mini-interruptor ${ocultar ? "ligado" : ""}`} aria-hidden="true" />
          </button>

          <hr />

          <button role="menuitem" className="menu-item" onClick={e(onResumo)}>
            <IconeEmail />
            Enviar resumo do mês por e-mail
          </button>

          <a role="menuitem" className="menu-item" href="/api/export" download onClick={() => setAberto(false)}>
            <IconeDownload />
            Baixar tudo em CSV (Excel)
          </a>

          <button role="menuitem" className="menu-item" onClick={e(onAtalhos)}>
            <IconeTeclado />
            Atalhos do teclado
          </button>

          <hr />

          <button role="menuitem" className="menu-item menu-item--perigo" onClick={e(onSair)}>
            <IconeSair />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
