<template>
  <q-dialog v-model="errorShow">
    <q-card style="width: 300px">
      <q-card-section>
        <div class="text-h6 text-bold">Ошибка</div>
      </q-card-section>
      <q-card-section class="q-pt-none" style="white-space: pre-line;">{{ error }}</q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="OK" color="primary" @click="closeError" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <div v-if="isInit">
    <router-view />
  </div>
  <div v-else>not Initialized</div>
</template>
<script>
  import { ref, watch, watchEffect } from "vue";
  import { userStore } from "./usage";
  import { onBeforeMount } from "vue";
  import { postToServer } from "./axiosRequest";

  export default {
    setup() {
      const isInit = ref(userStore.getIsInitialized());
      const errorShow = ref(false);
      const error = ref(null);
      // const route = useRoute();
      function closeError() {
        userStore.setError(null);
        errorShow.value = false;
      }



      console.log(userStore.getState().access_token);

      watch(
        () => userStore.getError(),
        (val) => {
          console.log(val);
          error.value = val;
          if (val !== null) {
            errorShow.value = true;
          }
        },
      );
      watch(
        () => userStore.getIsInitialized(),
        (val) => {
          isInit.value = val;
        }
      );

      watchEffect(() => {
        // console.log(userStore.getState().access_token);

        if (userStore.getState().access_token) {
          postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/auth/users/me`, request: 'get' })
            .then((response) => {
              console.log(response);
              userStore.updateState('role', response.role);
              console.log(response.role);
              return postToServer({ url: `${process.env.VUE_APP_BASE_URL}/api/profiles/${response.role}s/me`, request: 'get' })
            })
            .then((response) => {
              console.log(response);
              userStore.updateState('user_id', response.user_id);
              let info = {};
              for (const key in response) {
                if (key !== 'user_id' && key !== 'id') {
                  info[key] = response[key];
                }
              }
              if (userStore.getState().role === 'organization') {
                userStore.updateAll({ organizationInfo: info });
              } else {
                userStore.updateAll({ workerInfo: info });
              }
              console.log(userStore.getState());
            })
            .catch((error) => {
              if (error === 'Profile not found') {

              } else {
                console.error(error);
                userStore.setError(error);
              }
            })
        }


      })
      onBeforeMount(() => {
        userStore.init();
      })
      return { errorShow, error, closeError, isInit }
    }
  }
</script>
