<template>
  <div class="theme-toggle" role="group" aria-label="Color theme">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="theme-toggle-button"
      :class="{ 'theme-toggle-button--active': option.value === active }"
      :aria-pressed="option.value === active ? 'true' : 'false'"
      :title="option.title"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script>
import { applyTheme, DARK_QUERY, saveTheme, storedTheme, systemTheme } from '../theme';

// Light/dark switch. Until the reader picks one, the app follows the system
// setting and the button for whichever theme that produces is shown as
// active, so the control always reflects what's on screen.
export default {
  name: 'ThemeToggle',

  data() {
    return {
      chosen: storedTheme(),
      system: systemTheme(),
      options: [
        { value: 'light', label: 'Light', title: 'Use the light theme' },
        { value: 'dark', label: 'Dark', title: 'Use the dark theme' }
      ]
    };
  },

  computed: {
    active() {
      return this.chosen || this.system;
    }
  },

  mounted() {
    // While no theme is chosen, follow the system setting as it changes.
    this.query = window.matchMedia && window.matchMedia(DARK_QUERY);
    if (!this.query) return;
    this.onSystemChange = () => {
      this.system = systemTheme();
    };
    if (this.query.addEventListener) {
      this.query.addEventListener('change', this.onSystemChange);
    } else {
      this.query.addListener(this.onSystemChange);
    }
  },

  beforeDestroy() {
    if (!this.query) return;
    if (this.query.removeEventListener) {
      this.query.removeEventListener('change', this.onSystemChange);
    } else {
      this.query.removeListener(this.onSystemChange);
    }
    this.query = null;
  },

  methods: {
    select(theme) {
      this.chosen = theme;
      applyTheme(theme);
      saveTheme(theme);
    }
  }
};
</script>

<style>
.theme-toggle {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.theme-toggle-button {
  padding: 0.15rem 0.7rem;
  border: 0;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 0.75rem;
  line-height: 1.6;
  cursor: pointer;
}

.theme-toggle-button + .theme-toggle-button {
  border-left: 1px solid var(--border);
}

.theme-toggle-button:hover {
  color: var(--text);
}

.theme-toggle-button--active {
  background: var(--border);
  color: var(--text);
}

.theme-toggle-button:focus-visible {
  outline: 2px solid var(--text-muted);
  outline-offset: -2px;
}
</style>
