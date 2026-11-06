<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const videos = ref([]);
const progress = ref(0);
const error = ref('');
const current = ref(null);

async function load() {
  try {
    const d = await api('/videos');
    videos.value = d.videos;
    progress.value = d.progress;
    if (current.value) current.value = videos.value.find((v) => v.id === current.value.id) ?? null;
  } catch (e) { error.value = e.message; }
}

function open(v) { current.value = v; }
function close() { current.value = null; }

// A aula só conta como assistida quando o vídeo chega a 90% (ou termina).
let marking = false;
async function markWatched(v) {
  if (v.watched || marking) return;
  marking = true;
  try {
    await api(`/videos/${v.id}/watch`, { method: 'POST' });
    await load();
  } catch (e) {
    error.value = e.message;
  } finally {
    marking = false;
  }
}

function onTimeUpdate(e) {
  const el = e.target;
  if (el.duration && el.currentTime / el.duration >= 0.9) markWatched(current.value);
}

onMounted(load);
</script>

<template>
  <h1>Aulas em vídeo</h1>
  <div class="card">
    <strong>{{ videos.filter((v) => v.watched).length }} de {{ videos.length }} aulas concluídas ({{ progress }}%)</strong>
    <div class="bar" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div :style="{ width: progress + '%' }"></div>
    </div>
  </div>
  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <section v-if="current" class="card" aria-label="Player da aula">
    <h2>{{ current.title }}</h2>
    <video :key="current.id" :src="current.src" controls autoplay preload="metadata" class="player"
      @timeupdate="onTimeUpdate" @ended="markWatched(current)"></video>
    <p class="muted" v-if="!current.watched"><small>A aula é marcada como assistida ao chegar a 90% do vídeo.</small></p>
    <h3>{{ current.pointsTitle }}</h3>
    <ul><li v-for="(k, i) in current.keyPoints" :key="i">{{ k }}</li></ul>
    <button class="btn ghost" @click="close">Fechar aula</button>
  </section>

  <div class="grid videos">
    <article v-for="v in videos" :key="v.id" class="card video">
      <div class="thumb" aria-hidden="true">▶</div>
      <h2>{{ v.title }} <span v-if="v.watched" class="badge ok">Assistido</span></h2>
      <p class="muted">{{ v.description }}</p>
      <h3>{{ v.pointsTitle }}</h3>
      <ul><li v-for="(k, i) in v.keyPoints" :key="i">{{ k }}</li></ul>
      <button class="btn" @click="open(v)">Assistir aula</button>
    </article>
  </div>
</template>
