import { createRouter, createWebHashHistory } from 'vue-router';
import Main from './pages/Main.vue';
import InstanceSettings from './pages/InstanceSettings.vue';
import InstanceContent from './pages/InstanceContent.vue';
import Instances from './pages/Instances.vue';
import Accounts from './pages/Accounts.vue';
import Console from './pages/Console.vue';
import Settings from './pages/Settings.vue';
import Screenshots from './pages/Screenshots.vue';
import Explore from './pages/Explore.vue';
import Worlds from './pages/Worlds.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: Main,
      children: [
        { path: '', component: Instances },
        { path: 'install', component: Explore },
        { path: 'screenshots', component: Screenshots },
        { path: 'worlds', component: Worlds },
        { path: 'accounts', component: Accounts },
        { path: 'console', component: Console },
        { path: 'settings', component: Settings },
        {
          path: ':id',
          children: [
            {
              path: 'settings',
              component: InstanceSettings,
              props: (route) => ({ key: route.params.id }),
            },
            { path: ':contentType', component: InstanceContent },
          ],
        },
      ],
    },
  ],
});
