<template>
  <div class="q-pa-md">
    <div class="row">
      <div class="col-12 col-md-6">
        <div class="text-h4">{{ getName }}</div>
        <q-table
          :columns="seedColums"
          :rows="seedData"
          row-key="id"
          flat
          bordered
          hide-bottom
          header-class="custom-header-font"
        />
        <div class="text-h4 clickable-text" @click="cropRotationComposition">
          Культуры
        </div>
        <q-table
          v-if="isCropVisible"
          flat
          bordered
          virtual-scroll
          v-model="pagination"
          :rows-per-page-options="[0]"
          :virtual-scroll-sticky-size-start="48"
          column-key="id"
          :rows="filteredRows"
          :columns="rotationColumns"
          hide-bottom
        >
          <template v-slot:body-cell-row_number="props">
            <q-td :props="props">
              {{ props.rowIndex + 1 }}
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat icon="delete" @click="deleteRow(props.row.id)" />
            </q-td>
          </template>
          <template v-slot:body-cell-edit="props">
            <q-td :props="props">
              <q-btn flat icon="launch" @click="navigateToPage(props.row.id)" />
            </q-td>
          </template>

          <template v-slot:top>
            <div class="q-mb-md">
              <q-input v-model="startDate" placeholder="Дата начала">
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy
                      ref="qDateProxyStart"
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-date
                        v-model="startDate"
                        @input="() => $refs.qDateProxyStart.hide()"
                      />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>

              <q-input v-model="endDate" placeholder="Дата окончания">
                <template v-slot:append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy
                      ref="qDateProxyEnd"
                      transition-show="scale"
                      transition-hide="scale"
                    >
                      <q-date
                        v-model="endDate"
                        :min="startDate"
                        @input="() => $refs.qDateProxyEnd.hide()"
                      />
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </template>
        </q-table>
      </div>
      <div class="col-12 col-md-6 q-pl-md">
        <!-- map -->

        <q-btn
          label="Изменить информацию о поле"
          @click="goBackToAddField"
          color="primary"
        />
        <div class="text-center q-mt-lg"></div>
        <!-- soil -->
       <!-- <div class="text-h4 clickable-text" @click="fetchSoilComposition">
          Агрохимический состав почвы
        </div>
        <q-btn label="Изменить состав почвы" @click="goToFetchSoil"></q-btn>
        <q-table
          v-if="isSoilVisible"
          flat
          bordered
          :rows="soilData"
          :columns="soilColumns"
          row-key="id"
          hide-bottom
        /> -->
        <q-table
          v-if="isSoilVisible"
          flat
          bordered
          :rows="soilData2"
          :columns="soilColumns2"
          row-key="id"
          hide-bottom
        />
        <q-table
          v-if="isSoilVisible"
          flat
          bordered
          :rows="soilData3"
          :columns="soilColumns3"
          row-key="id"
          hide-bottom
        />
      </div>
    </div>


    <div>
     <!-- Данные о погоде -->
<div v-if="meteoData" class="meteo-data">
  <h2>Данные о погоде</h2>
  <div class="meteo-item">
    <strong>Идентификатор поля:</strong>
    <span>{{ meteoData.field_id }}</span>
  </div>
  <div class="meteo-item">
    <strong>Последнее обновление:</strong>
    <span>{{ meteoData.date_time }}</span>
  </div>
  <div class="meteo-item">
    <strong>Температура:</strong>
    <span>{{ meteoData.temperature }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Влажность:</strong>
    <span>{{ meteoData.humidity }} %</span>
  </div>
  <div class="meteo-item">
    <strong>Скорость ветра:</strong>
    <span>{{ meteoData.wind_speed }} м/с</span>
  </div>
  <div class="meteo-item">
    <strong>Осадки:</strong>
    <span>{{ meteoData.precipitation }} мм</span>
  </div>
  <div class="meteo-item">
    <strong>Точка росы:</strong>
    <span>{{ meteoData.dew_point }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Температура почвы (0 см):</strong>
    <span>{{ meteoData.soil_temperature_0cm }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Температура почвы (6 см):</strong>
    <span>{{ meteoData.soil_temperature_6cm }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Температура почвы (18 см):</strong>
    <span>{{ meteoData.soil_temperature_18cm }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Влажность почвы (0-1 см):</strong>
    <span>{{ meteoData.soil_moisture_0_to_1cm }} %</span>
  </div>
  <div class="meteo-item">
    <strong>Влажность почвы (1-3 см):</strong>
    <span>{{ meteoData.soil_moisture_1_to_3cm }} %</span>
  </div>
  <div class="meteo-item">
    <strong>Влажность почвы (3-9 см):</strong>
    <span>{{ meteoData.soil_moisture_3_to_9cm }} %</span>
  </div>
  <div class="meteo-item">
    <strong>Влажность почвы (9-27 см):</strong>
    <span>{{ meteoData.soil_moisture_9_to_27cm }} %</span>
  </div>
  <div class="meteo-item">
    <strong>Максимальная температура:</strong>
    <span>{{ meteoData.temperature_max }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Минимальная температура:</strong>
    <span>{{ meteoData.temperature_min }} °C</span>
  </div>
  <div class="meteo-item">
    <strong>Восход солнца:</strong>
    <span>{{ meteoData.sunrise }}</span>
  </div>
  <div class="meteo-item">
    <strong>Закат солнца:</strong>
    <span>{{ meteoData.sunset }}</span>
  </div>
  <div class="meteo-item">
    <strong>Суммарные осадки:</strong>
    <span>{{ meteoData.precipitation_sum }} мм</span>
  </div>
</div>

<!-- Ошибка при получении данных о погоде -->
<div v-else-if="meteoError">
  <p class="error">Ошибка при получении данных о погоде: {{ meteoError.message }}</p>
</div>

<!-- Загрузка данных о погоде -->
<div v-else>
  <p class="loading">Загрузка данных...</p>
</div>

    </div>

    <div class="graphics">
      <canvas id="humidity-chart"></canvas>
      <canvas id="pressure-chart"></canvas>
      <canvas id="temperature-chart"></canvas>
    </div>
  </div>
</template>

<script>
import {
  ref,
  onMounted,
  reactive,
  onBeforeUnmount,
  watchEffect,
  computed,
} from "vue";
import { Chart, registerables } from "chart.js";
import { debounce } from "lodash-es";

import "leaflet/dist/leaflet.css";
import "leaflet/dist/leaflet.js";
import axios from "axios";
import { userStore } from "src/usage";
import { useRoute, useRouter } from "vue-router";


Chart.register(...registerables);

export default {
  name: "Filed_info_page",
  setup() {
    //initialize every table or chart we need
    const isCropVisible = ref(false);
    const isSoilVisible = ref(false);

    const isHumidityBarChart = ref(true);
    const isPressureBarChart = ref(true);
    const isTemperatureBarChart = ref(true);

    const humidityChart = ref(null);
    const pressureChart = ref(null);
    const temperatureChart = ref(null);

    const route = useRoute();
    const router = useRouter();

    const accessToken = userStore.state.access_token;

    const getName = ref(null);

    const startDate = ref("");
    const endDate = ref("");

    const meteoData = ref(null);
    const meteoError = ref(null);

    const fetchMeteoData = async () => {
      const fieldId = route.query.fieldId; // или route.params.fieldId в зависимости от вашего маршрута
      console.log(`Requesting meteo data for fieldId: ${fieldId}`);
      const url = `${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId}`;
      console.log(`URL: ${url}`);

try {
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  meteoData.value = response.data.current || response.data;
} catch (error) {
  console.error('Error fetching meteo data:', error.response ? error.response.data : error.message);
  if (error.response) {
    console.error(`Status: ${error.response.status}`);
    console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
  } else {
    console.error(`Error message: ${error.message}`);
  }
  meteoError.value = error.response ? error.response.data : { message: error.message };
}
};

    //change field info
    const goBackToAddField = () => {
      const currentFieldId = route.query.fieldId;
      router.push({ path: "/fetch_field", query: { id: currentFieldId } });
      console.log(currentFieldId);
    };
    //change soil info
    const goToFetchSoil = () => {
      const currentFieldId2 = route.query.fieldId;
      router.push({ path: "/fetch_soil", query: { id: currentFieldId2 } });
      console.log(currentFieldId2);
    };

    //сulture
    const seedData = reactive([]);
    const seedColums = reactive([
      {
        name: "start_date",
        required: true,
        label: "Дата начала",
        align: "center",
        field: "start_date",
      },
      {
        name: "end_date",
        required: true,
        label: "Дата окончания",
        align: "center",
        field: "end_date",
      },
    ]);
    //humidity data form
    const humidityChartData = reactive({
      labels: [],
      datasets: [
        {
          label: "Влажность",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    });
    //pressure data form
    const pressureChartData = reactive({
      labels: [],
      datasets: [
        {
          label: "Давление",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    });
    //temperature data form
    const temperatureChartData = reactive({
      labels: [],
      datasets: [
        {
          label: "Температура",
          data: [],
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    });
    //identify chart form
    const chartOptions = reactive({
      responsive: true,
      maintainAspectRatio: false,
    });

    const initHumidityChart = () => {
      if (humidityChart.value) {
        humidityChart.value.destroy();
      }
      const context = document
        .getElementById("humidity-chart")
        .getContext("2d");
      humidityChart.value = new Chart(context, {
        type: isHumidityBarChart.value ? "bar" : "line",
        data: humidityChartData,
        options: chartOptions,
      });
    };

    const initPressureChart = () => {
      if (pressureChart.value) {
        pressureChart.value.destroy();
      }
      const context = document
        .getElementById("pressure-chart")
        .getContext("2d");
      pressureChart.value = new Chart(context, {
        type: isPressureBarChart.value ? "bar" : "line",
        data: pressureChartData,
        options: chartOptions,
      });
    };

    const initTemperatureChart = () => {
      if (temperatureChart.value) {
        temperatureChart.value.destroy();
      }
      const context = document
        .getElementById("temperature-chart")
        .getContext("2d");
      temperatureChart.value = new Chart(context, {
        type: isTemperatureBarChart.value ? "bar" : "line",
        data: temperatureChartData,
        options: chartOptions,
      });
    };
    //ensure chart initialize well
    const debouncedinitHumidityChart = debounce(initHumidityChart, 100);
    const debouncedinitPressureChart = debounce(initPressureChart, 100);
    const debouncedinitTemperatureChart = debounce(initTemperatureChart, 100);
    //click button and change chart type
    const toggleHumidityChartType = () => {
      isHumidityBarChart.value = !isHumidityBarChart.value;
      debouncedinitHumidityChart();
    };

    const togglePressureChartType = () => {
      isPressureBarChart.value = !isPressureBarChart.value;
      debouncedinitPressureChart();
    };

    const toggleTemperatureChartType = () => {
      isTemperatureBarChart.value = !isTemperatureBarChart.value;
      debouncedinitTemperatureChart();
    };

    //button showing crop rotation
    const cropRotationComposition = async () => {
      isCropVisible.value = !isCropVisible.value;
    };

    const rotationData = reactive([]);
    const rotationColumns = reactive([
      {
        name: "row_number",
        label: "ID",
        align: "center",
        field: (_row, index) => index + 1,
      },
      {
        name: "culture",
        label: "Культура",
        align: "center",
        field: "culture",
        sortable: true,
      },
      {
        name: "start_time",
        label: "Дата начала",
        align: "center",
        field: "start_time",
        sortable: true,
      },
      {
        name: "end_time",
        label: "Дата окончания",
        align: "center",
        field: "end_time",
        sortable: true,
      },
      {
        name: "description",
        label: "Описание",
        align: "center",
        field: "description",
      },
      {
        name: "edit",
        label: "Изменить",
        align: "center",
        field: (row) => row.id,
        format: (val) => `${val}`,
      },
      {
        name: "actions",
        label: "Удалить",
        align: "center",
        field: (row) => row.id,
        format: (val) => `${val}`,
      },
    ]);

    function formatDateString(dateString) {
      const parts = dateString.split("-");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateString;
    }

    async function deleteRow(rowId) {
      try {
        const response = await axios.delete(
          `${process.env.VUE_APP_BASE_URL}/api/fields/crop-rotations?id=${rowId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 204) {
          $q.notify({
            color: "green-5",
            textColor: "white",
            icon: "check",
            message: "Удалено",
          });
          rotationData.splice(
            rotationData.findIndex((row) => row.id === rowId),
            1
          );
        } else {
          console.error("Error deleting row:", response);
        }
      } catch (error) {
        console.error("Error during API call:", error);
      }
    }

    async function navigateToPage(rowId) {
      router.push({ path: "/fetch_rotation_field", query: { id: rowId } });
    }

    //button showing chemical element
    const soilData = reactive([]);
    const soilData2 = reactive([]);
    const soilData3 = reactive([]);

    const soilColumns = reactive([
      { name: "ph", label: "ph", field: "ph", align: "center" },
      {
        name: "sampleDate",
        label: "Дата взятия образца",
        field: "sampleDate",
        align: "center",
      },
      {
        name: "organicMatter",
        label: "Органическое вещество",
        field: "organicMatter",
        align: "center",
      },
      {
        name: "mobileP",
        label: "Подвижный Фосфор (P)",
        field: "mobileP",
        align: "center",
      },
      {
        name: "mobileK",
        label: "Подвижный Калий (К)",
        field: "mobileK",
        align: "center",
      },
    ]);
    const soilColumns2 = reactive([
      {
        name: "mobileS",
        label: "Подвижная Сера (S)",
        field: "mobileS",
        align: "center",
      },
      {
        name: "nitrateN",
        label: "Нитратный Азот (N)",
        field: "nitrateN",
        align: "center",
      },
      {
        name: "ammoniumN",
        label: "Аммонийный Азот (N)",
        field: "ammoniumN",
        align: "center",
      },
      {
        name: "hydrolyticAcidity",
        label: "Гидролитическая кислотность",
        field: "hydrolyticAcidity",
        align: "center",
      },
      {
        name: "caExchange",
        label: "Обмен Кальция (Ca)",
        field: "caExchange",
        align: "center",
      },
    ]);
    const soilColumns3 = reactive([
      {
        name: "mgExchange",
        label: "Обмен Магния (Mg)",
        field: "mgExchange",
        align: "center",
      },
      { name: "b", label: "b", field: "b", align: "center" },
      { name: "co", label: "co", field: "co", align: "center" },
      { name: "mn", label: "mn", field: "mn", align: "center" },
      { name: "zn", label: "zn", field: "zn", align: "center" },
    ]);

    const fetchSoilComposition = async () => {
      isSoilVisible.value = !isSoilVisible.value;
    };

    //map

    onMounted(async () => {
      initHumidityChart();
      initPressureChart();
      initTemperatureChart();
      fetchMeteoData();

      // Создание карты

      const fieldId = route.query.fieldId;

      if (!accessToken) {
        $q.notify({
          type: "negative",
          message: "Залогиньтесь, пожалуйста",
        });
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/fields/crop-rotations/field?fieldId=${fieldId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        const crop_data = response.data;
        console.log(response.data);

        if (crop_data) {
          crop_data.cropRotations.forEach((item) => {
            rotationData.push({
              id: item.id,
              culture: item.crop.name,
              start_time: formatDateString(item.startDate),
              end_time: formatDateString(item.endDate),
              description: item.description,
            });
          });
        }
      } catch (error) {
        console.error("Wrong Api", error);
      }

      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/fields?fieldId=${fieldId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = response.data;
        getName.value = data.name;
        console.log(response.data);

        //push data to chart
        if (data) {
          humidityChartData.labels = [];
          humidityChartData.datasets[0].data = [];

          pressureChartData.labels = [];
          pressureChartData.datasets[0].data = [];

          temperatureChartData.labels = [];
          temperatureChartData.datasets[0].data = [];

          seedData.push({
            start_date: data.activityStart,
            end_date: data.activityEnd,
          });
          soilData.push({
            ph: data.soil?.ph,
            sampleDate: data.soil?.sampleDate,
            organicMatter: data.soil?.organicMatter,
            mobileP: data.soil?.mobileP,
            mobileK: data.soil?.mobileK,
          });
          soilData2.push({
            mobileS: data.soil?.mobileS,
            nitrateN: data.soil?.nitrateN,
            ammoniumN: data.soil?.ammoniumN,
            hydrolyticAcidity: data.soil?.hydrolyticAcidity,
            caExchange: data.soil?.caExchange,
          });
          soilData3.push({
            mgExchange: data.soil?.mgExchange,
            b: data.soil?.b,
            co: data.soil?.co,
            mn: data.soil?.mn,
            zn: data.soil?.zn,
          });






        }
      } catch (error) {
        console.error("Wrong Data", error);
      }
    });

    watchEffect(() => {
      console.log("Current dates:", startDate.value, endDate.value);
    });

    const filteredRows = computed(() => {
      const start = startDate.value
        ? new Date(startDate.value.replace(/\//g, "-")).getTime()
        : -Infinity;
      const end = endDate.value
        ? new Date(endDate.value.replace(/\//g, "-")).getTime()
        : Infinity;

      return rotationData.filter((rotationData) => {
        const rowStart = new Date(rotationData.start_time).getTime();
        const rowEnd = new Date(rotationData.end_time).getTime();
        return rowStart >= start && rowEnd <= end;
      });
    });

    onBeforeUnmount(() => {
      //destroy cache
      if (humidityChart.value) {
        humidityChart.value.destroy();
      }
      if (pressureChart.value) {
        pressureChart.value.destroy();
      }
      if (temperatureChart.value) {
        temperatureChart.value.destroy();
      }
    });

    return {
      getName,
      seedData,
      seedColums,
      humidityChartData,
      pressureChartData,
      temperatureChartData,
      chartOptions,
      humidityChart,
      pressureChart,
      temperatureChart,
      initHumidityChart,
      initPressureChart,
      initTemperatureChart,
      toggleHumidityChartType,
      togglePressureChartType,
      toggleTemperatureChartType,
      soilColumns,
      soilData,
      soilColumns2,
      soilData2,
      soilColumns3,
      soilData3,
      fetchSoilComposition,
      isCropVisible,
      isSoilVisible,
      debouncedinitHumidityChart,
      debouncedinitPressureChart,
      debouncedinitTemperatureChart,
      goBackToAddField,
      goToFetchSoil,
      cropRotationComposition,
      navigateToPage,
      deleteRow,
      rotationColumns,
      rotationData,
      startDate,
      endDate,
      filteredRows,
      meteoData,
      meteoError,
      fetchMeteoData,
      pagination: ref({ rowsPerPage: 1000 }),
    };
  },
};
</script>

<style>
.graphics {
  display: none;
}

.q-pa-md {
  max-width: 1320px;
  margin: 0 auto;
}

.q-table {
  border-radius: 12px;
}

.meteo-data {
  border: 1px solid #e4ebf6;
  padding: 20px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 22px rgba(19, 36, 58, 0.08);
}



.q-table th {
  font-size: 17px;
}

.clickable-text {
  z-index: 10;
  position: relative;
  cursor: pointer;
  color: black;
  text-decoration: underline;

}

.clickable-text:hover {
  color: darkblue;
}

.row {
  display: flex;
  flex-wrap: wrap;
}

.q-btn {
  margin-right: 10px;
}

.virtscroll-table {
  max-width: 100%;
  margin-top: 50px;
  margin-bottom: 50px;
  margin-left: auto;
  margin-right: auto;
  width: auto;

  .q-table th {
    font-size: 20px !important;
  }

  .q-table td {
    font-size: 15px !important;
  }
}


.meteo-data h2 {
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
}

.meteo-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.meteo-item:last-child {
  border-bottom: none;
}

.meteo-item strong {
  font-weight: 600;
  color: #555;
}

.meteo-item span {
  color: #000;
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

@media (max-width: 768px) {
  .q-table th {
    font-size: 20px !important;
  }

  .q-table td {
    font-size: 15px !important;
  }

  .virtscroll-table {
    margin-top: 20px;
    margin-bottom: 20px;
  }
}
</style>
