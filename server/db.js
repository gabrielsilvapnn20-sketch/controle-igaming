import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'igaming.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    minha_participacao REAL NOT NULL DEFAULT 80,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS config_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    minha_participacao REAL NOT NULL,
    valor_anterior REAL,
    alterado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS influenciadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    instagram TEXT,
    status TEXT NOT NULL DEFAULT 'negociando',      -- negociando | fechado | pausado
    data_inicio TEXT,
    observacoes TEXT,
    modelo_pagamento TEXT NOT NULL,                  -- stories | fixo | percentual
    percentual_comissao REAL,                        -- se percentual
    valor_fixo REAL,                                 -- se fixo
    recorrencia TEXT,                                -- mensal | quinzenal | semanal (se fixo)
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lancamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    influenciador_id INTEGER NOT NULL,
    data TEXT NOT NULL,                              -- ISO (YYYY-MM-DD)
    cadastros INTEGER NOT NULL DEFAULT 0,
    depositos TEXT NOT NULL DEFAULT '[]',            -- JSON array de valores individuais
    receita_bruta REAL NOT NULL DEFAULT 0,
    percentual_aplicado REAL NOT NULL,               -- snapshot histórico
    receita_liquida REAL NOT NULL DEFAULT 0,         -- calculado no servidor
    gastos_extras REAL NOT NULL DEFAULT 0,
    valor_pago REAL NOT NULL DEFAULT 0,              -- calculado conforme o modelo
    quantidade_stories INTEGER,                      -- se stories
    valor_cobrado REAL,                              -- se stories
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    FOREIGN KEY (influenciador_id) REFERENCES influenciadores(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_lanc_influ ON lancamentos(influenciador_id);
  CREATE INDEX IF NOT EXISTS idx_lanc_data ON lancamentos(data);
`);

// Config inicial (singleton)
const cfg = db.prepare('SELECT * FROM config WHERE id = 1').get();
if (!cfg) {
  db.prepare('INSERT INTO config (id, minha_participacao, atualizado_em) VALUES (1, 80, ?)').run(
    new Date().toISOString(),
  );
}

export default db;
