"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Users,
  Ban,
  BedDouble,
  CheckCircle2,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  QrCode,
  Wallet,
  Smartphone,
  BellRing,
  Sparkles,
  Search,
  AlertCircle,
  ArrowRight,
  Printer,
  MessageCircle,
  X,
  PackageSearch,
} from "lucide-react";
import {
  useRhrStore,
  InventoryItem,
  PosOrderItem,
  PosOrder,
  CeremonyBooking,
  PaymentMethod,
} from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";
import { QrCodeCardsGeneratorModal } from "@/components/QrCodeCardsGeneratorModal";
import { DailyReportingSheet } from "@/components/DailyReportingSheet";

type PosFilterCategory =
  | "TOUS"
  | "CUISINE_AFRICAINE"
  | "GRILLADES_BRAISES"
  | "BOISSONS_FRAICHES_EAUX"
  | "BIERES_VINS";

export default function PosPage() {
  const {
    currentUser,
    waitresses,
    inventory,
    rooms,
    stays,
    posOrders,
    ceremonies,
    createPosOrder,
    processIncomingQrOrder,
    cancelQrOrder,
    ingestRemoteQrOrders,
    createCeremonyBooking,
    addCeremonyDeposit,
  } = useRhrStore();

  // Onglet actif : Terminal POS, Commandes QR Entrantes, Salle de Cérémonie, Reporting Journalier ou Rendement Serveuses
  const [activeView, setActiveView] = useState<
    | "TERMINAL"
    | "QR_INCOMING"
    | "CEREMONIE_HALL"
    | "DAILY_REPORTING"
    | "WAITRESS_STATS"
  >("TERMINAL");

  // Formulaire Location Salle de Cérémonie depuis la Caisse Bar/Resto (depuis Janvier 2026)
  const [ceremonyDate, setCeremonyDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [ceremonyEventType, setCeremonyEventType] = useState<
    CeremonyBooking["eventType"]
  >("MARIAGE");
  const [ceremonyClientName, setCeremonyClientName] = useState("");
  const [ceremonyClientPhone, setCeremonyClientPhone] = useState("");
  const [ceremonyCovers, setCeremonyCovers] = useState<number>(50);
  const [ceremonyExtraCoverUnitPrice, setCeremonyExtraCoverUnitPrice] =
    useState<number>(1000);
  const [ceremonyDiscount, setCeremonyDiscount] = useState<number>(0);
  const [ceremonyDeposit, setCeremonyDeposit] = useState<number>(50000);
  const [ceremonyPaymentMethod, setCeremonyPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [ceremonyNotes, setCeremonyNotes] = useState("");
  const [ceremonyFeedback, setCeremonyFeedback] = useState<string | null>(null);
  const [ceremonyDepositAmountMap, setCeremonyDepositAmountMap] = useState<
    Record<string, number>
  >({});
  const [ceremonyDepositMethodMap, setCeremonyDepositMethodMap] = useState<
    Record<string, PaymentMethod>
  >({});

  // Filtre rapide produits & recherche
  const [selectedCategory, setSelectedCategory] =
    useState<PosFilterCategory>("TOUS");
  const [searchQuery, setSearchQuery] = useState("");

  // Panier POS & Serveuse OBLIGATOIRE
  const [selectedWaitressId, setSelectedWaitressId] = useState<string>(
    waitresses[0]?.id || ""
  );
  const [tableLabel, setTableLabel] = useState<string>("Table 1 (Terrasse)");
  const [cart, setCart] = useState<PosOrderItem[]>([]);

  // Mode de règlement POS : ESPECES, MOBILE_MONEY, TRANSFERT_CHAMBRE
  const [settlementCategory, setSettlementCategory] = useState<
    "ESPECES" | "MOBILE_MONEY" | "TRANSFERT_CHAMBRE"
  >("ESPECES");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<
    "WAVE" | "ORANGE_MONEY" | "MTN_MOMO"
  >("WAVE");

  // Chambres actuellement occupées (éligibles au transfert de note)
  const occupiedRooms = rooms.filter(
    (r) => r.status === "OCCUPEE_NUITEE" || r.status === "OCCUPEE_PASSAGE_3H"
  );
  const [selectedRoomNumberForTransfer, setSelectedRoomNumberForTransfer] =
    useState<number>(occupiedRooms[0]?.roomNumber || 1);

  // Tiroir panier mobile
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Feedback & Ticket de caisse généré
  const [posError, setPosError] = useState<string | null>(null);
  const [lastCompletedOrder, setLastCompletedOrder] =
    useState<PosOrder | null>(null);

  // Traitement d'une commande QR entrante
  const [qrWaitressMap, setQrWaitressMap] = useState<Record<string, string>>(
    {}
  );
  const [qrPaymentMap, setQrPaymentMap] = useState<
    Record<
      string,
      "ESPECES" | "WAVE" | "ORANGE_MONEY" | "MTN_MOMO" | "TRANSFERT_CHAMBRE"
    >
  >({});
  const [qrRoomMap, setQrRoomMap] = useState<Record<string, number>>({});

  // Modal Générateur de Cartes QR Imprimables
  const [qrGeneratorOpen, setQrGeneratorOpen] = useState(false);

  // Commandes QR en attente de validation par la caissière
  const incomingQrOrders = posOrders.filter((o) => o.status === "NOUVELLE_QR");

  // Calcul du stock effectif d'un article (Boisson directe ou Produit Phare lié)
  const getEffectiveStock = (item: InventoryItem): number => {
    if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
      const core = inventory.find((c) => c.id === item.linkedCoreIngredientId);
      return core ? core.stockQuantity : 0;
    }
    return item.stockQuantity;
  };

  // Quantité déjà engagée dans le panier courant (y compris plats partageant le même Produit Phare)
  const getCommittedStockInCart = (targetItem: InventoryItem): number => {
    if (targetItem.pole === "PLAT_MENU" && targetItem.linkedCoreIngredientId) {
      const coreId = targetItem.linkedCoreIngredientId;
      return cart.reduce((sum, cartLine) => {
        const inv = inventory.find((i) => i.id === cartLine.itemId);
        if (inv?.linkedCoreIngredientId === coreId) {
          return sum + cartLine.quantity * (inv.linkedCoreIngredientQty || 1);
        }
        return sum;
      }, 0);
    }
    const existing = cart.find((c) => c.itemId === targetItem.id);
    return existing ? existing.quantity : 0;
  };

  // Filtrage des produits vendables au POS
  const sellableProducts = inventory
    .filter((i) => i.pole !== "CUISINE_PHARE")
    .filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      switch (selectedCategory) {
        case "CUISINE_AFRICAINE":
          return item.category === "Spécialités Ivoiriennes";
        case "GRILLADES_BRAISES":
          return item.category === "Grillades & Braisés";
        case "BOISSONS_FRAICHES_EAUX":
          return item.category === "Softs & Eaux";
        case "BIERES_VINS":
          return (
            item.category === "Bières & Pressions" ||
            item.category === "Vins & Spiritueux"
          );
        default:
          return true;
      }
    });

  // Ajout d'un produit au panier avec contrôle temps réel du stock
  const handleAddToCart = (item: InventoryItem) => {
    setPosError(null);
    const effectiveStock = getEffectiveStock(item);
    const committed = getCommittedStockInCart(item);

    if (effectiveStock <= 0 || committed >= effectiveStock) {
      setPosError(
        `Stock maximum atteint pour "${item.name}" (${effectiveStock} disponible).`
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
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

  const handleUpdateCartQty = (itemId: string, delta: number) => {
    setPosError(null);
    const invItem = inventory.find((i) => i.id === itemId);
    if (!invItem) return;

    if (delta > 0) {
      const effectiveStock = getEffectiveStock(invItem);
      const committed = getCommittedStockInCart(invItem);
      if (committed >= effectiveStock) {
        setPosError(
          `Impossible d'ajouter plus : stock disponible limité à ${effectiveStock}.`
        );
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((c) => {
          if (c.itemId !== itemId) return c;
          const nextQty = c.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...c,
            quantity: nextQty,
            subtotal: nextQty * c.unitPrice,
          };
        })
        .filter((x): x is PosOrderItem => x !== null)
    );
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const cartItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Synchronisation automatique des prix du panier avec les tarifs définis dans l'inventaire (/inventory)
  useEffect(() => {
    setCart((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const updated = prev
        .map((line) => {
          const invItem = inventory.find((i) => i.id === line.itemId);
          if (!invItem) {
            changed = true;
            return null;
          }
          if (
            invItem.unitPrice !== line.unitPrice ||
            invItem.name !== line.name
          ) {
            changed = true;
            return {
              ...line,
              name: invItem.name,
              unitPrice: invItem.unitPrice,
              subtotal: line.quantity * invItem.unitPrice,
            };
          }
          return line;
        })
        .filter((x): x is PosOrderItem => x !== null);
      return changed ? updated : prev;
    });
  }, [inventory]);

  // Validation & Encaissement / Transfert Chambre de la commande POS
  const handleValidateOrder = () => {
    setPosError(null);
    if (!selectedWaitressId) {
      setPosError(
        "Règle RHR : Vous devez OBLIGATOIREMENT sélectionner une serveuse en haut du ticket."
      );
      return;
    }
    if (cart.length === 0) {
      setPosError("Ajoutez au moins un plat ou une boisson au ticket.");
      return;
    }

    const finalPaymentMode =
      settlementCategory === "ESPECES"
        ? "ESPECES"
        : settlementCategory === "TRANSFERT_CHAMBRE"
          ? "TRANSFERT_CHAMBRE"
          : mobileMoneyProvider;

    const result = createPosOrder({
      waitressId: selectedWaitressId,
      tableOrRoomLabel: tableLabel,
      items: cart,
      paymentMode: finalPaymentMode,
      transferredToRoomNumber:
        settlementCategory === "TRANSFERT_CHAMBRE"
          ? selectedRoomNumberForTransfer
          : undefined,
    });

    if (!result.success) {
      setPosError(result.error || "Erreur lors de la validation.");
      return;
    }

    setCart([]);
    setMobileCartOpen(false);
    if (result.order) {
      setLastCompletedOrder(result.order);
    }
  };

  // Validation d'une commande QR entrante par la Caissière
  const handleValidateIncomingQr = (qrOrder: PosOrder) => {
    setPosError(null);
    const waitressId = qrWaitressMap[qrOrder.id] || waitresses[0]?.id || "";
    const paymentMode = qrPaymentMap[qrOrder.id] || "ESPECES";
    const roomNum =
      qrRoomMap[qrOrder.id] || occupiedRooms[0]?.roomNumber || 1;

    const res = processIncomingQrOrder({
      orderId: qrOrder.id,
      waitressId,
      paymentMode,
      transferredToRoomNumber:
        paymentMode === "TRANSFERT_CHAMBRE" ? roomNum : undefined,
    });

    if (!res.success) {
      setPosError(res.error || "Impossible de valider cette commande QR.");
      return;
    }

    if (res.order) {
      fetch("/api/qr-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SYNC_FROM_POS",
          resolvedOrderId: qrOrder.id,
          inventory,
        }),
      }).catch(() => { });
      setLastCompletedOrder(res.order);
    }
  };

  // Synchronisation temps réel des commandes QR scannées depuis les téléphones des clients
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/qr-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SYNC_FROM_POS",
        inventory,
      }),
    }).catch(() => { });

    const pollQrOrders = () => {
      fetch("/api/qr-sync")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.qrOrders) && data.qrOrders.length > 0) {
            ingestRemoteQrOrders(data.qrOrders);
          }
        })
        .catch(() => { });
    };

    pollQrOrders();
    const interval = setInterval(pollQrOrders, 3000);
    return () => clearInterval(interval);
  }, [inventory, ingestRemoteQrOrders]);

  return (
    <div className="space-y-5">
      {/* =====================================================================
          BARRE SUPÉRIEURE DU TERMINAL POS & ONGLETS CLIGNOTANTS QR
      ===================================================================== */}
      <div className="rounded-2xl bg-rhr-dark text-white p-5 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Terminal Point de Vente (POS) Haute Vélocité — RHR M&apos;Batto
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-0.5">
            Caisse Bar &amp; Restaurant • Serveuses • Transfert Chambre &amp; QR
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Onglet 1 : Terminal de Caisse */}
          <button
            type="button"
            onClick={() => setActiveView("TERMINAL")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition",
              activeView === "TERMINAL"
                ? "bg-rhr-burgundy text-white shadow-rhr"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Terminal Caisse POS</span>
          </button>

          {/* Onglet 2 : Commandes QR Entrantes (Clignotant si > 0) */}
          <button
            type="button"
            onClick={() => setActiveView("QR_INCOMING")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition",
              activeView === "QR_INCOMING"
                ? "bg-rhr-gold text-rhr-dark shadow"
                : incomingQrOrders.length > 0
                  ? "bg-amber-500 text-rhr-dark animate-pulse shadow-lg"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
            )}
          >
            <BellRing className="h-4 w-4" />
            <span>Commandes QR Entrantes ({incomingQrOrders.length})</span>
          </button>

          {/* Onglet 3 : Location Salle de Cérémonie (au poste Caissière Bar/Resto) */}
          <button
            type="button"
            onClick={() => setActiveView("CEREMONIE_HALL")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition",
              activeView === "CEREMONIE_HALL"
                ? "bg-rhr-gold text-rhr-dark shadow"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            )}
          >
            <Sparkles className="h-4 w-4 text-rhr-gold" />
            <span>Location Salle Cérémonie ({ceremonies.length})</span>
          </button>

          {/* Onglet 4 : Saisie Opérations (Depuis Janv. 2026) & Reporting Journalier */}
          <button
            type="button"
            onClick={() => setActiveView("DAILY_REPORTING")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition",
              activeView === "DAILY_REPORTING"
                ? "bg-emerald-600 text-white shadow"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            )}
          >
            <Printer className="h-4 w-4" />
            <span>Opérations &amp; Reporting Journalier</span>
          </button>

          {/* Onglet 5 : Rendement des Serveuses */}
          <button
            type="button"
            onClick={() => setActiveView("WAITRESS_STATS")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition",
              activeView === "WAITRESS_STATS"
                ? "bg-rhr-burgundy text-white shadow-rhr"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            )}
          >
            <Users className="h-4 w-4" />
            <span>Rendement Serveuses &amp; Tickets</span>
          </button>

          {/* Bouton Accès Rapide Inventaire & Prix de Vente */}
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition"
          >
            <PackageSearch className="h-4 w-4 text-rhr-gold" />
            <span>Stocks &amp; Prix de Vente</span>
          </Link>

          {/* Bouton Générateur de Cartes QR Imprimables */}
          <button
            type="button"
            onClick={() => setQrGeneratorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rhr-gold/50 bg-rhr-gold/10 hover:bg-rhr-gold/20 px-3.5 py-2.5 text-xs font-bold text-rhr-gold transition"
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Cartes QR Tables/Chambres</span>
          </button>
        </div>
      </div>

      {posError && (
        <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-4 flex items-center justify-between gap-3 text-xs font-extrabold text-red-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rhr-burgundy shrink-0" />
            <span>{posError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPosError(null)}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          VUE 1 : TERMINAL POINT DE VENTE HAUTE VÉLOCITÉ (2 ZONES ERGONOMIQUES)
      ===================================================================== */}
      {activeView === "TERMINAL" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -----------------------------------------------------------------
              ZONE GAUCHE (7 COLONNES) : FILTRES RAPIDES & GRILLE PRODUITS
          ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Barre de Filtres Rapides + Recherche */}
            <div className="rounded-2xl bg-white border border-gray-200 p-3.5 shadow-card space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "TOUS", label: "Tous" },
                    { id: "CUISINE_AFRICAINE", label: "Cuisine Africaine" },
                    { id: "GRILLADES_BRAISES", label: "Grillades & Braisés" },
                    {
                      id: "BOISSONS_FRAICHES_EAUX",
                      label: "Boissons Fraîches & Eaux",
                    },
                    { id: "BIERES_VINS", label: "Bières & Vins" },
                  ] as { id: PosFilterCategory; label: string }[]
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-xs font-extrabold transition whitespace-nowrap",
                      selectedCategory === cat.id
                        ? "bg-rhr-burgundy text-white shadow-sm"
                        : "bg-rhr-surface text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un plat braisé, kedjenou, bière Bock, Beaufort, Heineken..."
                  className="w-full rounded-xl border border-gray-200 bg-rhr-surface pl-10 pr-4 py-2 text-xs font-semibold text-rhr-dark focus:border-rhr-burgundy focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Grille des Cartes Produits avec Blocage Strict si Stock === 0 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {sellableProducts.map((item) => {
                const coreIngredient = item.linkedCoreIngredientId
                  ? inventory.find((c) => c.id === item.linkedCoreIngredientId)
                  : null;
                const effectiveStock = getEffectiveStock(item);
                const isOutOfStock = effectiveStock <= 0;
                const inCartLine = cart.find((c) => c.itemId === item.id);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "relative rounded-2xl border-2 p-4 flex flex-col justify-between transition-all",
                      isOutOfStock
                        ? "border-red-300 bg-gray-100/90 opacity-80 select-none"
                        : inCartLine
                          ? "border-rhr-burgundy bg-rhr-burgundy/[0.03] shadow-rhr"
                          : "border-gray-200 bg-white hover:border-rhr-burgundy/60 shadow-card"
                    )}
                  >
                    {/* Bandeau Rouge RUPTURE DE STOCK - VENTE BLOQUÉE si stock === 0 */}
                    {isOutOfStock && (
                      <div className="mb-2.5 rounded-xl bg-rhr-burgundy px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-white shadow flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <Ban className="h-3.5 w-3.5 shrink-0" />
                        <span>RUPTURE DE STOCK — VENTE BLOQUÉE</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-3xl shrink-0">{item.imageEmoji}</span>
                        <span
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-[11px] font-extrabold border whitespace-nowrap shrink-0",
                            isOutOfStock
                              ? "bg-red-100 text-red-800 border-red-300"
                              : effectiveStock <= item.alertThreshold
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          )}
                        >
                          Stock : {effectiveStock}{" "}
                          {coreIngredient ? coreIngredient.unit : "btl"}
                        </span>
                      </div>

                      <h3 className="font-black text-sm text-rhr-dark mt-2.5 leading-snug">
                        {item.name}
                      </h3>

                      <p className="text-[11px] text-gray-500 mt-1 truncate">
                        {coreIngredient
                          ? `Produit Phare : ${coreIngredient.name}`
                          : item.category}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-base font-black text-rhr-burgundy whitespace-nowrap">
                        {formatCFA(item.unitPrice)}
                      </span>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleAddToCart(item)}
                        className={cn(
                          "h-9 rounded-xl px-3.5 text-xs font-extrabold transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                          isOutOfStock
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-rhr-dark hover:bg-rhr-burgundy text-white active:scale-95 shadow-sm"
                        )}
                      >
                        {isOutOfStock ? (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            <span>Bloqué (0)</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>
                              Ajouter
                              {inCartLine ? ` (${inCartLine.quantity})` : ""}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* -----------------------------------------------------------------
              ZONE DROITE (5 COLONNES) : TICKET DE COMMANDE & ENCAISSEMENT
          ----------------------------------------------------------------- */}
          <div
            className={cn(
              "lg:col-span-5 xl:col-span-4 rounded-3xl bg-white border-2 border-gray-200 shadow-xl overflow-hidden lg:sticky lg:top-20",
              mobileCartOpen
                ? "fixed inset-x-3 bottom-3 top-16 z-50 overflow-y-auto"
                : ""
            )}
          >
            {/* En-tête du Panier : Sélection OBLIGATOIRE de la Serveuse */}
            <div className="bg-rhr-dark text-white p-5 border-b-4 border-rhr-burgundy space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-rhr-gold" />
                  <h2 className="text-base font-black">
                    Ticket de Commande POS
                  </h2>
                </div>
                {mobileCartOpen && (
                  <button
                    type="button"
                    onClick={() => setMobileCartOpen(false)}
                    className="lg:hidden rounded-lg bg-white/10 p-1.5 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* SÉLECTEUR OBLIGATOIRE DE SERVEUSE */}
              <div className="rounded-2xl bg-white/10 border border-white/15 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-rhr-gold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>1. Serveuse Responsable (Obligatoire) *</span>
                  </label>
                  {!selectedWaitressId && (
                    <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                      Requis
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {waitresses.map((w) => {
                    const isSelected = selectedWaitressId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setSelectedWaitressId(w.id)}
                        className={cn(
                          "rounded-xl py-2 px-2 text-xs font-extrabold transition truncate",
                          isSelected
                            ? "bg-rhr-burgundy text-white ring-2 ring-rhr-gold shadow"
                            : "bg-black/30 text-gray-300 hover:bg-white/15"
                        )}
                      >
                        {w.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emplacement Table / Comptoir */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                  Table ou Emplacement Client
                </label>
                <input
                  type="text"
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value)}
                  placeholder="Ex: Table 4 Terrasse, Paillote VIP..."
                  className="w-full rounded-xl border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-bold text-white focus:border-rhr-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Lignes du Ticket */}
            <div className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center space-y-2">
                  <UtensilsCrossed className="h-7 w-7 text-gray-300 mx-auto" />
                  <div className="text-xs font-bold text-gray-500">
                    Aucun article dans le ticket
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Cliquez sur les plats ou boissons à gauche pour composer la
                    commande.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cart.map((line) => (
                    <div
                      key={line.itemId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-rhr-surface p-2.5 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-rhr-dark truncate">
                          {line.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {formatCFA(line.unitPrice)} / u
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(line.itemId, -1)}
                          className="h-7 w-7 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center font-black text-rhr-dark">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(line.itemId, 1)}
                          className="h-7 w-7 rounded-lg border border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="w-20 text-right font-black text-rhr-burgundy shrink-0">
                        {formatCFA(line.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CHOIX DE LA DESTINATION / MODE DE RÈGLEMENT */}
              <div className="space-y-2.5 pt-2 border-t border-gray-200">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  2. Destination &amp; Mode de Règlement
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option 1 : Espèces */}
                  <button
                    type="button"
                    onClick={() => setSettlementCategory("ESPECES")}
                    className={cn(
                      "flex items-center justify-between rounded-xl border-2 p-3 text-left transition",
                      settlementCategory === "ESPECES"
                        ? "border-emerald-600 bg-emerald-50/70 text-emerald-950"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="text-xs font-extrabold">
                          1. Encaisser maintenant — Espèces
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Alimente le coffre Caisse Espèces Physique
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700">
                      Cash
                    </span>
                  </button>

                  {/* Option 2 : Mobile Money (Wave / Orange / MTN) */}
                  <div
                    className={cn(
                      "rounded-xl border-2 p-3 transition space-y-2",
                      settlementCategory === "MOBILE_MONEY"
                        ? "border-blue-600 bg-blue-50/50"
                        : "border-gray-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSettlementCategory("MOBILE_MONEY")}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-xs font-extrabold text-rhr-dark">
                            2. Encaisser maintenant — Mobile Money
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Wave • Orange Money • MTN MoMo
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-700">
                        {mobileMoneyProvider}
                      </span>
                    </button>

                    {settlementCategory === "MOBILE_MONEY" && (
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {(
                          [
                            { id: "WAVE", label: "Wave" },
                            { id: "ORANGE_MONEY", label: "Orange" },
                            { id: "MTN_MOMO", label: "MTN MoMo" },
                          ] as const
                        ).map((op) => (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setMobileMoneyProvider(op.id)}
                            className={cn(
                              "rounded-lg py-1.5 text-[11px] font-extrabold transition",
                              mobileMoneyProvider === op.id
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-blue-200 text-blue-800"
                            )}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Option 3 : Ajouter sur la Note d'une Chambre Occupée */}
                  <div
                    className={cn(
                      "rounded-xl border-2 p-3 transition space-y-2.5",
                      settlementCategory === "TRANSFERT_CHAMBRE"
                        ? "border-rhr-burgundy bg-rhr-burgundy/5"
                        : "border-gray-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSettlementCategory("TRANSFERT_CHAMBRE")}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <BedDouble className="h-4 w-4 text-rhr-burgundy" />
                        <div>
                          <div className="text-xs font-extrabold text-rhr-dark">
                            3. Ajouter sur la Note d&apos;une Chambre
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Transfert instantané vers le Folio Chambre Hôtel
                          </div>
                        </div>
                      </div>
                      <span className="rounded bg-rhr-burgundy/10 px-2 py-0.5 text-[10px] font-black text-rhr-burgundy">
                        {occupiedRooms.length} occupée(s)
                      </span>
                    </button>

                    {settlementCategory === "TRANSFERT_CHAMBRE" && (
                      <div>
                        {occupiedRooms.length === 0 ? (
                          <div className="rounded-lg bg-red-50 p-2 text-[11px] font-bold text-red-700">
                            Aucune chambre n&apos;est actuellement occupée.
                          </div>
                        ) : (
                          <select
                            value={selectedRoomNumberForTransfer}
                            onChange={(e) =>
                              setSelectedRoomNumberForTransfer(
                                Number(e.target.value)
                              )
                            }
                            className="w-full rounded-xl border border-rhr-burgundy bg-white px-3 py-2 text-xs font-extrabold text-rhr-dark focus:outline-none"
                          >
                            {occupiedRooms.map((r) => {
                              const st = stays.find(
                                (s) => s.id === r.currentStayId
                              );
                              return (
                                <option key={r.id} value={r.roomNumber}>
                                  Chambre {r.roomNumber} —{" "}
                                  {st?.guestName || "Client en séjour"} (
                                  {r.status === "OCCUPEE_PASSAGE_3H"
                                    ? "Passage 3H"
                                    : "Nuitée"}
                                  )
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total & Bouton de Validation */}
              <div className="rounded-2xl bg-rhr-dark text-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400 block">
                      Total à régler ({cartItemsCount} art.)
                    </span>
                    <span className="text-2xl font-black text-rhr-gold">
                      {formatCFA(cartTotal)}
                    </span>
                  </div>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="inline-flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-gray-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Vider</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!selectedWaitressId || cart.length === 0}
                  onClick={handleValidateOrder}
                  className={cn(
                    "w-full rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg",
                    !selectedWaitressId || cart.length === 0
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-rhr-burgundy hover:bg-rhr-burgundy-light text-white"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {!selectedWaitressId
                      ? "Sélectionnez une serveuse"
                      : settlementCategory === "TRANSFERT_CHAMBRE"
                        ? `Transférer (${formatCFA(
                          cartTotal
                        )}) sur Chambre ${selectedRoomNumberForTransfer}`
                        : `Valider & Encaisser (${formatCFA(cartTotal)})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 2 : RÉCEPTION DES COMMANDES QR CODE ENTRANTES EN TEMPS RÉEL
      ===================================================================== */}
      {activeView === "QR_INCOMING" && (
        <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                Réception Caisse Temps Réel
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-0.5">
                Commandes Clients issues du Scan QR Code (Tables &amp; Chambres)
              </h2>
              <p className="text-xs text-gray-500">
                Assignez la serveuse en charge de la table ou de la chambre,
                validez la préparation (décrémente le stock) et encaissez ou
                transférez sur le Folio Chambre.
              </p>
            </div>

            <Link
              href="/qr-menu"
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2.5 text-xs font-extrabold text-white transition"
            >
              <QrCode className="h-4 w-4 text-rhr-gold" />
              <span>Simuler une Commande Client sur /qr-menu</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {incomingQrOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
              <QrCode className="h-10 w-10 text-gray-300 mx-auto" />
              <div className="text-sm font-bold text-rhr-dark">
                Aucune commande QR en attente de traitement
              </div>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Dès qu&apos;un client passe commande depuis son téléphone sur{" "}
                <code className="font-mono font-bold text-rhr-burgundy">
                  /qr-menu
                </code>
                , elle s&apos;affiche instantanément ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {incomingQrOrders.map((qrOrd) => {
                const chosenWaitress =
                  qrWaitressMap[qrOrd.id] || waitresses[0]?.id || "";
                const chosenPayMode = qrPaymentMap[qrOrd.id] || "ESPECES";
                const chosenRoom =
                  qrRoomMap[qrOrd.id] || occupiedRooms[0]?.roomNumber || 1;

                return (
                  <div
                    key={qrOrd.id}
                    className="rounded-3xl border-2 border-amber-400 bg-white p-5 sm:p-6 shadow-card flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-4">
                      {/* En-tête de la carte QR */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap">
                            <BellRing className="h-3 w-3 shrink-0" />
                            <span>Nouvelle Commande QR</span>
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-rhr-dark mt-1.5 truncate">
                            {qrOrd.tableOrRoomLabel}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Réf #{qrOrd.orderNumber} • Reçue à{" "}
                            {formatDateTime(qrOrd.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block whitespace-nowrap">
                            Total Commande
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-rhr-burgundy whitespace-nowrap">
                            {formatCFA(qrOrd.totalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Détail des articles commandés par le client */}
                      <div className="rounded-2xl bg-rhr-surface/70 border border-gray-200 divide-y divide-gray-200/70 px-4 py-2">
                        {qrOrd.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 py-2 text-xs"
                          >
                            <span className="font-bold text-rhr-dark">
                              {it.quantity}x {it.name}
                            </span>
                            <span className="font-black text-rhr-dark whitespace-nowrap shrink-0">
                              {formatCFA(it.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Bloc Professionnel : 1. Serveuse Responsable & 2. Mode de Règlement (Parfaitement alignés sur 1 ligne) */}
                      <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-4 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
                          <div className="min-w-0">
                            <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5 whitespace-nowrap truncate">
                              <Users className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                              <span>1. Serveuse Responsable *</span>
                            </label>
                            <select
                              value={chosenWaitress}
                              onChange={(e) =>
                                setQrWaitressMap((prev) => ({
                                  ...prev,
                                  [qrOrd.id]: e.target.value,
                                }))
                              }
                              className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-3.5 text-xs font-extrabold text-rhr-dark shadow-sm focus:border-rhr-burgundy focus:outline-none transition"
                            >
                              {waitresses.map((w) => (
                                <option key={w.id} value={w.id}>
                                  Serveuse : {w.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="min-w-0">
                            <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-600 mb-1.5 whitespace-nowrap truncate">
                              <Wallet className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                              <span>2. Mode de Règlement *</span>
                            </label>
                            <select
                              value={chosenPayMode}
                              onChange={(e) =>
                                setQrPaymentMap((prev) => ({
                                  ...prev,
                                  [qrOrd.id]: e.target.value as
                                    | "ESPECES"
                                    | "WAVE"
                                    | "ORANGE_MONEY"
                                    | "MTN_MOMO"
                                    | "TRANSFERT_CHAMBRE",
                                }))
                              }
                              className="h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-3.5 text-xs font-extrabold text-rhr-dark shadow-sm focus:border-rhr-burgundy focus:outline-none transition"
                            >
                              <option value="ESPECES">
                                Encaisser — Espèces (Cash)
                              </option>
                              <option value="WAVE">
                                Encaisser — Wave Mobile Money
                              </option>
                              <option value="ORANGE_MONEY">
                                Encaisser — Orange Money
                              </option>
                              <option value="MTN_MOMO">
                                Encaisser — MTN MoMo
                              </option>
                              <option value="TRANSFERT_CHAMBRE">
                                Transférer sur Note de Chambre
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Boutons rapides de sélection du mode de règlement */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-200/80">
                          {(
                            [
                              { id: "ESPECES", label: "Espèces" },
                              { id: "WAVE", label: "Wave" },
                              { id: "ORANGE_MONEY", label: "Orange" },
                              { id: "MTN_MOMO", label: "MTN" },
                              {
                                id: "TRANSFERT_CHAMBRE",
                                label: "Note Chambre",
                              },
                            ] as const
                          ).map((mode) => {
                            const active = chosenPayMode === mode.id;
                            return (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() =>
                                  setQrPaymentMap((prev) => ({
                                    ...prev,
                                    [qrOrd.id]: mode.id,
                                  }))
                                }
                                className={cn(
                                  "h-8 rounded-lg px-2.5 text-[11px] font-extrabold transition whitespace-nowrap",
                                  active
                                    ? "bg-rhr-burgundy text-white shadow-sm"
                                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                                )}
                              >
                                {mode.label}
                              </button>
                            );
                          })}
                        </div>

                        {chosenPayMode === "TRANSFERT_CHAMBRE" && (
                          <div className="pt-1">
                            <label className="block text-[11px] font-extrabold text-rhr-burgundy mb-1.5 whitespace-nowrap">
                              Chambre occupée cible pour le transfert :
                            </label>
                            <select
                              value={chosenRoom}
                              onChange={(e) =>
                                setQrRoomMap((prev) => ({
                                  ...prev,
                                  [qrOrd.id]: Number(e.target.value),
                                }))
                              }
                              className="h-11 w-full rounded-xl border-2 border-rhr-burgundy bg-white px-3.5 text-xs font-extrabold text-rhr-dark focus:outline-none"
                            >
                              {occupiedRooms.map((r) => {
                                const st = stays.find(
                                  (s) => s.id === r.currentStayId
                                );
                                return (
                                  <option key={r.id} value={r.roomNumber}>
                                    Chambre {r.roomNumber} —{" "}
                                    {st?.guestName || "Client"}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barre d'actions inférieure : boutons alignés sur 1 seule ligne */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          cancelQrOrder(qrOrd.id);
                          fetch("/api/qr-sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "SYNC_FROM_POS",
                              resolvedOrderId: qrOrd.id,
                            }),
                          }).catch(() => { });
                        }}
                        className="h-11 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 px-4 text-xs font-bold text-gray-600 transition inline-flex items-center justify-center whitespace-nowrap"
                      >
                        Annuler
                      </button>

                      <button
                        type="button"
                        onClick={() => handleValidateIncomingQr(qrOrd)}
                        className="h-11 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-xs font-black uppercase tracking-wider text-white shadow-md transition inline-flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          Valider &amp; Encaisser ({formatCFA(qrOrd.totalAmount)})
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VUE 3 : RENDEMENT PAR SERVEUSE & HISTORIQUE DES COMMANDES
      ===================================================================== */}
      {activeView === "WAITRESS_STATS" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <h2 className="text-lg font-black text-rhr-dark flex items-center gap-2">
              <Users className="h-5 w-5 text-rhr-burgundy" />
              <span>
                Performance &amp; Responsabilité par Serveuse (Awa, Chantal,
                Clarisse, Marie, Direct Comptoir)
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {waitresses.map((w) => (
                <div
                  key={w.id}
                  className="rounded-2xl border border-gray-200 bg-rhr-surface p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-rhr-dark">
                      {w.name}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      {w.ordersCount} cmd
                    </span>
                  </div>
                  <div className="text-xl font-black text-rhr-burgundy">
                    {formatCFA(w.totalSalesAmount)}
                  </div>
                  <div className="text-[11px] text-gray-500">{w.phone}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <h2 className="text-base font-black text-rhr-dark">
              Journal des Commandes POS &amp; Transferts Chambres (
              {posOrders.length})
            </h2>
            <div className="space-y-3">
              {posOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-rhr-dark">
                        #{ord.orderNumber}
                      </span>
                      <span className="rounded-md bg-rhr-burgundy/10 px-2 py-0.5 text-[10px] font-extrabold text-rhr-burgundy">
                        Serveuse : {ord.waitressName}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                        {ord.tableOrRoomLabel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {ord.items
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(" + ")}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {formatDateTime(ord.createdAt)}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-rhr-dark">
                      {formatCFA(ord.totalAmount)}
                    </div>
                    <span
                      className={cn(
                        "inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase",
                        ord.status === "TRANSFEREE_CHAMBRE"
                          ? "bg-blue-100 text-blue-800"
                          : ord.status === "NOUVELLE_QR"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {ord.paymentMode.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 4 : LOCATION SALLE DE CÉRÉMONIE AU POSTE CAISSIÈRE BAR/RESTO
      ===================================================================== */}
      {activeView === "CEREMONIE_HALL" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                  <Sparkles className="h-4 w-4" />
                  Location de la Salle de Cérémonie — Caisse Bar / Resto
                </span>
                <h2 className="text-xl font-black text-rhr-dark mt-0.5">
                  Enregistrer une Location de Salle ou un Acompte (Depuis Janvier 2026)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Forfait de base : 50 000 FCFA (jusqu&apos;à 50 couverts inclus) +
                  supplément couverts + remise éventuelle. Alimente automatiquement
                  la ligne <strong>Location salle</strong> du Reporting Journalier.
                </p>
              </div>
              <Link
                href="/ceremonies"
                className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2.5 text-xs font-extrabold text-white transition"
              >
                <Sparkles className="h-4 w-4 text-rhr-gold" />
                <span>Ouvrir le Module Complet Cérémonies</span>
              </Link>
            </div>

            {ceremonyFeedback && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {ceremonyFeedback}
                </span>
                <button
                  type="button"
                  onClick={() => setCeremonyFeedback(null)}
                  className="text-emerald-700 hover:underline"
                >
                  Fermer
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ceremonyClientName.trim()) {
                  setPosError("Veuillez saisir le nom du client / organisateur.");
                  return;
                }
                const extraCovers = Math.max(0, ceremonyCovers - 50);
                const grossQuote = 50000 + extraCovers * ceremonyExtraCoverUnitPrice;
                const safeDiscount = Math.max(
                  0,
                  Math.min(ceremonyDiscount || 0, grossQuote)
                );
                const depositToRecord = Math.max(0, ceremonyDeposit || 0);

                createCeremonyBooking({
                  eventDate: ceremonyDate,
                  eventType: ceremonyEventType,
                  clientName: ceremonyClientName.trim(),
                  clientPhone: ceremonyClientPhone.trim() || "Non renseigné",
                  extraOrdinaryCovers: extraCovers,
                  extraVipCovers: 0,
                  customCateringLines: [],
                  customBeverageLines: [],
                  discountAmount: safeDiscount,
                  initialDepositAmount: depositToRecord,
                  initialDepositMethod: ceremonyPaymentMethod,
                  operationDateIso: `${ceremonyDate}T12:00:00.000Z`,
                  notes:
                    ceremonyNotes.trim() ||
                    `Location salle (${ceremonyEventType}) — ${ceremonyClientName.trim()}`,
                });

                setCeremonyFeedback(
                  `Location Salle enregistrée pour ${ceremonyClientName.trim()} (${ceremonyDate}) — Net: ${formatCFA(
                    grossQuote - safeDiscount
                  )} | Encaissé: ${formatCFA(depositToRecord)}.`
                );
                setCeremonyClientName("");
                setCeremonyClientPhone("");
                setCeremonyNotes("");
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
            >
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Date de l&apos;opération / Cérémonie
                </label>
                <input
                  type="date"
                  min="2026-01-01"
                  value={ceremonyDate}
                  onChange={(e) => setCeremonyDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Type d&apos;Événement
                </label>
                <select
                  value={ceremonyEventType}
                  onChange={(e) =>
                    setCeremonyEventType(
                      e.target.value as CeremonyBooking["eventType"]
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                >
                  <option value="MARIAGE">Mariage</option>
                  <option value="DOT">Dot / Cérémonie Coutumière</option>
                  <option value="BAPTEME">Baptême</option>
                  <option value="ANNIVERSAIRE">Anniversaire</option>
                  <option value="CONFERENCE">Conférence / Séminaire</option>
                  <option value="AUTRE">Autre Événement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Nom du Client / Organisateur
                </label>
                <input
                  type="text"
                  value={ceremonyClientName}
                  onChange={(e) => setCeremonyClientName(e.target.value)}
                  placeholder="Ex: Famille Kouassi / ONG..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-rhr-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Téléphone Client
                </label>
                <input
                  type="text"
                  value={ceremonyClientPhone}
                  onChange={(e) => setCeremonyClientPhone(e.target.value)}
                  placeholder="Ex: 07 00 00 00 00"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-rhr-dark"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Nombre de Couverts (50 inclus = 50 000 F)
                </label>
                <input
                  type="number"
                  min={1}
                  value={ceremonyCovers}
                  onChange={(e) =>
                    setCeremonyCovers(Math.max(1, Number(e.target.value) || 50))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-amber-800 mb-1">
                  Remise accordée (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={ceremonyDiscount || ""}
                  onChange={(e) =>
                    setCeremonyDiscount(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-emerald-800 mb-1">
                  Montant Encaissé Immédiatement (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={ceremonyDeposit}
                  onChange={(e) =>
                    setCeremonyDeposit(Math.max(0, Number(e.target.value) || 0))
                  }
                  className="w-full rounded-xl border border-emerald-300 bg-emerald-50/50 px-3 py-2 text-xs font-black text-emerald-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Mode de Règlement &amp; Observation
                </label>
                <div className="flex gap-2">
                  <select
                    value={ceremonyPaymentMethod}
                    onChange={(e) =>
                      setCeremonyPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="rounded-xl border border-gray-300 px-2.5 py-2 text-xs font-bold text-rhr-dark"
                  >
                    <option value="ESPECES">Espèces</option>
                    <option value="WAVE">Wave</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                  </select>
                  <input
                    type="text"
                    value={ceremonyNotes}
                    onChange={(e) => setCeremonyNotes(e.target.value)}
                    placeholder="Observation..."
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-rhr-dark"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-600">
                  Devis Brut :{" "}
                  <strong className="text-rhr-dark">
                    {formatCFA(
                      50000 +
                      Math.max(0, ceremonyCovers - 50) *
                      ceremonyExtraCoverUnitPrice
                    )}
                  </strong>{" "}
                  • Remise :{" "}
                  <strong className="text-amber-700">
                    -{formatCFA(ceremonyDiscount || 0)}
                  </strong>{" "}
                  • Net à payer :{" "}
                  <strong className="text-emerald-700 font-black">
                    {formatCFA(
                      Math.max(
                        0,
                        50000 +
                        Math.max(0, ceremonyCovers - 50) *
                        ceremonyExtraCoverUnitPrice -
                        (ceremonyDiscount || 0)
                      )
                    )}
                  </strong>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-black text-white shadow-rhr transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Enregistrer la Location de Salle en Caisse</span>
                </button>
              </div>
            </form>
          </div>

          {/* Liste des dossiers Salle de Cérémonie et encaissement de solde/acompte */}
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <h3 className="text-base font-black text-rhr-dark">
              Dossiers de Location Salle de Cérémonie ({ceremonies.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ceremonies.map((cer) => {
                const remainingBalance = Math.max(
                  0,
                  cer.totalAmount - cer.totalPaid
                );
                return (
                  <div
                    key={cer.id}
                    className="rounded-2xl border border-gray-200 bg-rhr-surface p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-md bg-rhr-burgundy/10 px-2 py-0.5 text-[10px] font-black text-rhr-burgundy">
                          {cer.eventType} • Date : {cer.eventDate}
                        </span>
                        <h4 className="text-sm font-black text-rhr-dark mt-1">
                          {cer.clientName} ({cer.clientPhone})
                        </h4>
                        <p className="text-[11px] text-gray-500">{cer.notes}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-black uppercase",
                          cer.status === "SOLDE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        )}
                      >
                        {cer.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          Total Devis
                        </span>
                        <strong className="font-black text-rhr-dark">
                          {formatCFA(cer.totalAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          Déjà Versé
                        </span>
                        <strong className="font-black text-emerald-700">
                          {formatCFA(cer.totalPaid)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          Reste à Payer
                        </span>
                        <strong className="font-black text-rhr-burgundy">
                          {formatCFA(remainingBalance)}
                        </strong>
                      </div>
                    </div>

                    {remainingBalance > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <input
                          type="number"
                          min={500}
                          step={500}
                          value={
                            ceremonyDepositAmountMap[cer.id] ?? remainingBalance
                          }
                          onChange={(e) =>
                            setCeremonyDepositAmountMap({
                              ...ceremonyDepositAmountMap,
                              [cer.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-28 rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                        />
                        <select
                          value={ceremonyDepositMethodMap[cer.id] || "ESPECES"}
                          onChange={(e) =>
                            setCeremonyDepositMethodMap({
                              ...ceremonyDepositMethodMap,
                              [cer.id]: e.target.value as PaymentMethod,
                            })
                          }
                          className="rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="ESPECES">Espèces</option>
                          <option value="WAVE">Wave</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="MTN_MOMO">MTN MoMo</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const amt =
                              ceremonyDepositAmountMap[cer.id] ??
                              remainingBalance;
                            const method =
                              ceremonyDepositMethodMap[cer.id] || "ESPECES";
                            if (amt > 0) {
                              addCeremonyDeposit({
                                ceremonyId: cer.id,
                                amount: amt,
                                method,
                                operationDateIso: `${cer.eventDate}T14:00:00.000Z`,
                              });
                              setCeremonyFeedback(
                                `Versement de ${formatCFA(amt)} enregistré pour ${cer.clientName}.`
                              );
                            }
                          }}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white transition"
                        >
                          Encaisser Versement
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VUE 5 : SAISIE DES OPÉRATIONS (DEPUIS JANV. 2026) & REPORTING JOURNALIER
      ===================================================================== */}
      {activeView === "DAILY_REPORTING" && <DailyReportingSheet />}

      {/* =====================================================================
          BARRE FLOTTANTE MOBILE POUR OUVRIR LE PANIER SUR SMARTPHONE
      ===================================================================== */}
      {activeView === "TERMINAL" && cart.length > 0 && !mobileCartOpen && (
        <div className="fixed bottom-4 inset-x-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="w-full rounded-2xl bg-rhr-burgundy text-white p-4 shadow-2xl flex items-center justify-between font-black text-sm"
          >
            <span>Voir Ticket ({cartItemsCount} articles)</span>
            <span>{formatCFA(cartTotal)} →</span>
          </button>
        </div>
      )}

      {/* =====================================================================
          MODAL TICKET DE CAISSE NUMÉRIQUE & WHATSAPP APRÈS VALIDATION POS
      ===================================================================== */}
      {lastCompletedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Commande Enregistrée &amp; Stock Décrémenté
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  Ticket #{lastCompletedOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLastCompletedOrder(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Serveuse responsable :</span>
                <strong className="text-rhr-burgundy">
                  {lastCompletedOrder.waitressName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Destination :</span>
                <strong className="text-rhr-dark">
                  {lastCompletedOrder.tableOrRoomLabel}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mode de règlement :</span>
                <strong className="text-emerald-700">
                  {lastCompletedOrder.paymentMode.replace(/_/g, " ")}
                </strong>
              </div>

              <div className="border-t border-gray-200 pt-2 space-y-1">
                {lastCompletedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold">
                      {formatCFA(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-black text-rhr-dark">
                <span>TOTAL TICKET</span>
                <span className="text-rhr-burgundy">
                  {formatCFA(lastCompletedOrder.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🍽️ *RHR — BAR & RESTAURANT M'BATTO*\nTicket : *#${lastCompletedOrder.orderNumber
                  }*\nServeuse : *${lastCompletedOrder.waitressName
                  }*\nEmplacement : ${lastCompletedOrder.tableOrRoomLabel
                  }\n----------------\n${lastCompletedOrder.items
                    .map(
                      (i) =>
                        `• ${i.quantity}x ${i.name} : ${formatCFA(i.subtotal)}`
                    )
                    .join("\n")}\n----------------\n*TOTAL : ${formatCFA(
                      lastCompletedOrder.totalAmount
                    )}* (${lastCompletedOrder.paymentMode.replace(/_/g, " ")})`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] px-3.5 py-2 text-xs font-extrabold text-white"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-rhr-dark"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimer Ticket</span>
              </button>

              <button
                type="button"
                onClick={() => setLastCompletedOrder(null)}
                className="rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-4 py-2 text-xs font-extrabold text-white"
              >
                Nouvelle Vente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Générateur de Cartes QR Imprimables */}
      <QrCodeCardsGeneratorModal
        open={qrGeneratorOpen}
        onClose={() => setQrGeneratorOpen(false)}
      />
    </div>
  );
}
