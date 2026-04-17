<template>
  <q-banner class="bg-green-3" v-show="flag">Данные сохранены</q-banner>
  <div class="settings-page">
    <ThemePreferenceSection class="q-mb-lg" />

    <div v-if="myrole === 'worker'">
      <div class="text-h5 text-center q-my-md">Профиль сотрудника</div>
      <div class="row justify-center">
        <q-card bordered class="col-12 col-md-7 settings-card">
          <q-card-section>
            <q-input outlined label="Имя" class="q-my-sm" v-model="workData.name"></q-input>
            <q-input outlined label="Фамилия" class="q-my-sm" v-model="workData.surname"></q-input>
            <q-input outlined label="Отчество" class="q-my-sm" v-model="workData.patronymic"></q-input>
            <q-input outlined label="Дата рождения" mask="####-##-##" class="q-my-sm" v-model="workData.date_of_birth"></q-input>
            <q-input outlined label="Номер телефона" class="q-my-sm" v-model="workData.phone_number"></q-input>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn class="q-mr-sm" flat @click="clearData">Очистить</q-btn>
            <q-btn color="primary" :loading="profileLoading" @click="postData">Сохранить профиль</q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <div v-else-if="myrole === 'organization'">
      <div class="text-h5 text-center q-my-md">Профиль организации</div>
      <div class="row justify-center">
        <q-card bordered class="col-12 col-md-7 settings-card">
          <q-card-section>
            <q-input outlined label="Название" class="q-my-sm" v-model="orgData.name"></q-input>
            <q-input outlined label="Описание" class="q-my-sm" v-model="orgData.description"></q-input>
            <q-input outlined label="Город" class="q-my-sm" v-model="orgData.city"></q-input>
            <q-input outlined label="ИНН" class="q-my-sm" v-model="orgData.inn"></q-input>
            <q-input outlined label="Номер телефона" class="q-my-sm" v-model="orgData.phone_number"></q-input>
            <q-input outlined label="Сайт" class="q-my-sm" v-model="orgData.website"></q-input>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn class="q-mr-sm" flat @click="clearData">Очистить</q-btn>
            <q-btn color="primary" :loading="profileLoading" @click="postData">Сохранить профиль</q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <div class="row justify-center q-mt-lg">
      <q-card bordered class="col-12 col-md-7 settings-card danger-zone">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold">Аккаунт</div>
          <div class="text-caption q-mt-xs text-grey-8">
            Изменение email/пароля относится к auth-аккаунту, а не к профилю.
          </div>
          <q-input outlined label="Email" class="q-mt-md" v-model="accountData.email"></q-input>
          <q-input outlined type="password" label="Новый пароль" class="q-mt-sm" v-model="accountData.text_password"></q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn color="primary" outline :loading="accountLoading" @click="updateAccount">Обновить аккаунт</q-btn>
          <q-btn color="negative" :loading="accountDeleteLoading" @click="confirmDeleteAccount">Удалить аккаунт</q-btn>
          <q-btn flat color="negative" :loading="profileDeleteLoading" @click="deleteUser">Удалить профиль</q-btn>
        </q-card-actions>
      </q-card>
    </div>
  </div>
</template>

<script>
import { postToServer } from 'src/axiosRequest';
import { userStore } from 'src/usage';
import { reactive, ref, onBeforeUnmount, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import ThemePreferenceSection from 'src/components/ThemePreferenceSection.vue';

export default {
  components: { ThemePreferenceSection },

  setup() {
      const $q = useQuasar();
      const router = useRouter();
      const myrole = userStore.getState().role;
      const orgData = reactive({ name: '', description: '', city: '', inn: '', phone_number: '', website: '' });
      // console.log({ ...userStore.getState().organizationInfo });
      // const orgData = reactive({ ...userStore.getState().organizationInfo });
      // const workData = reactive(userStore.getState().workerInfo);

      const workData = reactive({ name: '', surname: '', patronymic: '', date_of_birth: '', phone_number: '' });
      const accountData = reactive({ email: '', text_password: '' });

      const flag = ref(false);
      const profileLoading = ref(false);
      const profileDeleteLoading = ref(false);
      const accountLoading = ref(false);
      const accountDeleteLoading = ref(false);
      watch(
          () => userStore.getState().organizationInfo,
          (val) => {
              if (!val) {
                  return
              }
              accountData.email = userStore.getState().email || '';
              console.log('val = ', val);
              orgData.name = val.name;
              orgData.description = val.description;
              orgData.city = val.city;
              orgData.inn = val.inn;
              orgData.phone_number = val.phone_number;
              orgData.website = val.website;
          },
          { deep: true, immediate: true }
      )

      watch(
          () => userStore.getState().workerInfo,
          (val) => {
              if (!val) {
                  return
              }
              workData.name = val.name;
              workData.surname = val.surname;
              workData.patronymic = val.patronymic;
              workData.date_of_birth = val.date_of_birth;
              workData.phone_number = val.phone_number;
              accountData.email = userStore.getState().email || '';
          },
          { deep: true, immediate: true }
      )

      function clearData() {
          const data = myrole === 'worker' ? workData : orgData;
          for (const key in data) {
              data[key] = '';
          }
      };


      function postData() {
          profileLoading.value = true;
          const data = myrole === 'worker' ? workData : orgData;

          for (const key in data) {
              if (!data[key].trim()) {
                  throw new Error('Не все данные введены');
              }
          }
          const url = `${process.env.VUE_APP_BASE_URL}/api/profiles/${myrole}s`;
          const method = userStore.getState().user_id ? 'put' : 'post';
          const endpoint = userStore.getState().user_id ? '/me' : '';



          postToServer({ url: url + endpoint, data, request: method })
              .then((response) => {
                  console.log(response);
                  userStore.updateState('user_id', response.user_id);
                  flag.value = true;
                  if (userStore.getState().user_id) {
                      return postToServer({ url, getParams: { params: { user_id: userStore.getState().user_id } }, request: 'get' })
                  } else {
                      return;
                  }
              })
              .then((response) => {
                  console.log(response);
                  for (const key in response) {
                      const data = myrole === 'worker' ? workData : orgData;
                      if (Object.keys(data).find(o => o === key)) {
                          data[key] = response[key];
                      }
                  }
              })

              .catch((error) => {
                  console.error(error);
                  userStore.setError(error);
              })
              .finally(() => {
                  profileLoading.value = false;
              })
      }


   




      function deleteUser() {
          console.log('DELETE');
          if (userStore.getState().user_id) {
              profileDeleteLoading.value = true;
              const url = `${process.env.VUE_APP_BASE_URL}/api/profiles/${myrole}s/me`;
              postToServer({ url, request: 'delete' })
                  .then((response) => {
                      console.log(response);
                      userStore.clearKey(`${myrole}Info`);
                      userStore.updateState('user_id', null);
                  })
                  .catch((error) => {
                      console.error(error);
                      userStore.setError(error);
                  })
                  .finally(() => {
                      profileDeleteLoading.value = false;
                  });
          }
      };

      function updateAccount() {
          if (!accountData.email.trim() || !accountData.text_password.trim()) {
              userStore.setError('Введите email и новый пароль');
              return;
          }
          accountLoading.value = true;
          const url = `${process.env.VUE_APP_BASE_URL}/api/auth/users/me`;
          postToServer({
              url,
              request: 'put',
              data: {
                  email: accountData.email.trim(),
                  text_password: accountData.text_password.trim()
              }
          })
              .then(() => {
                  userStore.updateState('email', accountData.email.trim());
                  accountData.text_password = '';
                  flag.value = true;
                  $q.notify({ type: 'positive', message: 'Аккаунт успешно обновлен' });
              })
              .catch((error) => {
                  userStore.setError(error);
              })
              .finally(() => {
                  accountLoading.value = false;
              });
      }

      function confirmDeleteAccount() {
          $q.dialog({
              title: 'Подтверждение',
              message: 'Удалить аккаунт? Это действие необратимо.',
              cancel: true,
              persistent: true
          }).onOk(() => {
              accountDeleteLoading.value = true;
              const url = `${process.env.VUE_APP_BASE_URL}/api/auth/users/me`;
              postToServer({ url, request: 'delete' })
                  .then(() => {
                      userStore.clearAll();
                      router.push({ name: 'login' });
                  })
                  .catch((error) => {
                      userStore.setError(error);
                  })
                  .finally(() => {
                      accountDeleteLoading.value = false;
                  });
          });
      }


      onBeforeUnmount(() => {
          flag.value = false;
      })

      return {
          myrole,
          orgData,
          workData,
          accountData,
          flag,
          profileLoading,
          profileDeleteLoading,
          accountLoading,
          accountDeleteLoading,
          clearData,
          deleteUser,
          updateAccount,
          confirmDeleteAccount,
          postData,
      }

  }
}
</script>

<style scoped>
.settings-page {
  padding: 8px 12px 24px;
}

.settings-card {
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(19, 36, 58, 0.08);
}

.danger-zone {
  border: 1px solid #f6c4c4;
  background: #fff8f8;
}

.body--dark .settings-page :deep(.danger-zone) {
  border-color: #5c2a2a;
  background: rgba(40, 22, 22, 0.5);
}
</style>
