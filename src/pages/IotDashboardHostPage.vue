<template>
  <q-page class="iot-dashboard-host q-pa-none">
    <div v-if="configError" class="iot-dashboard-host__state q-pa-lg">
      <q-banner rounded class="bg-negative text-white">
        {{ configError }}
      </q-banner>
    </div>

    <div v-else class="iot-dashboard-host__frame-wrap">
      <div v-if="!iframeReady" class="iot-dashboard-host__loader">
        <q-spinner color="primary" size="42px" />
        <div class="text-subtitle2 q-mt-md">Загрузка IoT-dashboard…</div>
        <div class="text-caption text-grey-7">Ожидаем готовность отдельного модуля датчиков.</div>
      </div>

      <iframe
        ref="iframeRef"
        class="iot-dashboard-host__frame"
        title="Smart.Agromelio IoT Dashboard"
        :src="dashboardUrl"
        @load="onIframeLoad"
      />
    </div>
  </q-page>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { userStore } from 'src/usage';

const IOT_READY_MESSAGE = 'AGRO_IOT_READY';
const IOT_AUTH_MESSAGE = 'AGRO_IOT_AUTH';
const DEV_DASHBOARD_URL = 'http://localhost:9002';

function stripTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveDashboardUrl() {
  return stripTrailingSlash(process.env.VUE_APP_IOT_DASHBOARD_URL) || DEV_DASHBOARD_URL;
}

function getOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function bearerFromStore() {
  const token = userStore.state.access_token;
  return token ? `Bearer ${token}` : '';
}

function resolveApiBase() {
  const explicitIotBase = stripTrailingSlash(process.env.VUE_APP_IOT_API_BASE_URL);
  if (explicitIotBase) return explicitIotBase;

  const appBase = stripTrailingSlash(process.env.VUE_APP_BASE_URL);
  if (appBase) return appBase;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return '';
}

export default {
  name: 'IotDashboardHostPage',

  setup() {
    const $q = useQuasar();
    const iframeRef = ref(null);
    const iframeReady = ref(false);
    const dashboardUrl = resolveDashboardUrl();
    const dashboardOrigin = getOrigin(dashboardUrl);
    const configError = computed(() => {
      if (!dashboardUrl) return 'Не задан URL IoT-dashboard.';
      if (!dashboardOrigin) return 'URL IoT-dashboard некорректен.';
      return '';
    });

    function buildAuthMessage() {
      return {
        type: IOT_AUTH_MESSAGE,
        payload: {
          apiBase: resolveApiBase(),
          authorization: bearerFromStore(),
          dark: Boolean($q.dark.isActive),
        },
      };
    }

    function postAuthToDashboard() {
      if (configError.value || !iframeRef.value?.contentWindow || !dashboardOrigin) return;
      iframeRef.value.contentWindow.postMessage(buildAuthMessage(), dashboardOrigin);
    }

    function onIframeLoad() {
      iframeReady.value = false;
    }

    function onMessage(event) {
      if (event.origin !== dashboardOrigin) return;
      if (!event.data || event.data.type !== IOT_READY_MESSAGE) return;
      iframeReady.value = true;
      postAuthToDashboard();
    }

    onMounted(() => {
      window.addEventListener('message', onMessage);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('message', onMessage);
    });

    watch(
      () => userStore.state.access_token,
      () => {
        if (iframeReady.value) postAuthToDashboard();
      },
    );

    watch(
      () => $q.dark.isActive,
      () => {
        if (iframeReady.value) postAuthToDashboard();
      },
    );

    return {
      configError,
      dashboardUrl,
      iframeReady,
      iframeRef,
      onIframeLoad,
    };
  },
};
</script>

<style scoped>
.iot-dashboard-host {
  min-height: calc(100vh - var(--app-header-height, 64px));
  background: #f4f7fb;
}

.iot-dashboard-host__state {
  max-width: 960px;
  margin: 0 auto;
}

.iot-dashboard-host__frame-wrap {
  position: relative;
  min-height: calc(100vh - var(--app-header-height, 64px));
  background: #f4f7fb;
}

.iot-dashboard-host__loader {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #31415a;
  pointer-events: none;
}

.iot-dashboard-host__frame {
  position: relative;
  z-index: 2;
  display: block;
  width: 100%;
  min-height: calc(100vh - var(--app-header-height, 64px));
  border: 0;
  background: #f4f7fb;
}

:global(.body--dark) .iot-dashboard-host,
:global(.body--dark) .iot-dashboard-host__frame-wrap,
:global(.body--dark) .iot-dashboard-host__frame {
  background: #111827;
}
</style>
