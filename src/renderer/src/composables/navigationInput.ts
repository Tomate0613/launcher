import { useEventListener } from '@vueuse/core';

export type Action =
  | 'right'
  | 'left'
  | 'down'
  | 'up'
  | 'primary'
  | 'cancel'
  | 'secondary'
  | 'options';

type KeyBinding = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: Action;
};

function matchesBinding(event: KeyboardEvent, binding: KeyBinding) {
  return (
    event.key === binding.key &&
    !!event.ctrlKey === !!binding.ctrl &&
    !!event.shiftKey === !!binding.shift &&
    !!event.altKey === !!binding.alt &&
    !!event.metaKey === !!binding.meta
  );
}

export function useNavigationInput(
  handler: (action: Action) => boolean | undefined | void,
  options: {
    bindings: KeyBinding[];
  } = {
    bindings: [
      { key: 'Tab', action: 'right' },
      { key: 'Tab', shift: true, action: 'left' },
      { key: 'ArrowRight', action: 'right' },
      { key: 'ArrowLeft', action: 'left' },
      { key: 'ArrowDown', action: 'down' },
      { key: 'ArrowUp', action: 'up' },
      { key: 'Enter', action: 'primary' },
      { key: 'Space', action: 'primary' },
      { key: 'Escape', action: 'cancel' },
    ],
  },
) {
  function onKeyDown(event: KeyboardEvent) {
    const binding = options.bindings.find((b) => matchesBinding(event, b));

    if (!binding) {
      return;
    }

    if (
      !['right', 'down', 'left', 'up'].includes(binding.action) &&
      event.repeat
    ) {
      return;
    }

    if (handler(binding.action)) {
      event.preventDefault();
    }
  }

  useEventListener('controller-input' as never, (event) => {
    handler((event as any).detail);
  });

  useEventListener('keydown', onKeyDown);
}
