<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../api.js';

const data = ref(null);
const error = ref('');
const gradients = ['gradient-a', 'gradient-b', 'gradient-c'];

// Dicas de segurança do protótipo; a dica do dia muda conforme a data.
const tips = [
  'Antes de clicar, passe o cursor sobre o link e confira se o domínio pertence realmente à organização.',
  'Desconfie de mensagens que impõem prazo curto. Urgência é uma das táticas mais usadas em phishing.',
  'Nenhuma equipe legítima pede sua senha por e-mail. Acesse o portal oficial digitando o endereço.',
  'Recebeu um pedido incomum de um colega ou gestor? Confirme por outro canal, como telefone ou chat interno.',
  'Anexos inesperados merecem cautela, mesmo quando o remetente parece conhecido.'
];
const tipIndex = ref(new Date().getDate() % tips.length);

// Circunferência do círculo do medidor (r = 48).
const CIRC = 301.6;
const gaugeOffset = computed(() => CIRC * (1 - (data.value?.resilience.score ?? 0) / 100));
const remaining = computed(() => data.value ? data.value.stats.videosTotal - data.value.stats.videosWatched : 0);

onMounted(async () => {
  try { data.value = await api('/dashboard'); } catch (e) { error.value = e.message; }
});
</script>

<template>
  <p v-if="error" class="error-text" role="alert">{{ error }}</p>

  <template v-if="data">
    <div class="hero">
      <div>
        <span class="eyebrow">TREINAMENTO ADAPTATIVO</span>
        <h2>Reconheça o phishing antes que ele reconheça você.</h2>
        <p>Aprenda com vídeos rápidos, pratique com cenários corporativos simulados e receba feedback imediato com apoio de IA.</p>
        <div class="hero-actions">
          <RouterLink class="btn primary" to="/videos">Continuar treinamento</RouterLink>
          <RouterLink class="btn ghost" to="/simulador">Iniciar simulação</RouterLink>
        </div>
      </div>
      <div class="risk-card" aria-label="Índice de resiliência">
        <div class="risk-score">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="48" class="gauge-bg"></circle>
            <circle cx="60" cy="60" r="48" class="gauge-value" :style="{ strokeDashoffset: gaugeOffset }"></circle>
          </svg>
          <div class="risk-score-value"><strong>{{ data.resilience.score ?? '—' }}</strong><span>/100</span></div>
        </div>
        <div>
          <span class="risk-label">Índice de resiliência</span>
          <strong>{{ data.resilience.label }}</strong>
          <p>{{ data.resilience.text }}</p>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">✓</span>
        <div><span>Progresso da trilha</span><strong>{{ data.stats.videoProgress }}%</strong></div>
        <div class="mini-progress"><span :style="{ width: data.stats.videoProgress + '%' }"></span></div>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">▶</span>
        <div><span>Aulas concluídas</span><strong>{{ data.stats.videosWatched }} / {{ data.stats.videosTotal }}</strong></div>
        <small>{{ remaining ? `${remaining} ${remaining === 1 ? 'aula restante' : 'aulas restantes'}` : 'Trilha concluída' }}</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">✉</span>
        <div><span>Simulações concluídas</span><strong>{{ data.stats.attempts }}</strong></div>
        <small>{{ data.stats.accuracy !== null ? `${data.stats.accuracy}% de acerto` : 'Nenhuma resposta decidida ainda' }}</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon" aria-hidden="true">⚑</span>
        <div><span>Pontos de atenção</span><strong>{{ data.attention.length }}</strong></div>
        <small>{{ data.attention.length ? data.attention.join(', ') : 'Nenhum por enquanto' }}</small>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-heading">
          <div><span class="eyebrow">MÓDULO 1</span><h3>Vídeos e lições</h3></div>
          <RouterLink class="text-btn" to="/videos">Ver todas →</RouterLink>
        </div>
        <div v-for="(l, i) in data.lessons" :key="l.id" class="lesson-row">
          <div class="lesson-thumb" :class="gradients[i % 3]" aria-hidden="true"><span>▶</span></div>
          <div class="lesson-copy">
            <span class="badge" :class="l.watched ? 'success' : 'neutral'">{{ l.watched ? 'Assistido' : 'Não iniciada' }}</span>
            <strong>{{ l.title }}</strong>
            <p>{{ l.description }}</p>
          </div>
        </div>
      </section>

      <section class="panel sim-preview">
        <div class="panel-heading">
          <div><span class="eyebrow">MÓDULO 2</span><h3>Simulação recomendada</h3></div>
          <span v-if="data.nextScenario" style="font-size:11.5px;color:var(--muted)">{{ data.nextScenario.level }}</span>
        </div>
        <div class="simulation-illustration" aria-hidden="true">
          <div class="fake-window">
            <div class="fake-window-top"><span></span><span></span><span></span></div>
            <div class="fake-email-line long"></div><div class="fake-email-line medium"></div>
            <div class="fake-email-box"></div><div class="fake-email-button"></div>
          </div>
          <div class="ai-chip">IA</div>
        </div>
        <template v-if="data.nextScenario">
          <h4>{{ data.nextScenario.subject }}</h4>
          <p>Você receberá uma mensagem de “{{ data.nextScenario.sender }}”. Avalie os sinais antes de decidir.</p>
          <RouterLink class="btn primary full" :to="{ path: '/simulador', query: { cenario: data.nextScenario.id } }">Começar cenário</RouterLink>
        </template>
        <template v-else>
          <h4>Todos os cenários analisados</h4>
          <p>Você já respondeu os {{ data.totalScenarios }} cenários do treino livre. Veja como foi seu desempenho.</p>
          <RouterLink class="btn primary full" to="/desempenho">Ver meu desempenho</RouterLink>
        </template>
      </section>
    </div>

    <section class="panel compact-tip">
      <div class="tip-icon" aria-hidden="true">💡</div>
      <div aria-live="polite"><strong>Dica de segurança do dia</strong><p>{{ tips[tipIndex] }}</p></div>
      <button class="text-btn" @click="tipIndex = (tipIndex + 1) % tips.length">Próxima dica</button>
    </section>
  </template>
</template>
