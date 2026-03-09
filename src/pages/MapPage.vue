<template>
  <div class="map-container">
    <div id="map"></div>
    <!-- 颜色选择对话框 -->
    <!-- Диалог выбора цвета -->
    <q-dialog v-model="colorDialog" persistent>
      <q-card style="width: 300px">
        <q-card-section>
          <div>
            <q-input
              dense
              outlined
              v-model="contourName"
              label="Название контура"
              class="q-mb-md"
            />
          </div>
          <div>
            <text>Выберите цвет полигона:</text>
            <q-color v-model="selectedColor" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat dense label="Отмена" @click="cancelColorSelection" />
          <q-btn
            flat
            dense
            label="Применить"
            color="primary"
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
    const activeField = ref(sessionStorage.getItem("activeField"));
    let deleteStack = []; // Стек для хранения истории всех действий
    let isBorderVisible = true; // Флаг для отслеживания состояния рамки
    const contourName = ref("");
    const isNameInvalid = computed(() => contourName.value.trim());

    const selectedSeason = ref(
      JSON.parse(sessionStorage.getItem("activeSeason")) || null
    );
    const selectedField = ref(
      JSON.parse(sessionStorage.getItem("activeField")) || null
    );
    const colorDialog = ref(false); // 控制颜色选择对话框显示 Управление отображением диалогового окна выбора цвета
    const selectedColor = ref("#ff0000"); // 默认选中的颜色 Выбранный по умолчанию цвет
    let currentLayer = null; // 当前绘制的多边形图层 Текущий слой нарисованных полигонов
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
    const handleFieldPopupClick = (contour) => {
      router.push({
        name: 'FieldWeatherInfoPage', 
        query: {
          seasonId: selectedSeason.value.id,
          seasonName: selectedSeason.value.name,
          fieldId: selectedField.value.id,
          fieldName: selectedField.value.name,
          contourId: contour.id,
          contourName: contour.name
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
          <div class="popup-content">
          <strong class="contour-name">${contour.name}</strong>  <br><br>
          <text>Принадлежность к полю:</text> <br>
           <strong class="field-name">${
             JSON.parse(sessionStorage.getItem("activeField")).name
           }</strong>  <br>
             <div class="button-container">
          <button id="contour-info-${
            contour.id
          }" class="details-button">Смотреть<br>информацию<br> о контуре</button><br>
          <button id="field-info-${
            JSON.parse(sessionStorage.getItem("activeField")).id
          }" class="details-button">Смотреть<br>информацию<br> о поле</button><br>
          </div>
          <div id="meteo-data-${
            selectedField.value.id
          }" class="meteo-data">Загрузка...</div>
          </div>
        `;

            // Связываем попап с полигоном
            polygon.bindPopup(popupContent);
            // Обработчик клика по полигону
            polygon.on("click", (e) => {
              if (isEditMode.value) {
                console.log("Editing mode active. Opening edit modal...");
                polygon.closePopup(); // Закрываем попап
                currentLayer = polygon;
                contourName.value = polygon.feature.properties.name;
                colorDialog.value = true; // Открываем диалог редактирования
                selectedPolygon = polygon;
                isBorderVisible = !isBorderVisible;
                if (isBorderVisible) {
                  // Убираем рамку
                  selectedPolygon.setStyle({ weight: 0 });
                } else {
                  // Добавляем рамку
                  // Сбрасываем стиль предыдущего полигона
                  console.log("prev ", previousPolygon);
                  if (previousPolygon && previousPolygon !== polygon) {
                    previousPolygon.setStyle({ weight: 0 }); // Убираем рамку с предыдущего полигона
                  }
                  selectedPolygon.setStyle({
                    weight: 4,
                    color: "black",
                    opacity: 1,
                  }); // Толщина и цвет рамки
                  previousPolygon = polygon;
                }
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
              fieldInfoButton.addEventListener("click", () =>
                handleFieldPopupClick(
                  JSON.parse(sessionStorage.getItem("activeField")).id
                )
              );

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
              <div class="meteo-item"><i class="meteo-icon fas fa-thermometer-half"></i>Температура: ${meteoData.temperature} °C</div>
              <div class="meteo-item"><i class="meteo-icon fas fa-tint"></i>Влажность: ${meteoData.humidity} %</div>
              <div class="meteo-item"><i class="meteo-icon fas fa-wind"></i>Скорость ветра: ${meteoData.wind_speed} м/с</div>
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

    // Переход к странице добавления поля
    const goToAddPage = () => {
      router.push("/add_field");
    };

    // Отмена выбора цвета
    const cancelColorSelection = () => {
      if (currentLayer) {
        drawnItems.removeLayer(currentLayer);
        currentLayer = null;
      }
      colorDialog.value = false;
      contourName.value = null;
    };

    //     Диалог выбора цвета: Пользователь может выбрать цвет, который применяется к текущему полигону.
    const applyColorSelection = () => {
      if (!isNameInvalid.value) {
        return; // Если имя пустое, не закрываем окно
      }
      if (currentLayer) {
        currentLayer.setStyle({
          color: selectedColor.value,
          fillColor: selectedColor.value,
          fillOpacity: 0.5,
        });
        currentLayer.feature.properties.name = contourName.value;
        if (!drawnItems.hasLayer(currentLayer)) {
          drawnItems.addLayer(currentLayer);
        }
        currentLayer = null;
      }
      colorDialog.value = false;
      contourName.value = null;
      console.log("Selected color:", selectedColor.value);
    };

    //при нажатии на кнопку добавления контура в DropdownOrAddSeasonFieldButtons, рисовать полигон
    let drawControl = null;
    let drawnHandler = null; // Объявляем переменную для обработчика
    let selectedPolygon = null; // Переменная для хранения выделенного полигона
    let previousPolygon = null; // Хранит ссылку на ранее выделенный полигон

    const polygonIsFinished = ref(false);
    const startDrawing = (isDrawing) => {
      isDrawingEnabled.value = isDrawing;

      if (isDrawingEnabled.value) {
        if (!drawControl) {
          drawControl = new L.Draw.Polygon(map.value, {
            shapeOptions: { color: "blue" },
          });
        }
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
            layer.on("click", () => {
              // Устанавливаем стиль для нового выбранного полигона
              selectedPolygon = layer;
              isBorderVisible = !isBorderVisible;
              // Сбрасываем стиль предыдущего полигона
              if (previousPolygon && previousPolygon !== polygon) {
                previousPolygon.setStyle({ weight: 0 }); // Убираем рамку с предыдущего полигона
              }
              if (isBorderVisible) {
                // Убираем рамку
                selectedPolygon.setStyle({ weight: 0 });
              } else {
                // Добавляем рамку
                selectedPolygon.setStyle({
                  weight: 4,
                  color: "black",
                  opacity: 1,
                }); // Толщина и цвет рамки
              previousPolygon = polygon;
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
              fillOpacity: 0.5,
            });
            console.log("Polygon coordinates:", layer.getLatLngs());

            drawnItems.addLayer(layer);
            map.value.addLayer(drawnItems);
            currentLayer = layer;
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
        }
      } else {
        console.log("else");
        if (drawControl) {
          drawControl.disable(); // Отключаем режим рисования
          if (drawnHandler) {
            map.value?.off("draw:created", drawnHandler);
            drawnHandler = null; // Сбрасываем обработчик
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
          updateFieldsInChild.value = true; // Переключаем состояние на true
          setTimeout(() => {
            eventTriggered.value = false; // Переключаем обратно на false после задержки
          }, 1000); // Задержка в 1 секунду}
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
      if (newValue) {
        console.log("Рисуем полигоны для поля:", newValue);
        fetchDataAndDrawPolygons(); // Функция рисует полигоны
      } else {
        console.log("Удаляем полигоны с карты");
        clearPolygons(); // Функция удаляет полигоны
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
      goToAddPage,
      colorDialog,
      selectedColor,
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
}

#map {
  height: 100vh !important;
  width: 100% !important;
}

.add-field-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.details-button {
  background-color: #007bff;
  color: #fff;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 5px;
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
  /*top: 120px;*/
}

.popup-content {
  font-family: Arial, sans-serif;
  width: 300px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.popup-content .contour-name {
  font-size: 30px;
  color: #333;
}

.field-name {
  font-size: 16px;
  color: #4b4949;
  padding-top: 10px;
}

.popup-content .field-description {
  font-size: 14px;
  color: #555;
  margin-bottom: 10px;
}

/*.popup-content .details-button {
  display: inline-block;
  padding: 8px 12px;
  margin-bottom: 10px;
  background-color: #007bff;
  color: #ffffff;
  text-align: center;
  border-radius: 5px;
  text-decoration: none;
  cursor: pointer;
}*/

.popup-content .details-button:hover {
  background-color: #0056b3;
}

.popup-content .meteo-data {
  margin-top: 10px;
}

.meteo-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.meteo-icon {
  margin-right: 5px;
  color: #007bff;
}

.button-container {
  display: flex; /* Используем Flexbox для горизонтального расположения */
  gap: 5px; /* Расстояние между кнопками */
  height: 50px;
  justify-content: center; /* Центровка по горизонтали */
  margin-top: 20px;
  margin-bottom: 20px;
}

.details-button {
  font-size: 13px; /* Размер шрифта на кнопках */
  color: rgba(0, 0, 0, 0.726); /* Цвет текста на кнопках */
  padding-left: 10px;
  width: 110px;
  font-weight: bold;

  background-color: #007bff; /* Цвет фона на кнопках */
  border: none; /* Убираем границу кнопки */
  padding: 4px; /* Отступы внутри кнопки */
  border-radius: 5px; /* Скругление углов кнопки */
  line-height: 1; /* Меньший междустрочный отступ */
}

.details-button:hover {
  background-color: #0056b3; /* Цвет фона кнопки при наведении */
}
</style>
