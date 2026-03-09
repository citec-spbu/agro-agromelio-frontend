<template>
  <q-page padding>
    <div class="q-pa-md q-gutter-md">
      <q-card>
        <q-card-section>
          <div class="text-h6">Севооборот</div>
        </q-card-section>
        <q-card-section>

          <div class="row items-center no-wrap" style="width: 100%;">
            <div class="col-auto">
              <q-select
                v-model="OnSeason"
                label="Выбор сезона"
                :options="seasons"
                option-value="value"
                option-label="label"
                dense
                outlined
                class="season-select"
                @update:model-value="fetchFields"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card class="q-mt-md">
        <q-card-section>
          <div class="text-h6">Информация о культурах</div>
        </q-card-section>
        <q-card-section>
          <div class="table-scroll-container">
            <q-table
              flat
              bordered
              :rows="fieldsData"
              :columns="fieldsColumns"
              row-key="contourId"
              class="fixed-table"
            >
              <template v-slot:body-cell-fieldName="props">
                <q-td :props="props" class="field-name-cell">
                  <div :style="{ visibility: props.row.contourId === firstContourId(props.row.fieldId) ? 'visible' : 'hidden' }">
                    {{ props.row.fieldName }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-contours="props">
                <q-td :props="props" class="contours-cell">
                  <div :style="{ color: ensureColorFormat(props.row.contourColor) }">
                    {{ props.row.contourName }} ({{ props.row.squareArea }} га)
                    <q-btn
                      flat
                      icon="edit"
                      color="primary"
                      @click="navigateToEditPage(props.row.contourId)"
                    />
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-cropRotations="props">
                <q-td :props="props" class="crop-rotations-cell">
                  <div class="crop-rotations">
                    <div
                      v-for="crop in props.row.cropRotations"
                      :key="crop.cropRotationId"
                      class="crop-rotation-item"
                    >
                      <div class="crop-name">{{ crop.culture }} ({{ crop.cultivar }})</div>
                      <div class="timeline">
                        <span class="timeline-date left">{{ formatDate(crop.startDate) }}</span>
                        <span class="timeline-dot"></span>
                        <span
                          class="timeline-line"
                          :style="{ width: '200px' }"
                        ></span>
                        <span class="timeline-dot"></span>
                        <span class="timeline-date right">{{ formatDate(crop.endDate) }}</span>
                      </div>
                    </div>
                  </div>
                </q-td>
              </template>
            </q-table>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { userStore } from 'src/usage';

export default {
  name: 'SeasonPage',
  setup() {
    const router = useRouter();
    const $q = useQuasar();

    const OnSeason = ref(null);
    const seasons = ref([]);
    const fieldsData = ref([]);
    const accessToken = computed(() => userStore.state.access_token);

    const fieldsColumns = [
      { name: 'fieldName', label: 'поля', align: 'center', field: 'fieldName'},
      { name: 'contours', label: 'Контуры', align: 'center', field: 'contours'},
      { name: 'cropRotations', label: 'Посевы', align: 'center', field: 'cropRotations'}
    ];

    onMounted(async () => {
      try {
        const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons`, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            'Content-Type': 'application/json'
          }
        });
        seasons.value = response.data.map(season => ({
          label: season.name,
          value: season.id 
        }));
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: 'Failed to load seasons. Please check your connection or try again later.',
          icon: 'warning'
        });
      }
    });

    const fetchFields = async (OnSeason) => {
      if (!OnSeason || !OnSeason.value) return;

      const seasonId = OnSeason.value;
      const seasonName = OnSeason.label;

      try {
        const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons/full`, {
          headers: {
            Authorization: `Bearer ${accessToken.value}`,
            'Content-Type': 'application/json'
          }
        });

        const data = response.data;
        const currentSeason = data.find(season => season.id === seasonId);

        if (!currentSeason || !currentSeason.fields || currentSeason.fields.length === 0) {
          fieldsData.value = [];
          $q.notify({
            color: 'warning',
            message: 'No fields found for the selected season.',
            icon: 'info'
          });
        } else {
          fieldsData.value = currentSeason.fields.flatMap(field => {
            return field.contours.map(contour => ({
              seasonId: seasonId,
              seasonName: seasonName,
              fieldId: field.id,
              fieldName: field.name,
              contourId: contour.id,
              contourName: contour.name,
              contourColor: contour.color,
              squareArea: contour.squareArea,
              cropRotations: contour.cropRotations.map(rotation => ({
                cropRotationId: rotation.id,
                culture: rotation.culture,
                cultivar: rotation.cultivar,
                startDate: rotation.startDate,
                endDate: rotation.endDate,
                description: rotation.description
              }))
            }));
          });
        }
      } catch (error) {
        $q.notify({
          color: 'negative',
          message: 'Failed to load field data. Please check your connection or try again later.',
          icon: 'warning'
        });
        fieldsData.value = [];
      }
    };

    const calculateTimelineWidth = () => {
      return '200px'; // Fixed width for all timeline bars
    };

    const firstContourId = (fieldId) => {
      const fieldContours = fieldsData.value.filter(row => row.fieldId === fieldId);
      return fieldContours[0]?.contourId;
    };

    const formatDate = (date) => {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(date).toLocaleDateString('ru-RU', options);
    };

    const ensureColorFormat = (color) => {
      return color.startsWith('#') ? color : `#${color}`;
    };

    const navigateToEditPage = (contourId) => {
      const contourData = fieldsData.value.find(row => row.contourId === contourId);
      if (contourData) {
        router.push({
          name: 'RotationPage',
          query: {
            seasonId: contourData.seasonId,
            seasonName: contourData.seasonName,
            fieldId: contourData.fieldId,
            fieldName: contourData.fieldName,
            contourId: contourData.contourId,
            contourName: contourData.contourName
          }
        });
      }
    };

    return {
      seasons,
      OnSeason,
      fieldsData,
      fieldsColumns,
      fetchFields,
      calculateTimelineWidth,
      formatDate,
      ensureColorFormat,
      navigateToEditPage,
      firstContourId
    };
  }
};
</script>

<style scoped>
.season-select {
  width: 200px;
}

.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  position: relative;
}

.fixed-table {
  table-layout: fixed;
  width: 100%;
  min-width: 1200px;
}

.fixed-table thead th {
  background-color: #f5f5f5;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 2;
  text-align: center;
  white-space: nowrap;
  padding: 12px;
}

.field-name-cell {
  width: 240px;
  min-width: 240px;
  text-align: center;
  vertical-align: middle;
  white-space: normal;
  padding: 12px;
}

.contours-cell {
  width: 360px;
  min-width: 360px;
  text-align: center;
  vertical-align: middle;
  white-space: normal;
  padding: 12px;
}

.crop-rotations-cell {
  min-width: 600px;
  width: auto;
  text-align: left;
  padding: 12px;
}

.crop-rotations {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 80px;
  padding-right: 24px;
  align-items: center;
}

.crop-rotation-item {
  flex: 0 0 auto;
  min-width: 250px;
  text-align: center;
  position: relative;
  margin-bottom: 20px;
}

.crop-name {
  margin-bottom: 8px;
  white-space: nowrap;
  font-weight: 500;
  text-align: center;
}

.timeline {
  display: flex;
  align-items: center;
  position: relative;
  margin: 8px 0;
  padding: 0 20px;
  min-width: 200px;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  background-color: #2196F3;
  border-radius: 50%;
  z-index: 2;
  flex-shrink: 0;
  margin-left: -3px;
  margin-right: -3px;
}

.timeline-line {
  height: 2px;
  background-color: #2196F3;
  margin: 0 6px;
  width: 200px;
}

.timeline-date {
  font-size: 0.75em;
  background-color: white;
  padding: 2px 4px;
  border-radius: 2px;
  white-space: nowrap;
  position: absolute;
  top: 14px;
  z-index: 3;
}

.timeline-date.left {
  transform: translateX(-50%);
}

.timeline-date.right {
  transform: translateX(50%);
  right: 0;
}

.q-btn.flat {
  margin-left: 8px;
  padding: 4px;
}

.q-table {
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.q-td {
  border-right: none;
}
</style>
