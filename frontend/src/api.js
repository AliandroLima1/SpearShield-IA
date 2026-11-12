import { reactive } from 'vue';

export const session = reactive({
  token: localStorage.getItem('ss_token'),
  user: JSON.parse(localStorage.getItem('ss_user') || 'null')
});

export function setSession(token, user) {
  session.token = token;
  session.user = user;
  if (token) {
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session.token ? { Authorization: 'Bearer ' + session.token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && session.token) {
    setSession(null, null);
    window.location.hash = '#/login';
  }
  if (!res.ok) throw new Error(data.error || 'Erro inesperado.');
  return data;
}

// Aviso rápido no rodapé (equivalente ao "toast" do protótipo).
export const ui = reactive({ toast: '' });
let toastTimer;
export function toast(message) {
  ui.toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toast = ''), 2600);
}

// Data do banco ("AAAA-MM-DD HH:MM:SS", UTC) para dd/mm/aaaa.
export function formatDate(value) {
  const d = new Date(value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR');
}
