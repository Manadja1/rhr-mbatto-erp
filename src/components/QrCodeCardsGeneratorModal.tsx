"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  QrCode,
  Printer,
  X,
  UtensilsCrossed,
  BedDouble,
  ExternalLink,
  Sparkles,
  Smartphone,
  Copy,
  Check,
  Maximize2,
  Globe,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { generateQrMatrix } from "@/lib/qrcode";
import { cn } from "@/lib/utils";

/**
 * Rendu SVG ISO/IEC 18004 authentique avec Quiet Zone (marge blanche de 4 modules)
 * permettant un scan immédiat par n'importe quel appareil photo de smartphone (iOS / Android).
 */
export function ScannableQrCodeSvg({
  value,
  size = 156,
}: {
  value: string;
  size?: number;
}) {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  const modulesCount = matrix.length;
  const quietZone = 4;
  const totalViewSize = modulesCount + quietZone * 2;

  return (
    <svg
      viewBox={`0 0 ${totalViewSize} ${totalViewSize}`}
      width={size}
      height={size}
      className="mx-auto rounded-xl bg-white border-2 border-gray-200 shadow-sm"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR Code pour ${value}`}
    >
      <rect width={totalViewSize} height={totalViewSize} fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((isDark, c) =>
          isDark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#000000"
            />
          ) : null
        )
      )}
    </svg>
  );
}

interface QrCodeCardsGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

interface QrLocationCard {
  id: string;
  type: "CHAMBRE" | "TABLE";
  label: string;
  subtitle: string;
  query: string;
}

export function QrCodeCardsGeneratorModal({
  open,
  onClose,
}: QrCodeCardsGeneratorModalProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "CHAMBRES" | "TABLES">(
    "ALL"
  );
  const [baseOrigin, setBaseOrigin] = useState<string>(
    "http://localhost:3000"
  );
  const [detectedLanOrigin, setDetectedLanOrigin] = useState<string | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<QrLocationCard | null>(null);

  // Détection automatique de l'IP Wi-Fi du serveur (ex: http://10.15.22.58:3000) pour que le téléphone du client ouvre directement /qr-menu
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentOrigin = window.location.origin || "http://localhost:3000";
    setBaseOrigin(currentOrigin);

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      fetch("/api/qr-sync")
        .then((res) => res.json())
        .then((data) => {
          if (data?.lanIp) {
            const port = window.location.port
              ? `:${window.location.port}`
              : "";
            const lanUrl = `${window.location.protocol}//${data.lanIp}${port}`;
            setDetectedLanOrigin(lanUrl);
            setBaseOrigin(lanUrl);
          }
        })
        .catch(() => { });
    }
  }, [open]);

  if (!open) return null;

  const roomLocations: QrLocationCard[] = Array.from({ length: 5 }, (_, i) => ({
    id: `ch-${i + 1}`,
    type: "CHAMBRE" as const,
    label: `Chambre ${i + 1}`,
    subtitle:
      i < 3
        ? "Catégorie Confort • Room Service"
        : "Catégorie Standard • Room Service",
    query: `Chambre ${i + 1}`,
  }));

  const tableLocations: QrLocationCard[] = Array.from(
    { length: 15 },
    (_, i) => ({
      id: `tb-${i + 1}`,
      type: "TABLE" as const,
      label: `Table ${i + 1}`,
      subtitle: "Restaurant & Bar Terrasse RHR",
      query: `Table ${i + 1}`,
    })
  );

  const displayedCards =
    filterMode === "CHAMBRES"
      ? roomLocations
      : filterMode === "TABLES"
        ? tableLocations
        : [...roomLocations, ...tableLocations];

  const cleanOrigin = baseOrigin.replace(/\/+$/, "");

  const handleCopyLink = (id: string, fullUrl: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="max-w-6xl w-full rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto">
        {/* En-tête Modal */}
        <div className="bg-rhr-dark text-white p-5 sm:p-6 border-b-4 border-rhr-burgundy flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <RhrLogo size="md" variant="dark" />
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Cartes QR Code Scannables (ISO/IEC 18004) — RHR M&apos;Batto
              </span>
              <h3 className="text-lg sm:text-xl font-black">
                Cartes QR Tables (1 à 15) &amp; Chambres (1 à 5)
              </h3>
              <p className="text-xs text-gray-300">
                Les clients scannent le code QR avec l&apos;appareil photo de
                leur téléphone pour ouvrir la carte et envoyer leur commande en
                caisse.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2.5 text-xs font-extrabold text-white shadow-rhr transition"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer la Planche A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barre de filtre + Configuration automatique de l'URL de scan */}
        <div className="px-5 sm:px-6 py-3.5 bg-rhr-surface border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-xl bg-white border border-gray-200 p-1 gap-1">
            {[
              { id: "ALL", label: "Tout afficher (20 Cartes)" },
              { id: "TABLES", label: "Tables 1 à 15 (Bar & Restaurant)" },
              { id: "CHAMBRES", label: "Chambres 1 à 5 (Room Service)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setFilterMode(tab.id as "ALL" | "CHAMBRES" | "TABLES")
                }
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-xs font-bold transition",
                  filterMode === tab.id
                    ? "bg-rhr-burgundy text-white"
                    : "text-gray-600 hover:text-rhr-dark"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* URL cible encodée dans les QR codes */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-gray-600">
              <Globe className="h-3.5 w-3.5 text-rhr-burgundy" />
              <span>Cible QR :</span>
            </span>
            <input
              type="text"
              value={baseOrigin}
              onChange={(e) => setBaseOrigin(e.target.value)}
              className="w-52 rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
              placeholder="http://localhost:3000"
            />
            <button
              type="button"
              onClick={() => setBaseOrigin("http://localhost:3000")}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                baseOrigin === "http://localhost:3000"
                  ? "border-rhr-burgundy bg-rhr-burgundy text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              localhost:3000
            </button>
            {detectedLanOrigin && (
              <button
                type="button"
                onClick={() => setBaseOrigin(detectedLanOrigin)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-bold transition",
                  baseOrigin === detectedLanOrigin
                    ? "border-emerald-700 bg-emerald-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                Wi-Fi ({detectedLanOrigin.replace(/^https?:\/\//, "")})
              </button>
            )}
          </div>
        </div>

        {/* Grille des Cartes QR Scannables */}
        <div className="p-5 sm:p-6 max-h-[68vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedCards.map((card) => {
            const targetHref = `/qr-menu?loc=${encodeURIComponent(
              card.query
            )}&scanned=1`;
            const fullQrUrl = `${cleanOrigin}${targetHref}`;
            const isCopied = copiedId === card.id;

            return (
              <div
                key={card.id}
                className="rounded-2xl border-2 border-rhr-dark/15 bg-white p-4 text-center shadow-sm flex flex-col justify-between space-y-3 hover:border-rhr-burgundy transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rhr-burgundy/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-rhr-burgundy">
                      {card.type === "CHAMBRE" ? (
                        <BedDouble className="h-3 w-3" />
                      ) : (
                        <UtensilsCrossed className="h-3 w-3" />
                      )}
                      <span>RHR M&apos;Batto</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setZoomedCard(card)}
                      title="Agrandir ce QR Code en plein écran pour le faire scanner par un client"
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 hover:bg-rhr-dark hover:text-white px-2 py-1 text-[10px] font-bold text-gray-700 transition"
                    >
                      <Maximize2 className="h-3 w-3" />
                      <span>Zoom Scan</span>
                    </button>
                  </div>

                  <div className="text-lg font-black text-rhr-dark pt-1">
                    {card.label}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {card.subtitle}
                  </div>
                </div>

                {/* Vrai QR Code ISO/IEC 18004 scannable par appareil photo */}
                <button
                  type="button"
                  onClick={() => setZoomedCard(card)}
                  className="group relative mx-auto block focus:outline-none"
                  title="Cliquez pour agrandir et scanner avec un téléphone"
                >
                  <ScannableQrCodeSvg value={fullQrUrl} size={152} />
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700">
                    <Smartphone className="h-3 w-3" />
                    <span>Ouvre {cleanOrigin}/qr-menu</span>
                  </span>
                </button>

                <div className="space-y-1.5 pt-1">
                  <Link
                    href={targetHref}
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-2 px-3 text-xs font-extrabold text-white shadow-sm transition whitespace-nowrap"
                  >
                    <QrCode className="h-3.5 w-3.5 text-rhr-gold shrink-0" />
                    <span>Scanner / Commander ({card.label})</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(card.id, fullQrUrl)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 py-1.5 px-3 text-[11px] font-bold text-gray-700 transition whitespace-nowrap"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">
                          Lien QR copié !
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                        <span>Copier le lien client</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SOUS-MODAL PLEIN ÉCRAN : PRÉSENTATION DU QR CODE AU CLIENT POUR SCAN
      ===================================================================== */}
      {zoomedCard && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedCard(null)}
        >
          <div
            className="max-w-md w-full rounded-3xl bg-white border-4 border-rhr-gold p-6 sm:p-8 text-center shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rhr-burgundy/10 px-3 py-1 text-xs font-black uppercase text-rhr-burgundy">
                {zoomedCard.type === "CHAMBRE" ? (
                  <BedDouble className="h-3.5 w-3.5" />
                ) : (
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                )}
                <span>Chevalet QR Client RHR</span>
              </span>
              <button
                type="button"
                onClick={() => setZoomedCard(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-rhr-dark">
                {zoomedCard.label}
              </h4>
              <p className="text-xs text-gray-500">{zoomedCard.subtitle}</p>
            </div>

            <div className="py-2">
              <ScannableQrCodeSvg
                value={`${cleanOrigin}/qr-menu?loc=${encodeURIComponent(
                  zoomedCard.query
                )}&scanned=1`}
                size={260}
              />
            </div>

            <p className="text-xs font-bold text-gray-700 leading-relaxed">
              Ouvrez l&apos;appareil photo de votre téléphone et pointez-le sur
              ce QR Code pour ouvrir le menu de la{" "}
              <strong className="text-rhr-burgundy">{zoomedCard.label}</strong>{" "}
              et passer commande.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Link
                href={`/qr-menu?loc=${encodeURIComponent(
                  zoomedCard.query
                )}&scanned=1`}
                onClick={() => {
                  setZoomedCard(null);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3 px-4 text-xs font-black uppercase text-white shadow-rhr transition"
              >
                <QrCode className="h-4 w-4 text-rhr-gold" />
                <span>Ouvrir le Menu de {zoomedCard.label}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
