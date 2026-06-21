-- JH Corporation - Module de gestion de stock
-- Schema initial complet

-- Articles : catalogue unique avec double role (vendable / utilise en recette)
-- Pas de prix : ce module est une gestion de stock pure, sans dimension financiere
create table articles (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  designation text not null,
  code_barres text,
  categorie text,
  unite text not null,
  stock_actuel numeric not null default 0,
  stock_minimum numeric not null default 0,
  photo_url text,
  vendable_directement boolean not null default false,
  utilise_en_recette boolean not null default false,
  statut text not null default 'actif',
  created_at timestamptz default now()
);

-- Recettes : un article fini -> liste d'ingredients
create table recettes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) not null,
  ingredient_id uuid references articles(id) not null,
  quantite_par_unite numeric not null
);

-- Profils utilisateurs (complement de Supabase Auth)
create table profils (
  id uuid primary key references auth.users(id),
  nom text,
  telephone text unique,
  role text not null check (role in ('admin','comptable','magasinier')),
  created_at timestamptz default now()
);

-- Bons d'entree
create table bons_entree (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  date date not null default current_date,
  utilisateur_id uuid references profils(id),
  observations text,
  statut text not null default 'valide',
  created_at timestamptz default now()
);

create table lignes_bon_entree (
  id uuid primary key default gen_random_uuid(),
  bon_entree_id uuid references bons_entree(id) not null,
  article_id uuid references articles(id) not null,
  quantite numeric not null
);

-- Productions
create table productions (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  date date not null default current_date,
  article_id uuid references articles(id) not null,
  quantite_produite numeric not null,
  casses numeric default 0,
  responsable_id uuid references profils(id),
  observations text,
  created_at timestamptz default now()
);

-- Commandes Glovo importees par le comptable (fichier Excel)
create table commandes (
  id uuid primary key default gen_random_uuid(),
  numero_bc text unique not null,
  date_livraison date not null,
  statut text not null default 'en_attente' check (statut in ('en_attente','utilisee','annulee')),
  bon_livraison_id uuid,
  importee_par uuid references profils(id),
  created_at timestamptz default now()
);

create table lignes_commande (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id) not null,
  sku text not null,
  nom_produit text not null,
  quantite_commandee numeric not null
);

-- Bons de livraison : cycle a quatre etapes
-- brouillon -> valide (deduction stock) -> ajuste (casse eventuelle) -> confirme (visible comptable)
create table bons_livraison (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  commande_id uuid references commandes(id),
  numero_bc text,
  date_livraison date not null,
  client text not null default 'Glovo',
  statut text not null default 'valide' check (statut in ('brouillon','valide','ajuste','confirme','annule')),
  responsable_id uuid references profils(id),
  pdf_url text,
  created_at timestamptz default now()
);

alter table commandes add constraint fk_commande_bl foreign key (bon_livraison_id) references bons_livraison(id);

create table lignes_bon_livraison (
  id uuid primary key default gen_random_uuid(),
  bon_livraison_id uuid references bons_livraison(id) not null,
  article_id uuid references articles(id) not null,
  sku text not null,
  nom_produit text not null,
  quantite_commandee numeric not null,
  quantite_livree numeric not null default 0,
  casse numeric not null default 0,
  observation text
);

-- Inventaires : flux a deux etapes, magasinier compte puis comptable valide
create table inventaires (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null,
  date date not null default current_date,
  magasinier_id uuid references profils(id),
  comptable_id uuid references profils(id),
  statut text not null default 'brouillon' check (statut in ('brouillon','soumis','valide')),
  created_at timestamptz default now()
);

create table lignes_inventaire (
  id uuid primary key default gen_random_uuid(),
  inventaire_id uuid references inventaires(id) not null,
  article_id uuid references articles(id) not null,
  stock_theorique numeric not null,
  stock_compte numeric,
  ecart numeric generated always as (stock_compte - stock_theorique) stored
);

-- Historique unifie des mouvements (source de verite traçabilite)
create table mouvements_stock (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) not null,
  type text not null check (type in ('entree','sortie_production','sortie_bl','casse_bl','ajustement_inventaire')),
  quantite numeric not null,
  reference_document text,
  utilisateur_id uuid references profils(id),
  date timestamptz default now()
);

-- Index utiles
create index idx_mouvements_article on mouvements_stock(article_id);
create index idx_mouvements_date on mouvements_stock(date);
create index idx_lignes_bl_bl on lignes_bon_livraison(bon_livraison_id);
create index idx_lignes_commande_commande on lignes_commande(commande_id);
create index idx_recettes_article on recettes(article_id);
