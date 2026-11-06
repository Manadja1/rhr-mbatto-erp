"use client";

import React, { useState } from "react";
import {
  Receipt,
  PlusCircle,
  Camera,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useRhrStore, PaymentMethod } from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";

export default function ExpensesPage() {
  const { currentUser, transactions, addHotelExpense } = useRhrStore();

  const role = currentUser?.role || "GERANT_HOTEL";

  // Filtrage strict RBAC selon SPEC.md :
  // - GERANT_HOTEL ne voit que les dépenses Hôtel / Maintenance
  // - CAISSIERE_BAR_RESTO ne voit que les dépenses Cuisine / Marché / Bar
  // - PROPRIETAIRE & COMPTABLE voient tout
  const allExpenses = transactions.filter((t) => t.type === "DEPENSE");
  const filteredExpenses = allExpenses.filter((exp) => {
    if (role === "GERANT_HOTEL") {
      return exp.pole === "HOTEL" || exp.pole === "MAINTENANCE";
    }
    if (role === "CAISSIERE_BAR_RESTO") {
      return exp.pole === "MARCHE_CUISINE" || exp.pole === "BAR_RESTO";
    }
    return true;
  });

  const defaultPole =
    role === "CAISSIERE_BAR_RESTO" ? "MARCHE_CUISINE" : "MAINTENANCE";
  const [pole, setPole] = useState<
    "MAINTENANCE" | "HOTEL" | "MARCHE_CUISINE" | "BAR_RESTO"
  >(defaultPole);
  const [categoryLabel, setCategoryLabel] = useState(
    role === "CAISSIERE_BAR_RESTO"
      ? "Achats du Marché (Attiéké, Alloco, Condiments)"
      : "Eau de Javel, Ampoules & Entretien Chambres"
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(2500);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [fundSource, setFundSource] = useState<
    "CAISSE_DU_JOUR" | "FONDS_SEPARE"
  >("CAISSE_DU_JOUR");
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(
    undefined
  );
  const [feedback, setFeedback] = useState<string | null>(null);

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
    if (!description.trim() || amount <= 0) return;

    const tx = addHotelExpense({
      pole:
        role === "GERANT_HOTEL"
          ? "MAINTENANCE"
          : role === "CAISSIERE_BAR_RESTO"
          ? "MARCHE_CUISINE"
          : pole,
      categoryLabel,
      description,
      amount,
      paymentMethod,
      fundSource,
      receiptPhotoUrl: photoPreview,
    });

    setDescription("");
    setPhotoPreview(undefined);
    setFeedback(
      `Sortie ${tx.reference} de ${formatCFA(tx.amount)} enregistrée avec succès.`
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <Receipt className="h-3.5 w-3.5" />
            Sorties Opérationnelles &amp; Menues Dépenses
          </span>
          <h1 className="text-2xl font-black mt-1">
            {role === "GERANT_HOTEL"
              ? "Dépenses d'Entretien du Pôle Hôtel"
              : role === "CAISSIERE_BAR_RESTO"
              ? "Achats du Marché & Dépenses Cuisine/Bar"
              : "Journal Global des Sorties & Dépenses RHR"}
          </h1>
          <p className="text-xs text-gray-300 mt-0.5">
            Choix obligatoire : Caisse du jour (déduit les espèces attendues le
            soir) vs Fonds de caisse séparé.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-xs flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-rhr-gold" />
          <span>Vue filtrée RBAC : {role}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulaire d'ajout de dépense */}
        <div className="lg:col-span-5 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
          <h2 className="text-base font-black text-rhr-dark flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-rhr-burgundy" />
            <span>Saisir une Nouvelle Sortie</span>
          </h2>

          {feedback && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(role === "PROPRIETAIRE" || role === "COMPTABLE") && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Pôle imputé
                </label>
                <select
                  value={pole}
                  onChange={(e) =>
                    setPole(
                      e.target.value as
                        | "MAINTENANCE"
                        | "HOTEL"
                        | "MARCHE_CUISINE"
                        | "BAR_RESTO"
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-rhr-dark"
                >
                  <option value="MAINTENANCE">Entretien Hôtel</option>
                  <option value="MARCHE_CUISINE">
                    Achats Marché / Cuisine
                  </option>
                  <option value="BAR_RESTO">Dépenses Bar &amp; Resto</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                required
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-rhr-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Description précise *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Eau de javel, ampoules LED, réparation serrure Ch.3..."
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-black text-rhr-burgundy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Moyen de paiement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="MTN_MOMO">MTN MoMo</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Source des fonds (Obligatoire) :
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setFundSource("CAISSE_DU_JOUR")}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left text-xs transition",
                    fundSource === "CAISSE_DU_JOUR"
                      ? "border-rhr-burgundy bg-rhr-burgundy/5 font-bold"
                      : "border-gray-200"
                  )}
                >
                  Pris dans la caisse du jour (Déduit de la clôture du soir)
                </button>
                <button
                  type="button"
                  onClick={() => setFundSource("FONDS_SEPARE")}
                  className={cn(
                    "rounded-xl border-2 p-2.5 text-left text-xs transition",
                    fundSource === "FONDS_SEPARE"
                      ? "border-rhr-burgundy bg-rhr-burgundy/5 font-bold"
                      : "border-gray-200"
                  )}
                >
                  Pris dans le fonds de caisse séparé (Menues dépenses)
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-gray-300 bg-rhr-surface p-3 space-y-1.5">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-rhr-burgundy" />
                Photo du reçu / facture (Facultatif)
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rhr-dark file:px-2.5 file:py-1 file:text-xs file:font-bold file:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-2.5 text-xs font-extrabold uppercase text-white shadow-rhr transition"
            >
              Enregistrer la Sortie ({formatCFA(amount)})
            </button>
          </form>
        </div>

        {/* Liste des dépenses filtrées selon le rôle */}
        <div className="lg:col-span-7 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-black text-rhr-dark">
              Historique des Sorties ({filteredExpenses.length})
            </h2>
            <span className="text-xs font-black text-rhr-burgundy">
              Total affiché :{" "}
              {formatCFA(
                filteredExpenses.reduce((acc, item) => acc + item.amount, 0)
              )}
            </span>
          </div>

          <div className="space-y-3">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 p-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-rhr-burgundy/10 px-2 py-0.5 text-[10px] font-bold text-rhr-burgundy">
                      {exp.pole}
                    </span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      Source : {exp.expenseFundSource?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-rhr-dark">
                    {exp.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    Saisi par : {exp.createdByName} •{" "}
                    {formatDateTime(exp.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {exp.receiptPhotoUrl && (
                    <img
                      src={exp.receiptPhotoUrl}
                      alt="Reçu"
                      className="h-11 w-11 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div className="text-lg font-black text-rhr-burgundy">
                    - {formatCFA(exp.amount)}
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
