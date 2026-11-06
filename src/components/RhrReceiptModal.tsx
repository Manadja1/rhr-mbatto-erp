"use client";

import React from "react";
import {
  X,
  Printer,
  MessageCircle,
  CheckCircle2,
  BedDouble,
  UtensilsCrossed,
  Building2,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { RoomFolioItem, Stay } from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";

export interface RhrReceiptData {
  reference: string;
  title: string;
  stay: Stay;
  roomName: string;
  roomCategory: string;
  folioLines: RoomFolioItem[];
  totalCharges: number;
  totalPaid: number;
  remainingBalance: number;
  justPaidAmount?: number;
  paymentMethodLabel?: string;
  operatorName: string;
  issuedAt: string;
}

interface RhrReceiptModalProps {
  receipt: RhrReceiptData | null;
  onClose: () => void;
  onMarkRoomClean?: () => void;
  canMarkClean?: boolean;
}

export function RhrReceiptModal({
  receipt,
  onClose,
  onMarkRoomClean,
  canMarkClean = false,
}: RhrReceiptModalProps) {
  if (!receipt) return null;

  // Nettoyage du numéro de téléphone pour WhatsApp (Format Côte d'Ivoire +225)
  const cleanPhone = receipt.stay.guestPhone.replace(/[^0-9]/g, "");
  const whatsappPhone = cleanPhone.startsWith("225")
    ? cleanPhone
    : cleanPhone.length === 10
    ? `225${cleanPhone}`
    : cleanPhone;

  // Construction du message professionnel WhatsApp RHR
  const buildWhatsAppMessage = () => {
    const lines = [
      `🏨 *RHR — RÉSIDENCE HÔTEL LE RÊVE DE M'BATTO*`,
      `📄 *${receipt.title.toUpperCase()}*`,
      `Réf : *${receipt.reference}*`,
      `Date : ${formatDateTime(receipt.issuedAt)}`,
      `--------------------------------`,
      `👤 Client : *${receipt.stay.guestName}*`,
      `🛏️ Chambre : *${receipt.roomName}* (${receipt.roomCategory})`,
      `--------------------------------`,
      `*DÉTAIL DU COMPTE (FOLIO) :*`,
      ...receipt.folioLines.map((line) => {
        const prefix = line.amount < 0 ? "✅ Règlement :" : "•";
        const val =
          line.amount < 0
            ? `- ${formatCFA(Math.abs(line.amount))}`
            : formatCFA(line.amount);
        return `${prefix} ${line.description} : *${val}*`;
      }),
      `--------------------------------`,
      `💰 *Total Facturé :* ${formatCFA(receipt.totalCharges)}`,
      `💵 *Total Réglé :* ${formatCFA(receipt.totalPaid)}`,
      receipt.remainingBalance > 0
        ? `⚠️ *Reste à payer :* *${formatCFA(receipt.remainingBalance)}*`
        : `✅ *Statut du compte :* *SOLDÉ (0 F)*`,
      `--------------------------------`,
      `Opérateur : ${receipt.operatorName}`,
      `_Merci de votre confiance ! Akwaba à la Résidence Hôtel Le Rêve de M'Batto._`,
    ];
    return encodeURIComponent(lines.join("\n"));
  };

  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${buildWhatsAppMessage()}`;

  const accommodationLines = receipt.folioLines.filter(
    (f) => f.category === "HEBERGEMENT" || f.category === "SUPPLEMENT"
  );
  const barRestoLines = receipt.folioLines.filter(
    (f) => f.category === "BAR_RESTO"
  );
  const paymentLines = receipt.folioLines.filter(
    (f) => f.category === "ACOMPTE" || f.amount < 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-xl w-full rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto">
        {/* En-tête Officiel RHR Noir Charbon & Bordeaux */}
        <div className="bg-rhr-dark text-white p-6 border-b-4 border-rhr-burgundy flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <RhrLogo size="md" variant="dark" />
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                <Building2 className="h-3 w-3" />
                Reçu Numérique Officiel RHR
              </span>
              <h3 className="text-lg font-black leading-tight text-white">
                RHR — R&Eacute;SIDENCE H&Ocirc;TEL LE R&Ecirc;VE
              </h3>
              <p className="text-xs text-gray-300">
                M&apos;Batto, Côte d&apos;Ivoire • Réf :{" "}
                <strong className="text-rhr-gold font-mono">
                  {receipt.reference}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps du Reçu */}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Bandeau Statut */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-rhr-surface border border-gray-200 p-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-gray-500">
                Client &amp; Chambre
              </div>
              <div className="text-base font-black text-rhr-dark">
                {receipt.stay.guestName} ({receipt.stay.guestPhone})
              </div>
              <div className="text-xs font-semibold text-rhr-burgundy">
                {receipt.roomName} • Catégorie {receipt.roomCategory}
              </div>
            </div>

            <div className="text-right">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold uppercase",
                  receipt.remainingBalance <= 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-900"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {receipt.remainingBalance <= 0
                  ? "Compte Soldé"
                  : `Reste : ${formatCFA(receipt.remainingBalance)}`}
              </span>
              <div className="text-[11px] text-gray-500 mt-1">
                Émis le {formatDateTime(receipt.issuedAt)}
              </div>
            </div>
          </div>

          {/* Section 1 : Hébergement */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-dark">
              <BedDouble className="h-4 w-4 text-rhr-burgundy" />
              <span>1. Prestations Hébergement Hôtel</span>
            </div>
            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              {accommodationLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <span className="font-medium text-gray-800">
                    {line.description}
                  </span>
                  <span className="font-bold text-rhr-dark">
                    {formatCFA(line.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 : Consommations Bar & Restaurant transférées */}
          {barRestoLines.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-dark">
                <UtensilsCrossed className="h-4 w-4 text-rhr-burgundy" />
                <span>
                  2. Consommations Bar &amp; Restaurant Transférées sur Chambre
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 bg-amber-50/30">
                {barRestoLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-rhr-dark">
                        {line.description}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Horodaté : {formatDateTime(line.createdAt)}
                      </div>
                    </div>
                    <span className="font-bold text-rhr-burgundy shrink-0 ml-3">
                      {formatCFA(line.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3 : Acomptes & Règlements reçus */}
          {paymentLines.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                3. Règlements &amp; Acomptes Encaissés
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 divide-y divide-emerald-100">
                {paymentLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <span className="font-medium text-emerald-950">
                      {line.description}
                    </span>
                    <span className="font-bold text-emerald-700">
                      - {formatCFA(Math.abs(line.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totaux Finaux */}
          <div className="rounded-2xl bg-rhr-dark text-white p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Total Général Facturé (Hôtel + Bar/Resto)</span>
              <span className="font-bold text-white">
                {formatCFA(receipt.totalCharges)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span>Total Encaissé (Acomptes + Solde)</span>
              <span className="font-bold">{formatCFA(receipt.totalPaid)}</span>
            </div>
            <div className="border-t border-white/15 pt-2 flex items-center justify-between text-sm font-black">
              <span className="text-rhr-gold">Solde Restant à Payer</span>
              <span
                className={
                  receipt.remainingBalance > 0
                    ? "text-red-400"
                    : "text-emerald-400"
                }
              >
                {formatCFA(receipt.remainingBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Pied de Modal : WhatsApp 1-clic, Impression PDF & Remise en Propre */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] px-4 py-2.5 text-xs font-extrabold text-white shadow transition"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Envoyer sur WhatsApp ({receipt.stay.guestPhone})</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 px-3.5 py-2.5 text-xs font-bold text-rhr-dark transition"
            >
              <Printer className="h-4 w-4 text-rhr-burgundy" />
              <span>Imprimer / PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canMarkClean && onMarkRoomClean && (
              <button
                type="button"
                onClick={onMarkRoomClean}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Marquer Chambre Propre / Libre</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2.5 text-xs font-bold text-white transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

