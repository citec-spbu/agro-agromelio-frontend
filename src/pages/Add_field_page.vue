<template>
  <q-page padding class="form-page">
    <q-card class="form-card">
      <q-card-section>
        <h5 class="form-title q-my-none">Создание поля</h5>
        <div class="form-subtitle">После создания вы сразу вернётесь на карту и сможете рисовать контуры.</div>
      </q-card-section>

      <q-card-section v-show="formData">
        <q-form @submit.prevent="submitData">
          <q-input v-model="formData.name" label="Название поля" outlined autofocus class="q-mb-md" />
          <q-input v-model="formData.description" label="Описание поля" type="textarea" autogrow outlined class="q-mb-md" />
          <div class="actions-row">
            <q-btn flat no-caps label="Назад к карте" color="grey-8" @click="goBackToMap" />
            <q-btn
              no-caps
              label="Создать и перейти к контурам"
              type="submit"
              :disable="isSubmitDisabled"
              color="primary"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>
<script>
  import { ref, computed } from "vue";
  import { useQuasar } from "quasar";
  import { useRouter } from "vue-router";
  import { userStore } from "src/usage";

  export default {
    name: "AddFieldPage",
    setup() {
      const router = useRouter();
      const $q = useQuasar();
      const formData = ref({
        name: "",
        description: "",
      });
      const accessToken = userStore.state.access_token;

      const isSubmitDisabled = computed(() => {
        return !formData.value.name.trim() || !formData.value.description.trim();
      });

      const goBackToMap = () => {
        router.push({ path: "/map" });
      };

      const goToMapPage = (draftField) => {
        let existingArray = JSON.parse(sessionStorage.getItem("fields")) || [];
        existingArray = existingArray.map((field) => ({
          ...field,
          __localId: field.__localId || `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        }));
        existingArray.push(draftField);
        sessionStorage.setItem("fields", JSON.stringify(existingArray));
        sessionStorage.setItem("activeField", JSON.stringify(draftField));
        goBackToMap();
      };

      const submitData = () => {
        if (!accessToken) {
          $q.notify({
            type: "negative",
            message: "Залогиньтесь, пожалуйста",
          });
          return;
        }

        const activeSeason = JSON.parse(sessionStorage.getItem("activeSeason") || "null");
        if (!activeSeason?.id) {
          $q.notify({
            type: "warning",
            message: "Сначала выберите сезон на карте",
          });
          router.push({ path: "/map" });
          return;
        }

        if (isSubmitDisabled.value) {
          $q.notify({
            type: "negative",
            message: "Пожалуйста, заполните все поля",
          });
          return;
        }

        const normalizedName = formData.value.name.trim();
        const allDrafts = JSON.parse(sessionStorage.getItem("fields") || "[]");
        const duplicate = allDrafts.some(
          (field) =>
            field.seasonId === activeSeason.id &&
            String(field.name || "").toLowerCase() === normalizedName.toLowerCase()
        );
        if (duplicate) {
          $q.notify({
            type: "warning",
            message: "Поле с таким названием уже создано в выбранном сезоне",
          });
          return;
        }

        const draftField = {
          name: normalizedName,
          description: formData.value.description.trim(),
          seasonId: activeSeason.id,
          __localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        };

        $q.notify({
          type: "positive",
          message: "Поле успешно создано",
        });
        goToMapPage(draftField);
      };

      return {
        formData,
        submitData,
        isSubmitDisabled,
        goBackToMap,
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

.form-subtitle {
  margin-top: 6px;
  color: #647893;
  font-size: 13px;
}

.actions-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

</style>
