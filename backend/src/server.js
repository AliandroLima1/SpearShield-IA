import express from 'express';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, verifyPassword, DUMMY_HASH, transaction } from './db.js';
import {
  initials, userStats, resilience, learnerLevel, recommendations, history, themeBreakdown, loadAttempts,
  parseCampaign, canJoinCampaign, campaignManagerView, campaignEmployeeView, departments, managerOverview
} from './stats.js';

const SESSION_HOURS = 8;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LEVELS = ['Básico', 'Intermediário', 'Avançado'];
const DEFAULT_NOTICE =
  'Sua gestão recomenda reforçar o treinamento de phishing: conclua as aulas pendentes e pratique no simulador.';

const app = express();
// Sem CORS: o frontend acessa a API pelo proxy do Vite (mesma origem).
app.use(express.json({ limit: '50kb' }));

// Vídeos das aulas (express.static suporta Range, necessário para seek no player)
app.use('/videos', express.static(resolve(dirname(fileURLToPath(import.meta.url)), '../videos')));

// ---------- helpers ----------
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  department: u.department, title: u.title, initials: initials(u.name)
});

// Converte para inteiro positivo; retorna null se inválido.
function toId(v) {
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
  return Number.isInteger(n) && n > 0 ? n : null;
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  const user = token
    ? db.prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.created_at > datetime('now', ?)`
      ).get(token, `-${SESSION_HOURS} hours`)
    : null;
  if (!user) return res.status(401).json({ error: 'Sessão inválida ou expirada. Entre novamente.' });
  req.user = user;
  req.token = token;
  next();
}

const onlyRole = (role) => (req, res, next) =>
  req.user.role === role ? next() : res.status(403).json({ error: 'Acesso restrito ao perfil ' + role + '.' });

const toScenarioPublic = (s) => ({
  id: s.id,
  level: s.level,
  senderName: s.sender_name,
  senderEmail: s.sender_email,
  subject: s.subject,
  preview: s.preview,
  time: s.time,
  body: s.body,
  linkLabel: s.link_label,
  linkUrl: s.link_url
});

// Feedback educativo. Só é enviado depois que o usuário respondeu o cenário.
function feedback(s, answer) {
  const correct = answer === s.kind;
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
  return { answer, correct, unknown: answer === 'unknown', kind: s.kind, title, text, redFlags: JSON.parse(s.red_flags) };
}

function getCampaign(id) {
  const c = id && db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  return c ? parseCampaign(c) : null;
}

// ---------- auth ----------
// Bloqueio simples em memória após falhas seguidas (por e-mail).
const loginFails = new Map();

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 200 || password.length > 200)
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const key = email.trim().toLowerCase();

  const f = loginFails.get(key);
  if (f && f.count >= LOGIN_MAX_FAILS && Date.now() < f.until)
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(key);
  const ok = verifyPassword(password, user ? user.password : DUMMY_HASH) && !!user;
  if (!ok) {
    const count = f && Date.now() < f.until ? f.count + 1 : 1;
    loginFails.set(key, { count, until: Date.now() + LOGIN_LOCK_MS });
    return res.status(401).json({ error: 'Credenciais inválidas. Tente novamente.' });
  }
  loginFails.delete(key);

  db.prepare("DELETE FROM sessions WHERE created_at <= datetime('now', ?)").run(`-${SESSION_HOURS} hours`);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/logout', auth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- visão geral do colaborador ----------
app.get('/api/dashboard', auth, onlyRole('colaborador'), (req, res) => {
  const uid = req.user.id;
  const stats = userStats(uid);
  const watched = new Set(db.prepare('SELECT video_id FROM video_progress WHERE user_id = ?').all(uid).map((r) => r.video_id));
  const lessons = db.prepare('SELECT id, title, description FROM videos ORDER BY id').all()
    .map((v) => ({ ...v, watched: watched.has(v.id) }));
  const next = db.prepare(
    `SELECT id, subject, level, sender_name FROM scenarios
     WHERE id NOT IN (SELECT scenario_id FROM attempts WHERE user_id = ? AND campaign_id IS NULL)
     ORDER BY id LIMIT 1`
  ).get(uid);
  const breakdown = themeBreakdown(loadAttempts([uid]));
  res.json({
    user: publicUser(req.user),
    stats,
    resilience: resilience(stats),
    lessons,
    nextScenario: next ? { id: next.id, subject: next.subject, level: next.level, sender: next.sender_name } : null,
    attention: breakdown.filter((t) => t.accuracy !== null && t.accuracy < 100).map((t) => t.label),
    totalScenarios: db.prepare('SELECT COUNT(*) AS n FROM scenarios').get().n
  });
});

// ---------- meu desempenho ----------
app.get('/api/me/performance', auth, onlyRole('colaborador'), (req, res) => {
  const uid = req.user.id;
  const stats = userStats(uid);
  const attempts = loadAttempts([uid]);
  const breakdown = themeBreakdown(attempts);
  const totalScenarios = db.prepare('SELECT COUNT(*) AS n FROM scenarios').get().n;
  res.json({
    stats,
    level: learnerLevel(stats, totalScenarios),
    themes: breakdown,
    recommendations: recommendations(uid, stats, breakdown),
    history: history(attempts)
  });
});

// ---------- vídeos ----------
app.get('/api/videos', auth, (req, res) => {
  const watched = new Set(
    db.prepare('SELECT video_id FROM video_progress WHERE user_id = ?').all(req.user.id).map((r) => r.video_id)
  );
  const list = db.prepare('SELECT * FROM videos ORDER BY id').all().map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    level: v.level,
    src: '/videos/' + encodeURIComponent(v.file),
    pointsTitle: v.points_title,
    keyPoints: JSON.parse(v.key_points),
    watched: watched.has(v.id)
  }));
  const done = list.filter((v) => v.watched).length;
  res.json({ videos: list, progress: list.length ? Math.round((done / list.length) * 100) : 0 });
});

app.post('/api/videos/:id/watch', auth, (req, res) => {
  const id = toId(req.params.id);
  if (!id || !db.prepare('SELECT 1 FROM videos WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Vídeo não encontrado.' });
  db.prepare('INSERT OR IGNORE INTO video_progress (user_id, video_id) VALUES (?, ?)').run(req.user.id, id);
  res.json({ ok: true });
});

app.delete('/api/videos/:id/watch', auth, (req, res) => {
  const id = toId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Vídeo não encontrado.' });
  db.prepare('DELETE FROM video_progress WHERE user_id = ? AND video_id = ?').run(req.user.id, id);
  res.json({ ok: true });
});

// ---------- simulador ----------
// Lista os cenários do contexto (treino livre ou campanha). Para os já respondidos,
// inclui o resultado salvo; para os demais, nada do gabarito é enviado.
// O gestor usa o simulador em modo prévia: nada é salvo.
app.get('/api/scenarios', auth, (req, res) => {
  let rows = db.prepare('SELECT * FROM scenarios ORDER BY id').all();
  let campaignId = null;
  if (req.query.campaign !== undefined) {
    campaignId = toId(req.query.campaign);
    const c = getCampaign(campaignId);
    if (!c || (req.user.role === 'colaborador' && !canJoinCampaign(req.user, c)))
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    rows = rows.filter((r) => c.ids.includes(r.id));
  }
  const answers = new Map(
    db.prepare('SELECT scenario_id, answer FROM attempts WHERE user_id = ? AND IFNULL(campaign_id, 0) = ?')
      .all(req.user.id, campaignId ?? 0)
      .map((a) => [a.scenario_id, a.answer])
  );
  res.json({
    preview: req.user.role === 'gestor',
    scenarios: rows.map((s) => ({
      ...toScenarioPublic(s),
      result: answers.has(s.id) ? feedback(s, answers.get(s.id)) : null
    }))
  });
});

app.get('/api/scenarios/:id/hint', auth, (req, res) => {
  const id = toId(req.params.id);
  const s = id && db.prepare('SELECT hint FROM scenarios WHERE id = ?').get(id);
  if (!s) return res.status(404).json({ error: 'Cenário não encontrado.' });
  res.json({ hint: s.hint });
});

// Uma resposta por cenário em cada contexto. Repetir devolve o resultado original sem contar de novo.
app.post('/api/scenarios/:id/answer', auth, (req, res) => {
  const { answer, campaignId, elapsedMs, hintUsed } = req.body || {};
  if (!['phishing', 'legit', 'unknown'].includes(answer))
    return res.status(400).json({ error: 'Resposta inválida.' });
  const id = toId(req.params.id);
  const s = id && db.prepare('SELECT * FROM scenarios WHERE id = ?').get(id);
  if (!s) return res.status(404).json({ error: 'Cenário não encontrado.' });

  // Gestor: só mostra o feedback, sem registrar (não entra nas métricas).
  if (req.user.role === 'gestor') return res.json({ ...feedback(s, answer), preview: true });

  let cid = null;
  if (campaignId !== undefined && campaignId !== null) {
    cid = toId(campaignId);
    const c = getCampaign(cid);
    if (!c || !canJoinCampaign(req.user, c) || !c.ids.includes(s.id))
      return res.status(400).json({ error: 'Cenário não pertence a esta campanha.' });
  }
  // Tempo de análise informado pelo navegador, limitado a 1 hora.
  const time = Number.isFinite(elapsedMs) && elapsedMs >= 0 ? Math.min(Math.round(elapsedMs), 3600000) : null;

  const r = db.prepare(
    `INSERT OR IGNORE INTO attempts (user_id, scenario_id, answer, correct, campaign_id, time_ms, hint_used)
     VALUES (?,?,?,?,?,?,?)`
  ).run(req.user.id, s.id, answer, answer === s.kind ? 1 : 0, cid, time, hintUsed === true ? 1 : 0);

  if (r.changes === 0) {
    const prev = db.prepare(
      'SELECT answer FROM attempts WHERE user_id = ? AND scenario_id = ? AND IFNULL(campaign_id, 0) = ?'
    ).get(req.user.id, s.id, cid ?? 0);
    return res.json({ ...feedback(s, prev.answer), alreadyAnswered: true });
  }
  res.json(feedback(s, answer));
});

// ---------- campanhas ----------
app.get('/api/campaigns', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all();
  const campaigns = req.user.role === 'gestor'
    ? rows.map(campaignManagerView)
    : rows.filter((c) => canJoinCampaign(req.user, c)).map((c) => campaignEmployeeView(c, req.user.id));
  res.json({ campaigns });
});

app.post('/api/campaigns', auth, onlyRole('gestor'), (req, res) => {
  const { name, description = '', scenarioIds, department = null, level = 'Intermediário' } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.length > 100)
    return res.status(400).json({ error: 'Informe um nome de até 100 caracteres.' });
  if (typeof description !== 'string' || description.length > 500)
    return res.status(400).json({ error: 'Objetivo muito longo (máx. 500 caracteres).' });
  if (department !== null && (typeof department !== 'string' || !departments().includes(department)))
    return res.status(400).json({ error: 'Público inválido.' });
  if (!LEVELS.includes(level))
    return res.status(400).json({ error: 'Nível inválido.' });
  if (!Array.isArray(scenarioIds) || !scenarioIds.length || scenarioIds.length > 50)
    return res.status(400).json({ error: 'Selecione ao menos um cenário.' });
  const ids = [...new Set(scenarioIds.map((v) => (Number.isInteger(v) ? v : null)))];
  const valid = new Set(db.prepare('SELECT id FROM scenarios').all().map((r) => r.id));
  if (!ids.every((i) => i !== null && valid.has(i)))
    return res.status(400).json({ error: 'Cenário inválido.' });
  const r = db.prepare(
    'INSERT INTO campaigns (name, description, scenario_ids, created_by, department, level) VALUES (?,?,?,?,?,?)'
  ).run(name.trim(), description.trim(), JSON.stringify(ids), req.user.id, department, level);
  const c = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ campaign: campaignManagerView(c) });
});

// As respostas da campanha são apagadas junto. Se fossem mantidas com campaign_id nulo,
// colidiriam com as respostas do treino livre no índice único.
app.delete('/api/campaigns/:id', auth, onlyRole('gestor'), (req, res) => {
  const id = toId(req.params.id);
  const changes = id
    ? transaction(() => {
        db.prepare('DELETE FROM attempts WHERE campaign_id = ?').run(id);
        return db.prepare('DELETE FROM campaigns WHERE id = ?').run(id).changes;
      })
    : 0;
  if (!changes) return res.status(404).json({ error: 'Campanha não encontrada.' });
  res.json({ ok: true });
});

// ---------- painel do gestor ----------
app.get('/api/manager/overview', auth, onlyRole('gestor'), (req, res) => {
  const { department, userId } = req.query;
  if (department !== undefined && department !== '' && !departments().includes(department))
    return res.status(400).json({ error: 'Departamento inválido.' });
  const uid = userId !== undefined && userId !== '' ? toId(userId) : null;
  if (userId !== undefined && userId !== '' && !uid)
    return res.status(400).json({ error: 'Colaborador inválido.' });
  res.json(managerOverview({ department: department || null, userId: uid }));
});

// ---------- notificações (dentro da plataforma; nenhum e-mail é enviado) ----------
app.get('/api/notifications', auth, (req, res) => {
  const list = db.prepare(
    'SELECT id, message, read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20'
  ).all(req.user.id).map((n) => ({ id: n.id, message: n.message, read: !!n.read, createdAt: n.created_at }));
  res.json({ notifications: list, unread: list.filter((n) => !n.read).length });
});

app.post('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

app.post('/api/notifications', auth, onlyRole('gestor'), (req, res) => {
  const { userId, message } = req.body || {};
  const uid = toId(userId);
  const target = uid && db.prepare("SELECT id FROM users WHERE id = ? AND role = 'colaborador'").get(uid);
  if (!target) return res.status(404).json({ error: 'Colaborador não encontrado.' });
  if (message !== undefined && (typeof message !== 'string' || !message.trim() || message.length > 300))
    return res.status(400).json({ error: 'Mensagem inválida (até 300 caracteres).' });
  db.prepare('INSERT INTO notifications (user_id, message, created_by) VALUES (?,?,?)')
    .run(uid, (message ?? DEFAULT_NOTICE).trim(), req.user.id);
  res.status(201).json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

// Erros sempre em JSON, sem stack trace nem caminhos do servidor.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? 'Requisição inválida.' : 'Erro interno do servidor.' });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`SpearShield API em http://localhost:${port}`));
