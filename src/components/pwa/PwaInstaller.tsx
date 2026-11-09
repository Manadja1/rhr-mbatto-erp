"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  WifiOff,
  UtensilsCrossed,
  BedDouble,
  QrCode,
  LayoutDashboard,
} from "lucide-react";
import { RhrLogo } from "@/components/RhrLogo";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Stockage global de l'événement d'installation pour le partager entre /login et la barre supérieure
const globalPwaState = globalThis as unknown as {
  rhrDeferredPrompt?: BeforeInstallPromptEvent | null;
  rhrSwRegistered?: boolean;
};

interface PwaInstallerProps {
  variant?: "header" | "login";
}

export function PwaInstaller({ variant = "header" }: PwaInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Détection du mode Standalone (Application déjà installée sur l'écran d'accueil)
    const checkStandalone = () => {
      const standaloneMatch =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean(
          (window.navigator as unknown as { standalone?: boolean }).standalone
        );
      setIsStandalone(standaloneMatch);
    };
    checkStandalone();

    // 2. Détection iOS (iPhone / iPad / iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDetected =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIsIos(iosDetected);

    // 3. Enregistrement automatique du Service Worker Offline-First (/sw.js)
    if ("serviceWorker" in navigator) {
      if (!globalPwaState.rhrSwRegistered) {
        globalPwaState.rhrSwRegistered = true;
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => {
            setSwReady(true);
            reg.update().catch(() => {});
          })
          .catch(() => {});
      } else {
        setSwReady(true);
      }
    }

    // 4. Interception de l'événement natif beforeinstallprompt (Android / Chrome / Edge PC)
    if (globalPwaState.rhrDeferredPrompt) {
      setDeferredPrompt(globalPwaState.rhrDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalPwaState.rhrDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      globalPwaState.rhrDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || globalPwaState.rhrDeferredPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          globalPwaState.rhrDeferredPrompt = null;
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Si le prompt natif échoue, ouvrir le guide visuel
      }
    }
    setGuideModalOpen(true);
  };

  // Si l'application tourne déjà en plein écran installé (mode standalone)
  if (isStandalone) {
    if (variant === "login") {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Appli RHR Installée (Standalone)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {variant === "login" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rhr-burgundy to-rhr-burgundy-light hover:brightness-110 border border-rhr-gold/40 px-3.5 py-2 text-xs font-extrabold text-white shadow-rhr transition shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-rhr-gold animate-bounce" />
          <span>Installer l&apos;Appli RHR</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Installer l'application RHR Gestion sur votre téléphone ou ordinateur (Fonctionne 100% Hors-Ligne)"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold transition shrink-0",
            deferredPrompt
              ? "border-rhr-gold bg-rhr-burgundy text-white shadow-rhr hover:bg-rhr-burgundy-light"
              : "border-rhr-burgundy/30 bg-rhr-burgundy/10 text-rhr-burgundy hover:bg-rhr-burgundy hover:text-white"
          )}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden md:inline">Installer l&apos;Appli RHR</span>
          <span className="md:hidden">Installer</span>
        </button>
      )}

      {/* =====================================================================
          MODAL D'INSTALLATION ILLUSTRÉ (iOS SAFARI / ANDROID / PC + RACCOURCIS)
      ===================================================================== */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full rounded-3xl bg-white border-2 border-rhr-gold/40 shadow-2xl overflow-hidden my-auto">
            {/* En-tête Noir Charbon & Rouge Bordeaux */}
            <div className="bg-rhr-dark text-white p-5 sm:p-6 border-b-4 border-rhr-burgundy flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <RhrLogo size="md" variant="dark" />
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                    <Sparkles className="h-3 w-3" />
                    Application Native Offline-First (PWA)
                  </span>
                  <h3 className="text-lg font-black leading-tight text-white mt-0.5">
                    Installer &laquo;&nbsp;RHR Gestion&nbsp;&raquo;
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Résidence Hôtel Le Rêve de M&apos;Batto • Plein écran sans
                    barre d&apos;URL
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-rhr-dark">
              {/* Statut du Cache Service Worker */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <WifiOff className="h-4 w-4 text-emerald-700 shrink-0" />
                  <div className="text-xs">
                    <span className="font-extrabold text-emerald-950 block">
                      Cache Hors-Ligne Natif{" "}
                      {swReady ? "Activé (/sw.js)" : "Prêt"}
                    </span>
                    <span className="text-emerald-800 text-[11px]">
                      Les pages Hôtel, Caisse POS, Menu QR et Dashboard
                      fonctionnent même sans internet à M&apos;Batto.
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              </div>

              {/* Instructions iOS (iPhone / iPad Safari) */}
              <div
                className={cn(
                  "rounded-2xl border-2 p-4 space-y-3",
                  isIos
                    ? "border-rhr-burgundy bg-rhr-burgundy/[0.03]"
                    : "border-gray-200 bg-rhr-surface"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rhr-burgundy flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    <span>Sur iPhone / iPad (Safari iOS)</span>
                  </span>
                  {isIos && (
                    <span className="rounded-full bg-rhr-burgundy px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      Votre appareil
                    </span>
                  )}
                </div>

                <ol className="space-y-2.5 text-xs text-gray-700">
                  <li className="flex items-center gap-3 rounded-xl bg-white p-2.5 border border-gray-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-black">
                      1
                    </span>
                    <div className="flex-1">
                      Touchez l&apos;icône{" "}
                      <strong className="inline-flex items-center gap-1 text-rhr-dark">
                        <Share className="h-3.5 w-3.5 text-blue-600 inline" />{" "}
                        Partager
                      </strong>{" "}
                      dans la barre inférieure de Safari.
                    </div>
                  </li>
                  <li className="flex items-center gap-3 rounded-xl bg-white p-2.5 border border-gray-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-black">
                      2
                    </span>
                    <div className="flex-1">
                      Faites défiler le menu et appuyez sur{" "}
                      <strong className="inline-flex items-center gap-1 text-rhr-dark">
                        <PlusSquare className="h-3.5 w-3.5 text-rhr-burgundy inline" />{" "}
                        Sur l&apos;écran d&apos;accueil
                      </strong>
                      .
                    </div>
                  </li>
                  <li className="flex items-center gap-3 rounded-xl bg-white p-2.5 border border-gray-200">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-black">
                      3
                    </span>
                    <div className="flex-1">
                      Appuyez sur <strong>Ajouter</strong> en haut à droite :
                      l&apos;icône <strong>RHR Gestion</strong> apparaît sur
                      votre écran d&apos;accueil !
                    </div>
                  </li>
                </ol>
              </div>

              {/* Instructions Android / Chrome / Edge PC */}
              {!isIos && (
                <div className="rounded-2xl border border-gray-200 bg-rhr-surface p-4 space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-rhr-dark flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-rhr-burgundy" />
                    <span>Sur Android, Chrome ou Edge PC</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ouvrez le menu de votre navigateur (icône{" "}
                    <strong>⋮</strong> en haut à droite sur Android ou icône{" "}
                    <strong>⊕ Installer</strong> dans la barre d&apos;adresse
                    sur PC) puis sélectionnez{" "}
                    <strong className="text-rhr-dark">
                      &laquo;&nbsp;Installer l&apos;application&nbsp;&raquo;
                    </strong>{" "}
                    ou{" "}
                    <strong className="text-rhr-dark">
                      &laquo;&nbsp;Ajouter à l&apos;écran d&apos;accueil&nbsp;&raquo;
                    </strong>
                    .
                  </p>
                </div>
              )}

              {/* Aperçu des 4 Raccourcis Rapides d'écran d'accueil (App Shortcuts) */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  Raccourcis Rapides (Appui long sur l&apos;icône installée) :
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5">
                    <UtensilsCrossed className="h-4 w-4 text-rhr-burgundy shrink-0" />
                    <span className="font-bold truncate">
                      Caisse Bar &amp; Resto
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5">
                    <BedDouble className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="font-bold truncate">
                      Gestion des 5 Chambres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5">
                    <QrCode className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">Menu Client QR</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2.5">
                    <LayoutDashboard className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="font-bold truncate">
                      Dashboard Propriétaire
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setGuideModalOpen(false)}
                className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2 text-xs font-extrabold text-white shadow-rhr transition"
              >
                J&apos;ai compris
              </button>
            </div>
          </div>
        </div>
      )}

      {installSuccess && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-emerald-700 text-white px-4 py-3 text-xs font-extrabold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>Application RHR Gestion installée avec succès !</span>
        </div>
      )}
    </>
  );
}

