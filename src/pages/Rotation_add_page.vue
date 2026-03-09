<template>
  <div class="q-pa-md rotation-info-container">
    <div class="text-h5 font-bold">{{ isEditMode ? 'Редактировать севооборот' : 'Добавление севооборота в контуре' }}</div>

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
      <q-input v-model="formData.culture" label="Название культуры" outlined dense class="q-mb-md"></q-input>
      <q-input v-model="formData.cultivar" label="Название сорта" outlined dense class="q-mb-md"></q-input>
      <q-input v-model="formData.description" label="Описание" outlined dense class="q-mb-md"></q-input>
      <q-input v-model="formData.startDate" label="Дата сева" hint="Формат: YYYY-MM-DD" mask="####-##-##" outlined dense class="q-mb-md"></q-input>
      <q-input v-model="formData.endDate" label="Дата уборки" hint="Формат: YYYY-MM-DD" mask="####-##-##" outlined dense class="q-mb-md"></q-input>
    </div>

    <div class="button-section q-mt-md row no-gutters items-center">
      <q-btn label="Загрузить файл" @click="uploadFile" outline color="primary" class="q-mr-md" />
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" />
      
      <q-btn :label="isEditMode ? 'Сохранить изменения' : 'Сохранить'" @click="saveRotation" color="primary" push />
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
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

    const formData = ref({
      culture: route.query.culture || '',
      cultivar: route.query.cultivar || '',
      description: route.query.description || '',
      startDate: route.query.startDate || '',
      endDate: route.query.endDate || ''
    });

    const fileInput = ref(null);

    const uploadFile = () => {
      fileInput.value.click();
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        console.log('Файл загружен:', file.name);
      }
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

    return {
      seasonName,
      seasonId,
      fieldName,
      fieldId,
      contourName,
      contourId,
      formData,
      isEditMode,
      fileInput,
      uploadFile,
      handleFileUpload,
      saveRotation
    };
  }
};
</script>

<style scoped>
.rotation-info-container {
  max-width: 700px;
  margin-left: 0;
}

.text-h5 {
  font-size: 1.5rem;
  color: #333;
}

.font-bold {
  font-weight: bold;
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
}

.value {
  flex-grow: 1;
}

.button-section {
  display: flex;
  gap: 16px;
}
</style>
