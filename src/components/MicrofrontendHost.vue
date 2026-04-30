<template>
  <div ref="mountRef" class="microfrontend-host"></div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  SHELL_EVENT_TARGET,
  MF_EVENT_TARGET,
  buildShellContextPayload,
  isShellTargetEvent,
  MfToShellEvent,
} from 'src/microfrontends/eventBusContract';

const loadedStyleHrefs = new Set();

export default {
  name: 'MicrofrontendHost',
  props: {
    mf: {
      type: Object,
      required: true,
    },
    apiBase: {
      type: String,
      default: '',
    },
    authorization: {
      type: String,
      default: '',
    },
    dark: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['load-error', 'mf-ready', 'mf-error', 'mf-navigate'],
  setup(props, { emit }) {
    const mountRef = ref(null);
    const elementRef = ref(null);
    const loadFailed = ref(false);

    const candidates = computed(() => {
      if (!props.mf?.entry) return [];
      const baseCandidates = [
        {
          entryUrl: props.mf.entry,
          styleUrl: props.mf.style || '',
        },
      ];
      const fallbacks = Array.isArray(props.mf.fallbackEntries) ? props.mf.fallbackEntries : [];
      fallbacks.forEach((entryUrl) => {
        if (!entryUrl || baseCandidates.some((candidate) => candidate.entryUrl === entryUrl)) {
          return;
        }
        baseCandidates.push({
          entryUrl,
          styleUrl: '',
        });
      });
      return baseCandidates;
    });

    function resolveUrl(url) {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      const base = (process.env.VUE_APP_ANALYTICS_MFE_URL || '').replace(/\/$/, '');
      if (!base) return url;
      const path = url.startsWith('/') ? url : `/${url}`;
      return `${base}${path}`;
    }

    function contextPayload() {
      return buildShellContextPayload({
        mfId: props.mf.id,
        apiBase: props.apiBase,
        authorization: props.authorization,
        dark: props.dark,
        route: props.mf.route,
        version: props.mf.version,
        featureFlags: props.mf.featureFlags,
      });
    }

    function emitShellContextEvent() {
      window.dispatchEvent(new CustomEvent('agro:event-bus', { detail: contextPayload() }));
    }

    function resolveEventTarget(value) {
      if (!value) return '';
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
      }
      const base = (process.env.VUE_APP_ANALYTICS_MFE_URL || '').replace(/\/$/, '');
      if (!base) return '';
      if (value.startsWith('/')) {
        return `${base}${value}`;
      }
      return `${base}/${value}`;
    }

    function setElementAttributes() {
      if (!elementRef.value) return;
      elementRef.value.setAttribute('api-base', props.apiBase || '');
      elementRef.value.setAttribute('authorization', props.authorization || '');
      elementRef.value.setAttribute('dark', String(props.dark));
      elementRef.value.setAttribute('mf-id', props.mf.id || '');
      elementRef.value.setAttribute('mf-version', props.mf.version || '');
    }

    function ensureStyle(styleUrl) {
      const resolvedStyleUrl = resolveUrl(styleUrl);
      if (!resolvedStyleUrl || typeof document === 'undefined') return Promise.resolve();
      if (loadedStyleHrefs.has(resolvedStyleUrl)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`link[data-mf-style="${resolvedStyleUrl}"]`);
        if (existing) {
          loadedStyleHrefs.add(resolvedStyleUrl);
          resolve();
          return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = resolvedStyleUrl;
        link.dataset.mfStyle = resolvedStyleUrl;
        link.onload = () => {
          loadedStyleHrefs.add(resolvedStyleUrl);
          resolve();
        };
        link.onerror = () => {
          link.remove();
          reject(new Error(`Failed to load mf style: ${resolvedStyleUrl}`));
        };
        document.head.appendChild(link);
      });
    }

    async function ensureElementRegistered() {
      if (customElements.get(props.mf.tag)) return;
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        for (const candidate of candidates.value) {
          try {
            await import(/* @vite-ignore */ resolveUrl(candidate.entryUrl));
            if (candidate.styleUrl) {
              try {
                await ensureStyle(candidate.styleUrl);
              } catch (styleError) {
                console.warn('Microfrontend style load failed, continue without external style', styleError);
              }
            }
            return;
          } catch (error) {
            lastError = error;
            console.warn(`Microfrontend import attempt ${attempt} failed for ${candidate.entryUrl}`, error);
          }
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          if (customElements.get(props.mf.tag)) {
            return;
          }
        }
      }
      throw lastError || new Error(`Unable to load microfrontend entry: ${props.mf.id}`);
    }

    async function mountMicrofrontend() {
      if (!mountRef.value || !props.mf?.tag || loadFailed.value) return;
      try {
        await ensureElementRegistered();
        if (!elementRef.value) {
          const element = document.createElement(props.mf.tag);
          mountRef.value.innerHTML = '';
          mountRef.value.appendChild(element);
          elementRef.value = element;
        }
        setElementAttributes();
        emitShellContextEvent();
      } catch (error) {
        loadFailed.value = true;
        emit('load-error', error);
      }
    }

    function unmountMicrofrontend() {
      if (elementRef.value) {
        elementRef.value.remove();
        elementRef.value = null;
      }
      if (mountRef.value) {
        mountRef.value.innerHTML = '';
      }
    }

    function onEventBus(event) {
      if (!isShellTargetEvent(event, props.mf.id)) return;
      const detail = event.detail;
      if (detail.target !== SHELL_EVENT_TARGET) return;
      if (detail.type === MfToShellEvent.READY) {
        emit('mf-ready', detail.payload || {});
        emitShellContextEvent();
      } else if (detail.type === MfToShellEvent.ERROR) {
        emit('mf-error', detail.payload || {});
      } else if (detail.type === MfToShellEvent.NAVIGATE) {
        const payload = detail.payload || {};
        if (payload.route) {
          emit('mf-navigate', payload);
        } else if (payload.url) {
          const resolved = resolveEventTarget(payload.url);
          if (resolved) {
            window.location.assign(resolved);
          }
        }
      }
    }

    watch(
      () => props.mf,
      async (next, prev) => {
        if (!next) return;
        if (!prev) return;
        if (next.tag === prev.tag && next.entry === prev.entry && next.style === prev.style) {
          return;
        }
        loadFailed.value = false;
        unmountMicrofrontend();
        await mountMicrofrontend();
      },
      { deep: true },
    );

    watch(
      () => [props.apiBase, props.authorization, props.dark],
      () => {
        if (!elementRef.value) return;
        setElementAttributes();
        emitShellContextEvent();
      },
    );

    onMounted(async () => {
      window.addEventListener('agro:event-bus', onEventBus);
      await mountMicrofrontend();
    });

    onUnmounted(() => {
      window.removeEventListener('agro:event-bus', onEventBus);
      unmountMicrofrontend();
    });

    return {
      mountRef,
    };
  },
};
</script>

<style scoped>
.microfrontend-host {
  display: block;
  width: 100%;
  min-height: calc(100vh - var(--app-header-height, 64px) - 24px);
}
</style>
