import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandato+ | Relacionamento Político Consentido",
  description:
    "Plataforma institucional para políticos, mandatos e assessorias no Brasil organizarem o relacionamento com apoiadores com consentimento explícito, LGPD e isolamento multi-tenant.",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-navy-900 antialiased selection:bg-emerald-brand-100 selection:text-navy-900">
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Ir para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}
