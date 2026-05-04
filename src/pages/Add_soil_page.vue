<template>
  <q-page padding class="legacy-form-page">
  <q-card class="legacy-form-card">
    <q-card-section>
      <div class="text-h6">Добавление почвенных данных</div>
    </q-card-section>
    <q-card-section class="legacy-grid">
    <div v-for="(column, index) in soilColumns" :key="index" class="q-ma-sm legacy-cell">
      <q-input v-model="soilData[column.name]" :label="column.label" dense
        :hint="column.name === 'sampleDate' ? 'Format: dd-mm-yyyy' : ''"
        :placeholder="column.name === 'sampleDate' ? 'dd-mm-yyyy' : ''"></q-input>
    </div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn label="Готово" color="primary" @click="submitData" :disabled="isSubmitDisabled"></q-btn>
    </q-card-actions>
  </q-card>
  </q-page>
</template>

<script>
import { useRouter } from 'vue-router';
import { reactive, computed } from 'vue';
import axios from 'axios';
import { userStore } from 'src/usage';
import { useQuasar } from 'quasar';

export default {
  name: 'AddSoilPage',
  setup() {
    const $q = useQuasar();

    const router = useRouter();

    const soilData = reactive({});
    const soilColumns = reactive([
      { name: 'fieldId', label: 'ID поля', field: 'fieldId', align: 'center' },
      { name: 'ph', label: 'ph', field: 'ph', align: 'center' },
      { name: 'sampleDate', label: 'Дата взятия образца', field: 'sampleDate', align: 'center' },
      { name: 'organicMatter', label: 'organicMatter', field: 'organicMatter', align: 'center' },
      { name: 'mobileP', label: 'Подвижный фосфор (P)', field: 'mobileP', align: 'center' },
      { name: 'mobileK', label: 'Подвижный калий (K)', field: 'mobileK', align: 'center' },
      { name: 'mobileS', label: 'Подвижная сера (S)', field: 'mobileS', align: 'center' },
      { name: 'nitrateN', label: 'Нитратный азот (N)', field: 'nitrateN', align: 'center' },
      { name: 'ammoniumN', label: 'Аммонийный азот (N)', field: 'ammoniumN', align: 'center' },
      { name: 'hydrolyticAcidity', label: 'Гидролитическая азотность', field: 'hydrolyticAcidity', align: 'center' },
      { name: 'caExchange', label: 'Обмен кальция (Ca)', field: 'caExchange', align: 'center' },
      { name: 'mgExchange', label: 'Обмен магния (Mg)', field: 'mgExchange', align: 'center' },
      { name: 'b', label: 'b', field: 'b', align: 'center' },
      { name: 'co', label: 'co', field: 'co', align: 'center' },
      { name: 'mn', label: 'mn', field: 'mn', align: 'center' },
      { name: 'zn', label: 'zn', field: 'zn', align: 'center' },
    ]);

    const isSubmitDisabled = computed(() => {
      return soilColumns.some(column => {
        const value = soilData[column.name];
        return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
      });
    });
    //test if sampleDate form is right
    function isValidDateFormat(dateStr) {
      const regex = /^\d{2}-\d{2}-\d{4}$/;
      return regex.test(dateStr);
    };

    const accessToken = userStore.state.access_token;

    const submitData = () => {
      //check jwt
      if (!accessToken) {
        console.error('No access token available');
        $q.notify({
          type: 'negative',
          message: 'Залогиньтесь, пожалуйста'
        })
        return;
      };

      if (soilData.fieldId && typeof soilData.fieldId === 'string') {
        soilData.fieldId = parseInt(soilData.fieldId, 10);
      };

      // turn id from str into int
      if (isNaN(soilData.fieldId)) {
        console.error('Invalid fieldId: must be a number');
        return;
      };

      //if date is wrong format, return
      if (!isValidDateFormat(soilData.sampleDate)) {
        $q.notify({
          color: 'red-5',
          textColor: 'white',
          icon: 'warning',
          message: 'Неверный формат даты начала активности. Пожалуйста, используйте дд-мм-гггг.'
        });
        return;
      };

      console.log('Submitting data:', JSON.stringify(soilData)); //check data
      axios.post(`${process.env.VUE_APP_BASE_URL}/api/fields/soil`, soilData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          console.log(soilData)
          console.log(response);
          const fieldId = response.data.fieldId;
          router.push({ path: '/field_information', query: { fieldId: fieldId } });
        })
        .catch(error => {
          if (error.response && error.response.status === 409) {
            $q.notify({
            type: 'negative',
            message: 'Дата уже существует'
          })
        }
        if (error.response && error.response.status === 404) {
            $q.notify({
            type: 'negative',
            message: 'Пожалуйста, сначала создайте Поле'
          })
        }
        if (error.response && error.response.status === 500) {
            $q.notify({
            type: 'negative',
            message: 'Неизвестная ошибка'
          })
        }
          console.error('Error submitting data', error);
        })
    };

    return {
      soilData,
      soilColumns,
      isSubmitDisabled,
      submitData
    }
  }
}
</script>

<style scoped>
.legacy-form-page {
  display: flex;
  justify-content: center;
}

.legacy-form-card {
  width: min(980px, 100%);
}

.legacy-grid {
  display: flex;
  flex-wrap: wrap;
}

.legacy-cell {
  flex: 1 1 220px;
}
</style>