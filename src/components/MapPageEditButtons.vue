<template>
  <div class="edit-shell">
    <div class="edit-fab-wrap">
      <q-btn
        fab
        color="primary"
        :icon="editModeOn ? 'close' : 'edit'"
        class="edit-fab"
        @click="toggleEditMode"
      />
      <div class="edit-fab-label">{{ editModeOn ? "Завершить редактирование" : "Режим редактирования" }}</div>
    </div>

    <transition name="actions-fade">
      <div v-if="editModeOn" class="edit-actions-card">
        <q-btn no-caps color="primary" icon="add" class="action-btn" @click="startDrawing()">
          <span class="btn-label">Добавить</span>
        </q-btn>
        <q-btn
          no-caps
          :outline="!isPointDeleteMode"
          :color="isPointDeleteMode ? 'negative' : 'primary'"
          icon="location_searching"
          class="action-btn"
          @click="togglePointDeleteMode"
        >
          <span class="btn-label">{{ isPointDeleteMode ? "Удаление точки: ВКЛ" : "Удалить точку" }}</span>
        </q-btn>
        <q-btn no-caps color="positive" icon="done" class="action-btn" @click="postContours()">
          <span class="btn-label">Сохранить</span>
        </q-btn>
        <q-btn no-caps outline color="negative" icon="delete" class="action-btn" @click="confirm = true">
          <span class="btn-label">Удалить</span>
        </q-btn>
        <div class="edit-hint">Клик по контуру = выбор. При режиме "Удалить точку" клик по вершине удаляет ее.</div>
      </div>
    </transition>

    <!-- для подтверждения удаления
       сделать чтобы кнопочки да нет работали -->
    <q-dialog v-model="confirm" persistent>
      <q-card class="confirm-deleting q-pa-md">
        <q-card-section class="row items-center">
          <span align="center"
            ><strong>Вы действительно хотите удалить этот объект?</strong></span
          >
        </q-card-section>
        <q-card-actions align="center">
          <q-btn label="Нет" color="primary" v-close-popup />
          <q-btn label="Да" color="primary" @click="removeSelectedPolygon" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  name: "MapPageEditButtons",
  props: {
    polygonIsFinished: {
      type: Boolean,
      required: true,
    },
  },
  setup(props, { emit }) {
    const confirm = ref(false);
    const editModeOn = ref(false);
    const isDrawing = ref(false);
    const isPointDeleteMode = ref(false);
    const startDrawing = () => {
      isDrawing.value = !isDrawing.value;
      emit("startDrawing", isDrawing.value);
    };
    const removeSelectedPolygon = () => {
      confirm.value = false;
      emit("removeSelectedPolygon");
    };
    const postContours = () => {
      emit("postContours");
    };
    const togglePointDeleteMode = () => {
      isPointDeleteMode.value = !isPointDeleteMode.value;
      emit("isPointDeleteMode", isPointDeleteMode.value);
    };
    const toggleEditMode = () => {
      editModeOn.value = !editModeOn.value;
      if (!editModeOn.value && isDrawing.value) {
        isDrawing.value = false;
        emit("startDrawing", false);
      }
      if (!editModeOn.value && isPointDeleteMode.value) {
        isPointDeleteMode.value = false;
        emit("isPointDeleteMode", false);
      }
      emit("isEditMode", editModeOn.value);
    };

    return {
      startDrawing,
      removeSelectedPolygon,
      confirm,
      editModeOn,
      postContours,
      toggleEditMode,
      isPointDeleteMode,
      togglePointDeleteMode,
    };
  },
};
</script>
<style scoped>
.edit-shell {
  display: flex;
  z-index: 1250;
  position: fixed;
  flex-direction: column;
  gap: 10px;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.edit-fab-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  align-self: center;
}

.edit-fab {
  box-shadow: 0 12px 24px rgba(19, 36, 58, 0.22);
}

.edit-fab-label {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce6f6;
  color: #29415f;
  font-size: 12px;
  font-weight: 600;
}

.edit-actions-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(19, 36, 58, 0.15);
  backdrop-filter: blur(6px);
  border: 1px solid #dce6f6;
}

.edit-hint {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #526884;
  padding: 2px 2px 0;
}

.action-btn {
  min-width: 110px;
  border-radius: 10px;
  font-weight: 700;
}

.btn-label {
  margin-left: 4px;
}

.actions-fade-enter-active,
.actions-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.actions-fade-enter-from,
.actions-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.confirm-deleting {
  min-height: 160px;
  width: 320px;
  border-radius: 16px;
}

@media (max-width: 980px) {
  .edit-shell {
    left: 12px;
    right: 12px;
    transform: none;
  }

  .edit-fab-wrap {
    align-self: flex-start;
  }

  .edit-actions-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .action-btn {
    min-width: 0;
  }
}
</style>
