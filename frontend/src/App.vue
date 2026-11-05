<script setup>
import { useRouter } from 'vue-router';
import { api, session, setSession } from './api.js';

const router = useRouter();

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch { /* sessão já inválida */ }
  setSession(null, null);
  router.push('/login');
}
</script>

<template>
  <header v-if="session.token" class="topbar">
    <div class="brand">🛡️ SpearShield <span>IA</span></div>
    <nav aria-label="Principal">
      <RouterLink to="/">Dashboard</RouterLink>
      <template v-if="session.user.role === 'colaborador'">
        <RouterLink to="/videos">Vídeos</RouterLink>
        <RouterLink to="/simulador">Simulador</RouterLink>
      </template>
      <RouterLink v-else to="/gestor">Área do gestor</RouterLink>
    </nav>
    <div class="user">
      <span>{{ session.user.name }} <small class="badge">{{ session.user.role }}</small></span>
      <button class="btn ghost" @click="logout">Sair</button>
    </div>
  </header>
  <main class="container"><RouterView /></main>
  <footer class="footer">Ambiente seguro: nenhum e-mail é enviado e nenhuma senha real é coletada. Todos os cenários são simulados.</footer>
</template>
