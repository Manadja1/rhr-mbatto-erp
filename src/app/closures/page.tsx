"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Smartphone,
  Receipt,
  Lock,
  Printer,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useRhrStore, CashClosure } from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";

export default function ClosuresPage() {
  const {
    currentUser,
    transactions,
    cashClosures,
    submitCashClosure,
    validateCashClosureByOwner,
    lockSession,
  } = useRhrStore();

  const role = currentUser?.role || "GERANT_HOTEL";
  const isOwnerOrAccountant = role === "PROPRIETAIRE" || role === "COMPTABLE";

  // Détermination automatique du pôle selon le rôle connecté
  const defaultPole: "HOTEL" | "BAR_RESTO" =
    role === "CAISSIERE_BAR_RESTO" ? "BAR_RESTO" : "HOTEL";

  const [selectedPole, setSelectedPole] = useState<"HOTEL" | "BAR_RESTO">(
    defaultPole
  );

  useEffect(() => {
    if (role === "GERANT_HOTEL") setSelectedPole("HOTEL");
    if (role === "CAISSIERE_BAR_RESTO") setSelectedPole("BAR_RESTO");
  }, [role]);

  // Filtrage des transactions du pôle sélectionné pour le calcul de l'arrêté de service
  const poleTransactions = transactions.filter((t) => {
    if (selectedPole === "HOTEL") {
      return t.pole === "HOTEL" || t.pole === "MAINTENANCE";
    }
    return t.pole === "BAR_RESTO" || t.pole === "MARCHE_CUISINE";
  });

  const totalCashIn = poleTransactions
    .filter((t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_ESPECES")
    .reduce((s, t) => s + t.amount, 0);

  const totalDayTillExpenses = poleTransactions
    .filter(
      (t) =>
        t.type === "DEPENSE" &&
        t.vault === "CAISSE_ESPECES" &&
        t.expenseFundSource === "CAISSE_DU_JOUR"
    )
    .reduce((s, t) => s + t.amount, 0);

  const expectedCash = totalCashIn - totalDayTillExpenses;

  const totalMobileMoneyIn = poleTransactions
    .filter(
      (t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_MOBILE_MONEY"
    )
    .reduce((s, t) => s + t.amount, 0);

  const [actualCashHanded, setActualCashHanded] =
    useState<number>(expectedCash);
  const [closureNotes, setClosureNotes] = useState<string>("");
  const [lockAfterSubmit, setLockAfterSubmit] = useState<boolean>(false);
  const [lastCreatedClosure, setLastCreatedClosure] =
    useState<CashClosure | null>(null);

  useEffect(() => {
    setActualCashHanded(expectedCash);
  }, [expectedCash]);

  const liveDiscrepancy = (actualCashHanded || 0) - expectedCash;

  const handleClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = submitCashClosure({
      pole: selectedPole,
      totalCashIn,
      totalMobileMoneyIn,
      totalDayTillExpenses,
      expectedCash,
      actualCashHanded,
      notes: closureNotes,
    });

    setClosureNotes("");
    setLastCreatedClosure(created);

    if (lockAfterSubmit) {
      setTimeout(() => lockSession(), 1200);
    }
  };

  // Filtrage de l'historique des clôtures selon RBAC
  const visibleClosures = cashClosures.filter((cl) => {
    if (isOwnerOrAccountant) return true;
    if (role === "GERANT_HOTEL") return cl.pole === "HOTEL";
    if (role === "CAISSIERE_BAR_RESTO") return cl.pole === "BAR_RESTO";
    return false;
  });

  return (
    <div className="space-y-6">
      {/* En-tête Clôture de Caisse */}
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <KeyRound className="h-4 w-4" />
            Arrêté Obligatoire de Fin de Service — RHR M&apos;Batto
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Clôture de Caisse &amp; Contrôle Automatique des Écarts
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
            Formule stricte :{" "}
            <strong className="text-white">
              Total Encaissements Espèces - Dépenses prises dans la caisse du
              jour = Espèces Attendues
            </strong>
          </p>
        </div>

        {isOwnerOrAccountant && (
          <div className="inline-flex rounded-2xl bg-white/10 border border-white/15 p-1 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedPole("HOTEL")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-extrabold transition",
                selectedPole === "HOTEL"
                  ? "bg-rhr-burgundy text-white"
                  : "text-gray-200 hover:text-white"
              )}
            >
              Simuler Caisse Hôtel
            </button>
            <button
              type="button"
              onClick={() => setSelectedPole("BAR_RESTO")}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-extrabold transition",
                selectedPole === "BAR_RESTO"
                  ? "bg-rhr-burgundy text-white"
                  : "text-gray-200 hover:text-white"
              )}
            >
              Simuler Caisse Bar/Resto
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================================================================
            COLONNE GAUCHE (6 COLS) : CALCULATEUR & FORMULAIRE D'ARRÊTÉ DE CAISSE
        =================================================================== */}
        <div className="lg:col-span-6 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                Pôle {selectedPole === "HOTEL" ? "Hôtel (5 Chambres)" : "Bar & Restaurant (POS)"}
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-0.5">
                Déclaration de Fin de Service
              </h2>
              <p className="text-xs text-gray-500">
                Signataire :{" "}
                <strong className="text-rhr-dark">
                  {currentUser?.fullName}
                </strong>
              </p>
            </div>
          </div>

          {/* Décomposition de l'équation de caisse du service */}
          <div className="space-y-3 rounded-2xl bg-rhr-surface border border-gray-200 p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Total Encaissé en Espèces (Service) :
              </span>
              <span className="font-black text-sm text-emerald-700">
                + {formatCFA(totalCashIn)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-rhr-burgundy" />
                Moins Dépenses prises dans la caisse du jour :
              </span>
              <span className="font-black text-sm text-rhr-burgundy">
                - {formatCFA(totalDayTillExpenses)}
              </span>
            </div>

            <div className="border-t-2 border-gray-300 pt-2.5 flex items-center justify-between">
              <span className="font-black text-sm text-rhr-dark uppercase">
                = Montant Espèces Attendu à remettre :
              </span>
              <span className="text-lg font-black text-rhr-dark">
                {formatCFA(expectedCash)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-2.5 flex items-center justify-between text-blue-800">
              <span className="font-bold flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-blue-600" />
                + Total Mobile Money Attendu (Wave / OM / MTN) :
              </span>
              <span className="font-black text-sm">
                {formatCFA(totalMobileMoneyIn)}
              </span>
            </div>
          </div>

          {/* Saisie du montant physique réellement remis */}
          <form onSubmit={handleClosureSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-rhr-dark mb-1.5">
                Montant Physique Espèces Réellement Compté &amp; Remis (FCFA) *
              </label>
              <input
                type="number"
                min={0}
                step={500}
                required
                value={actualCashHanded}
                onChange={(e) => setActualCashHanded(Number(e.target.value))}
                className="w-full rounded-2xl border-2 border-rhr-dark bg-white px-4 py-3 text-xl font-black text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setActualCashHanded(expectedCash)}
                  className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
                >
                  Saisir Caisse Exacte ({formatCFA(expectedCash)})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActualCashHanded(Math.max(0, expectedCash - 2000))
                  }
                  className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-700"
                >
                  Simuler un Manquant (-2 000 F)
                </button>
              </div>
            </div>

            {/* BANDEAU DYNAMIQUE DE CONTRÔLE D'ÉCART */}
            <div
              className={cn(
                "rounded-2xl border-2 p-4 flex items-center justify-between gap-3 transition",
                liveDiscrepancy === 0
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                  : liveDiscrepancy < 0
                  ? "border-red-500 bg-red-50 text-red-950"
                  : "border-amber-400 bg-amber-50 text-amber-950"
              )}
            >
              <div className="flex items-center gap-3">
                {liveDiscrepancy === 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-extrabold uppercase">
                    {liveDiscrepancy === 0
                      ? "0 F = CAISSE EXACTE (AUCUN ÉCART)"
                      : liveDiscrepancy < 0
                      ? "ÉCART DÉTECTÉ : MANQUANT EN CAISSE !"
                      : "EXCÉDENT DE CAISSE DÉTECTÉ"}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {liveDiscrepancy === 0
                      ? "Le montant physique correspond exactement aux écritures."
                      : "Cet écart sera signalé en rouge au Propriétaire et au Comptable."}
                  </div>
                </div>
              </div>

              <span
                className={cn(
                  "text-lg font-black shrink-0",
                  liveDiscrepancy === 0
                    ? "text-emerald-700"
                    : liveDiscrepancy < 0
                    ? "text-red-600"
                    : "text-amber-800"
                )}
              >
                {liveDiscrepancy > 0 ? "+" : ""}
                {formatCFA(liveDiscrepancy)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Observation ou Justification de l&apos;employé (si écart)
              </label>
              <input
                type="text"
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Ex: Caisse remise en main propre à M. Koffi..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs text-rhr-dark"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lockAfterSubmit}
                onChange={(e) => setLockAfterSubmit(e.target.checked)}
                className="h-4 w-4 rounded accent-rhr-burgundy"
              />
              <Lock className="h-3.5 w-3.5 text-rhr-burgundy" />
              <span>
                Verrouiller automatiquement mon écran de session après la
                clôture
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-rhr transition"
            >
              Signer &amp; Valider la Clôture de Caisse (
              {formatCFA(actualCashHanded)})
            </button>
          </form>
        </div>

        {/* ===================================================================
            COLONNE DROITE (6 COLS) : RAPPORT SIGNÉ & HISTORIQUE D'AUDIT
        =================================================================== */}
        <div className="lg:col-span-6 space-y-5">
          {lastCreatedClosure && (
            <div className="rounded-3xl border-2 border-rhr-gold bg-rhr-dark text-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                    Rapport Officiel d&apos;Arrêté de Service Généré
                  </span>
                  <h3 className="text-lg font-black">
                    Clôture Pôle {lastCreatedClosure.pole} —{" "}
                    {lastCreatedClosure.closedByName}
                  </h3>
                </div>
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase",
                    lastCreatedClosure.discrepancy === 0
                      ? "bg-emerald-500 text-white"
                      : "bg-red-600 text-white"
                  )}
                >
                  {lastCreatedClosure.discrepancy === 0
                    ? "Caisse Exacte (0 F)"
                    : `Écart : ${formatCFA(lastCreatedClosure.discrepancy)}`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `🔒 *RHR M'BATTO — RAPPORT DE CLÔTURE DE CAISSE*\nPôle : *${
                      lastCreatedClosure.pole
                    }*\nAgent : *${
                      lastCreatedClosure.closedByName
                    }*\nDate : ${formatDateTime(
                      lastCreatedClosure.createdAt
                    )}\n----------------\n• Encaissé Espèces : ${formatCFA(
                      lastCreatedClosure.totalCashIn
                    )}\n• Dépenses Caisse Jour : -${formatCFA(
                      lastCreatedClosure.totalDayTillExpenses
                    )}\n• *Espèces Attendues : ${formatCFA(
                      lastCreatedClosure.expectedCash
                    )}*\n• *Espèces Remises : ${formatCFA(
                      lastCreatedClosure.actualCashHanded
                    )}*\n• *Écart : ${formatCFA(
                      lastCreatedClosure.discrepancy
                    )}*\n• Mobile Money : ${formatCFA(
                      lastCreatedClosure.totalMobileMoneyIn
                    )}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] px-3.5 py-2 text-xs font-extrabold text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Transmettre au Propriétaire sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer PV de Caisse</span>
                </button>
              </div>
            </div>
          )}

          {/* Historique des Clôtures & Validation Propriétaire / Comptable */}
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-black text-rhr-dark">
                Journal des Clôtures de Service ({visibleClosures.length})
              </h2>
              {isOwnerOrAccountant && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rhr-burgundy">
                  <ShieldCheck className="h-4 w-4" />
                  Audit Direction Actif
                </span>
              )}
            </div>

            <div className="space-y-3">
              {visibleClosures.map((cl) => {
                const hasDiscrepancy = cl.discrepancy !== 0;
                return (
                  <div
                    key={cl.id}
                    className={cn(
                      "rounded-2xl border-2 p-4 space-y-3",
                      hasDiscrepancy
                        ? "border-red-300 bg-red-50/30"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-rhr-dark px-2 py-0.5 text-[10px] font-black text-rhr-gold">
                            PÔLE {cl.pole}
                          </span>
                          <span className="font-bold text-sm text-rhr-dark">
                            {cl.closedByName}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Service du {cl.shiftDate} • Horodaté :{" "}
                          {formatDateTime(cl.createdAt)}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase",
                          cl.status === "VALIDE_PROPRIETAIRE"
                            ? "bg-emerald-100 text-emerald-800"
                            : cl.status === "ECART_A_JUSTIFIER"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {cl.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-rhr-surface p-3 text-xs border border-gray-200">
                      <div>
                        <span className="text-gray-500 block">Attendu</span>
                        <strong className="text-rhr-dark">
                          {formatCFA(cl.expectedCash)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Remis</span>
                        <strong className="text-rhr-dark">
                          {formatCFA(cl.actualCashHanded)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block">Écart</span>
                        <strong
                          className={
                            cl.discrepancy === 0
                              ? "text-emerald-700"
                              : "text-red-600"
                          }
                        >
                          {cl.discrepancy === 0
                            ? "0 F (Exact)"
                            : formatCFA(cl.discrepancy)}
                        </strong>
                      </div>
                    </div>

                    {cl.notes && (
                      <p className="text-xs text-gray-600 italic">
                        Note : &ldquo;{cl.notes}&rdquo;
                      </p>
                    )}

                    {isOwnerOrAccountant &&
                      cl.status !== "VALIDE_PROPRIETAIRE" && (
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => validateCashClosureByOwner(cl.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Valider / Auditer cette Clôture</span>
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
