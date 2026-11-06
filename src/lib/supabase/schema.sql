-- =============================================================================
-- RHR ERP/POS - RÉSIDENCE HÔTEL LE RÊVE DE M'BATTO
-- Schéma PostgreSQL Complet, Contraintes Métier & Politiques RLS (Supabase)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLE : users (Utilisateurs, Rôles RBAC & Administrateur Général)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PROPRIETAIRE', 'COMPTABLE', 'GERANT_HOTEL', 'CAISSIERE_BAR_RESTO', 'CLIENT_QR')),
  pin_code VARCHAR(4) NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  badge_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TABLE : waitresses (Serveuses actives Bar & Restaurant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waitresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_sales_amount INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLE : rooms (Les 5 Chambres Climatisées RHR)
-- Règle métier : Passage 3H (allow_passage_3h) autorisé sur les Chambres 4 et 5
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number INTEGER UNIQUE NOT NULL CHECK (room_number BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('CONFORT', 'STANDARD')),
  night_price INTEGER NOT NULL CHECK (night_price > 0),
  passage_price INTEGER NOT NULL DEFAULT 5000 CHECK (passage_price >= 0),
  allow_passage_3h BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('LIBRE', 'OCCUPEE_NUITEE', 'OCCUPEE_PASSAGE_3H', 'RESERVEE', 'A_NETTOYER')),
  amenities TEXT[] NOT NULL DEFAULT ARRAY['Climatisation', 'TV Canal+', 'Eau Chaude'],
  current_stay_id UUID,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_passage_3h_rooms_4_5 CHECK (
    (room_number IN (1, 2, 3) AND status <> 'OCCUPEE_PASSAGE_3H')
    OR (room_number IN (4, 5))
  )
);

-- -----------------------------------------------------------------------------
-- 4. TABLE : stays (Séjours, Passages 3H & Réservations Hôtel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL CHECK (room_number BETWEEN 1 AND 5),
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_id_number TEXT,
  stay_type TEXT NOT NULL CHECK (stay_type IN ('NUITEE', 'PASSAGE_3H', 'RESERVATION')),
  status TEXT NOT NULL CHECK (status IN ('EN_COURS', 'RESERVE', 'TERMINE', 'ANNULE')),
  check_in TIMESTAMPTZ NOT NULL,
  expected_check_out TIMESTAMPTZ NOT NULL,
  actual_check_out TIMESTAMPTZ,
  nights_count INTEGER NOT NULL DEFAULT 1,
  base_rate INTEGER NOT NULL CHECK (base_rate >= 0),
  deposit_amount INTEGER NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  deposit_method TEXT CHECK (deposit_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Sécurité SQL : Le Passage 3H est strictement réservé aux chambres 4 et 5
  CONSTRAINT chk_stays_passage_3h_only_rooms_4_5 CHECK (
    stay_type <> 'PASSAGE_3H' OR room_number IN (4, 5)
  )
);

-- -----------------------------------------------------------------------------
-- 5. TABLE : room_folio_items (Lignes du Compte/Folio de Chambre - Facturation croisée)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_folio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('HEBERGEMENT', 'BAR_RESTO', 'ACOMPTE', 'SUPPLEMENT')),
  amount INTEGER NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  pos_order_id UUID,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TABLE : inventory_items (Stocks Boissons Bar, Produits Phares Cuisine & Menu)
-- Tarification 100% libre (unit_price modifiable à tout moment pour Boissons & Nourriture)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pole TEXT NOT NULL CHECK (pole IN ('BAR_BOISSON', 'CUISINE_PHARE', 'PLAT_MENU')),
  category TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  alert_threshold INTEGER NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
  unit TEXT NOT NULL DEFAULT 'Unité',
  linked_core_ingredient_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  linked_core_ingredient_qty INTEGER NOT NULL DEFAULT 1 CHECK (linked_core_ingredient_qty > 0),
  is_available_on_qr BOOLEAN NOT NULL DEFAULT TRUE,
  image_emoji TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. TABLE : pos_orders (Commandes Bar & Restaurant + Commandes QR Code)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('COMPTOIR_POS', 'QR_TABLE', 'QR_CHAMBRE')),
  table_or_room_label TEXT NOT NULL,
  waitress_id UUID REFERENCES public.waitresses(id) ON DELETE SET NULL,
  waitress_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'TRANSFERT_CHAMBRE', 'EN_ATTENTE_QR')),
  transferred_to_room_number INTEGER,
  transferred_to_stay_id UUID REFERENCES public.stays(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('NOUVELLE_QR', 'EN_PREPARATION', 'SERVIE', 'PAYEE', 'TRANSFEREE_CHAMBRE', 'ANNULEE')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. TABLE : ceremony_bookings (Salle de Cérémonie : Mariages, Dots, Baptêmes...)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ceremony_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('MARIAGE', 'DOT', 'BAPTEME', 'ANNIVERSAIRE', 'CONFERENCE', 'AUTRE')),
  event_date DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 50,
  base_rental_fee INTEGER NOT NULL DEFAULT 50000 CHECK (base_rental_fee = 50000),
  extra_ordinary_covers INTEGER NOT NULL DEFAULT 0,
  extra_vip_covers INTEGER NOT NULL DEFAULT 0,
  custom_catering_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_beverage_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL,
  deposits JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DEVIS', 'CONFIRME_ACOMPTE', 'SOLDE', 'ANNULE')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TABLE : transactions (Grand Livre Trésorerie : Caisse Espèces & Mobile Money)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENCAISSEMENT', 'DEPENSE')),
  pole TEXT NOT NULL CHECK (pole IN ('HOTEL', 'BAR_RESTO', 'CEREMONIE', 'MARCHE_CUISINE', 'MAINTENANCE', 'CHARGES_FIXES')),
  vault TEXT NOT NULL CHECK (vault IN ('CAISSE_ESPECES', 'CAISSE_MOBILE_MONEY')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  expense_fund_source TEXT CHECK (expense_fund_source IN ('CAISSE_DU_JOUR', 'FONDS_SEPARE')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  receipt_photo_url TEXT,
  related_entity_id UUID,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TABLE : cash_closures (Arrêtés & Clôtures de Caisse de Fin de Service)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pole TEXT NOT NULL CHECK (pole IN ('HOTEL', 'BAR_RESTO', 'GLOBAL')),
  closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  closed_by_name TEXT NOT NULL,
  closed_by_role TEXT NOT NULL,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cash_in INTEGER NOT NULL DEFAULT 0,
  total_mobile_money_in INTEGER NOT NULL DEFAULT 0,
  total_day_till_expenses INTEGER NOT NULL DEFAULT 0,
  expected_cash INTEGER NOT NULL DEFAULT 0,
  actual_cash_handed INTEGER NOT NULL DEFAULT 0,
  discrepancy INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('SOUMIS', 'VALIDE_PROPRIETAIRE', 'ECART_A_JUSTIFIER')),
  notes TEXT,
  audited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. TABLE : fixed_costs (Charges Fixes : CIE, SODECI, Salaires, Avances, Impôts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('CIE_ELECTRICITE', 'SODECI_EAU', 'SALAIRE', 'AVANCE_SALAIRE', 'IMPOTS_TAXES', 'CANAL_INTERNET', 'AUTRE_CHARGE')),
  label TEXT NOT NULL,
  beneficiary TEXT,
  period_month VARCHAR(7) NOT NULL, -- Format YYYY-MM
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  receipt_photo_url TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- POLITIQUES ROW LEVEL SECURITY (RLS) STRICTES & ISOLATION DES IDENTIFIANTS
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_folio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceremony_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- Fonction helper pour récupérer le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. ISOLATION STRICTE DES COMPTES UTILISATEURS :
-- Seul le PROPRIETAIRE (Administrateur Général) peut gérer tous les comptes (créer, modifier, supprimer).
-- Les autres utilisateurs ne peuvent lire que leur propre profil (aucun accès aux PIN/emails des collègues).
CREATE POLICY "Proprietaire_Admin_General_All_Users" ON public.users
  FOR ALL USING (public.current_user_role() = 'PROPRIETAIRE');

CREATE POLICY "Users_Read_Own_Profile_Only" ON public.users
  FOR SELECT USING (id = auth.uid());

-- 2. PROPRIETAIRE (Admin Général) : Contrôle total sur Serveuses, Articles/Prix et Chambres
CREATE POLICY "Proprietaire_Admin_All_Waitresses" ON public.waitresses
  FOR ALL USING (public.current_user_role() = 'PROPRIETAIRE');

CREATE POLICY "Proprietaire_Admin_All_Inventory" ON public.inventory_items
  FOR ALL USING (public.current_user_role() = 'PROPRIETAIRE');

CREATE POLICY "Proprietaire_Comptable_All_Rooms" ON public.rooms
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Stays" ON public.stays
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Folio" ON public.room_folio_items
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Orders" ON public.pos_orders
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Ceremonies" ON public.ceremony_bookings
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Transactions" ON public.transactions
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_All_Closures" ON public.cash_closures
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

CREATE POLICY "Proprietaire_Comptable_Exclusive_FixedCosts" ON public.fixed_costs
  FOR ALL USING (public.current_user_role() IN ('PROPRIETAIRE', 'COMPTABLE'));

-- 3. GERANT_HOTEL : Accès restreint au pôle Hôtel et ses propres transactions/clôtures
CREATE POLICY "Gerant_Hotel_Rooms" ON public.rooms
  FOR ALL USING (public.current_user_role() = 'GERANT_HOTEL');

CREATE POLICY "Gerant_Hotel_Stays" ON public.stays
  FOR ALL USING (public.current_user_role() = 'GERANT_HOTEL');

CREATE POLICY "Gerant_Hotel_Folio" ON public.room_folio_items
  FOR ALL USING (public.current_user_role() = 'GERANT_HOTEL');

CREATE POLICY "Gerant_Hotel_Own_Transactions" ON public.transactions
  FOR ALL USING (
    public.current_user_role() = 'GERANT_HOTEL'
    AND pole IN ('HOTEL', 'MAINTENANCE')
    AND created_by = auth.uid()
  );

CREATE POLICY "Gerant_Hotel_Own_Closures" ON public.cash_closures
  FOR ALL USING (
    public.current_user_role() = 'GERANT_HOTEL'
    AND closed_by = auth.uid()
  );

-- 4. CAISSIERE_BAR_RESTO & COMPTABLE : Accès POS, Serveuses, Stocks et Tarifs
CREATE POLICY "Staff_Waitresses_Read_Update" ON public.waitresses
  FOR SELECT USING (public.current_user_role() IN ('CAISSIERE_BAR_RESTO', 'PROPRIETAIRE', 'COMPTABLE', 'CLIENT_QR'));

CREATE POLICY "Caissiere_Waitresses_Update_Stats" ON public.waitresses
  FOR UPDATE USING (public.current_user_role() IN ('CAISSIERE_BAR_RESTO', 'COMPTABLE'));

CREATE POLICY "Inventory_Public_Read_For_POS_And_QR" ON public.inventory_items
  FOR SELECT USING (TRUE);

CREATE POLICY "Staff_Inventory_Manage_Stock_And_Prices" ON public.inventory_items
  FOR ALL USING (public.current_user_role() IN ('CAISSIERE_BAR_RESTO', 'COMPTABLE'));

CREATE POLICY "Caissiere_POS_Orders" ON public.pos_orders
  FOR ALL USING (public.current_user_role() IN ('CAISSIERE_BAR_RESTO', 'CLIENT_QR'));

CREATE POLICY "Caissiere_Rooms_Read_Occupied" ON public.rooms
  FOR SELECT USING (public.current_user_role() = 'CAISSIERE_BAR_RESTO');

CREATE POLICY "Caissiere_Folio_Insert_Transfer" ON public.room_folio_items
  FOR INSERT WITH CHECK (public.current_user_role() = 'CAISSIERE_BAR_RESTO');

CREATE POLICY "Caissiere_Own_Transactions" ON public.transactions
  FOR ALL USING (
    public.current_user_role() = 'CAISSIERE_BAR_RESTO'
    AND pole IN ('BAR_RESTO', 'MARCHE_CUISINE')
    AND created_by = auth.uid()
  );

CREATE POLICY "Caissiere_Own_Closures" ON public.cash_closures
  FOR ALL USING (
    public.current_user_role() = 'CAISSIERE_BAR_RESTO'
    AND closed_by = auth.uid()
  );
