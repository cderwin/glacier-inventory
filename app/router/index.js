import Vue from 'vue';
import Router from 'vue-router';

import { BASE_PATH } from '../config';
import InventoryMap from '../components/InventoryMap.vue';
import About from '../components/About.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  base: BASE_PATH,
  routes: [
    { path: '/', component: InventoryMap },
    { path: '/about', component: About }
  ]
});
