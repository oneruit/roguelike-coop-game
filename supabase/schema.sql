-- ============================================================================
-- OUTLAW ROYALE // SUPABASE GAME BALANCE SCHEMA & POLICIES
-- ============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query).
-- It creates the table, sets up secure Row Level Security (RLS) to prevent unauthorized mutations,
-- enables Supabase Realtime so game clients receive live balance updates,
-- and seeds the initial reference balance from BALANCE_REFERENCE.md.

-- 1. Create table
CREATE TABLE IF NOT EXISTS game_balance (
  id TEXT PRIMARY KEY,                       -- e.g. 'weapon:fireball', 'hero:ronin'
  category TEXT NOT NULL,                    -- 'weapon' | 'hero' | 'monster' | 'boss' | 'global'
  key TEXT NOT NULL,                         -- 'fireball', 'ronin', 'coyote', etc.
  name TEXT NOT NULL,                        -- Human readable name
  description TEXT,                          -- Optional description
  data JSONB NOT NULL,                       -- Balance stats payload
  version INT NOT NULL DEFAULT 1,            -- Incremented upon each change
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'admin'
);

-- Index on category and key
CREATE INDEX IF NOT EXISTS idx_game_balance_cat_key ON game_balance (category, key);

-- 2. Security: Enable Row Level Security (RLS)
ALTER TABLE game_balance ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if re-running
DROP POLICY IF EXISTS "Allow public read access" ON game_balance;
DROP POLICY IF EXISTS "Allow service_role full access" ON game_balance;

-- Policy 1: Public Read-Only Access
-- Allows the game client using the public `anon` key to SELECT and subscribe to balance.
CREATE POLICY "Allow public read access"
  ON game_balance
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 2: Strictly Protected Write Access
-- Prevents accidental or rogue client updates. ONLY the backend / local admin panel
-- utilizing the `service_role` key can INSERT, UPDATE, or DELETE rows.
CREATE POLICY "Allow service_role full access"
  ON game_balance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Enable Supabase Realtime replication on game_balance table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'game_balance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_balance;
  END IF;
END $$;

-- 4. Initial Seed from BALANCE_REFERENCE.md
INSERT INTO game_balance (id, category, key, name, description, data)
VALUES
  -- --------------------------------------------------------------------------
  -- WEAPONS (13 types)
  -- --------------------------------------------------------------------------
  ('weapon:fireball', 'weapon', 'fireball', 'Огненный Шар', 'Падающий с неба огненный метеор с детонацией', '{
    "damage": 55,
    "cooldown": 1.35,
    "damagePerLevel": 10,
    "maxLevel": 20,
    "range": 22,
    "explosionRadius": 2.5,
    "fallSpeed": 28,
    "count": 1
  }'::jsonb),

  ('weapon:bow', 'weapon', 'bow', 'Охотничий Лук', 'Высокоскоростные стрелы с пробитием', '{
    "damage": 26,
    "cooldown": 0.85,
    "damagePerLevel": 6,
    "maxLevel": 20,
    "speed": 24,
    "pierce": 2,
    "count": 1
  }'::jsonb),

  ('weapon:kukri', 'weapon', 'kukri', 'Нож Кукри', 'Серийные броски вращающихся клинков', '{
    "damage": 12,
    "cooldown": 0.65,
    "damagePerLevel": 3,
    "maxLevel": 20,
    "count": 2,
    "pierce": 1
  }'::jsonb),

  ('weapon:orbiting_barrier', 'weapon', 'orbiting_barrier', 'Коса Жнеца', 'Вращающиеся косы со стакающимся кровотечением', '{
    "damage": 4,
    "cooldown": 0.0,
    "damagePerLevel": 1,
    "maxLevel": 20,
    "bleedDps": 8,
    "bleedDuration": 3.0,
    "orbitRadius": 2.5,
    "orbitSpeed": 3.8,
    "count": 2
  }'::jsonb),

  ('weapon:holy_aura', 'weapon', 'holy_aura', 'Огненное Кольцо', 'Анимированная аура пламени с периодическим тиком', '{
    "damage": 16,
    "cooldown": 0.50,
    "damagePerLevel": 4,
    "maxLevel": 20,
    "explosionRadius": 3.5
  }'::jsonb),

  ('weapon:katana_slash', 'weapon', 'katana_slash', 'Рассекающий Клинок', 'Дуговой силовой рубящий удар', '{
    "damage": 25,
    "cooldown": 0.60,
    "damagePerLevel": 6,
    "maxLevel": 20,
    "explosionRadius": 3.8
  }'::jsonb),

  ('weapon:whirlwind_slash', 'weapon', 'whirlwind_slash', 'Багровый Вихрь', 'Быстрый парный вихревой взмах', '{
    "damage": 16,
    "cooldown": 0.42,
    "damagePerLevel": 4,
    "maxLevel": 20,
    "explosionRadius": 3.6
  }'::jsonb),

  ('weapon:greatsword', 'weapon', 'greatsword', 'Двуручный Меч', 'Тяжелый круговой удар с огромной зоной поражения', '{
    "damage": 32,
    "cooldown": 0.70,
    "damagePerLevel": 7,
    "maxLevel": 20,
    "explosionRadius": 4.2
  }'::jsonb),

  ('weapon:flail', 'weapon', 'flail', 'Боевой Цеп', 'Физический контроль толпы с сильным отбросом мобов', '{
    "damage": 20,
    "cooldown": 0.52,
    "damagePerLevel": 5,
    "maxLevel": 20,
    "explosionRadius": 3.9,
    "knockback": 0.35
  }'::jsonb),

  ('weapon:astral_staff', 'weapon', 'astral_staff', 'Звёздный Посох', 'Магические астральные сферы веером', '{
    "damage": 22,
    "cooldown": 0.65,
    "damagePerLevel": 5,
    "maxLevel": 20,
    "range": 22,
    "speed": 16,
    "count": 1,
    "pierce": 2
  }'::jsonb),

  ('weapon:chakram', 'weapon', 'chakram', 'Танцующий Чакрам', 'Возвращающийся бумеранг по эллиптической дуге', '{
    "damage": 20,
    "cooldown": 0.70,
    "damagePerLevel": 4,
    "maxLevel": 20,
    "range": 20,
    "speed": 14.5,
    "count": 1
  }'::jsonb),

  ('weapon:lightning_strike', 'weapon', 'lightning_strike', 'Удар Молнии', 'Грозовой вертикальный разряд с небес с АОЕ сплешем', '{
    "damage": 45,
    "cooldown": 1.20,
    "damagePerLevel": 8,
    "maxLevel": 20,
    "range": 22,
    "splashRadius": 2.4,
    "count": 1
  }'::jsonb),

  ('weapon:ice_spike', 'weapon', 'ice_spike', 'Ледяной Шип', 'Пронзающие ледяные пики из-под земли', '{
    "damage": 38,
    "cooldown": 1.10,
    "damagePerLevel": 7,
    "maxLevel": 20,
    "range": 18,
    "splashRadius": 2.0,
    "count": 1
  }'::jsonb),

  -- --------------------------------------------------------------------------
  -- HEROES (6 heroes)
  -- --------------------------------------------------------------------------
  ('hero:ronin', 'hero', 'ronin', 'Рен (Ронин)', 'Сбалансированный боец ближнего боя с вихревой круговой зачисткой', '{
    "maxHp": 115,
    "baseSpeed": 8.6,
    "damageMultiplier": 1.35,
    "startingWeapon": "whirlwind_slash"
  }'::jsonb),

  ('hero:valkyrie', 'hero', 'valkyrie', 'Каэла (Валькирия)', 'Сверхживучий танк с максимальным разовым уроном', '{
    "maxHp": 135,
    "baseSpeed": 8.2,
    "damageMultiplier": 1.45,
    "startingWeapon": "greatsword"
  }'::jsonb),

  ('hero:flail', 'hero', 'flail', 'Бригитта', 'Физический контроль толпы с сильным отбрасыванием мобов', '{
    "maxHp": 125,
    "baseSpeed": 8.5,
    "damageMultiplier": 1.40,
    "startingWeapon": "flail"
  }'::jsonb),

  ('hero:sorceress', 'hero', 'sorceress', 'Ария (Чародейка)', 'Дальнобойный маг с пробивающими веерными зарядами', '{
    "maxHp": 105,
    "baseSpeed": 8.8,
    "damageMultiplier": 1.30,
    "startingWeapon": "astral_staff"
  }'::jsonb),

  ('hero:chakram', 'hero', 'chakram', 'Кира', 'Мобильный скирмишер с рикошетящими бумерангами сквозь толпу', '{
    "maxHp": 115,
    "baseSpeed": 8.7,
    "damageMultiplier": 1.35,
    "startingWeapon": "chakram"
  }'::jsonb),

  ('hero:archer', 'hero', 'archer', 'Эльф лучник', 'Сверхбыстрый снайпер с дальнобойными пробивающими стрелами', '{
    "maxHp": 110,
    "baseSpeed": 8.9,
    "damageMultiplier": 1.35,
    "startingWeapon": "bow"
  }'::jsonb),

  -- --------------------------------------------------------------------------
  -- MONSTERS (8 types)
  -- --------------------------------------------------------------------------
  ('monster:coyote', 'monster', 'coyote', 'Кровожадный койот', 'Стартовый стайный моб, бежит напрямую к герою', '{
    "hp": 48,
    "speed": 5.4,
    "damage": 8
  }'::jsonb),

  ('monster:crawler', 'monster', 'crawler', 'Ползучая тварь', 'Быстрый преследователь с низким HP', '{
    "hp": 40,
    "speed": 6.0,
    "damage": 10
  }'::jsonb),

  ('monster:cactus', 'monster', 'cactus', 'Кактусовый зомби', 'Медленный плотный зомби', '{
    "hp": 88,
    "speed": 3.5,
    "damage": 14
  }'::jsonb),

  ('monster:skeleton', 'monster', 'skeleton', 'Бандит-скелет', 'Среднеуровневый костяной боец', '{
    "hp": 110,
    "speed": 3.8,
    "damage": 16
  }'::jsonb),

  ('monster:ghost', 'monster', 'ghost', 'Призрак ковбоя', 'Пролетает сквозь любые препятствия', '{
    "hp": 140,
    "speed": 4.0,
    "damage": 18
  }'::jsonb),

  ('monster:scorpion', 'monster', 'scorpion', 'Скорпион-ползун', 'Крепкий танк первой линии', '{
    "hp": 190,
    "speed": 3.2,
    "damage": 22
  }'::jsonb),

  ('monster:brute', 'monster', 'brute', 'Пустынный громила', 'Тяжёлый бронированный монстр', '{
    "hp": 350,
    "speed": 2.6,
    "damage": 28
  }'::jsonb),

  ('monster:bison', 'monster', 'bison', 'Белый бизон-убийца', 'Быстрый смертоносный танк (чардж-атаки)', '{
    "hp": 720,
    "speed": 4.8,
    "damage": 35
  }'::jsonb),

  -- --------------------------------------------------------------------------
  -- BOSSES (2 types)
  -- --------------------------------------------------------------------------
  ('boss:boss', 'boss', 'boss', 'Кровавый демон', 'Базовый 5-минутный босс 1 тира', '{
    "hp": 7600,
    "speed": 2.4,
    "damage": 45
  }'::jsonb),

  ('boss:hydra', 'boss', 'hydra', 'Трехглавая гидра', 'Древняя трехглавая гидра 2 тира', '{
    "hp": 28000,
    "speed": 2.3,
    "damage": 65
  }'::jsonb),

  -- --------------------------------------------------------------------------
  -- GLOBAL SETTINGS
  -- --------------------------------------------------------------------------
  ('global:combat', 'global', 'combat', 'Глобальные боевые параметры', 'Базовые параметры рывка, крита и магнита', '{
    "dashCooldown": 2.5,
    "dashDuration": 0.22,
    "baseCritChance": 0.05,
    "baseCritDamageMult": 2.0,
    "basePickupRadius": 3.5,
    "maxArmorReduction": 0.75,
    "goldGemChanceNormal": 0.01,
    "goldGemChanceBoss": 0.40
  }'::jsonb)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  data = EXCLUDED.data,
  updated_at = NOW(),
  version = game_balance.version + 1;
