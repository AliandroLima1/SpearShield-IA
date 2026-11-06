<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setSession } from '../api.js';
import BrandMark from '../components/BrandMark.vue';

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
    password.value = '';
    router.push(user.role === 'gestor' ? '/gestor' : '/');
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrapper">
    <main class="login-card" id="conteudo">
      <BrandMark style="margin:0 auto 16px;width:34px" />
      <h2>SpearShield</h2>
      <p>Faça login para acessar seu treinamento.</p>

      <form class="login-form" @submit.prevent="submit">
        <div class="input-group">
          <label for="loginEmail">E-mail corporativo</label>
          <input id="loginEmail" v-model="email" type="email" placeholder="ex: gestor@empresa.com" required autocomplete="username" />
        </div>
        <div class="input-group">
          <label for="loginPassword">Senha</label>
          <input id="loginPassword" v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </div>
        <div v-if="error" class="login-error" role="alert">{{ error }}</div>
        <button type="submit" class="btn primary full" style="margin-top:8px" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar na plataforma' }}
        </button>
      </form>

      <div class="login-hints">
        <strong>Credenciais de teste:</strong><br />
        Colaborador: <em>colab@empresa.com</em> | Senha: <em>123</em><br />
        Gestor: <em>gestor@empresa.com</em> | Senha: <em>123</em>
      </div>
    </main>
  </div>
</template>
