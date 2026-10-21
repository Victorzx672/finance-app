import { NOME_APP } from "@/lib/app";
import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./app.css";
import Providers from "./providers";

// Inter no texto (números bem alinhados) e Plus Jakarta Sans nos títulos e valores grandes
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: NOME_APP,
  description: "Controle financeiro pessoal: renda, gastos, cartão e metas.",
  applicationName: NOME_APP,
  // iPhone: abre em tela cheia (sem a barra do Safari) quando adicionado à Tela de Início
  appleWebApp: {
    capable: true,
    title: NOME_APP,
    statusBarStyle: "default",
  },
  // evita que o iOS transforme valores como 5000 ou 1200 em links de telefone
  formatDetection: { telephone: false, email: false, address: false },
  // o Next só gera a tag nova (mobile-web-app-capable); iPhones mais antigos pedem esta
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // usa a tela inteira (as áreas do entalhe e da barra inferior são tratadas no CSS)
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
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
