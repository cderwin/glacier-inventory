<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">
        <!-- The favicon's peaks without its tile, themed from --mark-*. The
             tile would blend into the page here. Keep the paths in step with
             app/assets/icon.svg. -->
        <svg class="app-mark" viewBox="6 14 54 36" width="33" height="22" aria-hidden="true" focusable="false">
          <path class="app-mark-shade" d="M42 20 L44 50 L60 50 Z" />
          <path class="app-mark-lit" d="M42 20 L28 50 L44 50 Z" />
          <path class="app-mark-shade" d="M26 14 L28 50 L46 50 Z" />
          <path class="app-mark-lit" d="M26 14 L6 50 L28 50 Z" />
          <path class="app-mark-snow" d="M42 20 L38.3 28 L40.3 26.8 L42.5 28.3 Z" />
          <path class="app-mark-snow" d="M26 14 L19.3 26 L22.5 24 L25 26.6 L26.7 25 Z" />
          <path class="app-mark-snow" d="M26 14 L26.7 25 L29.6 27.2 L32.7 26 Z" opacity="0.75" />
          <path class="app-mark-snow" d="M42 20 L42.5 28.3 L44.6 26.9 L46.8 28 Z" opacity="0.75" />
        </svg>
        Glacier Inventory
      </h1>
      <nav class="app-nav">
        <router-link to="/">Map</router-link>
        <router-link to="/about">About</router-link>
      </nav>
    </header>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.app-mark {
  display: block;
  width: 33px;
  height: 22px;
}

.app-mark-snow {
  fill: var(--mark-snow);
}

.app-mark-lit {
  fill: var(--mark-lit);
}

.app-mark-shade {
  fill: var(--mark-shade);
}

.app-nav {
  display: flex;
  gap: 1rem;
}

.app-nav a {
  color: var(--text-muted);
  text-decoration: none;
}

.app-nav a.router-link-exact-active {
  color: var(--text);
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
}
</style>
