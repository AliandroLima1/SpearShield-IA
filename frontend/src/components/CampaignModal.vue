<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  scenarios: { type: Array, required: true },
  departments: { type: Array, required: true }
});
const emit = defineEmits(['close', 'saved']);

const form = ref({
  name: '',
  department: null,
  scenarioIds: props.scenarios.length ? [props.scenarios[0].id] : [],
  level: 'Intermediário',
  description: 'Treinar validação de domínio, análise de urgência e confirmação por canal oficial.'
});
const error = ref('');
const saving = ref(false);
const nameInput = ref(null);

async function save() {
  error.value = '';
  if (!form.value.scenarioIds.length) { error.value = 'Selecione ao menos um cenário.'; return; }
  saving.value = true;
  try {
    const { campaign } = await api('/campaigns', { method: 'POST', body: form.value });
    emit('saved', campaign);
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

function onKey(e) { if (e.key === 'Escape') emit('close'); }
onMounted(async () => {
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  await nextTick();
  nameInput.value?.focus();
});
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal narrow" role="dialog" aria-modal="true" aria-labelledby="campaignModalTitle">
      <div class="modal-header">
        <div><span class="eyebrow">AMBIENTE SEGURO</span><h3 id="campaignModalTitle">Nova campanha educacional</h3></div>
        <button class="icon-btn" aria-label="Fechar" @click="emit('close')">✕</button>
      </div>
      <form class="campaign-form" @submit.prevent="save">
        <label>Nome da campanha
          <input ref="nameInput" v-model="form.name" maxlength="100" required placeholder="Treinamento trimestral — RH" />
        </label>
        <label>Público autorizado
          <select v-model="form.department">
            <option :value="null">Todos os colaboradores</option>
            <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
        <fieldset class="checks">
          <legend>Cenários</legend>
          <label v-for="s in scenarios" :key="s.id">
            <input type="checkbox" :value="s.id" v-model="form.scenarioIds" /> {{ s.subject }}
          </label>
        </fieldset>
        <label>Nível
          <select v-model="form.level">
            <option>Básico</option><option>Intermediário</option><option>Avançado</option>
          </select>
        </label>
        <label>Objetivo pedagógico
          <textarea v-model="form.description" maxlength="500"></textarea>
        </label>
        <div class="manager-banner small">
          <p>A campanha aparece no simulador dos colaboradores do público escolhido. Nenhuma mensagem real é enviada.</p>
        </div>
        <p v-if="error" class="error-text" role="alert" style="margin-bottom:10px">{{ error }}</p>
        <button class="btn primary full" :disabled="saving">{{ saving ? 'Salvando...' : 'Salvar campanha' }}</button>
      </form>
    </div>
  </div>
</template>
