"use client";

import React, { useEffect, useState } from "react";
import {
  BedDouble,
  Clock,
  Receipt,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  Sparkles,
  PlusCircle,
  UtensilsCrossed,
  ArrowUpRight,
  AlertTriangle,
  Wallet,
  Smartphone,
  Wrench,
  Camera,
  MessageCircle,
  X,
  CreditCard,
  LogOut,
  RefreshCw,
  FileText,
  Tag,
  TrendingUp,
  Download,
  Trash2,
  BarChart3,
} from "lucide-react";
import {
  useRhrStore,
  Room,
  Stay,
  CeremonyBooking,
  PaymentMethod,
} from "@/store/useRhrStore";
import { formatCFA, formatDateTime, cn } from "@/lib/utils";
import {
  RhrReceiptModal,
  RhrReceiptData,
} from "@/components/RhrReceiptModal";
import { DailyReportingSheet } from "@/components/DailyReportingSheet";

// Calcul dynamique du compte à rebours Passage 3H
function computePassageCountdown(expectedCheckOutIso: string, nowMs: number) {
  const diffMs = new Date(expectedCheckOutIso).getTime() - nowMs;
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSec % 60).padStart(2, "0");

  const isExpired = totalSec === 0;
  // Alerte rouge clignotante dès qu'il reste moins de 15 minutes ou expiré
  const isCritical = totalSec <= 15 * 60;

  return {
    label: isExpired
      ? "00h 00m 00s — TERME EXPIRÉ !"
      : `${hrs}h ${mins}m ${secs}s restantes`,
    isExpired,
    isCritical,
    totalSec,
  };
}

export default function HotelPage() {
  const {
    currentUser,
    rooms,
    stays,
    folioItems,
    posOrders,
    transactions,
    ceremonies,
    createCheckInOrReservation,
    collectReservationDeposit,
    activateReservedStay,
    upgradePassageToNight,
    extendStayNights,
    simulatePassageNearExpiry,
    checkoutRoom,
    markRoomClean,
    addHotelExpense,
    applyRoomDiscount,
    recordHistoricalHotelOperation,
    deleteHotelTransaction,
    createCeremonyBooking,
    addCeremonyDeposit,
  } = useRhrStore();

  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<
    | "COCKPIT"
    | "CALENDRIER_RESA"
    | "DEPENSES_ENTRETIEN"
    | "HISTORIQUE_MENSUEL"
    | "LOCATION_SALLE"
    | "REPORTING_JOURNALIER_HOTEL"
  >("COCKPIT");

  // Formulaire Location Salle de Cérémonie (Gestion des avances et du reste à payer au poste Gérant Hôtel)
  const [hallDate, setHallDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [hallEventType, setHallEventType] =
    useState<CeremonyBooking["eventType"]>("MARIAGE");
  const [hallClientName, setHallClientName] = useState("");
  const [hallClientPhone, setHallClientPhone] = useState("");
  const [hallCovers, setHallCovers] = useState<number>(50);
  const [hallDiscount, setHallDiscount] = useState<number>(0);
  const [hallInitialAdvance, setHallInitialAdvance] = useState<number>(25000);
  const [hallPaymentMethod, setHallPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [hallNotes, setHallNotes] = useState("");
  const [hallFeedback, setHallFeedback] = useState<string | null>(null);
  const [hallDepositAmountMap, setHallDepositAmountMap] = useState<
    Record<string, number>
  >({});
  const [hallDepositMethodMap, setHallDepositMethodMap] = useState<
    Record<string, PaymentMethod>
  >({});

  // Modal 1 : Check-In ou Réservation avec Acompte + Réduction Chambres 1 à 3
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [selectedRoomIdForCheckIn, setSelectedRoomIdForCheckIn] =
    useState<string>("room-3");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("+225 07 ");
  const [guestIdNumber, setGuestIdNumber] = useState("");
  const [stayType, setStayType] = useState<
    "NUITEE" | "PASSAGE_3H" | "RESERVATION"
  >("NUITEE");
  const [nightsCount, setNightsCount] = useState<number>(1);
  const [checkInDate, setCheckInDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [checkInDiscountAmount, setCheckInDiscountAmount] = useState<number>(0);
  const [checkInDiscountReason, setCheckInDiscountReason] = useState<string>("");
  const [depositAmount, setDepositAmount] = useState<number>(15000);
  const [depositMethod, setDepositMethod] =
    useState<PaymentMethod>("ESPECES");
  const [stayNotes, setStayNotes] = useState("");

  // Modal 2 : Folio Détaillé de la Chambre & Facturation Croisée + Réduction Ch. 1 à 3
  const [folioRoomId, setFolioRoomId] = useState<string | null>(null);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [folioDiscountInput, setFolioDiscountInput] = useState<number>(0);
  const [folioDiscountReasonInput, setFolioDiscountReasonInput] =
    useState<string>("");
  const [folioDiscountSuccess, setFolioDiscountSuccess] = useState<
    string | null
  >(null);

  // Modal 3 : Complément d'Acompte en 1 clic sur Réservation
  const [depositModalStay, setDepositModalStay] = useState<Stay | null>(null);
  const [extraDepositAmount, setExtraDepositAmount] = useState<number>(5000);
  const [extraDepositMethod, setExtraDepositMethod] =
    useState<PaymentMethod>("WAVE");

  // Modal 4 : Reçu Numérique Officiel RHR (WhatsApp & Impression)
  const [activeReceipt, setActiveReceipt] = useState<RhrReceiptData | null>(
    null
  );
  const [receiptRoomIdToClean, setReceiptRoomIdToClean] = useState<
    string | null
  >(null);

  // Formulaire Dépenses d'Entretien Hôtel
  const [expCategory, setExpCategory] = useState("Eau de Javel, Savons & Détergents");
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState<number>(2500);
  const [expDate, setExpDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [expFundSource, setExpFundSource] = useState<
    "CAISSE_DU_JOUR" | "FONDS_SEPARE"
  >("CAISSE_DU_JOUR");
  const [expPaymentMethod, setExpPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [expPhotoPreview, setExpPhotoPreview] = useState<string | undefined>(
    undefined
  );
  const [expSuccessBanner, setExpSuccessBanner] = useState<string | null>(null);

  // Onglet 4 : Historique des Opérations du Gérant depuis Janvier 2026 & Point Financier Mensuel
  const [histOpType, setHistOpType] = useState<
    "SEJOUR_CHAMBRE" | "DEPENSE_HOTEL"
  >("SEJOUR_CHAMBRE");
  const [histDate, setHistDate] = useState<string>("2026-01-15");
  const [histRoomNumber, setHistRoomNumber] = useState<number>(1);
  const [histStayType, setHistStayType] = useState<"NUITEE" | "PASSAGE_3H">(
    "NUITEE"
  );
  const [histNights, setHistNights] = useState<number>(1);
  const [histClientName, setHistClientName] = useState<string>("");
  const [histClientPhone, setHistClientPhone] = useState<string>("+225 07 ");
  const [histDiscountAmount, setHistDiscountAmount] = useState<number>(0);
  const [histDiscountReason, setHistDiscountReason] = useState<string>("");
  const [histPaymentMethod, setHistPaymentMethod] =
    useState<PaymentMethod>("ESPECES");
  const [histExpCategory, setHistExpCategory] = useState<string>(
    "Eau de Javel, Savons & Détergents"
  );
  const [histExpDesc, setHistExpDesc] = useState<string>("");
  const [histExpAmount, setHistExpAmount] = useState<number>(3000);
  const [histExpFundSource, setHistExpFundSource] = useState<
    "CAISSE_DU_JOUR" | "FONDS_SEPARE"
  >("CAISSE_DU_JOUR");
  const [histNotes, setHistNotes] = useState<string>("");
  const [histSuccessBanner, setHistSuccessBanner] = useState<string | null>(
    null
  );
  const [selectedMonthFilter, setSelectedMonthFilter] =
    useState<string>("ALL_2026");

  // Horloge temps réel chaque seconde pour les Passages 3H
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chambre sélectionnée dans le modal Check-In
  const selectedRoomForCheckIn =
    rooms.find((r) => r.id === selectedRoomIdForCheckIn) || rooms[0];

  const isDiscountEligibleRoom =
    selectedRoomForCheckIn.roomNumber <= 3 && stayType !== "PASSAGE_3H";

  const computedCheckInGross =
    stayType === "PASSAGE_3H"
      ? selectedRoomForCheckIn.passagePrice
      : selectedRoomForCheckIn.nightPrice * Math.max(1, nightsCount);

  const effectiveCheckInDiscount = isDiscountEligibleRoom
    ? Math.min(
        computedCheckInGross,
        Math.max(0, Math.round(checkInDiscountAmount || 0))
      )
    : 0;

  const computedCheckInTotal = Math.max(
    0,
    computedCheckInGross - effectiveCheckInDiscount
  );

  const computedCheckInRemaining = Math.max(
    0,
    computedCheckInTotal - (depositAmount || 0)
  );

  // Ouverture du modal Check-in pré-configuré pour une chambre
  const openCheckInForRoom = (
    room: Room,
    presetType: "NUITEE" | "PASSAGE_3H" | "RESERVATION" = "NUITEE"
  ) => {
    const effectiveType =
      presetType === "PASSAGE_3H" && !room.allowPassage3h
        ? "NUITEE"
        : presetType;
    setSelectedRoomIdForCheckIn(room.id);
    setStayType(effectiveType);
    setNightsCount(1);
    setCheckInDiscountAmount(0);
    setCheckInDiscountReason("");
    setGuestName("");
    setGuestPhone("+225 07 ");
    setGuestIdNumber("");
    setStayNotes("");
    if (effectiveType === "PASSAGE_3H") {
      setDepositAmount(room.passagePrice);
    } else if (effectiveType === "RESERVATION") {
      setDepositAmount(5000);
    } else {
      setDepositAmount(room.nightPrice);
    }
    setCheckInModalOpen(true);
  };

  // Soumission Check-In ou Réservation
  const handleCreateCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const res = createCheckInOrReservation({
      roomId: selectedRoomForCheckIn.id,
      guestName,
      guestPhone,
      guestIdNumber,
      stayType,
      checkInDateIso: stayType === "RESERVATION" ? checkInDate : undefined,
      nightsCount,
      discountAmount: effectiveCheckInDiscount,
      discountReason: checkInDiscountReason,
      depositAmount,
      depositMethod,
      notes: stayNotes,
    });

    if (res.success && res.stayId) {
      setCheckInModalOpen(false);
      // Récupérer l'état mis à jour pour générer immédiatement le reçu RHR WhatsApp
      const updatedState = useRhrStore.getState();
      const createdStay = updatedState.stays.find((s) => s.id === res.stayId);
      const createdFolios = updatedState.folioItems.filter(
        (f) => f.stayId === res.stayId
      );
      if (createdStay) {
        const charges = createdFolios
          .filter((f) => f.amount > 0)
          .reduce((a, b) => a + b.amount, 0);
        const paid = Math.abs(
          createdFolios
            .filter((f) => f.amount < 0)
            .reduce((a, b) => a + b.amount, 0)
        );
        setReceiptRoomIdToClean(null);
        setActiveReceipt({
          reference: `REC-IN-CH${selectedRoomForCheckIn.roomNumber}-${Date.now()
            .toString()
            .slice(-4)}`,
          title:
            stayType === "RESERVATION"
              ? "Reçu d'Acompte de Réservation Hôtel"
              : stayType === "PASSAGE_3H"
              ? "Ticket Officiel Passage 3 Heures"
              : "Reçu de Check-In Nuitée Hôtel",
          stay: createdStay,
          roomName: selectedRoomForCheckIn.name,
          roomCategory: selectedRoomForCheckIn.category,
          folioLines: createdFolios,
          totalCharges: charges,
          totalPaid: paid,
          remainingBalance: Math.max(0, charges - paid),
          justPaidAmount: depositAmount,
          paymentMethodLabel: depositMethod,
          operatorName: currentUser?.fullName || "Gérant Hôtel RHR",
          issuedAt: new Date().toISOString(),
        });
      }
    }
  };

  // Ouverture du Folio Détaillé
  const activeFolioRoom = folioRoomId
    ? rooms.find((r) => r.id === folioRoomId) || null
    : null;
  const activeFolioStay = activeFolioRoom?.currentStayId
    ? stays.find((s) => s.id === activeFolioRoom.currentStayId) || null
    : null;
  const activeFolioLines = activeFolioStay
    ? folioItems.filter((f) => f.stayId === activeFolioStay.id)
    : [];

  const folioAccommodationLines = activeFolioLines.filter(
    (f) => f.category === "HEBERGEMENT" || f.category === "SUPPLEMENT"
  );
  const folioBarRestoLines = activeFolioLines.filter(
    (f) => f.category === "BAR_RESTO"
  );
  const folioPaymentLines = activeFolioLines.filter(
    (f) => f.category === "ACOMPTE" || f.amount < 0
  );

  const folioTotalAccommodation = folioAccommodationLines.reduce(
    (s, f) => s + f.amount,
    0
  );
  const folioTotalBarResto = folioBarRestoLines.reduce(
    (s, f) => s + f.amount,
    0
  );
  const folioTotalCharges = folioTotalAccommodation + folioTotalBarResto;
  const folioTotalPaid = Math.abs(
    folioPaymentLines.reduce((s, f) => s + f.amount, 0)
  );
  const folioRemainingBalance = Math.max(0, folioTotalCharges - folioTotalPaid);

  // Exécution du Check-Out & Génération du Reçu Numérique WhatsApp
  const handleConfirmCheckout = () => {
    if (!activeFolioRoom) return;
    const targetRoomId = activeFolioRoom.id;
    const targetRoomName = activeFolioRoom.name;
    const targetRoomCategory = activeFolioRoom.category;

    const result = checkoutRoom({
      roomId: targetRoomId,
      paymentMethod: checkoutPaymentMethod,
    });

    if (result.success && result.stay && result.folioLines) {
      setFolioRoomId(null);
      const charges = result.folioLines
        .filter((f) => f.amount > 0)
        .reduce((a, b) => a + b.amount, 0);
      const paid = Math.abs(
        result.folioLines
          .filter((f) => f.amount < 0)
          .reduce((a, b) => a + b.amount, 0)
      );

      setReceiptRoomIdToClean(targetRoomId);
      setActiveReceipt({
        reference: result.receiptRef || `REC-CHK-${Date.now()}`,
        title: "Facture Finale & Reçu de Check-Out (Hôtel + Bar/Resto)",
        stay: result.stay,
        roomName: targetRoomName,
        roomCategory: targetRoomCategory,
        folioLines: result.folioLines,
        totalCharges: charges,
        totalPaid: paid,
        remainingBalance: Math.max(0, charges - paid),
        justPaidAmount: result.paidNowAmount,
        paymentMethodLabel: checkoutPaymentMethod,
        operatorName: currentUser?.fullName || "Gérant Hôtel RHR",
        issuedAt: new Date().toISOString(),
      });
    }
  };

  // Encaissement d'un complément d'acompte en 1 clic sur réservation
  const handleConfirmExtraDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalStay || extraDepositAmount <= 0) return;
    const stayId = depositModalStay.id;
    const room = rooms.find((r) => r.roomNumber === depositModalStay.roomNumber);

    collectReservationDeposit({
      stayId,
      amount: extraDepositAmount,
      method: extraDepositMethod,
    });

    setDepositModalStay(null);

    // Ouvrir le reçu d'acompte mis à jour
    const updatedState = useRhrStore.getState();
    const updatedStay = updatedState.stays.find((s) => s.id === stayId);
    const updatedFolios = updatedState.folioItems.filter(
      (f) => f.stayId === stayId
    );
    if (updatedStay && room) {
      const charges = updatedFolios
        .filter((f) => f.amount > 0)
        .reduce((a, b) => a + b.amount, 0);
      const paid = Math.abs(
        updatedFolios
          .filter((f) => f.amount < 0)
          .reduce((a, b) => a + b.amount, 0)
      );
      setReceiptRoomIdToClean(null);
      setActiveReceipt({
        reference: `REC-ACP-CH${room.roomNumber}-${Date.now()
          .toString()
          .slice(-4)}`,
        title: "Reçu de Complément d'Acompte Réservation",
        stay: updatedStay,
        roomName: room.name,
        roomCategory: room.category,
        folioLines: updatedFolios,
        totalCharges: charges,
        totalPaid: paid,
        remainingBalance: Math.max(0, charges - paid),
        justPaidAmount: extraDepositAmount,
        paymentMethodLabel: extraDepositMethod,
        operatorName: currentUser?.fullName || "Gérant Hôtel RHR",
        issuedAt: new Date().toISOString(),
      });
    }
  };

  // Gestion upload photo reçu facultatif pour dépense d'entretien
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setExpPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Synchroniser les champs de réduction lorsqu'on ouvre le Folio d'une chambre
  useEffect(() => {
    if (activeFolioStay) {
      setFolioDiscountInput(activeFolioStay.discountAmount || 0);
      setFolioDiscountReasonInput(activeFolioStay.discountReason || "");
      setFolioDiscountSuccess(null);
    }
  }, [activeFolioStay?.id]);

  // Appliquer ou modifier une réduction sur un séjour actif (Chambres 1 à 3)
  const handleApplyFolioDiscount = () => {
    if (!activeFolioStay || !activeFolioRoom) return;
    const res = applyRoomDiscount({
      stayId: activeFolioStay.id,
      discountAmount: folioDiscountInput,
      discountReason: folioDiscountReasonInput,
    });
    if (res.success) {
      setFolioDiscountSuccess(
        folioDiscountInput > 0
          ? `Réduction de ${formatCFA(folioDiscountInput)} appliquée avec succès sur ${activeFolioRoom.name}.`
          : `Réduction retirée — tarif normal rétabli.`
      );
      setTimeout(() => setFolioDiscountSuccess(null), 4000);
    }
  };

  // Enregistrement d'une dépense d'entretien hôtel
  const handleAddHotelExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDescription.trim() || expAmount <= 0) return;

    const tx = addHotelExpense({
      pole: "MAINTENANCE",
      categoryLabel: expCategory,
      description: expDescription,
      amount: expAmount,
      paymentMethod: expPaymentMethod,
      fundSource: expFundSource,
      receiptPhotoUrl: expPhotoPreview,
      operationDateIso: expDate ? `${expDate}T12:00:00` : undefined,
    });

    setExpDescription("");
    setExpAmount(2000);
    setExpPhotoPreview(undefined);
    setExpSuccessBanner(
      `Dépense d'entretien enregistrée (${formatCFA(tx.amount)} — ${
        tx.expenseFundSource === "CAISSE_DU_JOUR"
          ? "Déduite de la caisse du jour"
          : "Prise sur le fonds de caisse séparé"
      })`
    );
    setTimeout(() => setExpSuccessBanner(null), 5000);
  };

  // Calculs pour le formulaire de saisie historique (Depuis Janvier 2026)
  const selectedHistRoom =
    rooms.find((r) => r.roomNumber === histRoomNumber) || rooms[0];
  const histEffectiveStayType =
    histStayType === "PASSAGE_3H" && !selectedHistRoom.allowPassage3h
      ? "NUITEE"
      : histStayType;
  const histGrossRoomCost =
    histEffectiveStayType === "PASSAGE_3H"
      ? selectedHistRoom.passagePrice
      : selectedHistRoom.nightPrice * Math.max(1, histNights);
  const histCanDiscount =
    selectedHistRoom.roomNumber <= 3 && histEffectiveStayType !== "PASSAGE_3H";
  const histEffectiveDiscount = histCanDiscount
    ? Math.min(histGrossRoomCost, Math.max(0, Math.round(histDiscountAmount || 0)))
    : 0;
  const histNetRoomAmount = Math.max(0, histGrossRoomCost - histEffectiveDiscount);

  const handleRecordHistoricalOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (histOpType === "SEJOUR_CHAMBRE") {
      const res = recordHistoricalHotelOperation({
        operationType: "SEJOUR_CHAMBRE",
        operationDateIso: histDate,
        roomNumber: selectedHistRoom.roomNumber,
        stayType: histEffectiveStayType,
        nightsCount: histEffectiveStayType === "PASSAGE_3H" ? 1 : histNights,
        guestName: histClientName.trim() || `Client Ch.${selectedHistRoom.roomNumber}`,
        guestPhone: histClientPhone.trim() || "+225 07 00 00 00 00",
        discountAmount: histEffectiveDiscount,
        discountReason: histDiscountReason,
        amount: histNetRoomAmount,
        paymentMethod: histPaymentMethod,
        description: histNotes,
      });
      if (res.success && res.transaction) {
        setHistClientName("");
        setHistDiscountAmount(0);
        setHistDiscountReason("");
        setHistNotes("");
        setHistSuccessBanner(
          `Opération Hôtel du ${histDate} enregistrée : Ch.${selectedHistRoom.roomNumber} (${formatCFA(res.transaction.amount)})${histEffectiveDiscount > 0 ? ` avec réduction de -${formatCFA(histEffectiveDiscount)}` : ""}`
        );
        setTimeout(() => setHistSuccessBanner(null), 5000);
      }
    } else {
      if (!histExpDesc.trim() || histExpAmount <= 0) return;
      const res = recordHistoricalHotelOperation({
        operationType: "DEPENSE_HOTEL",
        operationDateIso: histDate,
        amount: histExpAmount,
        paymentMethod: histPaymentMethod,
        expenseCategory: histExpCategory,
        expenseFundSource: histExpFundSource,
        description: histExpDesc,
      });
      if (res.success && res.transaction) {
        setHistExpDesc("");
        setHistSuccessBanner(
          `Dépense Gérant Hôtel du ${histDate} enregistrée : -${formatCFA(res.transaction.amount)} (${histExpCategory})`
        );
        setTimeout(() => setHistSuccessBanner(null), 5000);
      }
    }
  };

  // Statistiques strictement limitées au Pôle Hôtel (Pas de CA global complexe exposé au Gérant Hôtel)
  const hotelTransactions = transactions.filter(
    (t) => t.pole === "HOTEL" || t.pole === "MAINTENANCE"
  );
  const hotelCashIn = hotelTransactions
    .filter((t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_ESPECES")
    .reduce((sum, t) => sum + t.amount, 0);
  const hotelMoMoIn = hotelTransactions
    .filter(
      (t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_MOBILE_MONEY"
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const hotelDayTillExpenses = hotelTransactions
    .filter(
      (t) =>
        t.type === "DEPENSE" &&
        t.vault === "CAISSE_ESPECES" &&
        t.expenseFundSource === "CAISSE_DU_JOUR"
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const expectedHotelCashInTill = hotelCashIn - hotelDayTillExpenses;

  const hotelMaintenanceExpenses = transactions.filter(
    (t) => t.type === "DEPENSE" && (t.pole === "MAINTENANCE" || t.pole === "HOTEL")
  );

  // =========================================================================
  // POINT FINANCIER MENSUEL DEPUIS JANVIER 2026 (2026-01 -> AUJOURD'HUI)
  // =========================================================================
  const MONTHS_2026 = [
    { key: "2026-01", label: "Janvier 2026", defaultDate: "2026-01-15" },
    { key: "2026-02", label: "Février 2026", defaultDate: "2026-02-15" },
    { key: "2026-03", label: "Mars 2026", defaultDate: "2026-03-15" },
    { key: "2026-04", label: "Avril 2026", defaultDate: "2026-04-15" },
    { key: "2026-05", label: "Mai 2026", defaultDate: "2026-05-15" },
    { key: "2026-06", label: "Juin 2026", defaultDate: "2026-06-15" },
    { key: "2026-07", label: "Juillet 2026", defaultDate: "2026-07-15" },
    { key: "2026-08", label: "Août 2026", defaultDate: "2026-08-15" },
    { key: "2026-09", label: "Septembre 2026", defaultDate: "2026-09-15" },
    { key: "2026-10", label: "Octobre 2026", defaultDate: "2026-10-15" },
    { key: "2026-11", label: "Novembre 2026", defaultDate: "2026-11-09" },
    { key: "2026-12", label: "Décembre 2026", defaultDate: "2026-12-15" },
  ];

  const monthlyHotelSummary = MONTHS_2026.map((m) => {
    const monthTxs = hotelTransactions.filter((t) =>
      t.createdAt.startsWith(m.key)
    );
    const monthStays = stays.filter((s) => s.checkIn.startsWith(m.key));

    const cashIn = monthTxs
      .filter((t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_ESPECES")
      .reduce((acc, t) => acc + t.amount, 0);
    const momoIn = monthTxs
      .filter(
        (t) => t.type === "ENCAISSEMENT" && t.vault === "CAISSE_MOBILE_MONEY"
      )
      .reduce((acc, t) => acc + t.amount, 0);
    const totalRevenue = cashIn + momoIn;

    const totalExpenses = monthTxs
      .filter((t) => t.type === "DEPENSE")
      .reduce((acc, t) => acc + t.amount, 0);

    const totalDiscounts = monthStays.reduce(
      (acc, s) => acc + (s.discountAmount || 0),
      0
    );

    const netBalance = totalRevenue - totalExpenses;

    return {
      ...m,
      staysCount: monthStays.length,
      txCount: monthTxs.length,
      cashIn,
      momoIn,
      totalRevenue,
      totalExpenses,
      totalDiscounts,
      netBalance,
    };
  });

  const annual2026Totals = monthlyHotelSummary.reduce(
    (acc, m) => ({
      staysCount: acc.staysCount + m.staysCount,
      txCount: acc.txCount + m.txCount,
      cashIn: acc.cashIn + m.cashIn,
      momoIn: acc.momoIn + m.momoIn,
      totalRevenue: acc.totalRevenue + m.totalRevenue,
      totalExpenses: acc.totalExpenses + m.totalExpenses,
      totalDiscounts: acc.totalDiscounts + m.totalDiscounts,
      netBalance: acc.netBalance + m.netBalance,
    }),
    {
      staysCount: 0,
      txCount: 0,
      cashIn: 0,
      momoIn: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalDiscounts: 0,
      netBalance: 0,
    }
  );

  const filteredHistoricalTransactions = hotelTransactions
    .filter((t) =>
      selectedMonthFilter === "ALL_2026"
        ? t.createdAt.startsWith("2026-")
        : t.createdAt.startsWith(selectedMonthFilter)
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const handleExportHotelMonthlyCsv = () => {
    const headers = [
      "Mois",
      "Nb Sejours/Passages",
      "Reductions Ch. 1 a 3 (FCFA)",
      "Recettes Especes (FCFA)",
      "Recettes Mobile Money (FCFA)",
      "Total Recettes Hotel (FCFA)",
      "Total Depenses Gerant (FCFA)",
      "Point Financier Net du Mois (FCFA)",
    ];
    const rows = monthlyHotelSummary.map((m) => [
      m.label,
      m.staysCount,
      m.totalDiscounts,
      m.cashIn,
      m.momoIn,
      m.totalRevenue,
      m.totalExpenses,
      m.netBalance,
    ]);
    rows.push([
      "TOTAL CUMULE 2026 (Depuis Janvier)",
      annual2026Totals.staysCount,
      annual2026Totals.totalDiscounts,
      annual2026Totals.cashIn,
      annual2026Totals.momoIn,
      annual2026Totals.totalRevenue,
      annual2026Totals.totalExpenses,
      annual2026Totals.netBalance,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RHR_Point_Financier_Mensuel_Hotel_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          EN-TÊTE COCKPIT HÔTEL & ACTIONS RAPIDES
      ===================================================================== */}
      <div className="rounded-2xl bg-rhr-dark text-white p-6 shadow-card border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rhr-gold">
            <BedDouble className="h-4 w-4" />
            <span>Pôle Hôtel RHR — Réception, Passages 3H &amp; Folios</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Cockpit Temps Réel des 5 Chambres Climatisées
          </h1>
          <p className="text-xs sm:text-sm text-gray-300">
            Chambres 1, 2, 3 (Confort) :{" "}
            <strong className="text-white">15 000 F</strong> Nuitée uniquement •
            Chambres 4, 5 (Standard) :{" "}
            <strong className="text-white">10 000 F</strong> Nuitée /{" "}
            <strong className="text-rhr-gold">5 000 F</strong> Passage 3H
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const firstFree =
                rooms.find((r) => r.status === "LIBRE") || rooms[0];
              openCheckInForRoom(firstFree, "NUITEE");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2.5 text-xs font-extrabold text-white shadow-rhr transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nouveau Check-In / Passage 3H</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstFree =
                rooms.find((r) => r.status === "LIBRE") || rooms[0];
              openCheckInForRoom(firstFree, "RESERVATION");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rhr-gold/50 bg-rhr-gold/15 hover:bg-rhr-gold/25 px-4 py-2.5 text-xs font-extrabold text-rhr-gold transition"
          >
            <Calendar className="h-4 w-4" />
            <span>Nouvelle Réservation + Acompte</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOCATION_SALLE")}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2.5 text-xs font-extrabold text-amber-200 transition"
          >
            <Sparkles className="h-4 w-4 text-rhr-gold" />
            <span>Location Salle (Avances &amp; Reste à Payer)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REPORTING_JOURNALIER_HOTEL")}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 px-4 py-2.5 text-xs font-extrabold text-emerald-300 transition"
          >
            <FileText className="h-4 w-4" />
            <span>Reporting Journalier Gérant Hôtel</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          JAUGES DE LA CAISSE DU SERVICE HÔTEL (SANS EXPOSER LE CA GLOBAL)
      ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-500">
              Occupation Chambres
            </span>
            <div className="text-2xl font-black text-rhr-dark mt-1">
              {
                rooms.filter(
                  (r) =>
                    r.status === "OCCUPEE_NUITEE" ||
                    r.status === "OCCUPEE_PASSAGE_3H"
                ).length
              }{" "}
              / 5 Occupées
            </div>
            <span className="text-xs text-emerald-700 font-semibold">
              {rooms.filter((r) => r.status === "LIBRE").length} libre(s) •{" "}
              {rooms.filter((r) => r.status === "RESERVEE").length} réservée(s)
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BedDouble className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-500">
              Espèces Attendues (Caisse Hôtel)
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {formatCFA(expectedHotelCashInTill)}
            </div>
            <span className="text-xs text-gray-500">
              Encaissé ({formatCFA(hotelCashIn)}) - Dépenses jour (
              {formatCFA(hotelDayTillExpenses)})
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-500">
              Mobile Money Hôtel (Wave/OM/MTN)
            </span>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {formatCFA(hotelMoMoIn)}
            </div>
            <span className="text-xs text-gray-500">
              Acomptes &amp; règlements numériques
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Smartphone className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-gray-500">
              Transferts Bar/Resto en cours
            </span>
            <div className="text-2xl font-black text-rhr-burgundy mt-1">
              {formatCFA(
                folioItems
                  .filter((f) => f.category === "BAR_RESTO" && !f.isPaid)
                  .reduce((s, f) => s + f.amount, 0)
              )}
            </div>
            <span className="text-xs text-gray-500">
              À encaisser au Check-out des chambres
            </span>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-rhr-burgundy/10 text-rhr-burgundy flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          BARRE D'ONGLETS DU PÔLE HÔTEL
      ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap rounded-2xl bg-white border border-gray-200 p-1 shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("COCKPIT")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "COCKPIT"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-gray-600 hover:text-rhr-dark"
            )}
          >
            <BedDouble className="h-4 w-4" />
            <span>1. Cockpit des 5 Chambres &amp; Folios</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CALENDRIER_RESA")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "CALENDRIER_RESA"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-gray-600 hover:text-rhr-dark"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>
              2. Calendrier Réservations &amp; Acomptes (
              {stays.filter((s) => s.status !== "TERMINE").length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DEPENSES_ENTRETIEN")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "DEPENSES_ENTRETIEN"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-gray-600 hover:text-rhr-dark"
            )}
          >
            <Wrench className="h-4 w-4" />
            <span>
              3. Dépenses d&apos;Entretien Hôtel (
              {hotelMaintenanceExpenses.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("HISTORIQUE_MENSUEL")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "HISTORIQUE_MENSUEL"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span>
              4. Opérations Gérant &amp; Point Mensuel (Depuis Janv. 2026)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LOCATION_SALLE")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "LOCATION_SALLE"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-amber-900 bg-amber-50 hover:bg-amber-100"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>
              5. Location Salle — Avances &amp; Reste à Payer (
              {ceremonies.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REPORTING_JOURNALIER_HOTEL")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition",
              activeTab === "REPORTING_JOURNALIER_HOTEL"
                ? "bg-rhr-burgundy text-white shadow"
                : "text-blue-900 bg-blue-50 hover:bg-blue-100"
            )}
          >
            <FileText className="h-4 w-4" />
            <span>6. Reporting Journalier Hôtel (Sans Bar)</span>
          </button>
        </div>

        <span className="text-xs text-gray-500 font-medium">
          Cliquez sur une chambre occupée ou réservée pour ouvrir son{" "}
          <strong className="text-rhr-burgundy">Folio Détaillé</strong>
        </span>
      </div>

      {/* =====================================================================
          ONGLET 1 : COCKPIT TEMPS RÉEL DES 5 CHAMBRES
      ===================================================================== */}
      {activeTab === "COCKPIT" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const stay = stays.find((s) => s.id === room.currentStayId);
            const roomFolios = folioItems.filter(
              (f) => f.stayId === room.currentStayId
            );
            const barRestoTransferred = roomFolios
              .filter((f) => f.category === "BAR_RESTO")
              .reduce((a, b) => a + b.amount, 0);
            const totalRemaining = Math.max(
              0,
              roomFolios.reduce((acc, f) => acc + f.amount, 0)
            );

            const isPassage = room.status === "OCCUPEE_PASSAGE_3H" && stay;
            const countdown = isPassage
              ? computePassageCountdown(stay.expectedCheckOut, nowMs)
              : null;

            const statusConfig: Record<
              Room["status"],
              {
                cardBorder: string;
                badgeBg: string;
                label: string;
              }
            > = {
              LIBRE: {
                cardBorder: "border-emerald-300 bg-white",
                badgeBg: "bg-emerald-600 text-white",
                label: "LIBRE — PRÊTE",
              },
              OCCUPEE_NUITEE: {
                cardBorder: "border-blue-500 bg-white",
                badgeBg: "bg-blue-600 text-white",
                label: "OCCUPÉE — NUITÉE",
              },
              OCCUPEE_PASSAGE_3H: {
                cardBorder: countdown?.isCritical
                  ? "border-red-600 bg-red-50/30 ring-2 ring-red-500/40"
                  : "border-amber-500 bg-amber-50/20",
                badgeBg: countdown?.isCritical
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-amber-500 text-white",
                label: countdown?.isExpired
                  ? "PASSAGE 3H EXPIRÉ !"
                  : "OCCUPÉE — PASSAGE 3H",
              },
              RESERVEE: {
                cardBorder: "border-purple-400 bg-white",
                badgeBg: "bg-purple-700 text-white",
                label: "RÉSERVÉE (ACOMPTE)",
              },
              A_NETTOYER: {
                cardBorder: "border-gray-400 bg-gray-100",
                badgeBg: "bg-gray-700 text-white",
                label: "À NETTOYER (MÉNAGE)",
              },
            };

            const cfg = statusConfig[room.status];

            return (
              <div
                key={room.id}
                className={cn(
                  "rounded-3xl border-2 p-5 shadow-card flex flex-col justify-between transition-all duration-200 space-y-4",
                  cfg.cardBorder
                )}
              >
                {/* Haut de Carte Chambre */}
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
                          room.category === "CONFORT"
                            ? "bg-rhr-gold/20 text-rhr-dark border border-rhr-gold/50"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        <Sparkles className="h-3 w-3 text-rhr-burgundy" />
                        Catégorie {room.category}
                      </span>
                      <h2 className="text-xl font-black text-rhr-dark mt-1">
                        {room.name}
                      </h2>
                    </div>

                    <span
                      className={cn(
                        "rounded-xl px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-sm shrink-0",
                        cfg.badgeBg
                      )}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {/* Tarifs officiels Nuitée & Passage 3H (Ch. 4 & 5 uniquement) */}
                  <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-rhr-surface p-3 border border-gray-200">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 block">
                        Tarif Nuitée (24h)
                      </span>
                      <span className="text-base font-black text-rhr-dark">
                        {formatCFA(room.nightPrice)}
                      </span>
                    </div>
                    <div className="border-l border-gray-200 pl-3">
                      <span className="text-[11px] font-semibold text-gray-500 block">
                        Passage Journée (3h)
                      </span>
                      {room.allowPassage3h ? (
                        <span className="text-base font-black text-rhr-burgundy">
                          {formatCFA(room.passagePrice)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400">
                          Nuitée uniquement
                        </span>
                      )}
                    </div>
                  </div>

                  {/* =========================================================
                      COMPTE À REBOURS DYNAMIQUE POUR PASSAGE 3H (5 000 F)
                  ========================================================= */}
                  {isPassage && countdown && (
                    <div
                      className={cn(
                        "rounded-2xl p-3.5 border-2 space-y-2.5 transition-all",
                        countdown.isCritical
                          ? "bg-red-600 text-white border-red-700 animate-pulse shadow-lg"
                          : "bg-amber-500/15 text-amber-950 border-amber-400"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>Minuteur Passage 3H</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            simulatePassageNearExpiry(
                              room.id,
                              countdown.isCritical && !countdown.isExpired
                            )
                          }
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-bold underline",
                            countdown.isCritical
                              ? "bg-white/20 text-white"
                              : "bg-amber-500/20 text-amber-900"
                          )}
                          title="Simuler la fin des 3 heures pour tester l'alerte rouge clignotante"
                        >
                          {countdown.isCritical
                            ? "Simuler 00:00 Expiré"
                            : "Tester Alerte Fin 3h"}
                        </button>
                      </div>

                      <div className="font-mono text-lg sm:text-xl font-black tracking-tight text-center py-1 rounded-xl bg-black/10">
                        {countdown.label}
                      </div>

                      {/* Boutons d'action directe Passage 3H : Prolonger en Nuitée ou Clôturer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => upgradePassageToNight(room.id)}
                          className={cn(
                            "h-9 rounded-xl px-2.5 text-[11px] font-extrabold transition inline-flex items-center justify-center gap-1 shadow-sm whitespace-nowrap",
                            countdown.isCritical
                              ? "bg-white text-rhr-burgundy hover:bg-gray-100"
                              : "bg-rhr-dark text-white hover:bg-rhr-burgundy"
                          )}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            + Nuitée (+
                            {formatCFA(room.nightPrice - room.passagePrice)})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFolioRoomId(room.id)}
                          className={cn(
                            "h-9 rounded-xl px-2.5 text-[11px] font-extrabold transition inline-flex items-center justify-center gap-1 shadow-sm whitespace-nowrap",
                            countdown.isCritical
                              ? "bg-amber-300 text-rhr-dark hover:bg-amber-200"
                              : "bg-rhr-burgundy text-white hover:bg-rhr-burgundy-light"
                          )}
                        >
                          <LogOut className="h-3.5 w-3.5 shrink-0" />
                          <span>Clôturer Passage</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* =========================================================
                      DÉTAILS DU SÉJOUR ACTIF OU DE LA RÉSERVATION
                  ========================================================= */}
                  {stay ? (
                    <div
                      onClick={() => setFolioRoomId(room.id)}
                      className="cursor-pointer group rounded-2xl border border-gray-200 bg-gray-50/80 hover:bg-rhr-burgundy/[0.03] hover:border-rhr-burgundy p-3.5 space-y-2.5 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-rhr-dark flex items-center gap-1.5 truncate">
                            <User className="h-4 w-4 text-rhr-burgundy shrink-0" />
                            <span className="truncate">{stay.guestName}</span>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{stay.guestPhone}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-rhr-burgundy group-hover:bg-rhr-burgundy group-hover:text-white transition whitespace-nowrap shrink-0">
                          <Receipt className="h-3.5 w-3.5 shrink-0" />
                          <span>Ouvrir Folio</span>
                        </span>
                      </div>

                      {/* Indicateur Réduction Client accordée (Chambres 1 à 3) */}
                      {stay.discountAmount && stay.discountAmount > 0 ? (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-100/90 border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-950">
                          <span className="flex items-center gap-1.5 truncate">
                            <Tag className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">
                              Réduction accordée
                              {stay.discountReason
                                ? ` (${stay.discountReason})`
                                : ""}{" "}
                              :
                            </span>
                          </span>
                          <span className="font-black text-emerald-800 whitespace-nowrap shrink-0">
                            - {formatCFA(stay.discountAmount)}
                          </span>
                        </div>
                      ) : null}

                      {/* Indicateur Consommations Bar & Restaurant transférées */}
                      {barRestoTransferred > 0 && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-100/80 border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-950">
                          <span className="flex items-center gap-1.5 truncate">
                            <UtensilsCrossed className="h-3.5 w-3.5 text-rhr-burgundy shrink-0" />
                            <span className="truncate">Conso Bar/Resto :</span>
                          </span>
                          <span className="font-black text-rhr-burgundy whitespace-nowrap shrink-0">
                            + {formatCFA(barRestoTransferred)}
                          </span>
                        </div>
                      )}

                      {/* Synthèse Acompte & Reste à payer */}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs gap-2">
                        <span className="text-gray-600 whitespace-nowrap">
                          Acompte :{" "}
                          <strong className="text-emerald-700">
                            {formatCFA(stay.depositAmount)}
                          </strong>
                        </span>
                        <span
                          className={cn(
                            "font-black text-sm whitespace-nowrap",
                            totalRemaining > 0
                              ? "text-red-600"
                              : "text-emerald-700"
                          )}
                        >
                          {totalRemaining > 0
                            ? `Reste : ${formatCFA(totalRemaining)}`
                            : "Soldé (0 F)"}
                        </span>
                      </div>
                    </div>
                  ) : room.status === "A_NETTOYER" ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-400 bg-white p-4 text-center space-y-3">
                      <div className="text-xs font-bold text-gray-700">
                        Check-out terminé — Chambre en attente de ménage
                      </div>
                      <button
                        type="button"
                        onClick={() => markRoomClean(room.id)}
                        className="h-10 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-extrabold text-white shadow transition whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Marquer Propre / Libre</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-center space-y-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                      <div className="text-xs font-bold text-emerald-950">
                        Chambre climatisée propre &amp; disponible
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        {room.allowPassage3h
                          ? `Choisissez Nuitée (${formatCFA(room.nightPrice)}), Passage 3H (${formatCFA(room.passagePrice)}) ou Réservation.`
                          : `Choisissez Nuitée (${formatCFA(room.nightPrice)}) ou Réservation (Passage 3H réservé aux Ch. 4 & 5).`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pied de Carte : Actions rapides selon statut (1 seule ligne par bouton) */}
                <div className="pt-3 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
                  {room.status === "LIBRE" && (
                    <div
                      className={cn(
                        "grid gap-2 w-full",
                        room.allowPassage3h ? "grid-cols-3" : "grid-cols-2"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openCheckInForRoom(room, "NUITEE")}
                        className="h-10 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-2 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                      >
                        + Nuitée
                      </button>
                      {room.allowPassage3h && (
                        <button
                          type="button"
                          onClick={() => openCheckInForRoom(room, "PASSAGE_3H")}
                          className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 px-2 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                        >
                          + Passage 3H
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openCheckInForRoom(room, "RESERVATION")}
                        className="h-10 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 px-2 text-xs font-bold text-rhr-dark transition inline-flex items-center justify-center whitespace-nowrap"
                      >
                        Réserver
                      </button>
                    </div>
                  )}

                  {(room.status === "OCCUPEE_NUITEE" ||
                    room.status === "OCCUPEE_PASSAGE_3H") && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => setFolioRoomId(room.id)}
                        className="h-10 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-3 text-xs font-extrabold text-white transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <Receipt className="h-3.5 w-3.5 text-rhr-gold shrink-0" />
                        <span>Folio &amp; Conso</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolioRoomId(room.id)}
                        className="h-10 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-3 text-xs font-extrabold text-white transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>Solde &amp; Check-Out</span>
                      </button>
                    </div>
                  )}

                  {room.status === "RESERVEE" && stay && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setDepositModalStay(stay);
                          setExtraDepositAmount(Math.max(1000, totalRemaining));
                        }}
                        className="h-10 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 px-2.5 text-xs font-extrabold text-purple-900 transition inline-flex items-center justify-center whitespace-nowrap"
                      >
                        + Acompte (1 clic)
                      </button>
                      <button
                        type="button"
                        onClick={() => activateReservedStay(stay.id)}
                        className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-2.5 text-xs font-extrabold text-white transition inline-flex items-center justify-center whitespace-nowrap"
                      >
                        Arrivée Check-In
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          ONGLET 2 : CALENDRIER & TABLEAU DES RÉSERVATIONS AVEC ACOMPTES
      ===================================================================== */}
      {activeTab === "CALENDRIER_RESA" && (
        <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                Planning &amp; Suivi des Acomptes Hôtel
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-0.5">
                Calendrier des Réservations &amp; Séjours Actifs
              </h2>
              <p className="text-xs text-gray-500">
                Visualisez l&apos;acompte déjà versé, le{" "}
                <strong className="text-red-600">Reste à payer en rouge</strong>{" "}
                et encaissez un complément d&apos;acompte en 1 clic.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const freeRoom =
                  rooms.find((r) => r.status === "LIBRE") || rooms[0];
                openCheckInForRoom(freeRoom, "RESERVATION");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-4 py-2.5 text-xs font-extrabold text-white shadow-rhr transition"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Créer une Réservation</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-extrabold uppercase text-gray-500 bg-rhr-surface">
                  <th className="py-3 px-4 rounded-tl-xl">Chambre</th>
                  <th className="py-3 px-4">Client &amp; WhatsApp</th>
                  <th className="py-3 px-4">Type &amp; Arrivée</th>
                  <th className="py-3 px-4">Total Facturé</th>
                  <th className="py-3 px-4">Acompte Versé</th>
                  <th className="py-3 px-4">Reste à Payer</th>
                  <th className="py-3 px-4 text-right rounded-tr-xl">
                    Actions Rapides (1 Clic)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {stays.map((st) => {
                  const room = rooms.find((r) => r.roomNumber === st.roomNumber);
                  const stFolios = folioItems.filter((f) => f.stayId === st.id);
                  const totalCharged = stFolios
                    .filter((f) => f.amount > 0)
                    .reduce((a, b) => a + b.amount, 0);
                  const totalPaid = Math.abs(
                    stFolios
                      .filter((f) => f.amount < 0)
                      .reduce((a, b) => a + b.amount, 0)
                  );
                  const remaining = Math.max(0, totalCharged - totalPaid);

                  return (
                    <tr key={st.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3.5 px-4 font-black text-rhr-dark">
                        Chambre {st.roomNumber}
                        <span className="block text-[10px] font-semibold text-gray-500">
                          {room?.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-rhr-dark">
                          {st.guestName}
                        </div>
                        <div className="text-gray-500">{st.guestPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                            st.status === "RESERVE"
                              ? "bg-purple-100 text-purple-800"
                              : st.status === "TERMINE"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {st.stayType} • {st.status}
                        </span>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {formatDateTime(st.checkIn)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rhr-dark">
                        {formatCFA(totalCharged)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatCFA(totalPaid)}
                        {st.depositMethod && (
                          <span className="block text-[10px] text-gray-500">
                            via {st.depositMethod}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {remaining > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 border border-red-200 px-2.5 py-1 text-xs font-black text-red-700">
                            {formatCFA(remaining)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            Soldé (0 F)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {st.status !== "TERMINE" && remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setDepositModalStay(st);
                              setExtraDepositAmount(remaining);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>+ Encaisser Acompte</span>
                          </button>
                        )}
                        {st.status === "RESERVE" && (
                          <button
                            type="button"
                            onClick={() => activateReservedStay(st.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Check-In Client</span>
                          </button>
                        )}
                        {room && st.status !== "TERMINE" && (
                          <button
                            type="button"
                            onClick={() => setFolioRoomId(room.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 px-3 py-1.5 text-xs font-bold text-rhr-dark transition"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Folio</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 3 : SAISIE RAPIDE DES DÉPENSES D'ENTRETIEN HÔTEL
      ===================================================================== */}
      {activeTab === "DEPENSES_ENTRETIEN" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulaire de saisie rapide pour le Gérant Hôtel */}
          <div className="lg:col-span-5 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                <Wrench className="h-3.5 w-3.5" />
                Menues Dépenses &amp; Entretien des 5 Chambres
              </span>
              <h2 className="text-xl font-black text-rhr-dark mt-1">
                Enregistrer une Sortie d&apos;Entretien Hôtel
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Eau de javel, ampoules, draps, savons ou réparations. Sans aucun
                accès au chiffre d&apos;affaires global du complexe.
              </p>
            </div>

            {expSuccessBanner && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{expSuccessBanner}</span>
              </div>
            )}

            <form onSubmit={handleAddHotelExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catégorie d&apos;entretien
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                >
                  <option value="Eau de Javel, Savons & Détergents">
                    Eau de Javel, Savons &amp; Détergents
                  </option>
                  <option value="Ampoules, Piles Télécommande & Électricité">
                    Ampoules, Piles Télécommande &amp; Électricité
                  </option>
                  <option value="Draps, Serviettes & Blanchisserie">
                    Draps, Serviettes &amp; Blanchisserie
                  </option>
                  <option value="Entretien Climatisation & Plomberie">
                    Entretien Climatisation &amp; Plomberie
                  </option>
                  <option value="Autre Dépense Hôtel">
                    Autre Dépense Hôtel
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motif détaillé de l&apos;achat / réparation
                </label>
                <input
                  type="text"
                  required
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Ex: 2 bidons d'eau de javel + 3 ampoules LED Chambres 2 et 4"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Date de l&apos;opération (depuis Janvier 2026)
                </label>
                <input
                  type="date"
                  min="2026-01-01"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Montant décaissé (FCFA)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-black text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Moyen de décaissement
                  </label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) =>
                      setExpPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  >
                    <option value="ESPECES">Espèces Physique</option>
                    <option value="WAVE">Wave Mobile Money</option>
                    <option value="ORANGE_MONEY">Orange Money</option>
                    <option value="MTN_MOMO">MTN MoMo</option>
                  </select>
                </div>
              </div>

              {/* Choix obligatoire de la source des fonds selon SPEC.md */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Source obligatoire des fonds :
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setExpFundSource("CAISSE_DU_JOUR")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition",
                      expFundSource === "CAISSE_DU_JOUR"
                        ? "border-rhr-burgundy bg-rhr-burgundy/5"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="text-xs font-extrabold text-rhr-dark">
                      1. Pris dans la caisse du jour (Hôtel)
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Déduit automatiquement les espèces attendues lors de la
                      clôture du soir.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpFundSource("FONDS_SEPARE")}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition",
                      expFundSource === "FONDS_SEPARE"
                        ? "border-rhr-burgundy bg-rhr-burgundy/5"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className="text-xs font-extrabold text-rhr-dark">
                      2. Pris dans le fonds de caisse séparé (Menues dépenses)
                    </div>
                    <div className="text-[11px] text-gray-500">
                      N&apos;impacte pas la recette journalière des chambres.
                    </div>
                  </button>
                </div>
              </div>

              {/* Photo du reçu facultative */}
              <div className="rounded-xl border border-dashed border-gray-300 bg-rhr-surface p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-rhr-burgundy" />
                    Photo du reçu / facture (Facultatif)
                  </span>
                  {expPhotoPreview && (
                    <button
                      type="button"
                      onClick={() => setExpPhotoPreview(undefined)}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-rhr-dark file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-rhr-burgundy"
                />
                {expPhotoPreview && (
                  <img
                    src={expPhotoPreview}
                    alt="Aperçu justificatif"
                    className="h-24 w-auto rounded-lg border border-gray-200 object-cover mt-2"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-rhr transition"
              >
                Enregistrer la dépense d&apos;entretien ({formatCFA(expAmount)})
              </button>
            </form>
          </div>

          {/* Historique des dépenses d'entretien du pôle Hôtel */}
          <div className="lg:col-span-7 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-rhr-dark">
                  Journal des Sorties d&apos;Entretien Hôtel
                </h3>
                <p className="text-xs text-gray-500">
                  Traçabilité complète signée par{" "}
                  <code className="font-mono text-rhr-burgundy">createdBy</code>
                </p>
              </div>
              <span className="rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-black text-rhr-burgundy">
                Total Dépenses Hôtel :{" "}
                {formatCFA(
                  hotelMaintenanceExpenses.reduce((s, t) => s + t.amount, 0)
                )}
              </span>
            </div>

            {hotelMaintenanceExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
                Aucune dépense d&apos;entretien hôtel enregistrée sur cette
                session. Utilisez le formulaire ci-contre pour saisir un achat
                (eau de javel, ampoules, draps...).
              </div>
            ) : (
              <div className="space-y-3">
                {hotelMaintenanceExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rhr-dark">
                          {exp.reference}
                        </span>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                            exp.expenseFundSource === "CAISSE_DU_JOUR"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {exp.expenseFundSource === "CAISSE_DU_JOUR"
                            ? "Pris dans la Caisse du Jour"
                            : "Pris dans le Fonds Séparé"}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-rhr-dark">
                        {exp.description}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Saisi par {exp.createdByName} •{" "}
                        {formatDateTime(exp.createdAt)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {exp.receiptPhotoUrl && (
                        <img
                          src={exp.receiptPhotoUrl}
                          alt="Reçu"
                          className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                        />
                      )}
                      <div className="text-right">
                        <div className="text-base font-black text-rhr-burgundy">
                          - {formatCFA(exp.amount)}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500">
                          {exp.paymentMethod}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 4 : OPÉRATIONS DU GÉRANT DEPUIS JANVIER 2026 & POINT FINANCIER MENSUEL
      ===================================================================== */}
      {activeTab === "HISTORIQUE_MENSUEL" && (
        <div className="space-y-6">
          {/* Bandeau récapitulatif global Janvier 2026 -> Aujourd'hui */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card">
              <span className="text-[11px] font-bold uppercase text-gray-500">
                Total Recettes Hôtel (Depuis Janv. 2026)
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCFA(annual2026Totals.totalRevenue)}
              </div>
              <span className="text-xs text-gray-500">
                Espèces : {formatCFA(annual2026Totals.cashIn)} • MoMo :{" "}
                {formatCFA(annual2026Totals.momoIn)}
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card">
              <span className="text-[11px] font-bold uppercase text-gray-500">
                Réductions Accordées (Chambres 1 à 3)
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                - {formatCFA(annual2026Totals.totalDiscounts)}
              </div>
              <span className="text-xs text-gray-500">
                Sur {annual2026Totals.staysCount} séjour(s) / passage(s) 2026
              </span>
            </div>

            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-card">
              <span className="text-[11px] font-bold uppercase text-gray-500">
                Total Dépenses Gérant Hôtel (2026)
              </span>
              <div className="text-2xl font-black text-rhr-burgundy mt-1">
                - {formatCFA(annual2026Totals.totalExpenses)}
              </div>
              <span className="text-xs text-gray-500">
                Entretien, réparations &amp; charges chambres
              </span>
            </div>

            <div className="rounded-2xl bg-rhr-dark text-white border border-rhr-gold/40 p-4 shadow-card">
              <span className="text-[11px] font-bold uppercase text-rhr-gold">
                Bénéfice / Point Net Hôtel (2026)
              </span>
              <div
                className={cn(
                  "text-2xl font-black mt-1",
                  annual2026Totals.netBalance >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {formatCFA(annual2026Totals.netBalance)}
              </div>
              <span className="text-xs text-gray-300">
                Recettes Hôtel - Dépenses Gérant Hôtel
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLONNE GAUCHE (5 col) : FORMULAIRE DE SAISIE DES OPÉRATIONS DU GÉRANT DEPUIS JANVIER 2026 */}
            <div className="lg:col-span-5 rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                  <Calendar className="h-3.5 w-3.5" />
                  Saisie Rétroactive &amp; Quotidienne (Depuis Janvier 2026)
                </span>
                <h2 className="text-xl font-black text-rhr-dark mt-1">
                  Enregistrer une Opération du Gérant Hôtel
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Saisissez tous les séjours/passages (avec réduction éventuelle
                  sur les Chambres 1 à 3) et toutes les dépenses effectuées par
                  le gérant depuis Janvier 2026.
                </p>
              </div>

              {histSuccessBanner && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs font-bold text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{histSuccessBanner}</span>
                </div>
              )}

              {/* Sélecteur Type d'Opération : Séjour Chambre vs Dépense Hôtel */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-rhr-surface p-1.5 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setHistOpType("SEJOUR_CHAMBRE")}
                  className={cn(
                    "rounded-xl py-2.5 px-3 text-xs font-extrabold transition flex items-center justify-center gap-1.5",
                    histOpType === "SEJOUR_CHAMBRE"
                      ? "bg-rhr-burgundy text-white shadow"
                      : "text-gray-600 hover:text-rhr-dark"
                  )}
                >
                  <BedDouble className="h-4 w-4 shrink-0" />
                  <span>1. Recette Chambre (1-5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistOpType("DEPENSE_HOTEL")}
                  className={cn(
                    "rounded-xl py-2.5 px-3 text-xs font-extrabold transition flex items-center justify-center gap-1.5",
                    histOpType === "DEPENSE_HOTEL"
                      ? "bg-rhr-dark text-white shadow"
                      : "text-gray-600 hover:text-rhr-dark"
                  )}
                >
                  <Wrench className="h-4 w-4 shrink-0" />
                  <span>2. Dépense Gérant Hôtel</span>
                </button>
              </div>

              <form onSubmit={handleRecordHistoricalOpSubmit} className="space-y-4">
                {/* Sélection rapide du mois de 2026 + Date exacte */}
                <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-3.5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1.5">
                      Accès rapide au mois (Année 2026) :
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MONTHS_2026.slice(0, 11).map((m) => {
                        const isActiveMonth = histDate.startsWith(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => {
                              setHistDate(m.defaultDate);
                              setSelectedMonthFilter(m.key);
                            }}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-[11px] font-bold transition border",
                              isActiveMonth
                                ? "bg-rhr-burgundy text-white border-rhr-burgundy shadow-sm"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {m.label.replace(" 2026", "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Date exacte de l&apos;opération (depuis le 01/01/2026) *
                    </label>
                    <input
                      type="date"
                      min="2026-01-01"
                      max="2026-12-31"
                      required
                      value={histDate}
                      onChange={(e) => setHistDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-black text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                    />
                  </div>
                </div>

                {histOpType === "SEJOUR_CHAMBRE" ? (
                  <>
                    {/* Choix Chambre 1 à 5 & Formule */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Chambre (1 à 5)
                        </label>
                        <select
                          value={histRoomNumber}
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            setHistRoomNumber(num);
                            if (num <= 3 && histStayType === "PASSAGE_3H") {
                              setHistStayType("NUITEE");
                            }
                            if (num > 3) {
                              setHistDiscountAmount(0);
                              setHistDiscountReason("");
                            }
                          }}
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.roomNumber}>
                              Chambre {r.roomNumber} ({r.category}) —{" "}
                              {formatCFA(r.nightPrice)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Formule
                        </label>
                        <select
                          value={histEffectiveStayType}
                          onChange={(e) =>
                            setHistStayType(
                              e.target.value as "NUITEE" | "PASSAGE_3H"
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                        >
                          <option value="NUITEE">
                            Nuitée ({formatCFA(selectedHistRoom.nightPrice)})
                          </option>
                          <option
                            value="PASSAGE_3H"
                            disabled={!selectedHistRoom.allowPassage3h}
                          >
                            {selectedHistRoom.allowPassage3h
                              ? `Passage 3H (${formatCFA(selectedHistRoom.passagePrice)})`
                              : "Passage 3H (Ch. 4 & 5 uniquement)"}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Nombre de nuitées & Nom client */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {histEffectiveStayType !== "PASSAGE_3H" && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Nombre de Nuitées
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={histNights}
                            onChange={(e) =>
                              setHistNights(Math.max(1, Number(e.target.value)))
                            }
                            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                          />
                        </div>
                      )}
                      <div
                        className={
                          histEffectiveStayType === "PASSAGE_3H"
                            ? "sm:col-span-2"
                            : ""
                        }
                      >
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Nom du Client (Facultatif)
                        </label>
                        <input
                          type="text"
                          value={histClientName}
                          onChange={(e) => setHistClientName(e.target.value)}
                          placeholder={`Ex: Client Chambre ${selectedHistRoom.roomNumber}`}
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* BLOC RÉDUCTION CLIENT POUR CHAMBRES 1 À 3 */}
                    {histCanDiscount && (
                      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-rhr-burgundy" />
                            Réduction Client (Chambre {selectedHistRoom.roomNumber})
                          </span>
                          <span className="text-[11px] font-bold text-amber-900">
                            Tarif normal : {formatCFA(histGrossRoomCost)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {[0, 1000, 2000, 3000, 5000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setHistDiscountAmount(preset)}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-[11px] font-extrabold border transition",
                                histDiscountAmount === preset
                                  ? "bg-rhr-burgundy text-white border-rhr-burgundy"
                                  : "bg-white text-gray-700 border-amber-300 hover:bg-amber-100"
                              )}
                            >
                              {preset === 0
                                ? "0 F (Sans réduction)"
                                : `- ${formatCFA(preset)}`}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              Montant de la réduction (FCFA)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={histGrossRoomCost}
                              step={500}
                              value={histDiscountAmount}
                              onChange={(e) =>
                                setHistDiscountAmount(
                                  Math.max(0, Number(e.target.value))
                                )
                              }
                              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm font-black text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                              Motif réduction (Optionnel)
                            </label>
                            <input
                              type="text"
                              value={histDiscountReason}
                              onChange={(e) =>
                                setHistDiscountReason(e.target.value)
                              }
                              placeholder="Ex: Client fidèle / Remise"
                              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Montant Net & Mode de règlement */}
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">
                          Net encaissé pour ce séjour :
                        </span>
                        <span className="text-lg font-black text-emerald-700">
                          {formatCFA(histNetRoomAmount)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Mode d&apos;encaissement
                        </label>
                        <select
                          value={histPaymentMethod}
                          onChange={(e) =>
                            setHistPaymentMethod(e.target.value as PaymentMethod)
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark"
                        >
                          <option value="ESPECES">Espèces (Caisse Physique)</option>
                          <option value="WAVE">Wave Mobile Money</option>
                          <option value="ORANGE_MONEY">Orange Money</option>
                          <option value="MTN_MOMO">MTN MoMo</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Formulaire Dépense Historique du Gérant */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Catégorie de dépense Hôtel
                      </label>
                      <select
                        value={histExpCategory}
                        onChange={(e) => setHistExpCategory(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rhr-dark"
                      >
                        <option value="Eau de Javel, Savons & Détergents">
                          Eau de Javel, Savons &amp; Détergents
                        </option>
                        <option value="Ampoules, Piles Télécommande & Électricité">
                          Ampoules, Piles Télécommande &amp; Électricité
                        </option>
                        <option value="Draps, Serviettes & Blanchisserie">
                          Draps, Serviettes &amp; Blanchisserie
                        </option>
                        <option value="Entretien Climatisation & Plomberie">
                          Entretien Climatisation &amp; Plomberie
                        </option>
                        <option value="Avance / Prime / Frais Gérant Hôtel">
                          Avance / Prime / Frais Gérant Hôtel
                        </option>
                        <option value="Autre Dépense Hôtel">
                          Autre Dépense Hôtel
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Détail de la dépense / sortie *
                      </label>
                      <input
                        type="text"
                        required
                        value={histExpDesc}
                        onChange={(e) => setHistExpDesc(e.target.value)}
                        placeholder="Ex: Réparation serrure Chambre 2 + Achat détergents"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Montant décaissé (FCFA) *
                        </label>
                        <input
                          type="number"
                          min={100}
                          step={100}
                          required
                          value={histExpAmount}
                          onChange={(e) =>
                            setHistExpAmount(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-black text-rhr-burgundy"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Moyen de paiement
                        </label>
                        <select
                          value={histPaymentMethod}
                          onChange={(e) =>
                            setHistPaymentMethod(e.target.value as PaymentMethod)
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
                  </>
                )}

                <button
                  type="submit"
                  className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-rhr transition"
                >
                  {histOpType === "SEJOUR_CHAMBRE"
                    ? `Enregistrer Recette Chambre (${formatCFA(histNetRoomAmount)})`
                    : `Enregistrer Dépense Gérant (-${formatCFA(histExpAmount)})`}
                </button>
              </form>
            </div>

            {/* COLONNE DROITE (7 col) : TABLEAU DU POINT FINANCIER DE CHAQUE MOIS DEPUIS JANVIER 2026 */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                      Bilan Mensuel d&apos;Exploitation Hôtel (2026)
                    </span>
                    <h3 className="text-lg font-black text-rhr-dark">
                      Point Financier de Chaque Mois (Depuis Janvier 2026)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Cliquez sur un mois pour filtrer le détail des opérations
                      enregistrées ci-dessous.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportHotelMonthlyCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rhr-dark hover:bg-rhr-burgundy px-3.5 py-2 text-xs font-extrabold text-white transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 text-rhr-gold" />
                    <span>Exporter Excel / CSV (2026)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-[10px] font-extrabold uppercase text-gray-500 bg-rhr-surface">
                        <th className="py-3 px-3 rounded-tl-xl">Mois 2026</th>
                        <th className="py-3 px-2.5 text-center">Séjours</th>
                        <th className="py-3 px-2.5 text-right">
                          Réductions (Ch.1-3)
                        </th>
                        <th className="py-3 px-2.5 text-right">
                          Recettes Hôtel
                        </th>
                        <th className="py-3 px-2.5 text-right">
                          Dépenses Gérant
                        </th>
                        <th className="py-3 px-3 text-right rounded-tr-xl">
                          Point Net du Mois
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {monthlyHotelSummary.map((m) => {
                        const isSelected = selectedMonthFilter === m.key;
                        return (
                          <tr
                            key={m.key}
                            onClick={() =>
                              setSelectedMonthFilter(
                                isSelected ? "ALL_2026" : m.key
                              )
                            }
                            className={cn(
                              "cursor-pointer transition",
                              isSelected
                                ? "bg-rhr-burgundy/10 font-bold"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <td className="py-3 px-3 font-extrabold text-rhr-dark flex items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  m.txCount > 0
                                    ? "bg-emerald-500"
                                    : "bg-gray-300"
                                )}
                              />
                              <span>{m.label}</span>
                            </td>
                            <td className="py-3 px-2.5 text-center font-bold text-gray-700">
                              {m.staysCount}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-amber-700">
                              {m.totalDiscounts > 0
                                ? `- ${formatCFA(m.totalDiscounts)}`
                                : "0 F"}
                            </td>
                            <td className="py-3 px-2.5 text-right font-black text-emerald-700">
                              {formatCFA(m.totalRevenue)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-rhr-burgundy">
                              {m.totalExpenses > 0
                                ? `- ${formatCFA(m.totalExpenses)}`
                                : "0 F"}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={cn(
                                  "inline-block rounded-lg px-2.5 py-1 text-xs font-black",
                                  m.netBalance > 0
                                    ? "bg-emerald-100 text-emerald-900"
                                    : m.netBalance < 0
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {formatCFA(m.netBalance)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-rhr-dark text-white font-black text-xs">
                        <td className="py-3.5 px-3 rounded-bl-xl">
                          CUMUL ANNUEL 2026
                        </td>
                        <td className="py-3.5 px-2.5 text-center">
                          {annual2026Totals.staysCount}
                        </td>
                        <td className="py-3.5 px-2.5 text-right text-amber-300">
                          - {formatCFA(annual2026Totals.totalDiscounts)}
                        </td>
                        <td className="py-3.5 px-2.5 text-right text-emerald-400">
                          {formatCFA(annual2026Totals.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-2.5 text-right text-red-300">
                          - {formatCFA(annual2026Totals.totalExpenses)}
                        </td>
                        <td className="py-3.5 px-3 text-right text-rhr-gold text-sm rounded-br-xl">
                          {formatCFA(annual2026Totals.netBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Journal détaillé des opérations du mois sélectionné */}
              <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div>
                    <h4 className="text-base font-black text-rhr-dark">
                      Journal Détaillé des Opérations du Gérant (
                      {selectedMonthFilter === "ALL_2026"
                        ? "Toute l'année 2026"
                        : MONTHS_2026.find((m) => m.key === selectedMonthFilter)
                            ?.label || selectedMonthFilter}
                      )
                    </h4>
                    <p className="text-xs text-gray-500">
                      {filteredHistoricalTransactions.length} opération(s)
                      enregistrée(s) sur cette période
                    </p>
                  </div>

                  {selectedMonthFilter !== "ALL_2026" && (
                    <button
                      type="button"
                      onClick={() => setSelectedMonthFilter("ALL_2026")}
                      className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Voir tous les mois de 2026
                    </button>
                  )}
                </div>

                {filteredHistoricalTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-500">
                    Aucune opération enregistrée pour cette période. Utilisez le
                    formulaire à gauche pour saisir les opérations du gérant
                    pour ce mois.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredHistoricalTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="rounded-2xl border border-gray-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50/80 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase",
                                tx.type === "ENCAISSEMENT"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-red-100 text-red-800"
                              )}
                            >
                              {tx.type === "ENCAISSEMENT"
                                ? "Recette Chambre"
                                : "Dépense Gérant"}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-gray-500">
                              {formatDateTime(tx.createdAt)}
                            </span>
                            <span className="text-[11px] font-bold text-gray-500">
                              • {tx.paymentMethod}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-rhr-dark">
                            {tx.description}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span
                            className={cn(
                              "text-sm font-black",
                              tx.type === "ENCAISSEMENT"
                                ? "text-emerald-700"
                                : "text-rhr-burgundy"
                            )}
                          >
                            {tx.type === "ENCAISSEMENT" ? "+" : "-"}{" "}
                            {formatCFA(tx.amount)}
                          </span>

                          <button
                            type="button"
                            onClick={() => deleteHotelTransaction(tx.id)}
                            title="Supprimer cette opération si saisie par erreur"
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 5 : LOCATION SALLE DE CÉRÉMONIE — GESTION DES AVANCES & RESTE À PAYER
      ===================================================================== */}
      {activeTab === "LOCATION_SALLE" && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rhr-burgundy">
                  <Sparkles className="h-4 w-4" />
                  Location de la Salle de Cérémonie — Gérant Hôtel
                </span>
                <h2 className="text-xl font-black text-rhr-dark mt-0.5">
                  Enregistrer une Location de Salle &amp; Gérer les Avances / Reste à Payer
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Forfait de base : 50 000 FCFA (jusqu&apos;à 50 couverts inclus) +
                  supplément couverts + remise éventuelle. Alimente automatiquement
                  la ligne <strong>Location salle</strong> du Reporting Journalier.
                </p>
              </div>
            </div>

            {hallFeedback && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {hallFeedback}
                </span>
                <button
                  type="button"
                  onClick={() => setHallFeedback(null)}
                  className="text-emerald-700 hover:underline"
                >
                  Fermer
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!hallClientName.trim()) return;
                const extraCovers = Math.max(0, hallCovers - 50);
                const grossQuote = 50000 + extraCovers * 1000;
                const safeDiscount = Math.max(
                  0,
                  Math.min(hallDiscount || 0, grossQuote)
                );
                const advanceToRecord = Math.max(0, hallInitialAdvance || 0);

                createCeremonyBooking({
                  eventDate: hallDate,
                  eventType: hallEventType,
                  clientName: hallClientName.trim(),
                  clientPhone: hallClientPhone.trim() || "Non renseigné",
                  extraOrdinaryCovers: extraCovers,
                  extraVipCovers: 0,
                  customCateringLines: [],
                  customBeverageLines: [],
                  discountAmount: safeDiscount,
                  initialDepositAmount: advanceToRecord,
                  initialDepositMethod: hallPaymentMethod,
                  operationDateIso: `${hallDate}T12:00:00.000Z`,
                  notes:
                    hallNotes.trim() ||
                    `Location salle (${hallEventType}) — ${hallClientName.trim()}`,
                });

                const netTotal = Math.max(0, grossQuote - safeDiscount);
                const rem = Math.max(0, netTotal - advanceToRecord);

                setHallFeedback(
                  `Location Salle enregistrée pour ${hallClientName.trim()} (${hallDate}) — Total Net : ${formatCFA(
                    netTotal
                  )} | Avance versée : ${formatCFA(
                    advanceToRecord
                  )} | Reste à payer : ${formatCFA(rem)}.`
                );
                setHallClientName("");
                setHallClientPhone("");
                setHallNotes("");
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
            >
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Date de la Location / Opération
                </label>
                <input
                  type="date"
                  min="2026-01-01"
                  value={hallDate}
                  onChange={(e) => setHallDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-rhr-dark"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-gray-600 mb-1">
                  Type d&apos;Événement
                </label>
                <select
                  value={hallEventType}
                  onChange={(e) =>
                    setHallEventType(
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
                  value={hallClientName}
                  onChange={(e) => setHallClientName(e.target.value)}
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
                  value={hallClientPhone}
                  onChange={(e) => setHallClientPhone(e.target.value)}
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
                  value={hallCovers}
                  onChange={(e) =>
                    setHallCovers(Math.max(1, Number(e.target.value) || 50))
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
                  value={hallDiscount || ""}
                  onChange={(e) =>
                    setHallDiscount(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2 text-xs font-bold text-amber-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-emerald-800 mb-1">
                  Avance / Acompte Versé (FCFA)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={hallInitialAdvance}
                  onChange={(e) =>
                    setHallInitialAdvance(
                      Math.max(0, Number(e.target.value) || 0)
                    )
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
                    value={hallPaymentMethod}
                    onChange={(e) =>
                      setHallPaymentMethod(e.target.value as PaymentMethod)
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
                    value={hallNotes}
                    onChange={(e) => setHallNotes(e.target.value)}
                    placeholder="Observation..."
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-rhr-dark"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                {(() => {
                  const gross = 50000 + Math.max(0, hallCovers - 50) * 1000;
                  const net = Math.max(0, gross - (hallDiscount || 0));
                  const rem = Math.max(0, net - (hallInitialAdvance || 0));
                  return (
                    <div className="text-xs text-gray-600 flex flex-wrap items-center gap-3">
                      <span>
                        Montant Brut :{" "}
                        <strong className="text-rhr-dark">
                          {formatCFA(gross)}
                        </strong>
                      </span>
                      <span>
                        • Remise :{" "}
                        <strong className="text-amber-700">
                          -{formatCFA(hallDiscount || 0)}
                        </strong>
                      </span>
                      <span>
                        • Net à payer :{" "}
                        <strong className="text-rhr-dark font-black">
                          {formatCFA(net)}
                        </strong>
                      </span>
                      <span>
                        • Avance versée :{" "}
                        <strong className="text-emerald-700 font-black">
                          {formatCFA(hallInitialAdvance || 0)}
                        </strong>
                      </span>
                      <span>
                        • Reste à payer :{" "}
                        <strong className="text-rhr-burgundy font-black">
                          {formatCFA(rem)}
                        </strong>
                      </span>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2.5 text-xs font-black text-white shadow-rhr transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Enregistrer la Location &amp; l&apos;Avance</span>
                </button>
              </div>
            </form>
          </div>

          {/* Suivi des Avances et Reste à Payer sur les locations de salle */}
          <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-card space-y-4">
            <h3 className="text-base font-black text-rhr-dark">
              Suivi des Dossiers de Location de Salle — Avances &amp; Reste à Payer ({ceremonies.length})
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
                        {cer.status === "SOLDE"
                          ? "SOLDÉ"
                          : "AVANCE REÇUE • RESTE À PAYER"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          Montant Total Net
                        </span>
                        <strong className="font-black text-rhr-dark">
                          {formatCFA(cer.totalAmount)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">
                          Avance(s) Payée(s)
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
                            hallDepositAmountMap[cer.id] ?? remainingBalance
                          }
                          onChange={(e) =>
                            setHallDepositAmountMap({
                              ...hallDepositAmountMap,
                              [cer.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-28 rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold"
                        />
                        <select
                          value={hallDepositMethodMap[cer.id] || "ESPECES"}
                          onChange={(e) =>
                            setHallDepositMethodMap({
                              ...hallDepositMethodMap,
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
                              hallDepositAmountMap[cer.id] ?? remainingBalance;
                            const method =
                              hallDepositMethodMap[cer.id] || "ESPECES";
                            if (amt > 0) {
                              addCeremonyDeposit({
                                ceremonyId: cer.id,
                                amount: amt,
                                method,
                                operationDateIso: `${cer.eventDate}T14:00:00.000Z`,
                              });
                              setHallFeedback(
                                `Versement de ${formatCFA(
                                  amt
                                )} enregistré sur le dossier ${cer.clientName}.`
                              );
                            }
                          }}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white transition"
                        >
                          Encaisser Avance / Solde
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
          ONGLET 6 : REPORTING JOURNALIER DU GÉRANT HÔTEL (SANS OPÉRATIONS BAR)
      ===================================================================== */}
      {activeTab === "REPORTING_JOURNALIER_HOTEL" && (
        <DailyReportingSheet scope="HOTEL_ONLY" />
      )}

      {/* =====================================================================
          MODAL 1 : CHECK-IN NUITÉE / PASSAGE 3H / RÉSERVATION AVEC ACOMPTE
      ===================================================================== */}
      {checkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full max-h-[90vh] flex flex-col rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
            <div className="shrink-0 bg-rhr-dark text-white p-5 flex items-center justify-between border-b-4 border-rhr-burgundy">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                  Réception Hôtel RHR M&apos;Batto
                </span>
                <h3 className="text-lg font-black">
                  Check-In Client ou Réservation avec Acompte
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalOpen(false)}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCheckInSubmit}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {/* Sélection de la chambre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Chambre (1 à 5)
                  </label>
                  <select
                    value={selectedRoomIdForCheckIn}
                    onChange={(e) => {
                      const nextRoom = rooms.find(
                        (r) => r.id === e.target.value
                      );
                      setSelectedRoomIdForCheckIn(e.target.value);
                      if (nextRoom) {
                        const effectiveType =
                          stayType === "PASSAGE_3H" && !nextRoom.allowPassage3h
                            ? "NUITEE"
                            : stayType;
                        if (effectiveType !== stayType) {
                          setStayType(effectiveType);
                        }
                        const nextDiscount =
                          nextRoom.roomNumber <= 3 ? checkInDiscountAmount : 0;
                        if (nextRoom.roomNumber > 3) {
                          setCheckInDiscountAmount(0);
                          setCheckInDiscountReason("");
                        }
                        setDepositAmount(
                          effectiveType === "PASSAGE_3H"
                            ? nextRoom.passagePrice
                            : effectiveType === "RESERVATION"
                            ? 5000
                            : Math.max(
                                0,
                                nextRoom.nightPrice * nightsCount - nextDiscount
                              )
                        );
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Ch. {r.roomNumber} ({r.category}) — Nuitée{" "}
                        {formatCFA(r.nightPrice)}
                        {r.allowPassage3h
                          ? ` / Passage ${formatCFA(r.passagePrice)}`
                          : " (Nuitée seule)"}{" "}
                        [{r.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Formule de Séjour
                  </label>
                  <select
                    value={stayType}
                    onChange={(e) => {
                      const nextType = e.target.value as
                        | "NUITEE"
                        | "PASSAGE_3H"
                        | "RESERVATION";
                      setStayType(nextType);
                      if (nextType === "PASSAGE_3H") {
                        setCheckInDiscountAmount(0);
                        setDepositAmount(selectedRoomForCheckIn.passagePrice);
                      } else if (nextType === "RESERVATION") {
                        setDepositAmount(5000);
                      } else {
                        setDepositAmount(
                          Math.max(
                            0,
                            selectedRoomForCheckIn.nightPrice * nightsCount -
                              (selectedRoomForCheckIn.roomNumber <= 3
                                ? checkInDiscountAmount
                                : 0)
                          )
                        );
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                  >
                    <option value="NUITEE">
                      Nuitée Complète ({formatCFA(selectedRoomForCheckIn.nightPrice)})
                    </option>
                    <option
                      value="PASSAGE_3H"
                      disabled={!selectedRoomForCheckIn.allowPassage3h}
                    >
                      {selectedRoomForCheckIn.allowPassage3h
                        ? `Passage 3 Heures en Journée (${formatCFA(
                            selectedRoomForCheckIn.passagePrice
                          )})`
                        : "Passage 3H (Uniquement sur Chambres 4 et 5)"}
                    </option>
                    <option value="RESERVATION">
                      Réservation Future avec Acompte
                    </option>
                  </select>
                </div>
              </div>

              {/* Coordonnées du Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nom &amp; Prénom du Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ex: M. Yao Kouadio"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Téléphone WhatsApp (Reçu numérique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                  />
                </div>
              </div>

              {/* Nombre de nuits & Date d'arrivée */}
              {stayType !== "PASSAGE_3H" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre de Nuitées
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={nightsCount}
                      onChange={(e) => {
                        const n = Math.max(1, Number(e.target.value));
                        setNightsCount(n);
                        if (stayType === "NUITEE") {
                          setDepositAmount(
                            Math.max(
                              0,
                              selectedRoomForCheckIn.nightPrice * n -
                                (selectedRoomForCheckIn.roomNumber <= 3
                                  ? checkInDiscountAmount
                                  : 0)
                            )
                          );
                        }
                      }}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                    />
                  </div>

                  {stayType === "RESERVATION" ? (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Date d&apos;arrivée prévue
                      </label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        N° Pièce d&apos;Identité (CNI / Passeport)
                      </label>
                      <input
                        type="text"
                        value={guestIdNumber}
                        onChange={(e) => setGuestIdNumber(e.target.value)}
                        placeholder="Facultatif"
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* =========================================================
                  FONCTIONNALITÉ DE RÉDUCTION POUR LES CHAMBRES 1 À 3
              ========================================================= */}
              {isDiscountEligibleRoom && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-rhr-burgundy" />
                      Réduction Client (Chambre {selectedRoomForCheckIn.roomNumber} — Confort)
                    </span>
                    <span className="text-xs font-bold text-amber-900">
                      Tarif normal : {formatCFA(computedCheckInGross)}
                    </span>
                  </div>

                  {/* Boutons rapides de réduction */}
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 1000, 2000, 3000, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCheckInDiscountAmount(preset);
                          if (stayType === "NUITEE") {
                            setDepositAmount(
                              Math.max(0, computedCheckInGross - preset)
                            );
                          }
                        }}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-extrabold border transition",
                          checkInDiscountAmount === preset
                            ? "bg-rhr-burgundy text-white border-rhr-burgundy"
                            : "bg-white text-gray-700 border-amber-300 hover:bg-amber-100"
                        )}
                      >
                        {preset === 0
                          ? "Aucune (0 F)"
                          : `- ${formatCFA(preset)}`}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Montant de la réduction (FCFA)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={computedCheckInGross}
                        step={500}
                        value={checkInDiscountAmount}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setCheckInDiscountAmount(val);
                          if (stayType === "NUITEE") {
                            setDepositAmount(
                              Math.max(0, computedCheckInGross - val)
                            );
                          }
                        }}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-black text-rhr-burgundy focus:border-rhr-burgundy focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Motif / Accord réduction (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={checkInDiscountReason}
                        onChange={(e) =>
                          setCheckInDiscountReason(e.target.value)
                        }
                        placeholder="Ex: Client fidèle / Remise Direction"
                        className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Acompte ou Règlement Immédiat & Mode de paiement */}
              <div className="rounded-2xl bg-rhr-surface border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-600">
                    {effectiveCheckInDiscount > 0
                      ? `Total Net Hébergement (après réduction de -${formatCFA(effectiveCheckInDiscount)}) :`
                      : "Total Hébergement calculé :"}
                  </span>
                  <span className="text-base font-black text-rhr-dark">
                    {formatCFA(computedCheckInTotal)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Acompte ou Règlement versé maintenant (F)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={computedCheckInTotal}
                      step={500}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-black text-emerald-700 focus:border-rhr-burgundy focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Mode d&apos;encaissement
                    </label>
                    <select
                      value={depositMethod}
                      onChange={(e) =>
                        setDepositMethod(e.target.value as PaymentMethod)
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-rhr-dark focus:border-rhr-burgundy focus:outline-none"
                    >
                      <option value="ESPECES">Espèces (Caisse Physique)</option>
                      <option value="WAVE">Wave Mobile Money</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                      <option value="MTN_MOMO">MTN MoMo</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-black">
                  <span>Reste à payer sur le Folio Chambre :</span>
                  <span
                    className={
                      computedCheckInRemaining > 0
                        ? "text-red-600 text-sm"
                        : "text-emerald-700 text-sm"
                    }
                  >
                    {formatCFA(computedCheckInRemaining)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-6 py-2.5 text-xs font-extrabold text-white shadow-rhr transition"
                >
                  Valider &amp; Émettre le Reçu RHR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2 : FOLIO DÉTAILLÉ DE LA CHAMBRE & FACTURATION CROISÉE
      ===================================================================== */}
      {activeFolioRoom && activeFolioStay && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden my-auto">
            {/* En-tête du Folio */}
            <div className="bg-rhr-dark text-white p-6 border-b-4 border-rhr-burgundy flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-rhr-gold">
                  <Receipt className="h-3.5 w-3.5" />
                  Folio Détaillé &amp; Facturation Croisée RHR
                </span>
                <h3 className="text-xl font-black mt-0.5">
                  {activeFolioRoom.name} — {activeFolioStay.guestName}
                </h3>
                <p className="text-xs text-gray-300">
                  Téléphone WhatsApp : {activeFolioStay.guestPhone} • Entrée :{" "}
                  {formatDateTime(activeFolioStay.checkIn)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFolioRoomId(null)}
                className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* SECTION 1 : HÉBERGEMENT */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rhr-dark flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-rhr-burgundy" />
                    <span>
                      Section 1 : Hébergement ({activeFolioStay.stayType})
                    </span>
                  </h4>

                  <div className="flex items-center gap-2">
                    {activeFolioRoom.status === "OCCUPEE_PASSAGE_3H" ? (
                      <button
                        type="button"
                        onClick={() =>
                          upgradePassageToNight(activeFolioRoom.id)
                        }
                        className="rounded-lg bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-[11px] font-extrabold text-white transition"
                      >
                        Prolonger en Nuitée (+
                        {formatCFA(
                          activeFolioRoom.nightPrice -
                            activeFolioRoom.passagePrice
                        )}
                        )
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => extendStayNights(activeFolioStay.id, 1)}
                        className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-rhr-dark transition"
                      >
                        + Ajouter 1 Nuitée ({formatCFA(activeFolioRoom.nightPrice)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Contrôle de Réduction en direct pour les Chambres 1 à 3 */}
                {activeFolioRoom.roomNumber <= 3 &&
                  activeFolioStay.stayType !== "PASSAGE_3H" && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-rhr-burgundy" />
                          Appliquer / Modifier une Réduction (Chambre{" "}
                          {activeFolioRoom.roomNumber})
                        </span>
                        <span className="text-[11px] font-bold text-amber-900">
                          Tarif de base :{" "}
                          {formatCFA(
                            activeFolioRoom.nightPrice *
                              Math.max(1, activeFolioStay.nightsCount)
                          )}
                        </span>
                      </div>

                      {folioDiscountSuccess && (
                        <div className="rounded-xl bg-emerald-100 border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-900">
                          {folioDiscountSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Montant réduction (FCFA)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={
                              activeFolioRoom.nightPrice *
                              Math.max(1, activeFolioStay.nightsCount)
                            }
                            step={500}
                            value={folioDiscountInput}
                            onChange={(e) =>
                              setFolioDiscountInput(
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-rhr-burgundy"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Motif réduction (optionnel)
                          </label>
                          <input
                            type="text"
                            value={folioDiscountReasonInput}
                            onChange={(e) =>
                              setFolioDiscountReasonInput(e.target.value)
                            }
                            placeholder="Ex: Remise client fidèle"
                            className="w-full rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs text-rhr-dark"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={handleApplyFolioDiscount}
                            className="w-full rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light py-1.5 px-3 text-xs font-extrabold text-white shadow-sm transition"
                          >
                            Appliquer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
                  {folioAccommodationLines.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between px-4 py-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-rhr-dark">
                          {line.description}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {formatDateTime(line.createdAt)}
                        </div>
                      </div>
                      <span className="font-black text-sm text-rhr-dark">
                        {formatCFA(line.amount)}
                      </span>
                    </div>
                  ))}
                  {folioPaymentLines.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs bg-emerald-50/50"
                    >
                      <span className="font-semibold text-emerald-900">
                        ✓ {pay.description}
                      </span>
                      <span className="font-bold text-emerald-700">
                        - {formatCFA(Math.abs(pay.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2 : CONSOMMATIONS BAR & RESTAURANT TRANSFÉRÉES SUR LA CHAMBRE */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-rhr-dark flex items-center gap-1.5">
                    <UtensilsCrossed className="h-4 w-4 text-rhr-burgundy" />
                    <span>
                      Section 2 : Consommations Bar &amp; Restaurant Transférées
                    </span>
                  </h4>
                  <span className="text-xs font-black text-rhr-burgundy">
                    Sous-total Bar/Resto : {formatCFA(folioTotalBarResto)}
                  </span>
                </div>

                {folioBarRestoLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
                    Aucune consommation Bar &amp; Restaurant transférée sur
                    cette chambre pour le moment.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/40 divide-y divide-amber-200/60">
                    {folioBarRestoLines.map((line) => {
                      const linkedOrder = line.posOrderId
                        ? posOrders.find((o) => o.id === line.posOrderId)
                        : null;
                      return (
                        <div
                          key={line.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="font-bold text-rhr-dark">
                              {line.description}
                            </div>
                            {linkedOrder && (
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                                <span className="rounded bg-rhr-burgundy text-white px-2 py-0.5 font-bold">
                                  Serveuse : {linkedOrder.waitressName}
                                </span>
                                <span>
                                  Détail :{" "}
                                  {linkedOrder.items
                                    .map((i) => `${i.quantity}x ${i.name}`)
                                    .join(" + ")}
                                </span>
                              </div>
                            )}
                            <div className="text-[10px] text-gray-500">
                              Transféré le {formatDateTime(line.createdAt)}
                            </div>
                          </div>
                          <span className="font-black text-sm text-rhr-burgundy shrink-0">
                            {formatCFA(line.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 3 : ENCAISSEMENT DU SOLDE GLOBAL & CHECK-OUT */}
              <div className="rounded-3xl bg-rhr-dark text-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-rhr-gold">
                      Section 3 : Arrêté du Compte Client
                    </span>
                    <h4 className="text-base font-black">
                      Encaissement du Solde Global &amp; Check-Out
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-400">
                      Solde Final à Encaisser
                    </div>
                    <div className="text-2xl font-black text-rhr-gold">
                      {formatCFA(folioRemainingBalance)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-white/5 rounded-2xl p-3">
                  <div>
                    <span className="text-gray-400 block">Total Hébergement</span>
                    <strong className="text-white">
                      {formatCFA(folioTotalAccommodation)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Total Bar/Resto</span>
                    <strong className="text-amber-300">
                      {formatCFA(folioTotalBarResto)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Déjà Versé</span>
                    <strong className="text-emerald-400">
                      - {formatCFA(folioTotalPaid)}
                    </strong>
                  </div>
                </div>

                {/* Choix du mode de paiement pour le Check-Out */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-300">
                    Mode de règlement du solde ({formatCFA(folioRemainingBalance)}) :
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: "ESPECES", label: "Espèces" },
                        { id: "WAVE", label: "Wave" },
                        { id: "ORANGE_MONEY", label: "Orange Money" },
                        { id: "MTN_MOMO", label: "MTN MoMo" },
                      ] as { id: PaymentMethod; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCheckoutPaymentMethod(m.id)}
                        className={cn(
                          "rounded-xl py-2.5 px-3 text-xs font-extrabold border transition",
                          checkoutPaymentMethod === m.id
                            ? "bg-rhr-burgundy text-white border-rhr-gold shadow"
                            : "bg-white/5 text-gray-300 border-white/15 hover:bg-white/10"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptRoomIdToClean(null);
                      setActiveReceipt({
                        reference: `PROFORMA-CH${activeFolioRoom.roomNumber}`,
                        title: "Relevé de Folio en cours (Proforma)",
                        stay: activeFolioStay,
                        roomName: activeFolioRoom.name,
                        roomCategory: activeFolioRoom.category,
                        folioLines: activeFolioLines,
                        totalCharges: folioTotalCharges,
                        totalPaid: folioTotalPaid,
                        remainingBalance: folioRemainingBalance,
                        operatorName:
                          currentUser?.fullName || "Gérant Hôtel RHR",
                        issuedAt: new Date().toISOString(),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition"
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                    <span>Aperçu Reçu / WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCheckout}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Encaisser ({formatCFA(folioRemainingBalance)}) &amp;
                      Valider Check-Out
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3 : ENCAISSEMENT D'UN COMPLÉMENT D'ACOMPTE EN 1 CLIC
      ===================================================================== */}
      {depositModalStay && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-rhr-burgundy">
                  Chambre {depositModalStay.roomNumber} —{" "}
                  {depositModalStay.guestName}
                </span>
                <h3 className="text-lg font-black text-rhr-dark">
                  Encaisser un Complément d&apos;Acompte
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDepositModalStay(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmExtraDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Montant encaissé (FCFA)
                </label>
                <input
                  type="number"
                  min={500}
                  step={500}
                  required
                  value={extraDepositAmount}
                  onChange={(e) =>
                    setExtraDepositAmount(Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-base font-black text-emerald-700 focus:border-rhr-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mode de règlement
                </label>
                <select
                  value={extraDepositMethod}
                  onChange={(e) =>
                    setExtraDepositMethod(e.target.value as PaymentMethod)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-rhr-dark"
                >
                  <option value="ESPECES">Espèces (Caisse Physique)</option>
                  <option value="WAVE">Wave Mobile Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="MTN_MOMO">MTN MoMo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalStay(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rhr-burgundy hover:bg-rhr-burgundy-light px-5 py-2 text-xs font-extrabold text-white shadow-rhr"
                >
                  Valider l&apos;encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4 : REÇU NUMÉRIQUE OFFICIEL RHR + PARTAGE WHATSAPP 1-CLIC
      ===================================================================== */}
      <RhrReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
        canMarkClean={Boolean(receiptRoomIdToClean)}
        onMarkRoomClean={() => {
          if (receiptRoomIdToClean) {
            markRoomClean(receiptRoomIdToClean);
            setReceiptRoomIdToClean(null);
            setActiveReceipt(null);
          }
        }}
      />
    </div>
  );
}
