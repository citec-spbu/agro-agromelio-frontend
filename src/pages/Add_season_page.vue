<template>
  <q-page padding class="form-page">
    <q-card class="form-card">
      <q-card-section>
        <h5 class="form-title q-my-none">Создание сезона</h5>
      </q-card-section>
      <q-card-section v-show="formData">
      <q-input
        v-model="formData.name"
        label="Название сезона"
        autogrow
        outlined
        class="q-mb-lg"
      ></q-input>
      <div class="date-entering">
        <q-input
          v-model="formData.startDate"
          filled
          type="date"
          outlined
          hint="Дата начала сезона"
          class="q-mb-lg"
        />
        <q-input
          v-model="formData.endDate"
          filled
          type="date"
          outlined
          hint="Дата конца сезона"
          class="q-mb-lg"
        />
      </div>
      <q-btn
        label="Готово"
        @click="submitData"
        :disabled="isSubmitDisabled"
        color="primary"
        class="full-width-button"
      ></q-btn>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref, computed } from "vue";
import axios from "axios";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import { userStore } from "src/usage";

export default {
  name: "AddSeasonPage",
  setup() {
    const router = useRouter();
    const formData = ref({
      name: "",
      startDate: "",
      endDate: "",
    });
    // const seasonStore = useSeasonStore();
    const $q = useQuasar();

    const goToMapPage = () => {
      console.log(formData.value);
      // сохраняем активный сезон в хранилище
      sessionStorage.setItem("activeSeason", JSON.stringify(formData.value));
      router.push({
        path: "/map",
      });
    };

    const isSubmitDisabled = computed(() => {
      return (
        !formData.value.name ||
        !formData.value.startDate ||
        !formData.value.endDate
      );
    });

    const accessToken = userStore.state.access_token;
    //click submit function
    const submitData = () => {
      //check if everydata is exsist
      if (!accessToken) {
        console.error("No access token available");
        $q.notify({
          type: "negative",
          message: "Залогиньтесь, пожалуйста",
        });
        return;
      }
      if (isSubmitDisabled.value) {
        $q.notify({
          type: "negative",
          message: "Пожалуйста, заполните все поля",
        });
        return;
      }

      console.log("success");
      console.log((formData.value["season"] = "SeasonBaseDTO"));
      console.log("Submitting data:", JSON.stringify(formData.value));
      axios
        .post(
          `${process.env.VUE_APP_BASE_URL}/api/fields-service/season`,
          formData.value,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )
        .then((response) => {

          $q.notify({
            type: "positive",
            message: "Сезон успешно создан",
          });
          formData.value.id = response.data.id;
          // // переходим на страницу карты в квери передавая созданный сезон

          goToMapPage();
        })
        .catch((error) => {
          if (error.response && error.response.status === 500) {
            $q.notify({
              type: "negative",
              message: "Неизвестная ошибка",
            });
          }
          console.error("Error submitting data", error);
        });
    };

    return {
      formData,
      submitData,
      isSubmitDisabled,
    };
  },
};
</script>

<style>
.form-page {
  display: flex;
  justify-content: center;
}

.form-card {
  width: min(620px, 100%);
}

.form-title {
  color: #24344f;
  font-weight: 700;
}

.full-width-button {
  width: 100%;
}

</style>
