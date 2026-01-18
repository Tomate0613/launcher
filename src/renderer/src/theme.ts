export function setTheme(theme?: string) {
  document.getElementById('theme')?.remove();

  if (theme) {
    const themeLink = document.createElement('link');
    themeLink.rel = 'stylesheet';
    themeLink.id = 'theme';
    themeLink.href = theme;

    document.head.appendChild(themeLink);
  }
}
