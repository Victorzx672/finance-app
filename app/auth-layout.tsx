import { NOME_APP } from "@/lib/app";
import { LogoIcon } from "./ui";

const RECURSOS = [
  "Limite de gastos de 60% da renda, com avisos",
  "Cartão, parcelas e contas fixas com vencimento",
  "Metas, reserva de emergência e total guardado",
  "Instala no iPhone e funciona como app",
];

/** Moldura das telas de entrada: apresentação do app à esquerda e o formulário à direita. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg">
      <aside className="auth-hero" aria-hidden="true">
        <div className="auth-hero-bolha auth-hero-bolha--1" />
        <div className="auth-hero-bolha auth-hero-bolha--2" />

        <div className="brand brand--claro">
          <div className="brand-logo">
            <LogoIcon size={22} />
          </div>
          <span className="brand-name">{NOME_APP}</span>
        </div>

        <div className="auth-hero-texto">
          <h2>Seu dinheiro, claro como deve ser.</h2>
          <p>Renda, gastos, cartão e metas em um só lugar, com avisos antes de o mês apertar.</p>

          <ul className="auth-recursos">
            {RECURSOS.map((r) => (
              <li key={r}>
                <span className="auth-recurso-check">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-vitrine">
          <div className="auth-vitrine-card auth-vitrine-card--guardado">
            <span>Total guardado</span>
            <strong>R$ 17.650,00</strong>
            <small>▲ R$ 5.350 em 6 meses</small>
          </div>
          <div className="auth-vitrine-card auth-vitrine-card--limite">
            <span className="auth-vitrine-anel" />
            <div>
              <span>Gastos do mês</span>
              <strong>42% da renda</strong>
              <small>Dentro do limite</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="auth-lado">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
