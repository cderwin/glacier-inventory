<template>
  <div class="theme-toggle" role="group" aria-label="Color theme">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="theme-toggle-button"
      :class="{ 'theme-toggle-button--active': option.value === theme }"
      :aria-pressed="option.value === theme ? 'true' : 'false'"
      :title="option.title"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script>
import { applyTheme, saveTheme, storedTheme } from '../theme';

// Light/dark/system switch. 'System' follows the OS setting, which is the
// default until the reader picks one.
export default {
  name: 'ThemeToggle',

  data() {
    return {
      theme: storedTheme(),
      options: [
        { value: 'light', label: 'Light', title: 'Always use the light theme' },
        { value: 'dark', label: 'Dark', title: 'Always use the dark theme' },
        { value: 'system', label: 'System', title: 'Follow the system setting' }
      ]
    };
  },

  methods: {
    select(theme) {
      this.theme = theme;
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
  padding: 0.15rem 0.6rem;
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
