<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

const overview = ref(null);
const campaigns = ref([]);
const scenarios = ref([]);
const error = ref('');
const form = ref({ name: '', description: '', scenarioIds: [] });

// Carrega os três painéis de forma independente: a falha de um não esconde os outros.
async function load() {
  const [o, c, s] = await Promise.allSettled([api('/manager/overview'), api('/campaigns'), api('/scenarios')]);
  if (o.status === 'fulfilled') overview.value = o.value;
  if (c.status === 'fulfilled') campaigns.value = c.value.campaigns;
  if (s.status === 'fulfilled') scenarios.value = s.value.scenarios;
  const failed = [o, c, s].find((r) => r.status === 'rejected');
  error.value = failed ? failed.reason.message : '';
}

async function create() {
  error.value = '';
  try {
    await api('/campaigns', { method: 'POST', body: form.value });
    form.value = { name: '', description: '', scenarioIds: [] };
    await load();
  } catch (e) { error.value = e.message; }
}

async function remove(c) {
  if (!confirm(`Excluir a campanha "${c.name}"?`)) return;
  try { await api(`/campaigns/${c.id}`, { method: 'DELETE' }); await load(); }
  catch (e) { error.value = e.message; }
}

onMounted(load);
</script>

<template>
  <h1>Área do gestor</h1>
  <p v-if="error" class="error" role="alert">{{ error }}</p>

  <section class="card">
    <h2>Nova campanha de simulação</h2>
    <form @submit.prevent="create">
      <label for="cn">Nome</label>
      <input id="cn" v-model="form.name" maxlength="100" required />
      <label for="cd">Descrição</label>
      <textarea id="cd" v-model="form.description" maxlength="500" rows="2"></textarea>
      <fieldset>
        <legend>Cenários</legend>
        <label v-for="s in scenarios" :key="s.id" class="check">
          <input type="checkbox" :value="s.id" v-model="form.scenarioIds" /> {{ s.subject }}
        </label>
      </fieldset>
      <button class="btn">Criar campanha</button>
    </form>
  </section>

  <section class="card">
    <h2>Campanhas</h2>
    <p v-if="!campaigns.length" class="muted">Nenhuma campanha criada.</p>
    <div class="table-wrap" v-else>
      <table>
        <thead><tr><th>Nome</th><th>Cenários</th><th>Participantes</th><th>Respostas</th><th>Acerto</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in campaigns" :key="c.id">
            <td>{{ c.name }}<br /><small class="muted">{{ c.description }}</small></td>
            <td>{{ c.scenarioIds.length }}</td><td>{{ c.participants }}</td>
            <td>{{ c.attempts }}</td><td>{{ c.accuracy }}%</td>
            <td><button class="btn ghost" @click="remove(c)">Excluir</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="card" v-if="overview">
    <h2>Desempenho dos colaboradores</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Colaborador</th><th>Vídeos</th><th>Simulações</th><th>"Não sei"</th><th>Acerto</th><th>Risco</th></tr></thead>
        <tbody>
          <tr v-for="e in overview.employees" :key="e.id">
            <td>{{ e.name }}<br /><small class="muted">{{ e.email }}</small></td>
            <td>{{ e.videosWatched }}/{{ e.videosTotal }}</td>
            <td>{{ e.attempts }}</td><td>{{ e.unknowns }}</td><td>{{ e.accuracy }}%</td>
            <td><span :class="'risk ' + e.risk">{{ e.risk }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
