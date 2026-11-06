// Cálculo dos indicadores. Regra do protótipo: "Não sei" não conta como acerto nem
// como erro. A taxa de acerto considera só as respostas decididas (phishing/legítimo).
import { db } from './db.js';
import { themes } from './seed.js';

const pct = (part, total) => (total ? Math.round((part / total) * 100) : null);

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

export function riskLevel(accuracy) {
  if (accuracy === null) return 'indefinido';
  if (accuracy >= 80) return 'baixo';
  if (accuracy >= 50) return 'médio';
  return 'alto';
}

// Nível de risco de um tema a partir da taxa de falha.
function themeRisk(failureRate) {
  if (failureRate === null) return { level: 'none', label: 'Sem dados' };
  if (failureRate < 20) return { level: 'low', label: 'Baixo' };
  if (failureRate < 40) return { level: 'medium', label: 'Médio' };
  return { level: 'high', label: 'Alto' };
}

// Tentativas com dados do cenário. `userIds` vazio = nenhum usuário.
export function loadAttempts(userIds) {
  if (!userIds.length) return [];
  const marks = userIds.map(() => '?').join(',');
  return db.prepare(
    `SELECT a.*, s.themes, s.subject, s.level, s.kind, c.name AS campaign_name
     FROM attempts a
     JOIN scenarios s ON s.id = a.scenario_id
     LEFT JOIN campaigns c ON c.id = a.campaign_id
     WHERE a.user_id IN (${marks})
     ORDER BY a.created_at DESC, a.id DESC`
  ).all(...userIds).map((a) => ({ ...a, themes: JSON.parse(a.themes) }));
}

function summarize(attempts) {
  const decided = attempts.filter((a) => a.answer !== 'unknown');
  const hits = decided.filter((a) => a.correct).length;
  const timed = attempts.filter((a) => a.time_ms != null);
  return {
    attempts: attempts.length,
    decided: decided.length,
    hits,
    wrong: decided.length - hits,
    unknowns: attempts.length - decided.length,
    hintsUsed: attempts.filter((a) => a.hint_used).length,
    accuracy: pct(hits, decided.length),
    avgTimeSec: timed.length ? Math.round(timed.reduce((s, a) => s + a.time_ms, 0) / timed.length / 1000) : null
  };
}

// Taxa de acerto e de falha por tema de risco.
export function themeBreakdown(attempts) {
  return themes.map((t) => {
    const decided = attempts.filter((a) => a.answer !== 'unknown' && a.themes.includes(t.key));
    const hits = decided.filter((a) => a.correct).length;
    const failureRate = pct(decided.length - hits, decided.length);
    return {
      key: t.key,
      label: t.label,
      attempts: decided.length,
      accuracy: pct(hits, decided.length),
      failureRate,
      risk: themeRisk(failureRate)
    };
  });
}

export function userStats(userId) {
  const s = summarize(loadAttempts([userId]));
  const watched = db.prepare('SELECT COUNT(*) AS n FROM video_progress WHERE user_id = ?').get(userId).n;
  const totalVideos = db.prepare('SELECT COUNT(*) AS n FROM videos').get().n;
  return {
    ...s,
    videosWatched: watched,
    videosTotal: totalVideos,
    videoProgress: pct(watched, totalVideos) ?? 0,
    risk: riskLevel(s.accuracy)
  };
}

// Índice de resiliência: 70% acerto nas simulações + 30% progresso nas aulas.
export function resilience(stats) {
  if (stats.accuracy === null) {
    return { score: null, label: 'Sem dados ainda', text: 'Responda ao simulador para calcular seu índice.' };
  }
  const score = Math.round(stats.accuracy * 0.7 + stats.videoProgress * 0.3);
  const label = score >= 80 ? 'Ótimo nível' : score >= 60 ? 'Bom nível' : score >= 40 ? 'Em desenvolvimento' : 'Precisa de atenção';
  return {
    score,
    label,
    text: `Com base em ${stats.decided} ${stats.decided === 1 ? 'resposta' : 'respostas'} e ${stats.videoProgress}% da trilha.`
  };
}

export function learnerLevel(stats, totalScenarios) {
  const answeredAll = stats.attempts >= totalScenarios;
  if (stats.accuracy !== null && stats.accuracy >= 80 && answeredAll && stats.videoProgress === 100)
    return { name: 'Guardião', next: null };
  if (stats.accuracy !== null && stats.accuracy >= 50 && stats.decided >= 2)
    return { name: 'Praticante', next: 'Guardião' };
  return { name: 'Iniciante', next: 'Praticante' };
}

// Recomendações a partir do histórico (no máximo 3).
export function recommendations(userId, stats, breakdown) {
  const recs = [];
  const weak = breakdown
    .filter((t) => t.accuracy !== null && t.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weak) {
    const t = themes.find((x) => x.key === weak.key);
    recs.push({ title: `Reforçar: ${weak.label.toLowerCase()}`, text: `Seu acerto nesse tema está em ${weak.accuracy}%. ${t.advice}` });
  }
  const pending = db.prepare(
    `SELECT title FROM videos WHERE id NOT IN (SELECT video_id FROM video_progress WHERE user_id = ?) ORDER BY id`
  ).all(userId);
  if (pending.length) {
    recs.push({ title: `Assistir à aula “${pending[0].title}”`, text: `Faltam ${pending.length} ${pending.length === 1 ? 'aula' : 'aulas'} para concluir a trilha.` });
  }
  const remaining = db.prepare(
    `SELECT COUNT(*) AS n FROM scenarios WHERE id NOT IN
       (SELECT scenario_id FROM attempts WHERE user_id = ? AND campaign_id IS NULL)`
  ).get(userId).n;
  if (remaining) {
    recs.push({ title: 'Praticar no simulador', text: `Ainda há ${remaining} ${remaining === 1 ? 'cenário' : 'cenários'} para analisar no treino livre.` });
  }
  if (stats.unknowns) {
    recs.push({ title: 'Rever os cenários com dúvida', text: 'Releia os sinais de alerta dos e-mails em que você marcou "Não sei".' });
  }
  if (!recs.length) {
    recs.push({ title: 'Continue praticando', text: 'Você concluiu a trilha com bom desempenho. Mantenha a atenção a remetentes, links e pedidos incomuns.' });
  }
  return recs.slice(0, 3);
}

export function history(attempts) {
  return attempts.map((a) => ({
    id: a.id,
    subject: a.subject,
    level: a.level,
    result: a.answer === 'unknown' ? 'unknown' : a.correct ? 'correct' : 'wrong',
    timeSec: a.time_ms != null ? Math.round(a.time_ms / 1000) : null,
    hintUsed: !!a.hint_used,
    campaign: a.campaign_name ?? null,
    date: a.created_at
  }));
}

// ---------- Campanhas ----------
export const parseCampaign = (c) => ({ ...c, ids: JSON.parse(c.scenario_ids) });

// Colaboradores que fazem parte do público da campanha.
export function campaignTargets(c) {
  return c.department
    ? db.prepare("SELECT id FROM users WHERE role = 'colaborador' AND department = ?").all(c.department)
    : db.prepare("SELECT id FROM users WHERE role = 'colaborador'").all();
}

export const canJoinCampaign = (user, c) => !c.department || c.department === user.department;

export function campaignManagerView(row) {
  const c = parseCampaign(row);
  const targets = new Set(campaignTargets(c).map((u) => u.id));
  const attempts = db.prepare('SELECT user_id, scenario_id, answer, correct FROM attempts WHERE campaign_id = ?')
    .all(c.id).filter((a) => targets.has(a.user_id));
  const perUser = new Map();
  for (const a of attempts) perUser.set(a.user_id, (perUser.get(a.user_id) || 0) + 1);
  const completed = [...perUser.values()].filter((n) => n >= c.ids.length).length;
  const s = summarize(attempts);
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    department: c.department,
    level: c.level,
    scenarioIds: c.ids,
    createdAt: c.created_at,
    participants: targets.size,
    respondents: perUser.size,
    completed,
    attempts: attempts.length,
    accuracy: s.accuracy,
    status: targets.size > 0 && completed === targets.size ? 'Concluída' : 'Ativa'
  };
}

export function campaignEmployeeView(row, userId) {
  const c = parseCampaign(row);
  const done = db.prepare(
    'SELECT COUNT(DISTINCT scenario_id) AS n FROM attempts WHERE campaign_id = ? AND user_id = ?'
  ).get(c.id, userId).n;
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    level: c.level,
    scenarioIds: c.ids,
    completed: done,
    total: c.ids.length
  };
}

// ---------- Painel do gestor ----------
export function departments() {
  return db.prepare(
    "SELECT DISTINCT department FROM users WHERE role = 'colaborador' AND department IS NOT NULL ORDER BY department"
  ).all().map((r) => r.department);
}

export function managerOverview({ department = null, userId = null } = {}) {
  const all = db.prepare("SELECT id, name, email, department FROM users WHERE role = 'colaborador' ORDER BY name").all();
  const allAttempts = loadAttempts(all.map((u) => u.id));
  const byUser = (id) => allAttempts.filter((a) => a.user_id === id);

  const employees = all.map((u) => {
    const st = userStats(u.id);
    return { id: u.id, name: u.name, email: u.email, department: u.department, initials: initials(u.name), ...st };
  });
  const scoped = department ? employees.filter((e) => e.department === department) : employees;

  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all().map(campaignManagerView);
  const overall = summarize(allAttempts);

  // Falha por departamento (respeita o filtro de departamento).
  const deptNames = department ? [department] : departments();
  const departmentChart = deptNames.map((d) => {
    const ids = new Set(employees.filter((e) => e.department === d).map((e) => e.id));
    const s = summarize(allAttempts.filter((a) => ids.has(a.user_id)));
    return { department: d, failureRate: s.decided ? 100 - s.accuracy : null, decided: s.decided };
  }).sort((a, b) => (b.failureRate ?? -1) - (a.failureRate ?? -1));

  const atRisk = scoped
    .filter((e) => e.wrong > 0 || e.unknowns > 0)
    .sort((a, b) => b.wrong - a.wrong || (a.accuracy ?? 0) - (b.accuracy ?? 0));

  let profile = null;
  if (userId) {
    const e = employees.find((x) => x.id === userId);
    if (e) {
      const attempts = byUser(e.id);
      profile = { ...e, themes: themeBreakdown(attempts), history: history(attempts) };
    }
  }

  return {
    summary: {
      activeCampaigns: campaigns.filter((c) => c.status === 'Ativa').length,
      totalCampaigns: campaigns.length,
      participants: employees.length,
      interactions: overall.attempts,
      avgAccuracy: overall.accuracy,
      highRisk: employees.filter((e) => e.risk === 'alto').length
    },
    campaigns,
    themes: themeBreakdown(allAttempts),
    departments: departments(),
    employees: scoped,
    departmentChart,
    atRisk,
    profile
  };
}
