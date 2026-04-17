<template>
  <div class="q-pa-md rotation-info-container">
    <div class="rotation-page-title">{{ isEditMode ? 'Редактировать севооборот' : 'Добавление севооборота в контуре' }}</div>

    <div class="q-mt-md q-gutter-y-xs info-section">
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Сезон:</span>
        <span class="value col text-subtitle1">{{ seasonName }}</span>
      </div>
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Поле:</span>
        <span class="value col text-subtitle1">{{ fieldName }}</span>
      </div>
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Контур:</span>
        <span class="value col text-subtitle1">{{ contourName }}</span>
      </div>
    </div>

    <div class="q-mt-md">
      <q-select
        v-model="selectedCultureId"
        :options="cultureOptions"
        label="Культура"
        outlined
        dense
        emit-value
        map-options
        use-input
        fill-input
        hide-selected
        input-debounce="0"
        :loading="cultureLoading"
        @filter="filterCultureOptions"
        class="q-mb-md"
      />
      <q-select
        v-model="formData.cultivar"
        :options="cultivarOptions"
        label="Сорт"
        outlined
        dense
        emit-value
        map-options
        use-input
        fill-input
        hide-selected
        input-debounce="0"
        :disable="!selectedCultureId || cultivarLoading"
        :loading="cultivarLoading"
        @filter="filterCultivarOptions"
        class="q-mb-md"
      />
      <q-input v-model="formData.description" label="Описание" outlined dense class="q-mb-md"></q-input>

      <q-input
        v-model="formData.startDate"
        label="Дата посева"
        outlined
        dense
        clearable
        class="q-mb-md"
        hint="Календарь по иконке или ввод ГГГГ-ММ-ДД"
        mask="####-##-##"
      >
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="formData.startDate" mask="YYYY-MM-DD" minimal />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>

      <q-input
        v-model="formData.endDate"
        label="Дата уборки"
        outlined
        dense
        clearable
        class="q-mb-md"
        hint="Календарь по иконке или ввод ГГГГ-ММ-ДД"
        mask="####-##-##"
      >
        <template #append>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-date v-model="formData.endDate" mask="YYYY-MM-DD" minimal />
            </q-popup-proxy>
          </q-icon>
        </template>
      </q-input>
    </div>

    <div class="button-section q-mt-md row no-gutters items-center">
      <q-btn :label="isEditMode ? 'Сохранить изменения' : 'Сохранить'" @click="saveRotation" color="primary" push />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { userStore } from 'src/usage';

export default {
  name: 'add_rotation',
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const accessToken = computed(() => userStore.state.access_token);
    
    const seasonName = ref(route.query.seasonName || '');
    const seasonId = ref(route.query.seasonId);
    const fieldName = ref(route.query.fieldName || '');
    const fieldId = ref(route.query.fieldId);
    const contourName = ref(route.query.contourName || '');
    const contourId = ref(route.query.contourId);

    const isEditMode = ref(!!route.query.cropRotationId);
    const cropRotationId = ref(route.query.cropRotationId || '');
    const allCultureOptions = ref([]);
    const cultureOptions = ref([]);
    const cultureLoading = ref(false);
    const selectedCultureId = ref(null);
    const allCultivarOptions = ref([]);
    const cultivarOptions = ref([]);
    const cultivarLoading = ref(false);

    const applyCultureOptions = (options) => {
      allCultureOptions.value = options;
      cultureOptions.value = options;
    };

    const formData = ref({
      culture: route.query.culture || '',
      cultivar: route.query.cultivar || '',
      description: route.query.description || '',
      startDate: route.query.startDate || '',
      endDate: route.query.endDate || ''
    });

    const applyCultivarOptions = (options) => {
      allCultivarOptions.value = options;
      cultivarOptions.value = options;

      if (
        formData.value.cultivar &&
        !options.some((option) => option.value === formData.value.cultivar)
      ) {
        const customOption = {
          label: formData.value.cultivar,
          value: formData.value.cultivar
        };
        allCultivarOptions.value = [customOption, ...options];
        cultivarOptions.value = [customOption, ...options];
      }
    };

    const fetchCultureOptions = async () => {
      cultureLoading.value = true;
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/fields-service/crops?page=0&size=5000&name=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const uniqueOptions = Array.from(
          new Map(
            (response.data || []).map((crop) => [
              crop.id,
              {
                label: crop.name,
                value: crop.id
              }
            ])
          ).values()
        ).sort((left, right) => left.label.localeCompare(right.label, 'ru'));

        applyCultureOptions(uniqueOptions);

        if (formData.value.culture) {
          const selectedOption = uniqueOptions.find((option) => option.label === formData.value.culture);
          selectedCultureId.value = selectedOption ? selectedOption.value : null;
        }
      } catch (error) {
        console.error('Ошибка при загрузке справочника культур:', error);
        $q.notify({
          type: 'negative',
          message: 'Не удалось загрузить справочник культур'
        });
      } finally {
        cultureLoading.value = false;
      }
    };

    const fetchCultivarOptions = async (cultureId) => {
      if (!cultureId) {
        applyCultivarOptions([]);
        return;
      }

      cultivarLoading.value = true;
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/fields-service/crops/${cultureId}/cultivars?page=0&size=5000&name=`,
          {
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const uniqueOptions = Array.from(
          new Map(
            (response.data || []).map((cultivar) => [
              cultivar.name,
              {
                label: cultivar.name,
                value: cultivar.name
              }
            ])
          ).values()
        ).sort((left, right) => left.label.localeCompare(right.label, 'ru'));

        applyCultivarOptions(uniqueOptions);
      } catch (error) {
        console.error('Ошибка при загрузке справочника сортов:', error);
        applyCultivarOptions([]);
        $q.notify({
          type: 'negative',
          message: 'Не удалось загрузить справочник сортов'
        });
      } finally {
        cultivarLoading.value = false;
      }
    };

    const filterCultureOptions = (inputValue, update) => {
      update(() => {
        const needle = String(inputValue || '').trim().toLowerCase();
        if (!needle) {
          cultureOptions.value = allCultureOptions.value;
          return;
        }
        cultureOptions.value = allCultureOptions.value.filter((option) =>
          option.label.toLowerCase().includes(needle)
        );
      });
    };

    const filterCultivarOptions = (inputValue, update) => {
      update(() => {
        const needle = String(inputValue || '').trim().toLowerCase();
        if (!needle) {
          cultivarOptions.value = allCultivarOptions.value;
          return;
        }
        cultivarOptions.value = allCultivarOptions.value.filter((option) =>
          option.label.toLowerCase().includes(needle)
        );
      });
    };

    const saveRotation = async () => {
      // const apiUrl = `https://34a97d79-460b-4dae-9ff7-1fdaa35a4031.mock.pstmn.io/api/v2/fields-service`;
      const apiUrl = `${process.env.VUE_APP_BASE_URL}/api/fields-service`;
      const payload = {
        startDate: formData.value.startDate,     
        endDate: formData.value.endDate,         
        description: formData.value.description, 
        culture: formData.value.culture,         
        cultivar: formData.value.cultivar || ''  
      };

      try {
        if (isEditMode.value) {
          await axios.put(`${apiUrl}/crop-rotation`, payload, {
            params: { id: cropRotationId.value },
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              'Content-Type': 'application/json'
            }
          });
          $q.notify({
            type: 'positive',
            message: 'Изменения успешно сохранены',
            icon: 'check_circle'
          });
        } else {
          await axios.post(`${apiUrl}/contours/${contourId.value}/crop-rotation`, payload, {
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              'Content-Type': 'application/json'
            }
          });
          $q.notify({
            type: 'positive',
            message: 'Новый севооборот успешно добавлен',
            icon: 'check_circle'
          });
        }
        router.push({ 
          name: 'RotationPage' ,
          query: {
            fieldId: fieldId.value,
            fieldName: fieldName.value,
            seasonId: seasonId.value,
            seasonName: seasonName.value,
            contourName: contourName.value,
            contourId: contourId.value
          }
        }); 
      } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
        $q.notify({
          type: 'negative',
          message: 'Ошибка при сохранении данных. Попробуйте еще раз.',
          icon: 'error'
        });
      }
    };

    onMounted(() => {
      fetchCultureOptions();
    });

    watch(
      selectedCultureId,
      async (nextCultureId, previousCultureId) => {
        const selectedOption = allCultureOptions.value.find((option) => option.value === nextCultureId);
        formData.value.culture = selectedOption ? selectedOption.label : '';

        const previousCultivar = formData.value.cultivar;
        await fetchCultivarOptions(nextCultureId);

        if (!nextCultureId) {
          formData.value.cultivar = '';
          return;
        }

        if (
          nextCultureId !== previousCultureId &&
          previousCultivar &&
          !allCultivarOptions.value.some((option) => option.value === previousCultivar)
        ) {
          formData.value.cultivar = '';
        }
      }
    );

    return {
      seasonName,
      seasonId,
      fieldName,
      fieldId,
      contourName,
      contourId,
      formData,
      isEditMode,
      saveRotation,
      cultureOptions,
      cultureLoading,
      filterCultureOptions,
      selectedCultureId,
      cultivarOptions,
      cultivarLoading,
      filterCultivarOptions
    };
  }
};
</script>

<style scoped>
.rotation-info-container {
  max-width: 700px;
  margin-left: 0;
}

.rotation-page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main, #1a2433);
  line-height: 1.3;
}

.info-section {
  margin-top: 16px;
}

.info-item {
  align-items: center;
  font-size: 1.2rem;
}

.label {
  font-weight: bold;
  width: 120px;
  color: var(--text-main, #1a2433);
}

.value {
  flex-grow: 1;
  color: var(--text-main, #1a2433);
}

.button-section {
  display: flex;
  gap: 16px;
}
</style>
