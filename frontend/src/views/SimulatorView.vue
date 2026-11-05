<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api.js';

const campaigns = ref([]);
const campaignId = ref(null);
const scenarios = ref([]);
const selectedId = ref(null);
const hints = ref({});
const results = ref({});
const error = ref('');

const selected = computed(() => scenarios.value.find((s) => s.id === selectedId.value));
const result = computed(() => results.value[selectedId.value]);
const answered = computed(() => Object.keys(results.value).length);
const nextId = computed(() => {
  const i = scenarios.value.findIndex((s) => s.id === selectedId.value);
  return scenarios.value.length > 1 ? scenarios.value[(i + 1) % scenarios.value.length].id : null;
});

async function loadScenarios() {
  error.value = '';
  hints.value = {};
  results.value = {};
  try {
    const q = campaignId.value ? `?campaign=${campaignId.value}` : '';
    scenarios.value = (await api('/scenarios' + q)).scenarios;
    selectedId.value = scenarios.value[0]?.id ?? null;
  } catch (e) { error.value = e.message; }
}

async function showHint() {
  try {
    hints.value[selectedId.value] = (await api(`/scenarios/${selectedId.value}/hint`)).hint;
  } catch (e) { error.value = e.message; }
}

async function answer(a) {
  try {
    results.value[selectedId.value] = await api(`/scenarios/${selectedId.value}/answer`, {
      method: 'POST',
      body: { answer: a, campaignId: campaignId.value }
    });
  } catch (e) { error.value = e.message; }
}

onMounted(async () => {
  try { campaigns.value = (await api('/campaigns')).campaigns; } catch { /* opcional */ }
  await loadScenarios();
});
</script>

<template>
  <h1>Simulador de phishing</h1>
  <div class="card" v-if="campaigns.length">
    <label for="camp">Campanha</label>
    <select id="camp" v-model="campaignId" @change="loadScenarios">
      <option :value="null">Treino livre (todos os cenários)</option>
      <option v-for="c in campaigns" :key="c.id" :value="c.id">{{ c.name }} ({{ c.completed }}/{{ c.total }})</option>
    </select>
  </div>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <p class="muted">Respondidos: {{ answered }}/{{ scenarios.length }}</p>

  <div class="inbox">
    <ul class="list" aria-label="Caixa de entrada">
      <li v-for="s in scenarios" :key="s.id">
        <button :class="{ active: s.id === selectedId }" @click="selectedId = s.id">
          <strong>{{ s.senderName }}</strong>
          <span>{{ s.subject }}</span>
          <small v-if="results[s.id]">{{ results[s.id].correct ? '✔ Acertou' : '• Revisado' }}</small>
        </button>
      </li>
    </ul>

    <article v-if="selected" class="card mail">
      <h2>{{ selected.subject }}</h2>
      <p class="muted">De: {{ selected.senderName }} &lt;{{ selected.senderEmail }}&gt; · {{ selected.time }}</p>
      <pre class="body">{{ selected.body }}</pre>
      <!-- Link apenas ilustrativo: nunca navega -->
      <p v-if="selected.linkLabel"><a href="#" @click.prevent>{{ selected.linkLabel }}</a></p>
      <p class="muted"><small>Destino do link: {{ selected.linkUrl }}</small></p>

      <div v-if="!result" class="actions">
        <button class="btn danger" @click="answer('phishing')">É phishing</button>
        <button class="btn ok" @click="answer('legit')">É legítimo</button>
        <button class="btn ghost" @click="answer('unknown')">Não sei</button>
        <button class="btn ghost" @click="showHint">💡 Dica da IA</button>
      </div>
      <p v-if="hints[selectedId] && !result" class="hint">💡 {{ hints[selectedId] }}</p>

      <div v-if="result" class="feedback" :class="result.correct ? 'good' : 'learn'" role="status">
        <p><strong>{{ result.title }}</strong></p>
        <p>{{ result.text }}</p>
        <h3>Sinais observados</h3>
        <ul><li v-for="(f, i) in result.redFlags" :key="i">{{ f }}</li></ul>
        <button v-if="nextId" class="btn" @click="selectedId = nextId">Próximo cenário</button>
      </div>
    </article>
  </div>
</template>
