import Vue from 'vue';
import Router from 'vue-router';

import InventoryMap from '../components/InventoryMap.vue';
import About from '../components/About.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    { path: '/', component: InventoryMap },
    { path: '/about', component: About }
  ]
});
