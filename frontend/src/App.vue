<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, session, setSession, ui } from './api.js';
import BrandMark from './components/BrandMark.vue';
import NotificationBell from './components/NotificationBell.vue';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);

const isManager = computed(() => session.user?.role === 'gestor');
const nav = computed(() =>
  isManager.value
    ? [
        { to: '/gestor', icon: '⚙', label: 'Área do gestor' },
        { to: '/videos', icon: '▶', label: 'Vídeos e lições' },
        { to: '/simulador', icon: '✉', label: 'Simulador (prévia)' }
      ]
    : [
        { to: '/', icon: '⌂', label: 'Visão geral' },
        { to: '/videos', icon: '▶', label: 'Vídeos e lições' },
        { to: '/simulador', icon: '✉', label: 'Simulador de phishing' },
        { to: '/desempenho', icon: '▥', label: 'Meu desempenho' }
      ]
);
const isHome = computed(() => route.path === (isManager.value ? '/gestor' : '/'));

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch { /* sessão já inválida */ }
  setSession(null, null);
  router.push('/login');
}

// Atualiza os dados do usuário guardados no navegador (nome, cargo, departamento).
onMounted(async () => {
  if (!session.token) return;
  try { setSession(session.token, (await api('/me')).user); } catch { /* 401 já trata */ }
});

watch(() => route.path, () => (menuOpen.value = false));
</script>

<template>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>

  <RouterView v-if="route.meta.public" />

  <div v-else-if="session.user" class="app-shell">
    <div class="sidebar-backdrop" :class="{ open: menuOpen }" @click="menuOpen = false"></div>
    <aside class="sidebar" :class="{ open: menuOpen }" id="sidebar" aria-label="Navegação principal">
      <div class="brand">
        <BrandMark />
        <div><strong>SpearShield</strong><span>Segurança começa por você</span></div>
      </div>
      <nav class="nav-list">
        <RouterLink v-for="item in nav" :key="item.to" :to="item.to" class="nav-item"
          :class="{ active: route.path === item.to }" :aria-current="route.path === item.to ? 'page' : undefined">
          <span class="icon" aria-hidden="true">{{ item.icon }}</span><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="security-note">
        <div class="security-dot"></div>
        <div><strong>Ambiente de treinamento</strong><span>Nenhuma credencial real é coletada.</span></div>
      </div>
      <div class="sidebar-user">
        <div class="avatar" aria-hidden="true">{{ session.user.initials }}</div>
        <div><strong>{{ session.user.name }}</strong><span>{{ session.user.title || session.user.role }}</span></div>
      </div>
    </aside>

    <main class="main" id="conteudo">
      <header class="topbar">
        <button class="mobile-menu" aria-label="Abrir menu" aria-controls="sidebar" :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen">☰</button>
        <div class="topbar-title">
          <span id="breadcrumb">{{ isHome ? 'Início' : 'Início / Plataforma' }}</span>
          <h1>{{ route.meta.title }}</h1>
        </div>
        <div class="topbar-actions">
          <button class="btn ghost" style="padding:6px 12px;font-size:11px" @click="logout">Sair da conta</button>
          <NotificationBell />
        </div>
      </header>
      <RouterView />
    </main>
  </div>

  <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
</template>
