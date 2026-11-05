import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { videos, scenarios } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || resolve(here, '../data/spearshield.db');
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt] = stored.split(':');
  return hashPassword(password, salt) === stored;
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
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK (answer IN ('phishing','legit','unknown')),
  correct INTEGER NOT NULL,
  campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scenario_ids TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function seed() {
  const hasUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0;
  if (!hasUsers) {
    const ins = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)');
    ins.run('Colaborador Teste', 'colab@empresa.com', hashPassword('123'), 'colaborador');
    ins.run('Gestor Teste', 'gestor@empresa.com', hashPassword('123'), 'gestor');
  }
  // Upsert: mantém o conteúdo sincronizado com o seed sem apagar progresso/tentativas.
  const insV = db.prepare(
    `INSERT INTO videos (id,title,description,file,points_title,key_points) VALUES (?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description,
       file=excluded.file, points_title=excluded.points_title, key_points=excluded.key_points`
  );
  for (const v of videos)
    insV.run(v.id, v.title, v.description, v.file, v.pointsTitle, JSON.stringify(v.keyPoints));
  const insS = db.prepare(
    `INSERT INTO scenarios
     (id,kind,sender_name,sender_email,subject,time,body,link_label,link_url,hint,success_text,error_text,red_flags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, sender_name=excluded.sender_name,
       sender_email=excluded.sender_email, subject=excluded.subject, time=excluded.time, body=excluded.body,
       link_label=excluded.link_label, link_url=excluded.link_url, hint=excluded.hint,
       success_text=excluded.success_text, error_text=excluded.error_text, red_flags=excluded.red_flags`
  );
  for (const s of scenarios)
    insS.run(s.id, s.kind, s.senderName, s.senderEmail, s.subject, s.time, s.body, s.linkLabel ?? null,
      s.linkUrl ?? null, s.hint, s.successText, s.errorText, JSON.stringify(s.redFlags));
}
seed();
