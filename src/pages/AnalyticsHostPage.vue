<template>
  <q-page class="analytics-host" :class="useIframe ? 'q-pa-none' : ''">
    <iframe
      v-if="useIframe"
      ref="frameRef"
      class="analytics-iframe"
      title="Аналитика"
      :src="iframeSrc"
      @load="sendAuthToMfe"
    />
    <AnalyticsDashboard v-else />
  </q-page>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { userStore } from 'src/usage';
import AnalyticsDashboard from 'components/AnalyticsDashboard.vue';

const MSG_TYPE = 'AGRO_ANALYTICS_AUTH';
const READY_TYPE = 'AGRO_ANALYTICS_READY';

function bearerFromStore() {
  const t = userStore.state.access_token;
  return t ? `Bearer ${t}` : '';
}

export default {
  name: 'AnalyticsHostPage',

  components: { AnalyticsDashboard },

  setup() {
    const frameRef = ref(null);

    const mfeUrl = computed(() => {
      const u = process.env.VUE_APP_ANALYTICS_MFE_URL;
      return u && String(u).trim() ? String(u).trim().replace(/\/$/, '') : '';
    });

    const useIframe = computed(() => Boolean(mfeUrl.value));

    const iframeSrc = computed(() => {
      const base = mfeUrl.value;
      if (!base) return '';
      if (base.startsWith('http')) {
        return `${base}/`;
      }
      const path = base.startsWith('/') ? base : `/${base}`;
      return path.endsWith('/') ? path : `${path}/`;
    });

    const apiBase = computed(() => {
      const fromEnv = (process.env.VUE_APP_BASE_URL || '').replace(/\/$/, '');
      if (fromEnv) return fromEnv;
      if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/$/, '');
      }
      return '';
    });

    function buildAuthPayload() {
      return {
        apiBase: apiBase.value,
        authorization: bearerFromStore(),
      };
    }

    function sendAuthToMfe() {
      const win = frameRef.value?.contentWindow;
      if (!win || !mfeUrl.value) {
        return;
      }
      let targetOrigin = '*';
      if (mfeUrl.value.startsWith('http')) {
        try {
          targetOrigin = new URL(mfeUrl.value).origin;
        } catch {
          targetOrigin = '*';
        }
      } else {
        targetOrigin = window.location.origin;
      }
      win.postMessage(
        {
          type: MSG_TYPE,
          payload: buildAuthPayload(),
        },
        targetOrigin,
      );
    }

    watch(
      () => [useIframe.value, userStore.state.access_token, apiBase.value],
      () => {
        if (useIframe.value) {
          sendAuthToMfe();
        }
      },
    );

    function onChildReady(event) {
      if (!event.data || event.data.type !== READY_TYPE) {
        return;
      }
      if (mfeUrl.value.startsWith('http')) {
        try {
          if (event.origin !== new URL(mfeUrl.value).origin) {
            return;
          }
        } catch {
          return;
        }
      } else if (event.origin !== window.location.origin) {
        return;
      }
      sendAuthToMfe();
    }

    onMounted(() => {
      window.addEventListener('message', onChildReady);
    });
    onUnmounted(() => {
      window.removeEventListener('message', onChildReady);
    });

    return {
      frameRef,
      mfeUrl,
      useIframe,
      iframeSrc,
      sendAuthToMfe,
    };
  },
};
</script>

<style scoped>
.analytics-host {
  min-height: calc(100vh - var(--app-header-height, 64px) - 24px);
}

.analytics-iframe {
  display: block;
  width: 100%;
  min-height: calc(100vh - var(--app-header-height, 64px) - 24px);
  border: 0;
}
</style>
