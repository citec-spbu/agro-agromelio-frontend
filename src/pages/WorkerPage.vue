<template>
  <q-dialog v-model="dialogOpen" persistent>
    <q-card class="q-ma-sm worker-dialog-card">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">Новый сотрудник</div>
        <q-input outlined label="Email" type="email" class="q-mt-md" v-model="workerData.email" clearable></q-input>
        <q-input outlined label="Пароль" type="password" class="q-mt-sm" v-model="workerData.password" clearable></q-input>
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn class="q-mr-sm" flat @click="cancel">Отмена</q-btn>
        <q-btn color="primary" @click="addUser">Добавить</q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="editFlag">
    <q-card class="profile-preview-card">
      <div class="q-pa-xl">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Профиль сотрудника</div>
        <div class="q-my-sm">Почта: {{ selectRow.email }}</div>
        <div v-if="workData.name">
          <div class="q-my-sm">Имя: {{ workData.name }}</div>
          <div class="q-my-sm">Фамилия: {{ workData.surname }}</div>
          <div class="q-my-sm">Отчество: {{ workData.patronymic }}</div>
          <div class="q-my-sm">Дата рождения: {{ workData.date_of_birth }}</div>
          <div class="q-my-sm">Номер телефона: {{ workData.phone_number }}</div>
        </div>
      </div>
    </q-card>
  </q-dialog>

  <q-page padding class="workers-page">
    <q-card class="workers-card">
      <q-card-section class="row items-center justify-between q-col-gutter-sm">
        <div class="text-h6">Сотрудники</div>
        <div class="row q-gutter-sm">
          <q-btn color="primary" icon="person_add" @click="dialogOpen = true">Добавить</q-btn>
          <q-btn outline color="negative" icon="delete" @click="deleteUser">Удалить</q-btn>
        </div>
      </q-card-section>

      <q-card-section v-if="selectRow" class="selected-worker-banner">
        Выбранный сотрудник: {{ selectRow.id }} &mdash; {{ selectRow.email }}
      </q-card-section>

      <q-card-section>
        <q-table :rows="rows" :columns="columns" row-key="id" @row-click="rowSelected"></q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { postToServer } from 'src/axiosRequest';
import { userStore } from 'src/usage';
import { reactive, ref } from 'vue';
import { useQuasar } from 'quasar'

const columns = [
  { name: 'id', required: true, label: "id", align: 'center', field: 'id', sortable: true, style: "width:50px" },  // serial
  { name: 'email', required: true, label: "Email", align: 'center', field: 'email', sortable: true }, // string
]


export default {
  setup() {
    const rows = ref([]);
    const dialogOpen = ref(false);
    const editFlag = ref(false);
    const $q = useQuasar();
    const selectRow = ref(null);

    const workData = reactive({ name: '', surname: '', patronymic: '', date_of_birth: '', phone_number: '' });

    function rowSelected(event, row, idx) {
      console.log(row);
      selectRow.value = row;
      editUser();
    }

    const workerData = reactive({ email: '', password: '' });

    function getTable() {
      return new Promise((resolve, reject) => {
        postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/auth/users/workers`, request: 'get' })
          .then((myresponse) => {
            console.log(myresponse);
            resolve(myresponse);
          })
          .catch((error) => {
            reject(error);
          })
      })
    }


    getTable()
      .then((response) => {
        rows.value = [...response];
      })
      .catch((error) => {
        console.error(error);
        userStore.setError(error);
      })
    function addUser() {
      console.log(workerData);
      if (!workerData.email.trim() || !workerData.password.trim()) {
        throw new Error('не все данные введены');
      }
      dialogOpen.value = false;



      postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/auth/users`, data: { email: workerData.email.trim(), text_password: workerData.password.trim(), role: 'worker' }, request: 'post' })
        .then((response) => {
          console.log(response);
          return getTable()
        })
        .then((response) => {
          rows.value = [...response];
        })
        .catch((error) => {
          console.error(error);
          userStore.setError(error);
        })
    }

    function editUser() {
      for (const key in workData) {
        workData[key] = null;
      }
      postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/profiles/workers`, getParams: { params: { user_id: selectRow.value.id } }, request: 'get' })
        .then((response) => {
          console.log(response);
          for (const key in response) {
            if (Object.keys(workData).find(o => o === key)) {
              workData[key] = response[key];
            }
          }
          editFlag.value = true;
        })
        .catch((error) => {
          if (error === 'Profile not found') {
            editFlag.value = true;
          } else {
            console.error(error);
            userStore.setError(error);
          }
        })
    }

    function deleteUser() {
      if (selectRow.value && selectRow.value.id) {
        $q.dialog({
          title: 'Подтвердите',
          message: 'Вы действительно хотите удалить это пользователя?',
          cancel: 'Отмена',
          persistent: true
        })
          .onOk(() => {
            postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/auth/users/workers/${selectRow.value.id}`, request: 'delete' })
              .then((response) => {
                console.log(response);
                selectRow.value = null;
                return getTable()

              })
              .then((response) => {
                rows.value = [...response];
              })
              .catch((error) => {
                console.error(error);
                userStore.setError(error);
              })
          })
          .onCancel(() => {

          })
      } else {
        userStore.setError('Не выбран сотрудник');
      }

    }

    function cancel() {
      dialogOpen.value = false;
    }
    return {
      columns, rows, rowSelected, dialogOpen, addUser, cancel, workerData, editFlag, editUser, workData, deleteUser, selectRow
    }
  },
}
</script>

<style scoped>
.workers-page {
  padding-top: 10px;
}

.workers-card {
  border-radius: 14px;
}

.selected-worker-banner {
  background: #f3f7ff;
  border: 1px solid #dbe7ff;
  border-radius: 10px;
  color: #314766;
}

.worker-dialog-card,
.profile-preview-card {
  min-width: 360px;
  border-radius: 12px;
}
</style>
