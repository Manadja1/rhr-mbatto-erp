"use client";

import React, { useState } from "react";
import {
  PackageSearch,
  CheckCircle2,
  PlusCircle,
  Ban,
  UtensilsCrossed,
  Wine,
  X,
  ArrowUpRight,
  Settings,
  Tag,
  Save,
  Trash2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  useRhrStore,
  InventoryItem,
  PaymentMethod,
  RHR_CATALOG_EMOJIS,
} from "@/store/useRhrStore";
import { formatCFA, cn } from "@/lib/utils";

export default function InventoryPage() {
  const {
    currentUser,
    inventory,
    restockInventoryItem,
    setItemStockZeroDemo,
    updateInventoryItem,
    createInventoryItem,
    deleteInventoryItem,
  } = useRhrStore();

  // État local des prix en cours de saisie (id -> chaîne saisie par l'utilisateur pour permettre d'effacer et taper librement)
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  // Modal Approvisionnement
  const [restockModalItem, setRestockModalItem] =
    useState<InventoryItem | null>(null);
  const [addedQty, setAddedQty] = useState<string>("12");
  const [restockCustomUnitPrice, setRestockCustomUnitPrice] =
    useState<string>("1000");
  const [recordExpense, setRecordExpense] = useState<boolean>(true);
  const [expenseCost, setExpenseCost] = useState<string>("10000");
  const [paymentMethod] = useState<PaymentMethod>("ESPECES");
  const [fundSource, setFundSource] = useState<
    "CAISSE_DU_JOUR" | "FONDS_SEPARE"
  >("CAISSE_DU_JOUR");

  // Modal Création d'une nouvelle Boisson ou d'un nouveau Plat avec Prix Libre
  const [createModalType, setCreateModalType] = useState<
    "BAR_BOISSON" | "PLAT_MENU" | null
  >(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Bières & Pressions");
  const [newUnitPrice, setNewUnitPrice] = useState<string>("1000");
  const [newStockQty, setNewStockQty] = useState<string>("24");
  const [newAlertThreshold, setNewAlertThreshold] = useState<string>("6");
  const [newLinkedCoreId, setNewLinkedCoreId] = useState<string>("core-poulet");
  const [newEmoji, setNewEmoji] = useState<string>("🍺");

  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  const coreFreezerItems = inventory.filter((i) => i.pole === "CUISINE_PHARE");
  const menuDishes = inventory.filter((i) => i.pole === "PLAT_MENU");
  const barDrinks = inventory.filter((i) => i.pole === "BAR_BOISSON");

  // Renvoie la valeur affichée dans le champ de saisie du prix
  const getDraftPriceString = (item: InventoryItem): string => {
    return priceDrafts[item.id] !== undefined
      ? priceDrafts[item.id]
      : String(item.unitPrice);
  };

  const handlePriceInputChange = (itemId: string, rawValue: string) => {
    // Autorise uniquement les chiffres (et chaîne vide pendant que l'utilisateur efface pour saisir)
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    setPriceDrafts((prev) => ({
      ...prev,
      [itemId]: cleaned,
    }));
  };

  const handleSaveUnitPrice = (item: InventoryItem) => {
    const rawStr = getDraftPriceString(item);
    const nextPrice = Number(rawStr);
    if (!rawStr || isNaN(nextPrice) || nextPrice <= 0) {
      setBannerMsg(
        `Veuillez saisir un prix de vente valide (supérieur à 0 FCFA) pour "${item.name}".`
      );
      return;
    }

    const res = updateInventoryItem(item.id, { unitPrice: nextPrice });
    if (res.success) {
      setPriceDrafts((prev) => ({
        ...prev,
        [item.id]: String(nextPrice),
      }));
      setSavedItemId(item.id);
      setBannerMsg(
        `Prix de vente enregistré : "${item.name}" est désormais affiché à ${formatCFA(
          nextPrice
        )} sur les écrans Caisse Bar/Resto (/pos) et Menu QR (/qr-menu).`
      );
      setTimeout(() => setSavedItemId(null), 2500);
      setTimeout(() => setBannerMsg(null), 6000);
    }
  };

  const openRestockModal = (item: InventoryItem) => {
    setRestockModalItem(item);
    const defaultAdd = item.pole === "BAR_BOISSON" ? "24" : "10";
    setAddedQty(defaultAdd);
    setRestockCustomUnitPrice(String(item.unitPrice));
    setExpenseCost(item.pole === "BAR_BOISSON" ? "15000" : "25000");
    setRecordExpense(true);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAddedQty = Number(addedQty);
    const numericUnitPrice = Number(restockCustomUnitPrice);
    const numericExpenseCost = Number(expenseCost) || 0;

    if (!restockModalItem || numericAddedQty <= 0) return;

    restockInventoryItem({
      itemId: restockModalItem.id,
      addedQuantity: numericAddedQty,
      recordMarketExpense: recordExpense,
      expenseCost: recordExpense ? numericExpenseCost : 0,
      paymentMethod,
      fundSource,
    });

    if (
      restockModalItem.pole !== "CUISINE_PHARE" &&
      numericUnitPrice > 0 &&
      numericUnitPrice !== restockModalItem.unitPrice
    ) {
      updateInventoryItem(restockModalItem.id, {
        unitPrice: numericUnitPrice,
      });
      setPriceDrafts((prev) => ({
        ...prev,
        [restockModalItem.id]: String(numericUnitPrice),
      }));
    }

    setBannerMsg(
      `Approvisionnement validé : +${numericAddedQty} ${restockModalItem.unit} ajouté(s) sur "${restockModalItem.name}"${restockModalItem.pole !== "CUISINE_PHARE" && numericUnitPrice > 0
        ? ` (Prix de vente : ${formatCFA(numericUnitPrice)})`
        : ""
      }.`
    );
    setRestockModalItem(null);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const openCreateModal = (pole: "BAR_BOISSON" | "PLAT_MENU") => {
    setCreateModalType(pole);
    setNewName("");
    if (pole === "BAR_BOISSON") {
      setNewCategory("Bières & Pressions");
      setNewUnitPrice("1000");
      setNewStockQty("24");
      setNewAlertThreshold("6");
      setNewEmoji("🍺");
    } else {
      setNewCategory("Grillades & Braisés");
      setNewUnitPrice("5000");
      setNewStockQty("10");
      setNewAlertThreshold("4");
      setNewLinkedCoreId(coreFreezerItems[0]?.id || "");
      setNewEmoji("🍗");
    }
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(newUnitPrice);
    const numericStock = Number(newStockQty) || 0;
    const numericAlert = Number(newAlertThreshold) || 5;

    if (!createModalType || !newName.trim() || numericPrice <= 0) return;

    const skuPrefix = createModalType === "BAR_BOISSON" ? "BAR" : "MENU";
    const generatedSku = `${skuPrefix}-${Date.now().toString().slice(-4)}`;

    const res = createInventoryItem({
      name: newName.trim(),
      sku: generatedSku,
      pole: createModalType,
      category: newCategory,
      unitPrice: numericPrice,
      stockQuantity: numericStock,
      alertThreshold: numericAlert,
      unit: createModalType === "BAR_BOISSON" ? "Bouteilles" : "Plat",
      linkedCoreIngredientId:
        createModalType === "PLAT_MENU" && newLinkedCoreId
          ? newLinkedCoreId
          : undefined,
      linkedCoreIngredientQty: createModalType === "PLAT_MENU" ? 1 : undefined,
      isAvailableOnQr: true,
      imageEmoji: newEmoji || (createModalType === "BAR_BOISSON" ? "🍺" : "🍽️"),
    });

    if (res.success && res.item) {
      setBannerMsg(
        `Nouvel article "${res.item.name}" créé avec le prix de vente libre de ${formatCFA(
          res.item.unitPrice
        )} ! Il est immédiatement disponible sur l'écran Caisse Bar & Restaurant.`
      );
      setCreateModalType(null);
      setTimeout(() => setBannerMsg(null), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête Moteur de Stock & Tarification Libre Bar / Cuisine */}
      <div className="rounded-2xl bg-rhr-dark text-white p-5 sm:p-6 shadow-card border border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <PackageSearch className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Inventaire &amp; Tarification Libre RHR — Bar &amp; Restaurant
            </span>
          </span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mt-1">
            Stocks &amp; Prix de Vente Libres (Boissons &amp; Nourriture)
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Saisissez librement vos{" "}
            <strong className="text-rhr-gold">prix de vente en FCFA</strong>{" "}
            pour chaque boisson et chaque plat : ils s&apos;affichent{" "}
            <strong className="text-white">instantanément</strong> sur les
            écrans Caisse Bar/Resto (<code className="text-rhr-gold">/pos</code>
            ) et Menu QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openCreateModal("BAR_BOISSON")}
            className="h-10 inline-flex items-center gap-2 rounded-xl bg-rhr-gold hover:bg-rhr-gold-light px-4 text-xs font-black text-rhr-dark shadow transition whitespace-nowrap"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>+ Nouvelle Boisson</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("PLAT_MENU")}
            className="h-10 inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 text-xs font-extrabold text-white shadow-rhr transition whitespace-nowrap"
          >
            <UtensilsCrossed className="h-4 w-4 shrink-0" />
            <span>+ Nouveau Plat</span>
          </button>

          <Link
            href="/pos"
            className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-4 text-xs font-bold text-white transition whitespace-nowrap"
          >
            <span>Écran Caisse POS</span>
            <ArrowUpRight className="h-4 w-4 text-rhr-gold shrink-0" />
          </Link>

          {currentUser?.role === "PROPRIETAIRE" && (
            <Link
              href="/admin"
              className="h-10 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 px-3.5 text-xs font-bold text-gray-200 transition whitespace-nowrap"
            >
              <Settings className="h-4 w-4 text-rhr-gold shrink-0" />
              <span>Admin Général</span>
            </Link>
          )}
        </div>
      </div>

      {bannerMsg && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 flex items-center justify-between gap-2.5 text-xs font-extrabold text-emerald-950 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMsg(null)}
            className="rounded-lg p-1 hover:bg-emerald-100 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          SECTION 1 : INVENTAIRE DU BAR & PRIX DE VENTE DES BOISSONS
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-5 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy flex items-center gap-1.5">
              <Wine className="h-4 w-4 shrink-0" />
              <span>Inventaire du Bar &amp; Tarification Libre par Bouteille</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-rhr-dark mt-0.5">
              1. Inventaire du Bar (Bières, Vins, Sucreries &amp; Eaux)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tapez librement le montant souhaité dans le champ{" "}
              <strong className="text-rhr-dark">Prix de vente</strong> puis
              cliquez sur{" "}
              <strong className="text-rhr-burgundy">
                &laquo; Fixer le prix &raquo;
              </strong>
              .
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal("BAR_BOISSON")}
            className="h-10 self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 text-xs font-extrabold text-white transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="h-4 w-4 text-rhr-gold shrink-0" />
            <span>Ajouter une Boisson</span>
          </button>
        </div>

        {/* Grille responsive 1 col (mobile), 2 cols (tablette/petit laptop), 3 cols (grand écran) pour garantir une largeur confortable */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {barDrinks.map((drink) => {
            const isZero = drink.stockQuantity <= 0;
            const draftStr = getDraftPriceString(drink);
            const isPriceDirty = Number(draftStr) !== drink.unitPrice;
            const justSaved = savedItemId === drink.id;

            return (
              <div
                key={drink.id}
                className={cn(
                  "rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 transition",
                  isZero
                    ? "border-red-400 bg-red-50/40"
                    : justSaved
                      ? "border-emerald-500 bg-emerald-50/20 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
                )}
              >
                <div className="space-y-3.5">
                  {isZero && (
                    <div className="rounded-xl bg-rhr-burgundy px-3 py-1.5 text-center text-[11px] font-black uppercase text-white flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <Ban className="h-3.5 w-3.5 shrink-0" />
                      <span>RUPTURE DE STOCK — VENTE BLOQUÉE</span>
                    </div>
                  )}

                  {/* Ligne supérieure : Icône + Badge Stock sur 1 ligne */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl shrink-0">{drink.imageEmoji}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "rounded-xl px-3 py-1 text-xs font-black whitespace-nowrap",
                          isZero
                            ? "bg-red-100 text-red-800"
                            : drink.stockQuantity <= drink.alertThreshold
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {drink.stockQuantity} btl
                      </span>
                      {currentUser?.role === "PROPRIETAIRE" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer la boisson "${drink.name}" de l'inventaire ?`
                              )
                            ) {
                              deleteInventoryItem(drink.id);
                            }
                          }}
                          title="Supprimer cette boisson"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Titre & Catégorie */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">
                      {drink.category}
                    </span>
                    <h3 className="font-black text-base text-rhr-dark leading-snug mt-0.5">
                      {drink.name}
                    </h3>
                  </div>

                  {/* BLOC DE SAISIE DU PRIX DE VENTE PARFAITEMENT LISIBLE */}
                  <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1 whitespace-nowrap">
                        <Tag className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                        <span>Prix / bouteille</span>
                      </span>
                      <span className="rounded-lg bg-rhr-burgundy/10 px-2.5 py-0.5 text-xs font-black text-rhr-burgundy whitespace-nowrap">
                        Actuel : {formatCFA(drink.unitPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Champ de saisie large avec devise séparée à droite pour ne jamais masquer les chiffres */}
                      <div className="flex-1 min-w-0 flex items-center rounded-xl border-2 border-gray-300 bg-white focus-within:border-rhr-burgundy overflow-hidden">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draftStr}
                          onChange={(e) =>
                            handlePriceInputChange(drink.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveUnitPrice(drink);
                            }
                          }}
                          placeholder="Ex: 1000"
                          aria-label={`Prix de vente pour ${drink.name}`}
                          className="w-full min-w-0 bg-white px-3 py-2 text-base font-black text-rhr-dark placeholder:text-gray-300 focus:outline-none"
                        />
                        <span className="px-2.5 py-2 text-[11px] font-extrabold text-gray-500 bg-gray-50 border-l border-gray-200 whitespace-nowrap shrink-0">
                          FCFA
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveUnitPrice(drink)}
                        className={cn(
                          "h-10 rounded-xl px-3.5 text-xs font-extrabold transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                          justSaved
                            ? "bg-emerald-600 text-white"
                            : isPriceDirty
                              ? "bg-rhr-burgundy text-white shadow-sm ring-2 ring-rhr-burgundy/30"
                              : "bg-rhr-dark hover:bg-rhr-burgundy text-white"
                        )}
                      >
                        <Save className="h-3.5 w-3.5 shrink-0" />
                        <span>{justSaved ? "Enregistré" : "Fixer le prix"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barre d'actions inférieure : TOUS LES BOUTONS SUR UNE SEULE LIGNE */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      restockInventoryItem({
                        itemId: drink.id,
                        addedQuantity: 24,
                      })
                    }
                    className="h-9 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                  >
                    +1 Casier (24)
                  </button>

                  <button
                    type="button"
                    onClick={() => openRestockModal(drink)}
                    className="h-9 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-3 text-xs font-bold text-rhr-dark transition inline-flex items-center justify-center whitespace-nowrap shrink-0"
                  >
                    Appro / Prix
                  </button>

                  {!isZero && (
                    <button
                      type="button"
                      onClick={() => setItemStockZeroDemo(drink.id)}
                      title="Mettre à 0 pour tester le blocage"
                      className="h-9 w-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-black text-red-700 transition inline-flex items-center justify-center shrink-0"
                    >
                      0
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 2 : PRIX DE VENTE DE LA NOURRITURE (PLATS DU MENU RESTAURANT)
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-5 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy flex items-center gap-1.5">
              <UtensilsCrossed className="h-4 w-4 shrink-0" />
              <span>
                Carte du Restaurant &amp; Tarification Libre de la Nourriture
              </span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-rhr-dark mt-0.5">
              2. Prix de Vente de la Nourriture (Plats du Menu, Grillades &amp; Spécialités)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Définissez librement le prix de vente de chaque plat. Tout
              changement est{" "}
              <strong className="text-rhr-burgundy">répercuté en direct</strong>{" "}
              sur l&apos;écran Caisse Bar &amp; Restaurant (
              <code className="font-bold">/pos</code>).
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateModal("PLAT_MENU")}
            className="h-10 self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 text-xs font-extrabold text-white shadow-rhr transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>Ajouter un Plat / Nourriture</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {menuDishes.map((dish) => {
            const linkedCore = dish.linkedCoreIngredientId
              ? coreFreezerItems.find((c) => c.id === dish.linkedCoreIngredientId)
              : null;
            const effectiveStock = linkedCore
              ? linkedCore.stockQuantity
              : dish.stockQuantity;
            const isZero = effectiveStock <= 0;
            const draftStr = getDraftPriceString(dish);
            const isPriceDirty = Number(draftStr) !== dish.unitPrice;
            const justSaved = savedItemId === dish.id;

            return (
              <div
                key={dish.id}
                className={cn(
                  "rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 transition",
                  isZero
                    ? "border-red-300 bg-red-50/30"
                    : justSaved
                      ? "border-emerald-500 bg-emerald-50/20 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
                )}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl shrink-0">{dish.imageEmoji}</span>
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-rhr-burgundy truncate">
                          {dish.category}
                        </span>
                        <h3 className="font-black text-base text-rhr-dark leading-snug">
                          {dish.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "rounded-xl px-2.5 py-1 text-xs font-black whitespace-nowrap",
                          isZero
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                        )}
                      >
                        {effectiveStock} disp.
                      </span>
                      {currentUser?.role === "PROPRIETAIRE" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer le plat "${dish.name}" du menu ?`
                              )
                            ) {
                              deleteInventoryItem(dish.id);
                            }
                          }}
                          title="Supprimer ce plat"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {linkedCore && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap">Produit Phare :</span>
                      <strong className="text-rhr-dark truncate">
                        {linkedCore.imageEmoji} {linkedCore.name} (
                        {linkedCore.stockQuantity})
                      </strong>
                    </div>
                  )}

                  {/* BLOC DE SAISIE DU PRIX DE VENTE DE LA NOURRITURE PARFAITEMENT LISIBLE */}
                  <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-600 flex items-center gap-1 whitespace-nowrap">
                        <Tag className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                        <span>Prix du plat</span>
                      </span>
                      <span className="rounded-lg bg-rhr-burgundy/10 px-2.5 py-0.5 text-xs font-black text-rhr-burgundy whitespace-nowrap">
                        Actuel : {formatCFA(dish.unitPrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 flex items-center rounded-xl border-2 border-gray-300 bg-white focus-within:border-rhr-burgundy overflow-hidden">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draftStr}
                          onChange={(e) =>
                            handlePriceInputChange(dish.id, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveUnitPrice(dish);
                            }
                          }}
                          placeholder="Ex: 5000"
                          aria-label={`Prix de vente pour ${dish.name}`}
                          className="w-full min-w-0 bg-white px-3 py-2 text-base font-black text-rhr-dark placeholder:text-gray-300 focus:outline-none"
                        />
                        <span className="px-2.5 py-2 text-[11px] font-extrabold text-gray-500 bg-gray-50 border-l border-gray-200 whitespace-nowrap shrink-0">
                          FCFA
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveUnitPrice(dish)}
                        className={cn(
                          "h-10 rounded-xl px-3.5 text-xs font-extrabold transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                          justSaved
                            ? "bg-emerald-600 text-white"
                            : isPriceDirty
                              ? "bg-rhr-burgundy text-white shadow-sm ring-2 ring-rhr-burgundy/30"
                              : "bg-rhr-dark hover:bg-rhr-burgundy text-white"
                        )}
                      >
                        <Save className="h-3.5 w-3.5 shrink-0" />
                        <span>{justSaved ? "Enregistré" : "Fixer le prix"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECTION 3 : PANNEAU DE CONTRÔLE DES PRODUITS PHARES CUISINE (CONGÉLATEUR)
      ===================================================================== */}
      <div className="rounded-3xl bg-white border border-gray-200 p-5 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Contrôle des Matières Premières &amp; Congélateur Cuisine</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-rhr-dark mt-0.5">
              3. Produits Phares Cuisine (Congélateur &amp; Réserve)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chaque vente d&apos;un plat décrémente automatiquement le produit
              phare lié. Si le produit phare tombe à 0, tous ses plats sont
              bloqués.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openRestockModal(coreFreezerItems[0])}
            className="h-10 self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 text-xs font-extrabold text-white transition whitespace-nowrap shrink-0"
          >
            <PlusCircle className="h-4 w-4 text-rhr-gold shrink-0" />
            <span>Approvisionner le Congélateur</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {coreFreezerItems.map((core) => {
            const dependentDishes = menuDishes.filter(
              (d) => d.linkedCoreIngredientId === core.id
            );
            const isZero = core.stockQuantity <= 0;

            return (
              <div
                key={core.id}
                className={cn(
                  "rounded-2xl border-2 p-5 flex flex-col justify-between space-y-4 transition",
                  isZero
                    ? "border-red-400 bg-red-50/40"
                    : "border-gray-200 bg-rhr-surface/60"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-3xl shrink-0">{core.imageEmoji}</span>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-rhr-dark truncate">
                          {core.name}
                        </h3>
                        <span className="text-[11px] text-gray-500">
                          Réf : {core.sku} • Seuil alerte :{" "}
                          {core.alertThreshold} {core.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-xl px-3 py-1 text-sm font-black whitespace-nowrap",
                          isZero
                            ? "bg-rhr-burgundy text-white"
                            : "bg-emerald-600 text-white"
                        )}
                      >
                        {core.stockQuantity} {core.unit}
                      </span>
                    </div>
                  </div>

                  {isZero && (
                    <div className="rounded-xl bg-rhr-burgundy px-3 py-2 text-xs font-black uppercase text-white flex items-center gap-2">
                      <Ban className="h-4 w-4 shrink-0" />
                      <span>
                        RUPTURE PRODUIT PHARE : {dependentDishes.length} PLATS
                        BLOQUÉS À LA VENTE !
                      </span>
                    </div>
                  )}

                  {/* Liste des plats du menu reliés à ce Produit Phare avec leur prix actuel */}
                  <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                      Plats du menu liés ({dependentDishes.length}) &amp; tarifs actifs :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dependentDishes.map((dish) => (
                        <span
                          key={dish.id}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold",
                            isZero
                              ? "border-red-300 bg-red-50 text-red-800 line-through"
                              : "border-gray-200 bg-gray-50 text-rhr-dark"
                          )}
                        >
                          <span>{dish.imageEmoji}</span>
                          <span>{dish.name}</span>
                          <strong className="text-rhr-burgundy whitespace-nowrap">
                            ({formatCFA(dish.unitPrice)})
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Boutons d'action rapide Approvisionnement / Test Rupture sur 1 ligne */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        restockInventoryItem({
                          itemId: core.id,
                          addedQuantity: 5,
                        })
                      }
                      className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                    >
                      +5 {core.unit}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRestockModal(core)}
                      className="h-9 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-3.5 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                    >
                      + Entrée Marché
                    </button>
                  </div>

                  {!isZero && (
                    <button
                      type="button"
                      onClick={() => setItemStockZeroDemo(core.id)}
                      className="h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 text-xs font-bold text-red-700 transition inline-flex items-center justify-center whitespace-nowrap"
                    >
                      Simuler Stock = 0
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1 : APPROVISIONNEMENT DU STOCK + AJUSTEMENT DU PRIX DE VENTE
      ===================================================================== */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-gray-200 shadow-2xl">
            <div className="bg-rhr-dark text-white p-5 border-b-4 border-rhr-burgundy flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                  Approvisionnement &amp; Tarif de Vente
                </span>
                <h3 className="text-lg font-black">
                  Réapprovisionner ou Ajuster le Prix de Vente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="rounded-xl bg-white/10 p-1.5 text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Produit à approvisionner
                </label>
                <select
                  value={restockModalItem.id}
                  onChange={(e) => {
                    const found = inventory.find(
                      (i) => i.id === e.target.value
                    );
                    if (found) {
                      setRestockModalItem(found);
                      setRestockCustomUnitPrice(String(found.unitPrice));
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-rhr-dark"
                >
                  <optgroup label="Boissons du Bar">
                    {barDrinks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.imageEmoji} {b.name} (Stock : {b.stockQuantity} • Prix :{" "}
                        {formatCFA(b.unitPrice)})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Produits Phares Cuisine (Congélateur)">
                    {coreFreezerItems.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.imageEmoji} {c.name} (Stock actuel :{" "}
                        {c.stockQuantity})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Quantité ajoutée ({restockModalItem.unit}) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={addedQty}
                    onChange={(e) =>
                      setAddedQty(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-full rounded-xl border-2 border-gray-300 bg-white px-3.5 py-2.5 text-base font-black text-emerald-700 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {restockModalItem.pole !== "CUISINE_PHARE" && (
                  <div>
                    <label className="block text-xs font-bold text-rhr-burgundy mb-1">
                      Prix de vente unitaire (FCFA) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={restockCustomUnitPrice}
                      onChange={(e) =>
                        setRestockCustomUnitPrice(
                          e.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      className="w-full rounded-xl border-2 border-rhr-burgundy bg-white px-3.5 py-2.5 text-base font-black text-rhr-dark focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-4 space-y-3">
                <label className="flex items-center gap-2 text-xs font-extrabold text-rhr-dark cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordExpense}
                    onChange={(e) => setRecordExpense(e.target.checked)}
                    className="h-4 w-4 rounded accent-rhr-burgundy"
                  />
                  <span>
                    Enregistrer simultanément cette dépense d&apos;achat dans la
                    trésorerie
                  </span>
                </label>

                {recordExpense && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Coût d&apos;achat total (FCFA)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={expenseCost}
                        onChange={(e) =>
                          setExpenseCost(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-rhr-dark"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">
                        Source des fonds
                      </label>
                      <select
                        value={fundSource}
                        onChange={(e) =>
                          setFundSource(
                            e.target.value as "CAISSE_DU_JOUR" | "FONDS_SEPARE"
                          )
                        }
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
                      >
                        <option value="CAISSE_DU_JOUR">
                          Pris dans la caisse du jour
                        </option>
                        <option value="FONDS_SEPARE">
                          Pris dans le fonds séparé
                        </option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="h-10 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-600 whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-6 text-xs font-extrabold text-white shadow-rhr whitespace-nowrap"
                >
                  Valider (+{addedQty || 0}) &amp; Appliquer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2 : AJOUTER UNE BOISSON OU UN PLAT AVEC PRIX DE VENTE LIBRE
      ===================================================================== */}
      {createModalType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-gray-200 shadow-2xl">
            <div className="bg-rhr-dark text-white p-5 border-b-4 border-rhr-gold flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                  {createModalType === "BAR_BOISSON"
                    ? "Nouvel Article Bar — Prix de Vente Libre"
                    : "Nouveau Plat Restaurant — Prix de Vente Libre"}
                </span>
                <h3 className="text-lg font-black">
                  {createModalType === "BAR_BOISSON"
                    ? "Ajouter une Boisson au Bar"
                    : "Ajouter un Plat / Nourriture au Menu"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalType(null)}
                className="rounded-xl bg-white/10 p-1.5 text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Icône / Emoji (Liste)
                  </label>
                  <select
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2.5 text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  >
                    <optgroup label="Boissons & Bar">
                      {RHR_CATALOG_EMOJIS.filter(
                        (em) => em.group === "BOISSONS_BAR"
                      ).map((em) => (
                        <option key={em.emoji} value={em.emoji}>
                          {em.emoji} {em.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Plats & Cuisine">
                      {RHR_CATALOG_EMOJIS.filter(
                        (em) => em.group === "PLATS_CUISINE"
                      ).map((em) => (
                        <option key={em.emoji} value={em.emoji}>
                          {em.emoji} {em.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Produits Phares">
                      {RHR_CATALOG_EMOJIS.filter(
                        (em) => em.group === "PRODUITS_PHARES"
                      ).map((em) => (
                        <option key={em.emoji} value={em.emoji}>
                          {em.emoji} {em.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Désignation de l&apos;article *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={
                      createModalType === "BAR_BOISSON"
                        ? "Ex: Bière Ivoire 65cl, Vin Blanc, Jus Ananas..."
                        : "Ex: Escargots Braisés, Agouti en Sauce, Alloco + Oeuf..."
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rhr-dark"
                  />
                </div>
              </div>

              {/* Sélecteur visuel rapide d'icône/emoji */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                  <span>Choix rapide dans la liste d&apos;icônes :</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-xs font-black text-rhr-dark">
                    Sélectionné : <span className="text-base">{newEmoji}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {RHR_CATALOG_EMOJIS.filter((em) =>
                    createModalType === "BAR_BOISSON"
                      ? em.group === "BOISSONS_BAR"
                      : em.group !== "BOISSONS_BAR"
                  ).map((em) => {
                    const active = newEmoji === em.emoji;
                    return (
                      <button
                        key={`${em.group}-${em.emoji}`}
                        type="button"
                        onClick={() => setNewEmoji(em.emoji)}
                        title={em.label}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition",
                          active
                            ? "border-rhr-burgundy bg-rhr-burgundy text-white font-bold shadow-sm"
                            : "border-gray-200 bg-white hover:bg-gray-100 text-gray-800"
                        )}
                      >
                        <span className="text-base leading-none">
                          {em.emoji}
                        </span>
                        <span className="text-[10px]">{em.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catégorie d&apos;affichage POS *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark"
                  >
                    {createModalType === "BAR_BOISSON" ? (
                      <>
                        <option value="Bières & Pressions">
                          Bières &amp; Pressions
                        </option>
                        <option value="Vins & Spiritueux">
                          Vins &amp; Spiritueux
                        </option>
                        <option value="Softs & Eaux">
                          Boissons Fraîches &amp; Eaux
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="Grillades & Braisés">
                          Grillades &amp; Braisés
                        </option>
                        <option value="Spécialités Ivoiriennes">
                          Cuisine Africaine / Spécialités
                        </option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-rhr-burgundy mb-1">
                    Prix de vente libre (FCFA) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={newUnitPrice}
                    onChange={(e) =>
                      setNewUnitPrice(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="Ex: 1000"
                    className="w-full rounded-xl border-2 border-rhr-burgundy bg-white px-3.5 py-2 text-base font-black text-rhr-dark focus:outline-none"
                  />
                </div>
              </div>

              {createModalType === "BAR_BOISSON" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Stock initial (bouteilles)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newStockQty}
                      onChange={(e) =>
                        setNewStockQty(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-black text-rhr-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Seuil d&apos;alerte stock
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newAlertThreshold}
                      onChange={(e) =>
                        setNewAlertThreshold(
                          e.target.value.replace(/[^0-9]/g, "")
                        )
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-rhr-dark"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Produit Phare du congélateur associé (ou Aucun si plat libre)
                  </label>
                  <select
                    value={newLinkedCoreId}
                    onChange={(e) => setNewLinkedCoreId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark"
                  >
                    <option value="">
                      Aucun (Plat indépendant toujours disponible)
                    </option>
                    {coreFreezerItems.map((core) => (
                      <option key={core.id} value={core.id}>
                        {core.imageEmoji} {core.name} (Stock :{" "}
                        {core.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalType(null)}
                  className="h-10 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-600 whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-6 text-xs font-extrabold text-white shadow-rhr whitespace-nowrap"
                >
                  Enregistrer &amp; Publier ({formatCFA(Number(newUnitPrice) || 0)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
