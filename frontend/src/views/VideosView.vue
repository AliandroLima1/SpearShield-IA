<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, toast } from '../api.js';
import LessonModal from '../components/LessonModal.vue';

const videos = ref([]);
const progress = ref(0);
const filter = ref('todas');
const current = ref(null);
const error = ref('');
const gradients = ['gradient-a', 'gradient-b', 'gradient-c'];

const done = computed(() => videos.value.filter((v) => v.watched).length);
const shown = computed(() =>
  filter.value === 'concluidas' ? videos.value.filter((v) => v.watched)
  : filter.value === 'pendentes' ? videos.value.filter((v) => !v.watched)
  : videos.value
);

async function load() {
  try {
    const d = await api('/videos');
    videos.value = d.videos;
    progress.value = d.progress;
    if (current.value) current.value = d.videos.find((v) => v.id === current.value.id) ?? null;
  } catch (e) { error.value = e.message; }
}

async function onWatched(v) {
  try {
    await api(`/videos/${v.id}/watch`, { method: 'POST' });
    await load();
    toast('Aula concluída.');
  } catch (e) { error.value = e.message; }
}

onMounted(load);
</script>

<template>
  <div class="page-intro">
    <div>
      <span class="eyebrow">MÓDULO 1</span>
      <h2>Aprenda a identificar phishing com contexto corporativo</h2>
      <p>Conteúdo curto e objetivo, com foco em situações reais de trabalho e no uso de IA Generativa por atacantes.</p>
    </div>
    <div style="min-width:220px">
      <span style="font-size:12px;color:var(--muted)">Seu progresso</span>
      <strong style="display:block">{{ done }} de {{ videos.length }} aulas concluídas ({{ progress }}%)</strong>
      <div class="mini-progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da trilha">
        <span :style="{ width: progress + '%' }"></span>
      </div>
    </div>
  </div>

  <p v-if="error" class="error-text" role="alert">{{ error }}</p>

  <div class="section-title">
    <div><h3>Trilha “Phishing + IA”</h3><p>{{ videos.length }} aulas • Módulo Essencial</p></div>
    <select v-model="filter" aria-label="Filtrar aulas">
      <option value="todas">Todas as aulas</option>
      <option value="concluidas">Concluídas</option>
      <option value="pendentes">Não concluídas</option>
    </select>
  </div>

  <p v-if="!shown.length && videos.length" class="empty">Nenhuma aula neste filtro.</p>
  <div class="course-grid">
    <article v-for="v in shown" :key="v.id" class="course-card">
      <div class="course-thumb" :class="gradients[(v.id - 1) % 3]">
        <span>{{ String(v.id).padStart(2, '0') }}</span>
        <button :aria-label="`Assistir à aula ${v.title}`" @click="current = v">▶</button>
      </div>
      <div class="course-body">
        <span class="badge" :class="v.watched ? 'success' : 'neutral'">{{ v.watched ? 'Assistido' : 'Não iniciada' }}</span>
        <h4>{{ v.title }}</h4>
        <p>{{ v.description }}</p>
        <small>{{ v.level }}</small>
      </div>
    </article>
  </div>

  <LessonModal v-if="current" :key="current.id" :lesson="current" @close="current = null" @watched="onWatched" />
</template>
