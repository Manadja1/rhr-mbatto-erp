import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "RHR ERP/POS — Résidence Hôtel Le Rêve de M'Batto",
  description:
    "Système ERP & POS Hybride Offline-First de la Résidence Hôtel Le Rêve de M'Batto (Hôtel 5 Chambres, Bar & Restaurant, Salle de Cérémonie, Trésorerie).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased selection:bg-rhr-burgundy selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

