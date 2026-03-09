<template>
  <div class="q-pa-md soil-info-container">
    <div class="text-h5 font-bold">
      {{ isEditMode ? "Редактировать данные о почве" : "Добавление данных о составе почвы" }}
    </div>

    <div class="q-mt-md q-gutter-y-xs info-section">
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Сезон:</span>
        <span class="value col text-subtitle1">{{ seasonName }}</span>
      </div>
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Поле:</span>
        <span class="value col text-subtitle1">{{ fieldName }}</span>
      </div>
      <div class="info-item row">
        <span class="label col-auto text-subtitle1 font-bold">Контур:</span>
        <span class="value col text-subtitle1">{{ contourName }}</span>
      </div>
    </div>

    <div class="q-mt-md">
      <q-input v-model="formData.sampleDate" label="Дата отбора пробы" hint="Формат: YYYY-MM-DD" mask="####-##-##" outlined dense class="q-mb-md" />
      <q-input v-model="formData.ph" label="pH" outlined dense class="q-mb-md" />
      <q-input v-model="formData.organicMatter" label="Органическое вещество" outlined dense class="q-mb-md" />
      <q-input v-model="formData.mobileP" label="Подвижный фосфор (P)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.mobileK" label="Подвижный калий (K)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.mobileS" label="Подвижная сера (S)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.nitrateN" label="Нитратный азот (N)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.ammoniumN" label="Аммонийный азот (N)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.hydrolyticAcidity" label="Гидролитическая кислотность" outlined dense class="q-mb-md" />
      <q-input v-model="formData.caExchange" label="Кальций (обменный)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.mgExchange" label="Магний (обменный)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.b" label="Бор (B)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.co" label="Кобальт (Co)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.mn" label="Марганец (Mn)" outlined dense class="q-mb-md" />
      <q-input v-model="formData.zn" label="Цинк (Zn)" outlined dense class="q-mb-md" />
    </div>

    <div class="button-section q-mt-md row no-gutters items-center">
      <q-btn :label="isEditMode ? 'Сохранить изменения' : 'Сохранить'" @click="saveSoilInfo" color="primary" push />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { useQuasar } from "quasar";
import { userStore } from "src/usage";

export default {
  name: "add_soil",
  setup() {
    const $q = useQuasar();
    const route = useRoute();
    const router = useRouter();
    const accessToken = ref(userStore.state.access_token);

    const seasonName = ref(route.query.seasonName || "");
    const seasonId = ref(route.query.seasonId);
    const fieldName = ref(route.query.fieldName || "");
    const fieldId = ref(route.query.fieldId);
    const contourName = ref(route.query.contourName || "");
    const contourId = ref(route.query.contourId);

    const isEditMode = ref(!!route.query.soilInfoId);
    const soilId = ref(route.query.soilInfoId || "");

    const getCurrentDate = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formData = ref({
      sampleDate: getCurrentDate(),
      ph: "",
      organicMatter: "",
      mobileP: "",
      mobileK: "",
      mobileS: "",
      nitrateN: "",
      ammoniumN: "",
      hydrolyticAcidity: "",
      caExchange: "",
      mgExchange: "",
      b: "",
      co: "",
      mn: "",
      zn: "",
    });

    onMounted(() => {
      if (isEditMode.value) {
        Object.keys(formData.value).forEach((key) => {
          if (route.query[key]) {
            formData.value[key] = route.query[key];
          }
        });
      }
    });

    const saveSoilInfo = async () => {
      const apiUrl = `${process.env.VUE_APP_BASE_URL}/api/fields-service`;
      const payload = { ...formData.value };

      try {
        if (isEditMode.value) {
          await axios.put(`${apiUrl}/soil-composition`, payload, {
            params: { id: soilId.value },
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              "Content-Type": "application/json",
            },
          });
          $q.notify({
            type: "positive",
            message: "Изменения успешно сохранены",
            icon: "check_circle",
          });
        } else {
          await axios.post(`${apiUrl}/contours/${contourId.value}/soil-composition`, payload, {
            headers: {
              Authorization: `Bearer ${accessToken.value}`,
              "Content-Type": "application/json",
            },
          });
          $q.notify({
            type: "positive",
            message: "Новая информация о почве успешно добавлена",
            icon: "check_circle",
          });
        }
        router.push({ 
          name: 'RotationPage' ,
          query: {
            fieldId: fieldId.value,
            fieldName: fieldName.value,
            seasonId: seasonId.value,
            seasonName: seasonName.value,
            contourName: contourName.value,
            contourId: contourId.value
          }
        }); 
      } catch (error) {
        console.error("Ошибка при сохранении данных:", error);
        $q.notify({
          type: "negative",
          message: "Ошибка при сохранении данных. Попробуйте еще раз.",
          icon: "error",
        });
      }
    };

    return {
      seasonName,
      seasonId,
      fieldName,
      fieldId,
      contourName,
      contourId,
      formData,
      isEditMode,
      saveSoilInfo,
    };
  },
};
</script>

<style scoped>
.soil-info-container {
  max-width: 700px;
  margin-left: 0;
}

.text-h5 {
  font-size: 1.5rem;
  color: #333;
}

.font-bold {
  font-weight: bold;
}

.info-section {
  margin-top: 16px;
}

.info-item {
  align-items: center;
  font-size: 1.2rem;
}

.label {
  font-weight: bold;
  width: 120px;
}

.value {
  flex-grow: 1;
}

.button-section {
  display: flex;
  gap: 16px;
}
</style>
