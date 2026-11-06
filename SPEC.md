# ARCHITECTURE & CAHIER DES CHARGES : RHR ERP/POS (Résidence Hôtel Le Rêve de M'Batto)

## 1. Identité Visuelle & Design System (Charte RHR)
- **Nom de l'établissement** : RHR - Résidence Hôtel Le Rêve de M'Batto
- **Logo** : `/logo-rhr.jpg` (Toit rouge bordeaux structurant les lettres RHR en noir profond).
- **Palette de Couleurs (Tailwind Custom)** :
  - `rhr-burgundy` : `#7C0A02` (Rouge Bordeaux profond du toit du logo - Couleur primaire, boutons d'action, accents).
  - `rhr-burgundy-light` : `#9E1B12` (Hover states).
  - `rhr-dark` : `#111315` (Noir charbon RHR - Sidebar, typographie principale, en-têtes).
  - `rhr-gold` : `#D4AF37` (Or chaud - Indicateurs VIP, badges de statut premium).
  - `rhr-surface` : `#F8F9FA` (Fond clair apaisant pour éviter la fatigue visuelle en caisse).
- **Devise** : Franc CFA (`FCFA` ou `F`), formatage strict avec séparateur de milliers et sans décimales (ex: `15 000 F`).

## 2. Stack Technique Fullstack & Offline-First
- **Framework** : Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Lucide Icons.
- **Backend & Base de données** : Architecture hybride Supabase (PostgreSQL + Auth + Storage) doublée d'un moteur **Offline-First** (Zustand persisté sur IndexedDB / LocalStorage avec file d'attente de synchronisation `syncQueue`). L'application doit être 100% fonctionnelle même si internet coupe à M'Batto.
- **Sécurité & Point d'entrée obligatoire** : 
  - L'application s'ouvre OBLIGATOIREMENT sur la page `/login`.
  - Tant qu'un utilisateur n'est pas authentifié, aucune route interne (`/dashboard`, `/hotel`, `/pos`, `/ceremonies`, `/cash-closure`) n'est accessible (Middleware de protection + Guard).
  - Seule la route publique `/qr-menu` (Menu Client par scan QR Code) est accessible sans mot de passe, ou via le bouton "Accès Client QR" sur l'écran de connexion.

## 3. Matrice des Rôles & Permissions (RBAC Strict)
Chaque session utilisateur contient son `id`, `fullName`, `role`, et `pinCode`. Toute action en base de données est horodatée et signée par `createdBy: user.id` (Audit Trail).
1. **PROPRIETAIRE** (et **COMPTABLE**) :
   - Accès : `/dashboard` (Vue globale), `/hotel`, `/pos`, `/ceremonies`, `/expenses`, `/fixed-costs`, `/closures`, `/inventory`.
   - Droits exclusifs : Voir le Chiffre d'Affaires global, voir le Bénéfice Net Réel, consulter les soldes globaux (Espèces vs Mobile Money), saisir les Charges Fixes (CIE, SODECI, Salaires, Avances, Impôts), valider/auditer les clôtures de caisse avec écarts, ajuster les stocks.
2. **GERANT_HOTEL** :
   - Accès restreint : `/hotel`, `/expenses` (filtré sur Hôtel), `/closures` (sa propre caisse).
   - Interdiction absolue : Aucun accès au Dashboard global, ni au CA global, ni au Bar/Resto. Ne voit que les encaissements et dépenses de sa propre journée de service.
3. **CAISSIERE_BAR_RESTO** :
   - Accès restreint : `/pos` (Point de vente Bar & Resto + Réception commandes QR), `/inventory` (consultation/alerte), `/expenses` (filtré sur Cuisine/Marché/Bar), `/closures` (sa propre caisse).
   - Interdiction absolue : Aucun accès au CA global ni aux finances de l'hôtel.
4. **CLIENT_QR** :
   - Accès unique : `/qr-menu` (Interface mobile de commande à table ou en chambre).

## 4. Règles Métier Inviolables par Pôle

### A. Pôle Hôtel (5 Chambres climatisées, TV, Eau chaude)
- **Inventaire fixe** :
  - `Chambre 1`, `Chambre 2`, `Chambre 3` (Catégorie Confort) : Nuitée = `15 000 F` | Passage (3h en journée) = `5 000 F`.
  - `Chambre 4`, `Chambre 5` (Catégorie Standard) : Nuitée = `10 000 F` | Passage (3h en journée) = `5 000 F`.
- **Cycle de vie d'une chambre** : `LIBRE` (Vert) -> `OCCUPEE_NUITEE` (Bleu) ou `OCCUPEE_PASSAGE_3H` (Orange avec compte à rebours temps réel de 03:00:00 et alerte sonore/visuelle à l'expiration) -> `A_NETTOYER` (Gris) -> `LIBRE`.
- **Réservations & Acomptes** : Calendrier interactif gérant les réservations futures, l'encaissement d'acomptes (`Espèces` ou `Mobile Money`) et le calcul automatique du `Reste à payer`.
- **Folio de Chambre (Facturation Croisée)** : Chaque séjour actif possède un compte (Folio) qui additionne : (Prix Nuitée/Passage - Acompte) + Toutes les commandes Bar & Restaurant transférées sur cette chambre. Au Check-out, le client règle le solde final.

### B. Pôle Bar & Restaurant (POS, Serveuses, Stocks & QR Code)
- **Traçabilité des Serveuses** : Toute commande (prise au comptoir ou issue d'un scan QR Code) DOIT être rattachée à une serveuse active (ex: Awa, Chantal, Clarisse, Marie) pour calculer le rendement par serveuse et identifier la responsable en cas d'impayé.
- **Modes de règlement au POS** :
  1. `Paiement Immédiat - Espèces`
  2. `Paiement Immédiat - Mobile Money` (avec sous-choix : Wave, Orange Money, MTN MoMo)
  3. `Transfert sur Note de Chambre` (Uniquement vers l'une des 5 chambres ayant un statut `OCCUPEE_NUITEE` ou `OCCUPEE_PASSAGE_3H`).
- **Règle d'Or Stock BAR (Boissons)** : Suivi à la bouteille près. **BLOCAGE STRICT DE LA VENTE SI STOCK == 0**. Le produit apparaît grisé avec le badge "Rupture de stock" aussi bien sur l'écran de la caissière que sur le téléphone du client (Menu QR).
- **Règle d'Or Stock RESTAURANT (Cuisine)** : Double mécanique :
  1. **Produits Phares (Congélateur/Réserve)** : Suivi unitaire des matières premières clés (`Poulets entiers`, `Poissons Carpes`, `Poissons Machoiron`, `Portions de Viande/Choukouya`). Chaque vente d'un plat (ex: "Poulet Braisé Entier" ou "Kedjenou de Poulet") décrémente automatiquement le stock du produit phare lié. Si le produit phare est à 0, le plat est bloqué à la vente.
  2. **Achats du Marché** : Les accompagnements et condiments (Attiéké, Alloco, Riz, Huile, Piment, Oignons, Gaz) sont enregistrés globalement en tant que Sorties dans le module Dépenses.

### C. Pôle Salle de Cérémonie (Mariage, Dot, Baptême, Anniversaire)
- **Moteur de Devis & Facturation Dynamique** :
  - Forfait Location de base obligatoire : `50 000 F` (inclut automatiquement `50 couverts`).
  - Couverts supplémentaires au-delà de 50 :
    - Tarif Couvert Ordinaire supplémentaire : `1 000 F / unité`.
    - Tarif Couvert VIP supplémentaire : `1 500 F / unité`.
  - Prestations sur mesure (Devis) : Lignes personnalisables pour le Forfait Restauration/Buffet et le Forfait Boissons.
- **Suivi financier** : Calendrier dédié, gestion des acomptes multiples (ex: 1er acompte de réservation, 2e acompte, solde) et génération de Devis/Facture Proforma A4.

### D. Pôle Trésorerie, Séparation des Caisses, Dépenses & Clôture
- **Séparation Virtuelle des Caisses** : Le système maintient deux coffres virtuels étanches :
  - `Caisse Espèces Physique`
  - `Caisse Mobile Money` (Wave / Orange / MTN)
- **Gestion des Sorties (Dépenses opérationnelles)** :
  - Choix obligatoire de la source des fonds : `Pris dans la caisse du jour` (déduit automatiquement le montant attendu lors de la clôture du soir) OU `Pris dans le Fonds de Caisse séparé (Menues dépenses)`.
  - Champ d'ajout de photo du reçu/facture (via caméra smartphone ou fichier) présent mais **FACULTATIF**.
- **Procédure de Clôture de Caisse (Arrêté de fin de service)** :
  - Le Gérant Hôtel et la Caissière doivent clôturer leur service avant de remettre l'argent.
  - Calcul automatique : `Total Encaissements Espèces du service - Dépenses prises dans la caisse du jour = Espèces Attendues`.
  - L'employé saisit le montant réel remis. Le système calcule l'écart (`Manquant` en rouge ou `Excédent`) et verrouille la session.
- **Reçus & Factures Numériques WhatsApp** :
  - Génération de reçus numériques élégants avec l'en-tête RHR (Résidence Hôtel Le Rêve de M'Batto), exportables en PDF/Impression et partageables en 1 clic sur WhatsApp via `https://wa.me/` avec message formaté professionnellement.