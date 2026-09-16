<template>
  <div v-if="open" class="intro-backdrop" @click.self="dismiss">
    <div
      ref="dialog"
      class="intro-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      tabindex="-1"
      @keydown.esc="dismiss"
    >
      <h2 id="intro-title" class="intro-title">Glaciers of the western United States</h2>

      <p>
        This map shows every glacier, perennial snowfield, and patch of buried
        ice in the conterminous US: 2,542 features across seven western states,
        covering just over 400 km².
      </p>

      <p>
        The outlines were mapped by hand from late-summer aerial and satellite
        imagery taken between 2013 and 2020, mostly at 0.6 m resolution or
        finer. <strong>Glaciers</strong> are ice that moves, shown by crevasses.
        <strong>Perennial snowfields</strong> last year to year without moving.
        <strong>Buried ice</strong> is stagnant ice under debris.
      </p>

      <p class="intro-citation">
        Data from Fountain, A. G., Glenn, B., and McNeil, C.: Inventory of
        glaciers and perennial snowfields of the conterminous USA,
        <cite>Earth System Science Data</cite>, 15, 4077–4104, 2023.
        <a :href="articleDoi" target="_blank" rel="noopener">{{ articleDoi }}</a>
      </p>

      <div class="intro-actions">
        <router-link class="intro-link" to="/about" @click.native="dismiss">
          More about the data
        </router-link>
        <button ref="confirm" type="button" class="intro-button" @click="dismiss">
          Explore the map
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// Shown once per browser, on the first visit. The About page carries the
// same information in full, so there's no way to reopen this.
const STORAGE_KEY = 'glacier-inventory:intro-seen';

function seen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (err) {
    // Storage is blocked; treat it as a first visit and don't nag further.
    return false;
  }
}

export default {
  name: 'IntroDialog',

  data() {
    return {
      open: false,
      articleDoi: 'https://doi.org/10.5194/essd-15-4077-2023'
    };
  },

  mounted() {
    if (seen()) return;
    this.open = true;
    this.previouslyFocused = document.activeElement;
    this.$nextTick(() => {
      if (this.$refs.confirm) this.$refs.confirm.focus();
    });
  },

  methods: {
    dismiss() {
      if (!this.open) return;
      this.open = false;
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (err) {
        /* Not fatal: the dialog just shows again next time. */
      }
      if (this.previouslyFocused && this.previouslyFocused.focus) {
        this.previouslyFocused.focus();
      }
    }
  }
};
</script>

<style>
.intro-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(3, 12, 20, 0.55);
}

.intro-dialog {
  width: 34rem;
  max-width: 100%;
  max-height: 100%;
  padding: 1.25rem 1.4rem;
  overflow-y: auto;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(3, 12, 20, 0.35);
}

.intro-dialog:focus {
  outline: none;
}

.intro-title {
  margin: 0 0 0.6rem;
  font-size: 1.1rem;
}

.intro-dialog p {
  margin: 0.6rem 0;
}

.intro-citation {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.intro-citation a {
  color: inherit;
}

.intro-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.1rem;
}

.intro-link {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.intro-button {
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-deep);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.intro-button:hover {
  border-color: var(--text-muted);
}

.intro-button:focus-visible {
  outline: 2px solid var(--text-muted);
  outline-offset: 2px;
}
</style>
