<template>
  <q-btn
    v-if="!isPanelVisible"
    round
    color="primary"
    icon="tune"
    class="panel-fab"
    @click="isPanelVisible = true"
  />

  <transition name="panel-float" appear>
    <div v-show="isPanelVisible" class="control-panel" :class="{ compact: isCompact }">
      <div class="panel-header">
        <div class="panel-title">Управление полем</div>
        <div class="panel-header-actions">
          <q-btn flat round dense class="panel-icon-btn" :icon="isCompact ? 'unfold_more' : 'unfold_less'" @click="isCompact = !isCompact" />
          <q-btn flat round dense class="panel-icon-btn" icon="close" @click="isPanelVisible = false" />
        </div>
      </div>

      <div class="status-row">
        <q-chip
          square
          dense
          class="status-chip status-chip-season"
          :class="{ 'status-chip-inactive': !activeSeason }"
          :icon="activeSeason ? 'event_available' : 'event_busy'"
          :color="activeSeason ? 'positive' : 'grey-8'"
          text-color="white"
        >
          {{ activeSeason ? `Сезон: ${activeSeason.name}` : "Сезон не выбран" }}
        </q-chip>
        <q-chip
          square
          dense
          class="status-chip status-chip-field"
          :class="{ 'status-chip-inactive': !activeField }"
          :icon="activeField ? 'crop_square' : 'indeterminate_check_box'"
          :color="activeField ? 'info' : 'grey-8'"
          text-color="white"
        >
          {{ activeField ? `Поле: ${activeField.name}` : "Поле не выбрано" }}
        </q-chip>
      </div>

      <div v-show="!isCompact" class="panel-body">
        <q-select
          v-model="selectedSeasonId"
          :options="seasonOptions"
          emit-value
          map-options
          option-value="value"
          option-label="label"
          label="Выбор сезона"
          outlined
          dense
          :dark="isDarkMode"
          class="control-select"
          @update:model-value="handleSeasonChange"
        />

        <q-select
          v-model="selectedFieldId"
          :options="fieldOptions"
          emit-value
          map-options
          option-value="value"
          option-label="label"
          label="Выбор поля"
          outlined
          dense
          :dark="isDarkMode"
          class="control-select"
          :disable="!activeSeason"
          @update:model-value="handleFieldChange"
        />

        <div class="panel-actions">
          <q-btn color="primary" icon="add_circle" label="Сезон" no-caps class="action-btn" @click="goToSeasonPage" />
          <q-btn color="primary" icon="add_box" label="Поле" no-caps class="action-btn" :disable="!activeSeason" @click="openCreateFieldDialog" />
          <q-btn
            flat
            :color="isDarkMode ? 'grey-3' : 'grey-8'"
            icon="restart_alt"
            label="Сброс"
            no-caps
            class="action-btn"
            @click="clearSelections"
          />
        </div>
      </div>
    </div>
  </transition>

  <q-dialog v-model="isFieldDialogOpen" persistent>
    <q-card class="field-create-dialog">
      <q-card-section class="q-pb-sm">
        <div class="dialog-title">Создать поле</div>
        <div class="dialog-subtitle">Поле будет сразу выбрано, после этого можно мгновенно рисовать контуры.</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input v-model="newField.name" label="Название поля" outlined dense autofocus class="q-mb-sm" />
        <q-input v-model="newField.description" label="Описание поля" outlined dense type="textarea" autogrow />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps label="Отмена" color="grey-7" @click="closeCreateFieldDialog" />
        <q-btn
          unelevated
          no-caps
          label="Создать и выбрать"
          color="primary"
          :disable="isCreateFieldDisabled"
          @click="createFieldAndSelect"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <map-page-edit-buttons
    v-if="activeField && activeSeason"
    @startDrawing="startDrawing"
    @undoLastAction="undoLastAction"
    @isEditMode="toggleEditMode"
    :polygonIsFinished="localPolygonIsFinished"
    :resetEditModeSignal="resetEditModeSignal"
  />
</template>

<script>
import { useRouter } from "vue-router";
import { userStore } from "src/usage";
import axios from "axios";
import { ref, onMounted, computed, watch } from "vue";
import { useQuasar } from "quasar";
import MapPageEditButtons from "./MapPageEditButtons.vue";

export default {
  name: "DropdownOrAddSeasonFieldButtons",
  components: {
    MapPageEditButtons,
  },
  props: {
    updateFields: {
      type: Boolean,
      required: true,
    },
    polygonIsFinished: {
      type: Boolean,
      required: true,
    },
    resetEditModeSignal: {
      type: Number,
      required: true,
    },
  },
  setup(props, { emit }) {
    const router = useRouter();
    const $q = useQuasar();
    const isDarkMode = computed(() => $q.dark.isActive);
    const accessToken = userStore.state.access_token;
    const activeSeason = ref(null);
    const activeField = ref(null);
    const seasonsList = ref([]);
    const fieldListAdded = ref([]);
    const fieldListSaved = ref([]);
    const selectedSeasonId = ref(null);
    const selectedFieldId = ref(null);
    const isPanelVisible = ref(true);
    const isCompact = ref(false);
    const isFieldDialogOpen = ref(false);
    const newField = ref({
      name: "",
      description: "",
    });

    const normalizeDraftFields = (fields) =>
      fields.map((field) => ({
        ...field,
        __localId: field.__localId || `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      }));

    const getFieldKey = (field) => field.id ?? field.__localId;
    const fieldList = computed(() => {
      if (!activeSeason.value?.id) return [];
      const localForSeason = fieldListAdded.value.filter((field) => field.seasonId === activeSeason.value.id);
      return [...localForSeason, ...fieldListSaved.value];
    });
    const seasonOptions = computed(() => seasonsList.value.map((season) => ({ label: season.name, value: season.id })));
    const fieldOptions = computed(() => fieldList.value.map((field) => ({ label: field.name, value: getFieldKey(field) })));
    const isCreateFieldDisabled = computed(
      () => !activeSeason.value || !newField.value.name.trim() || !newField.value.description.trim()
    );

    const startDrawing = (isDrawing) => emit("startDrawing", isDrawing);
    const undoLastAction = () => emit("undoLastAction");
    const toggleEditMode = (isEditMode) => emit("isEditMode", isEditMode);

    const goToSeasonPage = () => router.push("/add_season");

    const fetchSeasons = async () => {
      try {
        const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        seasonsList.value = response.data;
      } catch (_error) {
        seasonsList.value = [];
      }
    };

    const fetchFields = async (seasonId) => {
      try {
        const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/seasons/${seasonId}/fields`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        fieldListSaved.value = response.data;
      } catch (_error) {
        fieldListSaved.value = [];
      }
    };

    const handleSeasonChange = (seasonId) => {
      const season = seasonsList.value.find((item) => item.id === seasonId) || null;
      activeSeason.value = season;
      selectedSeasonId.value = season?.id || null;
      activeField.value = null;
      selectedFieldId.value = null;
      sessionStorage.removeItem("activeField");
      emit("selectedField");

      if (season) {
        sessionStorage.setItem("activeSeason", JSON.stringify(season));
        fetchFields(season.id);
      } else {
        sessionStorage.removeItem("activeSeason");
        fieldListSaved.value = [];
      }
    };

    const handleFieldChange = (fieldId) => {
      const field = fieldList.value.find((item) => getFieldKey(item) === fieldId) || null;
      activeField.value = field;
      selectedFieldId.value = field ? getFieldKey(field) : null;
      if (field) {
        sessionStorage.setItem("activeField", JSON.stringify(field));
      } else {
        sessionStorage.removeItem("activeField");
      }
      emit("selectedField");
    };

    const clearSelections = () => {
      activeSeason.value = null;
      activeField.value = null;
      selectedSeasonId.value = null;
      selectedFieldId.value = null;
      fieldListSaved.value = [];
      sessionStorage.removeItem("activeSeason");
      sessionStorage.removeItem("activeField");
      emit("selectedField");
    };

    const closeCreateFieldDialog = () => {
      isFieldDialogOpen.value = false;
      newField.value = {
        name: "",
        description: "",
      };
    };

    const openCreateFieldDialog = () => {
      if (!activeSeason.value) {
        $q.notify({
          type: "warning",
          message: "Сначала выберите сезон",
        });
        return;
      }
      isFieldDialogOpen.value = true;
    };

    const createFieldAndSelect = () => {
      if (isCreateFieldDisabled.value) return;

      const normalizedName = newField.value.name.trim();
      const normalizedDescription = newField.value.description.trim();
      const duplicateField = fieldList.value.some(
        (field) => String(field.name || "").toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicateField) {
        $q.notify({
          type: "warning",
          message: "Поле с таким названием уже есть в этом сезоне",
        });
        return;
      }

      const draftField = {
        name: normalizedName,
        description: normalizedDescription,
        seasonId: activeSeason.value.id,
        __localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      };
      const updatedDrafts = [...fieldListAdded.value, draftField];
      fieldListAdded.value = updatedDrafts;
      sessionStorage.setItem("fields", JSON.stringify(updatedDrafts));
      activeField.value = draftField;
      selectedFieldId.value = draftField.__localId;
      sessionStorage.setItem("activeField", JSON.stringify(draftField));
      emit("selectedField");
      closeCreateFieldDialog();
      $q.notify({
        type: "positive",
        message: "Поле создано и выбрано. Теперь можно рисовать контуры.",
      });
    };

    watch(
      () => props.updateFields,
      (newValue) => {
        if (!newValue) return;
        fieldListAdded.value = sessionStorage.getItem("fields")
          ? normalizeDraftFields(JSON.parse(sessionStorage.getItem("fields")))
          : [];
        const seasonRaw = sessionStorage.getItem("activeSeason");
        if (seasonRaw) {
          const season = JSON.parse(seasonRaw);
          fetchFields(season.id);
        }
      }
    );

    onMounted(async () => {
      if (window.matchMedia("(max-width: 768px)").matches) {
        isCompact.value = true;
      }
      await fetchSeasons();
      if (sessionStorage.getItem("activeSeason")) {
        activeSeason.value = JSON.parse(sessionStorage.getItem("activeSeason"));
        selectedSeasonId.value = activeSeason.value?.id || null;
        await fetchFields(activeSeason.value.id);
      }
      if (sessionStorage.getItem("fields")) {
        fieldListAdded.value = normalizeDraftFields(JSON.parse(sessionStorage.getItem("fields")));
      }
      if (sessionStorage.getItem("activeField")) {
        activeField.value = JSON.parse(sessionStorage.getItem("activeField"));
        selectedFieldId.value = activeField.value ? getFieldKey(activeField.value) : null;
      }
    });

    const localPolygonIsFinished = ref(props.polygonIsFinished);
    watch(
      () => props.polygonIsFinished,
      (newVal) => {
        localPolygonIsFinished.value = newVal;
      }
    );

    return {
      isDarkMode,
      activeSeason,
      activeField,
      selectedSeasonId,
      selectedFieldId,
      isPanelVisible,
      isCompact,
      seasonOptions,
      fieldOptions,
      handleSeasonChange,
      handleFieldChange,
      clearSelections,
      goToSeasonPage,
      isFieldDialogOpen,
      newField,
      isCreateFieldDisabled,
      openCreateFieldDialog,
      closeCreateFieldDialog,
      createFieldAndSelect,
      startDrawing,
      undoLastAction,
      toggleEditMode,
      localPolygonIsFinished,
    };
  },
};
</script>

<style scoped>
.panel-fab {
  position: fixed;
  top: calc(var(--app-header-height, 64px) + 12px);
  right: 14px;
  z-index: 1300;
  box-shadow: 0 10px 22px rgba(19, 36, 58, 0.22);
}

.control-panel {
  position: fixed;
  right: 14px;
  top: calc(var(--app-header-height, 64px) + 12px);
  z-index: 1300;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 320px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 30px rgba(19, 36, 58, 0.18);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  transform-origin: top right;
  will-change: transform, opacity;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #25344d;
  letter-spacing: 0.2px;
}

.status-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-chip {
  width: 100%;
  justify-content: flex-start;
  font-weight: 600;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-select :deep(.q-field__control) {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.control-select :deep(.q-field__control:hover) {
  box-shadow: 0 0 0 2px rgba(47, 103, 216, 0.12);
}

.panel-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.action-btn {
  border-radius: 10px;
  font-weight: 600;
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(30, 74, 155, 0.2);
}

.control-panel.compact {
  width: 300px;
}

@media (max-width: 768px) {
  .control-panel {
    width: calc(100% - 24px);
    left: 12px;
    right: 12px;
  }

  .control-panel.compact {
    width: calc(100% - 24px);
  }

  .panel-actions {
    grid-template-columns: 1fr;
  }
}

.panel-float-enter-active,
.panel-float-leave-active {
  transition: opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1), transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.panel-float-enter-from,
.panel-float-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.field-create-dialog {
  width: min(520px, calc(100vw - 24px));
  border-radius: 14px;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: #22314b;
}

.dialog-subtitle {
  margin-top: 4px;
  color: #61748f;
  font-size: 13px;
}

.panel-icon-btn {
  color: #5c6b82;
}
</style>

<style>
/* Dark theme: keep panel and season/field chips readable. */
.body--dark .control-panel {
  background: rgba(28, 36, 50, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.body--dark .panel-title {
  color: #e8edf5;
}

.body--dark .panel-icon-btn {
  color: #b8c5d9;
}

/*
  Тёмные поля: без :deep() в глобальном блоке селекторы не применялись.
  Перебиваем scoped background rgba(255,255,255,0.78) и светлый фон outlined.
*/
body.body--dark .control-select .q-field__control {
  background-color: #1e293b !important;
  background-image: none !important;
}

body.body--dark .control-select.q-field--outlined .q-field__control:before {
  border-color: rgba(148, 163, 184, 0.5) !important;
}

body.body--dark .control-select.q-field--outlined .q-field__control:after {
  border-color: rgba(148, 163, 184, 0.35) !important;
}

body.body--dark .control-select .q-field__native,
body.body--dark .control-select .q-field__input,
body.body--dark .control-select .q-field__prefix,
body.body--dark .control-select .q-field__suffix,
body.body--dark .control-select .q-field__append,
body.body--dark .control-select .q-field__prepend {
  color: #f8fafc !important;
}

body.body--dark .control-select .q-field__label {
  color: #cbd5e1 !important;
}

body.body--dark .control-select .q-field__marginal,
body.body--dark .control-select .q-select__dropdown-icon {
  color: #e2e8f0 !important;
}

body.body--dark .control-select .q-field__messages {
  color: #94a3b8 !important;
}

.body--dark .status-chip-season.q-chip--colored {
  background: #2e7d32 !important;
  color: #fff !important;
}

.body--dark .status-chip-field.q-chip--colored {
  background: #1565c0 !important;
  color: #fff !important;
}

.body--dark .status-chip-inactive {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #f0f4fa !important;
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.body--dark .field-create-dialog .dialog-title {
  color: #e8edf5;
}

.body--dark .field-create-dialog .dialog-subtitle {
  color: #9aa8bc;
}
</style>
