import Vue from 'vue/dist/vue.esm';
import Vuex from 'vuex';
import config from '@/manifest';
import clonedeep from 'lodash.clonedeep';
import demoList from '@/.demoList.json';
import router from '@/js/router.js';
import bus from '@/js/eventbus.js';

import progress from 'nprogress';
progress.configure({
  showSpinner: false,
});

const path = require('path');

Vue.use(Vuex);

const demoBoxes = {};

function importAllDemo(r) {
  r.keys().forEach(key => {
    const name = /^\.\/(.+)\//.exec(key)[1];
    demoBoxes[name] = r(key).default;
  })
}
importAllDemo(require.context('@/demos', true, /config.js$/));

const state = {
  config,
  boxes: {},
  foldBoxes: [],
  visibleboxes: [],
  links: demoList,
  iframeStatus: null,
  transforming: false,
  autoRun: true,
  logs: [],
  dependencies: {
    js: [],
    css: [],
  },
};

const mutations = {
  CLEAR_BOXES(state) {
    state.boxes = {};
  },
  UPDATE_CODE(state, {type, code}) {
    if(!state.boxes[type]) state.boxes[type] = {};
    state.boxes[type].code = code;
    if(state.autoRun) bus.$emit('run');
  },
  UPDATE_TRANSFORMER(state, {type, transformer}) {
    if(!state.boxes[type]) state.boxes[type] = {};
    state.boxes[type].transformer = transformer;
  },
  UPDATE_FOLD_BOXES(state, foldBoxes) {
    state.foldBoxes = foldBoxes;
  },
  UPDATE_VISIBLE_BOXES(state, visibleBoxes) {
    state.visibleBoxes = visibleBoxes;
  },
  TOGGLE_BOX_FOLD(state, boxName) {
    const boxIndex = state.foldBoxes.indexOf(boxName);
    if(boxIndex > -1) {
      state.foldBoxes.splice(boxIndex, 1);
    } else {
      state.foldBoxes.push(boxName);
    }
  },
  SET_IFRAME_STATUS(state, status) {
    state.iframeStatus = status
  },
  SET_TRANSFORM(state, status) {
    state.transforming = status
  },
  TOGGLE_AUTO_RUN(state) {
    state.autoRun = !state.autoRun;
  },
  CLEAR_LOGS(state) {
    state.logs = [];
  },
  ADD_LOG(state, log) {
    state.logs.push(log);
  },
  UPDATE_DEPENDENCIES(state, dependencies = {js: [], css: []}) {
    state.dependencies = dependencies;
  }
};

const actions =  {
  clearBoxes({commit}) {
    commit('CLEAR_BOXES');
  },
  updateCode({commit}, pl) {
    commit('UPDATE_CODE', pl);
  },
  updateTransformer({commit}, pl) {
    commit('UPDATE_TRANSFORMER', pl);
  },
  updateFoldBoxes({commit}, pl) {
    commit('UPDATE_FOLD_BOXES', pl);
  },
  updateVisibleBoxes({commit}, pl) {
    commit('UPDATE_VISIBLE_BOXES', pl)
  },
  toggleBoxFold({commit}, pl) {
    commit('TOGGLE_BOX_FOLD', pl);
  },
  toogleAutoRun({commit}) {
    commit('TOGGLE_AUTO_RUN');
  },
  updateDependencies({commit}, pl) {
    commit('UPDATE_DEPENDENCIES', pl);
  },
  async setBoxes({dispatch}, demo) {
    progress.start();

    if(!demoBoxes[demo]) {
      router.push({path : '/404'});
      progress.done();
      return;
    }
    if(typeof demo === 'string') {
      demo = await demoBoxes[demo]();
    }
    

    const{foldBoxes, visibleBoxes, packages, ...boxes} = demo;

    const ac = [];

    dispatch('clearBoxes');

    Object.entries(boxes).forEach(([type, {code, transformer}]) => {
      ac.push(
        dispatch('updateCode', { type, code: code.default }),
        dispatch('updateTransformer', { type, transformer }),
      );
    })
  

    const dependencies = {
      js: [
        ...(config.globalPackages.js || []) ,
        ...(packages.js || []),
      ],
      css: [
        ...(config.globalPackages.css || []) ,
        ...(packages.css || []),
      ],
    };

    ac.push(dispatch('updateFoldBoxes', foldBoxes || []));
    ac.push(dispatch('updateVisibleBoxes', visibleBoxes || Object.keys(boxes)));
    ac.push(dispatch('updateDependencies', dependencies));
    await Promise.all(ac);
    progress.done();
  },
  setIframeStatus({ commit }, status) {
    commit('SET_IFRAME_STATUS', status)
  },
  transform({ commit }, status) {
    commit('SET_TRANSFORM', status)
  },
  clearLogs({commit}) {
    commit('CLEAR_LOGS');
  },
  addLog({commit}, pl) {
    commit('ADD_LOG', pl)
  },
}

const store = new Vuex.Store({
  state,
  mutations,
  actions,
});

bus.$on('setBoxes', (demo) => {store.dispatch('setBoxes', demo)})


export default store;
