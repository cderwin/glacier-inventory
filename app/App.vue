<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">Glacier Inventory</h1>
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
  align-items: baseline;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.app-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
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
