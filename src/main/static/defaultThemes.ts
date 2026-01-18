import fs from 'node:fs/promises';
import path from 'node:path';
import { themesPath } from '../paths';

function css(strings: TemplateStringsArray) {
  return strings.raw[0];
}

const LIGHT_THEME_JSON = {
  name: 'Light',
};

const LIGHT_THEME_CSS = css`
  :root {
    --color-background: #fafafb;
    --color-background-light: #aaa;
    --color-text: #101010;
    --color-text-highlight: black;

    --color-ui-layer-dim-2: transparent;
    --color-ui-layer-dim: transparent;
    --color-ui-layer: #00000020;
    --color-ui-layer-light: #00000030;

    --color-accent: #f42763;

    --color-context-menu: white;

    color-scheme: light;
  }

  .card,
  .content-item-card {
    background-color: white !important;
    box-shadow: 0 0 0.5rem var(--color-shadow-light);
    border: 1px solid var(--color-ui-layer) !important;
  }

  .settings-option {
    border-top: 1px solid #00000010 !important;
  }
`;

export async function writeDefaultThemes() {
  const lightThemePath = path.join(themesPath, 'light');

  try {
    await fs.access(lightThemePath);
  } catch {
    await fs.mkdir(lightThemePath, { recursive: true });
    await fs.writeFile(
      path.join(lightThemePath, 'theme.json'),
      JSON.stringify(LIGHT_THEME_JSON, null, 2),
    );
    await fs.writeFile(path.join(lightThemePath, 'theme.css'), LIGHT_THEME_CSS);
  }
}
