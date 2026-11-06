"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  QrCode,
  Ban,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  UtensilsCrossed,
  BedDouble,
  Sparkles,
  User,
  Send,
  Printer,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import {
  useRhrStore,
  InventoryItem,
  PosOrderItem,
  PosOrder,
} from "@/store/useRhrStore";
import { formatCFA, cn } from "@/lib/utils";
import { QrCodeCardsGeneratorModal } from "@/components/QrCodeCardsGeneratorModal";

const TABLES_LIST = Array.from({ length: 15 }, (_, i) => `Table ${i + 1}`);
const ROOMS_LIST = Array.from({ length: 5 }, (_, i) => `Chambre ${i + 1}`);

export default function QrMenuPage() {
  const { inventory, submitQrCustomerOrder } = useRhrStore();

  const [locationType, setLocationType] = useState<"TABLE" | "CHAMBRE">(
    "TABLE"
  );
  const [selectedLocation, setSelectedLocation] = useState<string>("Table 1");
  const [guestFirstName, setGuestFirstName] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("TOUS");
  const [cart, setCart] = useState<PosOrderItem[]>([]);
  const [submittedOrder, setSubmittedOrder] = useState<PosOrder | null>(null);
  const [qrCardsModalOpen, setQrCardsModalOpen] = useState<boolean>(false);

  // Lecture automatique du paramètre ?loc=Table+X ou ?loc=Chambre+Y issu du QR Code scanné
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const loc = params.get("loc");
    if (loc) {
      if (loc.toLowerCase().startsWith("chambre")) {
        setLocationType("CHAMBRE");
        setSelectedLocation(loc);
      } else {
        setLocationType("TABLE");
        setSelectedLocation(loc);
      }
    }
  }, []);

  const getEffectiveStock = (item: InventoryItem): number => {
    if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
      const core = inventory.find((c) => c.id === item.linkedCoreIngredientId);
      return core ? core.stockQuantity : 0;
    }
    return item.stockQuantity;
  };

  const qrMenuItems = inventory
    .filter((i) => i.pole !== "CUISINE_PHARE" && i.isAvailableOnQr)
    .filter((item) => {
      if (activeCategory === "TOUS") return true;
      return item.category === activeCategory;
    });

  const handleAdd = (item: InventoryItem) => {
    const stock = getEffectiveStock(item);
    if (stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
        if (existing.quantity >= stock) return prev;
        return prev.map((c) =>
          c.itemId === item.id
            ? {
                ...c,
                quantity: c.quantity + 1,
                subtotal: (c.quantity + 1) * c.unitPrice,
              }
            : c
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          quantity: 1,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice,
          pole: item.pole,
        },
      ];
    });
  };

  const handleDelta = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.itemId !== itemId) return c;
          const next = c.quantity + delta;
          if (next <= 0) return null;
          return { ...c, quantity: next, subtotal: next * c.unitPrice };
        })
        .filter((x): x is PosOrderItem => x !== null)
    );
  };

  const cartTotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleSendQrOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const res = submitQrCustomerOrder({
      locationType,
      locationLabel: selectedLocation,
      guestFirstName: guestFirstName.trim() || "Client",
      items: cart,
    });

    if (res.success && res.order) {
      setCart([]);
      setSubmittedOrder(res.order);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* =====================================================================
          EN-TÊTE MOBILE PRESTIGE RHR M'BATTO
      ===================================================================== */}
      <div className="rounded-3xl bg-rhr-dark text-white p-6 shadow-xl border-b-4 border-rhr-burgundy flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <RhrLogo size="md" variant="dark" />
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
              <Sparkles className="h-3 w-3" />
              Carte Digitale Interactive — Commande Directe
            </span>
            <h1 className="text-xl sm:text-2xl font-black leading-tight mt-0.5">
              RHR — R&Eacute;SIDENCE H&Ocirc;TEL LE R&Ecirc;VE DE M&apos;BATTO
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Commandez depuis votre table ou votre chambre climatisée. Service
              rapide garanti.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setQrCardsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rhr-gold/40 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-rhr-gold transition shrink-0"
        >
          <Printer className="h-4 w-4" />
          <span>Cartes QR Imprimables</span>
        </button>
      </div>

      {/* =====================================================================
          CONFIRMATION DE COMMANDE QR ENVOYÉE EN TEMPS RÉEL À LA CAISSE
      ===================================================================== */}
      {submittedOrder && (
        <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-6 shadow-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase text-emerald-800">
                  Commande #{submittedOrder.orderNumber} transmise à la Caisse !
                </span>
                <h2 className="text-lg font-black text-rhr-dark">
                  Merci ! Votre commande est en cours de prise en charge
                </h2>
                <p className="text-xs text-emerald-900">
                  Emplacement :{" "}
                  <strong>{submittedOrder.tableOrRoomLabel}</strong> • Montant :{" "}
                  <strong>{formatCFA(submittedOrder.totalAmount)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-emerald-200">
            <span className="text-xs text-emerald-800">
              Notre serveuse arrive vers vous. En mode démo, vous pouvez voir
              cette commande clignoter sur la caisse POS :
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/pos"
                className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2 text-xs font-extrabold text-white shadow transition"
              >
                Ouvrir Caisse POS (Commandes QR Entrantes) →
              </Link>
              <button
                type="button"
                onClick={() => setSubmittedOrder(null)}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900"
              >
                Nouvelle commande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. SÉLECTION DE L'EMPLACEMENT (TABLE 1-15 OU CHAMBRE 1-5) & PRÉNOM
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-5 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Choix Table vs Chambre */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              1. Où êtes-vous installé ?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLocationType("TABLE");
                  setSelectedLocation("Table 1");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-extrabold border-2 transition",
                  locationType === "TABLE"
                    ? "border-rhr-burgundy bg-rhr-burgundy text-white"
                    : "border-gray-200 bg-rhr-surface text-gray-700"
                )}
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>À Table (1-15)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLocationType("CHAMBRE");
                  setSelectedLocation("Chambre 1");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-extrabold border-2 transition",
                  locationType === "CHAMBRE"
                    ? "border-rhr-burgundy bg-rhr-burgundy text-white"
                    : "border-gray-200 bg-rhr-surface text-gray-700"
                )}
              >
                <BedDouble className="h-3.5 w-3.5" />
                <span>En Chambre (1-5)</span>
              </button>
            </div>
          </div>

          {/* Numéro exact de Table ou Chambre */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              2. Numéro de {locationType === "TABLE" ? "Table" : "Chambre"}
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-3.5 py-2.5 text-sm font-black text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
            >
              {(locationType === "TABLE" ? TABLES_LIST : ROOMS_LIST).map(
                (loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Prénom du Client */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
              3. Votre Prénom / Nom *
            </label>
            <div className="relative">
              <User className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                placeholder="Ex: M. Konan, Clarisse..."
                className="w-full rounded-xl border-2 border-gray-200 bg-white pl-10 pr-3.5 py-2 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. FILTRES CATÉGORIES DE LA CARTE RHR
      ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "TOUS", label: "Toute la Carte RHR" },
          { id: "Grillades & Braisés", label: "🔥 Grillades & Braisés" },
          {
            id: "Spécialités Ivoiriennes",
            label: "🍲 Kedjenou & Soupes Africaines",
          },
          { id: "Bières & Pressions", label: "🍺 Bières Fraîches" },
          { id: "Vins & Spiritueux", label: "🍷 Vins & Spiritueux" },
          { id: "Softs & Eaux", label: "🥤 Sucreries & Eaux" },
        ].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "rounded-2xl px-4 py-2 text-xs font-extrabold transition",
              activeCategory === cat.id
                ? "bg-rhr-burgundy text-white shadow-rhr"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* =====================================================================
          3. GRILLE DES PLATS & BOISSONS (ÉPUISÉ SI STOCK === 0)
      ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {qrMenuItems.map((item) => {
          const stock = getEffectiveStock(item);
          const isZero = stock <= 0;
          const inCart = cart.find((c) => c.itemId === item.id);

          return (
            <div
              key={item.id}
              className={cn(
                "rounded-3xl border-2 p-4 flex items-center justify-between gap-4 transition",
                isZero
                  ? "border-gray-200 bg-gray-100 opacity-70"
                  : inCart
                  ? "border-rhr-burgundy bg-white shadow-rhr"
                  : "border-gray-200 bg-white shadow-card"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-rhr-surface border border-gray-200 flex items-center justify-center text-3xl shrink-0">
                  {item.imageEmoji}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {item.category}
                  </span>
                  <h3 className="font-black text-sm text-rhr-dark leading-snug">
                    {item.name}
                  </h3>
                  <div className="text-sm font-black text-rhr-burgundy mt-1">
                    {formatCFA(item.unitPrice)}
                  </div>
                </div>
              </div>

              {isZero ? (
                <span className="inline-flex items-center gap-1 rounded-xl bg-red-100 border border-red-300 px-3 py-2 text-[10px] font-black uppercase text-rhr-burgundy shrink-0">
                  <Ban className="h-3.5 w-3.5" />
                  <span>Épuisé</span>
                </span>
              ) : inCart ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDelta(item.id, -1)}
                    className="h-9 w-9 rounded-xl border border-gray-300 bg-white flex items-center justify-center font-bold"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-black text-sm text-rhr-dark">
                    {inCart.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdd(item)}
                    className="h-9 w-9 rounded-xl bg-rhr-burgundy text-white flex items-center justify-center font-bold"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAdd(item)}
                  className="rounded-2xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2.5 text-xs font-extrabold text-white transition shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5 text-rhr-gold" />
                  <span>Choisir</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          4. BARRE DE COMMANDE MOBILE FIXE EN BAS D'ÉCRAN
      ===================================================================== */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-40 max-w-3xl mx-auto">
          <form
            onSubmit={handleSendQrOrder}
            className="rounded-3xl bg-rhr-dark text-white p-4 shadow-2xl border-2 border-rhr-gold flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-rhr-burgundy flex items-center justify-center font-black text-sm text-rhr-gold">
                {cartCount}
              </div>
              <div>
                <div className="text-xs text-gray-300">
                  {selectedLocation} •{" "}
                  {guestFirstName.trim() || "Client RHR"}
                </div>
                <div className="text-lg font-black text-white">
                  Total : {formatCFA(cartTotal)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-rhr transition"
            >
              <Send className="h-4 w-4 text-rhr-gold" />
              <span>Envoyer ma Commande en Caisse</span>
            </button>
          </form>
        </div>
      )}

      {/* Modal Générateur de Cartes QR Imprimables */}
      <QrCodeCardsGeneratorModal
        open={qrCardsModalOpen}
        onClose={() => setQrCardsModalOpen(false)}
      />
    </div>
  );
}
