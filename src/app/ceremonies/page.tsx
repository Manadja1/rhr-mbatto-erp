"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Users,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  FileText,
  Printer,
  MessageCircle,
  CreditCard,
  Lock,
  UtensilsCrossed,
  Wine,
  X,
  Building2,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import {
  useRhrStore,
  CeremonyBooking,
  CeremonyCustomLine,
  PaymentMethod,
} from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";

export default function CeremoniesPage() {
  const {
    currentUser,
    ceremonies,
    createCeremonyBooking,
    addCeremonyDeposit,
  } = useRhrStore();

  const [activeTab, setActiveTab] = useState<"CONFIGURATEUR" | "CALENDRIER">(
    "CALENDRIER"
  );

  // État du Configurateur de Devis Sur-Mesure
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+225 07 ");
  const [eventType, setEventType] =
    useState<CeremonyBooking["eventType"]>("MARIAGE");
  const [eventDate, setEventDate] = useState<string>("2026-12-12");

  // Couverts supplémentaires (au-delà des 50 couverts inclus dans les 50 000 F)
  const [extraOrdinaryCovers, setExtraOrdinaryCovers] = useState<number>(30);
  const [extraVipCovers, setExtraVipCovers] = useState<number>(20);

  // Lignes personnalisées Restauration / Buffet
  const [cateringLines, setCateringLines] = useState<CeremonyCustomLine[]>([
    {
      id: "cat-init-1",
      label: "Buffet 100 personnes — Kedjenou, Poulets & Carpes Braisés + Attiéké/Riz",
      quantity: 1,
      unitPrice: 150000,
      subtotal: 150000,
    },
  ]);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatQty, setNewCatQty] = useState<number>(1);
  const [newCatPrice, setNewCatPrice] = useState<number>(50000);

  // Lignes personnalisées Boissons
  const [beverageLines, setBeverageLines] = useState<CeremonyCustomLine[]>([
    {
      id: "bev-init-1",
      label: "Forfait 15 casiers boissons assorties (Solibra, Beaufort & Sucreries)",
      quantity: 15,
      unitPrice: 10000,
      subtotal: 150000,
    },
  ]);
  const [newBevLabel, setNewBevLabel] = useState("");
  const [newBevQty, setNewBevQty] = useState<number>(10);
  const [newBevPrice, setNewBevPrice] = useState<number>(10000);

  // Premier acompte à la signature du devis
  const [initialDepositAmount, setInitialDepositAmount] =
    useState<number>(100000);
  const [initialDepositMethod, setInitialDepositMethod] =
    useState<PaymentMethod>("WAVE");
  const [notes, setNotes] = useState("");

  // Modal d'ajout d'acompte successif sur un dossier existant
  const [depositModalBooking, setDepositModalBooking] =
    useState<CeremonyBooking | null>(null);
  const [nextDepositAmount, setNextDepositAmount] = useState<number>(50000);
  const [nextDepositMethod, setNextDepositMethod] =
    useState<PaymentMethod>("WAVE");
  const [nextDepositNote, setNextDepositNote] = useState("");

  // Modal Devis / Facture Officielle Format A4 Imprimable & WhatsApp
  const [a4InvoiceBooking, setA4InvoiceBooking] =
    useState<CeremonyBooking | null>(null);

  // Calculs temps réel du Configurateur (Lois absolues SPEC.md)
  const BASE_RENTAL_FEE = 50000; // Obligatoire, inclut 50 couverts
  const totalGuestsCovers = 50 + extraOrdinaryCovers + extraVipCovers;
  const ordinarySupplementCost = extraOrdinaryCovers * 1000;
  const vipSupplementCost = extraVipCovers * 1500;
  const cateringSubtotal = cateringLines.reduce((s, l) => s + l.subtotal, 0);
  const beverageSubtotal = beverageLines.reduce((s, l) => s + l.subtotal, 0);

  const liveQuoteTotal =
    BASE_RENTAL_FEE +
    ordinarySupplementCost +
    vipSupplementCost +
    cateringSubtotal +
    beverageSubtotal;

  const liveQuoteRemaining = Math.max(
    0,
    liveQuoteTotal - (initialDepositAmount || 0)
  );

  // Ajout ligne Restauration
  const handleAddCateringLine = () => {
    if (!newCatLabel.trim() || newCatQty <= 0 || newCatPrice <= 0) return;
    setCateringLines((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        label: newCatLabel.trim(),
        quantity: newCatQty,
        unitPrice: newCatPrice,
        subtotal: newCatQty * newCatPrice,
      },
    ]);
    setNewCatLabel("");
    setNewCatQty(1);
  };

  // Ajout ligne Boissons
  const handleAddBeverageLine = () => {
    if (!newBevLabel.trim() || newBevQty <= 0 || newBevPrice <= 0) return;
    setBeverageLines((prev) => [
      ...prev,
      {
        id: `bev-${Date.now()}`,
        label: newBevLabel.trim(),
        quantity: newBevQty,
        unitPrice: newBevPrice,
        subtotal: newBevQty * newBevPrice,
      },
    ]);
    setNewBevLabel("");
    setNewBevQty(5);
  };

  // Validation et création du Devis / Cérémonie
  const handleCreateCeremonySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const created = createCeremonyBooking({
      clientName,
      clientPhone,
      eventType,
      eventDate,
      extraOrdinaryCovers,
      extraVipCovers,
      customCateringLines: cateringLines,
      customBeverageLines: beverageLines,
      initialDepositAmount,
      initialDepositMethod,
      notes,
    });

    setClientName("");
    setActiveTab("CALENDRIER");
    setA4InvoiceBooking(created);
  };

  // Enregistrement d'un acompte supplémentaire
  const handleAddDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalBooking || nextDepositAmount <= 0) return;
    const updated = addCeremonyDeposit({
      ceremonyId: depositModalBooking.id,
      amount: nextDepositAmount,
      method: nextDepositMethod,
      note: nextDepositNote,
    });
    setDepositModalBooking(null);
    setNextDepositNote("");
    if (updated) {
      setA4InvoiceBooking(updated);
    }
  };

  // Construction du message WhatsApp officiel pour le Devis / Facture A4
  const buildCeremonyWhatsAppUrl = (b: CeremonyBooking) => {
    const cleanPhone = b.clientPhone.replace(/[^0-9]/g, "");
    const waPhone = cleanPhone.startsWith("225")
      ? cleanPhone
      : cleanPhone.length === 10
      ? `225${cleanPhone}`
      : cleanPhone;

    const remaining = Math.max(0, b.totalAmount - b.totalPaid);

    const text = [
      `🏛️ *RHR — RÉSIDENCE HÔTEL LE RÊVE DE M'BATTO*`,
      `📋 *DEVIS & FACTURE PROFORMA SALLE DE CÉRÉMONIE*`,
      `Réf : *${b.reference}* • Événement : *${b.eventType}*`,
      `Date prévue : *${b.eventDate}*`,
      `Client : *${b.clientName}*`,
      `Capacité totale : *${b.guestsCount} couverts*`,
      `--------------------------------`,
      `*1. LOCATION SALLE & COUVERTS :*`,
      `• Forfait Location de base (50 couverts inclus) : *50 000 F*`,
      b.extraOrdinaryCovers > 0
        ? `• +${b.extraOrdinaryCovers} Couverts Ordinaires (1 000 F/u) : *${formatCFA(
            b.extraOrdinaryCovers * 1000
          )}*`
        : null,
      b.extraVipCovers > 0
        ? `• +${b.extraVipCovers} Couverts VIP (1 500 F/u) : *${formatCFA(
            b.extraVipCovers * 1500
          )}*`
        : null,
      ...b.customCateringLines.map(
        (l) => `🍽️ ${l.label} (x${l.quantity}) : *${formatCFA(l.subtotal)}*`
      ),
      ...b.customBeverageLines.map(
        (l) => `🍾 ${l.label} (x${l.quantity}) : *${formatCFA(l.subtotal)}*`
      ),
      `--------------------------------`,
      `💰 *TOTAL DEVIS : ${formatCFA(b.totalAmount)}*`,
      `✅ *TOTAL ACOMPTES VERSÉS : ${formatCFA(b.totalPaid)}*`,
      remaining > 0
        ? `⚠️ *RESTE À PAYER : ${formatCFA(remaining)}*`
        : `🎉 *STATUT : ENTIÈREMENT SOLDÉ (0 F)*`,
      `--------------------------------`,
      `_Résidence Hôtel Le Rêve de M'Batto — Direction Générale_`,
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* En-tête Pôle Salle de Cérémonie */}
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <Sparkles className="h-4 w-4" />
            Pôle Salle de Cérémonie RHR — Mariage, Dot, Baptême &amp; Séminaire
          </span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Moteur de Devis Sur-Mesure &amp; Suivi des Acomptes Multiples
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
            Forfait Location de base verrouillé à{" "}
            <strong className="text-white">50 000 F</strong> (50 couverts
            inclus) • Couvert Ordinaire suppl. :{" "}
            <strong className="text-rhr-gold">+1 000 F</strong> • Couvert VIP
            suppl. : <strong className="text-rhr-gold">+1 500 F</strong>
          </p>
        </div>

        <div className="inline-flex rounded-2xl bg-white/10 border border-white/15 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("CALENDRIER")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "CALENDRIER"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-gray-200 hover:text-white"
            )}
          >
            Calendrier &amp; Dossiers ({ceremonies.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CONFIGURATEUR")}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "CONFIGURATEUR"
                ? "bg-rhr-gold text-rhr-dark shadow"
                : "text-gray-200 hover:text-white"
            )}
          >
            + Nouveau Devis Sur-Mesure
          </button>
        </div>
      </div>

      {/* =====================================================================
          ONGLET 1 : CONFIGURATEUR D'ÉVÉNEMENT & DEVIS DYNAMIQUE
      ===================================================================== */}
      {activeTab === "CONFIGURATEUR" && (
        <form
          onSubmit={handleCreateCeremonySubmit}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Colonne Gauche (8 cols) : Paramètres Cérémonie, Couverts & Lignes sur mesure */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Informations Client & Type d'événement */}
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
              <h2 className="text-base font-black text-rhr-dark flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rhr-burgundy" />
                <span>1. Identité des Organisateurs &amp; Date de Cérémonie</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nom de la Famille / Entreprise / Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Mariage Famille Kouadio & Yao"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Téléphone WhatsApp (Envoi Devis A4) *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nature de l&apos;Événement
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) =>
                      setEventType(
                        e.target.value as CeremonyBooking["eventType"]
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-rhr-burgundy"
                  >
                    <option value="MARIAGE">Mariage Prestige</option>
                    <option value="DOT">Cérémonie de Dot Traditionnelle</option>
                    <option value="BAPTEME">Baptême / Communion</option>
                    <option value="ANNIVERSAIRE">Gala &amp; Anniversaire</option>
                    <option value="CONFERENCE">Séminaire / Conférence</option>
                    <option value="AUTRE">Autre Réception</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Date de l&apos;Événement *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-bold text-rhr-dark"
                  />
                </div>
              </div>
            </div>

            {/* 2. Forfait Location de base (50 000 F verrouillé) + Compteurs Couverts Ordinaires & VIP */}
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-rhr-dark flex items-center gap-2">
                    <Users className="h-5 w-5 text-rhr-burgundy" />
                    <span>
                      2. Location Salle &amp; Calcul Dynamique des Couverts
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Total convives en direct :{" "}
                    <strong className="text-rhr-burgundy">
                      50 (Base) + {extraOrdinaryCovers} (Ordinaires) +{" "}
                      {extraVipCovers} (VIP) = {totalGuestsCovers} couverts
                    </strong>
                  </p>
                </div>

                <span className="rounded-xl bg-rhr-gold/20 border border-rhr-gold px-3.5 py-1.5 text-xs font-black text-rhr-dark">
                  Total : {totalGuestsCovers} Couverts
                </span>
              </div>

              {/* Ligne verrouillée : Forfait Location de Base 50 000 F */}
              <div className="rounded-2xl bg-rhr-dark text-white p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rhr-burgundy flex items-center justify-center text-rhr-gold shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black">
                      Forfait Location Salle de Base (Obligatoire &amp; Verrouillé)
                    </div>
                    <div className="text-xs text-gray-300">
                      Inclut automatiquement les{" "}
                      <strong className="text-rhr-gold">
                        50 premiers couverts
                      </strong>
                    </div>
                  </div>
                </div>
                <span className="text-lg font-black text-rhr-gold shrink-0">
                  50 000 F
                </span>
              </div>

              {/* Compteurs Couverts Supplémentaires Ordinaires (+1 000 F) & VIP (+1 500 F) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Couverts Ordinaires */}
                <div className="rounded-2xl border-2 border-gray-200 bg-rhr-surface p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold uppercase text-rhr-dark">
                        Couverts Ordinaires Suppl.
                      </div>
                      <div className="text-xs font-bold text-rhr-burgundy">
                        + 1 000 F / couvert au-delà de 50
                      </div>
                    </div>
                    <span className="text-sm font-black text-rhr-dark">
                      {formatCFA(ordinarySupplementCost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExtraOrdinaryCovers((v) => Math.max(0, v - 5))
                      }
                      className="h-10 w-10 rounded-xl border border-gray-300 bg-white flex items-center justify-center font-black hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={extraOrdinaryCovers}
                      onChange={(e) =>
                        setExtraOrdinaryCovers(
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="w-24 text-center rounded-xl border border-gray-300 bg-white py-2 text-base font-black text-rhr-dark"
                    />
                    <button
                      type="button"
                      onClick={() => setExtraOrdinaryCovers((v) => v + 5)}
                      className="h-10 w-10 rounded-xl bg-rhr-dark text-white flex items-center justify-center font-black hover:bg-rhr-burgundy"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Couverts VIP */}
                <div className="rounded-2xl border-2 border-rhr-gold/60 bg-rhr-gold/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold uppercase text-rhr-dark">
                        Couverts VIP Supplémentaires
                      </div>
                      <div className="text-xs font-bold text-rhr-burgundy">
                        + 1 500 F / couvert VIP
                      </div>
                    </div>
                    <span className="text-sm font-black text-rhr-burgundy">
                      {formatCFA(vipSupplementCost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExtraVipCovers((v) => Math.max(0, v - 5))
                      }
                      className="h-10 w-10 rounded-xl border border-gray-300 bg-white flex items-center justify-center font-black hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={extraVipCovers}
                      onChange={(e) =>
                        setExtraVipCovers(Math.max(0, Number(e.target.value)))
                      }
                      className="w-24 text-center rounded-xl border border-gray-300 bg-white py-2 text-base font-black text-rhr-dark"
                    />
                    <button
                      type="button"
                      onClick={() => setExtraVipCovers((v) => v + 5)}
                      className="h-10 w-10 rounded-xl bg-rhr-burgundy text-white flex items-center justify-center font-black hover:bg-rhr-burgundy-light"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Éditeur de Lignes Personnalisées : Restauration/Buffet & Boissons */}
            <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-6">
              {/* Sous-section A : Restauration / Buffet */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-rhr-dark flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4 text-rhr-burgundy" />
                    <span>
                      3A. Prestations Restauration &amp; Buffet sur Mesure
                    </span>
                  </h3>
                  <span className="text-xs font-black text-rhr-burgundy">
                    Sous-total : {formatCFA(cateringSubtotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  {cateringLines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-rhr-surface px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-bold text-rhr-dark">
                        {line.label} (x{line.quantity} à{" "}
                        {formatCFA(line.unitPrice)})
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-rhr-burgundy">
                          {formatCFA(line.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCateringLines((prev) =>
                              prev.filter((l) => l.id !== line.id)
                            )
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="Ex: Buffet 100 personnes - Kedjenou & Grillades"
                    className="sm:col-span-6 rounded-xl border border-gray-300 px-3 py-2 text-xs text-rhr-dark"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newCatQty}
                    onChange={(e) => setNewCatQty(Number(e.target.value))}
                    placeholder="Qté"
                    className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  />
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={newCatPrice}
                    onChange={(e) => setNewCatPrice(Number(e.target.value))}
                    placeholder="Prix U."
                    className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  />
                  <button
                    type="button"
                    onClick={handleAddCateringLine}
                    className="sm:col-span-2 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy py-2 px-3 text-xs font-extrabold text-white transition"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>

              {/* Sous-section B : Forfait Boissons */}
              <div className="space-y-3 border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-rhr-dark flex items-center gap-2">
                    <Wine className="h-4 w-4 text-rhr-burgundy" />
                    <span>3B. Forfait Boissons &amp; Casiers Négociés</span>
                  </h3>
                  <span className="text-xs font-black text-rhr-burgundy">
                    Sous-total : {formatCFA(beverageSubtotal)}
                  </span>
                </div>

                <div className="space-y-2">
                  {beverageLines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-rhr-surface px-3.5 py-2.5 text-xs"
                    >
                      <span className="font-bold text-rhr-dark">
                        {line.label} (x{line.quantity} à{" "}
                        {formatCFA(line.unitPrice)})
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-rhr-burgundy">
                          {formatCFA(line.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setBeverageLines((prev) =>
                              prev.filter((l) => l.id !== line.id)
                            )
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  <input
                    type="text"
                    value={newBevLabel}
                    onChange={(e) => setNewBevLabel(e.target.value)}
                    placeholder="Ex: Forfait 15 casiers boissons assorties"
                    className="sm:col-span-6 rounded-xl border border-gray-300 px-3 py-2 text-xs text-rhr-dark"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newBevQty}
                    onChange={(e) => setNewBevQty(Number(e.target.value))}
                    placeholder="Qté"
                    className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  />
                  <input
                    type="number"
                    min={500}
                    step={500}
                    value={newBevPrice}
                    onChange={(e) => setNewBevPrice(Number(e.target.value))}
                    placeholder="Prix U."
                    className="sm:col-span-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  />
                  <button
                    type="button"
                    onClick={handleAddBeverageLine}
                    className="sm:col-span-2 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy py-2 px-3 text-xs font-extrabold text-white transition"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne Droite (4 cols) : Synthèse Financière Temps Réel & Validation Devis A4 */}
          <div className="lg:col-span-4 rounded-3xl bg-rhr-dark text-white p-6 shadow-2xl border-2 border-rhr-gold/40 space-y-5 lg:sticky lg:top-20">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                Synthèse Financière du Devis
              </span>
              <h3 className="text-xl font-black mt-0.5">
                Récapitulatif Cérémonie ({totalGuestsCovers} Couverts)
              </h3>
            </div>

            <div className="space-y-2.5 text-xs border-y border-white/15 py-4">
              <div className="flex justify-between">
                <span className="text-gray-300">
                  Forfait Salle Base (50 couverts)
                </span>
                <strong className="text-white">50 000 F</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">
                  +{extraOrdinaryCovers} Couverts Ordinaires (1 000 F)
                </span>
                <strong className="text-white">
                  {formatCFA(ordinarySupplementCost)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">
                  +{extraVipCovers} Couverts VIP (1 500 F)
                </span>
                <strong className="text-rhr-gold">
                  {formatCFA(vipSupplementCost)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">
                  Prestations Restauration / Buffet
                </span>
                <strong className="text-white">
                  {formatCFA(cateringSubtotal)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Forfait Boissons</span>
                <strong className="text-white">
                  {formatCFA(beverageSubtotal)}
                </strong>
              </div>
              <div className="border-t border-white/15 pt-2.5 flex justify-between text-base font-black">
                <span className="text-rhr-gold">TOTAL DEVIS</span>
                <span>{formatCFA(liveQuoteTotal)}</span>
              </div>
            </div>

            {/* 1er Acompte de Réservation */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  1er Acompte versé à la réservation (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  max={liveQuoteTotal}
                  step={5000}
                  value={initialDepositAmount}
                  onChange={(e) =>
                    setInitialDepositAmount(Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2.5 text-base font-black text-emerald-400 focus:border-rhr-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Mode de règlement de l&apos;acompte
                </label>
                <select
                  value={initialDepositMethod}
                  onChange={(e) =>
                    setInitialDepositMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-white/20 bg-black/40 px-3.5 py-2 text-xs font-bold text-white"
                >
                  <option value="WAVE">Wave Mobile Money</option>
                  <option value="ESPECES">Espèces Physique</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="MTN_MOMO">MTN MoMo</option>
                </select>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between text-xs">
                <span className="text-gray-300">Reste à payer :</span>
                <span className="text-base font-black text-red-400">
                  {formatCFA(liveQuoteRemaining)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-rhr transition"
            >
              Enregistrer &amp; Générer le Devis A4 Officiel
            </button>
          </div>
        </form>
      )}

      {/* =====================================================================
          ONGLET 2 : CALENDRIER DES CÉRÉMONIES, SUIVI DES ACOMPTES & DEVIS A4
      ===================================================================== */}
      {activeTab === "CALENDRIER" && (
        <div className="space-y-5">
          {ceremonies.map((cer) => {
            const remaining = Math.max(0, cer.totalAmount - cer.totalPaid);

            return (
              <div
                key={cer.id}
                className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-rhr-burgundy px-2.5 py-1 text-[10px] font-black uppercase text-white">
                        {cer.eventType}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-500">
                        {cer.reference}
                      </span>
                      <span
                        className={cn(
                          "rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                          remaining === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        )}
                      >
                        {remaining === 0
                          ? "ENTIÈREMENT SOLDÉ"
                          : "CONFIRME AVEC ACOMPTE"}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-rhr-dark mt-1.5">
                      {cer.clientName} ({cer.clientPhone})
                    </h2>
                    <p className="text-xs text-gray-500">
                      Date Cérémonie :{" "}
                      <strong className="text-rhr-dark">{cer.eventDate}</strong>{" "}
                      • Capacité :{" "}
                      <strong className="text-rhr-burgundy">
                        {cer.guestsCount} couverts (50 base +{" "}
                        {cer.extraOrdinaryCovers} ord. + {cer.extraVipCovers}{" "}
                        VIP)
                      </strong>
                    </p>
                  </div>

                  {/* Boutons d'action : Devis A4, WhatsApp, Nouvel Acompte */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setA4InvoiceBooking(cer)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2 text-xs font-extrabold text-white transition"
                    >
                      <FileText className="h-4 w-4 text-rhr-gold" />
                      <span>Devis / Facture A4</span>
                    </button>

                    <a
                      href={buildCeremonyWhatsAppUrl(cer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] px-3.5 py-2 text-xs font-extrabold text-white transition"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </a>

                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setDepositModalBooking(cer);
                          setNextDepositAmount(remaining);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2 text-xs font-extrabold text-white shadow-rhr transition"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>+ Encaisser un Acompte</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Synthèse des postes du devis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  <div className="rounded-2xl bg-rhr-surface p-3.5 border border-gray-200">
                    <div className="text-gray-500">
                      Forfait Salle (50 couverts)
                    </div>
                    <div className="text-base font-black text-rhr-dark mt-1">
                      {formatCFA(cer.baseRentalFee)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-rhr-surface p-3.5 border border-gray-200">
                    <div className="text-gray-500">
                      Suppl. Couverts ({cer.extraOrdinaryCovers} ord. /{" "}
                      {cer.extraVipCovers} VIP)
                    </div>
                    <div className="text-base font-black text-rhr-dark mt-1">
                      {formatCFA(
                        cer.extraOrdinaryCovers * 1000 +
                          cer.extraVipCovers * 1500
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-rhr-surface p-3.5 border border-gray-200">
                    <div className="text-gray-500">Total Devis Facturé</div>
                    <div className="text-base font-black text-rhr-dark mt-1">
                      {formatCFA(cer.totalAmount)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200">
                    <div className="text-emerald-800 font-bold">
                      Total Acomptes Versés ({cer.deposits.length})
                    </div>
                    <div className="text-base font-black text-emerald-700 mt-1">
                      {formatCFA(cer.totalPaid)}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl p-3.5 border",
                      remaining > 0
                        ? "bg-red-50 border-red-200"
                        : "bg-emerald-50 border-emerald-200"
                    )}
                  >
                    <div
                      className={cn(
                        "font-bold",
                        remaining > 0 ? "text-red-800" : "text-emerald-800"
                      )}
                    >
                      Reste à Payer
                    </div>
                    <div
                      className={cn(
                        "text-base font-black mt-1",
                        remaining > 0 ? "text-red-600" : "text-emerald-700"
                      )}
                    >
                      {formatCFA(remaining)}
                    </div>
                  </div>
                </div>

                {/* Historique des acomptes successifs */}
                {cer.deposits.length > 0 && (
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3.5 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase text-gray-500">
                      Historique des Acomptes Successifs :
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cer.deposits.map((dep, i) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-rhr-dark">
                              Acompte #{i + 1} ({dep.method})
                            </span>
                            {dep.note && (
                              <span className="block text-[11px] text-gray-500">
                                {dep.note}
                              </span>
                            )}
                          </div>
                          <span className="font-black text-emerald-700">
                            + {formatCFA(dep.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODAL 1 : ENCAISSEMENT D'UN ACOMPTE SUCCESSIF SUR CÉRÉMONIE
      ===================================================================== */}
      {depositModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-rhr-burgundy">
                  {depositModalBooking.reference} —{" "}
                  {depositModalBooking.clientName}
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  Enregistrer un Nouvel Acompte / Solde
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDepositModalBooking(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Montant du versement (FCFA)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={nextDepositAmount}
                  onChange={(e) => setNextDepositAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-base font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mode de paiement
                </label>
                <select
                  value={nextDepositMethod}
                  onChange={(e) =>
                    setNextDepositMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rhr-dark"
                >
                  <option value="ESPECES">Espèces Physique</option>
                  <option value="WAVE">Wave Mobile Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="MTN_MOMO">MTN MoMo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Note (ex: 2e acompte traiteur, Solde final...)
                </label>
                <input
                  type="text"
                  value={nextDepositNote}
                  onChange={(e) => setNextDepositNote(e.target.value)}
                  placeholder="Ex: 2e acompte avant cérémonie"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs text-rhr-dark"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalBooking(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2 text-xs font-extrabold text-white shadow-rhr"
                >
                  Valider l&apos;Acompte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2 : DEVIS / FACTURE PROFORMA OFFICIELLE FORMAT A4 RHR
      ===================================================================== */}
      {a4InvoiceBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto">
            {/* En-tête A4 Officiel RHR */}
            <div className="bg-rhr-dark text-white p-6 border-b-4 border-rhr-burgundy flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <RhrLogo size="lg" variant="dark" />
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                    <Building2 className="h-3.5 w-3.5" />
                    Document Officiel Format A4
                  </span>
                  <h3 className="text-xl font-black text-white">
                    RHR — R&Eacute;SIDENCE H&Ocirc;TEL LE R&Ecirc;VE DE
                    M&apos;BATTO
                  </h3>
                  <p className="text-xs text-gray-300">
                    Pôle Salle de Cérémonie &amp; Traiteur • Réf :{" "}
                    <strong className="text-rhr-gold font-mono">
                      {a4InvoiceBooking.reference}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setA4InvoiceBooking(null)}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenu A4 */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-rhr-surface border border-gray-200 p-4 text-xs">
                <div>
                  <div className="text-gray-500 uppercase font-bold">
                    Client / Organisateur
                  </div>
                  <div className="text-base font-black text-rhr-dark mt-0.5">
                    {a4InvoiceBooking.clientName}
                  </div>
                  <div className="text-gray-600">
                    Tél : {a4InvoiceBooking.clientPhone}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-gray-500 uppercase font-bold">
                    Détails de la Réception
                  </div>
                  <div className="text-base font-black text-rhr-burgundy mt-0.5">
                    {a4InvoiceBooking.eventType} — {a4InvoiceBooking.eventDate}
                  </div>
                  <div className="text-gray-600 font-bold">
                    Capacité : {a4InvoiceBooking.guestsCount} Couverts
                  </div>
                </div>
              </div>

              {/* Tableau A4 des Prestations */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-rhr-dark text-white uppercase text-[10px] font-extrabold">
                    <th className="py-2.5 px-3 rounded-tl-lg">
                      Désignation de la Prestation
                    </th>
                    <th className="py-2.5 px-3 text-center">Quantité</th>
                    <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                    <th className="py-2.5 px-3 text-right rounded-tr-lg">
                      Montant Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 border-x border-b border-gray-200">
                  <tr>
                    <td className="py-3 px-3 font-bold text-rhr-dark">
                      Forfait Location Salle de Base (Inclut 50 couverts)
                    </td>
                    <td className="py-3 px-3 text-center">1 Forfait</td>
                    <td className="py-3 px-3 text-right">50 000 F</td>
                    <td className="py-3 px-3 text-right font-black">
                      50 000 F
                    </td>
                  </tr>

                  {a4InvoiceBooking.extraOrdinaryCovers > 0 && (
                    <tr>
                      <td className="py-3 px-3 font-bold text-rhr-dark">
                        Couverts Ordinaires Supplémentaires (au-delà de 50)
                      </td>
                      <td className="py-3 px-3 text-center">
                        {a4InvoiceBooking.extraOrdinaryCovers}
                      </td>
                      <td className="py-3 px-3 text-right">1 000 F</td>
                      <td className="py-3 px-3 text-right font-black">
                        {formatCFA(a4InvoiceBooking.extraOrdinaryCovers * 1000)}
                      </td>
                    </tr>
                  )}

                  {a4InvoiceBooking.extraVipCovers > 0 && (
                    <tr>
                      <td className="py-3 px-3 font-bold text-rhr-dark">
                        Couverts VIP Supplémentaires
                      </td>
                      <td className="py-3 px-3 text-center">
                        {a4InvoiceBooking.extraVipCovers}
                      </td>
                      <td className="py-3 px-3 text-right">1 500 F</td>
                      <td className="py-3 px-3 text-right font-black">
                        {formatCFA(a4InvoiceBooking.extraVipCovers * 1500)}
                      </td>
                    </tr>
                  )}

                  {a4InvoiceBooking.customCateringLines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 px-3 font-medium text-gray-800">
                        [Restauration] {line.label}
                      </td>
                      <td className="py-3 px-3 text-center">{line.quantity}</td>
                      <td className="py-3 px-3 text-right">
                        {formatCFA(line.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {formatCFA(line.subtotal)}
                      </td>
                    </tr>
                  ))}

                  {a4InvoiceBooking.customBeverageLines.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 px-3 font-medium text-gray-800">
                        [Boissons] {line.label}
                      </td>
                      <td className="py-3 px-3 text-center">{line.quantity}</td>
                      <td className="py-3 px-3 text-right">
                        {formatCFA(line.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {formatCFA(line.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Synthèse Totaux & Acomptes sur le document A4 */}
              <div className="rounded-2xl bg-rhr-dark text-white p-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-300">
                    TOTAL GÉNÉRAL DU DEVIS / FACTURE PROFORMA
                  </span>
                  <span className="text-base font-black text-white">
                    {formatCFA(a4InvoiceBooking.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>
                    TOTAL ACOMPTES DÉJÀ VERSÉS (
                    {a4InvoiceBooking.deposits.length} versement(s))
                  </span>
                  <span className="font-black">
                    - {formatCFA(a4InvoiceBooking.totalPaid)}
                  </span>
                </div>
                <div className="border-t border-white/15 pt-2 flex justify-between text-base font-black">
                  <span className="text-rhr-gold">SOLDE RESTANT À PAYER</span>
                  <span
                    className={
                      a4InvoiceBooking.totalAmount -
                        a4InvoiceBooking.totalPaid >
                      0
                        ? "text-red-400"
                        : "text-emerald-400"
                    }
                  >
                    {formatCFA(
                      Math.max(
                        0,
                        a4InvoiceBooking.totalAmount -
                          a4InvoiceBooking.totalPaid
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Barre d'actions A4 */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <a
                  href={buildCeremonyWhatsAppUrl(a4InvoiceBooking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] px-4 py-2.5 text-xs font-extrabold text-white shadow transition"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Envoyer Devis sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2.5 text-xs font-extrabold text-white shadow-rhr transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer Format A4 / PDF</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setA4InvoiceBooking(null)}
                className="rounded-xl bg-rhr-dark px-4 py-2.5 text-xs font-bold text-white"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
