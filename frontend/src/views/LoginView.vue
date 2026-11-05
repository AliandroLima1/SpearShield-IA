<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setSession } from '../api.js';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    const { token, user } = await api('/login', { method: 'POST', body: { email: email.value, password: password.value } });
    setSession(token, user);
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function fill(e, p) { email.value = e; password.value = p; }
</script>

<template>
  <section class="card login">
    <h1>🛡️ SpearShield IA</h1>
    <p class="muted">Treinamento em spear phishing com simulações seguras.</p>
    <form @submit.prevent="submit">
      <label for="email">E-mail</label>
      <input id="email" v-model="email" type="email" required autocomplete="username" />
      <label for="pw">Senha</label>
      <input id="pw" v-model="password" type="password" required autocomplete="current-password" />
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="btn" :disabled="loading">{{ loading ? 'Entrando...' : 'Entrar' }}</button>
    </form>
    <div class="demo">
      <p class="muted">Credenciais de teste:</p>
      <button type="button" class="btn ghost" @click="fill('colab@empresa.com', '123')">Colaborador</button>
      <button type="button" class="btn ghost" @click="fill('gestor@empresa.com', '123')">Gestor</button>
    </div>
  </section>
</template>
