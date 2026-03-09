<template>
  <div class="q-pa-md contour-info-container">
    <div class="info-section">
      <div class="text-h6 font-bold">Информация о поле</div>
      <div class="q-mt-md q-gutter-y-xs">
        <div class="info-item row">
          <span class="label col-auto text-subtitle1 font-bold">Сезон:</span>
          <span class="value col text-subtitle1">{{ fieldInfo.seasonName }}</span>
        </div>
        <div class="info-item row">
          <span class="label col-auto text-subtitle1 font-bold">Поле:</span>
          <span class="value col text-subtitle1">{{ fieldInfo.fieldName }}</span>
        </div>
      </div>
    </div>

    <q-expansion-item v-model="weatherExpanded" icon="cloud" dense expand-separator class="q-mt-md weather-section">
      <template v-slot:header>
        <div class="text-h6 font-bold">Данные о погоде</div>
      </template>
      
      <div class="q-pa-md">
        <div v-if="weatherData" class="weather-data">
          <div v-for="(item, index) in weatherData" :key="index" class="weather-item row weather-item-spacing">
            <span class="label text-subtitle1 font-bold">{{ item.label }}:</span>
            <span class="value text-subtitle1">{{ item.value }}</span>
          </div>
        </div>
        
        <div v-else-if="weatherError" class="error">
          Ошибка при получении данных о погоде: {{ weatherError.message }}
        </div>

        <div v-else class="loading">
          Загрузка данных о погоде...
        </div>
      </div>
    </q-expansion-item>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { userStore } from 'src/usage';

export default {
  name: 'FieldWeatherInfoPage',
  setup() {

    const route = useRoute();

    const seasonName = ref(route.query.seasonName || '');
    const fieldName = ref(route.query.fieldName || '');
    const fieldId = ref(route.query.fieldId || '');

    const fieldInfo = ref({
      fieldId: fieldId.value,
      fieldName: fieldName.value,
      seasonName: seasonName.value
    });

    const weatherExpanded = ref(true);
    const weatherData = ref(null);
    const weatherError = ref(null);
    const accessToken = computed(() => userStore.state.access_token);

    const fetchMeteoData = async () => {

      const url = `${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId.value}`;

      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            'Content-Type': 'application/json',
          },
        });
        
        weatherData.value = [
          { label: 'Идентификатор поля', value: response.data.field_id },
          { label: 'Последнее обновление', value: response.data.date_time },
          { label: 'Температура', value: `${response.data.temperature} °C` },
          { label: 'Влажность', value: `${response.data.humidity} %` },
          { label: 'Скорость ветра', value: `${response.data.wind_speed} м/с` },
          { label: 'Осадки', value: `${response.data.precipitation} мм` },
          { label: 'Точка росы', value: `${response.data.dew_point} °C` },
          { label: 'Температура почвы (0 см)', value: `${response.data.soil_temperature_0cm} °C` },
          { label: 'Температура почвы (6 см)', value: `${response.data.soil_temperature_6cm} °C` },
          { label: 'Температура почвы (18 см)', value: `${response.data.soil_temperature_18cm} °C` },
          { label: 'Влажность почвы (0-1 см)', value: `${response.data.soil_moisture_0_to_1cm} %` },
          { label: 'Влажность почвы (1-3 см)', value: `${response.data.soil_moisture_1_to_3cm} %` },
          { label: 'Влажность почвы (3-9 см)', value: `${response.data.soil_moisture_3_to_9cm} %` },
          { label: 'Влажность почвы (9-27 см)', value: `${response.data.soil_moisture_9_to_27cm} %` },
          { label: 'Максимальная температура', value: `${response.data.temperature_max} °C` },
          { label: 'Минимальная температура', value: `${response.data.temperature_min} °C` },
          { label: 'Восход солнца', value: response.data.sunrise },
          { label: 'Закат солнца', value: response.data.sunset },
          { label: 'Суммарные осадки', value: `${response.data.precipitation_sum} мм` },
        ];
      } catch (error) {
        console.error('Error fetching meteo data:', error.response ? error.response.data : error.message);
        weatherError.value = error.response ? error.response.data : { message: error.message };
      }
    };

    onMounted(() => {
      fetchMeteoData();
    });

    return {
      fieldInfo,
      seasonName,
      fieldName,
      fieldId,
      weatherExpanded,
      weatherData,
      weatherError,
    };
  }
};
</script>

<style scoped>
.contour-info-container {
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.info-section {
  max-width: 60%;
}

.weather-section {
  max-width: 80%;
  margin-top: 16px;
}

.text-h6 {
  font-size: 1.5rem;
  color: #333;
}

.font-bold {
  font-weight: bold;
}

.info-item, .weather-item {
  align-items: center;
  font-size: 1.2rem;
}

.label {
  font-weight: bold;
  width: 200px; 
}

.value {
  flex-grow: 1;
  margin-left: 20px;
}

.weather-item-spacing {
  margin-bottom: 12px;
}

.error {
  color: #ff0000;
  padding: 20px;
  background-color: #ffe5e5;
  border: 1px solid #ff0000;
  border-radius: 8px;
}

.loading {
  color: #555;
  font-size: 16px;
  text-align: center;
}
</style>
