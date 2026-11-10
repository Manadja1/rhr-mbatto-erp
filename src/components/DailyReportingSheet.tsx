"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Printer,
  Download,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  Edit3,
} from "lucide-react";
import {
  useRhrStore,
  DailyReportRowKey,
  PaymentMethod,
} from "@/store/useRhrStore";
import { formatCFA, cn } from "@/lib/utils";

const REPORT_ROWS_CONFIG: {
  key: DailyReportRowKey;
  label: string;
  defaultPrice?: number;
}[] = [
    { key: "CHAMBRE_1", label: "Chambre 1", defaultPrice: 15000 },
    { key: "CHAMBRE_2", label: "Chambre 2", defaultPrice: 15000 },
    { key: "CHAMBRE_3", label: "Chambre 3", defaultPrice: 15000 },
    { key: "CHAMBRE_4", label: "Chambre 4", defaultPrice: 10000 },
    { key: "CHAMBRE_5", label: "Chambre 5", defaultPrice: 10000 },
    { key: "LOCATION_SALLE", label: "Location salle", defaultPrice: 50000 },
    { key: "RESTAURATION", label: "Restauration", defaultPrice: 15000 },
    { key: "BAR", label: "Bar", defaultPrice: 10000 },
    { key: "AUTRES", label: "Autres", defaultPrice: 5000 },
  ];

const MONTHS_2026_SHORT = [
  { key: "2026-01", label: "Janv.", defaultDate: "2026-01-15" },
  { key: "2026-02", label: "Févr.", defaultDate: "2026-02-15" },
  { key: "2026-03", label: "Mars", defaultDate: "2026-03-15" },
  { key: "2026-04", label: "Avril", defaultDate: "2026-04-17" },
  { key: "2026-05", label: "Mai", defaultDate: "2026-05-15" },
  { key: "2026-06", label: "Juin", defaultDate: "2026-06-15" },
  { key: "2026-07", label: "Juil.", defaultDate: "2026-07-15" },
  { key: "2026-08", label: "Août", defaultDate: "2026-08-15" },
  { key: "2026-09", label: "Sept.", defaultDate: "2026-09-15" },
  { key: "2026-10", label: "Oct.", defaultDate: "2026-10-15" },
  { key: "2026-11", label: "Nov.", defaultDate: "2026-11-09" },
  { key: "2026-12", label: "Déc.", defaultDate: "2026-12-15" },
];

function formatDateFr(dateIso: string): string {
  const parts = dateIso.slice(0, 10).split("-");
  if (parts.length !== 3) return dateIso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function DailyReportingSheet({
  initialDate = "2026-04-17",
  scope = "GLOBAL",
}: {
  initialDate?: string;
  scope?: "GLOBAL" | "HOTEL_ONLY";
}) {
  const {
    currentUser,
    transactions,
    posOrders,
    stays,
    dailyCashMetas,
    recordGeneralDailyOperation,
    updateDailyCashSheetMeta,
    deleteHotelTransaction,
    clearDailyReportRowForDate,
  } = useRhrStore();

  // Suppression réservée exclusivement à l'Administrateur (PROPRIETAIRE)
  const isAdmin = currentUser?.role === "PROPRIETAIRE";

  // Si scope === "HOTEL_ONLY" ou rôle Gérant Hôtel : masquer toutes les opérations du Bar / Restaurant
  const isHotelOnly =
    scope === "HOTEL_ONLY" || currentUser?.role === "GERANT_HOTEL";

  const activeRowsConfig = useMemo(
    () =>
      isHotelOnly
        ? REPORT_ROWS_CONFIG.filter(
          (r) => r.key !== "BAR" && r.key !== "RESTAURATION"
        )
        : REPORT_ROWS_CONFIG,
    [isHotelOnly]
  );

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(true);

  // Formulaire d'ajout rapide d'une opération sur la journée sélectionnée
  const [opCategory, setOpCategory] = useState<DailyReportRowKey | "DEPENSE">(
    "LOCATION_SALLE"
  );
  const [opGrossAmount, setOpGrossAmount] = useState<number>(50000);
  const [opDiscountAmount, setOpDiscountAmount] = useState<number>(0);
  const [opObservation, setOpObservation] = useState<string>("");
  const [opClientName, setOpClientName] = useState<string>("");
  const [opPaymentMethod, setOpPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Changement de jour (-1 / +1)
  const shiftDay = (deltaDays: number) => {
    const dt = new Date(`${selectedDate}T12:00:00`);
    if (isNaN(dt.getTime())) return;
    dt.setDate(dt.getDate() + deltaDays);
    const nextIso = dt.toISOString().slice(0, 10);
    if (nextIso >= "2026-01-01") {
      setSelectedDate(nextIso);
    }
  };

  // Métadonnées de caisse pour la journée sélectionnée
  const currentMeta = dailyCashMetas[selectedDate];

  // Filtrage des transactions selon le périmètre (GLOBAL = Hôtel + Bar/Resto regroupés ; HOTEL_ONLY = Hôtel & Salle uniquement sans le Bar)
  const scopedTransactions = useMemo(
    () =>
      isHotelOnly
        ? transactions.filter(
          (t) =>
            t.pole !== "BAR_RESTO" &&
            t.pole !== "MARCHE_CUISINE" &&
            t.dailyReportRow !== "BAR" &&
            t.dailyReportRow !== "RESTAURATION"
        )
        : transactions,
    [transactions, isHotelOnly]
  );

  // Calcul automatique du Solde à l'ouverture (A) :
  // Si un override manuel est défini pour cette date (ex: 91 000 F le 17/04/2026), on l'utilise ;
  // sinon on calcule le cumul net des journées précédentes depuis le 01/01/2026
  const computedOpeningBalanceA = useMemo(() => {
    if (
      currentMeta &&
      typeof currentMeta.openingBalanceOverride === "number" &&
      !isNaN(currentMeta.openingBalanceOverride)
    ) {
      return currentMeta.openingBalanceOverride;
    }
    const priorTxs = scopedTransactions.filter(
      (t) =>
        t.createdAt.slice(0, 10) >= "2026-01-01" &&
        t.createdAt.slice(0, 10) < selectedDate
    );
    const priorIn = priorTxs
      .filter((t) => t.type === "ENCAISSEMENT")
      .reduce((s, t) => s + t.amount, 0);
    const priorOut = priorTxs
      .filter((t) => t.type === "DEPENSE")
      .reduce((s, t) => s + t.amount, 0);

    const priorDeposits = Object.values(dailyCashMetas)
      .filter((m) => m.dateIso < selectedDate)
      .reduce(
        (s, m) => s + (m.cashDepositAmount || 0) + (m.bankDepositAmount || 0),
        0
      );

    return Math.max(0, priorIn - priorOut - priorDeposits);
  }, [currentMeta, scopedTransactions, dailyCashMetas, selectedDate]);

  // Transactions et commandes POS du jour sélectionné
  const dayTransactions = useMemo(
    () =>
      scopedTransactions.filter(
        (t) => t.createdAt.slice(0, 10) === selectedDate
      ),
    [scopedTransactions, selectedDate]
  );

  const dayPosOrders = useMemo(
    () =>
      isHotelOnly
        ? []
        : posOrders.filter(
          (o) =>
            o.createdAt.slice(0, 10) === selectedDate &&
            (o.status === "PAYEE" || o.status === "TRANSFEREE_CHAMBRE")
        ),
    [posOrders, selectedDate, isHotelOnly]
  );

  const dayStays = useMemo(
    () => stays.filter((s) => s.checkIn.slice(0, 10) === selectedDate),
    [stays, selectedDate]
  );

  // Construction des lignes de Recettes de la journée :
  // - Mode GLOBAL (Admin & Comptable) : Chambre 1..5, Location salle, Restauration, Bar, Autres (regroupement Bar + Hôtel)
  // - Mode HOTEL_ONLY (Gérant Hôtel) : Chambre 1..5, Location salle, Autres (sans aucune opération du Bar)
  const revenueRows = useMemo(() => {
    return activeRowsConfig.map((cfg) => {
      let gross = 0;
      let discount = 0;
      let net = 0;
      const obsList: string[] = [];

      // 1. Transactions explicitement rattachées à cette ligne (dailyReportRow === cfg.key)
      const directTxs = dayTransactions.filter(
        (t) => t.type === "ENCAISSEMENT" && t.dailyReportRow === cfg.key
      );

      for (const tx of directTxs) {
        const txNet = tx.amount;
        const txDisc = tx.discountAmount || 0;
        const txGross = tx.grossAmount ? tx.grossAmount : txNet + txDisc;
        gross += txGross;
        discount += txDisc;
        net += txNet;
        if (tx.observation) {
          obsList.push(tx.observation);
        }
      }

      // 2. Rattachement intelligent des transactions legacy (sans dailyReportRow)
      const legacyTxs = dayTransactions.filter(
        (t) => t.type === "ENCAISSEMENT" && !t.dailyReportRow
      );

      if (cfg.key.startsWith("CHAMBRE_")) {
        const roomNum = Number(cfg.key.replace("CHAMBRE_", ""));
        for (const tx of legacyTxs) {
          if (
            tx.pole === "HOTEL" &&
            (tx.description.includes(`Chambre ${roomNum}`) ||
              tx.description.includes(`Ch.${roomNum}`))
          ) {
            const matchedStay = dayStays.find(
              (s) =>
                s.id === tx.relatedEntityId || s.roomNumber === roomNum
            );
            const stDisc = matchedStay?.discountAmount || 0;
            gross += tx.amount + stDisc;
            discount += stDisc;
            net += tx.amount;
            if (matchedStay?.discountReason) {
              obsList.push(matchedStay.discountReason);
            }
          }
        }
      } else if (cfg.key === "LOCATION_SALLE") {
        for (const tx of legacyTxs) {
          if (tx.pole === "CEREMONIE") {
            gross += tx.amount;
            net += tx.amount;
            obsList.push(tx.description);
          }
        }
      } else if (cfg.key === "RESTAURATION") {
        // Ajouter les ventes de plats du menu (PLAT_MENU) issues des commandes POS du jour
        // uniquement pour les transactions POS qui n'ont pas déjà un dailyReportRow="RESTAURATION"
        const posDishTotal = dayPosOrders.reduce(
          (sum, ord) =>
            sum +
            ord.items
              .filter((i) => i.pole === "PLAT_MENU")
              .reduce((s, i) => s + i.subtotal, 0),
          0
        );
        if (posDishTotal > 0) {
          gross += posDishTotal;
          net += posDishTotal;
          obsList.push(`Ventes cuisine POS (${dayPosOrders.length} ticket(s))`);
        }
      } else if (cfg.key === "BAR") {
        // Ajouter les ventes de boissons (BAR_BOISSON) issues des commandes POS du jour
        const posDrinkTotal = dayPosOrders.reduce(
          (sum, ord) =>
            sum +
            ord.items
              .filter((i) => i.pole === "BAR_BOISSON")
              .reduce((s, i) => s + i.subtotal, 0),
          0
        );
        if (posDrinkTotal > 0) {
          gross += posDrinkTotal;
          net += posDrinkTotal;
          obsList.push(`Ventes boissons Bar POS`);
        }
      }

      const customObs = currentMeta?.rowObservations?.[cfg.key];
      const finalObservation =
        customObs !== undefined
          ? customObs
          : Array.from(new Set(obsList)).join(" ; ");

      return {
        key: cfg.key,
        label: cfg.label,
        grossAmount: gross,
        discountAmount: discount,
        netAmount: net,
        observation: finalObservation,
      };
    });
  }, [activeRowsConfig, dayTransactions, dayPosOrders, dayStays, currentMeta]);

  // Totaux Recettes (B)
  const totalRecettesGross = revenueRows.reduce(
    (s, r) => s + r.grossAmount,
    0
  );
  const totalRecettesDiscount = revenueRows.reduce(
    (s, r) => s + r.discountAmount,
    0
  );
  const totalRecettesNetB = revenueRows.reduce((s, r) => s + r.netAmount, 0);

  // Dépenses de la journée (C)
  const dayExpenses = useMemo(
    () => dayTransactions.filter((t) => t.type === "DEPENSE"),
    [dayTransactions]
  );

  const totalDepensesC = dayExpenses.reduce((s, t) => s + t.amount, 0);

  // Solde en fin de journée (D) = A + B - C
  const endingBalanceD =
    computedOpeningBalanceA + totalRecettesNetB - totalDepensesC;

  // Situation de la Caisse
  const cashDeposit = currentMeta?.cashDepositAmount || 0;
  const bankDeposit = currentMeta?.bankDepositAmount || 0;
  const finalCashInTill = endingBalanceD - cashDeposit - bankDeposit;
  const isCashOverMaxLimit = finalCashInTill > 100000;

  // Soumission d'une opération rapide sur la journée
  const handleAddDailyOperation = (e: React.FormEvent) => {
    e.preventDefault();
    if (opGrossAmount <= 0) return;

    const res = recordGeneralDailyOperation({
      operationDateIso: selectedDate,
      category: opCategory,
      grossAmount: opGrossAmount,
      discountAmount: opCategory === "DEPENSE" ? 0 : opDiscountAmount,
      paymentMethod: opPaymentMethod,
      observation: opObservation,
      clientName: opClientName,
    });

    if (res.success) {
      setOpObservation("");
      setOpClientName("");
      setOpDiscountAmount(0);
      setFeedbackBanner(
        `Opération ajoutée au Reporting Journalier du ${formatDateFr(
          selectedDate
        )} : ${formatCFA(res.transaction.amount)}`
      );
      setTimeout(() => setFeedbackBanner(null), 4500);
    }
  };

  // Export CSV / Excel fidèle au modèle papier du Reporting Journalier
  const handleExportDailyReportCsv = () => {
    const lines: string[] = [
      `REPORTING JOURNALIER du;${formatDateFr(selectedDate)};;;`,
      `Solde a l'ouverture (A);Montant;${computedOpeningBalanceA};;`,
      `;;;;`,
      `Recettes de la journee :;;;;`,
      `Libelle;Montant;Remise;Montant net;Observation`,
      ...revenueRows.map(
        (r) =>
          `${r.label};${r.grossAmount || ""};${r.discountAmount || ""};${r.netAmount || ""
          };"${(r.observation || "").replace(/"/g, '""')}"`
      ),
      `Total recettes (B);${totalRecettesGross};${totalRecettesDiscount || ""
      };${totalRecettesNetB};`,
      `;;;;`,
      `Depenses de la journee :;;;;`,
      `Libelle;Montant;Observations;;`,
      ...dayExpenses.map(
        (d) =>
          `"${d.description.replace(/"/g, '""')}";${d.amount};"${(
            d.observation || d.paymentMethod
          ).replace(/"/g, '""')}";;`
      ),
      `Total des depenses (C);${totalDepensesC};;;`,
      `;;;;`,
      `Solde en fin de journee (D) : A+B-C;Montant;${endingBalanceD};;`,
      `Situation de la Caisse;;;;`,
      `Versement especes;Montant;${cashDeposit || ""};;`,
      `Versement banque;Montant;${bankDeposit || ""};;`,
      `Solde en caisse;Montant;${finalCashInTill};;`,
      `NB : Le solde en caisse en fin de journee sera au maximum de 100 000 CFA;;;;`,
      `SIGNATURE DE LA GERANTE;${currentMeta?.managerSignatureName || "La Gerante"
      };;;`,
    ];

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `REPORTING_JOURNALIER_RHR_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Nombre de lignes vides pour que le tableau des dépenses ait toujours au moins 6 lignes comme sur la fiche papier
  const emptyExpenseRowsCount = Math.max(0, 6 - dayExpenses.length);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          BARRE DE CONTRÔLE : CHOIX DE LA DATE (DEPUIS JANVIER 2026) & ACTIONS
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-5 shadow-card space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
              <Sparkles className="h-3.5 w-3.5" />
              {isHotelOnly
                ? "Reporting Journalier Hôtel & Salle de Cérémonie — Sans Opérations Bar"
                : "Reporting Journalier Consolidé (Hôtel + Salle + Bar & Resto) — Depuis Janvier 2026"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-rhr-dark mt-0.5">
              {isHotelOnly
                ? "Reporting Journalier Gérant Hôtel (Chambres 1 à 5 & Location Salle)"
                : "Reporting Journalier Global RHR (Administrateur & Comptable)"}
            </h2>
            <p className="text-xs text-gray-500">
              {isHotelOnly ? (
                <>
                  Périmètre <strong>Gérant Hôtel uniquement</strong> (les
                  opérations du Bar/Restaurant sont masquées). Toutes vos saisies
                  alimentent automatiquement le Reporting Global de
                  l&apos;Administrateur et du Comptable.
                </>
              ) : (
                <>
                  Regroupe automatiquement{" "}
                  <strong>
                    toutes les opérations de l&apos;Hôtel, de la Salle de
                    Cérémonie et du Bar/Restaurant
                  </strong>{" "}
                  depuis le <strong>01/01/2026</strong>.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate("2026-04-17")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold border transition",
                selectedDate === "2026-04-17"
                  ? "bg-rhr-gold text-rhr-dark border-rhr-gold shadow"
                  : "bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100"
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Modèle 17/04/2026</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(new Date().toISOString().slice(0, 10))
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-rhr-dark transition"
            >
              Aujourd&apos;hui
            </button>

            <button
              type="button"
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-3.5 py-2 text-xs font-extrabold text-white shadow-rhr transition"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>
                {quickAddOpen
                  ? "Masquer Saisie Rapide"
                  : "+ Enregistrer Opération sur ce Jour"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportDailyReportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-extrabold text-white shadow transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exporter Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2 text-xs font-extrabold text-white shadow transition"
            >
              <Printer className="h-3.5 w-3.5 text-rhr-gold" />
              <span>Imprimer Fiche A4</span>
            </button>
          </div>
        </div>

        {/* Navigation par mois de Janvier 2026 à Décembre 2026 + Sélecteur de date */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase text-gray-500 mr-1">
              Mois 2026 :
            </span>
            {MONTHS_2026_SHORT.map((m) => {
              const active = selectedDate.startsWith(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedDate(m.defaultDate)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-bold border transition",
                    active
                      ? "bg-rhr-burgundy text-white border-rhr-burgundy shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftDay(-1)}
              className="rounded-xl border border-gray-300 bg-white hover:bg-gray-100 p-2 text-rhr-dark"
              title="Jour précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              min="2026-01-01"
              max="2026-12-31"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border-2 border-rhr-burgundy bg-white px-3.5 py-1.5 text-sm font-black text-rhr-dark focus:outline-none"
            />

            <button
              type="button"
              onClick={() => shiftDay(1)}
              className="rounded-xl border border-gray-300 bg-white hover:bg-gray-100 p-2 text-rhr-dark"
              title="Jour suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Formulaire de Saisie Rapide d'une Opération sur la Journée sélectionnée */}
        {quickAddOpen && (
          <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold uppercase text-rhr-burgundy flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                <span>
                  Saisir une recette (Chambre 1-5, Location Salle, Resto, Bar,
                  Autres) ou une dépense pour le {formatDateFr(selectedDate)}
                </span>
              </div>
              {feedbackBanner && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {feedbackBanner}
                </span>
              )}
            </div>

            <form
              onSubmit={handleAddDailyOperation}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
            >
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Rubrique du Reporting Journalier
                </label>
                <select
                  value={opCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value as
                      | DailyReportRowKey
                      | "DEPENSE";
                    setOpCategory(nextCat);
                    const found = REPORT_ROWS_CONFIG.find(
                      (r) => r.key === nextCat
                    );
                    if (found?.defaultPrice) {
                      setOpGrossAmount(found.defaultPrice);
                    } else if (nextCat === "DEPENSE") {
                      setOpGrossAmount(5000);
                    }
                    setOpDiscountAmount(0);
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-extrabold text-rhr-dark"
                >
                  <optgroup label="Recettes de la journée (B)">
                    <option value="CHAMBRE_1">Chambre 1 (15 000 F)</option>
                    <option value="CHAMBRE_2">Chambre 2 (15 000 F)</option>
                    <option value="CHAMBRE_3">Chambre 3 (15 000 F)</option>
                    <option value="CHAMBRE_4">
                      Chambre 4 (10 000 F / 5 000 F)
                    </option>
                    <option value="CHAMBRE_5">
                      Chambre 5 (10 000 F / 5 000 F)
                    </option>
                    <option value="LOCATION_SALLE">
                      Location salle (50 000 F+)
                    </option>
                    {!isHotelOnly && (
                      <>
                        <option value="RESTAURATION">
                          Restauration (Cuisine)
                        </option>
                        <option value="BAR">Bar (Boissons)</option>
                      </>
                    )}
                    <option value="AUTRES">Autres recettes</option>
                  </optgroup>
                  <optgroup label="Dépenses de la journée (C)">
                    <option value="DEPENSE">
                      Dépense / Sortie de la journée
                    </option>
                  </optgroup>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Montant brut (CFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  required
                  value={opGrossAmount}
                  onChange={(e) =>
                    setOpGrossAmount(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-rhr-dark"
                />
              </div>

              {opCategory !== "DEPENSE" && (
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Remise (CFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={opGrossAmount}
                    step={500}
                    value={opDiscountAmount}
                    onChange={(e) =>
                      setOpDiscountAmount(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-rhr-burgundy"
                  />
                </div>
              )}

              <div
                className={
                  opCategory === "DEPENSE" ? "lg:col-span-4" : "lg:col-span-2"
                }
              >
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  {opCategory === "DEPENSE"
                    ? "Libellé & Observation de la dépense *"
                    : "Observation / Client"}
                </label>
                <input
                  type="text"
                  required={opCategory === "DEPENSE"}
                  value={opObservation}
                  onChange={(e) => setOpObservation(e.target.value)}
                  placeholder={
                    opCategory === "DEPENSE"
                      ? "Ex: Achat gaz cuisine / Eau de javel"
                      : "Ex: Client M. Kouassi / Mariage..."
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-rhr-dark"
                />
              </div>

              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Mode
                </label>
                <select
                  value={opPaymentMethod}
                  onChange={(e) =>
                    setOpPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs font-bold text-rhr-dark"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE_MONEY">Orange</option>
                  <option value="MTN_MOMO">MTN</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-2 px-3 text-xs font-extrabold text-white shadow transition"
                >
                  + Ajouter (
                  {formatCFA(
                    Math.max(
                      0,
                      opGrossAmount -
                      (opCategory === "DEPENSE" ? 0 : opDiscountAmount)
                    )
                  )}
                  )
                </button>
              </div>
            </form>

            {/* Liste détaillée des saisies du jour avec suppression réservée uniquement à l'Administrateur */}
            {isAdmin && dayTransactions.length > 0 && (
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-rhr-burgundy">
                    Correction / Suppression des saisies du{" "}
                    {formatDateFr(selectedDate)} (Réservé Administrateur)
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {dayTransactions.length} opération(s) sur cette date
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {dayTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span
                          className={cn(
                            "inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase mr-1.5",
                            tx.type === "ENCAISSEMENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {tx.type === "ENCAISSEMENT" ? "Recette" : "Dépense"}
                        </span>
                        <strong className="text-rhr-dark truncate">
                          {tx.description}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-black text-rhr-dark">
                          {formatCFA(tx.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteHotelTransaction(tx.id);
                            setFeedbackBanner(
                              `Opération supprimée par l'Administrateur (${formatCFA(
                                tx.amount
                              )}).`
                            );
                            setTimeout(() => setFeedbackBanner(null), 4000);
                          }}
                          title="Supprimer cette saisie (Administrateur uniquement)"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 text-[11px] font-extrabold text-red-700 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          DOCUMENT OFFICIEL : REPORTING JOURNALIER (RENDU PAPIER & IMPRESSION)
      ===================================================================== */}
      <div className="rounded-3xl bg-white border-2 border-gray-800 p-6 sm:p-10 shadow-2xl max-w-5xl mx-auto text-gray-900 space-y-6 print:border-0 print:shadow-none print:p-0">
        {/* EN-TÊTE OFFICIEL DU REPORTING JOURNALIER */}
        <div className="border-b-2 border-gray-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-rhr-burgundy">
              RHR — Résidence Hôtel Le Rêve de M&apos;Batto
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase mt-1">
              REPORTING JOURNALIER du{" "}
              <span className="underline decoration-dotted underline-offset-4 px-2 font-mono text-rhr-burgundy">
                {formatDateFr(selectedDate)}
              </span>
            </h1>
          </div>

          {/* SOLDE À L'OUVERTURE (A) */}
          <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-900 rounded-xl px-4 py-2.5">
            <div>
              <span className="text-xs font-black uppercase block">
                Solde à l&apos;ouverture (A)
              </span>
              <span className="text-[10px] text-gray-500 print:hidden">
                Modifiable directement
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-600">Montant :</span>
              <input
                type="number"
                step={500}
                value={computedOpeningBalanceA}
                onChange={(e) =>
                  updateDailyCashSheetMeta({
                    dateIso: selectedDate,
                    openingBalanceOverride: Number(e.target.value),
                  })
                }
                className="w-28 rounded-lg border border-gray-400 bg-white px-2.5 py-1 text-right font-mono text-base font-black text-gray-900 focus:border-rhr-burgundy focus:outline-none print:border-0 print:p-0"
              />
              <span className="text-xs font-black">CFA</span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            TABLEAU 1 : RECETTES DE LA JOURNÉE
        =================================================================== */}
        <div className="space-y-2">
          <h3 className="text-sm font-black uppercase underline tracking-wide">
            Recettes de la journée :
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-900 text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-900 font-black text-gray-900">
                  <th className="border border-gray-800 py-2.5 px-3 text-left w-1/5">
                    Libellé
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-right w-1/6">
                    Montant
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-right w-1/6">
                    Remise
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-right w-1/6">
                    Montant net
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-left">
                    Observation
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueRows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-gray-800 hover:bg-amber-50/30 transition"
                  >
                    <td className="border border-gray-800 py-2 px-3 font-bold text-gray-900">
                      {row.label}
                    </td>
                    <td className="border border-gray-800 py-2 px-3 text-right font-mono font-bold">
                      {row.grossAmount > 0
                        ? row.grossAmount.toLocaleString("fr-FR")
                        : ""}
                    </td>
                    <td className="border border-gray-800 py-2 px-3 text-right font-mono font-bold text-rhr-burgundy">
                      {row.discountAmount > 0
                        ? row.discountAmount.toLocaleString("fr-FR")
                        : ""}
                    </td>
                    <td className="border border-gray-800 py-2 px-3 text-right font-mono font-black text-emerald-800">
                      {row.netAmount > 0
                        ? row.netAmount.toLocaleString("fr-FR")
                        : ""}
                    </td>
                    <td className="border border-gray-800 py-1.5 px-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={row.observation}
                          onChange={(e) =>
                            updateDailyCashSheetMeta({
                              dateIso: selectedDate,
                              rowObservations: {
                                [row.key]: e.target.value,
                              },
                            })
                          }
                          placeholder="—"
                          className="w-full bg-transparent text-xs text-gray-800 focus:outline-none focus:bg-amber-50 px-1 py-0.5 rounded"
                        />
                        {isAdmin &&
                          (row.grossAmount > 0 ||
                            row.netAmount > 0 ||
                            Boolean(row.observation)) && (
                            <button
                              type="button"
                              onClick={() => {
                                clearDailyReportRowForDate(
                                  selectedDate,
                                  row.key
                                );
                                setFeedbackBanner(
                                  `Ligne "${row.label}" du ${formatDateFr(
                                    selectedDate
                                  )} réinitialisée par l'Administrateur.`
                                );
                                setTimeout(() => setFeedbackBanner(null), 4000);
                              }}
                              title="Supprimer / Réinitialiser cette ligne (Administrateur uniquement)"
                              className="shrink-0 rounded-md p-1 text-red-600 hover:bg-red-50 transition print:hidden"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-900 font-black text-gray-900">
                  <td className="border border-gray-800 py-2.5 px-3">
                    Total recettes (B)
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3 text-right font-mono text-sm">
                    {totalRecettesGross.toLocaleString("fr-FR")}
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3 text-right font-mono text-sm text-rhr-burgundy">
                    {totalRecettesDiscount > 0
                      ? totalRecettesDiscount.toLocaleString("fr-FR")
                      : ""}
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3 text-right font-mono text-base text-emerald-800">
                    {totalRecettesNetB.toLocaleString("fr-FR")}
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ===================================================================
            TABLEAU 2 : DÉPENSES DE LA JOURNÉE
        =================================================================== */}
        <div className="space-y-2">
          <h3 className="text-sm font-black uppercase underline tracking-wide">
            Dépenses de la journée :
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-gray-900 text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-900 font-black text-gray-900">
                  <th className="border border-gray-800 py-2.5 px-3 text-left w-1/2">
                    Libellé
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-right w-1/5">
                    Montant
                  </th>
                  <th className="border border-gray-800 py-2.5 px-3 text-left">
                    Observations
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-gray-800">
                    <td className="border border-gray-800 py-2 px-3 font-semibold text-gray-900">
                      <div className="flex items-center justify-between gap-2">
                        <span>{exp.description}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteHotelTransaction(exp.id)}
                            title="Supprimer cette dépense (Administrateur uniquement)"
                            className="text-red-600 hover:bg-red-50 p-1 rounded-md print:hidden"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-800 py-2 px-3 text-right font-mono font-bold text-rhr-burgundy">
                      {exp.amount.toLocaleString("fr-FR")}
                    </td>
                    <td className="border border-gray-800 py-2 px-3 text-xs text-gray-700">
                      {exp.observation || exp.paymentMethod}
                    </td>
                  </tr>
                ))}

                {/* Lignes vides pour conserver exactement la présentation du formulaire papier */}
                {Array.from({ length: emptyExpenseRowsCount }).map((_, idx) => (
                  <tr key={`empty-exp-${idx}`} className="border-b border-gray-800 h-8">
                    <td className="border border-gray-800 py-1.5 px-3">&nbsp;</td>
                    <td className="border border-gray-800 py-1.5 px-3">&nbsp;</td>
                    <td className="border border-gray-800 py-1.5 px-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-900 font-black text-gray-900">
                  <td className="border border-gray-800 py-2.5 px-3">
                    Total des dépenses (C)
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3 text-right font-mono text-base text-rhr-burgundy">
                    {totalDepensesC > 0
                      ? totalDepensesC.toLocaleString("fr-FR")
                      : "0"}
                  </td>
                  <td className="border border-gray-800 py-2.5 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ===================================================================
            SOLDE EN FIN DE JOURNÉE (D) = A + B - C
        =================================================================== */}
        <div className="rounded-2xl bg-gray-100 border-2 border-gray-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm sm:text-base font-black text-gray-900">
            Solde en fin de journée (D) :{" "}
            <span className="font-mono text-rhr-burgundy">A + B - C</span>{" "}
            <span className="text-xs font-bold text-gray-600">
              ({computedOpeningBalanceA.toLocaleString("fr-FR")} +{" "}
              {totalRecettesNetB.toLocaleString("fr-FR")} -{" "}
              {totalDepensesC.toLocaleString("fr-FR")})
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-gray-900 bg-white border-2 border-gray-900 rounded-xl px-4 py-1.5">
            Montant : {endingBalanceD.toLocaleString("fr-FR")} CFA
          </div>
        </div>

        {/* ===================================================================
            SITUATION DE LA CAISSE & PLAFOND MAXIMAL DE 100 000 CFA
        =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 items-start">
          <div className="md:col-span-7 space-y-3 border-2 border-gray-900 rounded-2xl p-4">
            <h4 className="text-sm font-black uppercase underline tracking-wide">
              Situation de la Caisse
            </h4>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-dotted border-gray-400 pb-2">
                <span className="font-bold text-gray-800">
                  Versement espèces
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Montant :</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={cashDeposit || ""}
                    placeholder=".................."
                    onChange={(e) =>
                      updateDailyCashSheetMeta({
                        dateIso: selectedDate,
                        cashDepositAmount: Number(e.target.value),
                      })
                    }
                    className="w-32 rounded-lg border border-gray-300 px-2.5 py-1 text-right font-mono font-bold text-gray-900 print:border-0"
                  />
                  <span className="font-bold">CFA</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-dotted border-gray-400 pb-2">
                <span className="font-bold text-gray-800">
                  Versement banque
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Montant :</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={bankDeposit || ""}
                    placeholder=".................."
                    onChange={(e) =>
                      updateDailyCashSheetMeta({
                        dateIso: selectedDate,
                        bankDepositAmount: Number(e.target.value),
                      })
                    }
                    className="w-32 rounded-lg border border-gray-300 px-2.5 py-1 text-right font-mono font-bold text-gray-900 print:border-0"
                  />
                  <span className="font-bold">CFA</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="font-black text-base text-gray-900">
                  Solde en caisse
                </span>
                <div
                  className={cn(
                    "font-mono text-base sm:text-lg font-black px-3 py-1 rounded-xl border-2",
                    isCashOverMaxLimit
                      ? "bg-amber-100 border-rhr-burgundy text-rhr-burgundy"
                      : "bg-emerald-50 border-emerald-700 text-emerald-900"
                  )}
                >
                  Montant : {finalCashInTill.toLocaleString("fr-FR")} CFA
                </div>
              </div>
            </div>

            {/* Mention obligatoire NB : Plafond 100 000 CFA */}
            <div
              className={cn(
                "rounded-xl p-3 text-xs font-extrabold flex items-start gap-2 border",
                isCashOverMaxLimit
                  ? "bg-red-50 border-red-300 text-red-900"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4 shrink-0 mt-0.5",
                  isCashOverMaxLimit ? "text-red-600" : "text-amber-600"
                )}
              />
              <div>
                <span className="underline">NB :</span> Le solde en caisse en
                fin de journée sera au maximum de{" "}
                <strong>100 000 CFA</strong>.
                {isCashOverMaxLimit && (
                  <span className="block text-[11px] text-red-700 mt-0.5 print:hidden">
                    ⚠️ Le solde actuel ({formatCFA(finalCashInTill)}) dépasse le
                    plafond de 100 000 CFA de{" "}
                    <strong>{formatCFA(finalCashInTill - 100000)}</strong>.
                    Veuillez saisir un versement espèces ou banque.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ZONE SIGNATURE DE LA GÉRANTE */}
          <div className="md:col-span-5 border-2 border-gray-900 rounded-2xl p-4 flex flex-col justify-between min-h-[185px]">
            <div className="flex items-center justify-between border-b border-gray-300 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900">
                SIGNATURE DE LA GÉRANTE
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                {formatDateFr(selectedDate)}
              </span>
            </div>

            <div className="my-auto py-4 text-center">
              <input
                type="text"
                value={currentMeta?.managerSignatureName ?? "La Gérante RHR"}
                onChange={(e) =>
                  updateDailyCashSheetMeta({
                    dateIso: selectedDate,
                    managerSignatureName: e.target.value,
                  })
                }
                placeholder="Nom & Visa de la Gérante"
                className="w-full text-center font-serif italic text-base font-bold text-rhr-burgundy bg-transparent border-b border-dashed border-gray-400 pb-1 focus:outline-none print:border-0"
              />
            </div>

            <div className="text-[10px] text-gray-500 text-center">
              Certifié sincère et conforme à la caisse journalière RHR M&apos;Batto
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

