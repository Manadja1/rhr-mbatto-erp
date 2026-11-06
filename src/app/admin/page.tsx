"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Users,
  PackagePlus,
  Tag,
  Trash2,
  Edit3,
  Plus,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
  Phone,
  UserCheck,
  UserX,
  BedDouble,
  UtensilsCrossed,
  Wine,
  Snowflake,
  Save,
  X,
  Search,
  Sparkles,
} from "lucide-react";
import {
  useRhrStore,
  UserRole,
  RhrUser,
  InventoryItem,
  InventoryPole,
  RHR_CATALOG_EMOJIS,
} from "@/store/useRhrStore";
import { formatCFA, cn } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  PROPRIETAIRE: "Administrateur",
  COMPTABLE: "Expert Comptable & Audit",
  GERANT_HOTEL: "Gérant Réception Hôtel",
  CAISSIERE_BAR_RESTO: "Caissière Bar & Restaurant",
  CLIENT_QR: "Accès Client Menu QR",
};

export default function GeneralAdminPage() {
  const {
    currentUser,
    users,
    inventory,
    waitresses,
    rooms,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    createWaitress,
    deleteWaitress,
    updateRoomConfig,
  } = useRhrStore();

  const [activeTab, setActiveTab] = useState<
    "USERS" | "ARTICLES_PRICES" | "TEAM_ROOMS"
  >("USERS");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotice = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  // ===========================================================================
  // ÉTAT ONGLET 1 : GESTION DES COMPTES UTILISATEURS
  // ===========================================================================
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<RhrUser | null>(null);
  const [uFullName, setUFullName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uRole, setURole] = useState<UserRole>("GERANT_HOTEL");
  const [uPinCode, setUPinCode] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uPhone, setUPhone] = useState("+225 07 ");
  const [uMustChangeCredentials, setUMustChangeCredentials] = useState(true);

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUFullName("");
    setUEmail("");
    setURole("GERANT_HOTEL");
    setUPinCode("");
    setUPassword("");
    setUPhone("+225 07 ");
    setUMustChangeCredentials(true);
    setUserModalOpen(true);
  };

  const openEditUserModal = (u: RhrUser) => {
    setEditingUser(u);
    setUFullName(u.fullName);
    setUEmail(u.email);
    setURole(u.role);
    setUPinCode(u.pinCode);
    setUPassword(u.password || "");
    setUPhone(u.phone);
    setUMustChangeCredentials(Boolean(u.mustChangeCredentials));
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const res = updateUserAccount(editingUser.id, {
        fullName: uFullName,
        email: uEmail,
        role: uRole,
        pinCode: uPinCode,
        password: uPassword || editingUser.password,
        phone: uPhone,
        badgeLabel: ROLE_LABELS[uRole],
        mustChangeCredentials: uMustChangeCredentials,
      });
      if (!res.success) {
        showNotice("error", res.error || "Erreur lors de la mise à jour.");
        return;
      }
      showNotice("success", `Compte de ${uFullName} mis à jour avec succès.`);
      setUserModalOpen(false);
    } else {
      const res = createUserAccount({
        fullName: uFullName,
        email: uEmail,
        role: uRole,
        pinCode: uPinCode,
        password: uPassword || "rhr2026",
        phone: uPhone,
        badgeLabel: ROLE_LABELS[uRole],
        mustChangeCredentials: uMustChangeCredentials,
      });
      if (!res.success) {
        showNotice("error", res.error || "Erreur lors de la création.");
        return;
      }
      showNotice(
        "success",
        `Nouveau compte créé pour ${uFullName}. L'utilisateur pourra personnaliser son PIN et son mot de passe à sa 1ère connexion.`
      );
      setUserModalOpen(false);
    }
  };

  // ===========================================================================
  // ÉTAT ONGLET 2 : ARTICLES & CONFIGURATION DES PRIX DE VENTE
  // ===========================================================================
  const [searchItem, setSearchItem] = useState("");
  const [poleFilter, setPoleFilter] = useState<"ALL" | InventoryPole>("ALL");
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [iName, setIName] = useState("");
  const [iSku, setISku] = useState("");
  const [iPole, setIPole] = useState<InventoryPole>("PLAT_MENU");
  const [iCategory, setICategory] = useState("Grillades & Braisés");
  const [iPrice, setIPrice] = useState<number>(5000);
  const [iStock, setIStock] = useState<number>(15);
  const [iAlert, setIAlert] = useState<number>(5);
  const [iUnit, setIUnit] = useState("Plat");
  const [iLinkedCoreId, setILinkedCoreId] = useState<string>("");
  const [iAvailableQr, setIAvailableQr] = useState<boolean>(true);
  const [iEmoji, setIEmoji] = useState<string>("🍗");

  const coreProducts = inventory.filter((i) => i.pole === "CUISINE_PHARE");

  const filteredItems = inventory.filter((item) => {
    if (poleFilter !== "ALL" && item.pole !== poleFilter) return false;
    if (
      searchItem.trim() &&
      !item.name.toLowerCase().includes(searchItem.toLowerCase()) &&
      !item.category.toLowerCase().includes(searchItem.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const openCreateItemModal = (defaultPole: InventoryPole = "PLAT_MENU") => {
    setEditingItem(null);
    setIName("");
    setISku("");
    setIPole(defaultPole);
    setICategory(
      defaultPole === "BAR_BOISSON"
        ? "Bières & Pressions"
        : defaultPole === "PLAT_MENU"
        ? "Grillades & Braisés"
        : "Matière Première Phare"
    );
    setIPrice(
      defaultPole === "BAR_BOISSON"
        ? 1000
        : defaultPole === "PLAT_MENU"
        ? 6000
        : 0
    );
    setIStock(20);
    setIAlert(5);
    setIUnit(
      defaultPole === "BAR_BOISSON"
        ? "Bouteilles"
        : defaultPole === "PLAT_MENU"
        ? "Plat"
        : "Unités"
    );
    setILinkedCoreId(defaultPole === "PLAT_MENU" ? coreProducts[0]?.id || "" : "");
    setIAvailableQr(defaultPole !== "CUISINE_PHARE");
    setIEmoji(
      defaultPole === "BAR_BOISSON"
        ? "🍺"
        : defaultPole === "PLAT_MENU"
        ? "🍗"
        : "🐓"
    );
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIName(item.name);
    setISku(item.sku);
    setIPole(item.pole);
    setICategory(item.category);
    setIPrice(item.unitPrice);
    setIStock(item.stockQuantity);
    setIAlert(item.alertThreshold);
    setIUnit(item.unit);
    setILinkedCoreId(item.linkedCoreIngredientId || "");
    setIAvailableQr(item.isAvailableOnQr);
    setIEmoji(item.imageEmoji);
    setItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const res = updateInventoryItem(editingItem.id, {
        name: iName,
        sku: iSku,
        category: iCategory,
        unitPrice: iPole === "CUISINE_PHARE" ? 0 : iPrice,
        stockQuantity: iStock,
        alertThreshold: iAlert,
        unit: iUnit,
        linkedCoreIngredientId:
          iPole === "PLAT_MENU" && iLinkedCoreId ? iLinkedCoreId : undefined,
        isAvailableOnQr: iPole === "CUISINE_PHARE" ? false : iAvailableQr,
        imageEmoji: iEmoji,
      });
      if (!res.success) {
        showNotice("error", res.error || "Impossible de modifier l'article.");
        return;
      }
      showNotice("success", `Article "${iName}" mis à jour.`);
      setItemModalOpen(false);
    } else {
      const res = createInventoryItem({
        name: iName,
        sku: iSku,
        pole: iPole,
        category: iCategory,
        unitPrice: iPole === "CUISINE_PHARE" ? 0 : iPrice,
        stockQuantity: iStock,
        alertThreshold: iAlert,
        unit: iUnit,
        linkedCoreIngredientId:
          iPole === "PLAT_MENU" && iLinkedCoreId ? iLinkedCoreId : undefined,
        linkedCoreIngredientQty: 1,
        isAvailableOnQr: iPole === "CUISINE_PHARE" ? false : iAvailableQr,
        imageEmoji: iEmoji,
      });
      if (!res.success) {
        showNotice("error", res.error || "Impossible de créer l'article.");
        return;
      }
      showNotice("success", `Nouvel article "${iName}" ajouté au catalogue.`);
      setItemModalOpen(false);
    }
  };

  const handleQuickSavePrice = (item: InventoryItem) => {
    const rawVal = priceEdits[item.id];
    if (rawVal === undefined) return;
    const nextPrice = Math.max(0, Math.round(Number(rawVal) || 0));
    updateInventoryItem(item.id, { unitPrice: nextPrice });
    setPriceEdits((prev) => {
      const copy = { ...prev };
      delete copy[item.id];
      return copy;
    });
    showNotice(
      "success",
      `Prix de vente de "${item.name}" mis à jour à ${formatCFA(nextPrice)}.`
    );
  };

  // ===========================================================================
  // ÉTAT ONGLET 3 : SERVEUSES & CONFIGURATION DES 5 CHAMBRES
  // ===========================================================================
  const [newWaitressName, setNewWaitressName] = useState("");
  const [newWaitressPhone, setNewWaitressPhone] = useState("+225 07 ");

  const handleAddWaitress = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createWaitress({
      name: newWaitressName,
      phone: newWaitressPhone,
    });
    if (!res.success) {
      showNotice("error", res.error || "Erreur lors de l'ajout.");
      return;
    }
    setNewWaitressName("");
    setNewWaitressPhone("+225 07 ");
    showNotice("success", `Serveuse "${newWaitressName}" ajoutée à l'équipe.`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* EN-TÊTE ADMINISTRATEUR GÉNÉRAL */}
      <div className="rounded-3xl bg-gradient-to-r from-rhr-dark via-[#1B1E23] to-[#3A0805] text-white p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-rhr-gold/20 border border-rhr-gold/40 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-rhr-gold">
              <ShieldCheck className="h-4 w-4" />
              <span>Administrateur RHR</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Centre d&apos;Administration Générale &amp; Configuration
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-3xl leading-relaxed">
              Gérez en toute autonomie les comptes d&apos;utilisateurs et leurs
              codes PIN confidentiels, configurez les prix de vente des plats et
              boissons, ajoutez ou supprimez des articles, et supervisez le
              paramétrage des 5 chambres.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-gold hover:bg-rhr-gold-light px-4 py-2.5 text-xs font-black text-rhr-dark shadow transition"
            >
              <Plus className="h-4 w-4" />
              <span>Créer un Compte Utilisateur</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("ARTICLES_PRICES");
                openCreateItemModal("PLAT_MENU");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light border border-white/15 px-4 py-2.5 text-xs font-black text-white shadow-rhr transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Ajouter un Article / Plat</span>
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATION FEEDBACK */}
      {feedback && (
        <div
          className={cn(
            "flex items-center justify-between rounded-2xl border px-4 py-3 text-xs sm:text-sm font-bold shadow-sm",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-800"
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      )}

      {/* BARRE D'ONGLETS D'ADMINISTRATION */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("USERS")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition",
            activeTab === "USERS"
              ? "bg-rhr-burgundy text-white shadow-rhr"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <Users className="h-4 w-4" />
          <span>1. Comptes Utilisateurs &amp; Accès ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ARTICLES_PRICES")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition",
            activeTab === "ARTICLES_PRICES"
              ? "bg-rhr-burgundy text-white shadow-rhr"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <Tag className="h-4 w-4" />
          <span>
            2. Prix de Vente &amp; Catalogue Articles ({inventory.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TEAM_ROOMS")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition",
            activeTab === "TEAM_ROOMS"
              ? "bg-rhr-burgundy text-white shadow-rhr"
              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
          )}
        >
          <BedDouble className="h-4 w-4" />
          <span>3. Serveuses &amp; Chambres (Passage 3H Ch. 4 &amp; 5)</span>
        </button>
      </div>

      {/* =====================================================================
          ONGLET 1 : GESTION DES COMPTES D'UTILISATEURS
      ===================================================================== */}
      {activeTab === "USERS" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <div>
              <h2 className="text-lg font-black text-rhr-dark">
                Comptes Utilisateurs &amp; Codes PIN Confidentiels
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Seul l&apos;Administrateur peut visualiser, créer, modifier ou
                révoquer les accès du personnel.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2.5 text-xs font-bold text-white shadow-rhr transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Nouvel Utilisateur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isActive = u.isActive !== false;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "rounded-2xl border bg-white p-5 shadow-card flex flex-col justify-between space-y-4 transition",
                    !isActive
                      ? "border-red-200 bg-red-50/30 opacity-75"
                      : isSelf
                      ? "border-rhr-gold ring-2 ring-rhr-gold/20"
                      : "border-gray-200"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rhr-dark px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rhr-gold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {u.role === "PROPRIETAIRE"
                          ? "ADMINISTRATEUR"
                          : u.role.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isSelf && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            Votre session
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold",
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {isActive ? "Actif" : "Désactivé"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-rhr-dark">
                        {u.fullName}
                      </h3>
                      <p className="text-xs text-gray-500">{u.badgeLabel}</p>
                    </div>

                    <div className="rounded-xl bg-rhr-surface border border-gray-200 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          Email :
                        </span>
                        <span className="font-mono font-bold text-rhr-dark">
                          {u.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <KeyRound className="h-3.5 w-3.5 text-rhr-burgundy" />
                          Code PIN (4 chiffres) :
                        </span>
                        <span className="rounded bg-rhr-burgundy/10 px-2 py-0.5 font-mono font-black text-rhr-burgundy">
                          {u.pinCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          Téléphone :
                        </span>
                        <span className="font-semibold text-gray-700">
                          {u.phone}
                        </span>
                      </div>
                      {u.mustChangeCredentials && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                            <KeyRound className="h-3 w-3" />
                            1ère connexion : Changement PIN &amp; MDP actif
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openEditUserModal(u)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-bold text-rhr-dark transition"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-rhr-burgundy" />
                      <span>Modifier / PIN</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {!isSelf && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              updateUserAccount(u.id, { isActive: !isActive });
                              showNotice(
                                "success",
                                `Compte ${u.fullName} ${
                                  !isActive ? "réactivé" : "désactivé"
                                }.`
                              );
                            }}
                            title={
                              isActive
                                ? "Désactiver ce compte"
                                : "Réactiver ce compte"
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-bold transition",
                              isActive
                                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            )}
                          >
                            {isActive ? (
                              <UserX className="h-3.5 w-3.5" />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const res = deleteUserAccount(u.id);
                              if (!res.success) {
                                showNotice(
                                  "error",
                                  res.error || "Impossible de supprimer."
                                );
                              } else {
                                showNotice(
                                  "success",
                                  `Compte ${u.fullName} supprimé.`
                                );
                              }
                            }}
                            title="Supprimer ce compte"
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-2 text-xs font-bold text-red-700 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 2 : CATALOGUE ARTICLES & CONFIGURATION DES PRIX DE VENTE
      ===================================================================== */}
      {activeTab === "ARTICLES_PRICES" && (
        <div className="space-y-5">
          {/* Barre d'outils & Filtres Catalogue */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-rhr-dark">
                  Configuration des Prix de Vente &amp; Gestion des Articles
                </h2>
                <p className="text-xs text-gray-500">
                  Modifiez les prix de vente directement dans le tableau ou
                  ajoutez/supprimez des plats et boissons du Bar &amp;
                  Restaurant.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateItemModal("PLAT_MENU")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-3.5 py-2 text-xs font-bold text-white shadow-rhr transition"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>+ Nouveau Plat Menu</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateItemModal("BAR_BOISSON")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-black px-3.5 py-2 text-xs font-bold text-rhr-gold transition"
                >
                  <Wine className="h-3.5 w-3.5" />
                  <span>+ Nouvelle Boisson Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateItemModal("CUISINE_PHARE")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-rhr-dark transition"
                >
                  <Snowflake className="h-3.5 w-3.5 text-blue-600" />
                  <span>+ Produit Phare Cuisine</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: "Tous les articles" },
                  { id: "PLAT_MENU", label: "Plats du Menu" },
                  { id: "BAR_BOISSON", label: "Boissons Bar" },
                  { id: "CUISINE_PHARE", label: "Produits Phares (Stock)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setPoleFilter(tab.id as "ALL" | InventoryPole)
                    }
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                      poleFilter === tab.id
                        ? "bg-rhr-dark text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Rechercher un article, une boisson..."
                  className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-xs font-medium focus:border-rhr-burgundy focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tableau des Articles avec Édition Directe du Prix de Vente */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4">Article &amp; Catégorie</th>
                    <th className="py-3.5 px-4">Type / Pôle</th>
                    <th className="py-3.5 px-4">Stock Actuel</th>
                    <th className="py-3.5 px-4">Prix de Vente (FCFA)</th>
                    <th className="py-3.5 px-4">Menu QR</th>
                    <th className="py-3.5 px-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredItems.map((item) => {
                    const editedPrice = priceEdits[item.id];
                    const isDirty =
                      editedPrice !== undefined &&
                      Number(editedPrice) !== item.unitPrice;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/80 transition"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.imageEmoji}</span>
                            <div>
                              <div className="font-bold text-rhr-dark text-sm">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {item.category} • SKU:{" "}
                                <code className="font-mono">{item.sku}</code>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                              item.pole === "PLAT_MENU"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : item.pole === "BAR_BOISSON"
                                ? "bg-rose-50 text-rhr-burgundy border border-rose-200"
                                : "bg-blue-50 text-blue-800 border border-blue-200"
                            )}
                          >
                            {item.pole === "PLAT_MENU"
                              ? "Plat Menu"
                              : item.pole === "BAR_BOISSON"
                              ? "Boisson Bar"
                              : "Produit Phare"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "font-bold",
                              item.stockQuantity === 0
                                ? "text-red-600"
                                : "text-rhr-dark"
                            )}
                          >
                            {item.stockQuantity} {item.unit}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {item.pole === "CUISINE_PHARE" ? (
                            <span className="text-[11px] text-gray-400 italic">
                              Stock interne (Non vendu seul)
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={
                                  editedPrice !== undefined
                                    ? editedPrice
                                    : item.unitPrice
                                }
                                onChange={(e) =>
                                  setPriceEdits((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs font-black text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                              />
                              <span className="text-xs font-bold text-gray-500">
                                F
                              </span>
                              {isDirty && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickSavePrice(item)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition"
                                >
                                  <Save className="h-3 w-3" />
                                  <span>Appliquer</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.pole !== "CUISINE_PHARE" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateInventoryItem(item.id, {
                                  isAvailableOnQr: !item.isAvailableOnQr,
                                })
                              }
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border transition",
                                item.isAvailableOnQr
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-gray-100 text-gray-500 border-gray-200"
                              )}
                            >
                              {item.isAvailableOnQr ? "Visible QR" : "Masqué QR"}
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditItemModal(item)}
                              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-rhr-dark transition"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-rhr-burgundy" />
                              <span>Modifier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res = deleteInventoryItem(item.id);
                                if (!res.success) {
                                  showNotice(
                                    "error",
                                    res.error || "Suppression impossible."
                                  );
                                } else {
                                  showNotice(
                                    "success",
                                    `Article "${item.name}" supprimé.`
                                  );
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 3 : SERVEUSES & PARAMÉTRAGE DES 5 CHAMBRES (PASSAGE 3H CH. 4 & 5)
      ===================================================================== */}
      {activeTab === "TEAM_ROOMS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Configuration des 5 Chambres */}
          <div className="lg:col-span-7 rounded-2xl border border-gray-200 bg-white p-6 shadow-card space-y-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rhr-burgundy">
                Configuration Hôtelière RHR
              </span>
              <h2 className="text-lg font-black text-rhr-dark">
                Tarifs des 5 Chambres &amp; Règle du Passage 3H
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Conformément à vos directives, le Passage de 3H (5 000 F) est
                activé uniquement sur les Chambres 4 et 5.
              </p>
            </div>

            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-rhr-surface/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-rhr-dark">
                        {room.name}
                      </span>
                      <span className="rounded-md bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                        {room.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3">
                      <span>
                        Nuitée :{" "}
                        <strong className="text-rhr-dark">
                          {formatCFA(room.nightPrice)}
                        </strong>
                      </span>
                      <span>•</span>
                      {room.allowPassage3h ? (
                        <span className="text-amber-700 font-bold">
                          Passage 3H autorisé ({formatCFA(room.passagePrice)})
                        </span>
                      ) : (
                        <span className="text-gray-500 font-semibold">
                          Nuitée uniquement (Passage 3H désactivé)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-gray-500">
                        Nuitée:
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={room.nightPrice}
                        onChange={(e) =>
                          updateRoomConfig(room.id, {
                            nightPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold text-rhr-dark"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextAllow = !room.allowPassage3h;
                        updateRoomConfig(room.id, {
                          allowPassage3h: nextAllow,
                          passagePrice: nextAllow ? 5000 : 0,
                        });
                        showNotice(
                          "success",
                          `Chambre ${room.roomNumber} : Passage 3H ${
                            nextAllow ? "activé (5 000 F)" : "désactivé"
                          }.`
                        );
                      }}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-extrabold border transition",
                        room.allowPassage3h
                          ? "bg-amber-50 border-amber-300 text-amber-900"
                          : "bg-gray-100 border-gray-200 text-gray-500"
                      )}
                    >
                      {room.allowPassage3h
                        ? "Passage 3H : OUI"
                        : "Passage 3H : NON"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gestion des Serveuses */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-card space-y-5">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rhr-burgundy">
                Équipe Bar &amp; Restaurant
              </span>
              <h2 className="text-lg font-black text-rhr-dark">
                Serveuses Actives ({waitresses.length})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Ajoutez ou retirez une serveuse pour l&apos;attribution
                obligatoire au POS.
              </p>
            </div>

            <form onSubmit={handleAddWaitress} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={newWaitressName}
                  onChange={(e) => setNewWaitressName(e.target.value)}
                  placeholder="Prénom de la serveuse"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={newWaitressPhone}
                  onChange={(e) => setNewWaitressPhone(e.target.value)}
                  placeholder="Téléphone"
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-2.5 text-xs font-bold text-white shadow-rhr transition"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter la Serveuse</span>
              </button>
            </form>

            <div className="divide-y divide-gray-100 border-t border-gray-100 pt-2">
              {waitresses.map((w) => (
                <div
                  key={w.id}
                  className="py-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-sm text-rhr-dark">
                      {w.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {w.phone} • {w.ordersCount} cmd ({formatCFA(w.totalSalesAmount)})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = deleteWaitress(w.id);
                      if (!res.success) {
                        showNotice("error", res.error || "Erreur.");
                      } else {
                        showNotice("success", `Serveuse ${w.name} supprimée.`);
                      }
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 p-2 text-red-700 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CRÉATION / ÉDITION D'UN COMPTE UTILISATEUR
      ===================================================================== */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rhr-burgundy">
                  Administration des Accès RHR
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  {editingUser
                    ? `Modifier le compte : ${editingUser.fullName}`
                    : "Créer un nouveau compte utilisateur"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nom complet &amp; Fonction
                </label>
                <input
                  type="text"
                  required
                  value={uFullName}
                  onChange={(e) => setUFullName(e.target.value)}
                  placeholder="Ex: Kouadio Marc — Gérant Hôtel"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rôle RBAC dans l&apos;ERP
                  </label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  >
                    <option value="PROPRIETAIRE">Administrateur</option>
                    <option value="COMPTABLE">Expert Comptable &amp; Audit</option>
                    <option value="GERANT_HOTEL">Gérant Hôtel (5 Chambres)</option>
                    <option value="CAISSIERE_BAR_RESTO">
                      Caissière Bar &amp; Restaurant
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={uPhone}
                    onChange={(e) => setUPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adresse Email de connexion
                </label>
                <input
                  type="email"
                  required
                  value={uEmail}
                  onChange={(e) => setUEmail(e.target.value)}
                  placeholder="agent@rhr-mbatto.ci"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Code PIN Personnel (4 chiffres)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={uPinCode}
                    onChange={(e) =>
                      setUPinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="Ex: 5566"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 font-mono text-sm font-black tracking-widest text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <input
                    type="text"
                    required
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    placeholder="Mot de passe secret"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-bold text-amber-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uMustChangeCredentials}
                  onChange={(e) => setUMustChangeCredentials(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-rhr-burgundy focus:ring-rhr-burgundy"
                />
                <span>
                  Permettre / demander à cet utilisateur de modifier son Code
                  PIN et son Mot de passe dès sa première connexion
                </span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-bold text-white shadow-rhr transition"
                >
                  {editingUser
                    ? "Enregistrer les modifications"
                    : "Créer le compte"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CRÉATION / ÉDITION D'UN ARTICLE ET DE SON PRIX DE VENTE
      ===================================================================== */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rhr-burgundy">
                  Catalogue &amp; Tarification RHR
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  {editingItem
                    ? `Modifier : ${editingItem.name}`
                    : "Ajouter un nouvel article au catalogue"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Type d&apos;Article (Pôle)
                  </label>
                  <select
                    value={iPole}
                    disabled={!!editingItem}
                    onChange={(e) => {
                      const nextPole = e.target.value as InventoryPole;
                      setIPole(nextPole);
                      if (nextPole === "BAR_BOISSON") {
                        setICategory("Bières & Pressions");
                        setIUnit("Bouteilles");
                        setIEmoji("🍺");
                      } else if (nextPole === "PLAT_MENU") {
                        setICategory("Grillades & Braisés");
                        setIUnit("Plat");
                        setIEmoji("🍗");
                      } else {
                        setICategory("Matière Première Phare");
                        setIUnit("Unités");
                        setIEmoji("🐓");
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark"
                  >
                    <option value="PLAT_MENU">
                      Plat du Menu (Cuisine / Grillades)
                    </option>
                    <option value="BAR_BOISSON">
                      Boisson Bar (Suivi Bouteille)
                    </option>
                    <option value="CUISINE_PHARE">
                      Produit Phare Cuisine (Congélateur)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Icône / Emoji (Liste)
                  </label>
                  <select
                    value={iEmoji}
                    onChange={(e) => setIEmoji(e.target.value)}
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
              </div>

              {/* Sélecteur visuel rapide d'icône/emoji */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                  <span>Choix rapide d&apos;icône / emoji :</span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2 py-0.5 text-xs font-black text-rhr-dark">
                    Sélectionné : <span className="text-base">{iEmoji}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {RHR_CATALOG_EMOJIS.map((em) => {
                    const active = iEmoji === em.emoji;
                    return (
                      <button
                        key={`${em.group}-${em.emoji}`}
                        type="button"
                        onClick={() => setIEmoji(em.emoji)}
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

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Désignation de l&apos;article
                </label>
                <input
                  type="text"
                  required
                  value={iName}
                  onChange={(e) => setIName(e.target.value)}
                  placeholder="Ex: Kedjenou de Poulet Royal + Attiéké"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-medium focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    required
                    value={iCategory}
                    onChange={(e) => setICategory(e.target.value)}
                    placeholder="Ex: Grillades & Braisés"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Code SKU (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={iSku}
                    onChange={(e) => setISku(e.target.value)}
                    placeholder="Auto-généré si vide"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              {iPole !== "CUISINE_PHARE" && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5">
                  <label className="block text-xs font-extrabold text-amber-950 mb-1">
                    Prix de Vente Unitaire Officiel (FCFA)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      required
                      value={iPrice}
                      onChange={(e) => setIPrice(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 font-mono text-base font-black text-rhr-dark"
                    />
                    <span className="text-sm font-black text-amber-900">
                      FCFA
                    </span>
                  </div>
                </div>
              )}

              {iPole === "PLAT_MENU" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Produit Phare rattaché (Décrémentation automatique du stock)
                  </label>
                  <select
                    value={iLinkedCoreId}
                    onChange={(e) => setILinkedCoreId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
                  >
                    <option value="">
                      -- Aucun produit phare lié (Stock autonome) --
                    </option>
                    {coreProducts.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.imageEmoji} {cp.name} (Stock actuel :{" "}
                        {cp.stockQuantity} {cp.unit})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Stock initial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={iStock}
                    onChange={(e) => setIStock(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Seuil d&apos;alerte
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={iAlert}
                    onChange={(e) => setIAlert(Number(e.target.value) || 1)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Unité
                  </label>
                  <input
                    type="text"
                    value={iUnit}
                    onChange={(e) => setIUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {iPole !== "CUISINE_PHARE" && (
                <label className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={iAvailableQr}
                    onChange={(e) => setIAvailableQr(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-rhr-burgundy focus:ring-rhr-burgundy"
                  />
                  <span>
                    Afficher cet article sur le Menu QR Client (Table &amp;
                    Chambre)
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-bold text-white shadow-rhr transition"
                >
                  {editingItem ? "Enregistrer" : "Ajouter l'article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

