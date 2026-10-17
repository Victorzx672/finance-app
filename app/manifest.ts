import type { MetadataRoute } from "next";
import { NOME_APP } from "@/lib/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: NOME_APP,
    short_name: NOME_APP,
    description: "Controle financeiro pessoal: renda, gastos, cartão e metas.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6fb",
    theme_color: "#2563eb",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
