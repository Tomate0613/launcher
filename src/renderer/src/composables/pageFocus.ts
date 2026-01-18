import { useEventListener } from '@vueuse/core';
import { onMounted } from 'vue';

export function usePageFocus() {
  onMounted(() => {
    const page = document.querySelector('.page-scrollable') as HTMLElement;

    page.setAttribute('tabindex', '0');

    useEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          page.focus();
        }
      },
      { once: true },
    );
  });
}
