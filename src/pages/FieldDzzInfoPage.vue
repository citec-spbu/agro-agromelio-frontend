<template>
  <div class="q-pa-md contour-info-container field-dzz-page">
    <q-card class="info-section">
      <q-card-section class="row items-center justify-between q-gutter-sm">
        <div>
          <div class="text-h6 text-weight-bold">ДЗЗ по полю</div>
          <div class="text-caption text-grey-7">
            Карта индекса, сравнение дат и контекст по культуре
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Данные обновляются автоматически раз в сутки.
          </div>
        </div>
        <q-btn
          no-caps
          color="primary"
          icon="refresh"
          label="Обновить данные"
          :loading="refreshLoading"
          @click="refreshDzzData"
        />
      </q-card-section>
      <q-separator />
      <q-card-section class="info-grid">
        <div class="info-grid-item">
          <span>Сезон</span>
          <strong>{{ fieldInfo.seasonName || "-" }}</strong>
        </div>
        <div class="info-grid-item">
          <span>Поле</span>
          <strong>{{ fieldInfo.fieldName || "-" }}</strong>
        </div>
        <div class="info-grid-item">
          <span>Последнее обновление</span>
          <strong>{{ summary ? formatDateTime(summary.generated_at) : "-" }}</strong>
        </div>
        <div class="info-grid-item">
          <span>Контур DZZ</span>
          <strong>{{ selectedContourLabel }}</strong>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md current-preview-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Контекст по культуре</div>
        <div class="text-caption text-grey-7">
          Данные берутся из севооборота по контурам поля
        </div>
      </q-card-section>
      <q-card-section v-if="cultureContext && cultureContext.contours && cultureContext.contours.length">
        <div class="culture-overview-row">
          <div class="culture-overview-card">
            <span>Контуров с культурой</span>
            <strong>{{ cultureContext.contours_with_culture }} из {{ cultureContext.total_contours }}</strong>
          </div>
          <div class="text-caption text-grey-7 culture-overview-text">
            Выберите карточку контура, чтобы построить карту, сцены и сравнение именно по нему.
          </div>
        </div>
        <div class="culture-grid q-mt-md">
          <div
            v-for="contour in cultureContext.contours"
            :key="contour.contour_id"
            class="culture-item culture-card"
            :class="{ active: contour.contour_id === selectedContourId }"
          >
            <div class="culture-card-head">
              <div class="culture-card-title">{{ contour.contour_name || contour.contour_id }}</div>
              <q-btn
                dense
                flat
                no-caps
                color="primary"
                label="Показать DZZ"
                @click="setSelectedContour(contour.contour_id)"
              />
            </div>
            <div class="culture-badge-row">
              <div class="culture-badge">{{ contour.culture }}</div>
              <div class="culture-badge culture-badge-secondary">{{ contour.cultivar }}</div>
            </div>
            <div class="culture-card-meta">
              <div><strong>Период:</strong> {{ formatDate(contour.start_date) }} - {{ formatDate(contour.end_date) }}</div>
              <div v-if="contour.description"><strong>Описание:</strong> {{ contour.description }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
      <q-card-section v-else>
        <div class="text-grey-7">
          Для контуров поля пока не найден актуальный контекст по культуре.
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div>
          <div class="text-subtitle1 text-weight-bold">Карта индекса внутри поля</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Выберите общий период, контур, индекс и сцену. Карта, каталог и сравнение считаются по выбранному контуру и периоду.
          </div>
        </div>
        <div class="text-caption text-grey-7" v-if="currentOverlay">
          Активный слой: {{ activeLayerLabel }}
        </div>
      </q-card-section>
      <q-card-section>
        <div v-if="dashboardLoading" class="section-loading q-mb-md">
          <q-spinner color="primary" size="26px" />
          <div class="text-grey-7">Обновляем ДЗЗ-данные для выбранного периода...</div>
        </div>
        <div class="controls-grid">
          <q-input
            v-model="dateFrom"
            dense
            outlined
            stack-label
            type="date"
            label="Дата начала"
            @update:model-value="handlePeriodChange"
          />
          <q-input
            v-model="dateTo"
            dense
            outlined
            stack-label
            type="date"
            label="Дата окончания"
            @update:model-value="handlePeriodChange"
          />
          <q-select
            v-model="selectedContourId"
            dense
            outlined
            emit-value
            map-options
            label="Контур DZZ"
            :options="contourOptions"
            @update:model-value="handleContourChange"
          />
          <q-select
            v-model="selectedIndex"
            dense
            outlined
            emit-value
            map-options
            label="Индекс"
            :options="indexOptions"
            @update:model-value="handleIndexChange"
          />
          <q-select
            v-model="sceneIdA"
            dense
            outlined
            emit-value
            map-options
            label="Дата A"
            :options="sceneOptions"
            @update:model-value="handleSceneAChange"
          />
          <q-select
            v-model="sceneIdB"
            dense
            outlined
            emit-value
            map-options
            label="Дата B"
            :options="compareSceneOptions"
            :disable="!compareSceneOptions.length"
            @update:model-value="handleSceneBChange"
          />
          <div class="compare-toggle">
            <q-toggle
              v-model="compareEnabled"
              color="primary"
              label="Сравнение двух дат"
              @update:model-value="handleCompareToggle"
            />
            <div class="text-caption text-grey-7">
              {{ compareHint }}
            </div>
          </div>
        </div>

        <div v-if="compareEnabled" class="q-mt-md">
          <q-btn-toggle
            v-model="compareLayerMode"
            unelevated
            no-caps
            spread
            toggle-color="primary"
            :color="compareToggleBg"
            :text-color="compareToggleFg"
            :options="compareLayerOptions"
            @update:model-value="applyCurrentOverlay"
          />
        </div>

        <div class="map-shell q-mt-md">
          <div v-if="mapLoading || compareLoading" class="map-loading">
            <q-spinner color="primary" size="32px" />
            <div class="q-mt-sm text-grey-7">
              {{ compareEnabled ? "Загрузка сравнения сцен..." : "Загрузка карты индекса..." }}
            </div>
          </div>
          <div id="dzz-field-map"></div>
          <div v-if="!currentOverlay && !mapLoading && !compareLoading" class="map-empty-state">
            <div class="chart-empty-title">Нет растра для отображения</div>
            <div class="chart-empty-text">
              Выберите сцену из каталога или обновите ДЗЗ-данные.
            </div>
          </div>
        </div>

        <div v-if="currentOverlay" class="legend-section q-mt-md">
          <div class="legend-top">
            <div>
              <strong>{{ legendTitle }}</strong>
            </div>
            <div class="text-caption text-grey-7">
              Диапазон: {{ formatLegendValue(currentOverlay.display_min) }} - {{ formatLegendValue(currentOverlay.display_max) }}
            </div>
          </div>
          <div class="legend-bar" :class="{ diff: currentOverlay.mode === 'diff' }"></div>
          <div class="legend-help text-caption text-grey-7 q-mt-sm">
            {{ legendInterpretation }}
          </div>
          <div class="legend-stats">
            <span>Факт. минимум: {{ formatLegendValue(currentOverlay.actual_min) }}</span>
            <span>Среднее: {{ formatLegendValue(currentOverlay.mean_value) }}</span>
            <span>Факт. максимум: {{ formatLegendValue(currentOverlay.actual_max) }}</span>
          </div>
        </div>

        <q-banner v-if="mapError" class="q-mt-md bg-red-1 text-negative">
          Ошибка карты индекса: {{ extractErrorMessage(mapError) }}
        </q-banner>
        <q-banner v-if="compareError" class="q-mt-md bg-orange-1 text-warning">
          Ошибка сравнения дат: {{ extractErrorMessage(compareError) }}
        </q-banner>
      </q-card-section>
    </q-card>

    <q-card v-if="compareEnabled && compareData" class="q-mt-md current-preview-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Сравнение двух дат</div>
        <div class="text-caption text-grey-7">
          Дельта считается как дата B минус дата A
        </div>
      </q-card-section>
      <q-card-section>
        <div class="preview-grid">
          <div class="preview-item">
            <span>Дата A</span>
            <strong>{{ formatDate(compareData.scene_a.scene_date) }}</strong>
          </div>
          <div class="preview-item">
            <span>Дата B</span>
            <strong>{{ formatDate(compareData.scene_b.scene_date) }}</strong>
          </div>
          <div class="preview-item">
            <span>Индекс</span>
            <strong>{{ selectedIndex.toUpperCase() }}</strong>
          </div>
          <div class="preview-item">
            <span>Среднее A</span>
            <strong>{{ formatIndex(compareData.summary.mean_a) }}</strong>
          </div>
          <div class="preview-item">
            <span>Среднее B</span>
            <strong>{{ formatIndex(compareData.summary.mean_b) }}</strong>
          </div>
          <div class="preview-item">
            <span>Средняя дельта</span>
            <strong>{{ formatIndex(compareData.summary.mean_delta) }}</strong>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="summary" class="current-preview-card q-mt-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Текущее превью по контуру</div>
        <div class="preview-grid">
          <div class="preview-item">
            <span>Последняя сцена</span>
            <strong>{{ formatDate(summary.latest_scene_date) }}</strong>
          </div>
          <div class="preview-item">
            <span>Сенсор</span>
            <strong>{{ summary.latest_sensor || "-" }}</strong>
          </div>
          <div class="preview-item">
            <span>Облачность</span>
            <strong>{{ formatPercent(summary.latest_cloud_cover) }}</strong>
          </div>
          <div class="preview-item">
            <span>NDVI</span>
            <strong>{{ formatIndex(summary.latest_ndvi) }}</strong>
          </div>
          <div class="preview-item">
            <span>NDWI</span>
            <strong>{{ formatIndex(summary.latest_ndwi) }}</strong>
          </div>
          <div class="preview-item">
            <span>MSAVI</span>
            <strong>{{ formatIndex(summary.latest_msavi) }}</strong>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Временной ряд индексов</div>
        <div class="text-caption text-grey-7">
          Показан временной ряд только за выбранный период и контур.
        </div>
      </q-card-section>
      <q-card-section>
        <div v-if="dashboardLoading" class="chart-empty-state">
          <q-spinner color="primary" size="30px" />
          <div class="chart-empty-title q-mt-md">Загружаем временной ряд</div>
          <div class="chart-empty-text">Обновляем график под новый выбранный период.</div>
        </div>
        <div v-else-if="!timeseries.length" class="chart-empty-state">
          <div class="chart-empty-title">Нет данных для графика</div>
          <div class="chart-empty-text">
            Для выбранного поля пока нет рассчитанных наблюдений ДЗЗ.
          </div>
        </div>
        <canvas v-else id="dzz-chart"></canvas>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md chart-card">
      <q-card-section class="chart-header-row">
        <div class="text-subtitle1 text-weight-bold">Каталог сцен по контуру</div>
        <div class="text-caption text-grey-7">Всего сцен за период: {{ catalog.length }}</div>
      </q-card-section>
      <q-card-section>
        <div v-if="dashboardLoading" class="chart-empty-state catalog-loading-state">
          <q-spinner color="primary" size="30px" />
          <div class="chart-empty-title q-mt-md">Загружаем каталог сцен</div>
          <div class="chart-empty-text">Подбираем сцены для нового периода и выбранного контура.</div>
        </div>
        <div v-else-if="catalog.length" class="catalog-grid">
          <div
            v-for="scene in sortedCatalog"
            :key="scene.scene_id"
            class="catalog-item"
            :class="{
              selectedA: scene.scene_id === sceneIdA,
              selectedB: scene.scene_id === sceneIdB,
            }"
          >
            <div><strong>Дата:</strong> {{ formatDate(scene.scene_date) }}</div>
            <div><strong>Сенсор:</strong> {{ scene.sensor }}</div>
            <div><strong>Коллекция:</strong> {{ scene.collection }}</div>
            <div><strong>Облачность:</strong> {{ formatPercent(scene.cloud_cover) }}</div>
            <div class="scene-id"><strong>Scene ID:</strong> {{ scene.scene_id }}</div>
            <div class="catalog-actions">
              <q-btn dense flat no-caps color="primary" label="Выбрать как A" @click="selectSceneA(scene.scene_id)" />
              <q-btn dense flat no-caps color="secondary" label="Выбрать как B" @click="selectSceneB(scene.scene_id)" />
            </div>
          </div>
        </div>
        <div v-else class="text-grey-7">Сцены не найдены.</div>
      </q-card-section>
    </q-card>

    <q-banner v-if="dzzError" class="q-mt-md bg-red-1 text-negative">
      Ошибка при получении ДЗЗ-данных: {{ extractErrorMessage(dzzError) }}
    </q-banner>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import axios from "axios";
import { useRoute } from "vue-router";
import { useQuasar } from "quasar";
import { Chart, registerables } from "chart.js";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { userStore } from "src/usage";

const DEFAULT_PERIOD_DAYS = 45;
const indexOptions = [
  { label: "NDVI", value: "ndvi" },
  { label: "EVI", value: "evi" },
  { label: "NDWI", value: "ndwi" },
  { label: "MSAVI", value: "msavi" },
];
const compareLayerOptions = [
  { label: "Дата A", value: "sceneA" },
  { label: "Дата B", value: "sceneB" },
  { label: "Разница", value: "diff" },
];

Chart.register(...registerables);

const padDatePart = (value) => String(value).padStart(2, "0");

const toIsoDate = (raw) => {
  const date = new Date(raw);
  date.setHours(0, 0, 0, 0);
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const buildDefaultPeriod = () => {
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateTo.getDate() - DEFAULT_PERIOD_DAYS);
  return {
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  };
};

export default {
  name: "FieldDzzInfoPage",
  setup() {
    const $q = useQuasar();
    const route = useRoute();

    const seasonName = ref(route.query.seasonName || "");
    const seasonId = ref(route.query.seasonId || "");
    const fieldName = ref(route.query.fieldName || "");
    const fieldId = ref(route.query.fieldId || "");
    const accessToken = computed(() => userStore.state.access_token);
    const defaultPeriod = buildDefaultPeriod();
    const dateFrom = ref(route.query.dateFrom || defaultPeriod.dateFrom);
    const dateTo = ref(route.query.dateTo || defaultPeriod.dateTo);

    const fieldInfo = ref({
      fieldId: fieldId.value,
      fieldName: fieldName.value,
      seasonName: seasonName.value,
    });

    const summary = ref(null);
    const cultureContext = ref(null);
    const catalog = ref([]);
    const timeseries = ref([]);
    const contours = ref([]);
    const selectedContourId = ref(route.query.contourId || "");
    const dzzError = ref(null);
    const mapError = ref(null);
    const compareError = ref(null);
    const dzzChart = ref(null);
    const dzzMap = ref(null);
    const contourGroup = ref(null);
    const rasterLayer = ref(null);
    const refreshLoading = ref(false);
    const dashboardLoading = ref(false);
    const mapLoading = ref(false);
    const compareLoading = ref(false);
    const indexMapData = ref(null);
    const compareData = ref(null);
    const selectedIndex = ref("ndvi");
    const sceneIdA = ref("");
    const sceneIdB = ref("");
    const compareEnabled = ref(false);
    const compareLayerMode = ref("diff");

    const formatDate = (raw) => {
      if (!raw) return "-";
      return new Date(raw).toLocaleDateString("ru-RU");
    };

    const formatDateTime = (raw) => {
      if (!raw) return "-";
      return new Date(raw).toLocaleString("ru-RU");
    };

    const formatPercent = (value) => {
      if (value === null || value === undefined) return "-";
      return `${Number(value).toFixed(1)} %`;
    };

    const formatIndex = (value) => {
      if (value === null || value === undefined) return "-";
      return Number(value).toFixed(3);
    };

    const formatLegendValue = (value) => {
      if (value === null || value === undefined) return "-";
      return Number(value).toFixed(3);
    };

    const extractErrorMessage = (error) => {
      if (!error) return "Неизвестная ошибка";
      if (typeof error === "string") {
        const titleMatch = error.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          return `Ошибка сервиса ДЗЗ: ${titleMatch[1].trim()}`;
        }
        return error.trim() || "Неизвестная ошибка";
      }
      if (Array.isArray(error.errors) && error.errors.length) {
        const firstError = error.errors[0];
        return firstError.description || firstError.title || "Неизвестная ошибка";
      }
      if (typeof error.data === "string" && error.data.trim()) {
        return extractErrorMessage(error.data);
      }
      if (error.detail) return error.detail;
      if (error.message) return error.message;
      if (error.status) {
        return `Сервис ДЗЗ вернул ошибку ${error.status}.`;
      }
      return "Неизвестная ошибка";
    };

    const toClientErrorPayload = (error) => {
      if (error?.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          detail:
            typeof error.response.data === "object" && error.response.data !== null
              ? error.response.data.detail
              : undefined,
          errors:
            typeof error.response.data === "object" && error.response.data !== null
              ? error.response.data.errors
              : undefined,
          message: error.message,
        };
      }
      return {
        message: error?.message || "Неизвестная ошибка",
      };
    };

    const requestConfig = (extraParams = {}) => {
      const params = seasonId.value ? { seasonId: seasonId.value, ...extraParams } : { ...extraParams };
      if (selectedContourId.value) {
        params.contourId = selectedContourId.value;
      }
      if (dateFrom.value) {
        params.dateFrom = dateFrom.value;
      }
      if (dateTo.value) {
        params.dateTo = dateTo.value;
      }
      const headers = {
        "Content-Type": "application/json",
      };
      if (accessToken.value) {
        headers.Authorization = `Bearer ${accessToken.value}`;
      }
      return { params, headers };
    };

    const buildDzzChartOptions = () => {
      const dark = $q.dark.isActive;
      const tickColor = dark ? "#94a3b8" : "#5d7394";
      const legendColor = dark ? "#e2e8f0" : "#415778";
      const gridColor = dark ? "rgba(148, 163, 184, 0.14)" : "rgba(78, 105, 146, 0.12)";
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        elements: {
          point: {
            radius: 3.2,
            hoverRadius: 5,
          },
          line: {
            borderWidth: 3,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: legendColor,
              filter(legendItem, chartData) {
                const dataset = chartData.datasets[legendItem.datasetIndex];
                return dataset && dataset.label !== "Нет данных";
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 12,
              color: tickColor,
            },
            grid: {
              color: gridColor,
            },
          },
          y: {
            min: -1,
            max: 1,
            ticks: {
              color: tickColor,
            },
            grid: {
              color: gridColor,
            },
          },
        },
      };
    };

    const compareToggleBg = computed(() => ($q.dark.isActive ? "grey-9" : "white"));
    const compareToggleFg = computed(() => ($q.dark.isActive ? "grey-2" : "primary"));

    const sortedCatalog = computed(() => [...catalog.value].reverse());

    const sceneOptions = computed(() =>
      sortedCatalog.value.map((scene) => ({
        label: `${formatDate(scene.scene_date)} | ${scene.sensor} | ${formatPercent(scene.cloud_cover)}`,
        value: scene.scene_id,
      }))
    );

    const contourOptions = computed(() => {
      const options = contours.value
        .filter((contour) => contour.id)
        .map((contour) => ({
          label: contour.name || contour.id,
          value: contour.id,
        }));

      if (options.length > 1) {
        return [{ label: "Все контуры поля", value: "" }, ...options];
      }

      return options;
    });

    const selectedContourLabel = computed(() => {
      if (!selectedContourId.value) {
        return "Все контуры поля";
      }
      const selectedContour = contours.value.find((contour) => contour.id === selectedContourId.value);
      return selectedContour ? selectedContour.name || selectedContour.id : "Контур не выбран";
    });

    const compareSceneOptions = computed(() => {
      const primaryScene = catalog.value.find((scene) => scene.scene_id === sceneIdA.value);
      const pool = primaryScene
        ? sortedCatalog.value.filter(
            (scene) => scene.scene_id !== sceneIdA.value && scene.sensor === primaryScene.sensor
          )
        : sortedCatalog.value.filter((scene) => scene.scene_id !== sceneIdA.value);
      return pool.map((scene) => ({
        label: `${formatDate(scene.scene_date)} | ${scene.sensor} | ${formatPercent(scene.cloud_cover)}`,
        value: scene.scene_id,
      }));
    });

    const currentOverlay = computed(() => {
      if (compareEnabled.value && compareData.value) {
        if (compareLayerMode.value === "sceneA") return compareData.value.overlay_a;
        if (compareLayerMode.value === "sceneB") return compareData.value.overlay_b;
        return compareData.value.diff_overlay;
      }
      return indexMapData.value ? indexMapData.value.overlay : null;
    });

    const activeLayerLabel = computed(() => {
      const overlay = currentOverlay.value;
      if (!overlay) return "-";
      const prefix = compareEnabled.value
        ? compareLayerMode.value === "diff"
          ? "Разница"
          : compareLayerMode.value === "sceneA"
            ? "Дата A"
            : "Дата B"
        : "Карта";
      return `${selectedContourLabel.value} / ${prefix}: ${formatDate(overlay.scene_date)} / ${overlay.index_name.toUpperCase()}`;
    });

    const legendTitle = computed(() => {
      if (!currentOverlay.value) return "Легенда";
      return currentOverlay.value.mode === "diff"
        ? `Дельта ${selectedIndex.value.toUpperCase()}`
        : `${selectedIndex.value.toUpperCase()} по полю`;
    });

    const compareHint = computed(() => {
      if (!sceneIdA.value) return "Сначала выберите основную сцену.";
      if (!compareSceneOptions.value.length) {
        return "Для выбранной сцены нет пары с тем же сенсором.";
      }
      if (!sceneIdB.value) return "Выберите вторую дату для сравнения.";
      return "Слой разницы показывает B минус A.";
    });

    const legendInterpretation = computed(() => {
      const overlay = currentOverlay.value;
      if (!overlay) return "";

      if (overlay.mode === "diff") {
        if (selectedIndex.value === "ndwi") {
          return "Красные зоны означают, что на дате B влажность ниже, чем на дате A. Светлые оттенки показывают слабые изменения, а синие зоны означают рост влажности на дате B относительно даты A.";
        }
        return "Красные зоны означают, что на дате B индекс ниже, чем на дате A. Светлые оттенки показывают слабые изменения, а синие зоны означают рост индекса на дате B относительно даты A.";
      }

      if (selectedIndex.value === "ndwi") {
        return "Слева показаны более низкие значения влажности, справа более высокие. Чем цвет ближе к зеленому краю шкалы, тем выше водный сигнал или увлажненность поверхности.";
      }

      return "Слева показаны более низкие значения индекса, справа более высокие. Для NDVI, EVI и MSAVI сдвиг к зеленому краю шкалы обычно означает более активную и плотную растительность.";
    });

    const destroyChart = () => {
      if (dzzChart.value) {
        dzzChart.value.destroy();
      }
      dzzChart.value = null;
    };

    const validatePeriod = () => {
      if (!dateFrom.value || !dateTo.value) {
        return true;
      }
      if (dateFrom.value <= dateTo.value) {
        return true;
      }
      dzzError.value = { message: "Дата начала периода не должна быть больше даты окончания." };
      return false;
    };

    const buildChartSeries = () => {
      if (!timeseries.value.length) {
        return null;
      }

      const labels = timeseries.value.map((item) => formatDate(item.date));
      const ndviValues = timeseries.value.map((item) => item.ndvi);
      const eviValues = timeseries.value.map((item) => item.evi);
      const ndwiValues = timeseries.value.map((item) => item.ndwi);
      const msaviValues = timeseries.value.map((item) => item.msavi);

      return {
        labels,
        ndviValues,
        eviValues,
        ndwiValues,
        msaviValues,
      };
    };

    const buildChart = () => {
      destroyChart();
      if (!timeseries.value.length) {
        return;
      }

      const canvas = document.getElementById("dzz-chart");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const chartSeries = buildChartSeries();
      if (!chartSeries) return;

      dzzChart.value = new Chart(ctx, {
        type: "line",
        data: {
          labels: chartSeries.labels,
          datasets: [
            {
              label: "NDVI",
              data: chartSeries.ndviValues,
              borderColor: "#2f6fdd",
              backgroundColor: "rgba(47, 111, 221, 0.12)",
              tension: 0.28,
              spanGaps: false,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              cubicInterpolationMode: "monotone",
            },
            {
              label: "EVI",
              data: chartSeries.eviValues,
              borderColor: "#17b26a",
              backgroundColor: "rgba(23, 178, 106, 0.12)",
              tension: 0.28,
              spanGaps: false,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              cubicInterpolationMode: "monotone",
            },
            {
              label: "NDWI",
              data: chartSeries.ndwiValues,
              borderColor: "#8b5cf6",
              backgroundColor: "rgba(139, 92, 246, 0.12)",
              tension: 0.28,
              spanGaps: false,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              cubicInterpolationMode: "monotone",
            },
            {
              label: "MSAVI",
              data: chartSeries.msaviValues,
              borderColor: "#f79009",
              backgroundColor: "rgba(247, 144, 9, 0.12)",
              tension: 0.28,
              spanGaps: false,
              pointRadius: 4,
              pointHoverRadius: 5,
              pointBorderWidth: 1.5,
              cubicInterpolationMode: "monotone",
            },
            {
              label: "Нет данных",
              data: new Array(timeseries.value.length).fill(null),
              type: "scatter",
              showLine: false,
              pointRadius: 1.5,
              pointHoverRadius: 2,
              pointBackgroundColor: "rgba(148, 163, 184, 0.18)",
              pointBorderColor: "rgba(148, 163, 184, 0.24)",
              pointBorderWidth: 0.8,
            },
          ],
        },
        options: buildDzzChartOptions(),
      });
    };

    const findFallbackSceneB = (primaryId, scenes) => {
      const sourceScenes = scenes || catalog.value;
      const primaryScene = sourceScenes.find((scene) => scene.scene_id === primaryId);
      if (!primaryScene) {
        const firstAlternative = [...sourceScenes].reverse().find((scene) => scene.scene_id !== primaryId);
        return firstAlternative ? firstAlternative.scene_id : "";
      }
      const sameSensorAlternative = [...sourceScenes]
        .reverse()
        .find(
          (scene) => scene.scene_id !== primaryId && scene.sensor === primaryScene.sensor
        );
      return sameSensorAlternative ? sameSensorAlternative.scene_id : "";
    };

    const applyDashboardData = (dashboard) => {
      summary.value = dashboard.summary || null;
      cultureContext.value = dashboard.culture_context || null;
      catalog.value = dashboard.catalog || [];
      timeseries.value = dashboard.timeseries || [];
      if (!catalog.value.some((scene) => scene.scene_id === sceneIdA.value)) {
        sceneIdA.value = sortedCatalog.value[0] ? sortedCatalog.value[0].scene_id : "";
      }
      if (
        !catalog.value.some((scene) => scene.scene_id === sceneIdB.value) ||
        sceneIdB.value === sceneIdA.value
      ) {
        sceneIdB.value = findFallbackSceneB(sceneIdA.value, catalog.value);
      }
      dzzError.value = null;
      setTimeout(buildChart, 0);
    };

    let activeDashboardRequestId = 0;
    const nextDashboardRequestId = () => {
      activeDashboardRequestId += 1;
      return activeDashboardRequestId;
    };
    const isActiveDashboardRequest = (requestId) => requestId === activeDashboardRequestId;

    const ensureMap = async () => {
      await nextTick();
      if (dzzMap.value) {
        return;
      }
      const container = document.getElementById("dzz-field-map");
      if (!container) {
        return;
      }
      dzzMap.value = L.map(container, {
        zoomControl: true,
      }).setView([55.751244, 37.618423], 10);
      if (dzzMap.value.attributionControl) {
        dzzMap.value.attributionControl.setPrefix("");
      }
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(dzzMap.value);
    };

    const renderContours = () => {
      if (!dzzMap.value) return;
      if (contourGroup.value) {
        contourGroup.value.remove();
        contourGroup.value = null;
      }
      if (!contours.value.length) return;

      const layers = contours.value
        .filter((contour) => Array.isArray(contour.coordinates) && contour.coordinates.length)
        .map((contour) => {
          const isActive = !!selectedContourId.value && contour.id === selectedContourId.value;

          return {
            contourId: contour.id,
            layer: L.polygon(
              contour.coordinates.map((coord) => [coord.latitude, coord.longitude]),
              {
                color: isActive ? "#1d4ed8" : "#8ca0bf",
                weight: isActive ? 3 : 2,
                fillOpacity: isActive ? 0.11 : 0.04,
                dashArray: selectedContourId.value && !isActive ? "6 6" : undefined,
              }
            ),
          };
        });

      if (!layers.length) return;
      contourGroup.value = L.featureGroup(layers.map((item) => item.layer)).addTo(dzzMap.value);
      const activeLayer = layers.find((item) => item.contourId === selectedContourId.value)?.layer;
      dzzMap.value.fitBounds((activeLayer || contourGroup.value).getBounds(), {
        padding: [20, 20],
      });
    };

    const renderOverlay = (overlay) => {
      if (!dzzMap.value) return;
      if (rasterLayer.value) {
        rasterLayer.value.remove();
        rasterLayer.value = null;
      }
      if (!overlay || !overlay.image_url || !overlay.bounds) return;
      rasterLayer.value = L.imageOverlay(overlay.image_url, overlay.bounds, {
        opacity: 0.82,
      }).addTo(dzzMap.value);
    };

    const applyCurrentOverlay = async () => {
      await ensureMap();
      renderContours();
      renderOverlay(currentOverlay.value);
      if (dzzMap.value) {
        setTimeout(() => {
          dzzMap.value.invalidateSize();
        }, 0);
      }
    };

    const fetchFieldContours = async () => {
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/fields-service/fields/${fieldId.value}/contours`,
          requestConfig()
        );
        contours.value = response.data || [];
        if (
          selectedContourId.value &&
          !contours.value.some((contour) => contour.id === selectedContourId.value)
        ) {
          selectedContourId.value = "";
        }
        if (!selectedContourId.value && contours.value.length) {
          selectedContourId.value = contours.value[0].id || "";
        }
        mapError.value = null;
      } catch (error) {
        mapError.value = toClientErrorPayload(error);
      }
    };

    const fetchDzzData = async (requestId = nextDashboardRequestId()) => {
      if (!validatePeriod()) {
        if (isActiveDashboardRequest(requestId)) {
          dashboardLoading.value = false;
        }
        catalog.value = [];
        timeseries.value = [];
        summary.value = null;
        indexMapData.value = null;
        compareData.value = null;
        destroyChart();
        return;
      }
      if (isActiveDashboardRequest(requestId)) {
        dashboardLoading.value = true;
        dzzError.value = null;
      }
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/dzz/${fieldId.value}`,
          requestConfig()
        );
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        applyDashboardData(response.data);
        dzzError.value = null;
      } catch (error) {
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        dzzError.value = toClientErrorPayload(error);
      } finally {
        if (isActiveDashboardRequest(requestId)) {
          dashboardLoading.value = false;
        }
      }
    };

    const loadIndexMap = async (requestId = activeDashboardRequestId) => {
      if (!sceneIdA.value) {
        indexMapData.value = null;
        await applyCurrentOverlay();
        return;
      }

      mapLoading.value = true;
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/dzz/${fieldId.value}/index-map`,
          requestConfig({
            sceneId: sceneIdA.value,
            index: selectedIndex.value,
          })
        );
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        indexMapData.value = response.data;
        mapError.value = null;
      } catch (error) {
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        indexMapData.value = null;
        mapError.value = toClientErrorPayload(error);
      } finally {
        if (isActiveDashboardRequest(requestId)) {
          mapLoading.value = false;
        }
      }
    };

    const loadCompareData = async (requestId = activeDashboardRequestId) => {
      if (!compareEnabled.value || !sceneIdA.value || !sceneIdB.value) {
        compareData.value = null;
        compareError.value = null;
        await applyCurrentOverlay();
        return;
      }

      compareLoading.value = true;
      try {
        const response = await axios.get(
          `${process.env.VUE_APP_BASE_URL}/api/dzz/${fieldId.value}/compare`,
          requestConfig({
            sceneIdA: sceneIdA.value,
            sceneIdB: sceneIdB.value,
            index: selectedIndex.value,
          })
        );
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        compareData.value = response.data;
        compareError.value = null;
      } catch (error) {
        if (!isActiveDashboardRequest(requestId)) {
          return;
        }
        compareData.value = null;
        compareError.value = toClientErrorPayload(error);
      } finally {
        if (isActiveDashboardRequest(requestId)) {
          compareLoading.value = false;
        }
      }
    };

    const refreshDzzData = async () => {
      if (!validatePeriod()) {
        return;
      }
      refreshLoading.value = true;
      try {
        const response = await axios.post(
          `${process.env.VUE_APP_BASE_URL}/api/dzz/${fieldId.value}/refresh`,
          null,
          requestConfig()
        );
        applyDashboardData(response.data);
        await loadIndexMap();
        await loadCompareData();
        await applyCurrentOverlay();
        $q.notify({
          type: "positive",
          message: "Свежие ДЗЗ-данные загружены",
        });
      } catch (error) {
        dzzError.value = toClientErrorPayload(error);
        $q.notify({
          type: "negative",
          message: extractErrorMessage(toClientErrorPayload(error)),
        });
      } finally {
        refreshLoading.value = false;
      }
    };

    const handlePeriodChange = async () => {
      if (!validatePeriod()) {
        return;
      }
      const requestId = nextDashboardRequestId();
      mapError.value = null;
      compareError.value = null;
      await fetchDzzData(requestId);
      await loadIndexMap(requestId);
      await loadCompareData(requestId);
      await applyCurrentOverlay();
    };

    const handleContourChange = async () => {
      const requestId = nextDashboardRequestId();
      sceneIdA.value = "";
      sceneIdB.value = "";
      compareEnabled.value = false;
      compareData.value = null;
      compareError.value = null;
      indexMapData.value = null;
      await fetchDzzData(requestId);
      await loadIndexMap(requestId);
      await loadCompareData(requestId);
      await applyCurrentOverlay();
    };

    const handleIndexChange = async () => {
      await loadIndexMap();
      await loadCompareData();
      await applyCurrentOverlay();
    };

    const handleSceneAChange = async () => {
      if (!sceneIdA.value) {
        return;
      }
      if (!sceneIdB.value || sceneIdB.value === sceneIdA.value) {
        sceneIdB.value = findFallbackSceneB(sceneIdA.value, catalog.value);
      }
      if (compareEnabled.value && !sceneIdB.value) {
        compareEnabled.value = false;
      }
      await loadIndexMap();
      await loadCompareData();
      await applyCurrentOverlay();
    };

    const handleSceneBChange = async () => {
      if (compareEnabled.value && sceneIdB.value === sceneIdA.value) {
        sceneIdB.value = findFallbackSceneB(sceneIdA.value, catalog.value);
      }
      await loadCompareData();
      await applyCurrentOverlay();
    };

    const handleCompareToggle = async (enabled) => {
      if (enabled && !sceneIdB.value) {
        sceneIdB.value = findFallbackSceneB(sceneIdA.value, catalog.value);
      }
      if (enabled && !sceneIdB.value) {
        compareEnabled.value = false;
        compareError.value = { message: "Нет доступной второй сцены для сравнения." };
      } else {
        compareEnabled.value = enabled;
      }
      await loadCompareData();
      await applyCurrentOverlay();
    };

    const selectSceneA = async (sceneId) => {
      sceneIdA.value = sceneId;
      await handleSceneAChange();
    };

    const selectSceneB = async (sceneId) => {
      sceneIdB.value = sceneId;
      compareEnabled.value = true;
      await handleSceneBChange();
    };

    const setSelectedContour = async (contourId) => {
      if (selectedContourId.value === contourId) {
        return;
      }
      selectedContourId.value = contourId;
      await handleContourChange();
    };

    const destroyMap = () => {
      if (rasterLayer.value) {
        rasterLayer.value.remove();
        rasterLayer.value = null;
      }
      if (contourGroup.value) {
        contourGroup.value.remove();
        contourGroup.value = null;
      }
      if (dzzMap.value) {
        dzzMap.value.remove();
        dzzMap.value = null;
      }
    };

    onMounted(async () => {
      const requestId = nextDashboardRequestId();
      await fetchFieldContours();
      await fetchDzzData(requestId);
      await ensureMap();
      renderContours();
      await loadIndexMap(requestId);
      await applyCurrentOverlay();
    });

    onBeforeUnmount(() => {
      destroyChart();
      destroyMap();
    });

    watch(
      () => $q.dark.isActive,
      () => {
        if (timeseries.value.length) {
          setTimeout(buildChart, 0);
        }
      }
    );

    return {
      fieldInfo,
      summary,
      cultureContext,
      catalog,
      sortedCatalog,
      timeseries,
      dzzError,
      mapError,
      compareError,
      refreshLoading,
      dashboardLoading,
      mapLoading,
      compareLoading,
      dateFrom,
      dateTo,
      selectedIndex,
      sceneIdA,
      sceneIdB,
      compareEnabled,
      compareLayerMode,
      compareLayerOptions,
      compareToggleBg,
      compareToggleFg,
      currentOverlay,
      indexOptions,
      sceneOptions,
      compareSceneOptions,
      contourOptions,
      selectedContourId,
      selectedContourLabel,
      activeLayerLabel,
      legendTitle,
      legendInterpretation,
      compareHint,
      compareData,
      refreshDzzData,
      handlePeriodChange,
      handleIndexChange,
      handleSceneAChange,
      handleSceneBChange,
      handleContourChange,
      handleCompareToggle,
      selectSceneA,
      selectSceneB,
      setSelectedContour,
      applyCurrentOverlay,
      formatDate,
      formatDateTime,
      formatPercent,
      formatIndex,
      formatLegendValue,
      extractErrorMessage,
    };
  },
};
</script>

<style scoped>
.field-dzz-page {
  --dzz-card-border: #e3ebf7;
  --dzz-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(247, 251, 255, 0.92));
  --dzz-card-shadow: 0 10px 22px rgba(19, 36, 58, 0.08);
  --dzz-tile-bg: #f7faff;
  --dzz-tile-border: #e3ebf7;
  --dzz-text-muted: #6a7d99;
  --dzz-text-strong: #2a3f5b;
  --dzz-text-heading: #1e2a3d;
  --dzz-section-loading-border: #d9e6fb;
  --dzz-section-loading-bg: linear-gradient(180deg, #f8fbff, #f2f7ff);
  --dzz-map-shell-border: #d8e2f0;
  --dzz-map-shell-bg: linear-gradient(180deg, #f8fbff, #f3f7fd);
  --dzz-map-loading-bg: rgba(248, 251, 255, 0.82);
  --dzz-legend-bg: #fbfdff;
  --dzz-culture-overview-bg: linear-gradient(180deg, #f4f8ff, #eef4ff);
  --dzz-culture-overview-border: #d9e6fb;
  --dzz-culture-title: #22364f;
  --dzz-culture-badge-bg: #e9f2ff;
  --dzz-culture-badge-fg: #24456b;
  --dzz-culture-badge-2-bg: #eef3fb;
  --dzz-culture-badge-2-fg: #556b8a;
  --dzz-culture-meta: #314862;
  --dzz-culture-active-border: #2f6fdd;
  --dzz-culture-active-bg: linear-gradient(180deg, #f6f9ff, #edf4ff);
  --dzz-empty-border: #d8e2f0;
  --dzz-empty-bg: linear-gradient(180deg, #f8fbff, #f3f7fd);
  --dzz-catalog-selected-b-bg: #fff9f0;
  --dzz-catalog-selected-b-border: #f79009;
}

.field-dzz-page :deep(.text-grey-7) {
  color: var(--dzz-text-muted) !important;
}

.field-dzz-page :deep(.text-h6),
.field-dzz-page :deep(.text-subtitle1) {
  color: var(--dzz-text-heading);
}

.contour-info-container {
  max-width: 1240px;
  margin: 0 auto;
}

.info-section,
.current-preview-card,
.chart-card {
  border-radius: 14px;
  border: 1px solid var(--dzz-card-border);
  background: var(--dzz-card-bg);
  box-shadow: var(--dzz-card-shadow);
}

.info-grid,
.preview-grid,
.catalog-grid,
.culture-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.info-grid-item,
.preview-item,
.catalog-item,
.culture-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  background: var(--dzz-tile-bg);
  border: 1px solid var(--dzz-tile-border);
}

.info-grid-item span,
.preview-item span,
.culture-chip span {
  color: var(--dzz-text-muted);
  font-size: 12px;
}

.info-grid-item strong,
.preview-item strong,
.culture-chip strong {
  color: var(--dzz-text-strong);
  font-size: 15px;
}

.chart-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
}

.section-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--dzz-section-loading-border);
  background: var(--dzz-section-loading-bg);
}

.compare-toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 56px;
  grid-column: span 2;
}

.map-shell {
  position: relative;
  min-height: 430px;
  border: 1px solid var(--dzz-map-shell-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--dzz-map-shell-bg);
}

#dzz-field-map {
  height: 430px;
  width: 100%;
}

.map-loading {
  position: absolute;
  inset: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--dzz-map-loading-bg);
}

.map-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  pointer-events: none;
}

.legend-section {
  padding: 14px 16px;
  border: 1px solid var(--dzz-card-border);
  border-radius: 14px;
  background: var(--dzz-legend-bg);
}

.legend-section strong {
  color: var(--dzz-text-strong);
}

.legend-stats span {
  color: var(--dzz-text-muted);
}

.legend-top,
.legend-stats,
.culture-overview-row,
.catalog-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.legend-bar {
  height: 14px;
  border-radius: 999px;
  margin-top: 10px;
  background: linear-gradient(90deg, #7e2d11, #bd631f, #ebbc43, #7cb342, #236b35);
}

.legend-bar.diff {
  background: linear-gradient(90deg, #b3261e, #f9e0db, #2657a8);
}

.legend-help {
  line-height: 1.45;
}

.culture-overview-card {
  min-width: 220px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--dzz-culture-overview-bg);
  border: 1px solid var(--dzz-culture-overview-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.culture-overview-card span {
  color: var(--dzz-text-muted);
  font-size: 12px;
}

.culture-overview-card strong {
  color: var(--dzz-text-strong);
  font-size: 15px;
}

.culture-overview-text {
  max-width: 480px;
  align-self: center;
}

.culture-card {
  gap: 10px;
}

.culture-card.active {
  border-color: var(--dzz-culture-active-border);
  box-shadow: inset 0 0 0 1px rgba(47, 111, 221, 0.2);
  background: var(--dzz-culture-active-bg);
}

.culture-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.culture-card-title {
  font-weight: 700;
  color: var(--dzz-culture-title);
}

.culture-badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.culture-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--dzz-culture-badge-bg);
  color: var(--dzz-culture-badge-fg);
  font-size: 13px;
  font-weight: 600;
}

.culture-badge-secondary {
  background: var(--dzz-culture-badge-2-bg);
  color: var(--dzz-culture-badge-2-fg);
}

.culture-card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--dzz-culture-meta);
}

.culture-card-meta strong {
  color: var(--dzz-text-strong);
}

.chart-card canvas {
  height: 290px !important;
}

.chart-empty-state {
  min-height: 290px;
  border: 1px dashed var(--dzz-empty-border);
  border-radius: 14px;
  background: var(--dzz-empty-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}

.catalog-loading-state {
  min-height: 180px;
}

.chart-empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--dzz-text-strong);
}

.chart-empty-text {
  margin-top: 8px;
  max-width: 420px;
  color: var(--dzz-text-muted);
  font-size: 14px;
}

.scene-id {
  word-break: break-all;
}

.catalog-item {
  color: var(--dzz-culture-meta);
}

.catalog-item strong {
  color: var(--dzz-text-strong);
}

.catalog-item.selectedA {
  border-color: #2f6fdd;
  box-shadow: inset 0 0 0 1px rgba(47, 111, 221, 0.2);
}

.catalog-item.selectedB {
  background: var(--dzz-catalog-selected-b-bg);
  border-color: var(--dzz-catalog-selected-b-border);
}

@media (max-width: 1000px) {
  .info-grid,
  .preview-grid,
  .catalog-grid,
  .culture-grid {
    grid-template-columns: 1fr 1fr;
  }

  .controls-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .info-grid,
  .preview-grid,
  .catalog-grid,
  .culture-grid,
  .controls-grid {
    grid-template-columns: 1fr;
  }

  #dzz-field-map,
  .map-shell {
    min-height: 360px;
    height: 360px;
  }
}
</style>

<style lang="scss">
.body--dark .field-dzz-page {
  --dzz-card-border: rgba(255, 255, 255, 0.12);
  --dzz-card-bg: linear-gradient(180deg, rgba(48, 52, 64, 0.98), rgba(34, 37, 46, 0.96));
  --dzz-card-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  --dzz-tile-bg: rgba(255, 255, 255, 0.06);
  --dzz-tile-border: rgba(255, 255, 255, 0.1);
  --dzz-text-muted: rgba(255, 255, 255, 0.65);
  --dzz-text-strong: rgba(255, 255, 255, 0.92);
  --dzz-text-heading: rgba(255, 255, 255, 0.95);
  --dzz-section-loading-border: rgba(255, 255, 255, 0.12);
  --dzz-section-loading-bg: linear-gradient(180deg, rgba(56, 62, 76, 0.6), rgba(44, 48, 58, 0.55));
  --dzz-map-shell-border: rgba(255, 255, 255, 0.12);
  --dzz-map-shell-bg: linear-gradient(180deg, rgba(40, 44, 54, 0.95), rgba(32, 36, 44, 0.92));
  --dzz-map-loading-bg: rgba(28, 31, 38, 0.88);
  --dzz-legend-bg: rgba(38, 42, 52, 0.96);
  --dzz-culture-overview-bg: linear-gradient(180deg, rgba(52, 58, 72, 0.85), rgba(42, 46, 58, 0.8));
  --dzz-culture-overview-border: rgba(255, 255, 255, 0.1);
  --dzz-culture-title: rgba(255, 255, 255, 0.92);
  --dzz-culture-badge-bg: rgba(96, 165, 250, 0.2);
  --dzz-culture-badge-fg: #bfdbfe;
  --dzz-culture-badge-2-bg: rgba(255, 255, 255, 0.08);
  --dzz-culture-badge-2-fg: rgba(226, 232, 240, 0.9);
  --dzz-culture-meta: rgba(226, 232, 240, 0.85);
  --dzz-culture-active-border: #60a5fa;
  --dzz-culture-active-bg: linear-gradient(180deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.08));
  --dzz-empty-border: rgba(255, 255, 255, 0.14);
  --dzz-empty-bg: linear-gradient(180deg, rgba(40, 44, 54, 0.9), rgba(34, 37, 46, 0.88));
  --dzz-catalog-selected-b-bg: rgba(251, 191, 36, 0.12);
  --dzz-catalog-selected-b-border: #fbbf24;
}

.body--dark .field-dzz-page .bg-red-1 {
  background: rgba(127, 29, 29, 0.45) !important;
  color: #fecaca !important;
}

.body--dark .field-dzz-page .bg-orange-1 {
  background: rgba(154, 52, 18, 0.45) !important;
  color: #fdba74 !important;
}
</style>
