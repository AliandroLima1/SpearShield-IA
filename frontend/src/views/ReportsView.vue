<script setup>
import { ref, onMounted } from 'vue';
import { api, session, formatDate } from '../api.js';

const data = ref(null);
const error = ref('');

const resultLabel = { correct: 'Correto', wrong: 'Revisar', unknown: 'Dúvida' };
const resultClass = { correct: 'success', wrong: 'warning', unknown: 'neutral' };

function barClass(acc) {
  if (acc === null) return 'nodata';
  if (acc < 50) return 'danger';
  if (acc < 70) return 'low';
  return '';
}

// Exporta o histórico em CSV (gerado no navegador, sem enviar nada ao servidor).
function exportCsv() {
  // Evita que planilhas interpretem o conteúdo como fórmula.
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const s = data.value.stats;
  const rows = [
    ['Resumo de desempenho', session.user.name],
    ['Taxa de acerto', s.accuracy !== null ? s.accuracy + '%' : 'sem dados'],
    ['Tempo médio (s)', s.avgTimeSec ?? 'sem dados'],
    ['Simulações respondidas', s.attempts],
    ['Respostas "Não sei"', s.unknowns],
    ['Aulas concluídas', `${s.videosWatched}/${s.videosTotal}`],
    ['Nível', data.value.level.name],
    [],
    ['Cenário', 'Nível', 'Resultado', 'Tempo (s)', 'Usou dica', 'Contexto', 'Data'],
    ...data.value.history.map((h) => [
      h.subject, h.level, resultLabel[h.result], h.timeSec ?? '', h.hintUsed ? 'Sim' : 'Não',
      h.campaign ?? 'Treino livre', formatDate(h.date)
    ])
  ];
  const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'meu-desempenho-spearshield.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(async () => {
  try { data.value = await api('/me/performance'); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <div class="page-intro">
    <div>
      <span class="eyebrow">EVOLUÇÃO INDIVIDUAL</span>
      <h2>Seu desempenho em segurança</h2>
      <p>Acompanhe sua evolução e identifique comportamentos que merecem reforço.</p>
    </div>
    <button class="btn ghost" :disabled="!data" @click="exportCsv">Exportar resumo</button>
  </div>

  <p v-if="error" class="error-text" role="alert">{{ error }}</p>

  <template v-if="data">
    <div class="stats-grid">
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">◎</span>
        <div><span>Taxa de acerto</span><strong>{{ data.stats.accuracy !== null ? data.stats.accuracy + '%' : '—' }}</strong></div>
        <small>{{ data.stats.decided }} {{ data.stats.decided === 1 ? 'resposta decidida' : 'respostas decididas' }}</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">⚡</span>
        <div><span>Tempo médio</span><strong>{{ data.stats.avgTimeSec !== null ? data.stats.avgTimeSec + 's' : '—' }}</strong></div>
        <small>Por análise de mensagem</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">✉</span>
        <div><span>Simulações</span><strong>{{ data.stats.attempts }}</strong></div>
        <small>{{ data.stats.unknowns }} com “Não sei” • {{ data.stats.hintsUsed }} com dica</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">★</span>
        <div><span>Nível atual</span><strong>{{ data.level.name }}</strong></div>
        <small>{{ data.level.next ? `Próximo: ${data.level.next}` : 'Nível máximo da trilha' }}</small>
      </article>
    </div>

    <div class="reports-grid">
      <section class="panel">
        <div class="panel-heading"><div><h3>Acertos por tipo de ameaça</h3><p>Percentual nas suas simulações</p></div></div>
        <div class="bar-chart">
          <div v-for="t in data.themes" :key="t.key" class="bar-row" :class="barClass(t.accuracy)">
            <span>{{ t.label }}</span>
            <div role="img" :aria-label="t.accuracy !== null ? `${t.label}: ${t.accuracy}% de acerto` : `${t.label}: sem dados`">
              <i :style="{ width: (t.accuracy ?? 0) + '%' }"></i>
            </div>
            <strong>{{ t.accuracy !== null ? t.accuracy + '%' : '—' }}</strong>
          </div>
        </div>
        <p class="empty" style="margin-top:10px">“—” indica um tema que ainda não apareceu nas suas simulações.</p>
      </section>

      <section class="panel">
        <div class="panel-heading"><div><h3>Recomendações da IA</h3><p>Baseadas no seu histórico de aprendizagem</p></div></div>
        <div v-for="(r, i) in data.recommendations" :key="i" class="recommendation">
          <span aria-hidden="true">{{ i + 1 }}</span>
          <div><strong>{{ r.title }}</strong><p>{{ r.text }}</p></div>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-heading"><div><h3>Histórico de simulações</h3><p>Resultados recentes</p></div></div>
      <p v-if="!data.history.length" class="empty">
        Nenhuma simulação ainda. <RouterLink class="text-btn" to="/simulador">Abrir o simulador</RouterLink>
      </p>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>Cenário</th><th>Nível</th><th>Resultado</th><th>Tempo</th><th>Contexto</th><th>Data</th></tr></thead>
          <tbody>
            <tr v-for="h in data.history" :key="h.id">
              <td>{{ h.subject }}</td>
              <td>{{ h.level }}</td>
              <td><span class="badge" :class="resultClass[h.result]">{{ resultLabel[h.result] }}</span></td>
              <td>{{ h.timeSec !== null ? h.timeSec + 's' : '—' }}</td>
              <td>{{ h.campaign ?? 'Treino livre' }}</td>
              <td>{{ formatDate(h.date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
</template>
