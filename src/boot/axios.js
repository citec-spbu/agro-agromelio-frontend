import { boot } from 'quasar/wrappers'
import axios from 'axios'
import { userStore } from 'src/usage'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
// const api = axios.create({ baseURL: 'https://api.example.com' })
const api = axios.create({ baseURL: process.env.VUE_APP_BASE_URL })

let isRedirectingToLogin = false

const hasAuthorizationHeader = (headers) => {
  if (!headers) return false
  return Boolean(headers.Authorization || headers.authorization)
}

const installUnauthorizedInterceptor = (client, router) => {
  if (!client || client.__auth401InterceptorInstalled) return
  client.__auth401InterceptorInstalled = true

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error?.response?.status
      const requestHeaders = error?.config?.headers
      const isAuthorizedRequest = hasAuthorizationHeader(requestHeaders)

      if (status === 401 && isAuthorizedRequest && !isRedirectingToLogin) {
        isRedirectingToLogin = true
        userStore.clearAll()

        try {
          if (router?.currentRoute?.value?.name !== 'login') {
            await router.replace({ name: 'login' })
          }
        } finally {
          isRedirectingToLogin = false
        }
      }

      return Promise.reject(error)
    }
  )
}

export default boot(({ app, router }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API

  installUnauthorizedInterceptor(axios, router)
  installUnauthorizedInterceptor(api, router)
})

export { api }
