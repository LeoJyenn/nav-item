import { createRouter, createWebHistory } from 'vue-router';
import { getUserProfile } from './api';

const Home = () => import('./views/Home.vue');
const Admin = () => import('./views/Admin.vue');

const routes = [
  { path: '/', component: Home },
  { path: '/admin', component: Admin }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  if (!to.path.startsWith('/admin')) {
    return next();
  }

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

  if (!token) {
    return next();
  }

  try {
    await getUserProfile();
    return next();
  } catch (e) {
    if (e.response && e.response.status === 401) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      return next('/admin');
    }
    return next();
  }
});

export default router;
