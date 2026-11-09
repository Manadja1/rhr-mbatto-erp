"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  UtensilsCrossed,
  Wallet,
  Smartphone,
  TrendingUp,
  Users,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Download,
  Calculator,
  FileSpreadsheet,
  KeyRound,
  AlertTriangle,
  Eye,
  X,
  Building,
  RotateCcw,
} from "lucide-react";
import { useRhrStore } from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";
import { DailyReportingSheet } from "@/components/DailyReportingSheet";

export default function DashboardPage() {
  const {
    currentUser,
    waitresses,
    posOrders,
    stays,
    transactions,
    fixedCosts,
    cashClosures,
    syncQueue,
    isOnline,
    validateCashClosureByOwner,
    resetDemoData,
    clearAllDemoCounters,
  } = useRhrStore();

  const [auditFilterType, setAuditFilterType] = useState<
    "TOUS" | "ENCAISSEMENT" | "DEPENSE"
  >("TOUS");
  const [auditFilterPole, setAuditFilterPole] = useState<string>("TOUS");
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetBanner, setResetBanner] = useState<string | null>(null);

  // =========================================================================
  // 1. VUE TRÉSORERIE SÉPARÉE EN TEMPS RÉEL (ESPÈCES VS MOBILE MONEY)
  // =========================================================================

  const totalCashIn = transactions
    .filter((t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_ESPECES")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalCashOut = transactions
    .filter((t) => t.type === "DEPENSE" && t.vault === "CAISSE_ESPECES")
    .reduce((acc, t) => acc + t.amount, 0);

  const netPhysicalCashVault = totalCashIn - totalCashOut;

  // Détail Mobile Money par opérateur (Wave, Orange Money, MTN MoMo)
  const waveNet =
    transactions
      .filter((t) => t.type === "ENCAISSEMENT" && t.paymentMethod === "WAVE")
      .reduce((s, t) => s + t.amount, 0) -
    transactions
      .filter((t) => t.type === "DEPENSE" && t.paymentMethod === "WAVE")
      .reduce((s, t) => s + t.amount, 0);

  const orangeMoneyNet =
    transactions
      .filter(
        (t) => t.type === "ENCAISSEMENT" && t.paymentMethod === "ORANGE_MONEY"
      )
      .reduce((s, t) => s + t.amount, 0) -
    transactions
      .filter((t) => t.type === "DEPENSE" && t.paymentMethod === "ORANGE_MONEY")
      .reduce((s, t) => s + t.amount, 0);

  const mtnMomoNet =
    transactions
      .filter(
        (t) => t.type === "ENCAISSEMENT" && t.paymentMethod === "MTN_MOMO"
      )
      .reduce((s, t) => s + t.amount, 0) -
    transactions
      .filter((t) => t.type === "DEPENSE" && t.paymentMethod === "MTN_MOMO")
      .reduce((s, t) => s + t.amount, 0);

  const totalMobileMoneyVault = waveNet + orangeMoneyNet + mtnMomoNet;

  // =========================================================================
  // 2. CALCULATEUR DE BÉNÉFICE NET RÉEL (COMPTE D'EXPLOITATION SIMPLIFIÉ)
  // =========================================================================

  const globalRevenueEntries = transactions
    .filter((t) => t.type === "ENCAISSEMENT")
    .reduce((s, t) => s + t.amount, 0);

  const marketAndStockExpenses = transactions
    .filter(
      (t) =>
        t.type === "DEPENSE" &&
        (t.pole === "MARCHE_CUISINE" || t.pole === "BAR_RESTO")
    )
    .reduce((s, t) => s + t.amount, 0);

  const hotelMaintenanceExpenses = transactions
    .filter(
      (t) =>
        t.type === "DEPENSE" &&
        (t.pole === "MAINTENANCE" || t.pole === "HOTEL")
    )
    .reduce((s, t) => s + t.amount, 0);

  const totalFixedCostsAmount = fixedCosts.reduce(
    (s, fc) => s + fc.amount,
    0
  );

  const netRealProfit =
    globalRevenueEntries -
    marketAndStockExpenses -
    hotelMaintenanceExpenses -
    totalFixedCostsAmount;

  const netMarginPercent =
    globalRevenueEntries > 0
      ? Math.round((netRealProfit / globalRevenueEntries) * 100)
      : 0;

  // =========================================================================
  // 3. ANALYSE DU CHIFFRE D'AFFAIRES PAR PÔLE (HÔTEL, RESTAURANT, BAR, CÉRÉMONIE)
  // =========================================================================

  const revenueHotel = transactions
    .filter((t) => t.type === "ENCAISSEMENT" && t.pole === "HOTEL")
    .reduce((s, t) => s + t.amount, 0);

  const revenueCeremony = transactions
    .filter((t) => t.type === "ENCAISSEMENT" && t.pole === "CEREMONIE")
    .reduce((s, t) => s + t.amount, 0);

  // Ventilation exacte Restaurant (Plats) vs Bar (Boissons) à partir des commandes POS validées
  const activePosOrders = posOrders.filter(
    (o) => o.status === "PAYEE" || o.status === "TRANSFEREE_CHAMBRE"
  );

  const revenueRestaurantDishes = activePosOrders.reduce(
    (sum, ord) =>
      sum +
      ord.items
        .filter((i) => i.pole === "PLAT_MENU")
        .reduce((s, i) => s + i.subtotal, 0),
    0
  );

  const revenueBarDrinks = activePosOrders.reduce(
    (sum, ord) =>
      sum +
      ord.items
        .filter((i) => i.pole === "BAR_BOISSON")
        .reduce((s, i) => s + i.subtotal, 0),
    0
  );

  const totalPoleAnalyzed =
    revenueHotel +
    revenueRestaurantDishes +
    revenueBarDrinks +
    revenueCeremony || 1;

  // Classement des Serveuses par CA décroissant
  const rankedWaitresses = [...waitresses].sort(
    (a, b) => b.totalSalesAmount - a.totalSalesAmount
  );

  // =========================================================================
  // 4. JOURNAL D'AUDIT COMPLET & EXPORT CSV / EXCEL COMPTABLE
  // =========================================================================

  const filteredAuditTransactions = transactions.filter((t) => {
    if (auditFilterType !== "TOUS" && t.type !== auditFilterType) return false;
    if (auditFilterPole !== "TOUS" && t.pole !== auditFilterPole) return false;
    return true;
  });

  const handleExportCsvExcel = () => {
    const headers = [
      "Date",
      "Reference",
      "Type",
      "Pole",
      "Coffre",
      "Mode_Paiement",
      "Source_Fonds",
      "Montant_FCFA",
      "Description",
      "Operateur_Signataire",
    ];
    const rows = filteredAuditTransactions.map((t) => [
      formatDateTime(t.createdAt),
      t.reference,
      t.type,
      t.pole,
      t.vault,
      t.paymentMethod,
      t.expenseFundSource || "N/A",
      t.amount.toString(),
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.createdByName}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RHR_MBATTO_GRAND_LIVRE_COMPTABLE_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          EN-TÊTE EXÉCUTIF ADMINISTRATEUR & COMPTABLE
      ===================================================================== */}
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              Dashboard Exécutif Administrateur &amp; Comptable — Accès Exclusif
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pilotage Financier &amp; Audit Global — RHR M&apos;Batto
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Séparation étanche des coffres Espèces vs Mobile Money, Compte
            d&apos;Exploitation Simplifié et Audit des Clôtures de Caisse.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser?.role === "PROPRIETAIRE" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-gold hover:bg-rhr-gold-light px-4 py-2.5 text-xs font-black text-rhr-dark shadow transition"
            >
              <Users className="h-4 w-4" />
              <span>Administrateur : Comptes, Prix &amp; Articles</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleExportCsvExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-extrabold text-white shadow transition"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export CSV / Excel Comptable</span>
          </button>

          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            title="Réinitialiser ou remettre à zéro les données démo RHR"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-rhr-burgundy border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rhr-gold" />
            <span>Réinitialiser Démo</span>
          </button>
        </div>
      </div>

      {resetBanner && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{resetBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setResetBanner(null)}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          0. REPORTING JOURNALIER OFFICIEL (DEPUIS JANVIER 2026) — ADMIN & COMPTABLE
      ===================================================================== */}
      <DailyReportingSheet />

      {/* =====================================================================
          1. VUE TRÉSORERIE SÉPARÉE EN TEMPS RÉEL (2 COFFRES ÉTANCHES)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CARTE 1 : COFFRE ESPÈCES PHYSIQUE GLOBAL */}
        <div className="rounded-3xl bg-white border-2 border-emerald-200 p-6 shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                <Wallet className="h-3.5 w-3.5" />
                Coffre #1 — Trésorerie Physique
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-2">
                Coffre Espèces Physique Global
              </h2>
              <p className="text-xs text-gray-500">
                Total des encaissements espèces moins toutes les dépenses
                espèces décaissées.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-700">
                {formatCFA(netPhysicalCashVault)}
              </div>
              <span className="text-[11px] font-bold text-emerald-800">
                Solde Net en Coffre
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-rhr-surface border border-gray-200 p-3.5 text-xs">
            <div>
              <span className="text-gray-500 block">
                Total Entrées Espèces (Hôtel + POS + Cérémonies)
              </span>
              <strong className="text-sm font-black text-emerald-700">
                + {formatCFA(totalCashIn)}
              </strong>
            </div>
            <div className="border-l border-gray-200 pl-3">
              <span className="text-gray-500 block">
                Total Sorties Espèces (Marché + Entretien + Salaires)
              </span>
              <strong className="text-sm font-black text-rhr-burgundy">
                - {formatCFA(totalCashOut)}
              </strong>
            </div>
          </div>
        </div>

        {/* CARTE 2 : SOLDE MOBILE MONEY GLOBAL (DÉTAIL WAVE, ORANGE, MTN) */}
        <div className="rounded-3xl bg-white border-2 border-blue-200 p-6 shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-800">
                <Smartphone className="h-3.5 w-3.5" />
                Coffre #2 — Trésorerie Digitale
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-2">
                Solde Mobile Money Global
              </h2>
              <p className="text-xs text-gray-500">
                Ventilation en direct par opérateur Mobile Money en Côte
                d&apos;Ivoire.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-blue-700">
                {formatCFA(totalMobileMoneyVault)}
              </div>
              <span className="text-[11px] font-bold text-blue-800">
                Cumul Comptes Marchands
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3">
              <span className="font-extrabold text-sky-900 block">Wave CI</span>
              <strong className="text-sm font-black text-sky-700">
                {formatCFA(waveNet)}
              </strong>
            </div>
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3">
              <span className="font-extrabold text-orange-900 block">
                Orange Money
              </span>
              <strong className="text-sm font-black text-orange-700">
                {formatCFA(orangeMoneyNet)}
              </strong>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <span className="font-extrabold text-amber-900 block">
                MTN MoMo
              </span>
              <strong className="text-sm font-black text-amber-700">
                {formatCFA(mtnMomoNet)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. CALCULATEUR DE BÉNÉFICE NET RÉEL (COMPTE D'EXPLOITATION SIMPLIFIÉ)
      ===================================================================== */}
      <div className="rounded-3xl bg-gradient-to-r from-rhr-dark via-[#1B1F24] to-[#2C0805] text-white p-6 sm:p-7 shadow-xl border border-rhr-gold/40 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-rhr-gold">
              <Calculator className="h-4 w-4" />
              Compte d&apos;Exploitation Simplifié en Temps Réel
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-0.5">
              Équation Comptable &amp; Calculateur du Bénéfice Net Réel
            </h2>
          </div>

          <Link
            href="/fixed-costs"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-rhr-gold border border-rhr-gold/30 transition"
          >
            <Building className="h-4 w-4" />
            <span>Gérer Charges Fixes (CIE, SODECI, Salaires) →</span>
          </Link>
        </div>

        {/* Équation visuelle en 5 blocs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch text-xs">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-4 flex flex-col justify-between">
            <span className="text-gray-300 font-bold uppercase text-[10px]">
              1. Chiffre d&apos;Affaires Global (Entrées)
            </span>
            <div className="text-xl font-black text-emerald-400 mt-2">
              {formatCFA(globalRevenueEntries)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1">
              Hôtel + Bar/Resto + Cérémonies
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between">
            <span className="text-gray-300 font-bold uppercase text-[10px]">
              2. - Achats Marché &amp; Stocks
            </span>
            <div className="text-xl font-black text-rose-300 mt-2">
              - {formatCFA(marketAndStockExpenses)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1">
              Condiments, Attiéké, Boissons
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between">
            <span className="text-gray-300 font-bold uppercase text-[10px]">
              3. - Dépenses d&apos;Entretien Hôtel
            </span>
            <div className="text-xl font-black text-amber-300 mt-2">
              - {formatCFA(hotelMaintenanceExpenses)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1">
              Javel, Ampoules, Réparations
            </span>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between">
            <span className="text-gray-300 font-bold uppercase text-[10px]">
              4. - Charges Fixes (CIE, SODECI, Salaires)
            </span>
            <div className="text-xl font-black text-orange-300 mt-2">
              - {formatCFA(totalFixedCostsAmount)}
            </div>
            <span className="text-[11px] text-gray-400 mt-1">
              {fixedCosts.length} charges de structure
            </span>
          </div>

          <div className="rounded-2xl bg-rhr-burgundy border-2 border-rhr-gold p-4 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-rhr-gold font-black uppercase text-[10px]">
                = BÉNÉFICE NET RÉEL
              </span>
              <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] font-black text-rhr-gold">
                Marge {netMarginPercent}%
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {formatCFA(netRealProfit)}
            </div>
            <span className="text-[11px] text-rose-100 mt-1">
              Résultat net d&apos;exploitation RHR
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. ANALYSE PAR PÔLE & CLASSEMENT DES SERVEUSES
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Répartition du CA entre Hôtel, Restaurant, Bar et Salle de Cérémonie */}
        <div className="lg:col-span-7 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-rhr-dark flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-rhr-burgundy" />
                <span>
                  Répartition du Chiffre d&apos;Affaires par Pôle d&apos;Activité
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Analyse comparative Hôtel (5 Chambres), Restaurant (Plats), Bar
                (Boissons) et Salle de Cérémonie.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                label: "Pôle Salle de Cérémonie (Mariages, Dots, Location 50k)",
                amount: revenueCeremony,
                color: "bg-rhr-gold",
                href: "/ceremonies",
              },
              {
                label: "Pôle Hôtel (5 Chambres Climatisées : Nuitées & Passages 3H)",
                amount: revenueHotel,
                color: "bg-blue-600",
                href: "/hotel",
              },
              {
                label: "Pôle Restaurant (Grillades, Braisés & Spécialités)",
                amount: revenueRestaurantDishes,
                color: "bg-rhr-burgundy",
                href: "/pos",
              },
              {
                label: "Pôle Bar (Bières Solibra, Vins & Sucreries)",
                amount: revenueBarDrinks,
                color: "bg-emerald-600",
                href: "/pos",
              },
            ].map((pole) => {
              const pct = Math.min(
                100,
                Math.round((pole.amount / totalPoleAnalyzed) * 100)
              );
              return (
                <div key={pole.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      href={pole.href}
                      className="font-bold text-rhr-dark hover:text-rhr-burgundy transition"
                    >
                      {pole.label}
                    </Link>
                    <span className="font-black text-rhr-dark">
                      {formatCFA(pole.amount)}{" "}
                      <span className="text-gray-400 font-semibold">
                        ({pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", pole.color)}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classement des Serveuses par Chiffre d'Affaires & Commandes */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-rhr-dark flex items-center gap-2">
                <Users className="h-5 w-5 text-rhr-burgundy" />
                <span>Classement des Serveuses (POS &amp; QR)</span>
              </h2>
              <p className="text-xs text-gray-500">
                Palmarès par chiffre d&apos;affaires généré et commandes servies
              </p>
            </div>
            <Link
              href="/pos"
              className="text-xs font-bold text-rhr-burgundy hover:underline"
            >
              POS →
            </Link>
          </div>

          <div className="space-y-2.5">
            {rankedWaitresses.map((w, idx) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-rhr-surface px-4 py-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "h-7 w-7 rounded-xl flex items-center justify-center font-black text-xs",
                      idx === 0
                        ? "bg-rhr-gold text-rhr-dark"
                        : "bg-white border border-gray-200 text-gray-600"
                    )}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-black text-sm text-rhr-dark">
                      {w.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {w.ordersCount} commandes servies
                    </div>
                  </div>
                </div>
                <span className="text-base font-black text-rhr-burgundy">
                  {formatCFA(w.totalSalesAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. CONTRÔLE DES CLÔTURES DE CAISSE DES EMPLOYÉS
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-rhr-dark flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-rhr-burgundy" />
              <span>
                Contrôle &amp; Validation des Clôtures de Caisse des Employés
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Vérifiez les espèces remises par le Gérant Hôtel et la Caissière
              et détectez tout manquant de caisse.
            </p>
          </div>
          <Link
            href="/closures"
            className="inline-flex items-center gap-1 rounded-xl bg-rhr-surface hover:bg-gray-200 px-3.5 py-2 text-xs font-bold text-rhr-dark transition"
          >
            <span>Ouvrir Module Clôtures</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cashClosures.map((cl) => (
            <div
              key={cl.id}
              className={cn(
                "rounded-2xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                cl.discrepancy !== 0
                  ? "border-red-300 bg-red-50/40"
                  : "border-gray-200 bg-rhr-surface"
              )}
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-rhr-dark px-2 py-0.5 text-[10px] font-black text-rhr-gold">
                    {cl.pole}
                  </span>
                  <span className="font-black text-sm text-rhr-dark">
                    {cl.closedByName}
                  </span>
                </div>
                <div className="text-gray-600">
                  Attendu : <strong>{formatCFA(cl.expectedCash)}</strong> •
                  Remis : <strong>{formatCFA(cl.actualCashHanded)}</strong> •
                  Écart :{" "}
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

              <div className="shrink-0">
                {cl.status === "VALIDE_PROPRIETAIRE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Audité &amp; Validé
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => validateCashClosureByOwner(cl.id)}
                    className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition"
                  >
                    Valider Clôture
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          4B. POINT FINANCIER MENSUEL DEPUIS JANVIER 2026 (HÔTEL & GLOBAL)
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
              Suivi Rétroactif &amp; Mensuel (Année 2026)
            </span>
            <h2 className="text-lg font-black text-rhr-dark">
              Point Financier de Chaque Mois depuis Janvier 2026 (Opérations Gérant Hôtel)
            </h2>
            <p className="text-xs text-gray-500">
              Synthèse mensuelle des recettes chambres, réductions accordées
              (Chambres 1 à 3), dépenses gérant et résultat net mois par mois.
            </p>
          </div>

          <Link
            href="/hotel"
            className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2 text-xs font-extrabold text-white shadow-rhr transition"
          >
            <BedDouble className="h-4 w-4" />
            <span>Saisir / Gérer les Opérations Hôtel depuis Janvier 2026</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-rhr-surface text-[10px] font-extrabold uppercase text-gray-500">
                <th className="py-3 px-3 rounded-tl-xl">Mois (2026)</th>
                <th className="py-3 px-3 text-center">Nb Séjours Hôtel</th>
                <th className="py-3 px-3 text-right">
                  Réductions Accordées (Ch. 1-3)
                </th>
                <th className="py-3 px-3 text-right">Recettes Hôtel (+)</th>
                <th className="py-3 px-3 text-right">Dépenses Hôtel (-)</th>
                <th className="py-3 px-3 text-right rounded-tr-xl">
                  Point Financier Net Hôtel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { key: "2026-01", label: "Janvier 2026" },
                { key: "2026-02", label: "Février 2026" },
                { key: "2026-03", label: "Mars 2026" },
                { key: "2026-04", label: "Avril 2026" },
                { key: "2026-05", label: "Mai 2026" },
                { key: "2026-06", label: "Juin 2026" },
                { key: "2026-07", label: "Juillet 2026" },
                { key: "2026-08", label: "Août 2026" },
                { key: "2026-09", label: "Septembre 2026" },
                { key: "2026-10", label: "Octobre 2026" },
                { key: "2026-11", label: "Novembre 2026" },
                { key: "2026-12", label: "Décembre 2026" },
              ].map((m) => {
                const mTxs = transactions.filter(
                  (t) =>
                    (t.pole === "HOTEL" || t.pole === "MAINTENANCE") &&
                    t.createdAt.startsWith(m.key)
                );
                const mStays = stays.filter((s) => s.checkIn.startsWith(m.key));
                const rev = mTxs
                  .filter((t) => t.type === "ENCAISSEMENT")
                  .reduce((s, t) => s + t.amount, 0);
                const exp = mTxs
                  .filter((t) => t.type === "DEPENSE")
                  .reduce((s, t) => s + t.amount, 0);
                const disc = mStays.reduce(
                  (s, st) => s + (st.discountAmount || 0),
                  0
                );
                const net = rev - exp;

                return (
                  <tr key={m.key} className="hover:bg-gray-50 transition">
                    <td className="py-2.5 px-3 font-extrabold text-rhr-dark">
                      {m.label}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-gray-700">
                      {mStays.length}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                      {disc > 0 ? `- ${formatCFA(disc)}` : "0 F"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      {formatCFA(rev)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rhr-burgundy">
                      {exp > 0 ? `- ${formatCFA(exp)}` : "0 F"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={cn(
                          "inline-block rounded-lg px-2.5 py-0.5 font-black",
                          net > 0
                            ? "bg-emerald-100 text-emerald-900"
                            : net < 0
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {formatCFA(net)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          5. JOURNAL D'AUDIT COMPLET (GRAND LIVRE) & JUSTIFICATIFS PHOTO
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-rhr-dark">
              Grand Livre &amp; Journal d&apos;Audit Complet (
              {filteredAuditTransactions.length} écritures)
            </h2>
            <p className="text-xs text-gray-500">
              Toutes les entrées et sorties horodatées avec signature{" "}
              <code className="font-mono text-rhr-burgundy">createdBy</code> et
              photos des reçus.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={auditFilterType}
              onChange={(e) =>
                setAuditFilterType(
                  e.target.value as "TOUS" | "ENCAISSEMENT" | "DEPENSE"
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
            >
              <option value="TOUS">Tous les flux (Entrées + Sorties)</option>
              <option value="ENCAISSEMENT">Uniquement Encaissements (+)</option>
              <option value="DEPENSE">Uniquement Dépenses / Sorties (-)</option>
            </select>

            <select
              value={auditFilterPole}
              onChange={(e) => setAuditFilterPole(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
            >
              <option value="TOUS">Tous les pôles</option>
              <option value="HOTEL">Pôle Hôtel</option>
              <option value="BAR_RESTO">Pôle Bar &amp; Resto</option>
              <option value="CEREMONIE">Pôle Cérémonie</option>
              <option value="MARCHE_CUISINE">Achats Marché Cuisine</option>
              <option value="MAINTENANCE">Entretien Hôtel</option>
              <option value="CHARGES_FIXES">Charges Fixes</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsvExcel}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-3.5 py-2 text-xs font-bold text-white transition"
            >
              <Download className="h-3.5 w-3.5 text-rhr-gold" />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-rhr-surface text-[10px] font-extrabold uppercase text-gray-500">
                <th className="py-3 px-3 rounded-tl-xl">Réf &amp; Date</th>
                <th className="py-3 px-3">Pôle</th>
                <th className="py-3 px-3">Libellé de l&apos;Opération</th>
                <th className="py-3 px-3">Coffre &amp; Mode</th>
                <th className="py-3 px-3">Signataire (Audit)</th>
                <th className="py-3 px-3 text-center">Reçu Photo</th>
                <th className="py-3 px-3 text-right rounded-tr-xl">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAuditTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-rhr-dark">
                      {tx.reference}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {formatDateTime(tx.createdAt)}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-extrabold text-gray-700">
                      {tx.pole}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-rhr-dark max-w-xs">
                    {tx.description}
                    {tx.expenseFundSource && (
                      <span className="block text-[10px] text-amber-800">
                        Source : {tx.expenseFundSource.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "inline-block rounded px-2 py-0.5 text-[10px] font-bold",
                        tx.vault === "CAISSE_ESPECES"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-blue-50 text-blue-800"
                      )}
                    >
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-600">
                    {tx.createdByName}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {tx.receiptPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhotoUrl(tx.receiptPhotoUrl || null)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-rhr-burgundy/10 px-2 py-1 text-[10px] font-bold text-rhr-burgundy hover:bg-rhr-burgundy hover:text-white transition"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Voir Photo</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-3 px-3 text-right font-black text-sm",
                      tx.type === "ENCAISSEMENT"
                        ? "text-emerald-700"
                        : "text-rhr-burgundy"
                    )}
                  >
                    {tx.type === "ENCAISSEMENT" ? "+" : "-"}{" "}
                    {formatCFA(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'aperçu grand format d'une photo de reçu jointe */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-white p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-rhr-dark">
                Justificatif Photo du Reçu / Facture
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={previewPhotoUrl}
              alt="Justificatif Reçu"
              className="w-full max-h-[70vh] object-contain rounded-2xl border border-gray-200"
            />
          </div>
        </div>
      )}

      {/* Modal de confirmation Réinitialiser Démo */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-3xl bg-white border border-gray-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialisation des Données Démo
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  Que souhaitez-vous réinitialiser ?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Choisissez entre remettre tous les compteurs financiers à zéro
                  (0 FCFA) pour démarrer une exploitation propre, ou restaurer
                  les données d&apos;exemple initiales.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  clearAllDemoCounters();
                  setResetModalOpen(false);
                  setResetBanner(
                    "Tous les compteurs de démonstration (Trésorerie, Ventes POS, Séjours, Clôtures) ont été remis à ZÉRO (0 FCFA) et les 5 chambres sont libres."
                  );
                }}
                className="w-full rounded-2xl border-2 border-rhr-burgundy bg-rhr-burgundy/5 hover:bg-rhr-burgundy hover:text-white p-4 text-left transition group"
              >
                <div className="font-black text-sm text-rhr-burgundy group-hover:text-white flex items-center justify-between">
                  <span>1. Remettre tous les compteurs à ZÉRO (0 FCFA)</span>
                  <RotateCcw className="h-4 w-4" />
                </div>
                <p className="text-xs text-gray-600 group-hover:text-rose-100 mt-1">
                  Vide les écritures de caisse, commandes POS, séjours et
                  clôtures, libère les 5 chambres et conserve vos comptes
                  utilisateurs ainsi que votre catalogue de prix.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setResetModalOpen(false);
                  setResetBanner(
                    "Le jeu de données de démonstration initial RHR M'Batto a été restauré avec succès."
                  );
                }}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 hover:bg-gray-100 p-4 text-left transition"
              >
                <div className="font-black text-sm text-rhr-dark flex items-center justify-between">
                  <span>2. Restaurer les données d&apos;exemple initiales</span>
                  <Database className="h-4 w-4 text-rhr-gold" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Recharge les opérations d&apos;exemple de démonstration
                  (séjours, ventes Bar/Resto, cérémonie et stocks par défaut).
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
