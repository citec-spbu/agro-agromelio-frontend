<template>
  <q-page class="analytics-host" :class="useMicrofrontend ? 'q-pa-none' : ''">
    <MicrofrontendHost
      v-if="useMicrofrontend"
      :mf="analyticsMf"
      :api-base="apiBase"
      :authorization="authorization"
      :dark="$q.dark.isActive"
      @load-error="onMicrofrontendLoadError"
    />
    <AnalyticsDashboard v-else />
  </q-page>
</template>

<script>
import { computed, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { userStore } from 'src/usage';
import AnalyticsDashboard from 'components/AnalyticsDashboard.vue';
import MicrofrontendHost from 'components/MicrofrontendHost.vue';
import manifest from 'src/microfrontends/microfrontends.manifest.json';

function bearerFromStore() {
  const t = userStore.state.access_token;
  return t ? `Bearer ${t}` : '';
}

export default {
  name: 'AnalyticsHostPage',

  components: { AnalyticsDashboard, MicrofrontendHost },

  setup() {
    const $q = useQuasar();
    const mfLoadFailed = ref(false);
    const baseMf = manifest.find((item) => item.id === 'analytics') || null;
    const analyticsMf = computed(() => {
      if (!baseMf) return null;
      const explicitEntry = (process.env.VUE_APP_ANALYTICS_MFE_ENTRY_URL || '').trim();
      const explicitStyle = (process.env.VUE_APP_ANALYTICS_MFE_STYLE_URL || '').trim();
      const normalizedEntry = explicitEntry || baseMf.entry;
      const isDevEntry = normalizedEntry.includes('/src/');
      const baseUrl = (process.env.VUE_APP_ANALYTICS_MFE_URL || '').trim().replace(/\/$/, '');
      const fallbackEntries = [];
      if (baseUrl) {
        const devEntry = `${baseUrl}/src/mf-element.js`;
        const prodEntry = `${baseUrl}/analytics-mf.js`;
        [devEntry, prodEntry].forEach((entry) => {
          if (entry !== normalizedEntry) {
            fallbackEntries.push(entry);
          }
        });
      }
      return {
        ...baseMf,
        entry: normalizedEntry,
        style: explicitStyle || (isDevEntry ? '' : (baseMf.style || '')),
        fallbackEntries,
      };
    });
    const useMicrofrontend = computed(() => Boolean(analyticsMf.value) && !mfLoadFailed.value);

    const apiBase = computed(() => {
      const fromEnv = (process.env.VUE_APP_BASE_URL || '').replace(/\/$/, '');
      if (fromEnv) return fromEnv;
      if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin.replace(/\/$/, '');
      }
      return '';
    });
    const authorization = computed(() => bearerFromStore());

    watch(
      () => userStore.state.access_token,
      () => {
        if (mfLoadFailed.value) {
          mfLoadFailed.value = false;
        }
      },
    );

    function onMicrofrontendLoadError(error) {
      mfLoadFailed.value = true;
      console.error('Failed to load analytics microfrontend entry', error);
      const detail = error?.message ? ` (${error.message})` : '';
      $q.notify({
        type: 'negative',
        message: `Не удалось загрузить микрофронт аналитики. Используется встроенный режим.${detail}`,
      });
    }

    return {
      $q,
      analyticsMf,
      apiBase,
      authorization,
      useMicrofrontend,
      onMicrofrontendLoadError,
    };
  },
};
</script>

<style scoped>
.analytics-host {
  min-height: calc(100vh - var(--app-header-height, 64px) - 24px);
}
</style>
