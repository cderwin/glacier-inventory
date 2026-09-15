import Vue from 'vue';
import App from './App.vue';
import router from './router';
import { applyTheme, storedTheme } from './theme';

Vue.config.productionTip = false;

// Before mounting, so a remembered theme is in place for the first paint.
applyTheme(storedTheme());

new Vue({
  router,
  render: h => h(App)
}).$mount('#app');
