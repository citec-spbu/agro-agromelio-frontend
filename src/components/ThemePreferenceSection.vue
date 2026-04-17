<template>
  <div class="row justify-center" :class="outerClass">
    <q-card bordered class="col-12 col-md-7 settings-card theme-pref-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold">Оформление</div>
        <div class="text-caption q-mt-xs theme-pref-hint">
          Тема интерфейса (светлая или тёмная) сохраняется в браузере на этом устройстве.
        </div>
        <q-btn-toggle
          v-model="themeModel"
          class="q-mt-md full-width theme-toggle"
          spread
          no-caps
          rounded
          unelevated
          toggle-color="primary"
          :options="[
            { label: 'Светлая', value: 'light', icon: 'light_mode' },
            { label: 'Тёмная', value: 'dark', icon: 'dark_mode' },
          ]"
          @update:model-value="onThemeChange"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { getStoredTheme, setAppTheme } from 'src/utils/appTheme';

export default {
  name: 'ThemePreferenceSection',

  props: {
    outerClass: {
      type: String,
      default: '',
    },
  },

  setup() {
    const $q = useQuasar();
    const themeModel = ref('light');

    onMounted(() => {
      themeModel.value = getStoredTheme();
      setAppTheme(themeModel.value, $q);
    });

    function onThemeChange(val) {
      setAppTheme(val, $q);
    }

    return {
      themeModel,
      onThemeChange,
    };
  },
};
</script>

<style scoped>
.theme-pref-hint {
  color: var(--text-muted);
}

.theme-toggle {
  border: 1px solid var(--border-soft);
}
</style>
