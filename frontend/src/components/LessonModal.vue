<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({ lesson: { type: Object, required: true } });
const emit = defineEmits(['close', 'watched']);

const loading = ref(true);
const failed = ref(false);
const closeBtn = ref(null);
let marked = false;

// A aula conta como assistida quando o vídeo chega a 90% (ou termina).
function onTimeUpdate(e) {
  const el = e.target;
  if (!marked && el.duration && el.currentTime / el.duration >= 0.9) markWatched();
}
function markWatched() {
  if (marked || props.lesson.watched) return;
  marked = true;
  emit('watched', props.lesson);
}
function onKey(e) { if (e.key === 'Escape') emit('close'); }

onMounted(async () => {
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  await nextTick();
  closeBtn.value?.focus();
});
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="lessonModalTitle">
      <div class="modal-header">
        <div><span class="eyebrow">AULA EM VÍDEO</span><h3 id="lessonModalTitle">{{ lesson.title }}</h3></div>
        <button ref="closeBtn" class="icon-btn" aria-label="Fechar aula" @click="emit('close')">✕</button>
      </div>

      <div class="video-container">
        <div v-if="loading" class="video-loading-overlay">
          <div class="spinner"></div>
          <span>{{ failed ? 'Não foi possível carregar o vídeo.' : 'Carregando o vídeo...' }}</span>
        </div>
        <video :src="lesson.src" controls autoplay preload="metadata"
          @canplay="loading = false" @error="failed = true"
          @timeupdate="onTimeUpdate" @ended="markWatched">
          O seu navegador não suporta vídeo.
        </video>
      </div>

      <div class="modal-grid">
        <div>
          <h4>{{ lesson.pointsTitle }}</h4>
          <ul><li v-for="(p, i) in lesson.keyPoints" :key="i">{{ p }}</li></ul>
        </div>
        <div class="quiz-card">
          <strong>Progresso da aula</strong>
          <p v-if="lesson.watched">Esta aula já está marcada como assistida.</p>
          <p v-else>A aula é marcada como assistida quando o vídeo chega a 90%.</p>
          <span class="badge" :class="lesson.watched ? 'success' : 'neutral'">{{ lesson.watched ? 'Assistido' : 'Em andamento' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
