-- =============================================
-- GENESIS INVENTAIRE — Setup complet
-- Exécuter dans Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'unité(s)',
  min_stock NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_logs (
  id BIGSERIAL PRIMARY KEY,
  inventory_id BIGINT REFERENCES inventory(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('restock', 'use', 'adjust')),
  quantity NUMERIC(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access inventory" ON inventory FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public access stock_logs" ON stock_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- =============================================
-- Inventaire initial Genesis
-- =============================================

-- SEC
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Farine T55', 'SEC', 10, 'kg', 3),
  ('Huile 25L', 'SEC', 2, 'bidon(s)', 1),
  ('Lait', 'SEC', 12, 'L', 4),
  ('Oeuf', 'SEC', 60, 'unité(s)', 20),
  ('Miel', 'SEC', 3, 'pot(s)', 1),
  ('Sel', 'SEC', 5, 'kg', 1),
  ('Épices', 'SEC', 4, 'pot(s)', 1),
  ('Bueno', 'SEC', 10, 'paquet(s)', 3),
  ('Bueno White', 'SEC', 10, 'paquet(s)', 3),
  ('Oreo', 'SEC', 8, 'paquet(s)', 3),
  ('Speculoos', 'SEC', 8, 'paquet(s)', 3);

-- FRAIS
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Yaourt nature', 'FRAIS', 20, 'pot(s)', 6),
  ('Beurre', 'FRAIS', 5, 'plaquette(s)', 2),
  ('Crème fraîche épaisse 15%', 'FRAIS', 6, 'pot(s)', 2),
  ('Fromage fondu', 'FRAIS', 8, 'portion(s)', 3),
  ('Emmental râpé', 'FRAIS', 4, 'sachet(s)', 2),
  ('Mozza râpé', 'FRAIS', 4, 'sachet(s)', 2),
  ('Cheddar tranche', 'FRAIS', 5, 'paquet(s)', 2),
  ('Boursin', 'FRAIS', 4, 'pièce(s)', 1),
  ('Sauce cheddar', 'FRAIS', 3, 'bouteille(s)', 1),
  ('Chantilly', 'FRAIS', 4, 'bombe(s)', 1);

-- SURGELÉ
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Tranche raclette', 'SURGELÉ', 6, 'paquet(s)', 2),
  ('Chèvre rondelle', 'SURGELÉ', 5, 'paquet(s)', 2),
  ('Bacon de boeuf', 'SURGELÉ', 4, 'paquet(s)', 2),
  ('Tenders nature', 'SURGELÉ', 8, 'sachet(s)', 3),
  ('Glace vanille', 'SURGELÉ', 3, 'bac(s)', 1);

-- VIANDE
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Viande hachée', 'VIANDE', 10, 'kg', 3),
  ('Filet de poulet', 'VIANDE', 8, 'kg', 3);

-- EMBALLAGE / DIVERS
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Stick de sauce', 'EMBALLAGE', 200, 'unité(s)', 50),
  ('Sac kraft', 'EMBALLAGE', 150, 'unité(s)', 40),
  ('Boîte à sandwich kraft', 'EMBALLAGE', 100, 'unité(s)', 30),
  ('Plastique', 'EMBALLAGE', 5, 'rouleau(x)', 2),
  ('Petit sachet sel', 'EMBALLAGE', 200, 'unité(s)', 50),
  ('Cuillères en plastique', 'EMBALLAGE', 150, 'unité(s)', 40),
  ('Fourchettes en plastique', 'EMBALLAGE', 150, 'unité(s)', 40),
  ('Boîte tarte daim', 'EMBALLAGE', 30, 'unité(s)', 10),
  ('Aluminium', 'EMBALLAGE', 4, 'rouleau(x)', 1),
  ('Papier sulfurisé naan', 'EMBALLAGE', 3, 'rouleau(x)', 1),
  ('Papier plateau', 'EMBALLAGE', 200, 'feuille(s)', 50),
  ('Cellophane', 'EMBALLAGE', 3, 'rouleau(x)', 1),
  ('Sopalin', 'EMBALLAGE', 6, 'rouleau(x)', 2),
  ('Serviettes', 'EMBALLAGE', 300, 'unité(s)', 80),
  ('Gobelet milkshake', 'EMBALLAGE', 100, 'unité(s)', 30),
  ('Couvercle milkshake', 'EMBALLAGE', 100, 'unité(s)', 30),
  ('Paille', 'EMBALLAGE', 150, 'unité(s)', 40),
  ('Spray nettoyant', 'EMBALLAGE', 4, 'bouteille(s)', 1);

-- SAUCE
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Ketchup', 'SAUCE', 5, 'bouteille(s)', 2),
  ('Mayo', 'SAUCE', 5, 'bouteille(s)', 2),
  ('Algérienne', 'SAUCE', 4, 'bouteille(s)', 2),
  ('Samouraï', 'SAUCE', 4, 'bouteille(s)', 2),
  ('Andalouse', 'SAUCE', 4, 'bouteille(s)', 2),
  ('Hannibal', 'SAUCE', 3, 'bouteille(s)', 1),
  ('Blanche', 'SAUCE', 4, 'bouteille(s)', 2),
  ('BBQ', 'SAUCE', 4, 'bouteille(s)', 2),
  ('Biggy', 'SAUCE', 3, 'bouteille(s)', 1),
  ('Poivre', 'SAUCE', 3, 'bouteille(s)', 1),
  ('Américaine', 'SAUCE', 3, 'bouteille(s)', 1),
  ('Harissa', 'SAUCE', 3, 'bouteille(s)', 1);

-- LÉGUMES
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Salade iceberg', 'LÉGUMES', 6, 'pièce(s)', 2),
  ('Tomate', 'LÉGUMES', 8, 'kg', 3),
  ('Oignon rouges', 'LÉGUMES', 5, 'kg', 2),
  ('Olives vertes découpées', 'LÉGUMES', 3, 'bocal(aux)', 1);

-- DESSERTS
INSERT INTO inventory (name, category, quantity, unit, min_stock) VALUES
  ('Tarte au daim', 'DESSERTS', 4, 'pièce(s)', 1),
  ('Tiramisu bueno', 'DESSERTS', 6, 'portion(s)', 2),
  ('Tiramisu speculoos', 'DESSERTS', 6, 'portion(s)', 2);
