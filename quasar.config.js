const { configure } = require('quasar/wrappers');
// const { default: leaflet } = require('src/boot/leaflet');
const { mergeConfig } = require('vite');
require('dotenv').config();

module.exports = configure(function (/* ctx */) {

  return {
    eslint: {

      warnings: true,
      errors: true
    },

    boot: [
      'theme',
      'axios',
      'errorHandling',
    ],

    css: [
      'app.scss'
    ],


    extras: [

      'fontawesome-v6',
      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
      'material-icons-outlined', // optional, you are not bound to it
    ],


    build: {
      env: {
        VUE_APP_BASE_URL: process.env.VUE_APP_BASE_URL, // 引入环境变量 Introduce environment variables
        VUE_APP_ANALYTICS_MFE_URL: process.env.VUE_APP_ANALYTICS_MFE_URL,
        VUE_APP_IOT_DASHBOARD_URL: process.env.VUE_APP_IOT_DASHBOARD_URL,
        VUE_APP_IOT_API_BASE_URL: process.env.VUE_APP_IOT_API_BASE_URL,
      },
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node16'
      },
      extendViteConf(viteConf) {
        viteConf.build = mergeConfig(viteConf.build, {
          chunkSizeWarningLimit: 750,
        });
        // Re-apply proxy on server after Quasar -> Vite merge to avoid config-order issues.
        if (viteConf.server) {
          viteConf.server.proxy = {
            ...(viteConf.server.proxy || {}),
            '/api': {
              target: process.env.VUE_APP_GATEWAY_URL || 'http://127.0.0.1:8080',
              changeOrigin: true,
              secure: false,
            },
          };
        }
      },


      vueRouterMode: 'hash',
    },


    devServer: {
      open: false,
      // In Docker, 0.0.0.0 is required to expose quasar dev port to host.
      host: process.env.DEV_SERVER_HOST || '0.0.0.0',
      // Port 9000 for frontend dev; /api is proxied to VUE_APP_GATEWAY_URL (gateway).
      port: Number(process.env.DEV_SERVER_PORT) || 9000,
      proxy: {
        '/api': {
          target: process.env.VUE_APP_GATEWAY_URL || 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
        },
      },
      // Watch options must be on server (not devServer.server) so chokidar picks them up.
      watch: {
        usePolling: true,
        interval: 100,
      },
    },



    framework: {
      config: {},

      plugins: [
        'Dark',
        'Dialog',
        'Notify'
      ]
    },


    animations: [],


    ssr: {
      pwa: false,
      prodPort: 9000,

      middlewares: [
        'render' // keep this a@vue/cli-plugin-unit-jest/presets/no-bas last one
      ]
    },


    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,

    },

    cordova: {

    },


    capacitor: {
      hideSplashscreen: true
    },


    electron: {
      inspectPort: 9000,

      bundler: 'packager', // 'packager' or 'builder'

      packager: {

      },

      builder: {


        appId: 'quasar-project'
      }
    },


    bex: {
      contentScripts: [
        'my-content-script'
      ],
    }
  }
});
