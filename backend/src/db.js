import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  videos, scenarios, testUsers, demoEmployees, demoAttempts, demoVideoProgress, demoCampaigns
} from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || resolve(here, '../data/spearshield.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

// Comparação em tempo constante para não vazar informação por timing.
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Hash usado quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos.
export const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

// Executa várias instruções de forma atômica.
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('colaborador','gestor'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file TEXT NOT NULL,
  points_title TEXT NOT NULL,
  key_points TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS video_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, video_id)
);
CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('phishing','legit')),
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  time TEXT NOT NULL,
  body TEXT NOT NULL,
  link_label TEXT,
  link_url TEXT,
  hint TEXT NOT NULL,
  success_text TEXT NOT NULL,
  error_text TEXT NOT NULL,
  red_flags TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scenario_ids TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK (answer IN ('phishing','legit','unknown')),
  correct INTEGER NOT NULL,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// ---------- Migrações: colunas novas em bancos já existentes ----------
function addColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
addColumn('users', 'department', 'TEXT');
addColumn('users', 'title', 'TEXT');
addColumn('videos', 'level', "TEXT NOT NULL DEFAULT ''");
addColumn('scenarios', 'level', "TEXT NOT NULL DEFAULT 'Básico'");
addColumn('scenarios', 'themes', "TEXT NOT NULL DEFAULT '[]'");
addColumn('scenarios', 'preview', "TEXT NOT NULL DEFAULT ''");
addColumn('attempts', 'time_ms', 'INTEGER');
addColumn('attempts', 'hint_used', 'INTEGER NOT NULL DEFAULT 0');
addColumn('campaigns', 'department', 'TEXT');
addColumn('campaigns', 'level', "TEXT NOT NULL DEFAULT 'Intermediário'");

// Uma resposta por usuário e cenário em cada contexto (treino livre = campanha 0).
// Remove duplicatas de bancos antigos antes de criar o índice único.
db.exec(`
DELETE FROM attempts WHERE id NOT IN (
  SELECT MIN(id) FROM attempts GROUP BY user_id, scenario_id, IFNULL(campaign_id, 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_per_context
  ON attempts (user_id, scenario_id, IFNULL(campaign_id, 0));
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, read);
`);

// ---------- Conteúdo (sempre sincronizado com o seed) ----------
function seedContent() {
  const insV = db.prepare(
    `INSERT INTO videos (id,title,description,level,file,points_title,key_points) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, level=excluded.level,
       file=excluded.file, points_title=excluded.points_title, key_points=excluded.key_points`
  );
  for (const v of videos)
    insV.run(v.id, v.title, v.description, v.level, v.file, v.pointsTitle, JSON.stringify(v.keyPoints));

  const insS = db.prepare(
    `INSERT INTO scenarios
     (id,kind,level,themes,sender_name,sender_email,subject,preview,time,body,link_label,link_url,hint,success_text,error_text,red_flags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, level=excluded.level, themes=excluded.themes,
       sender_name=excluded.sender_name, sender_email=excluded.sender_email, subject=excluded.subject,
       preview=excluded.preview, time=excluded.time, body=excluded.body, link_label=excluded.link_label,
       link_url=excluded.link_url, hint=excluded.hint, success_text=excluded.success_text,
       error_text=excluded.error_text, red_flags=excluded.red_flags`
  );
  for (const s of scenarios)
    insS.run(s.id, s.kind, s.level, JSON.stringify(s.themes), s.senderName, s.senderEmail, s.subject, s.preview,
      s.time, s.body, s.linkLabel ?? null, s.linkUrl ?? null, s.hint, s.successText, s.errorText,
      JSON.stringify(s.redFlags));
}

// ---------- Dados de demonstração (somente fora de produção) ----------
function seedDemo() {
  const upsertUser = db.prepare(
    `INSERT INTO users (name, email, password, role, department, title) VALUES (?,?,?,?,?,?)
     ON CONFLICT(email) DO UPDATE SET
       department = COALESCE(users.department, excluded.department),
       title = COALESCE(users.title, excluded.title)`
  );
  for (const u of testUsers) upsertUser.run(u.name, u.email, hashPassword('123'), u.role, u.department, u.title);

  // Os colaboradores fictícios e o histórico deles só são criados uma vez.
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?');
  if (demoEmployees.some((e) => exists.get(e.email))) return;

  for (const e of demoEmployees)
    upsertUser.run(e.name, e.email, hashPassword(randomBytes(24).toString('hex')), 'colaborador', e.department, e.title);

  const idOf = (email) => db.prepare('SELECT id FROM users WHERE email = ?').get(email).id;
  const kindOf = (id) => scenarios.find((s) => s.id === id).kind;
  const insA = db.prepare(
    `INSERT OR IGNORE INTO attempts (user_id, scenario_id, answer, correct, campaign_id, time_ms, hint_used, created_at)
     VALUES (?,?,?,?,?,?,?, datetime('now', ?))`
  );
  for (const [email, sid, answer, sec, hint, daysAgo] of demoAttempts)
    insA.run(idOf(email), sid, answer, answer === kindOf(sid) ? 1 : 0, null, sec * 1000, hint, `-${daysAgo} days`);

  const insP = db.prepare('INSERT OR IGNORE INTO video_progress (user_id, video_id) VALUES (?, ?)');
  for (const [email, ids] of demoVideoProgress) for (const vid of ids) insP.run(idOf(email), vid);

  const gestorId = idOf('gestor@empresa.com');
  const insC = db.prepare(
    `INSERT INTO campaigns (name, description, scenario_ids, created_by, department, level, created_at)
     VALUES (?,?,?,?,?,?, datetime('now', '-14 days'))`
  );
  for (const c of demoCampaigns) {
    const cid = insC.run(c.name, c.description, JSON.stringify(c.scenarioIds), gestorId, c.department, c.level)
      .lastInsertRowid;
    for (const [email, sid, answer, sec] of c.attempts)
      insA.run(idOf(email), sid, answer, answer === kindOf(sid) ? 1 : 0, cid, sec * 1000, 0, '-3 days');
  }
}

transaction(() => {
  seedContent();
  if (process.env.NODE_ENV !== 'production') seedDemo();
});
