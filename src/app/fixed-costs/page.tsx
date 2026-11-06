"use client";

import React, { useState } from "react";
import {
  Building,
  PlusCircle,
  Zap,
  Droplets,
  Users,
  Landmark,
  Camera,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  useRhrStore,
  FixedCost,
  PaymentMethod,
} from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<FixedCost["category"], string> = {
  CIE_ELECTRICITE: "Facture CIE (Électricité)",
  SODECI_EAU: "Facture SODECI (Eau)",
  SALAIRE: "Salaires du Personnel",
  AVANCE_SALAIRE: "Avances sur Salaires",
  IMPOTS_TAXES: "Impôts & Taxes Communales",
  CANAL_INTERNET: "Abonnement Canal+ / Internet",
  AUTRE_CHARGE: "Équipements & Autres Charges Fixes",
};

export default function FixedCostsPage() {
  const { fixedCosts, addFixedCost } = useRhrStore();

  const [category, setCategory] =
    useState<FixedCost["category"]>("CIE_ELECTRICITE");
  const [label, setLabel] = useState("");
  const [beneficiary, setBeneficiary] = useState("CIE Côte d'Ivoire");
  const [periodMonth, setPeriodMonth] = useState("2026-11");
  const [amount, setAmount] = useState<number>(35000);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("ORANGE_MONEY");
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    undefined
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || amount <= 0) return;

    const created = addFixedCost({
      category,
      label,
      beneficiary,
      periodMonth,
      amount,
      paymentMethod,
      receiptPhotoUrl: photoPreview,
    });

    setLabel("");
    setPhotoPreview(undefined);
    setSuccessMsg(
      `Charge fixe "${created.label}" (${formatCFA(
        created.amount
      )}) enregistrée et déduite du Bénéfice Net Réel.`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const totalFixedCosts = fixedCosts.reduce((s, f) => s + f.amount, 0);
  const totalUtilities = fixedCosts
    .filter(
      (f) => f.category === "CIE_ELECTRICITE" || f.category === "SODECI_EAU"
    )
    .reduce((s, f) => s + f.amount, 0);
  const totalPayroll = fixedCosts
    .filter(
      (f) => f.category === "SALAIRE" || f.category === "AVANCE_SALAIRE"
    )
    .reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* En-tête Charges Fixes & Salaires */}
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <Building className="h-4 w-4" />
            Accès Exclusif Propriétaire &amp; Comptable
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Module Charges Fixes, Factures CIE/SODECI &amp; Salaires
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
            Toutes les charges saisies ici viennent automatiquement en déduction
            du Chiffre d&apos;Affaires pour calculer le{" "}
            <strong className="text-rhr-gold">Bénéfice Net Réel</strong>.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 text-xs flex items-center gap-2 shrink-0">
          <ShieldCheck className="h-4 w-4 text-rhr-gold" />
          <span>Total Charges de Structure : {formatCFA(totalFixedCosts)}</span>
        </div>
      </div>

      {/* 3 Cartes Synthèse Charges Fixes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-gray-500">
              Factures CIE &amp; SODECI
            </span>
            <div className="text-2xl font-black text-rhr-dark mt-1">
              {formatCFA(totalUtilities)}
            </div>
            <span className="text-xs text-gray-500">
              Électricité &amp; Eau courante
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-gray-500">
              Masse Salariale &amp; Avances
            </span>
            <div className="text-2xl font-black text-rhr-burgundy mt-1">
              {formatCFA(totalPayroll)}
            </div>
            <span className="text-xs text-gray-500">
              Salaires Hôtel, Bar &amp; Cuisine
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rhr-burgundy/10 text-rhr-burgundy flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-gray-500">
              Total Charges Fixes
            </span>
            <div className="text-2xl font-black text-rhr-dark mt-1">
              {formatCFA(totalFixedCosts)}
            </div>
            <span className="text-xs text-gray-500">
              {fixedCosts.length} écritures comptabilisées
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Landmark className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulaire de saisie mensuelle des charges de structure */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
          <h2 className="text-base font-black text-rhr-dark flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-rhr-burgundy" />
            <span>Enregistrer une Charge Fixe / Salaire</span>
          </h2>

          {successMsg && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nature de la Charge Fixe
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const nextCat = e.target.value as FixedCost["category"];
                  setCategory(nextCat);
                  if (nextCat === "CIE_ELECTRICITE")
                    setBeneficiary("CIE Côte d'Ivoire");
                  if (nextCat === "SODECI_EAU") setBeneficiary("SODECI");
                  if (nextCat === "SALAIRE" || nextCat === "AVANCE_SALAIRE")
                    setBeneficiary("Employé RHR");
                  if (nextCat === "IMPOTS_TAXES")
                    setBeneficiary("Mairie / DGI M'Batto");
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-rhr-dark"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, txt]) => (
                  <option key={key} value={key}>
                    {txt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Libellé précis *
              </label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Avance sur salaire Serveuse Awa, Facture CIE..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bénéficiaire / Organisme
                </label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-rhr-dark"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mois comptable
                </label>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-base font-black text-rhr-burgundy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mode de règlement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
                >
                  <option value="ESPECES">Espèces Physique</option>
                  <option value="WAVE">Wave Mobile Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="MTN_MOMO">MTN MoMo</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-rhr-surface p-3 space-y-1.5">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-rhr-burgundy" />
                Photo Facture CIE/SODECI ou Reçu de Salaire (Facultatif)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rhr-dark file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-rhr transition"
            >
              Comptabiliser la Charge Fixe ({formatCFA(amount)})
            </button>
          </form>
        </div>

        {/* Registre des Charges Fixes */}
        <div className="lg:col-span-7 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
          <h2 className="text-base font-black text-rhr-dark">
            Registre des Charges Fixes &amp; Salaires ({fixedCosts.length})
          </h2>

          <div className="space-y-3">
            {fixedCosts.map((fc) => (
              <div
                key={fc.id}
                className="rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px] font-black uppercase",
                        fc.category === "CIE_ELECTRICITE" ||
                          fc.category === "SODECI_EAU"
                          ? "bg-amber-100 text-amber-900"
                          : fc.category === "SALAIRE" ||
                            fc.category === "AVANCE_SALAIRE"
                          ? "bg-rhr-burgundy/10 text-rhr-burgundy"
                          : "bg-blue-100 text-blue-800"
                      )}
                    >
                      {CATEGORY_LABELS[fc.category]}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-500">
                      Période {fc.periodMonth}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-rhr-dark">
                    {fc.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    Bénéficiaire : {fc.beneficiary || "RHR"} • Payé via{" "}
                    <strong>{fc.paymentMethod}</strong> •{" "}
                    {formatDateTime(fc.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {fc.receiptPhotoUrl && (
                    <img
                      src={fc.receiptPhotoUrl}
                      alt="Facture"
                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div className="text-right">
                    <div className="text-base font-black text-rhr-dark">
                      {formatCFA(fc.amount)}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Comptabilisé
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
