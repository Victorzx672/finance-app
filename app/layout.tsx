import { NOME_APP } from "@/lib/app";
import type { Metadata } from "next";
import "./app.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: NOME_APP,
  description: "Controle financeiro pessoal: renda, gastos, cartão e metas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo (ou o do sistema) antes da página aparecer, sem piscar */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fluxopay-tema');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}document.documentElement.dataset.tema=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
