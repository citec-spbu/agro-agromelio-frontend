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
        <div class="edit-status-row">
          <div class="edit-status-item">
            <strong>Режим:</strong>
            {{ modeLabel }}
          </div>
          <div class="edit-status-item">
            <strong>Шаг:</strong>
            {{ stepLabel }}
          </div>
        </div>

        <q-btn
          dense
          no-caps
          :color="isDrawing ? 'orange-9' : 'primary'"
          :icon="isDrawing ? 'close' : 'add'"
          class="action-btn"
          :class="{ 'action-btn--active': isDrawing }"
          @click="startDrawing"
        >
          <span class="btn-label">{{ isDrawing ? "Отменить рисование" : "Новый контур" }}</span>
          <q-tooltip anchor="top middle" self="bottom middle">
            {{
              isDrawing
                ? "Отменит текущее незавершенное рисование. Чтобы сохранить контур, завершите его двойным кликом по карте."
                : "Начать рисование нового контура."
            }}
          </q-tooltip>
        </q-btn>
        <q-btn dense no-caps flat color="grey-8" icon="undo" class="action-btn" @click="undoLastAction">
          <span class="btn-label">Отменить</span>
          <q-tooltip anchor="top middle" self="bottom middle">
            Отменить последнюю точку в текущем рисовании.
          </q-tooltip>
        </q-btn>
        <div class="edit-hint">{{ currentHint }}</div>
      </div>
    </transition>
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";

export default {
  name: "MapPageEditButtons",
  props: {
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
    const editModeOn = ref(false);
    const isDrawing = ref(false);
    const modeLabel = computed(() => {
      if (isDrawing.value) return "Рисование контура";
      return "Выбор и правка контуров";
    });
    const stepLabel = computed(() => {
      if (isDrawing.value) return "Двойной клик замыкает контур";
      return "Кликните по контуру, чтобы выбрать его";
    });
    const currentHint = computed(() => {
      if (isDrawing.value) {
        return "Рисование активно: добавляйте точки кликами по карте. Двойной клик завершает и сохраняет контур в черновик.";
      }
      return "Чтобы удалить контур, откройте его карточку на карте и нажмите «Удалить контур».";
    });

    const startDrawing = () => {
      isDrawing.value = !isDrawing.value;
      emit("startDrawing", isDrawing.value);
    };
    const undoLastAction = () => {
      emit("undoLastAction");
    };
    const toggleEditMode = () => {
      editModeOn.value = !editModeOn.value;
      if (!editModeOn.value && isDrawing.value) {
        isDrawing.value = false;
        emit("startDrawing", false);
      }
      emit("isEditMode", editModeOn.value);
    };

    watch(
      () => props.polygonIsFinished,
      (isFinished) => {
        if (isFinished && isDrawing.value) {
          isDrawing.value = false;
          emit("startDrawing", false);
        }
      }
    );
    watch(
      () => props.resetEditModeSignal,
      () => {
        if (!editModeOn.value && !isDrawing.value) return;
        if (isDrawing.value) {
          isDrawing.value = false;
          emit("startDrawing", false);
        }
        editModeOn.value = false;
        emit("isEditMode", false);
      }
    );

    return {
      startDrawing,
      editModeOn,
      toggleEditMode,
      isDrawing,
      undoLastAction,
      modeLabel,
      stepLabel,
      currentHint,
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(19, 36, 58, 0.15);
  backdrop-filter: blur(6px);
  border: 1px solid #dce6f6;
}

.edit-status-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.edit-status-item {
  font-size: 12px;
  color: #24384f;
  border-radius: 10px;
  border: 1px solid #cad9ef;
  background: #f2f7ff;
  padding: 7px 9px;
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

.action-btn--active {
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.45), 0 8px 18px rgba(249, 115, 22, 0.25);
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

@media (max-width: 980px) {
  .edit-shell {
    left: 10px;
    right: 10px;
    bottom: 14px;
    transform: none;
  }

  .edit-fab-wrap {
    align-self: flex-start;
    gap: 8px;
  }

  .edit-fab-label {
    font-size: 11px;
    padding: 6px 9px;
  }

  .edit-actions-card {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    padding: 6px;
  }

  .edit-status-row {
    grid-template-columns: 1fr;
  }

  .action-btn {
    min-width: 0;
    min-height: 38px;
    font-size: 12px;
  }

  .edit-hint {
    font-size: 11px;
  }
}
</style>
