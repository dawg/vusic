import Vuetify from 'vuetify';
import Icon from 'vue-awesome/components/Icon.vue';
import Vue from 'vue';
import 'vuetify/dist/vuetify.css';
import 'vue-awesome/icons';
import '@/styles/global.sass';
import { remote } from 'electron';
import Ico from '@/components/Ico.vue';
import Pan from '@/components/Pan.vue';
import Effect from '@/components/Effect.vue';
import Knob from '@/components/Knob.vue';
import Editable from '@/components/Editable.vue';
import TooltipIcon from '@/components/TooltipIcon.vue';
import Theme from '@/modules/theme';
import Update from '@/modules/update';
import Context from '@/modules/context';
import VueLogger from 'vuejs-logger';
import Notification from '@/modules/notification';
import VuePerfectScrollbar from 'vue-perfect-scrollbar';

const inspect = {
  text: 'Inspect',
  callback: (e: MouseEvent) => {
    // Wait for context menu to close before opening the Dev Tools!
    // If you don't, it will focus on the context menu.
    setTimeout(() => {
      const window = remote.getCurrentWindow();
      window.webContents.inspectElement(e.x, e.y);
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.devToolsWebContents.focus();
      }
    }, 1000);
  },
};

const middleware = () => {
  Vue.use(Vuetify, {theme: false});
  Vue.use(Theme);
  Vue.use(Update);
  Vue.use(Context, { default: [inspect] });
  Vue.component('icon', Icon);
  Vue.use(Notification);
  Vue.component('ico', Ico);
  Vue.component('Editable', Editable);
  Vue.component('Effect', Effect);
  Vue.component('VuePerfectScrollbar', VuePerfectScrollbar);
  Vue.component('TooltipIcon', TooltipIcon);
  Vue.component('Pan', Pan);
  Vue.component('Knob', Knob);
  Vue.use(VueLogger, {
    logLevel :  'info',
  });
};

export default middleware;
