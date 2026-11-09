-- =============================================================================
-- RHR ERP/POS - RÉSIDENCE HÔTEL LE RÊVE DE M'BATTO
-- Schéma PostgreSQL Complet, Contraintes Métier, Seed Initial & RLS (Supabase)
-- Projet Supabase : rhr-mbatto-db (usiiibljgooonksooqtm)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nettoyage sécurisé si les tables existaient vides avec d'anciens types UUID
DROP TABLE IF EXISTS public.room_folio_items CASCADE;
DROP TABLE IF EXISTS public.pos_orders CASCADE;
DROP TABLE IF EXISTS public.stays CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.waitresses CASCADE;
DROP TABLE IF EXISTS public.ceremony_bookings CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.cash_closures CASCADE;
DROP TABLE IF EXISTS public.fixed_costs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. TABLE : users (Utilisateurs, Rôles RBAC & Administrateur)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PROPRIETAIRE', 'COMPTABLE', 'GERANT_HOTEL', 'CAISSIERE_BAR_RESTO', 'CLIENT_QR')),
  pin_code VARCHAR(4) NOT NULL,
  password_hash TEXT NOT NULL DEFAULT 'rhr2026',
  phone TEXT,
  badge_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_credentials BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TABLE : waitresses (Serveuses actives Bar & Restaurant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waitresses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_sales_amount INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLE : rooms (Les 5 Chambres Climatisées RHR)
-- Règle métier : Passage 3H (allow_passage_3h) autorisé sur les Chambres 4 et 5
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  room_number INTEGER UNIQUE NOT NULL CHECK (room_number BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('CONFORT', 'STANDARD')),
  night_price INTEGER NOT NULL CHECK (night_price > 0),
  passage_price INTEGER NOT NULL DEFAULT 5000 CHECK (passage_price >= 0),
  allow_passage_3h BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('LIBRE', 'OCCUPEE_NUITEE', 'OCCUPEE_PASSAGE_3H', 'RESERVEE', 'A_NETTOYER')),
  amenities TEXT[] NOT NULL DEFAULT ARRAY['Climatisation', 'TV Canal+', 'Eau Chaude'],
  current_stay_id TEXT,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
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
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL CHECK (room_number BETWEEN 1 AND 5),
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_id_number TEXT,
  stay_type TEXT NOT NULL CHECK (stay_type IN ('NUITEE', 'PASSAGE_3H', 'RESERVATION')),
  status TEXT NOT NULL CHECK (status IN ('EN_COURS', 'RESERVE', 'TERMINE', 'ANNULE')),
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_check_out TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  actual_check_out TIMESTAMPTZ,
  nights_count INTEGER NOT NULL DEFAULT 1,
  base_rate INTEGER NOT NULL DEFAULT 10000 CHECK (base_rate >= 0),
  deposit_amount INTEGER NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  deposit_method TEXT CHECK (deposit_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  notes TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_stays_passage_3h_only_rooms_4_5 CHECK (
    stay_type <> 'PASSAGE_3H' OR room_number IN (4, 5)
  )
);

-- -----------------------------------------------------------------------------
-- 5. TABLE : room_folio_items (Lignes du Compte/Folio de Chambre)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_folio_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  stay_id TEXT NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('HEBERGEMENT', 'BAR_RESTO', 'ACOMPTE', 'SUPPLEMENT')),
  amount INTEGER NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  pos_order_id TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. TABLE : inventory_items (Stocks Boissons Bar, Produits Phares Cuisine & Menu)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pole TEXT NOT NULL CHECK (pole IN ('BAR_BOISSON', 'CUISINE_PHARE', 'PLAT_MENU')),
  category TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  alert_threshold INTEGER NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
  unit TEXT NOT NULL DEFAULT 'Unité',
  linked_core_ingredient_id TEXT REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  linked_core_ingredient_qty INTEGER NOT NULL DEFAULT 1 CHECK (linked_core_ingredient_qty > 0),
  is_available_on_qr BOOLEAN NOT NULL DEFAULT TRUE,
  image_emoji TEXT,
  updated_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. TABLE : pos_orders (Commandes Bar & Restaurant + Commandes QR Code)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  order_number TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('COMPTOIR_POS', 'QR_TABLE', 'QR_CHAMBRE')),
  table_or_room_label TEXT NOT NULL,
  waitress_id TEXT REFERENCES public.waitresses(id) ON DELETE SET NULL,
  waitress_name TEXT NOT NULL DEFAULT 'À attribuer (QR)',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO', 'TRANSFERT_CHAMBRE', 'EN_ATTENTE_QR')),
  transferred_to_room_number INTEGER,
  transferred_to_stay_id TEXT REFERENCES public.stays(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('NOUVELLE_QR', 'EN_PREPARATION', 'SERVIE', 'PAYEE', 'TRANSFEREE_CHAMBRE', 'ANNULEE')),
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. TABLE : ceremony_bookings (Salle de Cérémonie)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ceremony_bookings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  reference TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('MARIAGE', 'DOT', 'BAPTEME', 'ANNIVERSAIRE', 'CONFERENCE', 'AUTRE')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  guests_count INTEGER NOT NULL DEFAULT 50,
  base_rental_fee INTEGER NOT NULL DEFAULT 50000 CHECK (base_rental_fee = 50000),
  extra_ordinary_covers INTEGER NOT NULL DEFAULT 0,
  extra_vip_covers INTEGER NOT NULL DEFAULT 0,
  custom_catering_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_beverage_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL DEFAULT 50000,
  deposits JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DEVIS', 'CONFIRME_ACOMPTE', 'SOLDE', 'ANNULE')),
  notes TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. TABLE : transactions (Grand Livre Trésorerie : Caisse Espèces & Mobile Money)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  reference TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENCAISSEMENT', 'DEPENSE')),
  pole TEXT NOT NULL CHECK (pole IN ('HOTEL', 'BAR_RESTO', 'CEREMONIE', 'MARCHE_CUISINE', 'MAINTENANCE', 'CHARGES_FIXES')),
  vault TEXT NOT NULL CHECK (vault IN ('CAISSE_ESPECES', 'CAISSE_MOBILE_MONEY')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  expense_fund_source TEXT CHECK (expense_fund_source IN ('CAISSE_DU_JOUR', 'FONDS_SEPARE')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  receipt_photo_url TEXT,
  related_entity_id TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'Système RHR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. TABLE : cash_closures (Arrêtés & Clôtures de Caisse de Fin de Service)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_closures (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  pole TEXT NOT NULL CHECK (pole IN ('HOTEL', 'BAR_RESTO', 'GLOBAL')),
  closed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  closed_by_name TEXT NOT NULL DEFAULT 'Agent RHR',
  closed_by_role TEXT NOT NULL DEFAULT 'CAISSIERE_BAR_RESTO',
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cash_in INTEGER NOT NULL DEFAULT 0,
  total_mobile_money_in INTEGER NOT NULL DEFAULT 0,
  total_day_till_expenses INTEGER NOT NULL DEFAULT 0,
  expected_cash INTEGER NOT NULL DEFAULT 0,
  actual_cash_handed INTEGER NOT NULL DEFAULT 0,
  discrepancy INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('SOUMIS', 'VALIDE_PROPRIETAIRE', 'ECART_A_JUSTIFIER')),
  notes TEXT,
  audited_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. TABLE : fixed_costs (Charges Fixes : CIE, SODECI, Salaires, Avances, Impôts)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  category TEXT NOT NULL CHECK (category IN ('CIE_ELECTRICITE', 'SODECI_EAU', 'SALAIRE', 'AVANCE_SALAIRE', 'IMPOTS_TAXES', 'CANAL_INTERNET', 'AUTRE_CHARGE')),
  label TEXT NOT NULL,
  beneficiary TEXT,
  period_month VARCHAR(7) NOT NULL DEFAULT '2026-11',
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('ESPECES', 'WAVE', 'ORANGE_MONEY', 'MTN_MOMO')),
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  receipt_photo_url TEXT,
  created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- DONNÉES INITIALES (SEED DATA) : UTILISATEURS, SERVEUSES, 5 CHAMBRES & CATALOGUE
-- =============================================================================

INSERT INTO public.users (id, email, full_name, role, pin_code, password_hash, phone, badge_label, is_active, must_change_credentials)
VALUES
  ('usr-admin-01', 'admin@rhr-mbatto.ci', 'M. Koffi — Administrateur RHR', 'PROPRIETAIRE', '1111', 'rhr2026', '+225 07 07 01 02 03', 'Administrateur', TRUE, FALSE),
  ('usr-compta-02', 'compta@rhr-mbatto.ci', 'Cabinet Kouamé — Comptable', 'COMPTABLE', '2222', 'rhr2026', '+225 05 05 44 55 66', 'Expert Comptable & Audit', TRUE, FALSE),
  ('usr-hotel-03', 'hotel@rhr-mbatto.ci', 'Yao Serge — Gérant Hôtel', 'GERANT_HOTEL', '3333', 'rhr2026', '+225 07 48 12 34 56', 'Gérant Réception Hôtel', TRUE, FALSE),
  ('usr-caisse-04', 'caisse@rhr-mbatto.ci', 'Adjoua Félicité — Caissière Bar/Resto', 'CAISSIERE_BAR_RESTO', '4444', 'rhr2026', '+225 01 02 98 76 54', 'Caissière Bar & Restaurant', TRUE, FALSE),
  ('usr-client-05', 'client@rhr-mbatto.ci', 'Client RHR (Menu QR)', 'CLIENT_QR', '0000', 'qr', '+225 00 00 00 00 00', 'Accès Client Table / Chambre', TRUE, FALSE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  pin_code = EXCLUDED.pin_code;

INSERT INTO public.waitresses (id, name, phone, is_active, total_sales_amount, orders_count, created_by)
VALUES
  ('wait-awa', 'Awa', '+225 07 11 22 33 01', TRUE, 42500, 6, 'usr-admin-01'),
  ('wait-chantal', 'Chantal', '+225 07 11 22 33 02', TRUE, 31000, 4, 'usr-admin-01'),
  ('wait-clarisse', 'Clarisse', '+225 05 11 22 33 03', TRUE, 24000, 3, 'usr-admin-01'),
  ('wait-marie', 'Marie', '+225 01 11 22 33 04', TRUE, 19500, 3, 'usr-admin-01'),
  ('wait-comptoir', 'Direct Comptoir', '+225 07 00 00 00 99', TRUE, 14000, 2, 'usr-admin-01')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone;

INSERT INTO public.rooms (id, room_number, name, category, night_price, passage_price, allow_passage_3h, status, amenities, updated_by)
VALUES
  ('room-1', 1, 'Chambre 1 — Confort Prestige', 'CONFORT', 15000, 0, FALSE, 'LIBRE', ARRAY['Climatisation Split', 'TV Canal+', 'Eau Chaude', 'Lit King Size'], 'usr-hotel-03'),
  ('room-2', 2, 'Chambre 2 — Confort Lagune', 'CONFORT', 15000, 0, FALSE, 'LIBRE', ARRAY['Climatisation Split', 'TV Canal+', 'Eau Chaude', 'Fauteuil Salon'], 'usr-hotel-03'),
  ('room-3', 3, 'Chambre 3 — Confort Royale', 'CONFORT', 15000, 0, FALSE, 'LIBRE', ARRAY['Climatisation Split', 'TV Canal+', 'Eau Chaude', 'Bureau'], 'usr-hotel-03'),
  ('room-4', 4, 'Chambre 4 — Standard Harmonie', 'STANDARD', 10000, 5000, TRUE, 'LIBRE', ARRAY['Climatisation', 'TV', 'Eau Chaude'], 'usr-hotel-03'),
  ('room-5', 5, 'Chambre 5 — Standard Akwaba', 'STANDARD', 10000, 5000, TRUE, 'LIBRE', ARRAY['Climatisation', 'TV', 'Eau Chaude'], 'usr-hotel-03')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  night_price = EXCLUDED.night_price,
  passage_price = EXCLUDED.passage_price,
  allow_passage_3h = EXCLUDED.allow_passage_3h;

INSERT INTO public.inventory_items (id, sku, name, pole, category, unit_price, stock_quantity, alert_threshold, unit, linked_core_ingredient_id, linked_core_ingredient_qty, is_available_on_qr, image_emoji, updated_by)
VALUES
  -- Produits Phares Cuisine
  ('core-poulet', 'PHARE-POULET', 'Poulets Entiers (Congélateur)', 'CUISINE_PHARE', 'Matière Première Phare', 0, 14, 5, 'Poulets', NULL, 1, FALSE, '🐓', 'usr-admin-01'),
  ('core-carpe', 'PHARE-CARPE', 'Poissons Carpes Fraîches', 'CUISINE_PHARE', 'Matière Première Phare', 0, 9, 4, 'Carpes', NULL, 1, FALSE, '🐟', 'usr-admin-01'),
  ('core-machoiron', 'PHARE-MACHOIRON', 'Poissons Machoirons de Lagune', 'CUISINE_PHARE', 'Matière Première Phare', 0, 6, 3, 'Machoirons', NULL, 1, FALSE, '🐠', 'usr-admin-01'),
  ('core-viande', 'PHARE-VIANDE', 'Portions de Viande (Bœuf / Mouton)', 'CUISINE_PHARE', 'Matière Première Phare', 0, 12, 4, 'Portions', NULL, 1, FALSE, '🥩', 'usr-admin-01'),
  -- Plats du Menu (Nourriture)
  ('menu-poulet-braise', 'MENU-PB-01', 'Poulet Braisé Entier + Attiéké / Alloco', 'PLAT_MENU', 'Grillades & Braisés', 6000, 14, 5, 'Plat', 'core-poulet', 1, TRUE, '🍗', 'usr-admin-01'),
  ('menu-demi-poulet', 'MENU-DP-01B', 'Demi-Poulet Grillé + Alloco / Attiéké', 'PLAT_MENU', 'Grillades & Braisés', 3500, 14, 5, 'Plat', 'core-poulet', 1, TRUE, '🍖', 'usr-admin-01'),
  ('menu-kedjenou-poulet', 'MENU-KP-02', 'Kedjenou de Poulet à l''Étouffée + Riz/Attiéké', 'PLAT_MENU', 'Spécialités Ivoiriennes', 6500, 14, 5, 'Plat', 'core-poulet', 1, TRUE, '🍲', 'usr-admin-01'),
  ('menu-soupe-poulet', 'MENU-SP-03', 'Soupe du Pêcheur / Poulet Africain', 'PLAT_MENU', 'Spécialités Ivoiriennes', 6000, 14, 5, 'Plat', 'core-poulet', 1, TRUE, '🥘', 'usr-admin-01'),
  ('menu-carpe-braisee', 'MENU-CB-04', 'Carpe Braisée Géante + Attiéké & Alloco', 'PLAT_MENU', 'Grillades & Braisés', 7000, 9, 4, 'Plat', 'core-carpe', 1, TRUE, '🐟', 'usr-admin-01'),
  ('menu-pointe-carpe', 'MENU-KC-05', 'Kedjenou de Carpe Fraîche + Attiéké', 'PLAT_MENU', 'Spécialités Ivoiriennes', 7000, 9, 4, 'Plat', 'core-carpe', 1, TRUE, '🍛', 'usr-admin-01'),
  ('menu-machoiron-braise', 'MENU-MB-06', 'Machoiron Braisé de M''Batto + Attiéké', 'PLAT_MENU', 'Grillades & Braisés', 8500, 6, 3, 'Plat', 'core-machoiron', 1, TRUE, '🐠', 'usr-admin-01'),
  ('menu-soupe-machoiron', 'MENU-SM-07', 'Soupe Royale de Machoiron + Foutou/Riz', 'PLAT_MENU', 'Spécialités Ivoiriennes', 8500, 6, 3, 'Plat', 'core-machoiron', 1, TRUE, '🥣', 'usr-admin-01'),
  ('menu-choukouya-viande', 'MENU-CV-08', 'Choukouya de Bœuf Braisé + Alloco Croustillant', 'PLAT_MENU', 'Grillades & Braisés', 5000, 12, 4, 'Plat', 'core-viande', 1, TRUE, '🥩', 'usr-admin-01'),
  -- Boissons Bar
  ('bar-bock-66', 'BAR-BOCK-66', 'Bière Bock Solibra 66cl', 'BAR_BOISSON', 'Bières & Pressions', 1000, 48, 12, 'Bouteilles', NULL, 1, TRUE, '🍺', 'usr-admin-01'),
  ('bar-beaufort-50', 'BAR-BEAU-50', 'Bière Beaufort Lager 50cl', 'BAR_BOISSON', 'Bières & Pressions', 1000, 36, 12, 'Bouteilles', NULL, 1, TRUE, '🍻', 'usr-admin-01'),
  ('bar-heineken-33', 'BAR-HEIN-33', 'Heineken Bouteille 33cl', 'BAR_BOISSON', 'Bières & Pressions', 1500, 24, 10, 'Bouteilles', NULL, 1, TRUE, '🍾', 'usr-admin-01'),
  ('bar-chill-50', 'BAR-CHILL-50', 'Chill Citron Solibra 50cl', 'BAR_BOISSON', 'Bières & Pressions', 1000, 24, 10, 'Bouteilles', NULL, 1, TRUE, '🍋', 'usr-admin-01'),
  ('bar-guinness-33', 'BAR-GUIN-33', 'Guinness Foreign Extra 33cl', 'BAR_BOISSON', 'Bières & Pressions', 1500, 18, 6, 'Bouteilles', NULL, 1, TRUE, '🍺', 'usr-admin-01'),
  ('bar-vin-bordeaux', 'BAR-VIN-01', 'Vin Rouge Bordeaux Réserve (75cl)', 'BAR_BOISSON', 'Vins & Spiritueux', 8000, 10, 3, 'Bouteilles', NULL, 1, TRUE, '🍷', 'usr-admin-01'),
  ('bar-coca-50', 'BAR-COCA-50', 'Sucrerie Coca-Cola / Fanta 50cl', 'BAR_BOISSON', 'Softs & Eaux', 600, 40, 12, 'Bouteilles', NULL, 1, TRUE, '🥤', 'usr-admin-01'),
  ('bar-celeste-150', 'BAR-CEL-150', 'Eau Minérale Céleste 1.5L', 'BAR_BOISSON', 'Softs & Eaux', 800, 30, 10, 'Bouteilles', NULL, 1, TRUE, '💧', 'usr-admin-01')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  unit_price = EXCLUDED.unit_price,
  image_emoji = EXCLUDED.image_emoji;

-- =============================================================================
-- POLITIQUES D'ACCÈS SUPABASE DATA API (Compatibles Publishable Key & Anon Key)
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

CREATE POLICY "RHR_App_Access_Users" ON public.users FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Waitresses" ON public.waitresses FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Rooms" ON public.rooms FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Stays" ON public.stays FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Folio" ON public.room_folio_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Inventory" ON public.inventory_items FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Orders" ON public.pos_orders FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Ceremonies" ON public.ceremony_bookings FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Transactions" ON public.transactions FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_Closures" ON public.cash_closures FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "RHR_App_Access_FixedCosts" ON public.fixed_costs FOR ALL USING (TRUE) WITH CHECK (TRUE);
