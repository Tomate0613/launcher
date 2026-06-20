import fs from 'node:fs/promises';
import path from 'node:path';
import { themesPath } from '../paths';

function css(strings: TemplateStringsArray) {
  return strings.raw[0];
}

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

const TRANSPARENT_THEME_CSS = css`
  :root {
    --color-background: transparent;
  }

  .card .context-menu button {
    z-index: 1;
    backdrop-filter: blur(0.5rem);
  }

  .content-item-card {
    border-radius: 0.5rem;
  }

  .context-menu {
    background-color: transparent !important;
  }
`;

type ThemeManifest = {
  name: string;
};

async function writeTheme(
  themePath: string,
  themeCss: string,
  themeManifest: ThemeManifest,
) {
  try {
    await fs.access(themePath);
  } catch {
    await fs.mkdir(themePath, { recursive: true });
    await fs.writeFile(
      path.join(themePath, 'theme.json'),
      JSON.stringify(themeManifest, null, 2),
    );
    await fs.writeFile(path.join(themePath, 'theme.css'), themeCss);
  }
}

export async function writeDefaultThemes() {
  const lightThemePath = path.join(themesPath, 'light');
  const transparentThemePath = path.join(themesPath, 'transparent');

  await writeTheme(lightThemePath, LIGHT_THEME_CSS, {
    name: 'Light',
  });
  await writeTheme(transparentThemePath, TRANSPARENT_THEME_CSS, {
    name: 'Transparent',
  });
}
