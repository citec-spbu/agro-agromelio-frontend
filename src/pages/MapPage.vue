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
          <q-btn flat dense no-caps label="Отмена" @click="cancelColorSelection" />
          <q-btn
            unelevated
            dense
            no-caps
            label="Сохранить"
            color="primary"
            :disable="!isContourNameValid"
            @click="applyColorSelection"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- кнопки для добаления сезона/поля выпадающий список из сезонов/полей -->
    <dropdown-or-add-season-field-buttons
      @startDrawing="startDrawing"
      @removeSelectedPolygon="removeSelectedPolygon"
      @undoLastAction="undoLastAction"
      @postContours="postContours"
      @selectedField="updateSelectedField"
      @isEditMode="toggleEditMode"
      @isPointDeleteMode="togglePointDeleteMode"
      :updateFields="updateFieldsInChild"
      :polygonIsFinished="polygonIsFinished"
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
    const isPointDeleteMode = ref(false);
    const activeField = ref(sessionStorage.getItem("activeField"));
    let deleteStack = []; // Стек для хранения истории всех действий
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
    const colorPresets = ["#2f6fdd", "#17b26a", "#f79009", "#ef4444", "#8b5cf6", "#14b8a6"];
    let currentLayer = null; // 当前绘制的多边形图层 Текущий слой нарисованных полигонов
    const selectPresetColor = (color) => {
      selectedColor.value = color;
    };
    const toggleEditMode = (isEditModeOn) => {
      isEditMode.value = isEditModeOn;
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

    const clearPolygons = () => {
      map.value.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          // Проверяем, является ли слой полигоном
          map.value.removeLayer(layer);
        }
      });
      selectedPolygon = null;
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
    const contourItems = ref([]);

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

          // Используем for...of для обработки асинхронных данных
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

            const popupContent = `
          <div class="popup-content premium-popup">
            <div class="popup-head">
              <div class="popup-title">${contour.name}</div>
              <div class="popup-subtitle">Поле: ${
                JSON.parse(sessionStorage.getItem("activeField")).name
              }</div>
            </div>
            <div class="popup-actions">
              <button id="contour-info-${
                contour.id
              }" class="details-button premium-action">
                <span class="action-icon">C</span>
                <span>Контур</span>
              </button>
              <button id="field-info-${
                JSON.parse(sessionStorage.getItem("activeField")).id
              }" class="details-button premium-action">
                <span class="action-icon">M</span>
                <span>Погода</span>
              </button>
              <button id="field-dzz-${
                JSON.parse(sessionStorage.getItem("activeField")).id
              }" class="details-button premium-action dzz-action">
                <span class="action-icon">D</span>
                <span>ДЗЗ</span>
              </button>
            </div>
            <div id="meteo-data-${
              selectedField.value.id
            }" class="meteo-data premium-meteo-card">Загрузка...</div>
          </div>
        `;

            // Связываем попап с полигоном
            polygon.bindPopup(popupContent);
            // Обработчик клика по полигону
            polygon.on("click", (e) => {
              if (isDrawInProgress()) return;
              if (isEditMode.value) {
                polygon.closePopup();
                selectPolygon(polygon);
                if (isPointDeleteMode.value) {
                  removeNearestVertexFromSelectedPolygon(e.latlng);
                }
                return;
              } else {
                console.log("Editing mode inactive. Opening popup...");
                polygon.closePopup(); // Закрываем попап, если он был открыт
                polygon.openPopup(); // Открываем попап в режиме просмотра
              }
            });

            polygon.on("popupopen", async () => {
              // Если в режиме редактирования, попап не открывается
              if (isEditMode.value) {
                polygon.closePopup(); // Закрываем попап
                colorDialog.value = true; // Открытие диалога для редактирования
                return;
              }
              const contourInfoButton = document.getElementById(
                `contour-info-${contour.id}`
              );
              contourInfoButton.addEventListener("click", () =>
                handleContourPopupClick(contour)
              );

              const fieldInfoButton = document.getElementById(
                `field-info-${selectedField.value.id}`
              );
              fieldInfoButton.addEventListener("click", () => handleFieldPopupClick());

              const fieldDzzButton = document.getElementById(
                `field-dzz-${selectedField.value.id}`
              );
              fieldDzzButton.addEventListener("click", () => handleFieldDzzPopupClick());

              try {
                const meteoResponse = await axios.get(
                  `${process.env.VUE_APP_BASE_URL}/api/meteo/preview/${selectedField.value.id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                  }
                );
                const meteoData = meteoResponse.data;
                document.getElementById(
                  `meteo-data-${selectedField.value.id}`
                ).innerHTML = `
              <div class="meteo-item"><span class="meteo-icon">T</span><span>Температура</span><strong>${
                meteoData.temperature !== null && meteoData.temperature !== undefined
                  ? Number(meteoData.temperature).toFixed(1)
                  : "-"
              } °C</strong></div>
              <div class="meteo-item"><span class="meteo-icon">H</span><span>Влажность</span><strong>${
                meteoData.humidity !== null && meteoData.humidity !== undefined
                  ? Number(meteoData.humidity).toFixed(1)
                  : "-"
              } %</strong></div>
              <div class="meteo-item"><span class="meteo-icon">W</span><span>Ветер</span><strong>${
                meteoData.wind_speed !== null && meteoData.wind_speed !== undefined
                  ? Number(meteoData.wind_speed).toFixed(1)
                  : "-"
              } м/с</strong></div>
            `;
              } catch (error) {
                console.error("Error fetching meteo data:", error);
                document.getElementById(
                  `meteo-data-${selectedField.value.id}`
                ).innerHTML = " Нет метеоданных.";
              }
            });
          }
        } catch (error) {
          console.error("Error fetching contours data:", error);
        }
      }
    };

    // Отмена выбора цвета
    const cancelColorSelection = () => {
      if (currentLayer) {
        drawnItems.removeLayer(currentLayer);
        currentLayer = null;
      }
      colorDialog.value = false;
      contourName.value = "";
    };

    const applyColorSelection = () => {
      if (!isContourNameValid.value) {
        return;
      }
      if (currentLayer) {
        currentLayer.setStyle({
          color: selectedColor.value,
          fillColor: selectedColor.value,
          fillOpacity: 0.35,
          weight: 2.5,
        });
        currentLayer.feature.properties.name = contourName.value.trim();
        if (!drawnItems.hasLayer(currentLayer)) {
          drawnItems.addLayer(currentLayer);
        }
        currentLayer = null;
      }
      colorDialog.value = false;
      contourName.value = "";
      console.log("Selected color:", selectedColor.value);
    };

    //при нажатии на кнопку добавления контура в DropdownOrAddSeasonFieldButtons, рисовать полигон
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

    const removeNearestVertexFromSelectedPolygon = (clickLatLng) => {
      if (!selectedPolygon) {
        $q.notify({
          type: "warning",
          message: "Сначала выберите контур",
        });
        return;
      }
      const latLngGroups = selectedPolygon.getLatLngs();
      const ring = Array.isArray(latLngGroups?.[0]) ? latLngGroups[0] : latLngGroups;
      if (!Array.isArray(ring) || ring.length <= 3) {
        $q.notify({
          type: "warning",
          message: "У контура должно остаться минимум 3 точки",
        });
        return;
      }
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      ring.forEach((vertex, idx) => {
        const distance = clickLatLng.distanceTo(vertex);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = idx;
        }
      });

      if (nearestIndex < 0 || nearestDistance > 35) {
        $q.notify({
          type: "info",
          message: "Кликните ближе к нужной точке контура",
        });
        return;
      }

      const updatedRing = ring.filter((_, idx) => idx !== nearestIndex);
      selectedPolygon.setLatLngs([updatedRing]);
      selectPolygon(selectedPolygon);
      $q.notify({
        type: "positive",
        message: "Точка удалена",
      });
    };

    const polygonIsFinished = ref(false);
    const togglePointDeleteMode = (isEnabled) => {
      isPointDeleteMode.value = isEnabled;
    };
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
            // добавляем чтобы можно было дать имя полигону
            layer.feature = layer.feature || { type: "Feature" };
            layer.feature.properties = layer.feature.properties || {};
            layer.feature.properties.name = ""; // Временное пустое имя
            // Добавляем обработчик клика на полигон
            layer.on("click", (e) => {
              if (isDrawInProgress()) return;
              if (!isEditMode.value) return;
              selectPolygon(layer);
              if (isPointDeleteMode.value) {
                removeNearestVertexFromSelectedPolygon(e.latlng);
              }
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
            // При создании нового полигона проверяется, не пересекается ли он с существующими:
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

                // Проверяем пересечение

                if(turf.booleanOverlap(turfNew, turfExisting)){
                  console.log("Пересечение найдено!");
                  return true;
                }
              }
              return false;
            }

            // Проходимся по нарисованным элементам
            drawnItems.eachLayer((existingLayer) => {
              const existingPolygon = existingLayer.toGeoJSON();
              if (checkIntersection(existingPolygon, newPolygon)) {
                isOverlap = true;
              }
            });
            // Проходимся по слоям карты
            map.value.eachLayer((existingLayer) => {
              // Проверяем только полигоны
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
            // передаем сообщение о том что рисование было закончено из-за того что замкнули полигон, и не нужно нажимать на кнопку, чтобы выключить его
            polygonIsFinished.value = true;
            colorDialog.value = true;
          };

          // Начало рисования полигона
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
    };

    const removeSelectedPolygon = () => {
      if (selectedPolygon) {
        deleteStack.push(selectedPolygon);
        // Удаляем слой из группы
        if (drawnItems.hasLayer(selectedPolygon)) {
          drawnItems.removeLayer(selectedPolygon);
        }

        // Удаляем слой с карты
        if (map.value.hasLayer(selectedPolygon)) {
          map.value.removeLayer(selectedPolygon);
        }

        selectedPolygon = null; // Сбрасываем выбранный полигон
        console.log("Selected polygon removed");
      } else {
        $q.notify({
          message: "Выберите контур",
          type: "negative",
        });
        console.log("No polygon selected to remove");
      }
    };

    const undoLastAction = () => {
      // если есть маркеры на карте удаляем последнюю точку
      if (
        drawControl &&
        drawControl._markers &&
        drawControl._markers.length > 0
      ) {
        console.log("delete last painted point");
        // Удаляем последнюю маркерную точку из массива
        const lastMarker = drawControl._markers.pop();
        drawControl._markerGroup.removeLayer(lastMarker);
        // Обновляем полигон на карте, удаляя последнюю точку
        const latlngs = drawControl._markers.map((marker) =>
          marker.getLatLng()
        );
        // Обновляем отрисовку полигона
        drawControl._poly.setLatLngs(latlngs);
      } else if (deleteStack.length > 0) {
        // Восстанавливаем полигон из стека
        const lastPolygon = deleteStack.pop();
        console.log("restore polygon");
        drawnItems.addLayer(lastPolygon); // Добавляем слой обратно в коллекцию слоёв
        map.value.addLayer(lastPolygon); // Добавляем полигон на картy
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

      // преобразовываем координаты и имена контуров в массив
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
            // Извлекаем координаты из GeoJSON
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
        // если у поля есть айди то добавляем к существующему полю контуры
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

              //мб можно добавить сразу айди к контуру

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

            //в fields в sessionStorage убираем отправленное поле
            const fields = JSON.parse(sessionStorage.getItem("fields") || "[]");
            const activeField = JSON.parse(
              sessionStorage.getItem("activeField") || "[]"
            ); // Пример activeField с id

            // Удаляем объект, где id совпадает с activeField.id
            const updatedFields = fields.filter(
              (field) => field["name"] !== activeField["name"]
            );
            // Сохраняем обновленный массив в sessionStorage и добавляем id к activeField
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
        //  проверка нужно ли удалять поле (если удаляются все контуры)
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
    // Watch для обработки изменений activeField
    watch(selectedField, (newValue) => {
      clearPolygons();
      if (newValue?.id) {
        console.log("Рисуем полигоны для поля:", newValue);
        fetchDataAndDrawPolygons();
      } else {
        console.log("Для нового поля сохраненных контуров пока нет");
      }
    });

    onMounted(async () => {
      //clearPolygons();
      selectedSeason.value =
        JSON.parse(sessionStorage.getItem("activeSeason")) || null;
      selectedField.value =
        JSON.parse(sessionStorage.getItem("activeField")) || null;

      // Создание карты
      map.value = L.map("map").setView([59.420161, 30.01832], 15); //[широта, долгота], уровень_масштаба
      // Добавление тайлового слоя
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; OpenStreetMap contributors",
      }).addTo(map.value);

      map.value.addLayer(drawnItems);

      // 加载已有多边形 Загрузка существующих полигонов
      if (
        selectedSeason.value &&
        selectedField.value &&
        selectedField.value.id
      ) {
        fetchDataAndDrawPolygons();
        //если изменяется activeField sessionStorage тогда удаляются/рисуются полигоны
      }
    });

    return {
      map,
      contourName,
      colorDialog,
      selectedColor,
      colorPresets,
      selectPresetColor,
      isContourNameValid,
      cancelColorSelection,
      applyColorSelection,
      isDrawingEnabled,
      startDrawing,
      removeSelectedPolygon,
      undoLastAction,
      postContours,
      updateSelectedField,
      updateFieldsInChild,
      toggleEditMode,
      togglePointDeleteMode,
      polygonIsFinished,
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
  font-family: Arial, sans-serif;
  width: 320px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 14px;
  box-shadow: 0 14px 28px rgba(19, 36, 58, 0.18);
  border: 1px solid #e2ebf8;
}

.premium-popup {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.popup-title {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 700;
  color: #21324d;
}

.popup-subtitle {
  color: #5f718b;
  font-size: 13px;
}

.popup-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.premium-action {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}

.premium-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 14px rgba(47, 111, 221, 0.3);
}

.action-icon {
  width: 18px;
  height: 18px;
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
  font-size: 13px;
  color: #2b3d58;
  margin-bottom: 6px;
  padding: 4px 6px;
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

.details-button {
  color: #fff;
  background: linear-gradient(135deg, #4d8cf7, #2f6fdd);
  border: none;
  border-radius: 8px;
  box-shadow: 0 5px 10px rgba(47, 111, 221, 0.3);
}

.details-button:hover {
  background-color: #0056b3; /* Цвет фона кнопки при наведении */
}

.dzz-action {
  background: linear-gradient(135deg, #14b8a6, #0f9f90);
  box-shadow: 0 5px 10px rgba(15, 159, 144, 0.28);
}

.premium-meteo-card {
  margin-top: 2px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid #e6edf9;
  background: #fcfdff;
}
</style>
