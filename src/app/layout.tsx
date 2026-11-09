import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const viewport: Viewport = {
  themeColor: "#7C0A02",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "RHR - Résidence Hôtel Le Rêve de M'Batto",
  applicationName: "RHR Gestion",
  description:
    "Système ERP & POS Hybride Offline-First de la Résidence Hôtel Le Rêve de M'Batto (Hôtel 5 Chambres, Bar & Restaurant, Salle de Cérémonie, Trésorerie).",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RHR Gestion",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo-rhr.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/logo-rhr.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: [{ url: "/logo-rhr.jpg", sizes: "180x180", type: "image/jpeg" }],
    shortcut: ["/logo-rhr.jpg"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "RHR Gestion",
    "msapplication-TileColor": "#7C0A02",
  },
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
