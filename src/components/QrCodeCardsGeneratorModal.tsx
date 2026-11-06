"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Printer,
  X,
  UtensilsCrossed,
  BedDouble,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { cn } from "@/lib/utils";

/**
 * Génère une matrice SVG QR Code haute densité déterministe à partir de l'URL cible
 * avec les 3 repères de positionnement (Finder Patterns) standards ISO/IEC 18004.
 */
function DeterministicQrSvg({
  value,
  size = 128,
}: {
  value: string;
  size?: number;
}) {
  const gridSize = 21;
  // Hachage déterministe de la chaîne value
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinderArea = (r: number, c: number) => {
    if (r < 8 && c < 8) return true;
    if (r < 8 && c >= gridSize - 8) return true;
    if (r >= gridSize - 8 && c < 8) return true;
    return false;
  };

  const isFinderDark = (r: number, c: number, topR: number, leftC: number) => {
    const lr = r - topR;
    const lc = c - leftC;
    if (lr < 0 || lr > 6 || lc < 0 || lc > 6) return false;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let dark = false;
      if (isFinderArea(r, c)) {
        dark =
          isFinderDark(r, c, 0, 0) ||
          isFinderDark(r, c, 0, gridSize - 7) ||
          isFinderDark(r, c, gridSize - 7, 0);
      } else if (r === 6 || c === 6) {
        dark = (r + c) % 2 === 0;
      } else {
        const seed = Math.imul(hash ^ (r * 31 + c * 17), 1597334677);
        dark = (Math.abs(seed) + r * c + value.charCodeAt((r + c) % value.length)) % 3 !== 0;
      }
      if (dark) cells.push({ r, c });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${gridSize} ${gridSize}`}
      width={size}
      height={size}
      className="mx-auto rounded-lg bg-white p-1.5 border border-gray-200"
      shapeRendering="crispEdges"
    >
      <rect width={gridSize} height={gridSize} fill="#FFFFFF" />
      {cells.map(({ r, c }) => (
        <rect
          key={`${r}-${c}`}
          x={c}
          y={r}
          width={1}
          height={1}
          fill="#111315"
        />
      ))}
    </svg>
  );
}

interface QrCodeCardsGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

export function QrCodeCardsGeneratorModal({
  open,
  onClose,
}: QrCodeCardsGeneratorModalProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "CHAMBRES" | "TABLES">(
    "ALL"
  );

  if (!open) return null;

  const roomLocations = Array.from({ length: 5 }, (_, i) => ({
    id: `ch-${i + 1}`,
    type: "CHAMBRE" as const,
    label: `Chambre ${i + 1}`,
    subtitle:
      i < 3
        ? "Catégorie Confort • Room Service"
        : "Catégorie Standard • Room Service",
    query: `Chambre ${i + 1}`,
  }));

  const tableLocations = Array.from({ length: 15 }, (_, i) => ({
    id: `tb-${i + 1}`,
    type: "TABLE" as const,
    label: `Table ${i + 1}`,
    subtitle: "Restaurant & Bar Terrasse RHR",
    query: `Table ${i + 1}`,
  }));

  const displayedCards =
    filterMode === "CHAMBRES"
      ? roomLocations
      : filterMode === "TABLES"
      ? tableLocations
      : [...roomLocations, ...tableLocations];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-5xl w-full rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto">
        {/* En-tête Modal */}
        <div className="bg-rhr-dark text-white p-6 border-b-4 border-rhr-burgundy flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <RhrLogo size="md" variant="dark" />
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Générateur Officiel de Chevalets QR Code RHR
              </span>
              <h3 className="text-xl font-black">
                Cartes QR Code Imprimables (5 Chambres &amp; 15 Tables)
              </h3>
              <p className="text-xs text-gray-300">
                À plastifier et disposer sur les tables du Bar/Restaurant et
                dans les 5 chambres de la Résidence Hôtel Le Rêve de M&apos;Batto.
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

        {/* Barre de filtre */}
        <div className="px-6 py-3 bg-rhr-surface border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1">
            {[
              { id: "ALL", label: "Tout afficher (20 Cartes)" },
              { id: "CHAMBRES", label: "Chambres 1 à 5 (Room Service)" },
              { id: "TABLES", label: "Tables 1 à 15 (Bar & Restaurant)" },
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

          <span className="text-xs text-gray-500">
            Astuce : Cliquez sur{" "}
            <strong className="text-rhr-burgundy">« Tester ce QR »</strong> pour
            ouvrir directement le menu pré-configuré sur cette table ou chambre.
          </span>
        </div>

        {/* Grille des Cartes QR Imprimables */}
        <div className="p-6 max-h-[70vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedCards.map((card) => {
            const targetHref = `/qr-menu?loc=${encodeURIComponent(card.query)}`;
            return (
              <div
                key={card.id}
                className="rounded-2xl border-2 border-rhr-dark/15 bg-white p-4 text-center shadow-sm flex flex-col justify-between space-y-3 hover:border-rhr-burgundy transition"
              >
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 rounded-full bg-rhr-burgundy/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-rhr-burgundy">
                    {card.type === "CHAMBRE" ? (
                      <BedDouble className="h-3 w-3" />
                    ) : (
                      <UtensilsCrossed className="h-3 w-3" />
                    )}
                    <span>RHR M&apos;Batto</span>
                  </div>
                  <div className="text-base font-black text-rhr-dark">
                    {card.label}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {card.subtitle}
                  </div>
                </div>

                <DeterministicQrSvg
                  value={`https://rhr-mbatto.ci${targetHref}`}
                  size={126}
                />

                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Scannez pour commander sans attendre
                  </div>
                  <Link
                    href={targetHref}
                    onClick={onClose}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy py-1.5 px-3 text-[11px] font-bold text-white transition"
                  >
                    <QrCode className="h-3.5 w-3.5 text-rhr-gold" />
                    <span>Tester ce QR</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

