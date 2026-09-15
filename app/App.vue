<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">
        <img class="app-icon" :src="iconUrl" alt="" width="28" height="28" />
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
import { BASE_PATH } from './config';

export default {
  name: 'App',

  data() {
    return {
      // Same file as the favicon (app/assets/icon.svg).
      iconUrl: `${BASE_PATH}icon.svg`
    };
  }
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

.app-icon {
  display: block;
  width: 28px;
  height: 28px;
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
