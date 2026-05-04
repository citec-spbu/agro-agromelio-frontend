<template>
  <div class="q-pa-md contour-info-container field-weather-page">
    <q-card class="info-section">
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6 text-weight-bold">Метеоданные поля</div>
          <div class="text-caption text-grey-7">Период: {{ periodCaption }}</div>
        </div>
        <q-btn
          no-caps
          color="primary"
          icon="refresh"
          label="Обновить данные"
          :loading="refreshLoading"
          @click="refreshMeteoData"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-y-xs">
        <div><strong>Сезон:</strong> {{ fieldInfo.seasonName }}</div>
        <div><strong>Поле:</strong> {{ fieldInfo.fieldName }}</div>
        <div v-if="currentData"><strong>Последнее обновление:</strong> {{ formatDateTime(currentData.date_time) }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="meteo-filter-row">
          <q-input
            v-model="dateFromInput"
            type="date"
            dense
            outlined
            label="Дата с"
            class="meteo-filter-input"
          />
          <q-btn
            no-caps
            color="primary"
            label="Применить"
            :loading="periodLoading"
            @click="applyPeriodFilter"
          />
          <q-btn
            no-caps
            flat
            color="primary"
            label="Сбросить"
            :disable="periodLoading"
            @click="resetPeriodFilter"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="currentData" class="current-preview-card q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Текущее превью</div>
        <div class="preview-grid">
          <div class="preview-item"><span>Температура</span><strong>{{ formatTemperature(currentData.temperature) }}</strong></div>
          <div class="preview-item"><span>Влажность</span><strong>{{ formatValue(currentData.humidity, "%") }}</strong></div>
          <div class="preview-item"><span>Ветер</span><strong>{{ formatValue(currentData.wind_speed, "м/с") }}</strong></div>
          <div class="preview-item"><span>Почва 0-1 см</span><strong>{{ formatValue(currentData.soil_moisture_0_to_1cm, "%") }}</strong></div>
          <div class="preview-item"><span>Восход</span><strong>{{ formatTime(currentData.sunrise) }}</strong></div>
          <div class="preview-item"><span>Закат</span><strong>{{ formatTime(currentData.sunset) }}</strong></div>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Погода (температура, влажность, осадки)</div>
      </q-card-section>
      <q-card-section>
        <canvas id="weather-chart"></canvas>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Влажность почвы (0-1 см и 9-27 см)</div>
      </q-card-section>
      <q-card-section>
        <canvas id="soil-chart"></canvas>
      </q-card-section>
      <q-card-section v-if="soilGapStartLabel" class="q-pt-none">
        <q-banner dense class="weather-soil-gap-banner">
          Нет данных почвы начиная с {{ soilGapStartLabel }}. На графике этот период отмечен пунктиром.
        </q-banner>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Восход и закат</div>
      </q-card-section>
      <q-card-section>
        <canvas id="sun-chart"></canvas>
      </q-card-section>
    </q-card>

    <q-banner v-if="weatherError" class="q-mt-md bg-red-1 text-negative">
      Ошибка при получении метеоданных: {{ weatherError.message || weatherError.detail || "Неизвестная ошибка" }}
    </q-banner>
  </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import axios from "axios";
import { useQuasar } from "quasar";
import { useRoute } from "vue-router";
import { Chart, registerables } from "chart.js";
import { userStore } from "src/usage";

Chart.register(...registerables);

export default {
  name: "FieldWeatherInfoPage",
  setup() {
    const $q = useQuasar();
    const route = useRoute();

    const seasonName = ref(route.query.seasonName || "");
    const fieldName = ref(route.query.fieldName || "");
    const fieldId = ref(route.query.fieldId || "");
    const accessToken = computed(() => userStore.state.access_token);

    const fieldInfo = ref({
      fieldId: fieldId.value,
      fieldName: fieldName.value,
      seasonName: seasonName.value,
    });

    const currentData = ref(null);
    const timelineData = ref([]);
    const weatherError = ref(null);
    const refreshLoading = ref(false);
    const periodLoading = ref(false);

    const toIsoDate = (value) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const shiftDays = (baseDate, days) => {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + days);
      return next;
    };

    const today = new Date();
    const addDaysToIsoDate = (isoDate, days) => {
      const parsed = new Date(isoDate);
      return toIsoDate(shiftDays(parsed, days));
    };

    const defaultStartDate = toIsoDate(shiftDays(today, -15));
    const defaultEndDate = toIsoDate(shiftDays(today, 15));
    const currentStartDate = ref(defaultStartDate);
    const currentEndDate = ref(defaultEndDate);
    const dateFromInput = ref(defaultStartDate);

    const formatIsoDateForCaption = (isoDate) => {
      if (!isoDate) return "-";
      const parsed = new Date(isoDate);
      return parsed.toLocaleDateString("ru-RU");
    };

    const periodCaption = computed(
      () =>
        `${formatIsoDateForCaption(currentStartDate.value)} - ${formatIsoDateForCaption(
          currentEndDate.value
        )}`
    );

    const weatherChart = ref(null);
    const soilChart = ref(null);
    const sunChart = ref(null);
    const soilGapStartLabel = ref("");

    const formatDateLabel = (raw) => {
      if (!raw) return "";
      const date = new Date(raw);
      return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    };

    const formatDateTime = (raw) => {
      if (!raw) return "-";
      return new Date(raw).toLocaleString("ru-RU");
    };

    const formatTime = (raw) => {
      if (!raw) return "-";
      return new Date(raw).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    };

    const formatValue = (value, unit) => {
      if (value === null || value === undefined) return "-";
      return `${Number(value).toFixed(1)} ${unit}`;
    };

    const formatTemperature = (value) => {
      if (value === null || value === undefined) return "-";
      return `${Number(value).toFixed(1)} °C`;
    };

    const toHourValue = (raw) => {
      if (!raw) return null;
      const date = new Date(raw);
      return date.getHours() + date.getMinutes() / 60;
    };

    const toHourText = (value) => {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
      const totalMinutes = Math.round(Number(value) * 60);
      const hours = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");
      const minutes = (totalMinutes % 60).toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const gradient = (ctx, topColor, bottomColor) => {
      const g = ctx.createLinearGradient(0, 0, 0, 260);
      g.addColorStop(0, topColor);
      g.addColorStop(1, bottomColor);
      return g;
    };

    const buildCommonOptions = () => {
      const dark = $q.dark.isActive;
      const legendColor = dark ? "#e2e8f0" : "#415778";
      const tickColor = dark ? "#94a3b8" : "#5d7394";
      const gridColor = dark ? "rgba(148, 163, 184, 0.14)" : "rgba(78, 105, 146, 0.12)";
      const tooltipBg = dark ? "rgba(15, 23, 42, 0.94)" : "rgba(23, 34, 52, 0.92)";
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        elements: {
          point: {
            radius: 2.2,
            hoverRadius: 4.5,
          },
          line: {
            borderWidth: 2.6,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: legendColor,
              usePointStyle: true,
              boxWidth: 9,
              boxHeight: 9,
              padding: 16,
              font: {
                size: 12,
                weight: "600",
              },
            },
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: "#f5f8ff",
            bodyColor: "#dbe7ff",
            cornerRadius: 10,
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: {
              color: tickColor,
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: tickColor,
              font: {
                size: 11,
              },
            },
            grid: {
              color: gridColor,
            },
          },
        },
      };
    };

    const destroyCharts = () => {
      if (weatherChart.value) weatherChart.value.destroy();
      if (soilChart.value) soilChart.value.destroy();
      if (sunChart.value) sunChart.value.destroy();
      weatherChart.value = null;
      soilChart.value = null;
      sunChart.value = null;
    };

    const buildCharts = () => {
      destroyCharts();
      if (!timelineData.value?.length) return;

      const commonOptions = buildCommonOptions();
      const labels = timelineData.value.map((item) => formatDateLabel(item.date_time));
      const weatherCtx = document.getElementById("weather-chart")?.getContext("2d");
      const soilCtx = document.getElementById("soil-chart")?.getContext("2d");
      const sunCtx = document.getElementById("sun-chart")?.getContext("2d");
      if (!weatherCtx || !soilCtx || !sunCtx) return;

      const soilSeriesTop = timelineData.value.map((item) => item.soil_moisture_0_to_1cm);
      const soilSeriesDeep = timelineData.value.map((item) => item.soil_moisture_9_to_27cm);
      const allSoilValues = [...soilSeriesTop, ...soilSeriesDeep].filter(
        (v) => v !== null && v !== undefined
      );
      const soilMin = allSoilValues.length ? Math.min(...allSoilValues) : 0;
      const soilMax = allSoilValues.length ? Math.max(...allSoilValues) : 1;
      const soilRange = Math.max(soilMax - soilMin, 0.02);
      const noDataLineY = Number((soilMin - soilRange * 0.08).toFixed(4));

      const soilGapIndex = timelineData.value.findIndex(
        (item) =>
          (item.soil_moisture_0_to_1cm === null || item.soil_moisture_0_to_1cm === undefined) &&
          (item.soil_moisture_9_to_27cm === null || item.soil_moisture_9_to_27cm === undefined)
      );
      soilGapStartLabel.value =
        soilGapIndex >= 0 ? formatDateLabel(timelineData.value[soilGapIndex].date_time) : "";

      weatherChart.value = new Chart(weatherCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Температура, °C",
              data: timelineData.value.map((item) => item.temperature),
              borderColor: "#2f6fdd",
              backgroundColor: gradient(weatherCtx, "rgba(47, 111, 221, 0.28)", "rgba(47, 111, 221, 0.02)"),
              pointBackgroundColor: "#2f6fdd",
              tension: 0.34,
              fill: true,
            },
            {
              label: "Влажность, %",
              data: timelineData.value.map((item) => item.humidity),
              borderColor: "#17b26a",
              backgroundColor: gradient(weatherCtx, "rgba(23, 178, 106, 0.22)", "rgba(23, 178, 106, 0.02)"),
              pointBackgroundColor: "#17b26a",
              tension: 0.34,
              fill: true,
            },
            {
              label: "Осадки, мм",
              data: timelineData.value.map((item) => item.precipitation_sum ?? item.precipitation),
              borderColor: "#8b5cf6",
              backgroundColor: gradient(weatherCtx, "rgba(139, 92, 246, 0.22)", "rgba(139, 92, 246, 0.02)"),
              pointBackgroundColor: "#8b5cf6",
              tension: 0.34,
              fill: true,
            },
          ],
        },
        options: commonOptions,
      });

      soilChart.value = new Chart(soilCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "0-1 см, %",
              data: soilSeriesTop,
              borderColor: "#0ea5e9",
              backgroundColor: gradient(soilCtx, "rgba(14, 165, 233, 0.24)", "rgba(14, 165, 233, 0.02)"),
              pointBackgroundColor: "#0ea5e9",
              tension: 0.34,
              fill: true,
            },
            {
              label: "9-27 см, %",
              data: soilSeriesDeep,
              borderColor: "#ef4444",
              backgroundColor: gradient(soilCtx, "rgba(239, 68, 68, 0.18)", "rgba(239, 68, 68, 0.02)"),
              pointBackgroundColor: "#ef4444",
              tension: 0.34,
              fill: true,
            },
            {
              label: "Нет данных почвы",
              data: timelineData.value.map((_, idx) => (soilGapIndex >= 0 && idx >= soilGapIndex ? noDataLineY : null)),
              borderColor: "rgba(120, 132, 152, 0.85)",
              borderDash: [6, 6],
              pointRadius: 0,
              tension: 0,
              fill: false,
            },
          ],
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: {
              ...(commonOptions.plugins?.legend || {}),
              labels: {
                ...(commonOptions.plugins?.legend?.labels || {}),
                filter: (item) => item.text !== "Нет данных почвы",
              },
            },
          },
          scales: {
            x: commonOptions.scales?.x,
            y: {
              ...(commonOptions.scales?.y || {}),
              suggestedMin: noDataLineY - soilRange * 0.04,
              suggestedMax: soilMax + soilRange * 0.08,
            },
          },
        },
      });

      const tickColor = $q.dark.isActive ? "#94a3b8" : "#5d7394";
      const gridX = $q.dark.isActive ? "rgba(148, 163, 184, 0.1)" : "rgba(78, 105, 146, 0.07)";
      const gridY = $q.dark.isActive ? "rgba(148, 163, 184, 0.12)" : "rgba(57, 88, 131, 0.11)";

      sunChart.value = new Chart(sunCtx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Восход (часы)",
              data: timelineData.value.map((item) => toHourValue(item.sunrise)),
              borderColor: "#f59e0b",
              backgroundColor: "rgba(250, 204, 21, 0.2)",
              spanGaps: true,
              pointBackgroundColor: "#f59e0b",
              fill: "+1",
              tension: 0.25,
            },
            {
              label: "Закат (часы)",
              data: timelineData.value.map((item) => toHourValue(item.sunset)),
              borderColor: "#fb7185",
              backgroundColor: "rgba(251, 113, 133, 0.12)",
              spanGaps: true,
              pointBackgroundColor: "#fb7185",
              fill: false,
              tension: 0.25,
            },
          ],
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              ...(commonOptions.plugins?.tooltip || {}),
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${toHourText(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              ...commonOptions.scales?.x,
              grid: {
                color: gridX,
              },
            },
            y: {
              ...(commonOptions.scales?.y || {}),
              min: 0,
              max: 24,
              title: {
                display: true,
                text: "Время суток",
                color: tickColor,
              },
              ticks: {
                stepSize: 2,
                color: tickColor,
                callback: (value) => toHourText(value),
              },
              grid: {
                color: gridY,
              },
            },
          },
        },
      });
    };

    const fetchCurrentMeteoData = async () => {
      const url = `${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId.value}`;
      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            "Content-Type": "application/json",
          },
        });
        currentData.value = response.data.current || null;
      } catch (error) {
        weatherError.value = error.response ? error.response.data : { message: error.message };
      }
    };

    const fetchMeteoDataByPeriod = async () => {
      const url = `${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId.value}/period`;
      try {
        const response = await axios.get(url, {
          params: {
            start_date: currentStartDate.value,
            end_date: currentEndDate.value,
          },
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            "Content-Type": "application/json",
          },
        });
        timelineData.value = response.data.timeline || [];
        weatherError.value = null;
        setTimeout(buildCharts, 0);
      } catch (error) {
        const statusCode = error?.response?.status;
        if (statusCode === 404) {
          await fetchMeteoDataByPeriodFallback();
          return;
        }
        weatherError.value = error.response ? error.response.data : { message: error.message };
      }
    };

    const fetchMeteoDataByPeriodFallback = async () => {
      const url = `${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId.value}`;
      try {
        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            "Content-Type": "application/json",
          },
        });
        const timeline = response.data.timeline || [];
        timelineData.value = timeline.filter((item) => {
          const pointDate = toIsoDate(new Date(item.date_time));
          return pointDate >= currentStartDate.value && pointDate <= currentEndDate.value;
        });
        weatherError.value = null;
        setTimeout(buildCharts, 0);
      } catch (fallbackError) {
        weatherError.value = fallbackError.response
          ? fallbackError.response.data
          : { message: fallbackError.message };
      }
    };

    const fetchMeteoData = async () => {
      await Promise.all([fetchCurrentMeteoData(), fetchMeteoDataByPeriod()]);
    };

    const applyPeriodFilter = async () => {
      if (!dateFromInput.value) {
        $q.notify({
          type: "warning",
          message: "Укажите дату начала периода",
        });
        return;
      }
      currentStartDate.value = dateFromInput.value;
      currentEndDate.value = addDaysToIsoDate(dateFromInput.value, 30);
      periodLoading.value = true;
      try {
        await fetchMeteoDataByPeriod();
      } finally {
        periodLoading.value = false;
      }
    };

    const resetPeriodFilter = async () => {
      dateFromInput.value = defaultStartDate;
      currentStartDate.value = defaultStartDate;
      currentEndDate.value = defaultEndDate;
      periodLoading.value = true;
      try {
        await fetchMeteoDataByPeriod();
      } finally {
        periodLoading.value = false;
      }
    };

    const refreshMeteoData = async () => {
      refreshLoading.value = true;
      try {
        await axios.post(`${process.env.VUE_APP_BASE_URL}/api/meteo/${fieldId.value}/refresh`, null, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            "Content-Type": "application/json",
          },
        });
        await fetchMeteoData();
        $q.notify({
          type: "positive",
          message: "Метеоданные обновлены",
        });
      } catch (error) {
        weatherError.value = error.response ? error.response.data : { message: error.message };
      } finally {
        refreshLoading.value = false;
      }
    };

    onMounted(async () => {
      await fetchMeteoData();
    });

    onBeforeUnmount(() => {
      destroyCharts();
    });

    watch(
      () => $q.dark.isActive,
      () => {
        if (timelineData.value?.length) {
          setTimeout(buildCharts, 0);
        }
      }
    );

    return {
      fieldInfo,
      currentData,
      timelineData,
      weatherError,
      refreshLoading,
      periodLoading,
      soilGapStartLabel,
      dateFromInput,
      periodCaption,
      refreshMeteoData,
      applyPeriodFilter,
      resetPeriodFilter,
      formatDateTime,
      formatTime,
      formatValue,
      formatTemperature,
    };
  },
};
</script>

<style scoped>
.field-weather-page {
  --wx-card-border: #e3ebf7;
  --wx-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(247, 251, 255, 0.92));
  --wx-card-shadow: 0 10px 22px rgba(19, 36, 58, 0.08);
  --wx-tile-bg: #f7faff;
  --wx-tile-border: #e3ebf7;
  --wx-text-muted: #6a7d99;
  --wx-text-strong: #2a3f5b;
  --wx-text-heading: #1e2a3d;
  --wx-info-row: rgba(30, 42, 61, 0.88);
}

.field-weather-page :deep(.text-grey-7) {
  color: var(--wx-text-muted) !important;
}

.field-weather-page :deep(.text-subtitle1),
.field-weather-page :deep(.text-h6) {
  color: var(--wx-text-heading);
}

.field-weather-page .info-section .q-card-section div {
  color: var(--wx-info-row);
}

.field-weather-page .info-section .q-card-section strong {
  color: var(--wx-text-strong);
}

.contour-info-container {
  max-width: 1200px;
  margin: 0 auto;
}

.info-section,
.current-preview-card,
.chart-card {
  border-radius: 14px;
  border: 1px solid var(--wx-card-border);
  background: var(--wx-card-bg);
  box-shadow: var(--wx-card-shadow);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  background: var(--wx-tile-bg);
  border: 1px solid var(--wx-tile-border);
}

.preview-item span {
  color: var(--wx-text-muted);
  font-size: 12px;
}

.preview-item strong {
  color: var(--wx-text-strong);
  font-size: 15px;
}

.chart-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meteo-filter-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.meteo-filter-input {
  min-width: 180px;
}

.chart-card canvas {
  height: 290px !important;
}

@media (max-width: 900px) {
  .preview-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.weather-soil-gap-banner {
  background: #f0f4f8;
  color: #374151;
  border: 1px solid rgba(55, 65, 81, 0.12);
}
</style>

<style lang="scss">
.body--dark .field-weather-page {
  --wx-card-border: rgba(255, 255, 255, 0.12);
  --wx-card-bg: linear-gradient(180deg, rgba(48, 52, 64, 0.98), rgba(34, 37, 46, 0.96));
  --wx-card-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  --wx-tile-bg: rgba(255, 255, 255, 0.06);
  --wx-tile-border: rgba(255, 255, 255, 0.1);
  --wx-text-muted: rgba(255, 255, 255, 0.65);
  --wx-text-strong: rgba(255, 255, 255, 0.92);
  --wx-text-heading: rgba(255, 255, 255, 0.95);
  --wx-info-row: rgba(241, 245, 249, 0.88);
}

.body--dark .field-weather-page .weather-soil-gap-banner {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.12);
}

.body--dark .field-weather-page .bg-red-1 {
  background: rgba(127, 29, 29, 0.45) !important;
  color: #fecaca !important;
}
</style>
