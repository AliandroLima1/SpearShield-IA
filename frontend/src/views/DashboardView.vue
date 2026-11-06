<script setup>
import { ref, onMounted } from 'vue';
import { api, session } from '../api.js';

const data = ref(null);
const overview = ref(null);
const error = ref('');
const isManager = session.user.role === 'gestor';

onMounted(async () => {
  try {
    if (isManager) overview.value = await api('/manager/overview');
    else data.value = await api('/dashboard');
  } catch (e) { error.value = e.message; }
});
</script>

<template>
  <h1>Olá, {{ session.user.name }}</h1>
  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <template v-if="data">
    <div class="grid">
      <div class="card stat"><span>Vídeos assistidos</span><strong>{{ data.stats.videosWatched }}/{{ data.stats.videosTotal }}</strong>
        <div class="bar"><div :style="{ width: data.stats.videoProgress + '%' }"></div></div></div>
      <div class="card stat"><span>Simulações respondidas</span><strong>{{ data.stats.attempts }}</strong></div>
      <div class="card stat"><span>Taxa de acerto</span><strong>{{ data.stats.accuracy }}%</strong></div>
      <div class="card stat"><span>Seu nível de risco</span><strong :class="'risk ' + data.stats.risk">{{ data.stats.risk }}</strong></div>
    </div>
    <div class="card">
      <h2>Próximos passos</h2>
      <p>Assista às aulas e pratique no simulador. A dúvida também é aprendizado.</p>
      <RouterLink class="btn" to="/videos">Ver vídeos</RouterLink>
      <RouterLink class="btn ghost" to="/simulador">Abrir simulador</RouterLink>
    </div>
  </template>

  <template v-if="overview">
    <div class="grid">
      <div class="card stat"><span>Colaboradores</span><strong>{{ overview.summary.employees }}</strong></div>
      <div class="card stat"><span>Acerto médio</span><strong>{{ overview.summary.avgAccuracy }}%</strong></div>
      <div class="card stat"><span>Progresso médio em vídeos</span><strong>{{ overview.summary.avgVideoProgress }}%</strong></div>
      <div class="card stat"><span>Risco corporativo</span><strong :class="'risk ' + overview.summary.risk">{{ overview.summary.risk }}</strong></div>
    </div>
    <div class="card">
      <h2>Gerencie campanhas e acompanhe equipes</h2>
      <RouterLink class="btn" to="/gestor">Ir para a área do gestor</RouterLink>
    </div>
  </template>
</template>
