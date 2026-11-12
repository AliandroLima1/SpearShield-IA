<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api, formatDate } from '../api.js';

const route = useRoute();
const open = ref(false);
const items = ref([]);
const unread = ref(0);
const wrap = ref(null);

async function load() {
  try {
    const d = await api('/notifications');
    items.value = d.notifications;
    unread.value = d.unread;
  } catch { /* indicador opcional */ }
}

// Ao abrir, mostra as não lidas destacadas e marca tudo como lido no servidor.
async function toggle() {
  open.value = !open.value;
  if (open.value && unread.value) {
    try { await api('/notifications/read', { method: 'POST' }); unread.value = 0; } catch { /* tenta de novo depois */ }
  } else if (!open.value) {
    items.value = items.value.map((n) => ({ ...n, read: true }));
  }
}

function onDocClick(e) { if (open.value && wrap.value && !wrap.value.contains(e.target)) open.value = false; }
function onKey(e) { if (e.key === 'Escape') open.value = false; }

onMounted(() => {
  load();
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
watch(() => route.path, load);
</script>

<template>
  <div class="notif-wrap" ref="wrap">
    <button class="icon-btn notification-btn" :aria-expanded="open" aria-controls="notif-panel"
      :aria-label="unread ? `Notificações: ${unread} não lidas` : 'Notificações'" @click="toggle">
      🔔<span v-if="unread" class="notification-badge" aria-hidden="true">{{ unread }}</span>
    </button>
    <div v-if="open" id="notif-panel" class="notif-panel" role="region" aria-label="Notificações">
      <h4>Notificações</h4>
      <p v-if="!items.length" class="empty" style="padding:10px 14px">Nenhuma notificação por enquanto.</p>
      <div v-for="n in items" :key="n.id" class="notif-item" :class="{ unread: !n.read }">
        {{ n.message }}
        <time>{{ formatDate(n.createdAt) }}</time>
      </div>
    </div>
  </div>
</template>
