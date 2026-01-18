import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import '../../common/logging/logRenderer';
import { log } from '../../common/logging/log';
import { setTheme } from './theme';

const logger = log('main');

const theme = await window.api.invoke('getTheme');

setTheme(theme);

createApp(App).use(router).mount('#app');

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.dispatchEvent(new CustomEvent('vite:beforeUpdate'));
  });
}

logger.log('Frontend loaded');
