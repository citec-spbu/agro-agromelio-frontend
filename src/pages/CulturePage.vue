<template>
  <q-page padding class="legacy-form-page">
  <q-card v-show="cropData" class="form-container q-pa-md">
    <div class="text-h6 q-mb-md">Добавление культуры</div>
    <q-select
      v-model="computedFieldId"
      :options="fields"
      option-label="label"
      option-value="value"
      label="Поле"
      outlined
      dense
      class="q-mb-md">
    </q-select>

    <q-select
      v-model="computedCropId"
      :options="crops"
      option-label="label"
      option-value="value"
      label="Культура"
      outlined
      dense
      class="q-mb-md">
    </q-select>

    <q-input
      v-model="cropData.startDate"
      label="Дата начала "
      hint="Format: DD-MM-YYYY"
      mask="##-##-####"
      outlined
      dense
      class="q-mb-md">
    </q-input>

    <q-input
      v-model="cropData.endDate"
      label="Дата окончания "
      hint="Format: DD-MM-YYYY"
      mask="##-##-####"
      outlined
      dense
      class="q-mb-md">
    </q-input>

    <q-input
      v-model="cropData.description"
      label="Описание"
      type="textarea"
      outlined
      dense
      class="q-mb-md description-input">
    </q-input>

    <q-btn
      label="Готово"
      @click="submitData"
      :disabled="isSubmitDisabled"
      color="primary"
      class="full-width-button q-mt-md">
    </q-btn>
  </q-card>
  </q-page>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { userStore } from 'src/usage';
import { useQuasar } from 'quasar';


export default {
  name: 'CulturePage',
  setup() {

      const $q = useQuasar();

      const cropData = ref({
          fieldId: '',
          startDate: '',
          endDate: '',
          description: ''
      });

      const fields = ref([]);

      const crops = ref([]);

      const accessToken = userStore.state.access_token;

      onMounted(() => {
          fetchFields();
          fetchCrops();
      });
      //fields menu
      async function fetchFields() {
          try {
              const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields/organization/preview`, {
                  headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                  }
              });
              fields.value = response.data.map(field => ({ label: field.name, value: field.id }));
              console.log(fields);
          } catch (error) {
              console.error('Error fetching fields:', error);
          }
      };
      //crops menu
      async function fetchCrops() {
          try {
              const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/crops?page=0&size=5000&name=`, {
                  headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                  }
              });
              crops.value = response.data.map(crop => ({ label: crop.name, value: crop.id }));
          } catch (error) {
              console.error('Error fetching crops:', error);
          }
      };
      //get fieldId
      const computedFieldId = computed({
          get: () => cropData.value.fieldId,
          set: (value) => {
              cropData.value.fieldId = fields.value.find(field => field.value === value) || value;;
          }
      });
      //get cropId
      const computedCropId = computed({
          get: () => cropData.value.cropId,
          set: (value) => {
              cropData.value.cropId = crops.value.find(crop => crop.value === value) || value;;
          }
      });
      //check time
      const isValidDate = (dateStr) => {
          const regex = /^\d{2}-\d{2}-\d{4}$/;
          if (!regex.test(dateStr)) return false;

          const [day, month, year] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
      };

      const isSubmitDisabled = computed(() => {
          return !cropData.value.fieldId || !cropData.value.cropId || !cropData.value.startDate || !cropData.value.endDate || !cropData.value.description;
      })

      const submitData = () => {
          //check jwt
          if (!accessToken) {
              console.error('Нет доступного токена доступа');
              $q.notify({
              type: 'negative',
              message: 'Залогиньтесь, пожалуйста'
              });
              return;
          };

          if (!isValidDate(cropData.value.startDate)) {
              $q.notify({
                  color: 'red-5',
                  textColor: 'white',
                  icon: 'warning',
                  message: 'Неверный формат даты. Пожалуйста, используйте дд-мм-гггг.'
              });
              return;
          };

          if (!isValidDate(cropData.value.endDate)) {
              $q.notify({
                  color: 'red-5',
                  textColor: 'white',
                  icon: 'warning',
                  message: 'Неверный формат даты. Пожалуйста, используйте дд-мм-гггг.'
              });
              return;
          };

          const submissionData = {
              fieldId: cropData.value.fieldId.value,
              cropId: cropData.value.cropId.value,
              startDate: cropData.value.startDate,
              endDate: cropData.value.endDate,
              description: cropData.value.description
          };


          console.log('Submitting data:', JSON.stringify(submissionData));
          axios.post(`${process.env.VUE_APP_BASE_URL}/api/fields/crop-rotations`, submissionData, {
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
              }
          })
              .then(response => {
                  console.log(response);
                  const selectedField = fields.value.find(f => f.value === cropData.value.fieldId.value);
                  const selectedCrop = crops.value.find(c => c.value === cropData.value.cropId.value);

                  if (selectedField) {
                      computedFieldId.value = selectedField;
                  }
                  if (selectedCrop) {
                      computedCropId.value = selectedCrop;
                  }

                  $q.notify({
                      color: 'green-5',
                      textColor: 'white',
                      icon: 'check',
                      message: 'Изменение успешно.'
                  });
              })
              .catch(error => {
                  if (error.response && error.response.status === 500) {
                      $q.notify({
                      type: 'negative',
                      message: 'Неизвестная ошибка'
                  })
              }
                  console.error(error);
              })
      };

      return {
          computedCropId,
          computedFieldId,
          isSubmitDisabled,
          submitData,
          fetchCrops,
          fetchFields,
          cropData,
          fields,
          crops
      }
  }
}

</script>


<style>
.form-container {
  max-width: 540px;
  margin: 0 auto;
  border-radius: 14px;
}

.q-mb-md {
  margin-bottom: 16px;
}

.description-input {
  height: 100px;
}

.full-width-button {
  width: 100%;
}
</style>
