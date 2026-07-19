import { log } from '../../common/logging/log';

const logger = log('controller');

logger.log('Initializing controller support');

let buttonTimer = 0;
let lastButton = '';

function emit(name: string) {
  window.dispatchEvent(new CustomEvent('controller-input', { detail: name }));
}

function pollGamepad() {
  const pad = navigator.getGamepads()[0];

  if (pad) {
    // D-pad
    handleButton(pad.buttons[12], 'up', true);
    handleButton(pad.buttons[13], 'down', true);
    handleButton(pad.buttons[14], 'left', true);
    handleButton(pad.buttons[15], 'right', true);

    // A / B
    handleButton(pad.buttons[0], 'primary', false);
    handleButton(pad.buttons[1], 'cancel', false);

    // LB RB
    handleButton(pad.buttons[4], 'tab-previous', true);
    handleButton(pad.buttons[5], 'tab-next', true);

    // Left stick
    const DEADZONE = 0.5;

    handleAxis(pad.axes[0], pad.axes[1], DEADZONE);

    requestAnimationFrame(pollGamepad);
  }
}

function handleButton(button: GamepadButton, key: string, allowRepeats: boolean) {
  if (!button.pressed) {
    if (lastButton == key) {
      buttonTimer = 0;
      lastButton = '';
    }

    return;
  }

  if (lastButton == key) {
    if (Date.now() < buttonTimer || !allowRepeats) {
      return;
    }

    buttonTimer = Date.now() + 100;
  } else {
    lastButton = key;
    buttonTimer = Date.now() + 500;
  }

  emit(key);
}

let lastAxisDirection = '';
let axisTimer = 0;

function handleAxis(x: number, y: number, deadzone: number) {
  let direction = '';

  if (y < -deadzone) direction = 'up';
  else if (y > deadzone) direction = 'down';
  else if (x < -deadzone) direction = 'left';
  else if (x > deadzone) direction = 'right';

  if (!direction || lastAxisDirection != direction) {
    axisTimer = 0;
  }

  if (direction) {
    if (lastAxisDirection == direction) {
      if (Date.now() > axisTimer) {
        axisTimer = Date.now() + 100;
        emit(direction);
      }
    } else {
      axisTimer = Date.now() + 500;
      emit(direction);
    }
  }

  lastAxisDirection = direction;
}

window.addEventListener('gamepadconnected', (e) => {
  logger.log('Gamepad:', e.gamepad.id);
  pollGamepad();
});
