"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BedDouble,
  UtensilsCrossed,
  PackageSearch,
  Sparkles,
  Receipt,
  Building,
  Lock,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  QrCode,
  ShieldAlert,
  Users,
  KeyRound,
  Menu,
  X,
  CheckCircle2,
  Clock,
  CloudUpload,
  Settings,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";
import {
  useRhrStore,
  RHR_ROUTES,
  UserRole,
  getDefaultRouteForRole,
  isRouteAllowedForRole,
} from "@/store/useRhrStore";
import { cn } from "@/lib/utils";

const ROUTE_ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/admin": Settings,
  "/hotel": BedDouble,
  "/pos": UtensilsCrossed,
  "/inventory": PackageSearch,
  "/ceremonies": Sparkles,
  "/expenses": Receipt,
  "/fixed-costs": Building,
  "/closures": KeyRound,
  "/qr-menu": QrCode,
};

const ROLE_BADGE_STYLES: Record<
  UserRole,
  { bg: string; text: string; label: string }
> = {
  PROPRIETAIRE: {
    bg: "bg-rhr-gold/20 border-rhr-gold/50",
    text: "text-rhr-gold",
    label: "ADMINISTRATEUR",
  },
  COMPTABLE: {
    bg: "bg-amber-500/20 border-amber-400/40",
    text: "text-amber-300",
    label: "COMPTABLE",
  },
  GERANT_HOTEL: {
    bg: "bg-blue-500/20 border-blue-400/40",
    text: "text-blue-300",
    label: "GÉRANT HÔTEL",
  },
  CAISSIERE_BAR_RESTO: {
    bg: "bg-rose-500/20 border-rose-400/40",
    text: "text-rose-200",
    label: "CAISSIÈRE BAR/RESTO",
  },
  CLIENT_QR: {
    bg: "bg-emerald-500/20 border-emerald-400/40",
    text: "text-emerald-300",
    label: "CLIENT QR",
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentUser,
    isLocked,
    isOnline,
    isSyncing,
    syncQueue,
    rooms,
    posOrders,
    inventory,
    setOnlineStatus,
    simulateOfflineActionDemo,
    lockSession,
    unlockSessionWithPin,
    changeOwnCredentials,
    updateUserAccount,
    loginWithPin,
    logout,
    pullRemoteData,
  } = useRhrStore();

  const [mounted, setMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchTargetRole, setSwitchTargetRole] =
    useState<UserRole>("PROPRIETAIRE");
  const [switchPin, setSwitchPin] = useState("");
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState(false);

  // Modal de modification du Code PIN & Mot de passe (Automatique à la 1ère connexion d'un nouvel utilisateur)
  const [manualCredentialsModalOpen, setManualCredentialsModalOpen] =
    useState(false);
  const [newPersonalPin, setNewPersonalPin] = useState("");
  const [newPersonalPassword, setNewPersonalPassword] = useState("");
  const [confirmPersonalPassword, setConfirmPersonalPassword] = useState("");
  const [credError, setCredError] = useState<string | null>(null);
  const [credSuccessBanner, setCredSuccessBanner] = useState<string | null>(
    null
  );

  useEffect(() => {
    setMounted(true);
    // Nettoyer les anciens caches obsolètes rhr-mbatto-erp-storage-v2.x sur les nouveaux terminaux
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("rhr-mbatto-erp-storage-v2.7");
        window.localStorage.removeItem("rhr-mbatto-erp-storage-v2.6");
        window.localStorage.removeItem("rhr-mbatto-erp-storage-v2.5");
        window.localStorage.removeItem("rhr-mbatto-erp-storage-v2");
        window.localStorage.removeItem("rhr-mbatto-erp-storage");
      } catch { }
    }
    // Récupérer les données réelles depuis le serveur/Supabase dès le montage
    pullRemoteData();
  }, [pullRemoteData]);

  // Écouteur temps réel des événements navigateur online / offline + synchronisation inter-onglets (Prix & Stocks)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rhr-mbatto-erp-storage-v3.0") {
        const storeWithPersist = useRhrStore as unknown as {
          persist?: { rehydrate: () => void | Promise<void> };
        };
        storeWithPersist.persist?.rehydrate();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [setOnlineStatus]);

  // Guard d'authentification obligatoire (Sauf /login et /qr-menu)
  useEffect(() => {
    if (!mounted) return;
    if (pathname === "/login") return;
    if (!currentUser && pathname !== "/qr-menu") {
      router.replace("/login");
    }
  }, [mounted, currentUser, pathname, router]);

  // Si on est sur /login, on affiche la page de connexion plein écran sans le shell
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Pendant l'hydratation initiale Zustand
  if (!mounted) {
    return (
      <div className="min-h-screen bg-rhr-dark flex flex-col items-center justify-center text-white p-6">
        <RhrLogo size="lg" variant="dark" showTextSide />
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <RefreshCw className="h-4 w-4 animate-spin text-rhr-gold" />
          <span>Initialisation du moteur Offline-First RHR...</span>
        </div>
      </div>
    );
  }

  // Si non connecté et pas sur /qr-menu
  if (!currentUser && pathname !== "/qr-menu") {
    return null;
  }

  // Si un client ouvre /qr-menu sur son téléphone (sans session employé),
  // on affiche directement le terminal Menu Client plein écran (sans la barre latérale ERP)
  if (!currentUser && pathname === "/qr-menu") {
    return (
      <div className="min-h-screen w-full overflow-y-auto bg-rhr-surface text-rhr-dark p-3 sm:p-6">
        {children}
      </div>
    );
  }

  // Filtrage strict des routes selon le rôle RBAC de l'utilisateur connecté
  const activeRole: UserRole = currentUser?.role || "CLIENT_QR";
  const allowedRoutes = RHR_ROUTES.filter((r) =>
    r.allowedRoles.includes(activeRole)
  );
  const isAuthorized = isRouteAllowedForRole(pathname, activeRole);

  // Compteurs dynamiques pour les badges de navigation
  const occupiedRoomsCount = rooms.filter(
    (r) => r.status === "OCCUPEE_NUITEE" || r.status === "OCCUPEE_PASSAGE_3H"
  ).length;
  const activeOrdersCount = posOrders.filter(
    (o) => o.status === "NOUVELLE_QR" || o.status === "EN_PREPARATION"
  ).length;
  const outOfStockCount = inventory.filter(
    (i) => i.stockQuantity === 0
  ).length;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockSessionWithPin(unlockPin)) {
      setUnlockPin("");
      setUnlockError(false);
    } else {
      setUnlockError(true);
      setUnlockPin("");
    }
  };

  const handleSwitchSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError(null);
    const res = loginWithPin(switchPin, switchTargetRole);
    if (res.success && res.user) {
      setSwitchPin("");
      setSwitchModalOpen(false);
      router.push(getDefaultRouteForRole(res.user.role));
    } else {
      setSwitchError(
        res.error || "Code PIN incorrect pour ce poste. Accès refusé."
      );
      setSwitchPin("");
    }
  };

  const handleCredentialsChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError(null);
    if (newPersonalPassword !== confirmPersonalPassword) {
      setCredError("Les deux mots de passe saisis ne correspondent pas.");
      return;
    }
    const res = changeOwnCredentials({
      newPinCode: newPersonalPin,
      newPassword: newPersonalPassword,
    });
    if (!res.success) {
      setCredError(res.error || "Impossible de mettre à jour vos identifiants.");
      return;
    }
    setNewPersonalPin("");
    setNewPersonalPassword("");
    setConfirmPersonalPassword("");
    setManualCredentialsModalOpen(false);
    setCredSuccessBanner(
      "Votre nouveau Code PIN et votre nouveau Mot de passe personnel ont été enregistrés avec succès !"
    );
    setTimeout(() => setCredSuccessBanner(null), 5000);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex bg-rhr-surface text-rhr-dark relative">
      {/* Fond sombre cliquable sur mobile/tablette lorsque le menu latéral est ouvert */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* =====================================================================
          SIDEBAR LATÉRALE NOIR CHARBON (#111315) AVEC NAVIGATION FILTRÉE RBAC
      ===================================================================== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] h-full shrink-0 bg-rhr-dark text-white flex flex-col justify-between border-r border-white/10 transition-transform duration-200 lg:static lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Haut de Sidebar : Identité RHR */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link
            href={getDefaultRouteForRole(activeRole)}
            className="focus:outline-none"
          >
            <RhrLogo size="sm" variant="dark" showTextSide />
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Carte Utilisateur Connecté & Audit Trail */}
        {currentUser && (
          <div className="px-4 py-3.5 bg-white/[0.04] border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase",
                  ROLE_BADGE_STYLES[currentUser.role].bg,
                  ROLE_BADGE_STYLES[currentUser.role].text
                )}
              >
                <UserCheck className="h-3 w-3" />
                {ROLE_BADGE_STYLES[currentUser.role].label}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCredError(null);
                  setNewPersonalPin("");
                  setNewPersonalPassword("");
                  setConfirmPersonalPassword("");
                  setManualCredentialsModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[10px] font-bold text-rhr-gold transition whitespace-nowrap"
              >
                <KeyRound className="h-3 w-3" />
                <span>Mon PIN / MDP</span>
              </button>
            </div>
            <div>
              <div className="font-bold text-sm text-white truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                {currentUser.email}
              </div>
            </div>
          </div>
        )}

        {/* Liste des modules autorisés pour ce rôle */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
            Modules Autorisés ({allowedRoutes.length})
          </div>
          {allowedRoutes.map((route) => {
            const Icon = ROUTE_ICONS[route.href] || LayoutDashboard;
            const isActive =
              pathname === route.href || pathname.startsWith(`${route.href}/`);

            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-rhr-burgundy text-white shadow-rhr"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-rhr-gold"
                        : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  <span className="truncate">{route.label}</span>
                </div>

                {route.href === "/hotel" && (
                  <span className="ml-2 rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[11px] font-bold text-blue-200">
                    {occupiedRoomsCount}/5
                  </span>
                )}
                {route.href === "/pos" && activeOrdersCount > 0 && (
                  <span className="ml-2 rounded-full bg-rhr-gold/20 border border-rhr-gold/40 px-2 py-0.5 text-[11px] font-bold text-rhr-gold">
                    {activeOrdersCount}
                  </span>
                )}
                {route.href === "/inventory" && outOfStockCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-500/30 border border-red-400/40 px-2 py-0.5 text-[10px] font-extrabold text-red-200">
                    {outOfStockCount} Rupture
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pied de Sidebar : Verrouillage rapide & Déconnexion */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-black/20">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={lockSession}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-bold text-gray-200 transition"
            >
              <Lock className="h-3.5 w-3.5 text-rhr-gold" />
              <span>Verrouiller</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSwitchPin("");
                setSwitchError(null);
                setSwitchModalOpen(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-bold text-gray-200 transition"
            >
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              <span>Changer Poste</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rhr-burgundy/90 hover:bg-rhr-burgundy px-3 py-2 text-xs font-bold text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Déconnexion (/login)</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          COLONNE PRINCIPALE : BARRE D'ÉTAT SUPÉRIEURE + CONTENU SÉCURISÉ
      ===================================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* BARRE D'ÉTAT SUPÉRIEURE PERMANENTE */}
        <header className="shrink-0 z-20 bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            {/* Gauche : Bouton Menu Mobile + Indicateur Utilisateur & Rôle */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Ouvrir le menu de navigation"
                className="lg:hidden rounded-xl border border-gray-200 p-2 text-rhr-dark hover:bg-gray-100 shrink-0"
              >
                <Menu className="h-5 w-5" />
              </button>

              {currentUser && (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="hidden sm:flex h-9 w-9 rounded-xl bg-rhr-dark text-rhr-gold items-center justify-center font-black text-sm shrink-0">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-extrabold text-rhr-dark truncate max-w-[145px] sm:max-w-none">
                        {currentUser.fullName}
                      </span>
                      <span className="rounded-md bg-rhr-burgundy px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-white shrink-0">
                        {ROLE_BADGE_STYLES[currentUser.role].label}
                      </span>
                    </div>
                    <div className="hidden md:flex text-[11px] text-gray-500 items-center gap-2">
                      <span>
                        Signature Audit :{" "}
                        <code className="font-mono font-bold text-rhr-dark">
                          createdBy={currentUser.id}
                        </code>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Droite : Statut Réseau Offline-First + File d'attente SyncQueue + Actions Session */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Badge Statut Réseau (En ligne / Hors-ligne) interactif */}
              <div
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold transition",
                  isOnline
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                )}
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 shrink-0" />
                    <span className="hidden sm:inline">En ligne (M&apos;Batto)</span>
                    <span className="sm:hidden">En ligne</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 animate-pulse shrink-0" />
                    <span className="hidden sm:inline">Mode Hors-Ligne Actif</span>
                    <span className="sm:hidden">Hors-Ligne</span>
                  </>
                )}

                <span className="hidden sm:inline text-gray-300">|</span>

                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px]">
                  <CloudUpload className="h-3.5 w-3.5" />
                  <span>{syncQueue.length} en attente</span>
                </span>
              </div>

              {/* Bouton test / bascule Offline-First & Synchronisation */}
              {isOnline ? (
                <button
                  type="button"
                  onClick={simulateOfflineActionDemo}
                  title="Simuler une coupure internet à M'Batto avec opération en file d'attente"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                >
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                  <span>Tester Hors-Ligne</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOnlineStatus(true)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                  />
                  <span>
                    {isSyncing
                      ? "Synchro..."
                      : `Reconnecter & Synchro (${syncQueue.length})`}
                  </span>
                </button>
              )}

              {/* Bouton d'installation PWA Intelligent (Android / Chrome PC / iOS Safari) */}
              <PwaInstaller variant="header" />

              {/* Bouton Changement sécurisé de session */}
              <button
                type="button"
                onClick={() => {
                  setSwitchPin("");
                  setSwitchError(null);
                  setSwitchModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-bold text-rhr-dark transition"
              >
                <Users className="h-3.5 w-3.5 text-rhr-burgundy" />
                <span className="hidden sm:inline">Changer de Session</span>
              </button>

              {/* Bouton Lock Screen */}
              <button
                type="button"
                onClick={lockSession}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-3 py-1.5 text-xs font-bold text-white transition"
              >
                <Lock className="h-3.5 w-3.5 text-rhr-gold" />
                <span className="hidden sm:inline">Verrouiller Écran</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE OU BOUCLIER D'INTERDICTION RBAC STRICT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 scroll-smooth">
          {credSuccessBanner && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{credSuccessBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setCredSuccessBanner(null)}
                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {!isAuthorized ? (
            <div className="max-w-xl mx-auto my-12 rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-card space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-rhr-burgundy border border-red-200">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                  Protection RBAC Stricte — Accès Refusé
                </span>
                <h2 className="text-2xl font-black text-rhr-dark">
                  Zone Réservée — Droits Insuffisants
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Votre session actuelle (
                  <strong className="text-rhr-dark">
                    {currentUser?.fullName}
                  </strong>{" "}
                  — rôle{" "}
                  <code className="font-mono font-bold text-rhr-burgundy">
                    {currentUser?.role}
                  </code>
                  ) n&apos;est pas autorisée à consulter le module{" "}
                  <code className="font-mono font-bold">{pathname}</code> selon
                  la charte de sécurité RHR.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(getDefaultRouteForRole(activeRole))
                  }
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-bold text-white shadow-rhr transition"
                >
                  Retourner à mon espace ({getDefaultRouteForRole(activeRole)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwitchPin("");
                    setSwitchError(null);
                    setSwitchModalOpen(true);
                  }}
                  className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-5 py-2.5 text-xs font-bold text-rhr-dark transition"
                >
                  Changer d&apos;utilisateur
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL 1 : VERROUILLAGE D'ÉCRAN (LOCK SCREEN PAR CODE PIN CONFIDENTIEL)
      ===================================================================== */}
      {isLocked && currentUser && (
        <div className="fixed inset-0 z-50 bg-rhr-dark/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-white/15 bg-[#181B1F] p-7 text-white shadow-2xl space-y-6 text-center">
            <div className="mx-auto flex justify-center">
              <RhrLogo size="md" variant="dark" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-rhr-gold/20 border border-rhr-gold/40 px-3 py-0.5 text-[11px] font-bold text-rhr-gold">
                <Lock className="h-3 w-3" />
                <span>Poste Verrouillé Temporairement</span>
              </div>
              <h3 className="text-xl font-black text-white pt-1">
                {currentUser.fullName}
              </h3>
              <p className="text-xs text-gray-400">
                Saisissez votre Code PIN personnel à 4 chiffres pour
                déverrouiller l&apos;écran.
              </p>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={unlockPin}
                onChange={(e) => {
                  setUnlockError(false);
                  setUnlockPin(e.target.value);
                }}
                placeholder="••••"
                className="w-44 mx-auto block text-center tracking-[0.6em] text-2xl font-black rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-white focus:border-rhr-gold focus:outline-none"
              />
              {unlockError && (
                <p className="text-xs font-bold text-red-400">
                  Code PIN incorrect pour {currentUser.fullName}.
                </p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 py-2.5 text-xs font-bold text-gray-300 transition"
                >
                  Fermer la session
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-2.5 text-xs font-bold text-white shadow-rhr transition"
                >
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2 : CHANGEMENT SÉCURISÉ DE SESSION (AUTHENTIFICATION PIN OBLIGATOIRE)
      ===================================================================== */}
      {switchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rhr-burgundy">
                  Changement Sécurisé de Poste
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  Authentification requise (Code PIN personnel)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sélectionnez votre poste et saisissez votre code PIN secret.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwitchModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSwitchSessionSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                  1. Poste d&apos;accès souhaité
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      role: "PROPRIETAIRE" as UserRole,
                      label: "Administrateur",
                      desc: "Direction, Comptes & Prix",
                    },
                    {
                      role: "COMPTABLE" as UserRole,
                      label: "Expert Comptable",
                      desc: "Audit, Trésorerie & Clôtures",
                    },
                    {
                      role: "GERANT_HOTEL" as UserRole,
                      label: "Gérant Hôtel",
                      desc: "5 Chambres & Folios",
                    },
                    {
                      role: "CAISSIERE_BAR_RESTO" as UserRole,
                      label: "Caissière Bar/Resto",
                      desc: "POS, Serveuses & Stocks",
                    },
                  ].map((item) => {
                    const selected = switchTargetRole === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => {
                          setSwitchTargetRole(item.role);
                          setSwitchError(null);
                        }}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          selected
                            ? "border-rhr-burgundy bg-rhr-burgundy/5 ring-2 ring-rhr-burgundy/15"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-rhr-dark">
                            {item.label}
                          </span>
                          <Lock className="h-3 w-3 text-rhr-burgundy shrink-0" />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  2. Saisissez votre Code PIN à 4 chiffres
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={switchPin}
                  onChange={(e) => {
                    setSwitchError(null);
                    setSwitchPin(e.target.value);
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.6em] text-xl font-black rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-rhr-dark focus:border-rhr-burgundy focus:bg-white focus:outline-none"
                />
                {switchError && (
                  <p className="text-xs font-bold text-red-600 mt-1.5">
                    {switchError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSwitchModalOpen(false);
                    logout();
                    router.push("/login");
                  }}
                  className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-700 transition"
                >
                  Aller au portail /login
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-bold text-white shadow-rhr transition"
                >
                  Valider et basculer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3 : PREMIÈRE CONNEXION / PERSONNALISATION CODE PIN & MOT DE PASSE
      ===================================================================== */}
      {currentUser &&
        (currentUser.mustChangeCredentials || manualCredentialsModalOpen) && (
          <div className="fixed inset-0 z-50 bg-rhr-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-white border-2 border-rhr-gold/40 p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                    <KeyRound className="h-3.5 w-3.5 text-amber-700" />
                    <span>
                      {currentUser.mustChangeCredentials
                        ? "Première Connexion — Sécurité Personnelle"
                        : "Sécurité du Compte Utilisateur"}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-rhr-dark">
                    Personnaliser mon Code PIN et Mot de passe
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Bienvenue <strong>{currentUser.fullName}</strong>. Pour
                    garantir la confidentialité de votre session, définissez dès
                    maintenant votre propre Code PIN à 4 chiffres et votre mot
                    de passe personnel.
                  </p>
                </div>
                {!currentUser.mustChangeCredentials && (
                  <button
                    type="button"
                    onClick={() => setManualCredentialsModalOpen(false)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              <form onSubmit={handleCredentialsChangeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Nouveau Code PIN personnel (4 chiffres) *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={newPersonalPin}
                    onChange={(e) => {
                      setCredError(null);
                      setNewPersonalPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    }}
                    placeholder="Ex : 2580"
                    className="w-full text-center tracking-[0.5em] text-xl font-black rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                      Nouveau Mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      value={newPersonalPassword}
                      onChange={(e) => {
                        setCredError(null);
                        setNewPersonalPassword(e.target.value);
                      }}
                      placeholder="Min. 4 caractères"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-rhr-burgundy focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                      Confirmer le Mot de passe *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPersonalPassword}
                      onChange={(e) => {
                        setCredError(null);
                        setConfirmPersonalPassword(e.target.value);
                      }}
                      placeholder="Répétez le mot de passe"
                      className="w-full rounded-xl border-2 border-gray-300 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:border-rhr-burgundy focus:outline-none"
                    />
                  </div>
                </div>

                {credError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700">
                    {credError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  {currentUser.mustChangeCredentials ? (
                    <button
                      type="button"
                      onClick={() => {
                        changeOwnCredentials({
                          newPinCode: currentUser.pinCode,
                          newPassword: currentUser.password || "rhr2026",
                        });
                        setManualCredentialsModalOpen(false);
                      }}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-600 transition"
                    >
                      Conserver mes accès actuels
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setManualCredentialsModalOpen(false)}
                      className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-600 transition"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-bold text-white shadow-rhr transition"
                  >
                    Enregistrer mon nouveau PIN & Mot de passe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

