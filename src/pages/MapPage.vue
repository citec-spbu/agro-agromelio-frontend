<template>
  <div class="map-container">
    <div id="map"></div>
    <q-dialog v-model="colorDialog" persistent>
      <q-card class="contour-dialog">
        <q-card-section class="q-pb-sm">
          <div class="contour-dialog-title">Новый контур</div>
          <div class="contour-dialog-subtitle">Шаг 1: задайте понятное название. Шаг 2: выберите цвет.</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="contourName"
            dense
            outlined
            autofocus
            label="Название контура"
            hint="Например: Северный, Участок 2"
            class="q-mb-md"
          />

          <div class="color-label">Цвет контура</div>
          <div class="color-palette q-mb-sm">
            <button
              v-for="color in colorPresets"
              :key="color"
              type="button"
              class="color-dot"
              :class="{ active: selectedColor === color }"
              :style="{ backgroundColor: color }"
              @click="selectPresetColor(color)"
            />
          </div>

          <q-expansion-item dense label="Свой цвет" header-class="custom-color-header">
            <q-color v-model="selectedColor" no-header no-footer default-view="palette" />
          </q-expansion-item>

          <div class="contour-preview">
            <span class="preview-dot" :style="{ backgroundColor: selectedColor }"></span>
            <span class="preview-name">{{ contourName.trim() || "Название контура" }}</span>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat dense no-caps label="Отмена" :disable="isContourSaving" @click="cancelColorSelection" />
          <q-btn
            unelevated
            dense
            no-caps
            label="Создать контур"
            color="primary"
            :loading="isContourSaving"
            :disable="!isContourNameValid || isContourSaving"
            @click="applyColorSelection"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="deleteContourDialog" persistent>
      <q-card class="delete-confirm-card">
        <q-card-section class="q-pb-sm">
          <div class="delete-confirm-badge">
            <span class="delete-confirm-dot" :style="{ backgroundColor: pendingDeleteContourColor }"></span>
            <span class="delete-confirm-label">Подтверждение удаления</span>
          </div>
          <div class="delete-confirm-title">
            Удалить контур «{{ pendingDeleteContourName || "Без названия" }}»?
          </div>
          <div class="delete-confirm-subtitle">Контур будет удалён сразу и без возможности восстановления.</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Отмена" color="grey-7" :disable="isContourDeleting" @click="closeDeleteContourDialog" />
          <q-btn
            unelevated
            no-caps
            color="negative"
            label="Удалить контур"
            :loading="isContourDeleting"
            :disable="isContourDeleting"
            @click="confirmContourDeletion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- кнопки для добаления сезона/поля выпадающий список из сезонов/полей -->
    <dropdown-or-add-season-field-buttons
      @startDrawing="startDrawing"
      @undoLastAction="undoLastAction"
      @selectedField="updateSelectedField"
      @isEditMode="toggleEditMode"
      :updateFields="updateFieldsInChild"
      :polygonIsFinished="polygonIsFinished"
      :resetEditModeSignal="editModeResetSignal"
    ></dropdown-or-add-season-field-buttons>
  </div>
</template>

<script>
import {
  ref,
  onMounted,
  watch,
  onUnmounted,
  onBeforeUnmount,
  computed,
} from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { useRouter } from "vue-router";
import axios from "axios";
import { useQuasar } from "quasar";
import { userStore } from "src/usage";
// import MapPageEditButtons from "src/components/MapPageEditButtons.vue";
import * as turf from "@turf/turf";

import DropdownOrAddSeasonFieldButtons from "src/components/DropdownOrAddSeasonFieldButtons.vue";

export default {
  components: { DropdownOrAddSeasonFieldButtons },

  name: "MapComponent",
  setup() {
    const map = ref(null);
    const drawnItems = new L.FeatureGroup();
    const router = useRouter();
    const $q = useQuasar();
    const accessToken = userStore.state.access_token;
    const isDrawingEnabled = ref(false);
    const isEditMode = ref(false);
    const activeField = ref(sessionStorage.getItem("activeField"));
    const hasContoursOnMap = ref(false);
    const editModeResetSignal = ref(0);
    const isContourSaving = ref(false);
    const skipSelectedFieldWatcher = ref(false);
    const contourExternalDataCache = new Map();
    let deleteStack = [];
    const contourName = ref("");
    const isContourNameValid = computed(() => contourName.value.trim().length > 0);

    const selectedSeason = ref(
      JSON.parse(sessionStorage.getItem("activeSeason")) || null
    );
    const selectedField = ref(
      JSON.parse(sessionStorage.getItem("activeField")) || null
    );
    const colorDialog = ref(false);
    const selectedColor = ref("#2f6fdd");
    const deleteContourDialog = ref(false);
    const isContourDeleting = ref(false);
    const pendingDeleteContourName = ref("");
    const pendingDeleteContourColor = ref("#dc2626");
    const pendingDeletePolygon = ref(null);
    const colorPresets = ["#2f6fdd", "#17b26a", "#f79009", "#ef4444", "#8b5cf6", "#14b8a6"];
    const applyLeafletDrawRuLocale = () => {
      if (!L?.drawLocal) return;

      L.drawLocal.draw = L.drawLocal.draw || {};
      L.drawLocal.draw.toolbar = L.drawLocal.draw.toolbar || {};
      L.drawLocal.draw.toolbar.actions = {
        title: "Отменить рисование",
        text: "Отмена",
      };
      L.drawLocal.draw.toolbar.finish = {
        title: "Завершить рисование",
        text: "Готово",
      };
      L.drawLocal.draw.toolbar.undo = {
        title: "Удалить последнюю точку",
        text: "Назад",
      };
      L.drawLocal.draw.toolbar.buttons = {
        polygon: "Нарисовать контур",
        polyline: "Нарисовать линию",
        rectangle: "Нарисовать прямоугольник",
        circle: "Нарисовать круг",
        marker: "Добавить маркер",
        circlemarker: "Добавить круговой маркер",
      };

      L.drawLocal.draw.handlers = L.drawLocal.draw.handlers || {};
      L.drawLocal.draw.handlers.polygon = L.drawLocal.draw.handlers.polygon || {};
      L.drawLocal.draw.handlers.polygon.tooltip = {
        start: "Кликните на карту, чтобы начать контур.",
        cont: "Кликните, чтобы добавить следующую точку.",
        end: "Кликните по первой точке, чтобы замкнуть контур.",
      };
      L.drawLocal.draw.handlers.polyline = L.drawLocal.draw.handlers.polyline || {};
      L.drawLocal.draw.handlers.polyline.tooltip = {
        start: "Кликните на карту, чтобы начать линию.",
        cont: "Кликните, чтобы продолжить линию.",
        end: "Двойной клик завершает линию.",
      };
      L.drawLocal.draw.handlers.polyline.error =
        "<strong>Ошибка:</strong> линии не должны пересекаться.";
      L.drawLocal.draw.handlers.rectangle = L.drawLocal.draw.handlers.rectangle || {};
      L.drawLocal.draw.handlers.rectangle.tooltip = {
        start: "Нажмите и тяните, чтобы нарисовать прямоугольник.",
      };
      L.drawLocal.draw.handlers.simpleshape = L.drawLocal.draw.handlers.simpleshape || {};
      L.drawLocal.draw.handlers.simpleshape.tooltip = {
        end: "Отпустите кнопку мыши, чтобы завершить фигуру.",
      };
      L.drawLocal.draw.handlers.circle = L.drawLocal.draw.handlers.circle || {};
      L.drawLocal.draw.handlers.circle.tooltip = {
        start: "Нажмите и тяните, чтобы нарисовать круг.",
      };
      L.drawLocal.draw.handlers.circle.radius = "Радиус";
      L.drawLocal.draw.handlers.marker = L.drawLocal.draw.handlers.marker || {};
      L.drawLocal.draw.handlers.marker.tooltip = {
        start: "Кликните на карту, чтобы поставить маркер.",
      };

      L.drawLocal.edit = L.drawLocal.edit || {};
      L.drawLocal.edit.toolbar = L.drawLocal.edit.toolbar || {};
      L.drawLocal.edit.toolbar.actions = {
        save: { title: "Сохранить изменения", text: "Сохранить" },
        cancel: { title: "Отменить изменения", text: "Отмена" },
        clearAll: { title: "Удалить все объекты", text: "Очистить всё" },
      };
      L.drawLocal.edit.toolbar.buttons = {
        edit: "Редактировать объекты",
        editDisabled: "Нет объектов для редактирования",
        remove: "Удалить объекты",
        removeDisabled: "Нет объектов для удаления",
      };
      L.drawLocal.edit.handlers = L.drawLocal.edit.handlers || {};
      L.drawLocal.edit.handlers.edit = L.drawLocal.edit.handlers.edit || {};
      L.drawLocal.edit.handlers.edit.tooltip = {
        text: "Перетаскивайте точки, чтобы изменить контур.",
        subtext: "Нажмите «Отмена», чтобы отменить изменения.",
      };
      L.drawLocal.edit.handlers.remove = L.drawLocal.edit.handlers.remove || {};
      L.drawLocal.edit.handlers.remove.tooltip = {
        text: "Кликните по объекту, чтобы удалить его.",
      };
    };
    let currentLayer = null; // 当前绘制的多边形图层 Текущий слой нарисованных полигонов
    const selectPresetColor = (color) => {
      selectedColor.value = color;
    };
    const toggleEditMode = (isEditModeOn) => {
      isEditMode.value = isEditModeOn;
    };
    const openDeleteContourDialog = (polygon, contourName, contourColor) => {
      pendingDeletePolygon.value = polygon || null;
      pendingDeleteContourName.value =
        (contourName && String(contourName).trim()) ||
        polygon?.feature?.properties?.name ||
        "Без названия";
      pendingDeleteContourColor.value = contourColor || polygon?.options?.fillColor || "#dc2626";
      deleteContourDialog.value = true;
    };
    const closeDeleteContourDialog = () => {
      if (isContourDeleting.value) return;
      deleteContourDialog.value = false;
      pendingDeletePolygon.value = null;
      pendingDeleteContourName.value = "";
      pendingDeleteContourColor.value = "#dc2626";
    };
    const confirmContourDeletion = async () => {
      if (isContourDeleting.value) return;
      if (!pendingDeletePolygon.value) {
        closeDeleteContourDialog();
        return;
      }
      isContourDeleting.value = true;
      const removed = await removePolygonLayer(pendingDeletePolygon.value, {
        notifyIfMissing: true,
        successMessage: `Контур «${pendingDeleteContourName.value}» удалён.`,
      });
      isContourDeleting.value = false;
      if (removed) {
        closeDeleteContourDialog();
      }
    };
    const handleContourPopupClick = (contour) => {
      console.log(
        contour,
        `{
            "seasonId": ${selectedSeason.value.id},
            "seasonName": ${selectedSeason.value.name},
            "fieldId": ${selectedField.value.id},
            "fieldName": ${selectedField.value.name},
            "contourId": ${contour.id},
            "contourName": ${contour.name}
          }`
      );
      router.push(
        `/rotation?seasonId=${encodeURIComponent(
          selectedSeason.value.id
        )}&seasonName=${encodeURIComponent(
          selectedSeason.value.name
        )}&fieldId=${encodeURIComponent(
          selectedField.value.id
        )}&fieldName=${encodeURIComponent(
          selectedField.value.name
        )}&contourId=${encodeURIComponent(
          contour.id
        )}&contourName=${encodeURIComponent(contour.name)}`
      );
    };
    const handleFieldPopupClick = () => {
      router.push({
        name: 'FieldWeatherInfoPage',
        query: {
          seasonId: selectedSeason.value.id,
          seasonName: selectedSeason.value.name,
          fieldId: selectedField.value.id,
          fieldName: selectedField.value.name,
        }
      });
    };
    const handleFieldDzzPopupClick = () => {
      router.push({
        name: 'FieldDzzInfoPage',
        query: {
          seasonId: selectedSeason.value.id,
          seasonName: selectedSeason.value.name,
          fieldId: selectedField.value.id,
          fieldName: selectedField.value.name,
        }
      });
    };
    const getLayerColorHex = (layer, fallback = "#2f6fdd") => {
      const rawColor = layer?.options?.fillColor || layer?.options?.color || fallback;
      if (!rawColor) return "#2f6fdd";
      return String(rawColor).startsWith("#") ? String(rawColor) : `#${rawColor}`;
    };
    const getSafeActiveField = () =>
      JSON.parse(sessionStorage.getItem("activeField") || "null") || selectedField.value || null;
    const buildContourPopupContent = ({ popupKey, contourName, fieldName, polygonColor }) => `
      <div class="popup-content premium-popup">
        <div class="popup-head">
          <div class="popup-title">${contourName}</div>
          <div class="popup-subtitle">Поле: ${fieldName}</div>
        </div>
        <div class="popup-preview-row">
          <span class="popup-preview-dot" style="background: ${polygonColor};"></span>
          <span class="popup-preview-text">Превью контура</span>
        </div>
        <div class="popup-actions">
          <button id="contour-info-${popupKey}" class="details-button premium-action">
            <span class="action-icon">C</span>
            <span>Контур</span>
          </button>
          <button id="field-info-${popupKey}" class="details-button premium-action">
            <span class="action-icon">M</span>
            <span>Погода</span>
          </button>
          <button id="field-dzz-${popupKey}" class="details-button premium-action dzz-action">
            <span class="action-icon">D</span>
            <span>ДЗЗ</span>
          </button>
          <button id="contour-delete-${popupKey}" class="details-button premium-action danger-action">
            <span class="action-icon">X</span>
            <span>Удалить контур</span>
          </button>
        </div>
        <div id="external-data-${popupKey}" class="meteo-data premium-meteo-card">Загрузка метео...</div>
      </div>
    `;
    const formatValue = (value, suffix = "", digits = 1) => {
      if (value === null || value === undefined || value === "") return "-";
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return String(value);
      return `${numeric.toFixed(digits)}${suffix ? ` ${suffix}` : ""}`;
    };
    const cacheKeyForContour = (fieldId, contourId) => `${String(fieldId)}:${String(contourId)}`;
    const invalidateContourExternalDataCache = (contourId) => {
      if (!contourId) return;
      const suffix = `:${String(contourId)}`;
      Array.from(contourExternalDataCache.keys()).forEach((key) => {
        if (key.endsWith(suffix)) {
          contourExternalDataCache.delete(key);
        }
      });
    };
    const fetchContourExternalData = async ({ fieldId, contourId, seasonId }) => {
      const meteoPromise = axios.get(
        `${process.env.VUE_APP_BASE_URL}/api/meteo/fields/${fieldId}/contours/${contourId}/preview`,
        {
          headers: withAuthHeaders(),
        }
      );
      const dzzPromise = axios.get(`${process.env.VUE_APP_BASE_URL}/api/dzz/${fieldId}/summary`, {
        headers: withAuthHeaders(),
        params: {
          contourId,
          ...(seasonId ? { seasonId } : {}),
        },
      });

      const [meteoResult, dzzResult] = await Promise.allSettled([meteoPromise, dzzPromise]);
      return {
        meteo: meteoResult.status === "fulfilled" ? meteoResult.value.data : null,
        dzz: dzzResult.status === "fulfilled" ? dzzResult.value.data : null,
      };
    };
    const loadContourExternalData = async ({ fieldId, contourId, seasonId, forceRefresh = false }) => {
      if (!fieldId || !contourId) return { meteo: null, dzz: null };
      const key = cacheKeyForContour(fieldId, contourId);
      const cached = contourExternalDataCache.get(key);
      if (!forceRefresh && cached?.data) {
        return cached.data;
      }
      if (!forceRefresh && cached?.promise) {
        return cached.promise;
      }

      const promise = fetchContourExternalData({ fieldId, contourId, seasonId })
        .then((data) => {
          contourExternalDataCache.set(key, { data });
          return data;
        })
        .catch((error) => {
          contourExternalDataCache.delete(key);
          throw error;
        });

      contourExternalDataCache.set(key, { promise });
      return promise;
    };
    const renderContourExternalData = async ({ popupKey, fieldId, contourId, seasonId }) => {
      const container = document.getElementById(`external-data-${popupKey}`);
      if (!container) return;
      container.innerHTML = "Загрузка метео...";

      try {
        const data = await loadContourExternalData({ fieldId, contourId, seasonId });
        const meteo = data?.meteo || {};

        const meteoHtml = `
          <div class="external-block-title">Метео</div>
          <div class="meteo-item"><span class="meteo-icon">T</span><span>Температура</span><strong>${formatValue(meteo.temperature, "°C", 1)}</strong></div>
          <div class="meteo-item"><span class="meteo-icon">H</span><span>Влажность</span><strong>${formatValue(meteo.humidity, "%", 1)}</strong></div>
          <div class="meteo-item"><span class="meteo-icon">W</span><span>Ветер</span><strong>${formatValue(meteo.wind_speed, "м/с", 1)}</strong></div>
        `;

        const targetContainer = document.getElementById(`external-data-${popupKey}`);
        if (!targetContainer) return;
        targetContainer.innerHTML = meteoHtml;
      } catch (_error) {
        const targetContainer = document.getElementById(`external-data-${popupKey}`);
        if (targetContainer) {
          targetContainer.innerHTML = "Не удалось загрузить превью метео.";
        }
      }
    };
    const bindContourInteractions = (polygon, contour = {}) => {
      if (!polygon) return;

      polygon.feature = polygon.feature || { type: "Feature" };
      polygon.feature.properties = polygon.feature.properties || {};
      const contourName = (contour.name || polygon.feature.properties.name || "Контур").trim();
      const contourId = contour.id ?? polygon.feature.properties.id ?? null;
      polygon.feature.properties.name = contourName;
      if (contourId) {
        polygon.feature.properties.id = contourId;
      }

      const activeFieldData = getSafeActiveField();
      const fieldName = activeFieldData?.name || "Поле";
      const fieldId = activeFieldData?.id || selectedField.value?.id || "field";
      const seasonId = selectedSeason.value?.id || null;
      const polygonColor = getLayerColorHex(polygon, contour.color ? `#${contour.color}` : "#2f6fdd");
      const popupKey = contourId
        ? `id-${contourId}`
        : `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

      polygon.off("click");
      polygon.off("popupopen");
      polygon.bindPopup(
        buildContourPopupContent({
          popupKey,
          contourName,
          fieldName,
          polygonColor,
        })
      );

      polygon.on("click", () => {
        if (isDrawInProgress()) return;
        if (isEditMode.value) {
          polygon.closePopup();
          selectPolygon(polygon);
          return;
        }
        polygon.closePopup();
        polygon.openPopup();
      });

      polygon.on("popupopen", async () => {
        if (isEditMode.value) {
          polygon.closePopup();
          return;
        }

        const contourInfoButton = document.getElementById(`contour-info-${popupKey}`);
        if (contourInfoButton) {
          contourInfoButton.onclick = () => {
            if (!contourId) {
              $q.notify({
                type: "warning",
                message: "Контур ещё не синхронизирован с сервером, попробуйте чуть позже.",
              });
              return;
            }
            handleContourPopupClick({ id: contourId, name: contourName });
          };
        }

        const fieldInfoButton = document.getElementById(`field-info-${popupKey}`);
        if (fieldInfoButton) {
          fieldInfoButton.onclick = () => handleFieldPopupClick();
        }

        const fieldDzzButton = document.getElementById(`field-dzz-${popupKey}`);
        if (fieldDzzButton) {
          fieldDzzButton.onclick = () => handleFieldDzzPopupClick();
        }

        const contourDeleteButton = document.getElementById(`contour-delete-${popupKey}`);
        if (contourDeleteButton) {
          contourDeleteButton.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            openDeleteContourDialog(polygon, contourName, polygonColor);
          };
        }
        await renderContourExternalData({
          popupKey,
          fieldId,
          contourId,
          seasonId,
        });
      });
    };

    const clearPolygons = () => {
      map.value.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          // Check that the layer is a polygon.
          map.value.removeLayer(layer);
        }
      });
      selectedPolygon = null;
      hasContoursOnMap.value = false;
    };

    const getDefaultContourName = () => {
      let contourCount = 0;
      map.value.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          contourCount += 1;
        }
      });
      return `Контур ${contourCount + 1}`;
    };

    const fetchDataAndDrawPolygons = async () => {
      console.log("fetchplogons");
      if (selectedField.value.id) {
        try {
          if (!accessToken) {
            console.error("No access token available");

            $q.notify({
              type: "negative",
              message: "Залогиньтесь, пожалуйста",
            });
            return;
          }

          const response = await axios.get(
            `${process.env.VUE_APP_BASE_URL}/api/fields-service/fields/${selectedField.value.id}/contours`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log("contoures got ", response.data);
          const contours = response.data;

          // Use for...of to handle async operations sequentially.
          for (const contour of contours) {
            const coordinates = contour.coordinates.map((coord) => [
              coord.latitude,
              coord.longitude,
            ]);

            const polygonColor = `#${contour.color}`;
            const polygon = L.polygon(coordinates, {
              color: polygonColor,
              fillColor: polygonColor,
              fillOpacity: 0.4,
            }).addTo(map.value);
            polygon.feature = polygon.feature || { type: "Feature" };
            polygon.feature.properties = polygon.feature.properties || {};
            polygon.feature.properties.name = contour.name;
            polygon.feature.properties.id = contour.id;
            bindContourInteractions(polygon, contour);
          }
        } catch (error) {
          console.error("Error fetching contours data:", error);
        } finally {
          updateContoursPresence();
        }
      }
    };

    // Clear selected contour color.
    const cancelColorSelection = () => {
      if (isContourSaving.value) return;
      if (currentLayer) {
        drawnItems.removeLayer(currentLayer);
        if (map.value?.hasLayer(currentLayer)) {
          map.value.removeLayer(currentLayer);
        }
        currentLayer = null;
      }
      colorDialog.value = false;
      contourName.value = "";
      if (selectedPolygon) {
        resetPolygonStyle(selectedPolygon);
        selectedPolygon = null;
      }
      if (isDrawingEnabled.value) {
        startDrawing(false);
      }
      isEditMode.value = false;
      editModeResetSignal.value += 1;
      updateContoursPresence();
    };

    const withAuthHeaders = () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    });

    const toContourPayload = (layer) => {
      const geoJson = layer.toGeoJSON();
      const coordinates = geoJson.geometry.coordinates[0].map((coord) => ({
        longitude: coord[0],
        latitude: coord[1],
      }));
      return {
        contour: "ContourBaseDTO",
        name: layer.feature.properties.name,
        color: layer.options.fillColor.replace("#", ""),
        squareArea: turf.area(geoJson).toFixed(2),
        coordinates,
      };
    };

    const refreshDraftFieldInSession = (fieldId) => {
      const activeFieldRaw = JSON.parse(sessionStorage.getItem("activeField") || "null");
      if (!activeFieldRaw) return;
      const fields = JSON.parse(sessionStorage.getItem("fields") || "[]");
      const updatedFields = fields.filter((field) => field.name !== activeFieldRaw.name);
      sessionStorage.setItem("fields", JSON.stringify(updatedFields));
      const updatedActiveField = { ...activeFieldRaw, id: fieldId };
      sessionStorage.setItem("activeField", JSON.stringify(updatedActiveField));
      if (selectedField.value) {
        // Do not replace the whole object to avoid map rerender and contour flicker.
        selectedField.value.id = fieldId;
        selectedField.value.name = updatedActiveField.name;
        selectedField.value.description = updatedActiveField.description;
      } else {
        skipSelectedFieldWatcher.value = true;
        selectedField.value = updatedActiveField;
      }
      updateFieldsInChild.value = true;
      setTimeout(() => {
        updateFieldsInChild.value = false;
      }, 300);
    };

    const createContourImmediately = async (layer) => {
      const contourPayload = toContourPayload(layer);

      if (selectedField.value?.id) {
        const response = await axios.post(
          `${process.env.VUE_APP_BASE_URL}/api/fields-service/fields/${selectedField.value.id}/contour`,
          contourPayload,
          { headers: withAuthHeaders() }
        );
        return response?.data?.id || response?.data?.contour_id || null;
      }

      const draftField = JSON.parse(sessionStorage.getItem("activeField") || "null");
      const activeSeason = JSON.parse(sessionStorage.getItem("activeSeason") || "null");
      if (!draftField || !activeSeason?.id) {
        throw new Error("Сначала выберите сезон и поле.");
      }

      const fieldToPost = {
        name: draftField.name,
        description: draftField.description,
        field: "FieldDTO",
        contours: [contourPayload],
      };

      const fieldResponse = await axios.post(
        `${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons/${activeSeason.id}/field`,
        fieldToPost,
        { headers: withAuthHeaders() }
      );

      const createdFieldId = fieldResponse?.data?.id;
      if (!createdFieldId) {
        throw new Error("Не удалось получить ID поля после создания.");
      }

      refreshDraftFieldInSession(createdFieldId);

      let contourId =
        fieldResponse?.data?.contours?.[0]?.id ||
        fieldResponse?.data?.items?.[0]?.id ||
        null;

      if (!contourId) {
        try {
          const contoursResponse = await axios.get(
            `${process.env.VUE_APP_BASE_URL}/api/fields-service/fields/${createdFieldId}/contours`,
            { headers: withAuthHeaders() }
          );
          const contours = Array.isArray(contoursResponse.data) ? contoursResponse.data : [];
          const found = contours.find((contour) => contour.name === contourPayload.name);
          contourId = found?.id || null;
        } catch (_error) {
          contourId = null;
        }
      }

      return contourId;
    };

    const applyColorSelection = async () => {
      if (!isContourNameValid.value) {
        return;
      }
      if (!currentLayer) {
        return;
      }
      if (isContourSaving.value) return;
      if (isDrawingEnabled.value) {
        startDrawing(false);
      }

      isContourSaving.value = true;
      try {
        const createdLayer = currentLayer;
        currentLayer.setStyle({
          color: selectedColor.value,
          fillColor: selectedColor.value,
          fillOpacity: 0.35,
          weight: 2.5,
        });
        currentLayer.feature.properties.name = contourName.value.trim();
        if (!drawnItems.hasLayer(createdLayer)) {
          drawnItems.addLayer(createdLayer);
        }
        const contourId = await createContourImmediately(createdLayer);
        if (contourId) {
          createdLayer.feature.properties.id = contourId;
        }

        bindContourInteractions(createdLayer, {
          id: contourId || createdLayer?.feature?.properties?.id || null,
          name: createdLayer?.feature?.properties?.name || contourName.value.trim(),
          color: selectedColor.value.replace("#", ""),
        });
        if (contourId && selectedField.value?.id) {
          loadContourExternalData({
            fieldId: selectedField.value.id,
            contourId,
            seasonId: selectedSeason.value?.id || null,
            forceRefresh: true,
          }).catch(() => {});
        }

        if (selectedPolygon) {
          resetPolygonStyle(selectedPolygon);
          selectedPolygon = null;
        }

        isEditMode.value = false;
        editModeResetSignal.value += 1;
        colorDialog.value = false;
        contourName.value = "";
        currentLayer = null;
        updateContoursPresence();

        setTimeout(() => {
          if (map.value?.hasLayer(createdLayer)) {
            createdLayer.openPopup();
          }
        }, 60);

        $q.notify({
          type: "positive",
          message: "Контур создан и сразу сохранён.",
        });
      } catch (error) {
        console.error("Ошибка при создании контура:", error);
        if (currentLayer) {
          drawnItems.removeLayer(currentLayer);
          if (map.value?.hasLayer(currentLayer)) {
            map.value.removeLayer(currentLayer);
          }
          currentLayer = null;
        }
        updateContoursPresence();
        $q.notify({
          type: "negative",
          message: "Не удалось создать контур. Проверьте данные и повторите.",
        });
      } finally {
        isContourSaving.value = false;
      }
    };

    // Start polygon drawing when contour-add action is triggered.
    let drawControl = null;
    let drawnHandler = null; // Объявляем переменную для обработчика
    let drawStopHandler = null;
    let selectedPolygon = null; // Переменная для хранения выделенного полигона
    const SELECTION_BORDER_COLOR = "#0f172a";
    const DEFAULT_POLYGON_WEIGHT = 2.5;

    const resetPolygonStyle = (polygon) => {
      if (!polygon) return;
      polygon.setStyle({
        color: polygon.options.fillColor || polygon.options.color || "#2f6fdd",
        weight: DEFAULT_POLYGON_WEIGHT,
        fillOpacity: 0.35,
      });
    };

    const selectPolygon = (polygon) => {
      if (!polygon) return;
      if (selectedPolygon && selectedPolygon !== polygon) {
        resetPolygonStyle(selectedPolygon);
      }
      selectedPolygon = polygon;
      polygon.setStyle({
        weight: 4,
        color: SELECTION_BORDER_COLOR,
        fillOpacity: 0.4,
      });
    };

    const isDrawInProgress = () =>
      Boolean(drawControl && typeof drawControl.enabled === "function" && drawControl.enabled());

    const setExistingPolygonsInteractive = (isInteractive) => {
      if (!map.value) return;
      map.value.eachLayer((layer) => {
        if (!(layer instanceof L.Polygon)) return;
        layer.options.interactive = isInteractive;
        if (layer._path) {
          layer._path.style.pointerEvents = isInteractive ? "auto" : "none";
        }
      });
    };

    const getPolygonsOnMap = () => {
      const polygons = [];
      if (!map.value) return polygons;
      map.value.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          polygons.push(layer);
        }
      });
      return polygons;
    };

    const updateContoursPresence = () => {
      hasContoursOnMap.value = getPolygonsOnMap().length > 0;
    };

    const polygonIsFinished = ref(false);
    const startDrawing = (isDrawing) => {
      isDrawingEnabled.value = isDrawing;

      if (isDrawingEnabled.value) {
        if (!drawControl) {
          drawControl = new L.Draw.Polygon(map.value, {
            allowIntersection: true,
            showArea: true,
            metric: true,
            maxPoints: 0,
            finishOn: "dblclick",
            shapeOptions: {
              color: "#2f6fdd",
              fillColor: "#2f6fdd",
              fillOpacity: 0.2,
              weight: 2.5,
            },
          });
        }
        setExistingPolygonsInteractive(false);
        drawControl.enable(); // Активирует режим рисования      }

        if (!drawnHandler) {
          drawnHandler = (event) => {
            polygonIsFinished.value = false;
            console.log("start of draw");
            const layer = event.layer;
            // Store pending polygon so user can assign a contour name.
            layer.feature = layer.feature || { type: "Feature" };
            layer.feature.properties = layer.feature.properties || {};
            layer.feature.properties.name = ""; // Временное пустое имя
            // Add click handler to polygon.
            layer.on("click", () => {
              if (isDrawInProgress()) return;
              if (!isEditMode.value) return;
              selectPolygon(layer);
            });
            if (
              !layer ||
              !layer.getLatLngs ||
              layer.getLatLngs().length === 0
            ) {
              console.error("Invalid layer or empty coordinates");
              return;
            }

            const newPolygon = layer.toGeoJSON();
            const newPolygonColor = selectedColor.value;
            console.log(
              "Координаты текущего нарисованного контура:",
              newPolygon.geometry.coordinates
            );

            let isOverlap = false;
            // While creating a polygon, validate intersections with existing contours.
            function checkIntersection(existingPolygon, newPolygon) {
              if (
                existingPolygon.geometry &&
                existingPolygon.geometry.type === "Polygon" &&
                newPolygon.geometry &&
                newPolygon.geometry.type === "Polygon"
              ) {
                const turfNew = turf.polygon(newPolygon.geometry.coordinates);
                const turfExisting = turf.polygon(
                  existingPolygon.geometry.coordinates
                );

                // Check intersection.

                if(turf.booleanOverlap(turfNew, turfExisting)){
                  console.log("Пересечение найдено!");
                  return true;
                }
              }
              return false;
            }

            // Iterate over drawn layers.
            drawnItems.eachLayer((existingLayer) => {
              const existingPolygon = existingLayer.toGeoJSON();
              if (checkIntersection(existingPolygon, newPolygon)) {
                isOverlap = true;
              }
            });
            // Iterate over map layers.
            map.value.eachLayer((existingLayer) => {
              // Check polygons only.
              if (
                existingLayer instanceof L.Polygon &&
                existingLayer !== newPolygon
              ) {
                const existingPolygon = layer.toGeoJSON();
                if (checkIntersection(existingPolygon, newPolygon)) {
                  isOverlap = true;
                }
              }
            });
            if (isOverlap) {
              $q.notify({
                type: "negative",
                message: "Контуры не должны перекрываться",
              });
              return;
            }

            layer.setStyle({
              color: newPolygonColor,
              fillColor: newPolygonColor,
              fillOpacity: 0.35,
              weight: 2.5,
            });
            console.log("Polygon coordinates:", layer.getLatLngs());

            drawnItems.addLayer(layer);
            map.value.addLayer(drawnItems);
            currentLayer = layer;
            selectedColor.value = layer.options.fillColor || "#2f6fdd";
            contourName.value = getDefaultContourName();
            // Notify parent that drawing finished after polygon closure.
            polygonIsFinished.value = true;
            colorDialog.value = true;
          };

          // Start polygon drawing.
          map.value.on("draw:drawstart", (e) => {
            if (e.layerType === "polygon") {
              currentLayer = e.layer; // Сохраняем текущий слой
            }
          });
          map.value?.on("draw:created", drawnHandler);
          drawStopHandler = () => {
            setExistingPolygonsInteractive(true);
          };
          map.value?.on("draw:drawstop", drawStopHandler);
        }
      } else {
        console.log("else");
        if (drawControl) {
          setExistingPolygonsInteractive(true);
          drawControl.disable(); // Отключаем режим рисования
          if (drawnHandler) {
            map.value?.off("draw:created", drawnHandler);
            drawnHandler = null; // Сбрасываем обработчик
          }
          if (drawStopHandler) {
            map.value?.off("draw:drawstop", drawStopHandler);
            drawStopHandler = null;
          }
        }
      }
      updateContoursPresence();
    };

    const removeSelectedPolygon = async () => {
      let polygonToRemove = selectedPolygon;
      if (!polygonToRemove) {
        const polygons = getPolygonsOnMap();
        if (polygons.length === 1) {
          polygonToRemove = polygons[0];
          selectPolygon(polygonToRemove);
        }
      }

      await removePolygonLayer(polygonToRemove, { notifyIfMissing: true });
    };

    const removePolygonLayer = async (
      polygonToRemove,
      { notifyIfMissing = false, successMessage = "Контур удалён." } = {}
    ) => {
      if (!polygonToRemove) {
        if (notifyIfMissing) {
          $q.notify({
            message: "Сначала выберите контур кликом по карте.",
            type: "warning",
          });
        }
        return false;
      }

      const contourId = polygonToRemove?.feature?.properties?.id;
      invalidateContourExternalDataCache(contourId);
      if (contourId) {
        try {
          await axios.delete(`${process.env.VUE_APP_BASE_URL}/api/fields-service/contour`, {
            headers: withAuthHeaders(),
            params: { id: contourId },
          });
        } catch (error) {
          console.error("Ошибка при удалении контура:", error);
          $q.notify({
            type: "negative",
            message: "Не удалось удалить контур на сервере.",
          });
          return false;
        }
      }

      const layersToRemove = [];
      if (contourId && map.value) {
        map.value.eachLayer((layer) => {
          if (!(layer instanceof L.Polygon)) return;
          const layerId = layer?.feature?.properties?.id;
          if (layerId && String(layerId) === String(contourId)) {
            layersToRemove.push(layer);
          }
        });
      }
      if (!layersToRemove.length) {
        layersToRemove.push(polygonToRemove);
      }

      layersToRemove.forEach((layer) => {
        try {
          layer.closePopup?.();
          layer.off?.();
        } catch (_error) {
          // no-op
        }
        if (drawnItems.hasLayer(layer)) {
          drawnItems.removeLayer(layer);
        }
        if (map.value?.hasLayer(layer)) {
          map.value.removeLayer(layer);
        }
        if (typeof layer.remove === "function") {
          layer.remove();
        }
      });

      if (selectedPolygon && layersToRemove.includes(selectedPolygon)) {
        selectedPolygon = null;
      }
      if (pendingDeletePolygon.value && layersToRemove.includes(pendingDeletePolygon.value)) {
        pendingDeletePolygon.value = null;
      }
      map.value?.closePopup();

      updateContoursPresence();
      $q.notify({
        type: "positive",
        message: successMessage,
      });
      return true;
    };

    const undoLastAction = () => {
      // Remove last point if marker list is not empty.
      if (
        drawControl &&
        drawControl._markers &&
        drawControl._markers.length > 0
      ) {
        console.log("delete last painted point");
        // Drop last marker point from array.
        const lastMarker = drawControl._markers.pop();
        drawControl._markerGroup.removeLayer(lastMarker);
        // Update polygon by removing the last point.
        const latlngs = drawControl._markers.map((marker) =>
          marker.getLatLng()
        );
        // Refresh polygon rendering.
        drawControl._poly.setLatLngs(latlngs);
      } else {
        console.log("нет действий для отмены");
      }
    };
    const updateFieldsInChild = ref(false); //чтобы обновить поля в ребенке после того как они отправились на сервер

    const postContours = async () => {
      if (!accessToken) {
        console.error("No access token available");
        $q.notify({
          type: "negative",
          message: "Залогиньтесь, пожалуйста",
        });
        return;
      }

      // Convert contour coordinates and names into API payload array.
      const contours = [];
      drawnItems.eachLayer(async (layer) => {
        if (layer instanceof L.Polygon) {
          if (layer.feature.properties.id) {
            try {
              const response = await axios.put(
                `${process.env.VUE_APP_BASE_URL}/api/fields-service/contour`,
                {
                  name: layer.feature.properties.name,
                  color: layer.options.fillColor.replace("#", ""),
                  contour: "UpdateContourDTO",
                },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  params: {
                    id: layer.feature.properties.id,
                  },
                }
              );
              console.log("Контур успешно отправлен:");
              $q.notify({
                type: "positive",
                message: "Контура успешно отправлены!",
              });
            } catch (error) {
              console.error("Ошибка при отправке контуров:", error);
              $q.notify({
                type: "negative",
                message: "Ошибка при отправке данных!",
              });
            }
          } else {
            const geoJson = layer.toGeoJSON();
            // Extract coordinates from GeoJSON.
            let coordinates = geoJson.geometry.coordinates[0].map((coord) => ({
              longitude: coord[0], // lng
              latitude: coord[1], // lat
            }));
            contours.push({
              contour: "ContourBaseDTO",
              name: layer.feature.properties.name,
              color: layer.options.fillColor.replace("#", ""),
              squareArea: turf.area(geoJson).toFixed(2), // Площадь в квадратных метрах, округлена до двух знаков
              coordinates: coordinates,
            });
          }
        }
      });
      if (contours.length > 0) {
        // If field has ID, append contours to existing field.
        if (selectedField.value.id) {
          contours.forEach(async (contour) => {
            try {
              const response = await axios.post(
                `${process.env.VUE_APP_BASE_URL}/api/fields-service/fields/${selectedField.value.id}/contour`,
                contour,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              console.log(
                "Контур успешно добавлен к полю:",
                response.data["id"]
              );

              // Could assign contour ID immediately here if needed.

              $q.notify({
                type: "positive",
                message: "Контур успешно отправлен!",
              });
            } catch (error) {
              console.error("Ошибка при отправке контуров:", error);
              $q.notify({
                type: "negative",
                message: "Ошибка при отправке данных!",
              });
            }
          });
        } else {
          const fieldToPost = {
            name: JSON.parse(sessionStorage.getItem("activeField"))["name"],
            description: JSON.parse(sessionStorage.getItem("activeField"))[
              "description"
            ],
            field: "FieldDTO",
            contours: contours,
          };
          console.log("field: ", fieldToPost);

          try {
            const response = await axios.post(
              `${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons/${
                JSON.parse(sessionStorage.getItem("activeSeason"))["id"]
              }/field`,
              fieldToPost,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("Контура успешно отправлены:", response.data["id"]);

            // Remove submitted field from sessionStorage list.
            const fields = JSON.parse(sessionStorage.getItem("fields") || "[]");
            const activeField = JSON.parse(
              sessionStorage.getItem("activeField") || "[]"
            ); // Пример activeField с id

            // Remove object where ID matches activeField.id.
            const updatedFields = fields.filter(
              (field) => field["name"] !== activeField["name"]
            );
            // Save updated list to sessionStorage and add ID to activeField.
            sessionStorage.setItem("fields", JSON.stringify(updatedFields));
            sessionStorage.setItem(
              "activeField",
              JSON.stringify(
                Object.assign(
                  JSON.parse(sessionStorage.getItem("activeField")),
                  {
                    id: response.data["id"],
                  }
                )
              )
            );
            $q.notify({
              type: "positive",
              message: "Контура успешно отправлены!",
            });
          } catch (error) {
            console.error("Ошибка при отправке контуров:", error);
            $q.notify({
              type: "negative",
              message: "Ошибка при отправке данных!",
            });
          }
          updateFieldsInChild.value = true;
          setTimeout(() => {
            updateFieldsInChild.value = false;
          }, 300);
        }
      }
      if (deleteStack.length > 0) {
        for (const deletedPolygon of deleteStack) {
          if (deletedPolygon.feature.properties.id) {
            try {
              const response = await axios.delete(
                `${process.env.VUE_APP_BASE_URL}/api/fields-service/contour`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  params: {
                    id: deletedPolygon.feature.properties.id,
                  },
                }
              );
              console.log("Контур успешно удален");
            } catch (error) {
              console.error("Ошибка при удалении контуров:", error);
              $q.notify({
                type: "negative",
                message: "Ошибка при отправке данных!",
              });
            }
          }
        }
        // Remove field when all contours are deleted.
        let hasPolygonsOnMap = false;
        map.value.eachLayer((layer) => {
          if (layer instanceof L.Polygon) {
            hasPolygonsOnMap = true; // Если найден полигон
            return true; // Прерываем выполнение метода после нахождения первого полигона
          }
        });

        if (!hasPolygonsOnMap && selectedField.value.id) {
          try {
            const response = await axios.delete(
              `${process.env.VUE_APP_BASE_URL}/api/fields-service/field`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                params: {
                  id: selectedField.value.id,
                },
              }
            );
            console.log("Поле успешно удалено");
          } catch (error) {
            console.error("Ошибка при удалении контуров:", error);
            $q.notify({
              type: "negative",
              message: "Ошибка при удалении поля!",
            });
          }
        }
      }
    };

    const updateSelectedField = () => {
      console.log("update selected field");
      selectedField.value = sessionStorage.getItem("activeField")
        ? JSON.parse(sessionStorage.getItem("activeField"))
        : null;
    };
    // Watch activeField changes.
    watch(selectedField, (newValue) => {
      if (skipSelectedFieldWatcher.value) {
        skipSelectedFieldWatcher.value = false;
        return;
      }
      clearPolygons();
      if (newValue?.id) {
        console.log("Рисуем полигоны для поля:", newValue);
        fetchDataAndDrawPolygons();
      } else {
        console.log("Для нового поля сохраненных контуров пока нет");
        updateContoursPresence();
      }
    });

    onMounted(async () => {
      //clearPolygons();
      selectedSeason.value =
        JSON.parse(sessionStorage.getItem("activeSeason")) || null;
      selectedField.value =
        JSON.parse(sessionStorage.getItem("activeField")) || null;
      applyLeafletDrawRuLocale();

      // Initialize map.
      map.value = L.map("map").setView([59.420161, 30.01832], 15); //[широта, долгота], уровень_масштаба
      // Add tile layer.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; OpenStreetMap contributors",
      }).addTo(map.value);

      map.value.addLayer(drawnItems);

      // Load existing polygons.
      if (
        selectedSeason.value &&
        selectedField.value &&
        selectedField.value.id
      ) {
        fetchDataAndDrawPolygons();
        // Redraw polygons when activeField changes in sessionStorage.
      }
      updateContoursPresence();
    });

    return {
      map,
      contourName,
      colorDialog,
      selectedColor,
      isContourSaving,
      deleteContourDialog,
      isContourDeleting,
      pendingDeleteContourName,
      pendingDeleteContourColor,
      colorPresets,
      selectPresetColor,
      isContourNameValid,
      cancelColorSelection,
      applyColorSelection,
      closeDeleteContourDialog,
      confirmContourDeletion,
      isDrawingEnabled,
      startDrawing,
      removeSelectedPolygon,
      undoLastAction,
      postContours,
      updateSelectedField,
      updateFieldsInChild,
      toggleEditMode,
      polygonIsFinished,
      hasContoursOnMap,
      editModeResetSignal,
    };
  },
};
</script>

<style>
.map-container {
  position: relative;
  height: 100vh;
  width: 100%;
  background: #eef3fb;
}

#map {
  height: 100vh !important;
  width: 100% !important;
}

.contour-dialog {
  width: min(460px, calc(100vw - 24px));
  border-radius: 14px;
}

.contour-dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f3048;
}

.contour-dialog-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #647893;
}

.color-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #324864;
}

.color-palette {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.color-dot {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(19, 36, 58, 0.18);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.18s ease;
}

.color-dot:hover {
  transform: translateY(-1px);
}

.color-dot.active {
  box-shadow: 0 0 0 3px rgba(47, 103, 216, 0.22), 0 6px 12px rgba(19, 36, 58, 0.2);
}

.custom-color-header {
  padding-left: 0;
  padding-right: 0;
  min-height: 34px !important;
  color: #4a5f7d;
  font-size: 13px;
}

.contour-preview {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid #dfe8f6;
  background: #f8fbff;
}

.preview-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.preview-name {
  font-size: 13px;
  font-weight: 600;
  color: #2f435e;
}

.delete-confirm-card {
  width: min(460px, calc(100vw - 24px));
  border-radius: 16px;
  background: linear-gradient(165deg, #ffffff 0%, #f8fbff 100%);
}

.delete-confirm-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #f4c2c2;
  background: #fff7f7;
}

.delete-confirm-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.16);
}

.delete-confirm-label {
  font-size: 12px;
  font-weight: 700;
  color: #a61c1c;
  letter-spacing: 0.2px;
}

.delete-confirm-title {
  margin-top: 10px;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 800;
  color: #1f3048;
}

.delete-confirm-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #60728d;
}

.add-field-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.details-button {
  background: linear-gradient(135deg, #4d8cf7, #2f6fdd);
  color: #fff;
  border: none;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 5px 10px rgba(47, 111, 221, 0.3);
  font-size: 13px;
  font-weight: 700;
  width: 112px;
  line-height: 1.2;
}

.details-button:hover {
  background-color: #0056b3;
}

.map-container {
  position: relative;
  height: 100vh;
  width: 100%;
}

#map {
  height: 100vh !important;
  width: 100% !important;
}

.leaflet-top.leaflet-left {
  top: 78px;
}

.leaflet-top.leaflet-right {
  top: 78px;
}

.leaflet-control-zoom {
  box-shadow: 0 8px 20px rgba(19, 36, 58, 0.18);
  border-radius: 12px !important;
  overflow: hidden;
}

.leaflet-control-zoom a {
  transition: background-color 0.2s ease, color 0.2s ease;
}

.leaflet-control-zoom a:hover {
  background: #f0f5ff;
  color: #2f67d8;
}

.leaflet-div-icon.leaflet-editing-icon {
  width: 14px !important;
  height: 14px !important;
  margin-left: -7px !important;
  margin-top: -7px !important;
  border-radius: 999px;
  border: 2px solid #2f6fdd !important;
  background: #ffffff !important;
  box-shadow: 0 4px 10px rgba(19, 36, 58, 0.22);
}

.leaflet-draw-tooltip {
  border: 1px solid #dce6f6;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: #29415f;
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(19, 36, 58, 0.14);
}

.leaflet-draw-tooltip:before {
  border-right-color: rgba(255, 255, 255, 0.96);
}

.leaflet-interactive {
  transition: fill-opacity 0.2s ease, stroke-width 0.2s ease;
}

@media (max-width: 768px) {
  .leaflet-top.leaflet-left,
  .leaflet-top.leaflet-right {
    top: 118px;
  }
}

.popup-content {
  font-family: "Manrope", "Segoe UI", sans-serif;
  width: min(338px, calc(100vw - 44px));
  padding: 14px;
  background: linear-gradient(160deg, #ffffff 0%, #f5f8ff 100%);
  border-radius: 16px;
  box-shadow: 0 16px 32px rgba(19, 36, 58, 0.2);
  border: 1px solid #d9e5fb;
}

.premium-popup {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.popup-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.popup-title {
  font-size: 30px;
  line-height: 1.1;
  font-weight: 800;
  color: #21324d;
  letter-spacing: 0.2px;
}

.popup-subtitle {
  color: #5b7090;
  font-size: 14px;
}

.popup-preview-row {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #edf4ff;
  border: 1px solid #d5e2f8;
}

.popup-preview-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  box-shadow: 0 0 0 3px rgba(47, 103, 216, 0.18);
}

.popup-preview-text {
  font-size: 12px;
  font-weight: 700;
  color: #2d4464;
}

.popup-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.premium-action {
  width: 100%;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}

.premium-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 14px rgba(47, 111, 221, 0.3);
}

.action-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.24);
  border: 1px solid rgba(255, 255, 255, 0.42);
}

.meteo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  color: #2b3d58;
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: #f6f9ff;
}

.meteo-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  margin-right: 5px;
  color: #2f67d8;
  border: 1px solid #d7e4ff;
  background: #fff;
}

.external-block-title {
  font-size: 12px;
  font-weight: 800;
  color: #30507a;
  letter-spacing: 0.25px;
  margin: 2px 0 6px;
}

.external-block-title--dzz {
  margin-top: 10px;
  color: #0f766e;
}

.external-note {
  margin-top: 6px;
  font-size: 12px;
  color: #5b7090;
}

.details-button {
  color: #fff;
  background: linear-gradient(135deg, #4d8cf7, #2f6fdd);
  border: none;
  border-radius: 8px;
  box-shadow: 0 5px 10px rgba(47, 111, 221, 0.3);
}

.details-button:hover {
  background-color: #0056b3; /* Hover button background color */
}

.dzz-action {
  background: linear-gradient(135deg, #14b8a6, #0f9f90);
  box-shadow: 0 5px 10px rgba(15, 159, 144, 0.28);
}

.danger-action {
  background: linear-gradient(135deg, #f76666, #dc2626);
  box-shadow: 0 5px 10px rgba(220, 38, 38, 0.28);
}

.premium-meteo-card {
  margin-top: 2px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e6edf9;
  background: #fcfdff;
}

.leaflet-popup-content {
  margin: 0 !important;
}

.leaflet-popup-content-wrapper {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

.leaflet-popup-tip-container {
  display: none;
}

.leaflet-container a.leaflet-popup-close-button {
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  padding: 0;
  line-height: 28px;
  border-radius: 999px;
  font-size: 26px;
  color: #60728d;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d8e3f7;
  box-shadow: 0 6px 12px rgba(19, 36, 58, 0.15);
  text-align: center;
  z-index: 5;
}

.leaflet-container a.leaflet-popup-close-button:hover {
  color: #233a5d;
  background: #ffffff;
}

@media (max-width: 768px) {
  .delete-confirm-card {
    width: min(430px, calc(100vw - 18px));
    border-radius: 14px;
  }

  .delete-confirm-title {
    font-size: 18px;
  }

  .popup-content {
    width: min(320px, calc(100vw - 20px));
    padding: 12px;
    border-radius: 14px;
  }

  .premium-popup {
    gap: 10px;
  }

  .popup-title {
    font-size: 22px;
  }

  .popup-subtitle {
    font-size: 13px;
  }

  .popup-preview-row {
    padding: 5px 9px;
  }

  .popup-actions {
    gap: 6px;
  }

  .premium-action {
    min-height: 40px;
    font-size: 12px;
    border-radius: 10px;
  }

  .action-icon {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }

  .premium-meteo-card {
    padding: 8px;
  }

  .meteo-item {
    font-size: 13px;
    padding: 5px 7px;
  }

  .leaflet-container a.leaflet-popup-close-button {
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    line-height: 26px;
    font-size: 24px;
  }
}

@media (max-width: 420px) {
  .popup-content {
    width: min(304px, calc(100vw - 14px));
    padding: 10px;
  }

  .popup-actions {
    grid-template-columns: 1fr;
  }

  .popup-title {
    font-size: 20px;
  }
}
</style>
