import { createRouter, createWebHashHistory } from 'vue-router';
import { session } from './api.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import VideosView from './views/VideosView.vue';
import SimulatorView from './views/SimulatorView.vue';
import ReportsView from './views/ReportsView.vue';
import ManagerView from './views/ManagerView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true, title: 'Entrar' } },
    { path: '/', component: DashboardView, meta: { role: 'colaborador', title: 'Visão geral' } },
    { path: '/videos', component: VideosView, meta: { title: 'Vídeos e lições' } },
    { path: '/simulador', component: SimulatorView, meta: { title: 'Simulador de phishing' } },
    { path: '/desempenho', component: ReportsView, meta: { role: 'colaborador', title: 'Meu desempenho' } },
    { path: '/gestor', component: ManagerView, meta: { role: 'gestor', title: 'Área do gestor' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
});

const home = () => (session.user?.role === 'gestor' ? '/gestor' : '/');

router.beforeEach((to) => {
  if (!to.meta.public && !session.token) return '/login';
  if (to.path === '/login' && session.token) return home();
  if (to.meta.role && session.user?.role !== to.meta.role) return home();
});

router.afterEach((to) => {
  document.title = `${to.meta.title} | SpearShield IA`;
});

export default router;
