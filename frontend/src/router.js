import { createRouter, createWebHashHistory } from 'vue-router';
import { session } from './api.js';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import VideosView from './views/VideosView.vue';
import SimulatorView from './views/SimulatorView.vue';
import ManagerView from './views/ManagerView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', component: DashboardView },
    { path: '/videos', component: VideosView, meta: { role: 'colaborador' } },
    { path: '/simulador', component: SimulatorView, meta: { role: 'colaborador' } },
    { path: '/gestor', component: ManagerView, meta: { role: 'gestor' } },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
});

router.beforeEach((to) => {
  if (!to.meta.public && !session.token) return '/login';
  if (to.path === '/login' && session.token) return '/';
  if (to.meta.role && session.user?.role !== to.meta.role) return '/';
});

export default router;
