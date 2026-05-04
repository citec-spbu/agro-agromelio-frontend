<template>
  <q-page class="auth-page flex flex-center">
    <q-card class="auth-card">
      <q-card-section class="row no-wrap items-stretch">
        <q-img class="gt-sm col-4 auth-image" src="~assets/worker.jpg"></q-img>
        <div class="col auth-form">
          <div class="text-h4 text-center q-mb-sm">Регистрация</div>
          <div class="text-caption text-center q-mb-lg text-grey-8">Только для организаций</div>
          <q-input outlined label="Email" type="email" class="q-my-sm" v-model="email"></q-input>
          <q-input outlined label="Пароль" type="password" class="q-my-sm" v-model="password" @keyup.enter="readyClick"></q-input>
          <q-btn @click="readyClick" class="full-width q-mt-md" color="primary">Создать аккаунт</q-btn>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue';
import { postreg } from '../axiosRequest'
import { userStore } from '../usage'
import { useRouter } from "vue-router";

export default {
    setup() {
        const email = ref('');
        const password = ref('');
        const router = useRouter();

        function readyClick() {
            console.log(email);
            console.log(password);
            if (!email.value.trim() || !password.value.trim()) {
                throw new Error('не все данные введены');
            }
            postreg({ email: email.value, text_password: password.value, role: 'organization' })
                .then((myresponse) => {
                    const { id, email, role, created_by } = myresponse;
                    userStore.updateAll({ id, email, role, created_by });
                    router.push({ name: 'login' });
                })
                .catch((myerror) => {
                    console.error(myerror);
                    userStore.setError(myerror);
                })
        }
        return {
            email, password,
            readyClick
        }

    },


}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 16px;
}

.auth-card {
  width: min(920px, 100%);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.auth-image {
  min-height: 480px;
}

.auth-form {
  padding: 28px 24px;
}
</style>