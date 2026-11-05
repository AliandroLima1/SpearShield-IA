import express from 'express';
import cors from 'cors';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, verifyPassword } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Vídeos das aulas (express.static suporta Range, necessário para seek no player)
app.use('/videos', express.static(resolve(dirname(fileURLToPath(import.meta.url)), '../videos')));

// ---------- helpers ----------
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const user = token
    ? db.prepare(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
      ).get(token)
    : null;
  if (!user) return res.status(401).json({ error: 'Não autenticado.' });
  req.user = user;
  req.token = token;
  next();
}

const onlyRole = (role) => (req, res, next) =>
  req.user.role === role ? next() : res.status(403).json({ error: 'Acesso restrito ao perfil ' + role + '.' });

const toScenarioPublic = (s) => ({
  id: s.id,
  senderName: s.sender_name,
  senderEmail: s.sender_email,
  subject: s.subject,
  time: s.time,
  body: s.body,
  linkLabel: s.link_label,
  linkUrl: s.link_url
});

function riskLevel(accuracy, attempts) {
  if (attempts === 0) return 'indefinido';
  if (accuracy >= 80) return 'baixo';
  if (accuracy >= 50) return 'médio';
  return 'alto';
}

function userStats(userId) {
  const a = db.prepare(
    `SELECT COUNT(*) AS total, COALESCE(SUM(correct),0) AS hits,
            COALESCE(SUM(answer='unknown'),0) AS unknowns
     FROM attempts WHERE user_id = ?`
  ).get(userId);
  const watched = db.prepare('SELECT COUNT(*) AS n FROM video_progress WHERE user_id = ?').get(userId).n;
  const totalVideos = db.prepare('SELECT COUNT(*) AS n FROM videos').get().n;
  const accuracy = a.total ? Math.round((a.hits / a.total) * 100) : 0;
  return {
    videosWatched: watched,
    videosTotal: totalVideos,
    videoProgress: totalVideos ? Math.round((watched / totalVideos) * 100) : 0,
    attempts: a.total,
    hits: a.hits,
    unknowns: a.unknowns,
    accuracy,
    risk: riskLevel(accuracy, a.total)
  };
}

// ---------- auth ----------
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password))
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/logout', auth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- dashboard ----------
app.get('/api/dashboard', auth, (req, res) => {
  res.json({ user: publicUser(req.user), stats: userStats(req.user.id) });
});

// ---------- videos ----------
app.get('/api/videos', auth, (req, res) => {
  const watched = new Set(
    db.prepare('SELECT video_id FROM video_progress WHERE user_id = ?').all(req.user.id).map((r) => r.video_id)
  );
  const list = db.prepare('SELECT * FROM videos ORDER BY id').all().map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    src: '/videos/' + encodeURIComponent(v.file),
    pointsTitle: v.points_title,
    keyPoints: JSON.parse(v.key_points),
    watched: watched.has(v.id)
  }));
  const done = list.filter((v) => v.watched).length;
  res.json({ videos: list, progress: list.length ? Math.round((done / list.length) * 100) : 0 });
});

app.post('/api/videos/:id/watch', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT 1 FROM videos WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Vídeo não encontrado.' });
  db.prepare('INSERT OR IGNORE INTO video_progress (user_id, video_id) VALUES (?, ?)').run(req.user.id, id);
  res.json({ ok: true });
});

app.delete('/api/videos/:id/watch', auth, (req, res) => {
  db.prepare('DELETE FROM video_progress WHERE user_id = ? AND video_id = ?').run(req.user.id, Number(req.params.id));
  res.json({ ok: true });
});

// ---------- simulador ----------
app.get('/api/scenarios', auth, (req, res) => {
  let rows = db.prepare('SELECT * FROM scenarios ORDER BY id').all();
  const campaignId = req.query.campaign ? Number(req.query.campaign) : null;
  if (campaignId) {
    const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!c) return res.status(404).json({ error: 'Campanha não encontrada.' });
    const ids = JSON.parse(c.scenario_ids);
    rows = rows.filter((r) => ids.includes(r.id));
  }
  res.json({ scenarios: rows.map(toScenarioPublic) });
});

app.get('/api/scenarios/:id/hint', auth, (req, res) => {
  const s = db.prepare('SELECT hint FROM scenarios WHERE id = ?').get(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Cenário não encontrado.' });
  res.json({ hint: s.hint });
});

app.post('/api/scenarios/:id/answer', auth, (req, res) => {
  const { answer, campaignId } = req.body || {};
  if (!['phishing', 'legit', 'unknown'].includes(answer))
    return res.status(400).json({ error: 'Resposta inválida.' });
  const s = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Cenário não encontrado.' });
  let cid = null;
  if (campaignId) {
    const c = db.prepare('SELECT id, scenario_ids FROM campaigns WHERE id = ?').get(Number(campaignId));
    if (c && JSON.parse(c.scenario_ids).includes(s.id)) cid = c.id;
  }
  const correct = answer === s.kind ? 1 : 0;
  db.prepare('INSERT INTO attempts (user_id, scenario_id, answer, correct, campaign_id) VALUES (?,?,?,?,?)')
    .run(req.user.id, s.id, answer, correct, cid);

  let title, text;
  if (answer === 'unknown') {
    title = 'Tudo bem ter dúvida!';
    text = (s.kind === 'phishing' ? 'Este cenário era um phishing. ' : 'Este cenário era uma mensagem legítima. ') + s.hint;
  } else if (correct) {
    title = 'Boa análise!';
    text = s.success_text;
  } else {
    title = 'Vamos revisar este sinal';
    text = s.error_text;
  }

  res.json({
    correct: !!correct,
    unknown: answer === 'unknown',
    kind: s.kind,
    title,
    text,
    redFlags: JSON.parse(s.red_flags)
  });
});

// ---------- campanhas ----------
function campaignView(c, userId) {
  const ids = JSON.parse(c.scenario_ids);
  const base = {
    id: c.id,
    name: c.name,
    description: c.description,
    scenarioIds: ids,
    createdAt: c.created_at
  };
  if (userId == null) {
    const s = db.prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(correct),0) AS hits, COUNT(DISTINCT user_id) AS participants
       FROM attempts WHERE campaign_id = ?`
    ).get(c.id);
    return { ...base, attempts: s.total, participants: s.participants,
      accuracy: s.total ? Math.round((s.hits / s.total) * 100) : 0 };
  }
  const done = db.prepare(
    'SELECT COUNT(DISTINCT scenario_id) AS n FROM attempts WHERE campaign_id = ? AND user_id = ?'
  ).get(c.id, userId).n;
  return { ...base, completed: done, total: ids.length };
}

app.get('/api/campaigns', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all();
  res.json({
    campaigns: rows.map((c) => campaignView(c, req.user.role === 'gestor' ? null : req.user.id))
  });
});

app.post('/api/campaigns', auth, onlyRole('gestor'), (req, res) => {
  const { name, description = '', scenarioIds } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100)
    return res.status(400).json({ error: 'Informe um nome de até 100 caracteres.' });
  if (typeof description !== 'string' || description.length > 500)
    return res.status(400).json({ error: 'Descrição muito longa (máx. 500).' });
  if (!Array.isArray(scenarioIds) || !scenarioIds.length)
    return res.status(400).json({ error: 'Selecione ao menos um cenário.' });
  const valid = db.prepare('SELECT id FROM scenarios').all().map((r) => r.id);
  const ids = [...new Set(scenarioIds.map(Number))];
  if (!ids.every((i) => valid.includes(i)))
    return res.status(400).json({ error: 'Cenário inválido.' });
  const r = db.prepare(
    'INSERT INTO campaigns (name, description, scenario_ids, created_by) VALUES (?,?,?,?)'
  ).run(name.trim(), description.trim(), JSON.stringify(ids), req.user.id);
  const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ campaign: campaignView(c, null) });
});

app.delete('/api/campaigns/:id', auth, onlyRole('gestor'), (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- painel do gestor ----------
app.get('/api/manager/overview', auth, onlyRole('gestor'), (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE role = 'colaborador' ORDER BY name").all();
  const employees = users.map((u) => ({ id: u.id, name: u.name, email: u.email, ...userStats(u.id) }));
  const withAttempts = employees.filter((e) => e.attempts > 0);
  const avgAccuracy = withAttempts.length
    ? Math.round(withAttempts.reduce((s, e) => s + e.accuracy, 0) / withAttempts.length)
    : 0;
  const avgVideo = employees.length
    ? Math.round(employees.reduce((s, e) => s + e.videoProgress, 0) / employees.length)
    : 0;
  res.json({
    summary: {
      employees: employees.length,
      avgAccuracy,
      avgVideoProgress: avgVideo,
      highRisk: employees.filter((e) => e.risk === 'alto').length,
      risk: riskLevel(avgAccuracy, withAttempts.length)
    },
    employees
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`SpearShield API em http://localhost:${port}`));
