<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { api, session } from '../api.js';
import EmailBody from '../components/EmailBody.vue';

const route = useRoute();
const campaigns = ref([]);
const campaignId = ref(null);
const scenarios = ref([]);
const preview = ref(false);
const selectedId = ref(null);
const hints = ref({});
const results = ref({});
const busy = ref(false);
const generating = ref(false);
const error = ref('');

// Tempo de análise de cada cenário, medido a partir do momento em que ele é aberto.
const startedAt = new Map();
let genTimer;

const selected = computed(() => scenarios.value.find((s) => s.id === selectedId.value));
const result = computed(() => results.value[selectedId.value]);
const position = computed(() => scenarios.value.findIndex((s) => s.id === selectedId.value) + 1);
const senderInitials = computed(() =>
  selected.value ? selected.value.senderName.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() : ''
);
const feedbackClass = computed(() => (!result.value ? '' : result.value.unknown ? 'neutral' : result.value.correct ? 'ok' : 'alert'));
const feedbackIcon = computed(() => (!result.value ? '' : result.value.unknown ? '?' : result.value.correct ? '✓' : '!'));

// Destaque do botão escolhido após responder (verde se acertou, vermelho se errou).
function decisionClass(answer) {
  const r = result.value;
  if (!r || r.answer !== answer || r.unknown) return '';
  return r.correct ? 'correct' : 'wrong';
}

function startTimer(id) {
  if (id && !results.value[id] && !startedAt.has(id)) startedAt.set(id, performance.now());
}
watch(selectedId, startTimer);

async function loadCampaigns() {
  if (session.user?.role !== 'colaborador') return;
  try { campaigns.value = (await api('/campaigns')).campaigns; } catch { /* lista opcional */ }
}

// O servidor devolve, junto com cada cenário, o resultado de quem já respondeu.
async function loadScenarios(preferId = null) {
  error.value = '';
  hints.value = {};
  startedAt.clear();
  try {
    const q = campaignId.value ? `?campaign=${campaignId.value}` : '';
    const d = await api('/scenarios' + q);
    preview.value = d.preview;
    scenarios.value = d.scenarios;
    results.value = Object.fromEntries(d.scenarios.filter((s) => s.result).map((s) => [s.id, s.result]));
    const preferred = d.scenarios.find((s) => s.id === preferId);
    selectedId.value = (preferred ?? d.scenarios.find((s) => !s.result) ?? d.scenarios[0])?.id ?? null;
    startTimer(selectedId.value); // o watch não dispara se o id selecionado não mudou
  } catch (e) { error.value = e.message; }
}

async function showHint() {
  const id = selectedId.value;
  try { hints.value[id] = (await api(`/scenarios/${id}/hint`)).hint; } catch (e) { error.value = e.message; }
}

async function answer(a) {
  if (busy.value || result.value) return; // evita resposta duplicada
  busy.value = true;
  error.value = '';
  const id = selectedId.value;
  const started = startedAt.get(id);
  try {
    results.value[id] = await api(`/scenarios/${id}/answer`, {
      method: 'POST',
      body: {
        answer: a,
        campaignId: campaignId.value,
        elapsedMs: started ? Math.round(performance.now() - started) : undefined,
        hintUsed: !!hints.value[id]
      }
    });
    if (campaignId.value) loadCampaigns(); // atualiza o progresso (x/y) da campanha
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}

// Próxima mensagem: prioriza a próxima ainda não respondida.
// O efeito "Gerando simulação por IA" é o mesmo do protótipo original.
function next() {
  const list = scenarios.value;
  const i = list.findIndex((s) => s.id === selectedId.value);
  const ordered = [...list.slice(i + 1), ...list.slice(0, i + 1)];
  const target = ordered.find((s) => !results.value[s.id]) ?? ordered[0];
  generating.value = true;
  genTimer = setTimeout(() => {
    generating.value = false;
    selectedId.value = target.id;
  }, 1500);
}

onMounted(async () => {
  await loadCampaigns();
  await loadScenarios(Number(route.query.cenario) || null);
});
onBeforeUnmount(() => clearTimeout(genTimer));
</script>

<template>
  <div class="simulation-header">
    <div>
      <span class="eyebrow">MÓDULO 2 • AMBIENTE CONTROLADO</span>
      <h2>Simulação corporativa de phishing</h2>
      <p>Analise a mensagem como se estivesse no seu e-mail de trabalho. Nenhuma informação real será solicitada.</p>
    </div>
    <div class="sim-status" v-if="scenarios.length"><span class="pulse"></span> Cenário ativo <strong>{{ position }} de {{ scenarios.length }}</strong></div>
  </div>

  <div v-if="preview" class="manager-banner">
    <span aria-hidden="true">👁</span>
    <p><strong>Modo prévia:</strong> como gestor, você vê o feedback de cada cenário, mas suas respostas não são registradas nem entram nos indicadores.</p>
  </div>

  <div v-if="campaigns.length" class="campaign-picker">
    <div class="filter-group">
      <label for="camp">Campanha</label>
      <select id="camp" v-model="campaignId" @change="loadScenarios()">
        <option :value="null">Treino livre (todos os cenários)</option>
        <option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }} ({{ c.completed }}/{{ c.total }})</option>
      </select>
    </div>
  </div>

  <p v-if="error" class="error-text" role="alert">{{ error }}</p>

  <div class="sim-workspace" v-if="selected">
    <div class="simulation-window">
      <div class="os-window-header" aria-hidden="true">
        <div class="os-dots"><span></span><span></span><span></span></div>
        <div class="os-title">🔒 correio.empresa.com.br - Navegador Seguro</div>
      </div>

      <section class="inbox" aria-label="Caixa de entrada simulada">
        <div v-if="generating" class="ai-sim-loading" role="status">
          <div class="spinner"></div>
          <span>Gerando simulação por IA...</span>
        </div>

        <div class="inbox-toolbar">
          <div class="mail-brand">Correio Corporativo</div>
          <div class="mail-search" aria-hidden="true">🔎 Pesquisar mensagens</div>
          <div class="avatar small" aria-hidden="true">{{ session.user.initials }}</div>
        </div>
        <div class="mail-body">
          <!-- Pastas apenas ilustrativas -->
          <div class="mail-sidebar" aria-hidden="true">
            <div class="compose-btn">＋ Nova mensagem</div>
            <div class="mail-folder active">📥 Caixa de entrada <strong>{{ scenarios.length }}</strong></div>
            <div class="mail-folder">⭐ Importantes</div>
            <div class="mail-folder">📤 Enviados</div>
            <div class="mail-folder">🗑 Excluídos</div>
          </div>
          <div class="mail-list" aria-label="Lista de mensagens simuladas">
            <button v-for="s in scenarios" :key="s.id" class="mail-item" :class="{ selected: s.id === selectedId }"
              :aria-current="s.id === selectedId ? 'true' : undefined" :disabled="generating" @click="selectedId = s.id">
              <span class="sender">{{ s.senderName }}</span>
              <span class="subject">{{ s.subject }}</span>
              <span class="preview">{{ s.preview }}</span>
              <span v-if="results[s.id]" class="state" :class="{ review: !results[s.id].correct }">
                {{ results[s.id].correct ? '✓ Acertou' : results[s.id].unknown ? '? Revisado' : '! Revisar' }}
              </span>
              <span class="time">{{ s.time }}</span>
            </button>
          </div>
          <article class="email-view" aria-live="polite">
            <div class="email-actions" aria-hidden="true"><span>←</span><span>↗</span><span>⋮</span></div>
            <h3>{{ selected.subject }}</h3>
            <div class="email-from">
              <div class="avatar small" aria-hidden="true">{{ senderInitials }}</div>
              <div><strong>{{ selected.senderName }}</strong><span>{{ selected.senderEmail }}</span></div>
              <span>{{ selected.time }}</span>
            </div>
            <EmailBody :body="selected.body" :link-label="selected.linkLabel" />
            <div v-if="selected.linkUrl" class="hover-link">Destino do link: <strong>{{ selected.linkUrl }}</strong></div>
          </article>
        </div>
      </section>
    </div>

    <aside class="evaluator-panel" aria-label="Área de avaliação">
      <div class="evaluator-header">
        <span class="eyebrow" style="color:var(--primary)">ÁREA DE AVALIAÇÃO</span>
        <h3>O que você acha desta mensagem?</h3>
        <p>Analise o remetente, tom e destino do link na janela simulada ao lado.</p>
      </div>

      <div class="decision-buttons">
        <button class="decision safe" :class="decisionClass('legit')" :disabled="busy || !!result || generating" @click="answer('legit')">✓ Parece legítima</button>
        <button class="decision suspicious" :class="decisionClass('phishing')" :disabled="busy || !!result || generating" @click="answer('phishing')">⚠ Parece phishing</button>
        <button class="decision unsure" :disabled="busy || !!result || generating" @click="answer('unknown')">? Não sei</button>
      </div>

      <div v-if="!result" class="hint-card evaluator-hint">
        <div class="ai-avatar" aria-hidden="true">IA</div>
        <div aria-live="polite">
          <strong>Assistente de análise</strong>
          <p>{{ hints[selectedId] || 'Posso dar uma pista sem entregar a resposta.' }}</p>
          <button v-if="!hints[selectedId]" class="text-btn" @click="showHint">Pedir uma pista</button>
        </div>
      </div>

      <div v-if="result" class="feedback-card" :class="feedbackClass" role="status">
        <div class="feedback-icon" aria-hidden="true">{{ feedbackIcon }}</div>
        <div>
          <strong>{{ result.title }}</strong>
          <p>{{ result.text }}</p>
          <ul class="feedback-flags" aria-label="Sinais observados">
            <li v-for="(f, i) in result.redFlags" :key="i">{{ f }}</li>
          </ul>
        </div>
      </div>
      <button v-if="result && scenarios.length > 1" class="btn primary full" :disabled="generating" @click="next">Próxima mensagem →</button>
    </aside>
  </div>

  <div class="learning-strip">
    <span aria-hidden="true">🔒</span>
    <p><strong>Ambiente seguro:</strong> esta experiência é totalmente simulada e educacional. Não use senhas, dados pessoais ou credenciais reais.</p>
  </div>
</template>
