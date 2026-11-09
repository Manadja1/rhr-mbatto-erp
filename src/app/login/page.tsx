"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  BedDouble,
  UtensilsCrossed,
  QrCode,
  KeyRound,
  Mail,
  Lock,
  Wifi,
  WifiOff,
  Sparkles,
  Delete,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calculator,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { PwaInstaller } from "@/components/pwa/PwaInstaller";
import {
  useRhrStore,
  UserRole,
  getDefaultRouteForRole,
} from "@/store/useRhrStore";
import { cn } from "@/lib/utils";

interface ProfileCardOption {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  securityBadge: string;
  icon: React.ElementType;
  accentColor: string;
}

const PROFILE_CARDS: ProfileCardOption[] = [
  {
    id: "card-admin",
    role: "PROPRIETAIRE",
    title: "Administrateur",
    subtitle: "Direction Générale, Comptes, Prix, Articles & Audit",
    securityBadge: "Accès Protégé",
    icon: ShieldCheck,
    accentColor: "border-rhr-gold bg-rhr-gold/10 text-rhr-gold",
  },
  {
    id: "card-compta",
    role: "COMPTABLE",
    title: "Expert Comptable & Audit",
    subtitle: "Trésorerie, Bénéfice Net, Charges Fixes & Clôtures",
    securityBadge: "Accès Protégé",
    icon: Calculator,
    accentColor: "border-amber-500 bg-amber-500/10 text-amber-700",
  },
  {
    id: "card-hotel",
    role: "GERANT_HOTEL",
    title: "Gérant Hôtel (5 Chambres)",
    subtitle: "Nuitées, Passages 3H (Ch. 4 & 5), Réservations & Folios",
    securityBadge: "Accès Protégé",
    icon: BedDouble,
    accentColor: "border-blue-500 bg-blue-500/10 text-blue-600",
  },
  {
    id: "card-pos",
    role: "CAISSIERE_BAR_RESTO",
    title: "Caissière Bar & Resto",
    subtitle: "POS, Serveuses, Stocks Boissons/Cuisine & Commandes QR",
    securityBadge: "Accès Protégé",
    icon: UtensilsCrossed,
    accentColor: "border-rhr-burgundy bg-rhr-burgundy/10 text-rhr-burgundy",
  },
  {
    id: "card-qr",
    role: "CLIENT_QR",
    title: "Accès Client Menu QR",
    subtitle: "Carte Interactive Table & Service en Chambre",
    securityBadge: "Accès Public QR",
    icon: QrCode,
    accentColor: "border-emerald-600 bg-emerald-500/10 text-emerald-700",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const {
    currentUser,
    isOnline,
    syncQueue,
    loginWithPin,
    loginWithEmail,
    quickLoginDemo,
  } = useRhrStore();

  const [selectedProfile, setSelectedProfile] = useState<ProfileCardOption>(
    PROFILE_CARDS[0]
  );
  const [authMode, setAuthMode] = useState<"PIN" | "EMAIL">("PIN");
  const [pin, setPin] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setLockoutSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      const rem = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutSeconds(rem);
      if (rem === 0) {
        setFailedAttempts(0);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  // Sélection d'un poste sans jamais exposer les identifiants d'un autre utilisateur
  const handleSelectProfile = (card: ProfileCardOption) => {
    setSelectedProfile(card);
    setPin("");
    setEmail("");
    setPassword("");
    setErrorMsg(null);
  };

  // Saisie sur le pavé numérique tactile avec protection anti-force brute (5 essais max -> blocage 30s)
  const handlePinDigit = (digit: string) => {
    if (lockoutSeconds > 0) {
      setErrorMsg(
        `Sécurité anti-intrusion active : veuillez patienter ${lockoutSeconds}s avant un nouvel essai.`
      );
      return;
    }
    setErrorMsg(null);
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      const result = loginWithPin(nextPin, selectedProfile.role);
      if (result.success && result.user) {
        setFailedAttempts(0);
        router.push(getDefaultRouteForRole(result.user.role));
      } else {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 5) {
          const until = Date.now() + 30_000;
          setLockoutUntil(until);
          setLockoutSeconds(30);
          setErrorMsg(
            "5 tentatives erronées détectées. Pavé PIN verrouillé pendant 30 secondes par sécurité."
          );
        } else {
          setErrorMsg(
            result.error ||
            `Code PIN incorrect (${5 - nextFails} essai(s) restant(s)).`
          );
        }
        setTimeout(() => setPin(""), 450);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const result = loginWithEmail(email, password, selectedProfile.role);
    if (result.success && result.user) {
      router.push(getDefaultRouteForRole(result.user.role));
    } else {
      setErrorMsg(result.error || "Identifiants invalides pour ce poste.");
    }
  };

  const handleOpenPublicQrMenu = () => {
    setErrorMsg(null);
    const loggedUser = quickLoginDemo("CLIENT_QR", "client@rhr-mbatto.ci");
    router.push(getDefaultRouteForRole(loggedUser.role));
  };

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden w-full grid grid-cols-1 lg:grid-cols-12 bg-rhr-surface">
      {/* =====================================================================
          COLONNE GAUCHE : BRANDING NOIR CHARBON (#111315) & IDENTITÉ RHR
      ===================================================================== */}
      <div className="relative lg:col-span-5 xl:col-span-5 bg-rhr-dark text-white flex flex-col justify-between p-5 sm:p-8 lg:p-10 lg:h-full lg:overflow-y-auto overflow-x-hidden">
        {/* Décoration architecturale inspirée du toit RHR */}
        <div
          className="pointer-events-none absolute -top-28 -left-28 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #7C0A02 0%, rgba(124,10,2,0) 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full opacity-15 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #D4AF37 0%, rgba(212,175,55,0) 70%)",
          }}
        />

        {/* En-tête : Badge Système Temps Réel */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-gray-100 border border-white/15 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span>
              Système ERP &amp; POS v2.5 — Mode Hybride Hors-Ligne Actif
            </span>
          </div>

          {mounted && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border",
                isOnline
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/40"
              )}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Réseau M&apos;Batto Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Mode Hors-Ligne ({syncQueue.length} en attente)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Centre : Grand Logo RHR & Illustration Hôtelière Tropicale */}
        <div className="relative z-10 my-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <RhrLogo size="xl" variant="dark" className="shrink-0" />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rhr-gold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Complexe Hôtelier &amp; Gastronomique</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                RHR — R&Eacute;SIDENCE H&Ocirc;TEL LE R&Ecirc;VE DE M&apos;BATTO
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                Gestion unifiée et sécurisée des 5 Chambres Climatisées, du Bar
                &amp; Restaurant Braisé, de la Salle de Cérémonie et de la
                Trésorerie.
              </p>
            </div>
          </div>

          {/* Illustration architecturale & Aperçu temps réel du complexe */}
          <div className="hidden sm:block relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#1C1F23] via-[#15181B] to-[#2A0805] p-5 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rhr-gold">
                  Architecture &amp; Tarifs Officiels RHR
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  3 Pôles de Revenus &amp; Contrôle Strict des Caisses
                </h2>
              </div>
              <span className="rounded-lg bg-rhr-burgundy px-2.5 py-1 text-xs font-extrabold text-white shadow">
                100% Offline-First
              </span>
            </div>

            {/* Illustration SVG du Complexe Tropical RHR */}
            <div className="relative rounded-xl bg-black/30 border border-white/10 p-4 mb-4 overflow-hidden">
              <svg
                viewBox="0 0 600 155"
                className="w-full h-32 object-cover"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Ciel étoilé tropical & halo doré */}
                <circle cx="510" cy="36" r="22" fill="#D4AF37" fillOpacity="0.25" />
                <circle cx="510" cy="36" r="13" fill="#D4AF37" fillOpacity="0.7" />
                {/* Palmiers tropicaux de M'Batto */}
                <path
                  d="M65 140 C65 110 68 85 74 62"
                  stroke="#D4AF37"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M74 62 C52 55 40 66 35 74 M74 62 C55 44 70 35 88 38 M74 62 C95 50 108 62 112 72"
                  stroke="#10B981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Bâtiment Hôtel RHR avec toit Rouge Bordeaux emblématique */}
                <rect
                  x="145"
                  y="68"
                  width="310"
                  height="74"
                  rx="4"
                  fill="#1E2329"
                  stroke="#374151"
                  strokeWidth="1.5"
                />
                {/* Toit Bordeaux Asymétrique RHR */}
                <path
                  d="M125 72 L295 16 L475 72 L435 72"
                  stroke="#7C0A02"
                  strokeWidth="10"
                  strokeLinecap="square"
                />
                <rect x="160" y="28" width="10" height="114" fill="#7C0A02" />
                {/* 5 Chambres illuminées */}
                {[0, 1, 2, 3, 4].map((idx) => (
                  <g key={idx} transform={`translate(${185 + idx * 52}, 84)`}>
                    <rect
                      width="36"
                      height="26"
                      rx="3"
                      fill={idx < 2 ? "#D4AF37" : idx === 4 ? "#3B82F6" : "#111315"}
                      fillOpacity={idx < 2 ? "0.85" : "0.7"}
                      stroke="#D4AF37"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y="17"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="Inter, sans-serif"
                    >
                      CH.{idx + 1}
                    </text>
                  </g>
                ))}
                {/* Sol & Terrasse Bar/Resto */}
                <line
                  x1="10"
                  y1="142"
                  x2="590"
                  y2="142"
                  stroke="#D4AF37"
                  strokeOpacity="0.4"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Grille synthèse des règles métier RHR */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="font-bold text-rhr-gold">5 Chambres</div>
                <div className="text-gray-300 mt-0.5">
                  Ch 1-3 : <strong className="text-white">15 000 F</strong>
                </div>
                <div className="text-gray-300">
                  Ch 4-5 : <strong className="text-white">10 000 F</strong>
                </div>
                <div className="text-[11px] text-amber-300 mt-1">
                  Passage 3H (Ch 4-5) : 5 000 F
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="font-bold text-rhr-gold">Bar &amp; Resto</div>
                <div className="text-gray-300 mt-0.5">
                  4 Serveuses tracées
                </div>
                <div className="text-gray-300">
                  Blocage Stock = <strong className="text-white">0</strong>
                </div>
                <div className="text-[11px] text-emerald-300 mt-1">
                  Transfert Folio Ch.
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <div className="font-bold text-rhr-gold">Cérémonies</div>
                <div className="text-gray-300 mt-0.5">
                  Base : <strong className="text-white">50 000 F</strong>
                </div>
                <div className="text-gray-300">50 couverts inclus</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  +1 000 F / +1 500 F VIP
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de colonne gauche */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-400 border-t border-white/10 pt-4">
          <span>Résidence Hôtel Le Rêve • M&apos;Batto, Côte d&apos;Ivoire</span>
          <span className="text-rhr-gold font-semibold">
            Audit Trail &amp; RBAC Strict
          </span>
        </div>
      </div>

      {/* =====================================================================
          COLONNE DROITE : PORTAIL D'AUTHENTIFICATION RHR
      ===================================================================== */}
      <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 lg:h-full lg:overflow-y-auto overflow-x-hidden">
        <div className="max-w-2xl w-full mx-auto space-y-6 my-auto">
          {/* En-tête mobile + Titre */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rhr-burgundy">
                <Building2 className="h-3.5 w-3.5" />
                Portail d&apos;Accès Sécurisé RHR
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-rhr-dark tracking-tight mt-1">
                Connexion au Poste de Travail
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Sélectionnez votre poste puis saisissez votre Code PIN personnel
                ou vos identifiants confidentiels.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <PwaInstaller variant="login" />
              {mounted && currentUser && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(getDefaultRouteForRole(currentUser.role))
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Reprendre : {currentUser.fullName.split("—")[0]}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 1. SÉLECTEUR VISUEL DES POSTES (SANS AUCUN CODE PIN NI IDENTIFIANT EXPOSÉ) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                1. Choisissez votre poste / profil d&apos;accès
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <Lock className="h-3 w-3" />
                Identifiants isolés &amp; confidentiels
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PROFILE_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = selectedProfile.id === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelectProfile(card)}
                    className={cn(
                      "group relative flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-all duration-150",
                      card.role === "CLIENT_QR" && "sm:col-span-2",
                      isSelected
                        ? "border-rhr-burgundy bg-rhr-burgundy/[0.04] shadow-rhr"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        isSelected
                          ? "bg-rhr-burgundy text-white border-rhr-burgundy"
                          : card.accentColor
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-rhr-dark truncate">
                          {card.title}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0",
                            isSelected
                              ? "bg-rhr-burgundy text-white"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {card.securityBadge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                        {card.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DOUBLE MODE DE CONNEXION : PAVÉ NUMÉRIQUE PIN OU EMAIL + MOT DE PASSE */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  2. Authentification :
                </span>
                <span className="text-xs font-bold text-rhr-burgundy">
                  {selectedProfile.title}
                </span>
              </div>

              {selectedProfile.role !== "CLIENT_QR" && (
                <div className="inline-flex rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("PIN");
                      setErrorMsg(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      authMode === "PIN"
                        ? "bg-rhr-burgundy text-white shadow-sm"
                        : "text-gray-600 hover:text-rhr-dark"
                    )}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Code PIN Secret</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("EMAIL");
                      setErrorMsg(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                      authMode === "EMAIL"
                        ? "bg-rhr-burgundy text-white shadow-sm"
                        : "text-gray-600 hover:text-rhr-dark"
                    )}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email &amp; Mot de passe</span>
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-semibold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {selectedProfile.role === "CLIENT_QR" ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-emerald-50/70 border border-emerald-200 p-4">
                <div className="space-y-1">
                  <div className="text-sm font-black text-emerald-950">
                    Accès Carte Interactive Client (Table &amp; Chambre)
                  </div>
                  <p className="text-xs text-emerald-800">
                    Cet espace public permet uniquement aux clients de consulter
                    la carte RHR et d&apos;envoyer leur commande en caisse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPublicQrMenu}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-3 text-xs font-black text-white shadow transition shrink-0"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Ouvrir la Carte Client QR</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : authMode === "PIN" ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Indicateur visuel des 4 chiffres du PIN */}
                <div className="md:col-span-5 flex flex-col items-center md:items-start text-center md:text-left space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-rhr-surface px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200">
                    <Lock className="h-3.5 w-3.5 text-rhr-burgundy" />
                    <span>Code PIN confidentiel (4 chiffres)</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Composez votre code PIN personnel attribué par
                    l&apos;Administrateur Général. Aucune information de
                    connexion d&apos;un autre agent n&apos;est accessible.
                  </p>

                  {/* 4 pastilles PIN */}
                  <div className="flex items-center gap-3 py-2">
                    {[0, 1, 2, 3].map((idx) => {
                      const filled = idx < pin.length;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "h-12 w-12 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all",
                            filled
                              ? "border-rhr-burgundy bg-rhr-burgundy text-white scale-105 shadow-sm"
                              : "border-gray-300 bg-gray-50 text-gray-400"
                          )}
                        >
                          {filled ? "•" : ""}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                    <span>
                      Protection anti-usurpation active sur ce poste.
                    </span>
                  </div>
                </div>

                {/* Pavé numérique tactile 0-9 */}
                <div className="md:col-span-7 grid grid-cols-3 gap-2.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinDigit(digit)}
                      className="h-13 py-3 rounded-xl border border-gray-200 bg-rhr-surface hover:bg-rhr-burgundy hover:text-white hover:border-rhr-burgundy active:scale-95 transition-all text-lg font-black text-rhr-dark shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setPin("");
                      setErrorMsg(null);
                    }}
                    className="h-13 py-3 rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200 active:scale-95 transition text-xs font-bold uppercase text-gray-600"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinDigit("0")}
                    className="h-13 py-3 rounded-xl border border-gray-200 bg-rhr-surface hover:bg-rhr-burgundy hover:text-white hover:border-rhr-burgundy active:scale-95 transition-all text-lg font-black text-rhr-dark shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Corriger le dernier chiffre"
                    className="h-13 py-3 rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200 active:scale-95 transition flex items-center justify-center text-gray-700"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Formulaire Email + Mot de passe */
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Votre Adresse Email Professionnelle
                    </label>
                    <div className="relative">
                      <Mail className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.nom@rhr-mbatto.ci"
                        className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-rhr-dark focus:border-rhr-burgundy focus:outline-none focus:ring-2 focus:ring-rhr-burgundy/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Votre Mot de passe personnel
                    </label>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm font-medium text-rhr-dark focus:border-rhr-burgundy focus:outline-none focus:ring-2 focus:ring-rhr-burgundy/20"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">
                    En cas d&apos;oubli, contactez le Propriétaire / Administrateur Général.
                  </span>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-6 py-2.5 text-sm font-bold text-white shadow-rhr transition"
                  >
                    <span>Ouvrir la session</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer Légal */}
        <div className="max-w-2xl w-full mx-auto pt-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
          <span>
            © {new Date().getFullYear()} RHR — Résidence Hôtel Le Rêve de
            M&apos;Batto. Tous droits réservés.
          </span>
          <span>Devise officielle : Franc CFA (FCFA / F)</span>
        </div>
      </div>
    </div>
  );
}

