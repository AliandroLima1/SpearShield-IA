<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, toast, formatDate } from '../api.js';
import CampaignModal from '../components/CampaignModal.vue';

const data = ref(null);
const scenarios = ref([]);
const error = ref('');
const showModal = ref(false);
const loading = ref(false);

// Filtros: o rascunho só vale ao clicar em "Aplicar filtro", como no protótipo.
const draft = ref({ department: '', userId: '' });
const applied = ref({ department: '', userId: '' });

// Todos os colaboradores (da carga sem filtro); a lista do filtro individual
// acompanha o departamento escolhido no rascunho.
const allEmployees = ref([]);
const peopleOptions = computed(() =>
  allEmployees.value.filter((e) => !draft.value.department || e.department === draft.value.department)
);
const pct = (v) => (v === null || v === undefined ? '—' : v + '%');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const q = new URLSearchParams();
    if (applied.value.department) q.set('department', applied.value.department);
    if (applied.value.userId) q.set('userId', applied.value.userId);
    const qs = q.toString();
    data.value = await api('/manager/overview' + (qs ? '?' + qs : ''));
    if (!applied.value.department) allEmployees.value = data.value.employees;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function applyFilter() {
  // Ignora um colaborador que não pertence ao departamento escolhido.
  if (draft.value.userId && !peopleOptions.value.some((e) => String(e.id) === String(draft.value.userId)))
    draft.value.userId = '';
  applied.value = { ...draft.value };
  load();
}
function clearFilter() {
  draft.value = { department: '', userId: '' };
  applyFilter();
}
function viewProfile(e) {
  draft.value = { department: applied.value.department, userId: String(e.id) };
  applyFilter();
}

async function notify(e) {
  try {
    await api('/notifications', { method: 'POST', body: { userId: e.id } });
    toast(`Notificação enviada para ${e.name} na plataforma.`);
  } catch (err) { error.value = err.message; }
}

async function removeCampaign(c) {
  if (!confirm(`Excluir a campanha "${c.name}"? As respostas dadas nela também serão apagadas.`)) return;
  try {
    await api(`/campaigns/${c.id}`, { method: 'DELETE' });
    toast('Campanha excluída.');
    await load();
  } catch (e) { error.value = e.message; }
}

async function onSaved() {
  showModal.value = false;
  toast('Campanha salva.');
  await load();
}

function riskDetail(e) {
  const parts = [e.department || 'Sem departamento'];
  if (e.wrong) parts.push(`Errou ${e.wrong} de ${e.decided} ${e.decided === 1 ? 'simulação' : 'simulações'}`);
  if (e.unknowns) parts.push(`${e.unknowns} ${e.unknowns === 1 ? 'dúvida' : 'dúvidas'}`);
  return parts.join(' • ');
}
function deptBarClass(rate) {
  if (rate === null) return 'nodata';
  if (rate >= 40) return 'danger';
  if (rate >= 20) return 'low';
  return '';
}

onMounted(async () => {
  await load();
  try { scenarios.value = (await api('/scenarios')).scenarios; } catch { /* usado só no modal */ }
});
</script>

<template>
  <div class="page-intro">
    <div>
      <span class="eyebrow">VISÃO ADMINISTRATIVA</span>
      <h2>Gestão de campanhas educacionais</h2>
      <p>Crie campanhas de treinamento somente para bases previamente autorizadas e acompanhe indicadores agregados.</p>
    </div>
    <button class="btn primary" :disabled="!data" @click="showModal = true">＋ Nova campanha</button>
  </div>
  <div class="manager-banner">
    <span aria-hidden="true">🛡</span>
    <p><strong>Regra de segurança:</strong> a plataforma não dispara e-mails reais nem coleta credenciais. As campanhas aparecem apenas no simulador interno.</p>
  </div>

  <p v-if="error" class="error-text" role="alert">{{ error }}</p>

  <template v-if="data">
    <div class="stats-grid">
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">◉</span>
        <div><span>Campanhas ativas</span><strong>{{ data.summary.activeCampaigns }}</strong></div>
        <small>de {{ data.summary.totalCampaigns }} campanhas criadas</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">👥</span>
        <div><span>Participantes</span><strong>{{ data.summary.participants }}</strong></div>
        <small>Colaboradores cadastrados</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">✉</span>
        <div><span>Interações</span><strong>{{ data.summary.interactions }}</strong></div>
        <small>Respostas registradas</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">▥</span>
        <div><span>Resiliência média</span><strong>{{ pct(data.summary.avgAccuracy) }}</strong></div>
        <small>Acerto nas respostas decididas</small>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading"><div><h3>Campanhas recentes</h3><p>Status e taxa de identificação</p></div></div>
        <p v-if="!data.campaigns.length" class="empty">Nenhuma campanha criada.</p>
        <div v-for="c in data.campaigns" :key="c.id" class="campaign-item with-action">
          <div>
            <strong>{{ c.name }}</strong>
            <span>{{ c.department || 'Todos' }} • {{ c.participants }} {{ c.participants === 1 ? 'participante' : 'participantes' }} • {{ c.completed }} concluíram</span>
          </div>
          <span class="badge" :class="c.status === 'Concluída' ? 'success' : 'in-progress'">{{ c.status }}</span>
          <strong>{{ pct(c.accuracy) }}</strong>
          <button class="text-btn" :aria-label="`Excluir campanha ${c.name}`" @click="removeCampaign(c)">Excluir</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading"><div><h3>Risco humano por tema</h3><p>Visão agregada, sem exposição individual</p></div></div>
        <div class="risk-list">
          <div v-for="t in data.themes" :key="t.key">
            <span>{{ t.label }}</span>
            <strong class="risk-badge" :class="t.risk.level" :title="t.failureRate !== null ? `${t.failureRate}% de falha` : ''">{{ t.risk.label }}</strong>
          </div>
        </div>
      </section>
    </div>

    <form class="manager-filters" @submit.prevent="applyFilter">
      <div class="filter-group">
        <label for="f-dept">Visão por departamento</label>
        <select id="f-dept" v-model="draft.department" @change="draft.userId = ''">
          <option value="">Todos os departamentos</option>
          <option v-for="d in data.departments" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="f-user">Filtro individual</label>
        <select id="f-user" v-model="draft.userId">
          <option value="">Todos os colaboradores (visão geral)</option>
          <option v-for="e in peopleOptions" :key="e.id" :value="String(e.id)">{{ e.name }}</option>
        </select>
      </div>
      <button class="btn ghost" :disabled="loading">Aplicar filtro</button>
      <button v-if="applied.department || applied.userId" type="button" class="btn ghost" @click="clearFilter">Limpar</button>
    </form>

    <div class="dashboard-grid">
      <section v-if="data.profile" class="panel">
        <div class="panel-heading"><div><h3>Falhas por tema — {{ data.profile.name }}</h3><p>Taxa de falha nas simulações deste colaborador (%)</p></div></div>
        <div class="bar-chart">
          <div v-for="t in data.profile.themes" :key="t.key" class="bar-row" :class="deptBarClass(t.failureRate)">
            <span>{{ t.label }}</span>
            <div role="img" :aria-label="`${t.label}: ${t.failureRate !== null ? t.failureRate + '% de falha' : 'sem dados'}`"><i :style="{ width: (t.failureRate ?? 0) + '%' }"></i></div>
            <strong>{{ pct(t.failureRate) }}</strong>
          </div>
        </div>
      </section>
      <section v-else class="panel">
        <div class="panel-heading"><div><h3>Dificuldade por departamento</h3><p>Taxa de falha nas simulações de phishing (%)</p></div></div>
        <div class="bar-chart">
          <div v-for="d in data.departmentChart" :key="d.department" class="bar-row" :class="deptBarClass(d.failureRate)">
            <span>{{ d.department }}</span>
            <div role="img" :aria-label="`${d.department}: ${d.failureRate !== null ? d.failureRate + '% de falha' : 'sem dados'}`"><i :style="{ width: (d.failureRate ?? 0) + '%' }"></i></div>
            <strong>{{ pct(d.failureRate) }}</strong>
          </div>
        </div>
      </section>

      <section v-if="data.profile" class="panel">
        <div class="panel-heading"><div><h3>Perfil do colaborador</h3><p>Resumo individual para apoio ao treinamento</p></div></div>
        <div class="profile-head">
          <div class="avatar" :class="'risk-' + data.profile.risk" aria-hidden="true">{{ data.profile.initials }}</div>
          <div><strong>{{ data.profile.name }}</strong><span>{{ data.profile.department }} • {{ data.profile.email }}</span></div>
        </div>
        <div class="profile-stats">
          <div><span>Acerto:</span> {{ pct(data.profile.accuracy) }}</div>
          <div><span>Risco:</span> <span class="risk-text" :class="data.profile.risk">{{ data.profile.risk }}</span></div>
          <div><span>Erros:</span> {{ data.profile.wrong }} de {{ data.profile.decided }}</div>
          <div><span>Dúvidas:</span> {{ data.profile.unknowns }}</div>
          <div><span>Dicas usadas:</span> {{ data.profile.hintsUsed }}</div>
          <div><span>Aulas:</span> {{ data.profile.videosWatched }}/{{ data.profile.videosTotal }}</div>
        </div>
        <button class="btn primary" @click="notify(data.profile)">Notificar colaborador</button>
        <h4 style="font-size:13px;margin:16px 0 6px">Últimas respostas</h4>
        <p v-if="!data.profile.history.length" class="empty">Nenhuma resposta ainda.</p>
        <div v-for="h in data.profile.history.slice(0, 5)" :key="h.id" class="campaign-item" style="grid-template-columns:1fr auto">
          <div><strong>{{ h.subject }}</strong><span>{{ h.campaign ?? 'Treino livre' }} • {{ formatDate(h.date) }}</span></div>
          <span class="badge" :class="{ correct: 'success', wrong: 'warning', unknown: 'neutral' }[h.result]">
            {{ { correct: 'Correto', wrong: 'Errou', unknown: 'Dúvida' }[h.result] }}
          </span>
        </div>
      </section>
      <section v-else class="panel">
        <div class="panel-heading"><div><h3>🔴 Colaboradores em risco</h3><p>Requerem suporte ou intervenção de treinamento</p></div></div>
        <p v-if="!data.atRisk.length" class="empty">Nenhum colaborador com erros ou dúvidas neste filtro.</p>
        <div v-for="e in data.atRisk" :key="e.id" class="campaign-item" style="grid-template-columns:auto 1fr auto">
          <div class="avatar small" :class="'risk-' + e.risk" aria-hidden="true">{{ e.initials }}</div>
          <div><strong>{{ e.name }}</strong><span>{{ riskDetail(e) }}</span></div>
          <button v-if="e.risk === 'alto'" class="text-btn" style="color:var(--red)" @click="notify(e)">Notificar</button>
          <button v-else class="text-btn" @click="viewProfile(e)">Ver perfil</button>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-heading"><div><h3>Colaboradores</h3><p>{{ applied.department || 'Todos os departamentos' }}</p></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Colaborador</th><th>Departamento</th><th>Aulas</th><th>Respostas</th><th>Acerto</th><th>Dúvidas</th><th>Risco</th><th></th></tr></thead>
          <tbody>
            <tr v-for="e in data.employees" :key="e.id">
              <td>{{ e.name }}</td>
              <td>{{ e.department || '—' }}</td>
              <td>{{ e.videosWatched }}/{{ e.videosTotal }}</td>
              <td>{{ e.attempts }}</td>
              <td>{{ pct(e.accuracy) }}</td>
              <td>{{ e.unknowns }}</td>
              <td><span class="risk-text" :class="e.risk">{{ e.risk }}</span></td>
              <td><button class="text-btn" @click="viewProfile(e)">Ver perfil</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>

  <CampaignModal v-if="showModal" :scenarios="scenarios" :departments="data.departments"
    @close="showModal = false" @saved="onSaved" />
</template>
