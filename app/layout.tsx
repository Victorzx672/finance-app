import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Controle Financeiro",
  description: "Aplicação de organização financeira",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
