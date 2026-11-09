"use client";

import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// =============================================================================
// 1. TYPES & INTERFACES MÉTIER (LOIS ABSOLUES SPEC.MD)
// =============================================================================

export type UserRole =
  | "PROPRIETAIRE"
  | "COMPTABLE"
  | "GERANT_HOTEL"
  | "CAISSIERE_BAR_RESTO"
  | "CLIENT_QR";

export interface RhrUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  pinCode: string;
  password?: string;
  phone: string;
  badgeLabel: string;
  isActive?: boolean;
  mustChangeCredentials?: boolean;
}

export interface CatalogEmojiOption {
  emoji: string;
  label: string;
  group: "BOISSONS_BAR" | "PLATS_CUISINE" | "PRODUITS_PHARES";
}

export const RHR_CATALOG_EMOJIS: CatalogEmojiOption[] = [
  // Boissons & Bar
  { emoji: "🍺", label: "🍺 Bière Chope (Bock, Guinness...)", group: "BOISSONS_BAR" },
  { emoji: "🍻", label: "🍻 Bières Pression / Pack (Beaufort...)", group: "BOISSONS_BAR" },
  { emoji: "🍾", label: "🍾 Bouteille Prestige (Heineken, Champagne...)", group: "BOISSONS_BAR" },
  { emoji: "🍷", label: "🍷 Vin Rouge / Spiritueux (Bordeaux...)", group: "BOISSONS_BAR" },
  { emoji: "🥂", label: "🥂 Vin Blanc / Apéritif / Liqueur", group: "BOISSONS_BAR" },
  { emoji: "🥃", label: "🥃 Whisky / Cognac / Liqueur Forte", group: "BOISSONS_BAR" },
  { emoji: "🍋", label: "🍋 Bière Aromatisée / Citron (Chill...)", group: "BOISSONS_BAR" },
  { emoji: "🥤", label: "🥤 Sucrerie / Soda (Coca, Fanta, Youki...)", group: "BOISSONS_BAR" },
  { emoji: "🧃", label: "🧃 Jus Naturel (Bissap, Gingembre, Ananas...)", group: "BOISSONS_BAR" },
  { emoji: "💧", label: "💧 Eau Minérale (Céleste, Awa...)", group: "BOISSONS_BAR" },
  { emoji: "☕", label: "☕ Boisson Chaude (Café, Thé...)", group: "BOISSONS_BAR" },

  // Plats du Menu & Nourriture
  { emoji: "🍗", label: "🍗 Poulet Braisé / Rôti Entier", group: "PLATS_CUISINE" },
  { emoji: "🍖", label: "🍖 Demi-Poulet Grillé / Côtes", group: "PLATS_CUISINE" },
  { emoji: "🍲", label: "🍲 Kedjenou à l'Étouffée / Sauce", group: "PLATS_CUISINE" },
  { emoji: "🥘", label: "🥘 Soupe du Pêcheur / Soupe Poulet", group: "PLATS_CUISINE" },
  { emoji: "🐟", label: "🐟 Carpe Braisée / Poisson Grillé", group: "PLATS_CUISINE" },
  { emoji: "🐠", label: "🐠 Machoiron de Lagune Braisé", group: "PLATS_CUISINE" },
  { emoji: "🍛", label: "🍛 Plat + Attiéké / Riz / Alloco", group: "PLATS_CUISINE" },
  { emoji: "🥣", label: "🥣 Soupe Royale + Foutou / Placali", group: "PLATS_CUISINE" },
  { emoji: "🥩", label: "🥩 Choukouya de Bœuf / Mouton Braisé", group: "PLATS_CUISINE" },
  { emoji: "🍢", label: "🍢 Brochettes / Suya Grillé", group: "PLATS_CUISINE" },
  { emoji: "🍤", label: "🍤 Crevettes / Gambas / Escargots", group: "PLATS_CUISINE" },
  { emoji: "🍟", label: "🍟 Assiette Alloco / Frites / Igname", group: "PLATS_CUISINE" },
  { emoji: "🥗", label: "🥗 Salade Fraîcheur / Entrée", group: "PLATS_CUISINE" },
  { emoji: "🍽️", label: "🍽️ Spécialité du Chef RHR", group: "PLATS_CUISINE" },

  // Produits Phares Congélateur / Réserve
  { emoji: "🐓", label: "🐓 Poulets Entiers (Congélateur)", group: "PRODUITS_PHARES" },
  { emoji: "🦀", label: "🦀 Fruits de Mer / Crabes (Réserve)", group: "PRODUITS_PHARES" },
  { emoji: "🧊", label: "🧊 Produit Surgelé / Stock Froid", group: "PRODUITS_PHARES" },
  { emoji: "📦", label: "📦 Lot / Carton Réserve Cuisine", group: "PRODUITS_PHARES" },
];

export type RoomCategory = "CONFORT" | "STANDARD";

export type RoomStatus =
  | "LIBRE"
  | "OCCUPEE_NUITEE"
  | "OCCUPEE_PASSAGE_3H"
  | "RESERVEE"
  | "A_NETTOYER";

export interface Room {
  id: string;
  roomNumber: number; // 1 à 5
  name: string;
  category: RoomCategory;
  nightPrice: number; // 15000 (Ch 1-3) ou 10000 (Ch 4-5)
  passagePrice: number; // 5000 uniquement sur Chambres 4 et 5 (0 sur Chambres 1-3)
  allowPassage3h: boolean; // false pour Chambres 1-3, true pour Chambres 4-5
  status: RoomStatus;
  amenities: string[];
  currentStayId?: string;
  updatedBy?: string;
  updatedAt: string;
}

export type PaymentMethod = "ESPECES" | "WAVE" | "ORANGE_MONEY" | "MTN_MOMO";

export interface RoomFolioItem {
  id: string;
  stayId: string;
  roomNumber: number;
  description: string;
  category: "HEBERGEMENT" | "BAR_RESTO" | "ACOMPTE" | "SUPPLEMENT";
  amount: number; // Positif = charge, Négatif = acompte/paiement déduit
  isPaid: boolean;
  posOrderId?: string;
  createdBy: string;
  createdAt: string;
}

export interface Stay {
  id: string;
  roomId: string;
  roomNumber: number;
  guestName: string;
  guestPhone: string;
  guestIdNumber?: string;
  stayType: "NUITEE" | "PASSAGE_3H" | "RESERVATION";
  status: "EN_COURS" | "RESERVE" | "TERMINE" | "ANNULE";
  checkIn: string;
  expectedCheckOut: string; // Pour PASSAGE_3H : checkIn + 3 heures
  actualCheckOut?: string;
  nightsCount: number;
  baseRate: number;
  discountAmount?: number; // Réduction accordée (notamment Chambres 1 à 3)
  discountReason?: string;
  depositAmount: number;
  depositMethod?: PaymentMethod;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Waitress {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  totalSalesAmount: number;
  ordersCount: number;
}

export type InventoryPole = "BAR_BOISSON" | "CUISINE_PHARE" | "PLAT_MENU";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  pole: InventoryPole;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  alertThreshold: number;
  unit: string;
  linkedCoreIngredientId?: string; // Pour les plats du menu liés à un produit phare
  linkedCoreIngredientQty?: number;
  isAvailableOnQr: boolean;
  imageEmoji: string;
  updatedBy?: string;
  updatedAt: string;
}

export interface PosOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  pole: InventoryPole;
}

export interface PosOrder {
  id: string;
  orderNumber: string;
  source: "COMPTOIR_POS" | "QR_TABLE" | "QR_CHAMBRE";
  tableOrRoomLabel: string;
  waitressId: string;
  waitressName: string;
  items: PosOrderItem[];
  totalAmount: number;
  paymentMode:
  | "ESPECES"
  | "WAVE"
  | "ORANGE_MONEY"
  | "MTN_MOMO"
  | "TRANSFERT_CHAMBRE"
  | "EN_ATTENTE_QR";
  transferredToRoomNumber?: number;
  transferredToStayId?: string;
  status:
  | "NOUVELLE_QR"
  | "EN_PREPARATION"
  | "SERVIE"
  | "PAYEE"
  | "TRANSFEREE_CHAMBRE"
  | "ANNULEE";
  createdBy: string;
  createdAt: string;
}

export interface CeremonyCustomLine {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CeremonyDeposit {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  receivedBy: string;
  note?: string;
}

export interface CeremonyBooking {
  id: string;
  reference: string;
  clientName: string;
  clientPhone: string;
  eventType:
  | "MARIAGE"
  | "DOT"
  | "BAPTEME"
  | "ANNIVERSAIRE"
  | "CONFERENCE"
  | "AUTRE";
  eventDate: string;
  guestsCount: number;
  baseRentalFee: number; // Toujours 50 000 F (inclut 50 couverts)
  extraOrdinaryCovers: number; // 1 000 F / unité
  extraVipCovers: number; // 1 500 F / unité
  customCateringLines: CeremonyCustomLine[];
  customBeverageLines: CeremonyCustomLine[];
  totalAmount: number;
  deposits: CeremonyDeposit[];
  totalPaid: number;
  status: "DEVIS" | "CONFIRME_ACOMPTE" | "SOLDE" | "ANNULE";
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type DailyReportRowKey =
  | "CHAMBRE_1"
  | "CHAMBRE_2"
  | "CHAMBRE_3"
  | "CHAMBRE_4"
  | "CHAMBRE_5"
  | "LOCATION_SALLE"
  | "RESTAURATION"
  | "BAR"
  | "AUTRES";

export interface DailyCashSheetMeta {
  dateIso: string; // YYYY-MM-DD (ex: "2026-04-17")
  openingBalanceOverride?: number; // Solde à l'ouverture (A)
  cashDepositAmount: number; // Versement espèces
  bankDepositAmount: number; // Versement banque
  managerSignatureName?: string; // Signature de la Gérante
  rowObservations?: Partial<Record<DailyReportRowKey, string>>;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: "ENCAISSEMENT" | "DEPENSE";
  pole:
  | "HOTEL"
  | "BAR_RESTO"
  | "CEREMONIE"
  | "MARCHE_CUISINE"
  | "MAINTENANCE"
  | "CHARGES_FIXES";
  vault: "CAISSE_ESPECES" | "CAISSE_MOBILE_MONEY";
  paymentMethod: PaymentMethod;
  expenseFundSource?: "CAISSE_DU_JOUR" | "FONDS_SEPARE";
  amount: number; // Montant net encaissé ou décaissé
  grossAmount?: number; // Montant brut avant remise (Reporting Journalier)
  discountAmount?: number; // Remise éventuelle (Reporting Journalier)
  dailyReportRow?: DailyReportRowKey; // Ligne exacte du Reporting Journalier
  observation?: string; // Observation du Reporting Journalier
  description: string;
  receiptPhotoUrl?: string;
  relatedEntityId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CashClosure {
  id: string;
  pole: "HOTEL" | "BAR_RESTO" | "GLOBAL";
  closedBy: string;
  closedByName: string;
  closedByRole: UserRole;
  shiftDate: string;
  totalCashIn: number;
  totalMobileMoneyIn: number;
  totalDayTillExpenses: number;
  expectedCash: number;
  actualCashHanded: number;
  discrepancy: number;
  status: "SOUMIS" | "VALIDE_PROPRIETAIRE" | "ECART_A_JUSTIFIER";
  notes?: string;
  auditedBy?: string;
  createdAt: string;
}

export interface FixedCost {
  id: string;
  category:
  | "CIE_ELECTRICITE"
  | "SODECI_EAU"
  | "SALAIRE"
  | "AVANCE_SALAIRE"
  | "IMPOTS_TAXES"
  | "CANAL_INTERNET"
  | "AUTRE_CHARGE";
  label: string;
  beneficiary?: string;
  periodMonth: string;
  amount: number;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  receiptPhotoUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface SyncOperation {
  id: string;
  table: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  createdBy: string;
  timestamp: string;
  status: "PENDING" | "SYNCED" | "ERROR";
}

// =============================================================================
// 2. NAVIGATION & PERMISSIONS RBAC PAR RÔLE (LOI ABSOLUE SPEC.MD)
// =============================================================================

export interface NavRouteItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  allowedRoles: UserRole[];
  badgeKey?: "hotel" | "pos" | "sync";
}

export const RHR_ROUTES: NavRouteItem[] = [
  {
    href: "/dashboard",
    label: "Direction & Finances",
    shortLabel: "Dashboard",
    description: "CA Global, Bénéfice Net Réel, Coffres Espèces vs Mobile Money",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE"],
  },
  {
    href: "/admin",
    label: "Administration Générale",
    shortLabel: "Administration",
    description: "Comptes utilisateurs, configuration des prix, articles & paramètres",
    allowedRoles: ["PROPRIETAIRE"],
  },
  {
    href: "/hotel",
    label: "Hôtel (5 Chambres)",
    shortLabel: "Hôtel",
    description: "Nuitées, Passages 3H (Ch. 4 & 5), Réservations & Folios",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE", "GERANT_HOTEL"],
    badgeKey: "hotel",
  },
  {
    href: "/pos",
    label: "Caisse Bar & Resto",
    shortLabel: "POS Bar/Resto",
    description: "Point de vente, Serveuses, Transfert Chambre & Commandes QR",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE", "CAISSIERE_BAR_RESTO"],
    badgeKey: "pos",
  },
  {
    href: "/inventory",
    label: "Stocks Bar & Cuisine",
    shortLabel: "Stocks",
    description: "Boissons à la bouteille & Produits Phares du congélateur",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE", "CAISSIERE_BAR_RESTO"],
  },
  {
    href: "/ceremonies",
    label: "Salle de Cérémonie",
    shortLabel: "Cérémonies",
    description: "Location 50 000 F (50 couverts), Couverts VIP & Devis A4",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE", "CAISSIERE_BAR_RESTO"],
  },
  {
    href: "/expenses",
    label: "Sorties & Dépenses",
    shortLabel: "Dépenses",
    description: "Achats du marché, menues dépenses & justificatifs photo",
    allowedRoles: [
      "PROPRIETAIRE",
      "COMPTABLE",
      "GERANT_HOTEL",
      "CAISSIERE_BAR_RESTO",
    ],
  },
  {
    href: "/fixed-costs",
    label: "Charges Fixes",
    shortLabel: "Charges Fixes",
    description: "Factures CIE, SODECI, Salaires, Avances & Impôts",
    allowedRoles: ["PROPRIETAIRE", "COMPTABLE"],
  },
  {
    href: "/closures",
    label: "Clôtures de Caisse",
    shortLabel: "Clôtures",
    description: "Arrêté de fin de service, contrôle des écarts & validation",
    allowedRoles: [
      "PROPRIETAIRE",
      "COMPTABLE",
      "GERANT_HOTEL",
      "CAISSIERE_BAR_RESTO",
    ],
  },
  {
    href: "/qr-menu",
    label: "Menu Client QR",
    shortLabel: "Menu QR",
    description: "Carte interactive mobile (Table & Chambre)",
    allowedRoles: [
      "PROPRIETAIRE",
      "COMPTABLE",
      "CAISSIERE_BAR_RESTO",
      "CLIENT_QR",
    ],
  },
];

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case "PROPRIETAIRE":
    case "COMPTABLE":
      return "/dashboard";
    case "GERANT_HOTEL":
      return "/hotel";
    case "CAISSIERE_BAR_RESTO":
      return "/pos";
    case "CLIENT_QR":
      return "/qr-menu";
    default:
      return "/login";
  }
}

export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (pathname === "/login" || pathname === "/qr-menu") return true;
  const matched = RHR_ROUTES.find(
    (r) => pathname === r.href || pathname.startsWith(`${r.href}/`)
  );
  if (!matched) return true;
  return matched.allowedRoles.includes(role);
}

// =============================================================================
// 3. DONNÉES INITIALES ULTRA-RÉALISTES (SEED DATA RHR M'BATTO)
// =============================================================================

const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
const oneHourRemaining = new Date(
  now.getTime() + 1 * 60 * 60 * 1000 + 18 * 60 * 1000
).toISOString(); // 01h18m restantes sur le passage 3H
const yesterday = new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString();
const tomorrowNoon = new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString();
const dayAfterTomorrow = new Date(now.getTime() + 44 * 60 * 60 * 1000).toISOString();

export const INITIAL_USERS: RhrUser[] = [
  {
    id: "usr-admin-01",
    email: "admin@rhr-mbatto.ci",
    fullName: "M. Koffi — Administrateur RHR",
    role: "PROPRIETAIRE",
    pinCode: "1111",
    password: "rhr2026",
    phone: "+225 07 07 01 02 03",
    badgeLabel: "Administrateur",
    isActive: true,
    mustChangeCredentials: false,
  },
  {
    id: "usr-compta-02",
    email: "compta@rhr-mbatto.ci",
    fullName: "Cabinet Kouamé — Comptable",
    role: "COMPTABLE",
    pinCode: "2222",
    password: "rhr2026",
    phone: "+225 05 05 44 55 66",
    badgeLabel: "Expert Comptable & Audit",
    isActive: true,
  },
  {
    id: "usr-hotel-03",
    email: "hotel@rhr-mbatto.ci",
    fullName: "Yao Serge — Gérant Hôtel",
    role: "GERANT_HOTEL",
    pinCode: "3333",
    password: "rhr2026",
    phone: "+225 07 48 12 34 56",
    badgeLabel: "Gérant Réception Hôtel",
    isActive: true,
  },
  {
    id: "usr-caisse-04",
    email: "caisse@rhr-mbatto.ci",
    fullName: "Adjoua Félicité — Caissière Bar/Resto",
    role: "CAISSIERE_BAR_RESTO",
    pinCode: "4444",
    password: "rhr2026",
    phone: "+225 01 02 98 76 54",
    badgeLabel: "Caissière Bar & Restaurant",
    isActive: true,
  },
  {
    id: "usr-client-05",
    email: "client@rhr-mbatto.ci",
    fullName: "Client RHR (Menu QR)",
    role: "CLIENT_QR",
    pinCode: "0000",
    password: "qr",
    phone: "+225 00 00 00 00 00",
    badgeLabel: "Accès Client Table / Chambre",
    isActive: true,
  },
];

export const INITIAL_WAITRESSES: Waitress[] = [
  {
    id: "wait-awa",
    name: "Awa",
    phone: "+225 07 11 22 33 01",
    isActive: true,
    totalSalesAmount: 42500,
    ordersCount: 6,
  },
  {
    id: "wait-chantal",
    name: "Chantal",
    phone: "+225 07 11 22 33 02",
    isActive: true,
    totalSalesAmount: 31000,
    ordersCount: 4,
  },
  {
    id: "wait-clarisse",
    name: "Clarisse",
    phone: "+225 05 11 22 33 03",
    isActive: true,
    totalSalesAmount: 24000,
    ordersCount: 3,
  },
  {
    id: "wait-marie",
    name: "Marie",
    phone: "+225 01 11 22 33 04",
    isActive: true,
    totalSalesAmount: 19500,
    ordersCount: 3,
  },
  {
    id: "wait-comptoir",
    name: "Direct Comptoir",
    phone: "+225 07 00 00 00 99",
    isActive: true,
    totalSalesAmount: 14000,
    ordersCount: 2,
  },
];

export const INITIAL_ROOMS: Room[] = [
  {
    id: "room-1",
    roomNumber: 1,
    name: "Chambre 1 — Confort Prestige",
    category: "CONFORT",
    nightPrice: 15000,
    passagePrice: 0,
    allowPassage3h: false,
    status: "OCCUPEE_NUITEE",
    amenities: ["Climatisation Split", "TV Canal+", "Eau Chaude", "Lit King Size"],
    currentStayId: "stay-room1-nuitee",
    updatedBy: "usr-hotel-03",
    updatedAt: yesterday,
  },
  {
    id: "room-2",
    roomNumber: 2,
    name: "Chambre 2 — Confort Lagune",
    category: "CONFORT",
    nightPrice: 15000,
    passagePrice: 0,
    allowPassage3h: false,
    status: "LIBRE",
    amenities: ["Climatisation Split", "TV Canal+", "Eau Chaude", "Fauteuil Salon"],
    updatedBy: "usr-hotel-03",
    updatedAt: twoHoursAgo,
  },
  {
    id: "room-3",
    roomNumber: 3,
    name: "Chambre 3 — Confort Royale",
    category: "CONFORT",
    nightPrice: 15000,
    passagePrice: 0,
    allowPassage3h: false,
    status: "LIBRE",
    amenities: ["Climatisation Split", "TV Canal+", "Eau Chaude", "Bureau"],
    updatedBy: "usr-hotel-03",
    updatedAt: yesterday,
  },
  {
    id: "room-4",
    roomNumber: 4,
    name: "Chambre 4 — Standard Harmonie",
    category: "STANDARD",
    nightPrice: 10000,
    passagePrice: 5000,
    allowPassage3h: true,
    status: "OCCUPEE_PASSAGE_3H",
    amenities: ["Climatisation", "TV", "Eau Chaude"],
    currentStayId: "stay-room4-passage",
    updatedBy: "usr-hotel-03",
    updatedAt: twoHoursAgo,
  },
  {
    id: "room-5",
    roomNumber: 5,
    name: "Chambre 5 — Standard Akwaba",
    category: "STANDARD",
    nightPrice: 10000,
    passagePrice: 5000,
    allowPassage3h: true,
    status: "RESERVEE",
    amenities: ["Climatisation", "TV", "Eau Chaude"],
    currentStayId: "stay-room5-resa",
    updatedBy: "usr-hotel-03",
    updatedAt: twoHoursAgo,
  },
];

export const INITIAL_STAYS: Stay[] = [
  {
    id: "stay-room1-nuitee",
    roomId: "room-1",
    roomNumber: 1,
    guestName: "M. Kouassi Jean-Marc",
    guestPhone: "+225 07 08 45 12 90",
    guestIdNumber: "CI-009481723",
    stayType: "NUITEE",
    status: "EN_COURS",
    checkIn: yesterday,
    expectedCheckOut: tomorrowNoon,
    nightsCount: 1,
    baseRate: 15000,
    depositAmount: 5000,
    depositMethod: "ESPECES",
    notes: "Client régulier d'Abidjan. A demandé le transfert de son dîner sur la note de la Chambre 1.",
    createdBy: "usr-hotel-03",
    createdAt: yesterday,
  },
  {
    id: "stay-room4-passage",
    roomId: "room-4",
    roomNumber: 4,
    guestName: "M. Konan Yao",
    guestPhone: "+225 05 44 88 21 10",
    guestIdNumber: "CI-004519820",
    stayType: "PASSAGE_3H",
    status: "EN_COURS",
    checkIn: twoHoursAgo,
    expectedCheckOut: oneHourRemaining,
    nightsCount: 1,
    baseRate: 5000,
    depositAmount: 5000,
    depositMethod: "ESPECES",
    notes: "Passage 3H réglé d'avance en espèces (Chambre 4).",
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
  {
    id: "stay-room5-resa",
    roomId: "room-5",
    roomNumber: 5,
    guestName: "Mme Brou Aïcha",
    guestPhone: "+225 07 59 10 20 30",
    stayType: "RESERVATION",
    status: "RESERVE",
    checkIn: tomorrowNoon,
    expectedCheckOut: dayAfterTomorrow,
    nightsCount: 1,
    baseRate: 10000,
    depositAmount: 5000,
    depositMethod: "WAVE",
    notes: "Arrivée prévue demain à 14h00. Acompte 5 000 F reçu par Wave.",
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
];

export const INITIAL_FOLIO_ITEMS: RoomFolioItem[] = [
  // Chambre 1 : Nuitée 15 000 F - Acompte 5 000 F + Conso Bar/Resto transférée 8 000 F = Solde 18 000 F
  {
    id: "folio-1",
    stayId: "stay-room1-nuitee",
    roomNumber: 1,
    description: "Forfait 1 Nuitée — Chambre 1 (Catégorie Confort)",
    category: "HEBERGEMENT",
    amount: 15000,
    isPaid: false,
    createdBy: "usr-hotel-03",
    createdAt: yesterday,
  },
  {
    id: "folio-2",
    stayId: "stay-room1-nuitee",
    roomNumber: 1,
    description: "Acompte Check-in réglé en Espèces",
    category: "ACOMPTE",
    amount: -5000,
    isPaid: true,
    createdBy: "usr-hotel-03",
    createdAt: yesterday,
  },
  {
    id: "folio-3",
    stayId: "stay-room1-nuitee",
    roomNumber: 1,
    description: "Transfert Bar/Resto #CMD-101 (1x Poulet Braisé Entier + 2x Beaufort) — Serveuse Awa",
    category: "BAR_RESTO",
    amount: 8000,
    isPaid: false,
    posOrderId: "ord-101",
    createdBy: "usr-caisse-04",
    createdAt: twoHoursAgo,
  },
  // Chambre 4 : Passage 3H (5 000 F réglé)
  {
    id: "folio-4",
    stayId: "stay-room4-passage",
    roomNumber: 4,
    description: "Forfait Passage 3 Heures — Chambre 4",
    category: "HEBERGEMENT",
    amount: 5000,
    isPaid: true,
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
  {
    id: "folio-5",
    stayId: "stay-room4-passage",
    roomNumber: 4,
    description: "Règlement Passage 3H (Espèces)",
    category: "ACOMPTE",
    amount: -5000,
    isPaid: true,
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
  // Chambre 5 : Réservation 10 000 F avec acompte Wave 5 000 F
  {
    id: "folio-6",
    stayId: "stay-room5-resa",
    roomNumber: 5,
    description: "Réservation 1 Nuitée — Chambre 5 (Catégorie Standard)",
    category: "HEBERGEMENT",
    amount: 10000,
    isPaid: false,
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
  {
    id: "folio-7",
    stayId: "stay-room5-resa",
    roomNumber: 5,
    description: "Acompte de Réservation (Wave Mobile Money)",
    category: "ACOMPTE",
    amount: -5000,
    isPaid: true,
    createdBy: "usr-hotel-03",
    createdAt: twoHoursAgo,
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  // =========================================================================
  // A. PRODUITS PHARES CUISINE (CONGÉLATEUR / RÉSERVE) - Suivi Unitaire Strict
  // =========================================================================
  {
    id: "core-poulet",
    sku: "PHARE-POULET",
    name: "Poulets Entiers (Congélateur)",
    pole: "CUISINE_PHARE",
    category: "Matière Première Phare",
    unitPrice: 0,
    stockQuantity: 14,
    alertThreshold: 5,
    unit: "Poulets",
    isAvailableOnQr: false,
    imageEmoji: "🐓",
    updatedAt: yesterday,
  },
  {
    id: "core-carpe",
    sku: "PHARE-CARPE",
    name: "Poissons Carpes Fraîches",
    pole: "CUISINE_PHARE",
    category: "Matière Première Phare",
    unitPrice: 0,
    stockQuantity: 9,
    alertThreshold: 4,
    unit: "Carpes",
    isAvailableOnQr: false,
    imageEmoji: "🐟",
    updatedAt: yesterday,
  },
  {
    id: "core-machoiron",
    sku: "PHARE-MACHOIRON",
    name: "Poissons Machoirons de Lagune",
    pole: "CUISINE_PHARE",
    category: "Matière Première Phare",
    unitPrice: 0,
    stockQuantity: 6,
    alertThreshold: 3,
    unit: "Machoirons",
    isAvailableOnQr: false,
    imageEmoji: "🐠",
    updatedAt: yesterday,
  },
  {
    id: "core-viande",
    sku: "PHARE-VIANDE",
    name: "Portions de Viande (Bœuf / Mouton)",
    pole: "CUISINE_PHARE",
    category: "Matière Première Phare",
    unitPrice: 0,
    stockQuantity: 12,
    alertThreshold: 4,
    unit: "Portions",
    isAvailableOnQr: false,
    imageEmoji: "🥩",
    updatedAt: yesterday,
  },

  // =========================================================================
  // B. MENU AFRICAIN / GRILLADES / BRAISÉS (Reliés aux Produits Phares)
  // =========================================================================
  {
    id: "menu-poulet-braise",
    sku: "MENU-PB-01",
    name: "Poulet Braisé Entier + Attiéké / Alloco",
    pole: "PLAT_MENU",
    category: "Grillades & Braisés",
    unitPrice: 6000,
    stockQuantity: 14,
    alertThreshold: 5,
    unit: "Plat",
    linkedCoreIngredientId: "core-poulet",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🍗",
    updatedAt: yesterday,
  },
  {
    id: "menu-demi-poulet",
    sku: "MENU-DP-01B",
    name: "Demi-Poulet Grillé + Alloco / Attiéké",
    pole: "PLAT_MENU",
    category: "Grillades & Braisés",
    unitPrice: 3500,
    stockQuantity: 14,
    alertThreshold: 5,
    unit: "Plat",
    linkedCoreIngredientId: "core-poulet",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🍖",
    updatedAt: yesterday,
  },
  {
    id: "menu-kedjenou-poulet",
    sku: "MENU-KP-02",
    name: "Kedjenou de Poulet à l'Étouffée + Riz/Attiéké",
    pole: "PLAT_MENU",
    category: "Spécialités Ivoiriennes",
    unitPrice: 6500,
    stockQuantity: 14,
    alertThreshold: 5,
    unit: "Plat",
    linkedCoreIngredientId: "core-poulet",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🍲",
    updatedAt: yesterday,
  },
  {
    id: "menu-soupe-poulet",
    sku: "MENU-SP-03",
    name: "Soupe du Pêcheur / Poulet Africain",
    pole: "PLAT_MENU",
    category: "Spécialités Ivoiriennes",
    unitPrice: 6000,
    stockQuantity: 14,
    alertThreshold: 5,
    unit: "Plat",
    linkedCoreIngredientId: "core-poulet",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🥘",
    updatedAt: yesterday,
  },
  {
    id: "menu-carpe-braisee",
    sku: "MENU-CB-04",
    name: "Carpe Braisée Géante + Attiéké & Alloco",
    pole: "PLAT_MENU",
    category: "Grillades & Braisés",
    unitPrice: 7000,
    stockQuantity: 9,
    alertThreshold: 4,
    unit: "Plat",
    linkedCoreIngredientId: "core-carpe",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🐟",
    updatedAt: yesterday,
  },
  {
    id: "menu-pointe-carpe",
    sku: "MENU-KC-05",
    name: "Kedjenou de Carpe Fraîche + Attiéké",
    pole: "PLAT_MENU",
    category: "Spécialités Ivoiriennes",
    unitPrice: 7000,
    stockQuantity: 9,
    alertThreshold: 4,
    unit: "Plat",
    linkedCoreIngredientId: "core-carpe",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🍛",
    updatedAt: yesterday,
  },
  {
    id: "menu-machoiron-braise",
    sku: "MENU-MB-06",
    name: "Machoiron Braisé de M'Batto + Attiéké",
    pole: "PLAT_MENU",
    category: "Grillades & Braisés",
    unitPrice: 8500,
    stockQuantity: 6,
    alertThreshold: 3,
    unit: "Plat",
    linkedCoreIngredientId: "core-machoiron",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🐠",
    updatedAt: yesterday,
  },
  {
    id: "menu-soupe-machoiron",
    sku: "MENU-SM-07",
    name: "Soupe Royale de Machoiron + Foutou/Riz",
    pole: "PLAT_MENU",
    category: "Spécialités Ivoiriennes",
    unitPrice: 8500,
    stockQuantity: 6,
    alertThreshold: 3,
    unit: "Plat",
    linkedCoreIngredientId: "core-machoiron",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🥣",
    updatedAt: yesterday,
  },
  {
    id: "menu-choukouya-viande",
    sku: "MENU-CV-08",
    name: "Choukouya de Bœuf Braisé + Alloco Croustillant",
    pole: "PLAT_MENU",
    category: "Grillades & Braisés",
    unitPrice: 5000,
    stockQuantity: 12,
    alertThreshold: 4,
    unit: "Plat",
    linkedCoreIngredientId: "core-viande",
    linkedCoreIngredientQty: 1,
    isAvailableOnQr: true,
    imageEmoji: "🥩",
    updatedAt: yesterday,
  },

  // =========================================================================
  // C. STOCK BOISSONS BAR (Suivi à la bouteille près - Blocage strict si 0)
  // =========================================================================
  {
    id: "bar-bock-66",
    sku: "BAR-BOCK-66",
    name: "Bière Bock Solibra 66cl",
    pole: "BAR_BOISSON",
    category: "Bières & Pressions",
    unitPrice: 1000,
    stockQuantity: 48,
    alertThreshold: 12,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍺",
    updatedAt: yesterday,
  },
  {
    id: "bar-beaufort-50",
    sku: "BAR-BEAU-50",
    name: "Bière Beaufort Lager 50cl",
    pole: "BAR_BOISSON",
    category: "Bières & Pressions",
    unitPrice: 1000,
    stockQuantity: 36,
    alertThreshold: 12,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍻",
    updatedAt: yesterday,
  },
  {
    id: "bar-heineken-33",
    sku: "BAR-HEIN-33",
    name: "Heineken Bouteille 33cl",
    pole: "BAR_BOISSON",
    category: "Bières & Pressions",
    unitPrice: 1500,
    stockQuantity: 0, // RUPTURE DE STOCK (Stock = 0 pour démontrer le blocage strict !)
    alertThreshold: 10,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍾",
    updatedAt: twoHoursAgo,
  },
  {
    id: "bar-chill-50",
    sku: "BAR-CHILL-50",
    name: "Chill Citron Solibra 50cl",
    pole: "BAR_BOISSON",
    category: "Bières & Pressions",
    unitPrice: 1000,
    stockQuantity: 24,
    alertThreshold: 10,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍋",
    updatedAt: yesterday,
  },
  {
    id: "bar-guinness-33",
    sku: "BAR-GUIN-33",
    name: "Guinness Foreign Extra 33cl",
    pole: "BAR_BOISSON",
    category: "Bières & Pressions",
    unitPrice: 1500,
    stockQuantity: 18,
    alertThreshold: 6,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍺",
    updatedAt: yesterday,
  },
  {
    id: "bar-vin-bordeaux",
    sku: "BAR-VIN-01",
    name: "Vin Rouge Bordeaux Réserve (75cl)",
    pole: "BAR_BOISSON",
    category: "Vins & Spiritueux",
    unitPrice: 8000,
    stockQuantity: 10,
    alertThreshold: 3,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🍷",
    updatedAt: yesterday,
  },
  {
    id: "bar-coca-50",
    sku: "BAR-COCA-50",
    name: "Sucrerie Coca-Cola / Fanta 50cl",
    pole: "BAR_BOISSON",
    category: "Softs & Eaux",
    unitPrice: 600,
    stockQuantity: 40,
    alertThreshold: 12,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "🥤",
    updatedAt: yesterday,
  },
  {
    id: "bar-celeste-150",
    sku: "BAR-CEL-150",
    name: "Eau Minérale Céleste 1.5L",
    pole: "BAR_BOISSON",
    category: "Softs & Eaux",
    unitPrice: 800,
    stockQuantity: 30,
    alertThreshold: 10,
    unit: "Bouteilles",
    isAvailableOnQr: true,
    imageEmoji: "💧",
    updatedAt: yesterday,
  },
];

export const INITIAL_POS_ORDERS: PosOrder[] = [
  {
    id: "ord-101",
    orderNumber: "CMD-101",
    source: "COMPTOIR_POS",
    tableOrRoomLabel: "Chambre 1 (M. Kouassi)",
    waitressId: "wait-awa",
    waitressName: "Awa",
    items: [
      {
        itemId: "menu-poulet-braise",
        name: "Poulet Braisé Entier + Attiéké / Alloco",
        quantity: 1,
        unitPrice: 6000,
        subtotal: 6000,
        pole: "PLAT_MENU",
      },
      {
        itemId: "bar-beaufort-50",
        name: "Bière Beaufort Lager 50cl",
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
        pole: "BAR_BOISSON",
      },
    ],
    totalAmount: 8000,
    paymentMode: "TRANSFERT_CHAMBRE",
    transferredToRoomNumber: 1,
    transferredToStayId: "stay-room1-nuitee",
    status: "TRANSFEREE_CHAMBRE",
    createdBy: "usr-caisse-04",
    createdAt: twoHoursAgo,
  },
  {
    id: "ord-102",
    orderNumber: "CMD-102",
    source: "COMPTOIR_POS",
    tableOrRoomLabel: "Terrasse Table 3",
    waitressId: "wait-chantal",
    waitressName: "Chantal",
    items: [
      {
        itemId: "menu-carpe-braisee",
        name: "Carpe Braisée Géante + Attiéké & Alloco",
        quantity: 2,
        unitPrice: 7000,
        subtotal: 14000,
        pole: "PLAT_MENU",
      },
      {
        itemId: "bar-bock-66",
        name: "Bière Bock Solibra 66cl",
        quantity: 4,
        unitPrice: 1000,
        subtotal: 4000,
        pole: "BAR_BOISSON",
      },
    ],
    totalAmount: 18000,
    paymentMode: "ESPECES",
    status: "PAYEE",
    createdBy: "usr-caisse-04",
    createdAt: twoHoursAgo,
  },
  {
    id: "ord-qr-103",
    orderNumber: "CMD-QR-103",
    source: "QR_TABLE",
    tableOrRoomLabel: "Table 4 — Client Didier",
    waitressId: "wait-awa",
    waitressName: "À attribuer (QR)",
    items: [
      {
        itemId: "menu-machoiron-braise",
        name: "Machoiron Braisé de M'Batto + Attiéké",
        quantity: 1,
        unitPrice: 8500,
        subtotal: 8500,
        pole: "PLAT_MENU",
      },
      {
        itemId: "bar-chill-50",
        name: "Chill Citron Solibra 50cl",
        quantity: 2,
        unitPrice: 1000,
        subtotal: 2000,
        pole: "BAR_BOISSON",
      },
    ],
    totalAmount: 10500,
    paymentMode: "EN_ATTENTE_QR",
    status: "NOUVELLE_QR",
    createdBy: "usr-client-05",
    createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_CEREMONIES: CeremonyBooking[] = [
  {
    id: "cer-01",
    reference: "DEV-RHR-2026-01",
    clientName: "Famille N'Guessan & Koné",
    clientPhone: "+225 07 09 88 77 66",
    eventType: "MARIAGE",
    eventDate: "2026-11-21",
    guestsCount: 120,
    baseRentalFee: 50000, // Inclut 50 couverts
    extraOrdinaryCovers: 50, // 50 x 1 000 F = 50 000 F
    extraVipCovers: 20, // 20 x 1 500 F = 30 000 F
    customCateringLines: [
      {
        id: "cat-1",
        label: "Buffet Royal M'Batto (Poulets braisés, Carpes, Kedjenou, Attiéké, Riz)",
        quantity: 1,
        unitPrice: 180000,
        subtotal: 180000,
      },
    ],
    customBeverageLines: [
      {
        id: "bev-1",
        label: "Forfait Casiers Bières Solibra & Sucreries glacées",
        quantity: 10,
        unitPrice: 12000,
        subtotal: 120000,
      },
    ],
    totalAmount: 430000,
    deposits: [
      {
        id: "dep-cer-1",
        amount: 150000,
        method: "WAVE",
        paidAt: yesterday,
        receivedBy: "M. Koffi — Administrateur RHR",
        note: "1er acompte de réservation salle & traiteur",
      },
    ],
    totalPaid: 150000,
    status: "CONFIRME_ACOMPTE",
    notes: "Décoration Or & Rouge Bordeaux souhaitée par les mariés.",
    createdBy: "usr-admin-01",
    createdAt: yesterday,
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-01",
    reference: "ENC-HOT-001",
    type: "ENCAISSEMENT",
    pole: "HOTEL",
    vault: "CAISSE_ESPECES",
    paymentMethod: "ESPECES",
    amount: 5000,
    description: "Acompte Nuitée Chambre 1 — M. Kouassi Jean-Marc",
    relatedEntityId: "stay-room1-nuitee",
    createdBy: "usr-hotel-03",
    createdByName: "Yao Serge — Gérant Hôtel",
    createdAt: yesterday,
  },
  {
    id: "tx-02",
    reference: "ENC-HOT-002",
    type: "ENCAISSEMENT",
    pole: "HOTEL",
    vault: "CAISSE_ESPECES",
    paymentMethod: "ESPECES",
    amount: 5000,
    description: "Passage 3H Chambre 4 — M. Konan Yao",
    relatedEntityId: "stay-room4-passage",
    createdBy: "usr-hotel-03",
    createdByName: "Yao Serge — Gérant Hôtel",
    createdAt: twoHoursAgo,
  },
  {
    id: "tx-03",
    reference: "ENC-HOT-003",
    type: "ENCAISSEMENT",
    pole: "HOTEL",
    vault: "CAISSE_MOBILE_MONEY",
    paymentMethod: "WAVE",
    amount: 5000,
    description: "Acompte Réservation Chambre 5 (Wave) — Mme Brou Aïcha",
    relatedEntityId: "stay-room5-resa",
    createdBy: "usr-hotel-03",
    createdByName: "Yao Serge — Gérant Hôtel",
    createdAt: twoHoursAgo,
  },
  {
    id: "tx-04",
    reference: "ENC-POS-102",
    type: "ENCAISSEMENT",
    pole: "BAR_RESTO",
    vault: "CAISSE_ESPECES",
    paymentMethod: "ESPECES",
    amount: 18000,
    description: "Commande #CMD-102 (Terrasse Table 3 — Serveuse Chantal)",
    relatedEntityId: "ord-102",
    createdBy: "usr-caisse-04",
    createdByName: "Adjoua Félicité — Caissière Bar/Resto",
    createdAt: twoHoursAgo,
  },
  {
    id: "tx-05",
    reference: "DEP-MAR-001",
    type: "DEPENSE",
    pole: "MARCHE_CUISINE",
    vault: "CAISSE_ESPECES",
    paymentMethod: "ESPECES",
    expenseFundSource: "CAISSE_DU_JOUR",
    amount: 6500,
    description: "Achats Marché M'Batto : Attiéké frais, Bananes Alloco, Piment, Tomates & Oignons",
    createdBy: "usr-caisse-04",
    createdByName: "Adjoua Félicité — Caissière Bar/Resto",
    createdAt: twoHoursAgo,
  },
  {
    id: "tx-06",
    reference: "ENC-CER-001",
    type: "ENCAISSEMENT",
    pole: "CEREMONIE",
    vault: "CAISSE_MOBILE_MONEY",
    paymentMethod: "WAVE",
    amount: 150000,
    grossAmount: 150000,
    discountAmount: 0,
    dailyReportRow: "LOCATION_SALLE",
    observation: "1er Acompte Mariage Famille N'Guessan & Koné",
    description: "1er Acompte Mariage Famille N'Guessan & Koné",
    relatedEntityId: "cer-01",
    createdBy: "usr-admin-01",
    createdByName: "M. Koffi — Administrateur RHR",
    createdAt: yesterday,
  },
  {
    id: "tx-doc-20260417-ch4",
    reference: "HTL-20260417-01",
    type: "ENCAISSEMENT",
    pole: "HOTEL",
    vault: "CAISSE_ESPECES",
    paymentMethod: "ESPECES",
    amount: 10000,
    grossAmount: 10000,
    discountAmount: 0,
    dailyReportRow: "CHAMBRE_4",
    observation: "Nuitée Chambre 4 (10 000 F)",
    description: "1 Nuitée — Chambre 4 (Standard) — Reporting du 17/04/2026",
    createdBy: "usr-hotel-03",
    createdByName: "Yao Serge — Gérant Hôtel",
    createdAt: "2026-04-17T12:00:00.000Z",
  },
];

export const INITIAL_DAILY_CASH_METAS: Record<string, DailyCashSheetMeta> = {
  "2026-04-17": {
    dateIso: "2026-04-17",
    openingBalanceOverride: 91000,
    cashDepositAmount: 0,
    bankDepositAmount: 0,
    managerSignatureName: "La Gérante RHR M'Batto",
    updatedAt: "2026-04-17T20:00:00.000Z",
  },
};

export const INITIAL_FIXED_COSTS: FixedCost[] = [
  {
    id: "fc-01",
    category: "CIE_ELECTRICITE",
    label: "Facture CIE Électricité Bimestrielle — RHR M'Batto",
    beneficiary: "CIE Côte d'Ivoire",
    periodMonth: "2026-11",
    amount: 65000,
    paymentMethod: "ORANGE_MONEY",
    isPaid: true,
    createdBy: "usr-admin-01",
    createdAt: yesterday,
  },
  {
    id: "fc-02",
    category: "SODECI_EAU",
    label: "Facture SODECI Eau Courante",
    beneficiary: "SODECI",
    periodMonth: "2026-11",
    amount: 18500,
    paymentMethod: "WAVE",
    isPaid: true,
    createdBy: "usr-admin-01",
    createdAt: yesterday,
  },
  {
    id: "fc-03",
    category: "SALAIRE",
    label: "Salaires Personnel Hôtel & Serveuses Bar/Resto",
    beneficiary: "Équipe RHR M'Batto",
    periodMonth: "2026-11",
    amount: 45000,
    paymentMethod: "ESPECES",
    isPaid: true,
    createdBy: "usr-admin-01",
    createdAt: yesterday,
  },
];

export const INITIAL_CLOSURES: CashClosure[] = [
  {
    id: "clos-01",
    pole: "BAR_RESTO",
    closedBy: "usr-caisse-04",
    closedByName: "Adjoua Félicité — Caissière Bar/Resto",
    closedByRole: "CAISSIERE_BAR_RESTO",
    shiftDate: "2026-11-03",
    totalCashIn: 74000,
    totalMobileMoneyIn: 22000,
    totalDayTillExpenses: 9000,
    expectedCash: 65000,
    actualCashHanded: 65000,
    discrepancy: 0,
    status: "VALIDE_PROPRIETAIRE",
    notes: "Caisse exacte remise à M. Koffi.",
    auditedBy: "usr-admin-01",
    createdAt: yesterday,
  },
];

// =============================================================================
// 4. STORAGE HYBRIDE INDEXEDDB + LOCALSTORAGE FALLBACK POUR ZUSTAND PERSIST
// =============================================================================

const DB_NAME = "rhr_mbatto_erp_db";
const STORE_NAME = "rhr_offline_store";

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB non disponible"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const hybridOfflineStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window === "undefined") return null;
    try {
      const localCopy = window.localStorage.getItem(name);
      if (localCopy) return localCopy;
      const db = await openIndexedDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(name);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return window.localStorage.getItem(name);
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
      const db = await openIndexedDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, name);
    } catch {
      // Fallback silencieux sur localStorage
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
      const db = await openIndexedDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(name);
    } catch {
      // ignore
    }
  },
};

// =============================================================================
// 5. STORE GLOBAL ZUSTAND AVEC SYNC QUEUE OFFLINE-FIRST
// =============================================================================

interface RhrStoreState {
  // Session & Sécurité
  currentUser: RhrUser | null;
  isLocked: boolean;
  users: RhrUser[];

  // Réseau & Synchronisation Offline-First
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncQueue: SyncOperation[];

  // Entités Métier
  waitresses: Waitress[];
  rooms: Room[];
  stays: Stay[];
  folioItems: RoomFolioItem[];
  inventory: InventoryItem[];
  posOrders: PosOrder[];
  ceremonies: CeremonyBooking[];
  transactions: Transaction[];
  cashClosures: CashClosure[];
  fixedCosts: FixedCost[];
  dailyCashMetas: Record<string, DailyCashSheetMeta>;

  // Actions Authentification & Lock Screen
  loginWithEmail: (
    email: string,
    password?: string,
    targetRole?: UserRole
  ) => { success: boolean; error?: string; user?: RhrUser };
  loginWithPin: (
    pinCode: string,
    targetRole?: UserRole
  ) => { success: boolean; error?: string; user?: RhrUser };
  quickLoginDemo: (role: UserRole, specificEmail?: string) => RhrUser;
  logout: () => void;
  lockSession: () => void;
  unlockSessionWithPin: (pinCode: string) => boolean;
  changeOwnCredentials: (input: {
    newPinCode: string;
    newPassword: string;
  }) => { success: boolean; error?: string };

  // Actions Administration Générale (Administrateur uniquement)
  createUserAccount: (input: {
    fullName: string;
    email: string;
    role: UserRole;
    pinCode: string;
    password: string;
    phone: string;
    badgeLabel?: string;
    mustChangeCredentials?: boolean;
  }) => { success: boolean; error?: string; user?: RhrUser };

  updateUserAccount: (
    userId: string,
    updates: Partial<
      Pick<
        RhrUser,
        | "fullName"
        | "email"
        | "role"
        | "pinCode"
        | "password"
        | "phone"
        | "badgeLabel"
        | "isActive"
        | "mustChangeCredentials"
      >
    >
  ) => { success: boolean; error?: string };

  deleteUserAccount: (userId: string) => { success: boolean; error?: string };

  createInventoryItem: (input: {
    name: string;
    sku?: string;
    pole: InventoryPole;
    category: string;
    unitPrice: number;
    stockQuantity: number;
    alertThreshold: number;
    unit: string;
    linkedCoreIngredientId?: string;
    linkedCoreIngredientQty?: number;
    isAvailableOnQr: boolean;
    imageEmoji?: string;
  }) => { success: boolean; error?: string; item?: InventoryItem };

  updateInventoryItem: (
    itemId: string,
    updates: Partial<
      Pick<
        InventoryItem,
        | "name"
        | "sku"
        | "category"
        | "unitPrice"
        | "stockQuantity"
        | "alertThreshold"
        | "unit"
        | "linkedCoreIngredientId"
        | "linkedCoreIngredientQty"
        | "isAvailableOnQr"
        | "imageEmoji"
      >
    >
  ) => { success: boolean; error?: string };

  deleteInventoryItem: (itemId: string) => { success: boolean; error?: string };

  createWaitress: (input: {
    name: string;
    phone: string;
  }) => { success: boolean; error?: string; waitress?: Waitress };

  updateWaitress: (
    waitressId: string,
    updates: Partial<Pick<Waitress, "name" | "phone" | "isActive">>
  ) => { success: boolean; error?: string };

  deleteWaitress: (waitressId: string) => { success: boolean; error?: string };

  updateRoomConfig: (
    roomId: string,
    updates: Partial<Pick<Room, "name" | "nightPrice" | "passagePrice" | "allowPassage3h">>
  ) => { success: boolean; error?: string };

  // Actions Offline-First & SyncQueue
  setOnlineStatus: (online: boolean) => void;
  enqueueSyncOperation: (
    table: string,
    action: "INSERT" | "UPDATE" | "DELETE",
    payload: Record<string, unknown>
  ) => void;
  flushSyncQueue: () => Promise<number>;
  simulateOfflineActionDemo: () => void;
  resetDemoData: () => void;
  clearAllDemoCounters: () => void;

  // Actions Pôle Hôtel (Sprint 2 + Réductions Ch. 1-3 & Historique depuis Janvier 2026)
  createCheckInOrReservation: (input: {
    roomId: string;
    guestName: string;
    guestPhone: string;
    guestIdNumber?: string;
    stayType: "NUITEE" | "PASSAGE_3H" | "RESERVATION";
    checkInDateIso?: string;
    nightsCount: number;
    discountAmount?: number;
    discountReason?: string;
    depositAmount: number;
    depositMethod: PaymentMethod;
    notes?: string;
  }) => { success: boolean; stayId?: string; error?: string };

  applyRoomDiscount: (input: {
    stayId: string;
    discountAmount: number;
    discountReason?: string;
  }) => { success: boolean; error?: string };

  recordHistoricalHotelOperation: (input: {
    operationType: "SEJOUR_CHAMBRE" | "DEPENSE_HOTEL";
    operationDateIso: string; // ex: "2026-01-15"
    roomNumber?: number; // 1 à 5
    stayType?: "NUITEE" | "PASSAGE_3H";
    nightsCount?: number;
    guestName?: string;
    guestPhone?: string;
    discountAmount?: number; // Pour Chambres 1 à 3
    discountReason?: string;
    amount: number; // Montant net encaissé ou décaissé
    paymentMethod: PaymentMethod;
    expenseCategory?: string;
    expenseFundSource?: "CAISSE_DU_JOUR" | "FONDS_SEPARE";
    description?: string;
  }) => { success: boolean; error?: string; transaction?: Transaction };

  deleteHotelTransaction: (transactionId: string) => void;

  collectReservationDeposit: (input: {
    stayId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
  }) => { success: boolean; error?: string };

  activateReservedStay: (stayId: string) => void;
  upgradePassageToNight: (roomId: string) => void;
  extendStayNights: (stayId: string, additionalNights: number) => void;
  simulatePassageNearExpiry: (roomId: string, expiredNow?: boolean) => void;

  checkoutRoom: (input: {
    roomId: string;
    paymentMethod: PaymentMethod;
  }) => {
    success: boolean;
    stay?: Stay;
    room?: Room;
    folioLines?: RoomFolioItem[];
    paidNowAmount?: number;
    totalStayCost?: number;
    receiptRef?: string;
  };

  markRoomClean: (roomId: string) => void;

  addHotelExpense: (input: {
    pole?: "HOTEL" | "MAINTENANCE" | "MARCHE_CUISINE" | "BAR_RESTO";
    categoryLabel: string;
    description: string;
    amount: number;
    paymentMethod: PaymentMethod;
    fundSource: "CAISSE_DU_JOUR" | "FONDS_SEPARE";
    receiptPhotoUrl?: string;
    operationDateIso?: string;
  }) => Transaction;

  // Actions Pôle POS Bar & Restaurant, Stocks & Menu QR (Sprint 3)
  createPosOrder: (input: {
    waitressId: string;
    tableOrRoomLabel: string;
    items: PosOrderItem[];
    paymentMode:
    | "ESPECES"
    | "WAVE"
    | "ORANGE_MONEY"
    | "MTN_MOMO"
    | "TRANSFERT_CHAMBRE";
    transferredToRoomNumber?: number;
  }) => {
    success: boolean;
    error?: string;
    order?: PosOrder;
  };

  submitQrCustomerOrder: (input: {
    locationType: "TABLE" | "CHAMBRE";
    locationLabel: string;
    guestFirstName: string;
    items: PosOrderItem[];
  }) => {
    success: boolean;
    error?: string;
    order?: PosOrder;
  };

  processIncomingQrOrder: (input: {
    orderId: string;
    waitressId: string;
    paymentMode:
    | "ESPECES"
    | "WAVE"
    | "ORANGE_MONEY"
    | "MTN_MOMO"
    | "TRANSFERT_CHAMBRE";
    transferredToRoomNumber?: number;
  }) => {
    success: boolean;
    error?: string;
    order?: PosOrder;
  };

  cancelQrOrder: (orderId: string) => void;
  ingestRemoteQrOrders: (orders: PosOrder[]) => void;
  syncCatalogSnapshot: (items: InventoryItem[]) => void;

  restockInventoryItem: (input: {
    itemId: string;
    addedQuantity: number;
    recordMarketExpense?: boolean;
    expenseCost?: number;
    paymentMethod?: PaymentMethod;
    fundSource?: "CAISSE_DU_JOUR" | "FONDS_SEPARE";
  }) => void;

  setItemStockZeroDemo: (itemId: string) => void;

  // Actions Sprint 4 : Salle de Cérémonie, Clôture de Caisse, Charges Fixes & Reporting Journalier (Depuis Janv. 2026)
  createCeremonyBooking: (input: {
    clientName: string;
    clientPhone: string;
    eventType: CeremonyBooking["eventType"];
    eventDate: string;
    extraOrdinaryCovers: number;
    extraVipCovers: number;
    customCateringLines: CeremonyCustomLine[];
    customBeverageLines: CeremonyCustomLine[];
    discountAmount?: number;
    initialDepositAmount: number;
    initialDepositMethod: PaymentMethod;
    operationDateIso?: string;
    notes?: string;
  }) => CeremonyBooking;

  addCeremonyDeposit: (input: {
    ceremonyId: string;
    amount: number;
    method: PaymentMethod;
    operationDateIso?: string;
    note?: string;
  }) => CeremonyBooking | null;

  recordGeneralDailyOperation: (input: {
    operationDateIso: string; // ex: "2026-04-17"
    category: DailyReportRowKey | "DEPENSE";
    grossAmount: number;
    discountAmount?: number;
    paymentMethod: PaymentMethod;
    observation?: string;
    clientName?: string;
    eventType?: CeremonyBooking["eventType"];
    expenseFundSource?: "CAISSE_DU_JOUR" | "FONDS_SEPARE";
  }) => { success: boolean; transaction: Transaction };

  updateDailyCashSheetMeta: (input: {
    dateIso: string;
    openingBalanceOverride?: number;
    cashDepositAmount?: number;
    bankDepositAmount?: number;
    managerSignatureName?: string;
    rowObservations?: Partial<Record<DailyReportRowKey, string>>;
  }) => DailyCashSheetMeta;

  submitCashClosure: (input: {
    pole: "HOTEL" | "BAR_RESTO" | "GLOBAL";
    totalCashIn: number;
    totalMobileMoneyIn: number;
    totalDayTillExpenses: number;
    expectedCash: number;
    actualCashHanded: number;
    notes?: string;
  }) => CashClosure;

  validateCashClosureByOwner: (closureId: string) => void;

  addFixedCost: (input: {
    category: FixedCost["category"];
    label: string;
    beneficiary?: string;
    periodMonth: string;
    amount: number;
    paymentMethod: PaymentMethod;
    receiptPhotoUrl?: string;
  }) => FixedCost;
}

export const useRhrStore = create<RhrStoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isLocked: false,
      users: INITIAL_USERS,

      isOnline: true,
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      syncQueue: [],

      waitresses: INITIAL_WAITRESSES,
      rooms: INITIAL_ROOMS,
      stays: INITIAL_STAYS,
      folioItems: INITIAL_FOLIO_ITEMS,
      inventory: INITIAL_INVENTORY,
      posOrders: INITIAL_POS_ORDERS,
      ceremonies: INITIAL_CEREMONIES,
      transactions: INITIAL_TRANSACTIONS,
      cashClosures: INITIAL_CLOSURES,
      fixedCosts: INITIAL_FIXED_COSTS,
      dailyCashMetas: INITIAL_DAILY_CASH_METAS,

      loginWithEmail: (email, password, targetRole) => {
        const cleanEmail = email.trim().toLowerCase();
        const found = get().users.find(
          (u) => u.email.toLowerCase() === cleanEmail
        );
        if (!found) {
          return {
            success: false,
            error: "Aucun compte RHR trouvé avec cette adresse email.",
          };
        }
        if (found.isActive === false) {
          return {
            success: false,
            error: "Ce compte utilisateur a été désactivé par l'Administrateur Général.",
          };
        }
        if (targetRole && found.role !== targetRole) {
          return {
            success: false,
            error: "Ces identifiants n'appartiennent pas au poste/profil sélectionné.",
          };
        }
        if (
          !password ||
          (found.password && password !== found.password && password !== found.pinCode)
        ) {
          return {
            success: false,
            error: "Mot de passe ou code PIN incorrect.",
          };
        }
        set({ currentUser: found, isLocked: false });
        return { success: true, user: found };
      },

      loginWithPin: (pinCode, targetRole) => {
        const cleanPin = pinCode.trim();
        const users = get().users;
        const found = users.find((u) => {
          if (u.isActive === false) return false;
          if (targetRole && u.role !== targetRole) {
            return false;
          }
          return u.pinCode === cleanPin;
        });

        if (!found) {
          return {
            success: false,
            error: "Code PIN à 4 chiffres invalide pour ce poste d'accès.",
          };
        }
        set({ currentUser: found, isLocked: false });
        return { success: true, user: found };
      },

      quickLoginDemo: (role, specificEmail) => {
        const users = get().users;
        const found =
          (specificEmail
            ? users.find((u) => u.email === specificEmail)
            : users.find((u) => u.role === role)) || users[0];
        set({ currentUser: found, isLocked: false });
        return found;
      },

      logout: () => {
        set({ currentUser: null, isLocked: false });
      },

      lockSession: () => {
        if (get().currentUser) {
          set({ isLocked: true });
        }
      },

      unlockSessionWithPin: (pinCode) => {
        const current = get().currentUser;
        if (!current) return false;
        if (current.pinCode === pinCode.trim()) {
          set({ isLocked: false });
          return true;
        }
        return false;
      },

      changeOwnCredentials: ({ newPinCode, newPassword }) => {
        const state = get();
        const current = state.currentUser;
        if (!current) {
          return {
            success: false,
            error: "Aucun utilisateur connecté.",
          };
        }
        const cleanPin = newPinCode.trim();
        const cleanPassword = newPassword.trim();
        if (!/^\d{4}$/.test(cleanPin)) {
          return {
            success: false,
            error: "Le nouveau code PIN doit comporter exactement 4 chiffres.",
          };
        }
        if (
          state.users.some(
            (u) => u.id !== current.id && u.pinCode === cleanPin
          )
        ) {
          return {
            success: false,
            error:
              "Ce code PIN est déjà attribué à un autre utilisateur. Choisissez un code PIN personnel unique.",
          };
        }
        if (cleanPassword.length < 4) {
          return {
            success: false,
            error:
              "Le nouveau mot de passe doit contenir au moins 4 caractères.",
          };
        }

        const updatedUser: RhrUser = {
          ...current,
          pinCode: cleanPin,
          password: cleanPassword,
          mustChangeCredentials: false,
        };

        set((prev) => ({
          users: prev.users.map((u) => (u.id === current.id ? updatedUser : u)),
          currentUser: updatedUser,
        }));

        get().enqueueSyncOperation("users", "UPDATE", {
          id: current.id,
          pinCode: cleanPin,
          mustChangeCredentials: false,
        });

        return { success: true };
      },

      // =======================================================================
      // ACTIONS ADMINISTRATION GÉNÉRALE (ADMINISTRATEUR UNIQUEMENT)
      // =======================================================================

      createUserAccount: (input) => {
        const state = get();
        const cleanEmail = input.email.trim().toLowerCase();
        const cleanPin = input.pinCode.trim();
        if (!input.fullName.trim() || !cleanEmail) {
          return {
            success: false,
            error: "Le nom complet et l'adresse email sont obligatoires.",
          };
        }
        if (!/^\d{4}$/.test(cleanPin)) {
          return {
            success: false,
            error: "Le code PIN doit comporter exactement 4 chiffres.",
          };
        }
        if (state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return {
            success: false,
            error: "Un utilisateur avec cette adresse email existe déjà.",
          };
        }
        if (state.users.some((u) => u.pinCode === cleanPin)) {
          return {
            success: false,
            error: "Ce code PIN est déjà attribué à un autre utilisateur (risque de sécurité).",
          };
        }

        const defaultBadges: Record<UserRole, string> = {
          PROPRIETAIRE: "Administrateur",
          COMPTABLE: "Expert Comptable & Audit",
          GERANT_HOTEL: "Gérant Réception Hôtel",
          CAISSIERE_BAR_RESTO: "Caissière Bar & Restaurant",
          CLIENT_QR: "Accès Client Table / Chambre",
        };

        const newUser: RhrUser = {
          id: `usr-${Date.now()}`,
          email: cleanEmail,
          fullName: input.fullName.trim(),
          role: input.role,
          pinCode: cleanPin,
          password: input.password.trim() || "rhr2026",
          phone: input.phone.trim() || "+225 00 00 00 00 00",
          badgeLabel: input.badgeLabel?.trim() || defaultBadges[input.role],
          isActive: true,
          mustChangeCredentials:
            input.mustChangeCredentials !== undefined
              ? input.mustChangeCredentials
              : true,
        };

        set((prev) => ({
          users: [...prev.users, newUser],
        }));

        get().enqueueSyncOperation("users", "INSERT", {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
        });

        return { success: true, user: newUser };
      },

      updateUserAccount: (userId, updates) => {
        const state = get();
        const target = state.users.find((u) => u.id === userId);
        if (!target) {
          return { success: false, error: "Compte utilisateur introuvable." };
        }
        if (updates.pinCode !== undefined) {
          const cleanPin = updates.pinCode.trim();
          if (!/^\d{4}$/.test(cleanPin)) {
            return {
              success: false,
              error: "Le code PIN doit comporter exactement 4 chiffres.",
            };
          }
          if (state.users.some((u) => u.id !== userId && u.pinCode === cleanPin)) {
            return {
              success: false,
              error: "Ce code PIN est déjà utilisé par un autre compte.",
            };
          }
        }
        if (updates.email !== undefined) {
          const cleanEmail = updates.email.trim().toLowerCase();
          if (
            state.users.some(
              (u) => u.id !== userId && u.email.toLowerCase() === cleanEmail
            )
          ) {
            return {
              success: false,
              error: "Cette adresse email est déjà utilisée par un autre compte.",
            };
          }
        }

        const updatedUser: RhrUser = {
          ...target,
          ...updates,
          fullName: updates.fullName ? updates.fullName.trim() : target.fullName,
          email: updates.email ? updates.email.trim().toLowerCase() : target.email,
          pinCode: updates.pinCode ? updates.pinCode.trim() : target.pinCode,
        };

        set((prev) => ({
          users: prev.users.map((u) => (u.id === userId ? updatedUser : u)),
          currentUser:
            prev.currentUser?.id === userId ? updatedUser : prev.currentUser,
        }));

        get().enqueueSyncOperation("users", "UPDATE", {
          id: userId,
          ...updates,
        });

        return { success: true };
      },

      deleteUserAccount: (userId) => {
        const state = get();
        const target = state.users.find((u) => u.id === userId);
        if (!target) {
          return { success: false, error: "Utilisateur introuvable." };
        }
        if (state.currentUser?.id === userId) {
          return {
            success: false,
            error: "Vous ne pouvez pas supprimer votre propre compte actif.",
          };
        }
        const ownersCount = state.users.filter(
          (u) => u.role === "PROPRIETAIRE" && u.isActive !== false
        ).length;
        if (target.role === "PROPRIETAIRE" && ownersCount <= 1) {
          return {
            success: false,
            error: "Impossible de supprimer le seul compte Propriétaire / Administrateur Général.",
          };
        }

        set((prev) => ({
          users: prev.users.filter((u) => u.id !== userId),
        }));

        get().enqueueSyncOperation("users", "DELETE", { id: userId });
        return { success: true };
      },

      createInventoryItem: (input) => {
        const state = get();
        const user = state.currentUser || state.users[0];
        if (!input.name.trim()) {
          return {
            success: false,
            error: "Le nom de l'article est obligatoire.",
          };
        }

        const nowIso = new Date().toISOString();
        const linkedCore = input.linkedCoreIngredientId
          ? state.inventory.find((c) => c.id === input.linkedCoreIngredientId)
          : undefined;

        const initialStock =
          input.pole === "PLAT_MENU" && linkedCore
            ? linkedCore.stockQuantity
            : Math.max(0, Math.round(input.stockQuantity || 0));

        const newItem: InventoryItem = {
          id: `item-${Date.now()}`,
          sku:
            input.sku?.trim().toUpperCase() ||
            `ART-${String(state.inventory.length + 1).padStart(3, "0")}`,
          name: input.name.trim(),
          pole: input.pole,
          category: input.category.trim() || "Divers",
          unitPrice:
            input.pole === "CUISINE_PHARE"
              ? 0
              : Math.max(0, Math.round(input.unitPrice || 0)),
          stockQuantity: initialStock,
          alertThreshold: Math.max(1, Math.round(input.alertThreshold || 5)),
          unit:
            input.unit.trim() ||
            (input.pole === "BAR_BOISSON"
              ? "Bouteilles"
              : input.pole === "PLAT_MENU"
                ? "Plat"
                : "Unités"),
          linkedCoreIngredientId:
            input.pole === "PLAT_MENU" && input.linkedCoreIngredientId
              ? input.linkedCoreIngredientId
              : undefined,
          linkedCoreIngredientQty:
            input.pole === "PLAT_MENU" && input.linkedCoreIngredientId
              ? Math.max(1, Math.round(input.linkedCoreIngredientQty || 1))
              : undefined,
          isAvailableOnQr:
            input.pole === "CUISINE_PHARE" ? false : input.isAvailableOnQr,
          imageEmoji:
            input.imageEmoji?.trim() ||
            (input.pole === "BAR_BOISSON"
              ? "🍾"
              : input.pole === "PLAT_MENU"
                ? "🍽️"
                : "📦"),
          updatedBy: user.id,
          updatedAt: nowIso,
        };

        set((prev) => ({
          inventory: [...prev.inventory, newItem],
        }));

        get().enqueueSyncOperation("inventory_items", "INSERT", {
          id: newItem.id,
          sku: newItem.sku,
          name: newItem.name,
          unitPrice: newItem.unitPrice,
        });

        return { success: true, item: newItem };
      },

      updateInventoryItem: (itemId, updates) => {
        const state = get();
        const user = state.currentUser || state.users[0];
        const target = state.inventory.find((i) => i.id === itemId);
        if (!target) {
          return { success: false, error: "Article introuvable." };
        }
        const nowIso = new Date().toISOString();

        const updatedInventory = state.inventory.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            ...updates,
            name: updates.name !== undefined ? updates.name.trim() : item.name,
            unitPrice:
              updates.unitPrice !== undefined
                ? Math.max(0, Math.round(updates.unitPrice))
                : item.unitPrice,
            stockQuantity:
              updates.stockQuantity !== undefined
                ? Math.max(0, Math.round(updates.stockQuantity))
                : item.stockQuantity,
            alertThreshold:
              updates.alertThreshold !== undefined
                ? Math.max(0, Math.round(updates.alertThreshold))
                : item.alertThreshold,
            updatedBy: user.id,
            updatedAt: nowIso,
          };
        });

        const syncedInventory = updatedInventory.map((item) => {
          if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
            const linkedCore = updatedInventory.find(
              (c) => c.id === item.linkedCoreIngredientId
            );
            if (linkedCore) {
              return { ...item, stockQuantity: linkedCore.stockQuantity };
            }
          }
          return item;
        });

        set({ inventory: syncedInventory });

        get().enqueueSyncOperation("inventory_items", "UPDATE", {
          id: itemId,
          ...updates,
        });

        return { success: true };
      },

      deleteInventoryItem: (itemId) => {
        const state = get();
        const target = state.inventory.find((i) => i.id === itemId);
        if (!target) {
          return { success: false, error: "Article introuvable." };
        }
        if (target.pole === "CUISINE_PHARE") {
          const dependentDishes = state.inventory.filter(
            (i) => i.linkedCoreIngredientId === itemId
          );
          if (dependentDishes.length > 0) {
            return {
              success: false,
              error: `Impossible de supprimer ce Produit Phare car ${dependentDishes.length} plat(s) du menu y sont rattachés.`,
            };
          }
        }

        set((prev) => ({
          inventory: prev.inventory.filter((i) => i.id !== itemId),
        }));

        get().enqueueSyncOperation("inventory_items", "DELETE", { id: itemId });
        return { success: true };
      },

      createWaitress: ({ name, phone }) => {
        if (!name.trim()) {
          return {
            success: false,
            error: "Le prénom ou nom de la serveuse est obligatoire.",
          };
        }
        const newWaitress: Waitress = {
          id: `wait-${Date.now()}`,
          name: name.trim(),
          phone: phone.trim() || "+225 07 00 00 00 00",
          isActive: true,
          totalSalesAmount: 0,
          ordersCount: 0,
        };
        set((prev) => ({
          waitresses: [...prev.waitresses, newWaitress],
        }));
        get().enqueueSyncOperation("waitresses", "INSERT", {
          id: newWaitress.id,
          name: newWaitress.name,
        });
        return { success: true, waitress: newWaitress };
      },

      updateWaitress: (waitressId, updates) => {
        const state = get();
        const target = state.waitresses.find((w) => w.id === waitressId);
        if (!target) {
          return { success: false, error: "Serveuse introuvable." };
        }
        set((prev) => ({
          waitresses: prev.waitresses.map((w) =>
            w.id === waitressId
              ? {
                ...w,
                ...updates,
                name: updates.name !== undefined ? updates.name.trim() : w.name,
                phone:
                  updates.phone !== undefined ? updates.phone.trim() : w.phone,
              }
              : w
          ),
        }));
        get().enqueueSyncOperation("waitresses", "UPDATE", {
          id: waitressId,
          ...updates,
        });
        return { success: true };
      },

      deleteWaitress: (waitressId) => {
        const state = get();
        if (state.waitresses.length <= 1) {
          return {
            success: false,
            error: "Il doit rester au moins une serveuse / comptoir actif.",
          };
        }
        set((prev) => ({
          waitresses: prev.waitresses.filter((w) => w.id !== waitressId),
        }));
        get().enqueueSyncOperation("waitresses", "DELETE", { id: waitressId });
        return { success: true };
      },

      updateRoomConfig: (roomId, updates) => {
        const state = get();
        const room = state.rooms.find((r) => r.id === roomId);
        if (!room) {
          return { success: false, error: "Chambre introuvable." };
        }
        const nowIso = new Date().toISOString();
        set((prev) => ({
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, ...updates, updatedAt: nowIso } : r
          ),
        }));
        return { success: true };
      },

      setOnlineStatus: (online) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });
        if (online && wasOffline && get().syncQueue.length > 0) {
          get().flushSyncQueue();
        }
      },

      enqueueSyncOperation: (table, action, payload) => {
        const user = get().currentUser;
        const op: SyncOperation = {
          id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          table,
          action,
          payload: {
            ...payload,
            createdBy: user?.id || "system",
          },
          createdBy: user?.id || "system",
          timestamp: new Date().toISOString(),
          status: "PENDING",
        };

        set((state) => ({
          syncQueue: [...state.syncQueue, op],
        }));

        if (get().isOnline) {
          get().flushSyncQueue();
        }
      },

      flushSyncQueue: async () => {
        const pending = get().syncQueue;
        if (pending.length === 0 || !get().isOnline) return 0;

        set({ isSyncing: true });

        try {
          if (typeof window !== "undefined") {
            await fetch("/api/db-sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operations: pending }),
            }).catch(() => null);
          } else if (isSupabaseConfigured) {
            for (const op of pending) {
              if (op.action === "INSERT") {
                await supabase.from(op.table).insert(op.payload);
              } else if (op.action === "UPDATE") {
                await supabase
                  .from(op.table)
                  .update(op.payload)
                  .eq("id", op.payload.id);
              } else if (op.action === "DELETE") {
                await supabase
                  .from(op.table)
                  .delete()
                  .eq("id", op.payload.id);
              }
            }
          }

          const count = pending.length;
          set({
            syncQueue: [],
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
          });
          return count;
        } catch {
          set({ isSyncing: false });
          return 0;
        }
      },

      simulateOfflineActionDemo: () => {
        const user = get().currentUser;
        const op: SyncOperation = {
          id: `sync-${Date.now()}`,
          table: "transactions",
          action: "INSERT",
          payload: {
            note: "Opération locale stockée sur IndexedDB (M'Batto Offline)",
            createdBy: user?.id || "usr-admin-01",
          },
          createdBy: user?.id || "usr-admin-01",
          timestamp: new Date().toISOString(),
          status: "PENDING",
        };
        set((state) => ({
          isOnline: false,
          syncQueue: [...state.syncQueue, op],
        }));
      },

      resetDemoData: () => {
        const current = get().currentUser;
        const freshAdmin =
          INITIAL_USERS.find((u) => u.id === current?.id) || INITIAL_USERS[0];
        set({
          currentUser: current ? freshAdmin : null,
          users: INITIAL_USERS,
          waitresses: INITIAL_WAITRESSES,
          rooms: INITIAL_ROOMS,
          stays: INITIAL_STAYS,
          folioItems: INITIAL_FOLIO_ITEMS,
          inventory: INITIAL_INVENTORY,
          posOrders: INITIAL_POS_ORDERS,
          ceremonies: INITIAL_CEREMONIES,
          transactions: INITIAL_TRANSACTIONS,
          cashClosures: INITIAL_CLOSURES,
          fixedCosts: INITIAL_FIXED_COSTS,
          syncQueue: [],
          lastSyncedAt: new Date().toISOString(),
        });
      },

      clearAllDemoCounters: () => {
        const nowIso = new Date().toISOString();
        set((prev) => ({
          waitresses: prev.waitresses.map((w) => ({
            ...w,
            totalSalesAmount: 0,
            ordersCount: 0,
          })),
          rooms: prev.rooms.map((r) => ({
            ...r,
            status: "LIBRE",
            currentStayId: undefined,
            updatedAt: nowIso,
          })),
          stays: [],
          folioItems: [],
          posOrders: [],
          ceremonies: [],
          transactions: [],
          cashClosures: [],
          fixedCosts: [],
          syncQueue: [],
          lastSyncedAt: nowIso,
        }));
      },

      // =======================================================================
      // ACTIONS PÔLE HÔTEL (SPRINT 2)
      // =======================================================================

      createCheckInOrReservation: (input) => {
        const state = get();
        const user = state.currentUser || state.users[2]; // Gérant Hôtel fallback
        const room = state.rooms.find((r) => r.id === input.roomId);
        if (!room) {
          return { success: false, error: "Chambre introuvable." };
        }
        if (input.stayType === "PASSAGE_3H" && !room.allowPassage3h) {
          return {
            success: false,
            error:
              "Le Passage 3H (5 000 F) est configuré uniquement sur les Chambres 4 et 5.",
          };
        }

        const nowIso = new Date().toISOString();
        const startIso =
          input.stayType === "RESERVATION" && input.checkInDateIso
            ? new Date(input.checkInDateIso).toISOString()
            : nowIso;

        const nights =
          input.stayType === "PASSAGE_3H"
            ? 1
            : Math.max(1, Math.round(input.nightsCount || 1));

        const expectedOutIso =
          input.stayType === "PASSAGE_3H"
            ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
            : new Date(
              new Date(startIso).getTime() + nights * 24 * 60 * 60 * 1000
            ).toISOString();

        const unitRate =
          input.stayType === "PASSAGE_3H" ? room.passagePrice : room.nightPrice;
        const grossAccommodationCost =
          input.stayType === "PASSAGE_3H"
            ? room.passagePrice
            : room.nightPrice * nights;

        // Réduction commerciale applicable sur les Chambres 1 à 3 (Catégorie Confort)
        const rawDiscount =
          room.roomNumber <= 3 && input.stayType !== "PASSAGE_3H"
            ? Math.max(0, Math.round(input.discountAmount || 0))
            : 0;
        const cleanDiscount = Math.min(grossAccommodationCost, rawDiscount);
        const cleanDiscountReason = input.discountReason?.trim() || undefined;

        const totalAccommodationCost = Math.max(
          0,
          grossAccommodationCost - cleanDiscount
        );

        const deposit = Math.max(0, Math.round(input.depositAmount || 0));
        const stayId = `stay-r${room.roomNumber}-${Date.now()}`;

        const newStay: Stay = {
          id: stayId,
          roomId: room.id,
          roomNumber: room.roomNumber,
          guestName: input.guestName.trim(),
          guestPhone: input.guestPhone.trim(),
          guestIdNumber: input.guestIdNumber?.trim() || undefined,
          stayType: input.stayType,
          status: input.stayType === "RESERVATION" ? "RESERVE" : "EN_COURS",
          checkIn: startIso,
          expectedCheckOut: expectedOutIso,
          nightsCount: nights,
          baseRate: unitRate,
          discountAmount: cleanDiscount > 0 ? cleanDiscount : undefined,
          discountReason: cleanDiscount > 0 ? cleanDiscountReason : undefined,
          depositAmount: deposit,
          depositMethod: deposit > 0 ? input.depositMethod : undefined,
          notes: input.notes?.trim() || undefined,
          createdBy: user.id,
          createdAt: nowIso,
        };

        const discountLabelSuffix =
          cleanDiscount > 0
            ? ` — Réduction accordée : -${cleanDiscount.toLocaleString(
              "fr-FR"
            )} F${cleanDiscountReason ? ` (${cleanDiscountReason})` : ""}`
            : "";

        const newFolioLines: RoomFolioItem[] = [
          {
            id: `folio-heb-${Date.now()}`,
            stayId,
            roomNumber: room.roomNumber,
            description:
              input.stayType === "PASSAGE_3H"
                ? `Forfait Passage 3 Heures — Chambre ${room.roomNumber}`
                : `${input.stayType === "RESERVATION" ? "Réservation" : "Séjour"
                } ${nights} Nuitée(s) — Chambre ${room.roomNumber} (${room.category
                })${discountLabelSuffix}`,
            category: "HEBERGEMENT",
            amount: totalAccommodationCost,
            isPaid: deposit >= totalAccommodationCost,
            createdBy: user.id,
            createdAt: nowIso,
          },
        ];

        const newTransactions: Transaction[] = [];

        if (deposit > 0) {
          newFolioLines.push({
            id: `folio-dep-${Date.now() + 1}`,
            stayId,
            roomNumber: room.roomNumber,
            description: `${input.stayType === "PASSAGE_3H"
                ? "Règlement Passage 3H"
                : "Acompte / Règlement Hébergement"
              } (${input.depositMethod.replace(/_/g, " ")})`,
            category: "ACOMPTE",
            amount: -deposit,
            isPaid: true,
            createdBy: user.id,
            createdAt: nowIso,
          });

          newTransactions.push({
            id: `tx-hot-${Date.now()}`,
            reference: `ENC-HOT-${String(
              state.transactions.length + 1
            ).padStart(3, "0")}`,
            type: "ENCAISSEMENT",
            pole: "HOTEL",
            vault:
              input.depositMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.depositMethod,
            amount: deposit,
            grossAmount: grossAccommodationCost,
            discountAmount: cleanDiscount,
            dailyReportRow: `CHAMBRE_${room.roomNumber}` as DailyReportRowKey,
            observation:
              cleanDiscountReason ||
              input.notes?.trim() ||
              `${input.guestName.trim()} (${input.stayType === "PASSAGE_3H" ? "Passage 3H" : `${nights} nuit(s)`})`,
            description: `${input.stayType === "RESERVATION"
                ? "Acompte Réservation"
                : input.stayType === "PASSAGE_3H"
                  ? "Encaissement Passage 3H"
                  : "Encaissement Check-In Nuitée"
              } Chambre ${room.roomNumber} — ${input.guestName.trim()}${cleanDiscount > 0
                ? ` (Réduction -${cleanDiscount.toLocaleString("fr-FR")} F)`
                : ""
              }`,
            relatedEntityId: stayId,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          });
        }

        const nextRoomStatus: RoomStatus =
          input.stayType === "PASSAGE_3H"
            ? "OCCUPEE_PASSAGE_3H"
            : input.stayType === "RESERVATION"
              ? "RESERVEE"
              : "OCCUPEE_NUITEE";

        set((prev) => ({
          rooms: prev.rooms.map((r) =>
            r.id === room.id
              ? {
                ...r,
                status: nextRoomStatus,
                currentStayId: stayId,
                updatedBy: user.id,
                updatedAt: nowIso,
              }
              : r
          ),
          stays: [newStay, ...prev.stays],
          folioItems: [...prev.folioItems, ...newFolioLines],
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("stays", "INSERT", {
          id: stayId,
          roomNumber: room.roomNumber,
          guestName: newStay.guestName,
          stayType: newStay.stayType,
          depositAmount: deposit,
        });

        return { success: true, stayId };
      },

      collectReservationDeposit: ({ stayId, amount, method, note }) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const stay = state.stays.find((s) => s.id === stayId);
        if (!stay || amount <= 0) {
          return {
            success: false,
            error: "Montant ou réservation invalide.",
          };
        }

        const nowIso = new Date().toISOString();
        const cleanAmount = Math.round(amount);

        const newFolioItem: RoomFolioItem = {
          id: `folio-acompte-${Date.now()}`,
          stayId: stay.id,
          roomNumber: stay.roomNumber,
          description: `Complément d'acompte (${method.replace(/_/g, " ")})${note ? ` — ${note}` : ""
            }`,
          category: "ACOMPTE",
          amount: -cleanAmount,
          isPaid: true,
          createdBy: user.id,
          createdAt: nowIso,
        };

        const newTx: Transaction = {
          id: `tx-acompte-${Date.now()}`,
          reference: `ENC-HOT-${String(state.transactions.length + 1).padStart(
            3,
            "0"
          )}`,
          type: "ENCAISSEMENT",
          pole: "HOTEL",
          vault:
            method === "ESPECES" ? "CAISSE_ESPECES" : "CAISSE_MOBILE_MONEY",
          paymentMethod: method,
          amount: cleanAmount,
          description: `Complément Acompte Chambre ${stay.roomNumber} — ${stay.guestName}`,
          relatedEntityId: stay.id,
          createdBy: user.id,
          createdByName: user.fullName,
          createdAt: nowIso,
        };

        set((prev) => ({
          stays: prev.stays.map((s) =>
            s.id === stay.id
              ? {
                ...s,
                depositAmount: s.depositAmount + cleanAmount,
                depositMethod: method,
              }
              : s
          ),
          folioItems: [...prev.folioItems, newFolioItem],
          transactions: [newTx, ...prev.transactions],
        }));

        get().enqueueSyncOperation("room_folio_items", "INSERT", {
          id: newFolioItem.id,
          stayId: stay.id,
          amount: -cleanAmount,
        });

        return { success: true };
      },

      activateReservedStay: (stayId) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const stay = state.stays.find((s) => s.id === stayId);
        if (!stay) return;
        const nowIso = new Date().toISOString();

        set((prev) => ({
          stays: prev.stays.map((s) =>
            s.id === stayId
              ? {
                ...s,
                stayType: "NUITEE",
                status: "EN_COURS",
                checkIn: nowIso,
              }
              : s
          ),
          rooms: prev.rooms.map((r) =>
            r.roomNumber === stay.roomNumber
              ? {
                ...r,
                status: "OCCUPEE_NUITEE",
                currentStayId: stay.id,
                updatedBy: user.id,
                updatedAt: nowIso,
              }
              : r
          ),
        }));

        get().enqueueSyncOperation("stays", "UPDATE", {
          id: stayId,
          status: "EN_COURS",
        });
      },

      upgradePassageToNight: (roomId) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const room = state.rooms.find((r) => r.id === roomId);
        if (!room || !room.currentStayId) return;
        const stay = state.stays.find((s) => s.id === room.currentStayId);
        if (!stay) return;

        const nowIso = new Date().toISOString();
        const diffAmount = Math.max(0, room.nightPrice - room.passagePrice);
        const tomorrowNoonIso = new Date(
          Date.now() + 20 * 60 * 60 * 1000
        ).toISOString();

        const upgradeLine: RoomFolioItem = {
          id: `folio-upg-${Date.now()}`,
          stayId: stay.id,
          roomNumber: room.roomNumber,
          description: `Prolongation Passage 3H en Nuitée Complète (Complément Tarif ${room.category})`,
          category: "SUPPLEMENT",
          amount: diffAmount,
          isPaid: false,
          createdBy: user.id,
          createdAt: nowIso,
        };

        set((prev) => ({
          rooms: prev.rooms.map((r) =>
            r.id === room.id
              ? {
                ...r,
                status: "OCCUPEE_NUITEE",
                updatedBy: user.id,
                updatedAt: nowIso,
              }
              : r
          ),
          stays: prev.stays.map((s) =>
            s.id === stay.id
              ? {
                ...s,
                stayType: "NUITEE",
                baseRate: room.nightPrice,
                expectedCheckOut: tomorrowNoonIso,
              }
              : s
          ),
          folioItems: [...prev.folioItems, upgradeLine],
        }));

        get().enqueueSyncOperation("rooms", "UPDATE", {
          id: room.id,
          status: "OCCUPEE_NUITEE",
        });
      },

      extendStayNights: (stayId, additionalNights) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const stay = state.stays.find((s) => s.id === stayId);
        if (!stay || additionalNights <= 0) return;
        const room = state.rooms.find((r) => r.roomNumber === stay.roomNumber);
        if (!room) return;

        const nowIso = new Date().toISOString();
        const addedCost = room.nightPrice * additionalNights;
        const nextExpectedOut = new Date(
          new Date(stay.expectedCheckOut).getTime() +
          additionalNights * 24 * 60 * 60 * 1000
        ).toISOString();

        const extraLine: RoomFolioItem = {
          id: `folio-ext-${Date.now()}`,
          stayId: stay.id,
          roomNumber: room.roomNumber,
          description: `Prolongation +${additionalNights} Nuitée(s) supplémentaire(s) — Chambre ${room.roomNumber}`,
          category: "HEBERGEMENT",
          amount: addedCost,
          isPaid: false,
          createdBy: user.id,
          createdAt: nowIso,
        };

        set((prev) => ({
          stays: prev.stays.map((s) =>
            s.id === stay.id
              ? {
                ...s,
                nightsCount: s.nightsCount + additionalNights,
                expectedCheckOut: nextExpectedOut,
              }
              : s
          ),
          folioItems: [...prev.folioItems, extraLine],
        }));

        get().enqueueSyncOperation("stays", "UPDATE", {
          id: stay.id,
          nightsCount: stay.nightsCount + additionalNights,
        });
      },

      simulatePassageNearExpiry: (roomId, expiredNow = false) => {
        const state = get();
        const room = state.rooms.find((r) => r.id === roomId);
        if (!room || !room.currentStayId) return;
        const targetTime = expiredNow
          ? new Date(Date.now() - 10 * 1000).toISOString()
          : new Date(Date.now() + 8 * 60 * 1000 + 15 * 1000).toISOString(); // 08m 15s restantes (Alerte Rouge)

        set((prev) => ({
          stays: prev.stays.map((s) =>
            s.id === room.currentStayId
              ? { ...s, expectedCheckOut: targetTime }
              : s
          ),
        }));
      },

      checkoutRoom: ({ roomId, paymentMethod }) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const room = state.rooms.find((r) => r.id === roomId);
        if (!room || !room.currentStayId) {
          return { success: false };
        }
        const stay = state.stays.find((s) => s.id === room.currentStayId);
        if (!stay) {
          return { success: false };
        }

        const nowIso = new Date().toISOString();
        const currentFolioLines = state.folioItems.filter(
          (f) => f.stayId === stay.id
        );
        const totalCharges = currentFolioLines
          .filter((f) => f.amount > 0)
          .reduce((sum, f) => sum + f.amount, 0);
        const remainingBalance = Math.max(
          0,
          currentFolioLines.reduce((sum, f) => sum + f.amount, 0)
        );

        const receiptRef = `REC-RHR-CH${room.roomNumber}-${String(
          state.transactions.length + 1
        ).padStart(3, "0")}`;

        const finalFolioAdditions: RoomFolioItem[] = [];
        const newTransactions: Transaction[] = [];

        if (remainingBalance > 0) {
          finalFolioAdditions.push({
            id: `folio-chk-${Date.now()}`,
            stayId: stay.id,
            roomNumber: room.roomNumber,
            description: `Solde Check-Out réglé (${paymentMethod.replace(
              /_/g,
              " "
            )}) — ${receiptRef}`,
            category: "ACOMPTE",
            amount: -remainingBalance,
            isPaid: true,
            createdBy: user.id,
            createdAt: nowIso,
          });

          newTransactions.push({
            id: `tx-chk-${Date.now()}`,
            reference: receiptRef,
            type: "ENCAISSEMENT",
            pole: "HOTEL",
            vault:
              paymentMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod,
            amount: remainingBalance,
            description: `Solde Check-Out Chambre ${room.roomNumber} (Hébergement + Conso Bar/Resto) — ${stay.guestName}`,
            relatedEntityId: stay.id,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          });
        }

        const completedStay: Stay = {
          ...stay,
          status: "TERMINE",
          actualCheckOut: nowIso,
        };

        const updatedRoom: Room = {
          ...room,
          status: "A_NETTOYER",
          currentStayId: undefined,
          updatedBy: user.id,
          updatedAt: nowIso,
        };

        set((prev) => ({
          rooms: prev.rooms.map((r) => (r.id === room.id ? updatedRoom : r)),
          stays: prev.stays.map((s) => (s.id === stay.id ? completedStay : s)),
          folioItems: [
            ...prev.folioItems.map((f) =>
              f.stayId === stay.id ? { ...f, isPaid: true } : f
            ),
            ...finalFolioAdditions,
          ],
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("stays", "UPDATE", {
          id: stay.id,
          status: "TERMINE",
          actualCheckOut: nowIso,
          paidAtCheckout: remainingBalance,
        });

        return {
          success: true,
          stay: completedStay,
          room: updatedRoom,
          folioLines: [...currentFolioLines, ...finalFolioAdditions],
          paidNowAmount: remainingBalance,
          totalStayCost: totalCharges,
          receiptRef,
        };
      },

      markRoomClean: (roomId) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const nowIso = new Date().toISOString();

        set((prev) => ({
          rooms: prev.rooms.map((r) =>
            r.id === roomId
              ? {
                ...r,
                status: "LIBRE",
                currentStayId: undefined,
                updatedBy: user.id,
                updatedAt: nowIso,
              }
              : r
          ),
        }));

        get().enqueueSyncOperation("rooms", "UPDATE", {
          id: roomId,
          status: "LIBRE",
        });
      },

      addHotelExpense: (input) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const effectiveDateIso = input.operationDateIso
          ? new Date(input.operationDateIso).toISOString()
          : new Date().toISOString();
        const cleanAmount = Math.max(1, Math.round(input.amount));

        const tx: Transaction = {
          id: `tx-dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reference: `DEP-${String(state.transactions.length + 1).padStart(
            3,
            "0"
          )}`,
          type: "DEPENSE",
          pole: input.pole || "MAINTENANCE",
          vault:
            input.paymentMethod === "ESPECES"
              ? "CAISSE_ESPECES"
              : "CAISSE_MOBILE_MONEY",
          paymentMethod: input.paymentMethod,
          expenseFundSource: input.fundSource,
          amount: cleanAmount,
          description: `[${input.categoryLabel}] ${input.description.trim()}`,
          receiptPhotoUrl: input.receiptPhotoUrl,
          createdBy: user.id,
          createdByName: user.fullName,
          createdAt: effectiveDateIso,
        };

        set((prev) => ({
          transactions: [tx, ...prev.transactions],
        }));

        get().enqueueSyncOperation("transactions", "INSERT", {
          id: tx.id,
          reference: tx.reference,
          type: tx.type,
          pole: tx.pole,
          vault: tx.vault,
          paymentMethod: tx.paymentMethod,
          amount: tx.amount,
          fundSource: tx.expenseFundSource,
          description: tx.description,
          createdBy: tx.createdBy,
          createdByName: tx.createdByName,
          createdAt: tx.createdAt,
        });

        return tx;
      },

      applyRoomDiscount: ({ stayId, discountAmount, discountReason }) => {
        const state = get();
        const stay = state.stays.find((s) => s.id === stayId);
        if (!stay) {
          return { success: false, error: "Séjour introuvable." };
        }
        const room = state.rooms.find((r) => r.id === stay.roomId);
        if (!room) {
          return { success: false, error: "Chambre introuvable." };
        }
        if (room.roomNumber > 3) {
          return {
            success: false,
            error: "Les réductions sont réservées aux Chambres 1 à 3.",
          };
        }
        if (stay.stayType === "PASSAGE_3H") {
          return {
            success: false,
            error: "Pas de réduction applicable sur un passage 3H.",
          };
        }

        const grossCost = room.nightPrice * Math.max(1, stay.nightsCount);
        const cleanDiscount = Math.min(
          grossCost,
          Math.max(0, Math.round(discountAmount || 0))
        );
        const netCost = Math.max(0, grossCost - cleanDiscount);
        const cleanReason = discountReason?.trim() || undefined;

        const baseDescription = `${stay.nightsCount} Nuitée(s) — ${room.name} (${room.nightPrice.toLocaleString("fr-FR")} F/nuit)`;
        const updatedDescription =
          cleanDiscount > 0
            ? `${baseDescription} — Réduction accordée : -${cleanDiscount.toLocaleString("fr-FR")} F${cleanReason ? ` (${cleanReason})` : ""}`
            : baseDescription;

        const updatedStay: Stay = {
          ...stay,
          discountAmount: cleanDiscount > 0 ? cleanDiscount : undefined,
          discountReason: cleanDiscount > 0 ? cleanReason : undefined,
        };

        set((prev) => ({
          stays: prev.stays.map((s) => (s.id === stay.id ? updatedStay : s)),
          folioItems: prev.folioItems.map((f) =>
            f.stayId === stay.id && f.category === "HEBERGEMENT"
              ? {
                ...f,
                amount: netCost,
                description: updatedDescription,
              }
              : f
          ),
        }));

        get().enqueueSyncOperation("stays", "UPDATE", {
          id: stay.id,
          discountAmount: cleanDiscount,
          discountReason: cleanReason,
          netCost,
        });

        return {
          success: true,
          stay: updatedStay,
          newTotalCharges: netCost,
        };
      },

      recordHistoricalHotelOperation: (input) => {
        const state = get();
        const gerantUser =
          state.users.find((u) => u.role === "GERANT_HOTEL") ||
          state.currentUser ||
          state.users[2];

        const parsedDate = input.operationDateIso
          ? new Date(
            input.operationDateIso.includes("T")
              ? input.operationDateIso
              : `${input.operationDateIso}T12:00:00`
          )
          : new Date();
        const dateIso = isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();

        if (input.operationType === "SEJOUR_CHAMBRE") {
          const roomNum = input.roomNumber || 1;
          const room =
            state.rooms.find((r) => r.roomNumber === roomNum) || state.rooms[0];
          const stayType: Stay["stayType"] =
            input.stayType === "PASSAGE_3H" && room.allowPassage3h
              ? "PASSAGE_3H"
              : "NUITEE";
          const nights =
            stayType === "PASSAGE_3H" ? 1 : Math.max(1, input.nightsCount || 1);

          const grossCost =
            stayType === "PASSAGE_3H"
              ? room.passagePrice
              : room.nightPrice * nights;

          const cleanDiscount =
            room.roomNumber <= 3 && stayType !== "PASSAGE_3H"
              ? Math.min(
                grossCost,
                Math.max(0, Math.round(input.discountAmount || 0))
              )
              : 0;
          const netAmount =
            typeof input.amount === "number" && input.amount > 0
              ? Math.max(0, Math.round(input.amount))
              : Math.max(0, grossCost - cleanDiscount);

          const stayId = `stay-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const guestName = input.guestName?.trim() || "Client Hôtel RHR";
          const guestPhone = input.guestPhone?.trim() || "+225 07 00 00 00 00";
          const discountReason = input.discountReason?.trim() || undefined;

          const stayObj: Stay = {
            id: stayId,
            roomId: room.id,
            roomNumber: room.roomNumber,
            guestName,
            guestPhone,
            stayType,
            status: "TERMINE",
            checkIn: dateIso,
            expectedCheckOut: dateIso,
            actualCheckOut: dateIso,
            nightsCount: nights,
            baseRate:
              stayType === "PASSAGE_3H" ? room.passagePrice : room.nightPrice,
            discountAmount: cleanDiscount > 0 ? cleanDiscount : undefined,
            discountReason: cleanDiscount > 0 ? discountReason : undefined,
            depositAmount: netAmount,
            depositMethod: input.paymentMethod,
            notes:
              input.description?.trim() ||
              "Opération enregistrée dans l'historique Gérant Hôtel",
            createdBy: gerantUser.id,
            createdAt: dateIso,
          };

          const baseDesc =
            stayType === "PASSAGE_3H"
              ? `Passage 3H — ${room.name} (${guestName})`
              : `${nights} Nuitée(s) — ${room.name} (${guestName})`;
          const fullDesc =
            cleanDiscount > 0
              ? `${baseDesc} — Réduction Ch.${room.roomNumber} : -${cleanDiscount.toLocaleString("fr-FR")} F${discountReason ? ` (${discountReason})` : ""}`
              : baseDesc;

          const folioLine: RoomFolioItem = {
            id: `fol-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            stayId,
            roomNumber: room.roomNumber,
            description: fullDesc,
            category: "HEBERGEMENT",
            amount: netAmount,
            isPaid: true,
            createdAt: dateIso,
            createdBy: gerantUser.id,
          };

          const tx: Transaction = {
            id: `tx-hist-htl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            reference: `HTL-${String(state.transactions.length + 1).padStart(3, "0")}`,
            type: "ENCAISSEMENT",
            pole: "HOTEL",
            vault:
              input.paymentMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.paymentMethod,
            amount: netAmount,
            grossAmount: grossCost,
            discountAmount: cleanDiscount,
            dailyReportRow: `CHAMBRE_${room.roomNumber}` as DailyReportRowKey,
            observation:
              discountReason ||
              input.description?.trim() ||
              `${guestName} (${stayType === "PASSAGE_3H" ? "Passage 3H" : `${nights} nuit(s)`})`,
            description: `${fullDesc}${input.description?.trim() ? ` · ${input.description.trim()}` : ""}`,
            relatedEntityId: stayId,
            createdBy: gerantUser.id,
            createdByName: gerantUser.fullName,
            createdAt: dateIso,
          };

          set((prev) => ({
            stays: [stayObj, ...prev.stays],
            folioItems: [folioLine, ...prev.folioItems],
            transactions: [tx, ...prev.transactions],
          }));

          get().enqueueSyncOperation("stays", "INSERT", {
            id: stayObj.id,
            roomId: stayObj.roomId,
            guestName: stayObj.guestName,
            guestPhone: stayObj.guestPhone,
            stayType: stayObj.stayType,
            status: stayObj.status,
            checkIn: stayObj.checkIn,
            expectedCheckOut: stayObj.expectedCheckOut,
            actualCheckOut: stayObj.actualCheckOut,
            nightsCount: stayObj.nightsCount,
            depositAmount: stayObj.depositAmount,
            depositMethod: stayObj.depositMethod,
            createdBy: stayObj.createdBy,
            notes: stayObj.notes,
          });

          get().enqueueSyncOperation("transactions", "INSERT", {
            id: tx.id,
            reference: tx.reference,
            type: tx.type,
            pole: tx.pole,
            vault: tx.vault,
            paymentMethod: tx.paymentMethod,
            amount: tx.amount,
            description: tx.description,
            relatedEntityId: tx.relatedEntityId,
            createdBy: tx.createdBy,
            createdByName: tx.createdByName,
            createdAt: tx.createdAt,
          });

          return {
            success: true,
            transaction: tx,
            stay: stayObj,
          };
        } else {
          // DEPENSE_HOTEL
          const cleanAmount = Math.max(1, Math.round(input.amount || 0));
          const catLabel = input.expenseCategory || "Entretien & Charges Hôtel";
          const descText =
            input.description?.trim() || "Dépense opérationnelle Gérant Hôtel";

          const tx: Transaction = {
            id: `tx-hist-dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            reference: `DEP-${String(state.transactions.length + 1).padStart(3, "0")}`,
            type: "DEPENSE",
            pole: "MAINTENANCE",
            vault:
              input.paymentMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.paymentMethod,
            expenseFundSource: input.expenseFundSource || "CAISSE_DU_JOUR",
            amount: cleanAmount,
            description: `[${catLabel}] ${descText}`,
            createdBy: gerantUser.id,
            createdByName: gerantUser.fullName,
            createdAt: dateIso,
          };

          set((prev) => ({
            transactions: [tx, ...prev.transactions],
          }));

          get().enqueueSyncOperation("transactions", "INSERT", {
            id: tx.id,
            reference: tx.reference,
            type: tx.type,
            pole: tx.pole,
            vault: tx.vault,
            paymentMethod: tx.paymentMethod,
            amount: tx.amount,
            fundSource: tx.expenseFundSource,
            description: tx.description,
            createdBy: tx.createdBy,
            createdByName: tx.createdByName,
            createdAt: tx.createdAt,
          });

          return {
            success: true,
            transaction: tx,
          };
        }
      },

      deleteHotelTransaction: (transactionId) => {
        const state = get();
        const targetTx = state.transactions.find((t) => t.id === transactionId);
        if (!targetTx) return;

        const relatedStayId = targetTx.relatedEntityId;
        set((prev) => ({
          transactions: prev.transactions.filter((t) => t.id !== transactionId),
          stays: relatedStayId
            ? prev.stays.filter(
              (s) => !(s.id === relatedStayId && s.id.startsWith("stay-hist-"))
            )
            : prev.stays,
          folioItems: relatedStayId
            ? prev.folioItems.filter(
              (f) => !(f.stayId === relatedStayId && f.id.startsWith("fol-hist-"))
            )
            : prev.folioItems,
        }));

        get().enqueueSyncOperation("transactions", "DELETE", {
          id: transactionId,
        });
        if (relatedStayId && relatedStayId.startsWith("stay-hist-")) {
          get().enqueueSyncOperation("stays", "DELETE", {
            id: relatedStayId,
          });
        }
      },

      // =======================================================================
      // ACTIONS PÔLE POS BAR & RESTO, STOCKS INVIOLABLES & MENU QR (SPRINT 3)
      // =======================================================================

      createPosOrder: (input) => {
        const state = get();
        const user = state.currentUser || state.users[3]; // Caissière fallback
        const waitress = state.waitresses.find(
          (w) => w.id === input.waitressId
        );
        if (!waitress) {
          return {
            success: false,
            error:
              "Sélection de la serveuse obligatoire avant de valider la commande.",
          };
        }
        if (input.items.length === 0) {
          return { success: false, error: "Le panier de commande est vide." };
        }

        // Vérification stricte des stocks (Boissons Bar & Produits Phares Cuisine)
        const coreDeductions: Record<string, number> = {};
        const directBarDeductions: Record<string, number> = {};

        for (const line of input.items) {
          const invItem = state.inventory.find((i) => i.id === line.itemId);
          if (!invItem) {
            return {
              success: false,
              error: `Produit introuvable : ${line.name}`,
            };
          }
          if (invItem.pole === "PLAT_MENU" && invItem.linkedCoreIngredientId) {
            const coreId = invItem.linkedCoreIngredientId;
            const needed =
              (invItem.linkedCoreIngredientQty || 1) * line.quantity;
            coreDeductions[coreId] = (coreDeductions[coreId] || 0) + needed;
          } else {
            directBarDeductions[invItem.id] =
              (directBarDeductions[invItem.id] || 0) + line.quantity;
          }
        }

        for (const [coreId, neededQty] of Object.entries(coreDeductions)) {
          const coreItem = state.inventory.find((i) => i.id === coreId);
          if (!coreItem || coreItem.stockQuantity < neededQty) {
            return {
              success: false,
              error: `Stock insuffisant pour ${coreItem?.name || "Produit Phare"
                } (Disponible : ${coreItem?.stockQuantity || 0
                }, Requis : ${neededQty}). Vente bloquée.`,
            };
          }
        }

        for (const [barId, neededQty] of Object.entries(directBarDeductions)) {
          const barItem = state.inventory.find((i) => i.id === barId);
          if (!barItem || barItem.stockQuantity < neededQty) {
            return {
              success: false,
              error: `Rupture / Stock insuffisant pour ${barItem?.name || "Boisson"
                } (Disponible : ${barItem?.stockQuantity || 0
                }, Requis : ${neededQty}). Vente bloquée.`,
            };
          }
        }

        // Vérification de la chambre occupée si Transfert sur Chambre
        let targetRoom: Room | undefined;
        let targetStay: Stay | undefined;
        if (input.paymentMode === "TRANSFERT_CHAMBRE") {
          targetRoom = state.rooms.find(
            (r) =>
              r.roomNumber === input.transferredToRoomNumber &&
              (r.status === "OCCUPEE_NUITEE" ||
                r.status === "OCCUPEE_PASSAGE_3H")
          );
          if (!targetRoom || !targetRoom.currentStayId) {
            return {
              success: false,
              error:
                "Veuillez sélectionner une chambre actuellement occupée pour le transfert de note.",
            };
          }
          targetStay = state.stays.find(
            (s) => s.id === targetRoom?.currentStayId
          );
        }

        const nowIso = new Date().toISOString();
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.subtotal,
          0
        );
        const orderNumber = `CMD-${101 + state.posOrders.length}`;
        const orderId = `ord-${Date.now()}`;

        const newOrder: PosOrder = {
          id: orderId,
          orderNumber,
          source: "COMPTOIR_POS",
          tableOrRoomLabel:
            input.paymentMode === "TRANSFERT_CHAMBRE" && targetRoom
              ? `Chambre ${targetRoom.roomNumber} (${targetStay?.guestName || "Client"
              })`
              : input.tableOrRoomLabel || "Comptoir / Terrasse",
          waitressId: waitress.id,
          waitressName: waitress.name,
          items: input.items,
          totalAmount,
          paymentMode: input.paymentMode,
          transferredToRoomNumber: targetRoom?.roomNumber,
          transferredToStayId: targetStay?.id,
          status:
            input.paymentMode === "TRANSFERT_CHAMBRE"
              ? "TRANSFEREE_CHAMBRE"
              : "PAYEE",
          createdBy: user.id,
          createdAt: nowIso,
        };

        // Mise à jour atomique de l'inventaire (Produits Phares + Plats liés + Boissons Bar)
        const updatedInventory = state.inventory.map((item) => {
          if (coreDeductions[item.id]) {
            return {
              ...item,
              stockQuantity: Math.max(
                0,
                item.stockQuantity - coreDeductions[item.id]
              ),
              updatedBy: user.id,
              updatedAt: nowIso,
            };
          }
          if (directBarDeductions[item.id]) {
            return {
              ...item,
              stockQuantity: Math.max(
                0,
                item.stockQuantity - directBarDeductions[item.id]
              ),
              updatedBy: user.id,
              updatedAt: nowIso,
            };
          }
          return item;
        });

        // Synchroniser la quantité affichée sur chaque PLAT_MENU avec son Produit Phare
        const syncedInventory = updatedInventory.map((item) => {
          if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
            const linkedCore = updatedInventory.find(
              (c) => c.id === item.linkedCoreIngredientId
            );
            if (linkedCore) {
              return { ...item, stockQuantity: linkedCore.stockQuantity };
            }
          }
          return item;
        });

        const newFolioItems: RoomFolioItem[] = [];
        const newTransactions: Transaction[] = [];

        if (
          input.paymentMode === "TRANSFERT_CHAMBRE" &&
          targetRoom &&
          targetStay
        ) {
          const summaryText = input.items
            .map((i) => `${i.quantity}x ${i.name}`)
            .join(", ");
          newFolioItems.push({
            id: `folio-pos-${Date.now()}`,
            stayId: targetStay.id,
            roomNumber: targetRoom.roomNumber,
            description: `Transfert Bar/Resto #${orderNumber} (${summaryText}) — Serveuse ${waitress.name}`,
            category: "BAR_RESTO",
            amount: totalAmount,
            isPaid: false,
            posOrderId: orderId,
            createdBy: user.id,
            createdAt: nowIso,
          });
        } else if (input.paymentMode !== "TRANSFERT_CHAMBRE") {
          newTransactions.push({
            id: `tx-pos-${Date.now()}`,
            reference: `ENC-POS-${orderNumber}`,
            type: "ENCAISSEMENT",
            pole: "BAR_RESTO",
            vault:
              input.paymentMode === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.paymentMode,
            amount: totalAmount,
            description: `Commande #${orderNumber} (${newOrder.tableOrRoomLabel} — Serveuse ${waitress.name})`,
            relatedEntityId: orderId,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          });
        }

        set((prev) => ({
          inventory: syncedInventory,
          posOrders: [newOrder, ...prev.posOrders],
          waitresses: prev.waitresses.map((w) =>
            w.id === waitress.id
              ? {
                ...w,
                totalSalesAmount: w.totalSalesAmount + totalAmount,
                ordersCount: w.ordersCount + 1,
              }
              : w
          ),
          folioItems: [...prev.folioItems, ...newFolioItems],
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("pos_orders", "INSERT", {
          id: orderId,
          orderNumber,
          waitressName: waitress.name,
          totalAmount,
          paymentMode: input.paymentMode,
        });

        return { success: true, order: newOrder };
      },

      submitQrCustomerOrder: (input) => {
        const state = get();
        if (input.items.length === 0) {
          return { success: false, error: "Votre panier est vide." };
        }
        const nowIso = new Date().toISOString();
        const totalAmount = input.items.reduce((s, i) => s + i.subtotal, 0);
        const orderNumber = `CMD-QR-${101 + state.posOrders.length}`;
        const orderId = `ord-qr-${Date.now()}`;

        const newOrder: PosOrder = {
          id: orderId,
          orderNumber,
          source: input.locationType === "CHAMBRE" ? "QR_CHAMBRE" : "QR_TABLE",
          tableOrRoomLabel: `${input.locationLabel} — Client ${input.guestFirstName.trim() || "RHR"
            }`,
          waitressId: state.waitresses[0]?.id || "wait-awa",
          waitressName: "À attribuer (QR)",
          items: input.items,
          totalAmount,
          paymentMode: "EN_ATTENTE_QR",
          status: "NOUVELLE_QR",
          createdBy: state.currentUser?.id || "usr-client-05",
          createdAt: nowIso,
        };

        set((prev) => ({
          posOrders: [newOrder, ...prev.posOrders],
        }));

        get().enqueueSyncOperation("pos_orders", "INSERT", {
          id: orderId,
          orderNumber,
          source: newOrder.source,
          tableOrRoomLabel: newOrder.tableOrRoomLabel,
          totalAmount,
        });

        return { success: true, order: newOrder };
      },

      processIncomingQrOrder: (input) => {
        const state = get();
        const user = state.currentUser || state.users[3];
        const qrOrder = state.posOrders.find((o) => o.id === input.orderId);
        if (!qrOrder) {
          return { success: false, error: "Commande QR introuvable." };
        }
        const waitress = state.waitresses.find(
          (w) => w.id === input.waitressId
        );
        if (!waitress) {
          return {
            success: false,
            error: "Veuillez assigner une serveuse à cette commande QR.",
          };
        }

        // Vérification & Décrémentation du stock lors de la validation caisse
        const coreDeductions: Record<string, number> = {};
        const directBarDeductions: Record<string, number> = {};

        for (const line of qrOrder.items) {
          const invItem = state.inventory.find((i) => i.id === line.itemId);
          if (!invItem) continue;
          if (invItem.pole === "PLAT_MENU" && invItem.linkedCoreIngredientId) {
            const coreId = invItem.linkedCoreIngredientId;
            coreDeductions[coreId] =
              (coreDeductions[coreId] || 0) +
              (invItem.linkedCoreIngredientQty || 1) * line.quantity;
          } else {
            directBarDeductions[invItem.id] =
              (directBarDeductions[invItem.id] || 0) + line.quantity;
          }
        }

        for (const [coreId, neededQty] of Object.entries(coreDeductions)) {
          const coreItem = state.inventory.find((i) => i.id === coreId);
          if (!coreItem || coreItem.stockQuantity < neededQty) {
            return {
              success: false,
              error: `Stock insuffisant pour ${coreItem?.name} (Dispo: ${coreItem?.stockQuantity || 0
                }).`,
            };
          }
        }

        for (const [barId, neededQty] of Object.entries(directBarDeductions)) {
          const barItem = state.inventory.find((i) => i.id === barId);
          if (!barItem || barItem.stockQuantity < neededQty) {
            return {
              success: false,
              error: `Stock insuffisant pour ${barItem?.name} (Dispo: ${barItem?.stockQuantity || 0
                }).`,
            };
          }
        }

        let targetRoom: Room | undefined;
        let targetStay: Stay | undefined;
        if (input.paymentMode === "TRANSFERT_CHAMBRE") {
          targetRoom = state.rooms.find(
            (r) =>
              r.roomNumber === input.transferredToRoomNumber &&
              (r.status === "OCCUPEE_NUITEE" ||
                r.status === "OCCUPEE_PASSAGE_3H")
          );
          if (!targetRoom || !targetRoom.currentStayId) {
            return {
              success: false,
              error:
                "Veuillez choisir une chambre occupée valide pour le transfert.",
            };
          }
          targetStay = state.stays.find(
            (s) => s.id === targetRoom?.currentStayId
          );
        }

        const nowIso = new Date().toISOString();

        const updatedInventory = state.inventory.map((item) => {
          if (coreDeductions[item.id]) {
            return {
              ...item,
              stockQuantity: Math.max(
                0,
                item.stockQuantity - coreDeductions[item.id]
              ),
              updatedBy: user.id,
              updatedAt: nowIso,
            };
          }
          if (directBarDeductions[item.id]) {
            return {
              ...item,
              stockQuantity: Math.max(
                0,
                item.stockQuantity - directBarDeductions[item.id]
              ),
              updatedBy: user.id,
              updatedAt: nowIso,
            };
          }
          return item;
        });

        const syncedInventory = updatedInventory.map((item) => {
          if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
            const linkedCore = updatedInventory.find(
              (c) => c.id === item.linkedCoreIngredientId
            );
            if (linkedCore) {
              return { ...item, stockQuantity: linkedCore.stockQuantity };
            }
          }
          return item;
        });

        const updatedOrder: PosOrder = {
          ...qrOrder,
          waitressId: waitress.id,
          waitressName: waitress.name,
          paymentMode: input.paymentMode,
          transferredToRoomNumber: targetRoom?.roomNumber,
          transferredToStayId: targetStay?.id,
          status:
            input.paymentMode === "TRANSFERT_CHAMBRE"
              ? "TRANSFEREE_CHAMBRE"
              : "PAYEE",
        };

        const newFolioItems: RoomFolioItem[] = [];
        const newTransactions: Transaction[] = [];

        if (
          input.paymentMode === "TRANSFERT_CHAMBRE" &&
          targetRoom &&
          targetStay
        ) {
          const summaryText = qrOrder.items
            .map((i) => `${i.quantity}x ${i.name}`)
            .join(", ");
          newFolioItems.push({
            id: `folio-qr-${Date.now()}`,
            stayId: targetStay.id,
            roomNumber: targetRoom.roomNumber,
            description: `Commande QR #${qrOrder.orderNumber} (${summaryText}) — Serveuse ${waitress.name}`,
            category: "BAR_RESTO",
            amount: qrOrder.totalAmount,
            isPaid: false,
            posOrderId: qrOrder.id,
            createdBy: user.id,
            createdAt: nowIso,
          });
        } else if (input.paymentMode !== "TRANSFERT_CHAMBRE") {
          newTransactions.push({
            id: `tx-qr-${Date.now()}`,
            reference: `ENC-${qrOrder.orderNumber}`,
            type: "ENCAISSEMENT",
            pole: "BAR_RESTO",
            vault:
              input.paymentMode === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.paymentMode,
            amount: qrOrder.totalAmount,
            description: `Commande QR #${qrOrder.orderNumber} (${qrOrder.tableOrRoomLabel} — Serveuse ${waitress.name})`,
            relatedEntityId: qrOrder.id,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          });
        }

        set((prev) => ({
          inventory: syncedInventory,
          posOrders: prev.posOrders.map((o) =>
            o.id === qrOrder.id ? updatedOrder : o
          ),
          waitresses: prev.waitresses.map((w) =>
            w.id === waitress.id
              ? {
                ...w,
                totalSalesAmount: w.totalSalesAmount + qrOrder.totalAmount,
                ordersCount: w.ordersCount + 1,
              }
              : w
          ),
          folioItems: [...prev.folioItems, ...newFolioItems],
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("pos_orders", "UPDATE", {
          id: qrOrder.id,
          status: updatedOrder.status,
          waitressName: waitress.name,
        });

        return { success: true, order: updatedOrder };
      },

      cancelQrOrder: (orderId) => {
        set((prev) => ({
          posOrders: prev.posOrders.map((o) =>
            o.id === orderId ? { ...o, status: "ANNULEE" } : o
          ),
        }));
      },

      ingestRemoteQrOrders: (orders) => {
        if (!Array.isArray(orders) || orders.length === 0) return;
        set((prev) => {
          const existingIds = new Set(prev.posOrders.map((o) => o.id));
          const newOnes = orders.filter(
            (o) => o && o.id && !existingIds.has(o.id)
          );
          if (newOnes.length === 0) return prev;
          return {
            posOrders: [...newOnes, ...prev.posOrders],
          };
        });
      },

      syncCatalogSnapshot: (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        set({ inventory: items });
      },

      restockInventoryItem: ({
        itemId,
        addedQuantity,
        recordMarketExpense,
        expenseCost,
        paymentMethod = "ESPECES",
        fundSource = "CAISSE_DU_JOUR",
      }) => {
        const state = get();
        const user = state.currentUser || state.users[0];
        const nowIso = new Date().toISOString();
        const qty = Math.max(1, Math.round(addedQuantity));

        const targetItem = state.inventory.find((i) => i.id === itemId);
        if (!targetItem) return;

        const updatedInventory = state.inventory.map((item) =>
          item.id === itemId
            ? {
              ...item,
              stockQuantity: item.stockQuantity + qty,
              updatedBy: user.id,
              updatedAt: nowIso,
            }
            : item
        );

        const syncedInventory = updatedInventory.map((item) => {
          if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
            const linkedCore = updatedInventory.find(
              (c) => c.id === item.linkedCoreIngredientId
            );
            if (linkedCore) {
              return { ...item, stockQuantity: linkedCore.stockQuantity };
            }
          }
          return item;
        });

        const newTransactions: Transaction[] = [];
        if (recordMarketExpense && expenseCost && expenseCost > 0) {
          newTransactions.push({
            id: `tx-restock-${Date.now()}`,
            reference: `DEP-APP-${String(
              state.transactions.length + 1
            ).padStart(3, "0")}`,
            type: "DEPENSE",
            pole:
              targetItem.pole === "BAR_BOISSON"
                ? "BAR_RESTO"
                : "MARCHE_CUISINE",
            vault:
              paymentMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod,
            expenseFundSource: fundSource,
            amount: Math.round(expenseCost),
            description: `Approvisionnement Stock (+${qty} ${targetItem.unit}) : ${targetItem.name}`,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          });
        }

        set((prev) => ({
          inventory: syncedInventory,
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("inventory_items", "UPDATE", {
          id: itemId,
          addedQuantity: qty,
        });
      },

      setItemStockZeroDemo: (itemId) => {
        const state = get();
        const nowIso = new Date().toISOString();
        const updatedInventory = state.inventory.map((item) =>
          item.id === itemId
            ? { ...item, stockQuantity: 0, updatedAt: nowIso }
            : item
        );

        const syncedInventory = updatedInventory.map((item) => {
          if (item.pole === "PLAT_MENU" && item.linkedCoreIngredientId) {
            const linkedCore = updatedInventory.find(
              (c) => c.id === item.linkedCoreIngredientId
            );
            if (linkedCore) {
              return { ...item, stockQuantity: linkedCore.stockQuantity };
            }
          }
          return item;
        });

        set({ inventory: syncedInventory });
      },

      // =======================================================================
      // ACTIONS SPRINT 4 : CÉRÉMONIES, CLÔTURES DE CAISSE & CHARGES FIXES
      // =======================================================================

      createCeremonyBooking: (input) => {
        const state = get();
        const user = state.currentUser || state.users[3] || state.users[0];
        const parsedOpDate = input.operationDateIso
          ? new Date(
            input.operationDateIso.includes("T")
              ? input.operationDateIso
              : `${input.operationDateIso}T12:00:00`
          )
          : new Date();
        const nowIso = isNaN(parsedOpDate.getTime())
          ? new Date().toISOString()
          : parsedOpDate.toISOString();

        const baseRentalFee = 50000; // Loi absolue SPEC.md : 50 000 F (inclut 50 couverts)
        const ordCovers = Math.max(0, Math.round(input.extraOrdinaryCovers));
        const vipCovers = Math.max(0, Math.round(input.extraVipCovers));
        const guestsCount = 50 + ordCovers + vipCovers;

        const cateringTotal = input.customCateringLines.reduce(
          (s, l) => s + l.subtotal,
          0
        );
        const beverageTotal = input.customBeverageLines.reduce(
          (s, l) => s + l.subtotal,
          0
        );

        const grossTotalAmount =
          baseRentalFee +
          ordCovers * 1000 +
          vipCovers * 1500 +
          cateringTotal +
          beverageTotal;

        const cleanDiscount = Math.min(
          grossTotalAmount,
          Math.max(0, Math.round(input.discountAmount || 0))
        );
        const totalAmount = Math.max(0, grossTotalAmount - cleanDiscount);

        const initDeposit = Math.max(0, Math.round(input.initialDepositAmount));
        const reference = `DEV-RHR-2026-0${state.ceremonies.length + 1}`;
        const cerId = `cer-${Date.now()}`;

        const deposits: CeremonyDeposit[] =
          initDeposit > 0
            ? [
              {
                id: `dep-cer-${Date.now()}`,
                amount: initDeposit,
                method: input.initialDepositMethod,
                paidAt: nowIso,
                receivedBy: user.fullName,
                note: "1er Acompte à la création du Devis/Réservation",
              },
            ]
            : [];

        const status: CeremonyBooking["status"] =
          initDeposit >= totalAmount
            ? "SOLDE"
            : initDeposit > 0
              ? "CONFIRME_ACOMPTE"
              : "DEVIS";

        const booking: CeremonyBooking = {
          id: cerId,
          reference,
          clientName: input.clientName.trim(),
          clientPhone: input.clientPhone.trim(),
          eventType: input.eventType,
          eventDate: input.eventDate,
          guestsCount,
          baseRentalFee,
          extraOrdinaryCovers: ordCovers,
          extraVipCovers: vipCovers,
          customCateringLines: input.customCateringLines,
          customBeverageLines: input.customBeverageLines,
          totalAmount,
          deposits,
          totalPaid: initDeposit,
          status,
          notes: input.notes?.trim() || undefined,
          createdBy: user.id,
          createdAt: nowIso,
        };

        const newTransactions: Transaction[] = [];
        if (initDeposit > 0) {
          const txObj: Transaction = {
            id: `tx-cer-${Date.now()}`,
            reference: `ENC-CER-0${state.transactions.length + 1}`,
            type: "ENCAISSEMENT",
            pole: "CEREMONIE",
            vault:
              input.initialDepositMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.initialDepositMethod,
            amount: initDeposit,
            grossAmount: initDeposit + cleanDiscount,
            discountAmount: cleanDiscount,
            dailyReportRow: "LOCATION_SALLE",
            observation:
              input.notes?.trim() ||
              `${input.eventType} — ${booking.clientName} (${guestsCount} couverts)`,
            description: `Location Salle / Cérémonie ${reference} (${input.eventType}) — ${booking.clientName}${cleanDiscount > 0 ? ` (Remise -${cleanDiscount.toLocaleString("fr-FR")} F)` : ""}`,
            relatedEntityId: cerId,
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: nowIso,
          };
          newTransactions.push(txObj);

          get().enqueueSyncOperation("transactions", "INSERT", {
            id: txObj.id,
            reference: txObj.reference,
            type: txObj.type,
            pole: txObj.pole,
            vault: txObj.vault,
            paymentMethod: txObj.paymentMethod,
            amount: txObj.amount,
            description: txObj.description,
            relatedEntityId: txObj.relatedEntityId,
            createdBy: txObj.createdBy,
            createdByName: txObj.createdByName,
            createdAt: txObj.createdAt,
          });
        }

        set((prev) => ({
          ceremonies: [booking, ...prev.ceremonies],
          transactions: [...newTransactions, ...prev.transactions],
        }));

        get().enqueueSyncOperation("ceremony_bookings", "INSERT", {
          id: cerId,
          reference,
          clientName: booking.clientName,
          totalAmount,
          totalPaid: initDeposit,
        });

        return booking;
      },

      addCeremonyDeposit: ({ ceremonyId, amount, method, operationDateIso, note }) => {
        const state = get();
        const user = state.currentUser || state.users[3] || state.users[0];
        const target = state.ceremonies.find((c) => c.id === ceremonyId);
        if (!target || amount <= 0) return null;

        const parsedDate = operationDateIso
          ? new Date(
            operationDateIso.includes("T")
              ? operationDateIso
              : `${operationDateIso}T12:00:00`
          )
          : new Date();
        const nowIso = isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();
        const cleanAmount = Math.round(amount);

        const newDep: CeremonyDeposit = {
          id: `dep-cer-${Date.now()}`,
          amount: cleanAmount,
          method,
          paidAt: nowIso,
          receivedBy: user.fullName,
          note: note?.trim() || `Acompte n°${target.deposits.length + 1}`,
        };

        const nextTotalPaid = target.totalPaid + cleanAmount;
        const nextStatus: CeremonyBooking["status"] =
          nextTotalPaid >= target.totalAmount ? "SOLDE" : "CONFIRME_ACOMPTE";

        const updatedBooking: CeremonyBooking = {
          ...target,
          deposits: [...target.deposits, newDep],
          totalPaid: nextTotalPaid,
          status: nextStatus,
        };

        const newTx: Transaction = {
          id: `tx-cer-dep-${Date.now()}`,
          reference: `ENC-CER-0${state.transactions.length + 1}`,
          type: "ENCAISSEMENT",
          pole: "CEREMONIE",
          vault:
            method === "ESPECES" ? "CAISSE_ESPECES" : "CAISSE_MOBILE_MONEY",
          paymentMethod: method,
          amount: cleanAmount,
          grossAmount: cleanAmount,
          discountAmount: 0,
          dailyReportRow: "LOCATION_SALLE",
          observation:
            note?.trim() ||
            `Versement ${target.eventType} — ${target.clientName}`,
          description: `Versement Acompte Cérémonie ${target.reference} — ${target.clientName}`,
          relatedEntityId: target.id,
          createdBy: user.id,
          createdByName: user.fullName,
          createdAt: nowIso,
        };

        set((prev) => ({
          ceremonies: prev.ceremonies.map((c) =>
            c.id === target.id ? updatedBooking : c
          ),
          transactions: [newTx, ...prev.transactions],
        }));

        get().enqueueSyncOperation("ceremony_bookings", "UPDATE", {
          id: target.id,
          totalPaid: nextTotalPaid,
          status: nextStatus,
        });

        get().enqueueSyncOperation("transactions", "INSERT", {
          id: newTx.id,
          reference: newTx.reference,
          type: newTx.type,
          pole: newTx.pole,
          vault: newTx.vault,
          paymentMethod: newTx.paymentMethod,
          amount: newTx.amount,
          description: newTx.description,
          relatedEntityId: newTx.relatedEntityId,
          createdBy: newTx.createdBy,
          createdByName: newTx.createdByName,
          createdAt: newTx.createdAt,
        });

        return updatedBooking;
      },

      recordGeneralDailyOperation: (input) => {
        const state = get();
        const user =
          state.currentUser ||
          state.users.find((u) => u.role === "CAISSIERE_BAR_RESTO") ||
          state.users[0];

        const parsedDate = input.operationDateIso
          ? new Date(
            input.operationDateIso.includes("T")
              ? input.operationDateIso
              : `${input.operationDateIso}T12:00:00`
          )
          : new Date();
        const dateIso = isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();

        const cleanGross = Math.max(0, Math.round(input.grossAmount || 0));
        const cleanDiscount = Math.min(
          cleanGross,
          Math.max(0, Math.round(input.discountAmount || 0))
        );
        const netAmount = Math.max(0, cleanGross - cleanDiscount);
        const obs = input.observation?.trim() || "";

        if (input.category === "DEPENSE") {
          const tx: Transaction = {
            id: `tx-day-dep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            reference: `DEP-${String(state.transactions.length + 1).padStart(3, "0")}`,
            type: "DEPENSE",
            pole: "MARCHE_CUISINE",
            vault:
              input.paymentMethod === "ESPECES"
                ? "CAISSE_ESPECES"
                : "CAISSE_MOBILE_MONEY",
            paymentMethod: input.paymentMethod,
            expenseFundSource: input.expenseFundSource || "CAISSE_DU_JOUR",
            amount: Math.max(1, cleanGross),
            grossAmount: Math.max(1, cleanGross),
            discountAmount: 0,
            observation: obs,
            description: obs || "Dépense de la journée",
            createdBy: user.id,
            createdByName: user.fullName,
            createdAt: dateIso,
          };

          set((prev) => ({
            transactions: [tx, ...prev.transactions],
          }));

          get().enqueueSyncOperation("transactions", "INSERT", {
            id: tx.id,
            reference: tx.reference,
            type: tx.type,
            pole: tx.pole,
            vault: tx.vault,
            paymentMethod: tx.paymentMethod,
            amount: tx.amount,
            fundSource: tx.expenseFundSource,
            description: tx.description,
            createdBy: tx.createdBy,
            createdByName: tx.createdByName,
            createdAt: tx.createdAt,
          });

          return { success: true, transaction: tx };
        }

        // Si c'est une Chambre (CHAMBRE_1 .. CHAMBRE_5)
        if (input.category.startsWith("CHAMBRE_")) {
          const roomNum = Number(input.category.replace("CHAMBRE_", "")) || 1;
          const res = get().recordHistoricalHotelOperation({
            operationType: "SEJOUR_CHAMBRE",
            operationDateIso: input.operationDateIso,
            roomNumber: roomNum,
            stayType: cleanGross === 5000 && roomNum >= 4 ? "PASSAGE_3H" : "NUITEE",
            nightsCount: 1,
            guestName: input.clientName || `Client Chambre ${roomNum}`,
            discountAmount: cleanDiscount,
            discountReason: obs,
            amount: netAmount,
            paymentMethod: input.paymentMethod,
            description: obs,
          });
          if (res.transaction) {
            return { success: true, transaction: res.transaction };
          }
        }

        // Location salle, Restauration, Bar, ou Autres
        const rowLabels: Record<DailyReportRowKey, string> = {
          CHAMBRE_1: "Chambre 1",
          CHAMBRE_2: "Chambre 2",
          CHAMBRE_3: "Chambre 3",
          CHAMBRE_4: "Chambre 4",
          CHAMBRE_5: "Chambre 5",
          LOCATION_SALLE: "Location salle de cérémonie",
          RESTAURATION: "Restauration",
          BAR: "Bar",
          AUTRES: "Autres recettes",
        };

        const pole: Transaction["pole"] =
          input.category === "LOCATION_SALLE" ? "CEREMONIE" : "BAR_RESTO";

        let relatedCeremonyId: string | undefined = undefined;
        let newCeremonyBooking: CeremonyBooking | null = null;

        if (input.category === "LOCATION_SALLE") {
          const cerId = `cer-hist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          relatedCeremonyId = cerId;
          const cName = input.clientName?.trim() || "Client Location Salle RHR";
          const evType = input.eventType || "MARIAGE";
          newCeremonyBooking = {
            id: cerId,
            reference: `SAL-${String(state.ceremonies.length + 1).padStart(3, "0")}`,
            clientName: cName,
            clientPhone: "+225 07 00 00 00 00",
            eventType: evType,
            eventDate: input.operationDateIso.slice(0, 10),
            guestsCount: 50,
            baseRentalFee: cleanGross || 50000,
            extraOrdinaryCovers: 0,
            extraVipCovers: 0,
            customCateringLines: [],
            customBeverageLines: [],
            totalAmount: netAmount,
            deposits: [
              {
                id: `dep-${cerId}`,
                amount: netAmount,
                method: input.paymentMethod,
                paidAt: dateIso,
                receivedBy: user.fullName,
                note: obs || "Règlement Location Salle",
              },
            ],
            totalPaid: netAmount,
            status: "SOLDE",
            notes: obs || undefined,
            createdBy: user.id,
            createdAt: dateIso,
          };
        }

        const labelBase = rowLabels[input.category as DailyReportRowKey] || "Recette";
        const fullDesc = `${labelBase}${input.clientName?.trim() ? ` (${input.clientName.trim()})` : ""}${cleanDiscount > 0 ? ` — Remise : -${cleanDiscount.toLocaleString("fr-FR")} F` : ""}${obs ? ` · ${obs}` : ""}`;

        const tx: Transaction = {
          id: `tx-day-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reference: `REC-${String(state.transactions.length + 1).padStart(3, "0")}`,
          type: "ENCAISSEMENT",
          pole,
          vault:
            input.paymentMethod === "ESPECES"
              ? "CAISSE_ESPECES"
              : "CAISSE_MOBILE_MONEY",
          paymentMethod: input.paymentMethod,
          amount: netAmount,
          grossAmount: cleanGross,
          discountAmount: cleanDiscount,
          dailyReportRow: input.category as DailyReportRowKey,
          observation: obs,
          description: fullDesc,
          relatedEntityId: relatedCeremonyId,
          createdBy: user.id,
          createdByName: user.fullName,
          createdAt: dateIso,
        };

        set((prev) => ({
          ceremonies: newCeremonyBooking
            ? [newCeremonyBooking, ...prev.ceremonies]
            : prev.ceremonies,
          transactions: [tx, ...prev.transactions],
        }));

        get().enqueueSyncOperation("transactions", "INSERT", {
          id: tx.id,
          reference: tx.reference,
          type: tx.type,
          pole: tx.pole,
          vault: tx.vault,
          paymentMethod: tx.paymentMethod,
          amount: tx.amount,
          description: tx.description,
          relatedEntityId: tx.relatedEntityId,
          createdBy: tx.createdBy,
          createdByName: tx.createdByName,
          createdAt: tx.createdAt,
        });

        return { success: true, transaction: tx };
      },

      updateDailyCashSheetMeta: (input) => {
        const cleanDate = input.dateIso.slice(0, 10);
        const existing = get().dailyCashMetas[cleanDate] || {
          dateIso: cleanDate,
          cashDepositAmount: 0,
          bankDepositAmount: 0,
          managerSignatureName: "La Gérante RHR M'Batto",
          updatedAt: new Date().toISOString(),
        };

        const updated: DailyCashSheetMeta = {
          ...existing,
          dateIso: cleanDate,
          openingBalanceOverride:
            input.openingBalanceOverride !== undefined
              ? input.openingBalanceOverride
              : existing.openingBalanceOverride,
          cashDepositAmount:
            input.cashDepositAmount !== undefined
              ? Math.max(0, Math.round(input.cashDepositAmount))
              : existing.cashDepositAmount,
          bankDepositAmount:
            input.bankDepositAmount !== undefined
              ? Math.max(0, Math.round(input.bankDepositAmount))
              : existing.bankDepositAmount,
          managerSignatureName:
            input.managerSignatureName !== undefined
              ? input.managerSignatureName
              : existing.managerSignatureName,
          rowObservations: input.rowObservations
            ? { ...(existing.rowObservations || {}), ...input.rowObservations }
            : existing.rowObservations,
          updatedAt: new Date().toISOString(),
        };

        set((prev) => ({
          dailyCashMetas: {
            ...prev.dailyCashMetas,
            [cleanDate]: updated,
          },
        }));

        return updated;
      },

      submitCashClosure: (input) => {
        const state = get();
        const user = state.currentUser || state.users[2];
        const nowIso = new Date().toISOString();
        const shiftDate = nowIso.slice(0, 10);

        const actual = Math.max(0, Math.round(input.actualCashHanded));
        const expected = Math.round(input.expectedCash);
        const discrepancy = actual - expected;

        const closure: CashClosure = {
          id: `clos-${Date.now()}`,
          pole: input.pole,
          closedBy: user.id,
          closedByName: user.fullName,
          closedByRole: user.role,
          shiftDate,
          totalCashIn: input.totalCashIn,
          totalMobileMoneyIn: input.totalMobileMoneyIn,
          totalDayTillExpenses: input.totalDayTillExpenses,
          expectedCash: expected,
          actualCashHanded: actual,
          discrepancy,
          status: discrepancy === 0 ? "SOUMIS" : "ECART_A_JUSTIFIER",
          notes: input.notes?.trim() || undefined,
          createdAt: nowIso,
        };

        set((prev) => ({
          cashClosures: [closure, ...prev.cashClosures],
        }));

        get().enqueueSyncOperation("cash_closures", "INSERT", {
          id: closure.id,
          pole: closure.pole,
          expectedCash: expected,
          actualCashHanded: actual,
          discrepancy,
        });

        return closure;
      },

      validateCashClosureByOwner: (closureId) => {
        const state = get();
        const user = state.currentUser || state.users[0];
        set((prev) => ({
          cashClosures: prev.cashClosures.map((c) =>
            c.id === closureId
              ? {
                ...c,
                status: "VALIDE_PROPRIETAIRE",
                auditedBy: user.id,
              }
              : c
          ),
        }));

        get().enqueueSyncOperation("cash_closures", "UPDATE", {
          id: closureId,
          status: "VALIDE_PROPRIETAIRE",
        });
      },

      addFixedCost: (input) => {
        const state = get();
        const user = state.currentUser || state.users[0];
        const nowIso = new Date().toISOString();
        const cleanAmount = Math.max(1, Math.round(input.amount));

        const fc: FixedCost = {
          id: `fc-${Date.now()}`,
          category: input.category,
          label: input.label.trim(),
          beneficiary: input.beneficiary?.trim() || undefined,
          periodMonth: input.periodMonth,
          amount: cleanAmount,
          paymentMethod: input.paymentMethod,
          isPaid: true,
          receiptPhotoUrl: input.receiptPhotoUrl,
          createdBy: user.id,
          createdAt: nowIso,
        };

        const tx: Transaction = {
          id: `tx-fc-${Date.now()}`,
          reference: `CHG-FIX-0${state.transactions.length + 1}`,
          type: "DEPENSE",
          pole: "CHARGES_FIXES",
          vault:
            input.paymentMethod === "ESPECES"
              ? "CAISSE_ESPECES"
              : "CAISSE_MOBILE_MONEY",
          paymentMethod: input.paymentMethod,
          expenseFundSource: "FONDS_SEPARE",
          amount: cleanAmount,
          description: `[Charge Fixe ${input.category.replace(/_/g, " ")}] ${fc.label
            }`,
          receiptPhotoUrl: input.receiptPhotoUrl,
          relatedEntityId: fc.id,
          createdBy: user.id,
          createdByName: user.fullName,
          createdAt: nowIso,
        };

        set((prev) => ({
          fixedCosts: [fc, ...prev.fixedCosts],
          transactions: [tx, ...prev.transactions],
        }));

        get().enqueueSyncOperation("fixed_costs", "INSERT", {
          id: fc.id,
          category: fc.category,
          amount: fc.amount,
        });

        return fc;
      },
    }),
    {
      name: "rhr-mbatto-erp-storage-v2.7",
      storage: createJSONStorage(() => hybridOfflineStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        isLocked: state.isLocked,
        users: state.users,
        isOnline: state.isOnline,
        lastSyncedAt: state.lastSyncedAt,
        syncQueue: state.syncQueue,
        waitresses: state.waitresses,
        rooms: state.rooms,
        stays: state.stays,
        folioItems: state.folioItems,
        inventory: state.inventory,
        posOrders: state.posOrders,
        ceremonies: state.ceremonies,
        transactions: state.transactions,
        cashClosures: state.cashClosures,
        fixedCosts: state.fixedCosts,
        dailyCashMetas: state.dailyCashMetas,
      }),
    }
  )
);

