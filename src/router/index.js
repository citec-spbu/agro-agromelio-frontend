import { route } from 'quasar/wrappers'
import { createRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import routes from './routes'
import { userStore } from 'src/usage';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */
let routerinstance = null;

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHistory)

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  routerinstance = Router;  //continue working with the same

  function delay(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }

  routerinstance.beforeEach(async (to, from) => {
    // console.log('TO: ', to);
    // console.log('FROM: ', from);
    // console.log(userStore.getState().access_token);
    // console.log('getIsInit: ', userStore.getIsInitialized().value)
    while (!userStore.getIsInitialized().value) {
      await delay(10);
    }
    if (
      // make sure the user is authenticated
      !userStore.isAuthorized() &&
      // ❗️ Avoid an infinite redirect
      to.name !== "login" &&
      to.name !== "reg" &&
      to.name !== 'entry'
    ) {
      return { name: "login" };
    }
  });


  return Router
})

export { routerinstance };
