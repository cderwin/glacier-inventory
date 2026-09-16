// Color scheme selection. Until the reader picks one, the app follows
// prefers-color-scheme. Picking 'light' or 'dark' sets <html data-theme>,
// which app.css uses to override the media query, and is remembered per
// browser.

const STORAGE_KEY = 'glacier-inventory:theme';

export const THEMES = ['light', 'dark'];

export const DARK_QUERY = '(prefers-color-scheme: dark)';

// What the system asks for right now.
export function systemTheme() {
  return window.matchMedia && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

// Must match --light-bg and --dark-bg in app/styles/app.css.
const BACKGROUNDS = { light: '#eaf5fa', dark: '#0b2233' };

// The theme-color metas in index.html carry a prefers-color-scheme media
// attribute. An explicit theme has to override both of them, so keep what
// they shipped with to restore later.
let themeColorMetas = null;

function metas() {
  if (!themeColorMetas) {
    themeColorMetas = Array.from(document.querySelectorAll('meta[name="theme-color"]')).map(meta => ({
      meta,
      content: meta.getAttribute('content')
    }));
  }
  return themeColorMetas;
}

// The reader's choice, or null while they haven't made one. Storage throws
// in some privacy modes, and the app works fine without it.
export function storedTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.indexOf(stored) === -1 ? null : stored;
  } catch (err) {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (err) {
    /* Not fatal: the theme still applies for this page view. */
  }
}

// A null theme hands control back to prefers-color-scheme.
export function applyTheme(theme) {
  const root = document.documentElement;
  if (!theme) {
    root.removeAttribute('data-theme');
    metas().forEach(({ meta, content }) => meta.setAttribute('content', content));
  } else {
    root.setAttribute('data-theme', theme);
    // Both metas get the same color, so whichever the browser matches is right.
    metas().forEach(({ meta }) => meta.setAttribute('content', BACKGROUNDS[theme]));
  }
}
