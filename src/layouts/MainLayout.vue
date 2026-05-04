<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="header-surface">
      <q-toolbar class="header-toolbar">
        <q-btn
          unelevated
          dense
          round
          :icon="leftDrawerOpen ? 'menu_open' : 'menu'"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          color="primary"
          class="nav-toggle-btn"
        />

        <q-toolbar-title class="my-title">
          <div class="page-title-wrap">
            <transition name="title-fade" mode="out-in">
              <div :key="route.path" class="page-title text-weight-medium">{{ pageTitle }}</div>
            </transition>
            <div class="page-subtitle">Agromelio Platform</div>
            <q-breadcrumbs class="page-breadcrumbs">
              <q-breadcrumbs-el icon="home" label="Главная" />
              <q-breadcrumbs-el :label="pageTitle" />
            </q-breadcrumbs>
          </div>
        </q-toolbar-title>

        <q-avatar icon="account_circle" size="46px" text-color="primary" class="profile-avatar">
          <q-menu>
            <q-list>
              <q-item clickable v-close-popup @click="goToProfile">
                <q-item-section>Профиль</q-item-section>
              </q-item>
              <!-- <q-item clickable v-close-popup @click="goToOrganization">
                <q-item-section>Организация</q-item-section>
              </q-item> -->
            </q-list>
          </q-menu>
        </q-avatar>

      </q-toolbar>
    </q-header>


    <q-drawer
      :model-value="leftDrawerOpen"
      @update:model-value="leftDrawerOpen = $event"
      :show-if-above="$q.screen.gt.sm"
      :mini="$q.screen.gt.sm && miniOpen"
      bordered
      class="bg-primary text-white app-drawer"
      :width="240"
      :behavior="$q.screen.gt.sm ? 'desktop' : 'mobile'"
    >

      <q-list>
        <q-item class="brand-item">
          <q-item-section>
            <q-item-label class="label">Agromelio</q-item-label>
          </q-item-section>
        </q-item>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'
import { useRoute, useRouter } from 'vue-router'
import { userStore } from 'src/usage'
import { useQuasar } from 'quasar'



export default {
  name: 'MainLayout',

  components: {
    EssentialLink
  },



  setup() {
    const route = useRoute();
    const miniOpen = ref(false);
    const leftDrawerOpen = ref(true);
    const pageTitle = ref('');
    const router = useRouter();
    const $q = useQuasar();
    let headerResizeObserver = null;
    let updateHeaderHeightRaf = 0;

    const updateHeaderHeightCssVar = () => {
      const headerEl = document.querySelector('.header-surface');
      const headerHeight = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 64;
      document.documentElement.style.setProperty('--app-header-height', `${headerHeight}px`);
    };

    const scheduleHeaderHeightUpdate = () => {
      if (updateHeaderHeightRaf) {
        cancelAnimationFrame(updateHeaderHeightRaf);
      }
      updateHeaderHeightRaf = requestAnimationFrame(() => {
        updateHeaderHeightCssVar();
        updateHeaderHeightRaf = 0;
      });
    };

    const linksList = computed(() =>
      [
        {
          title: 'Карта',
          icon: 'o_map',
          link: '/map'
        },

        /*{
          title: 'Культуры',
          icon: 'o_spa',
          link: '/culture'
        },*/

        {
          title: 'Севооборот',
          icon: 'o_compost',
          link: '/season'
        },

        {
          title: 'Аналитика',
          icon: 'o_analytics',
          link: '/analytics'
        },

        {
          title: 'Датчики',
          icon: 'o_sensors',
          link: '/iot-dashboard'
        },

        {
          title: 'Сотрудники',
          icon: 'o_manage_accounts',
          hide: userStore.getState().role === 'worker',
          link: '/workers'
        },

        {
          title: 'Настройки',
          icon: 'o_settings',
          link: '/settings'
        },

        {
          title: 'Выход',
          icon: 'o_logout',
          action: () => {
            userStore.clearAll();
          },
          link: '/'
        },
      ]
    )


    const setPageTitle = (linkTitle) => {
      pageTitle.value = linkTitle;
      document.title = linkTitle; // Обновляем заголовок страницы
    };

    onMounted(() => {
      updatePageTitle();
      nextTick(() => {
        updateHeaderHeightCssVar();
      });

      window.addEventListener('resize', scheduleHeaderHeightUpdate);
      window.addEventListener('orientationchange', scheduleHeaderHeightUpdate);

      const headerEl = document.querySelector('.header-surface');
      if (headerEl && typeof ResizeObserver !== 'undefined') {
        headerResizeObserver = new ResizeObserver(() => {
          scheduleHeaderHeightUpdate();
        });
        headerResizeObserver.observe(headerEl);
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', scheduleHeaderHeightUpdate);
      window.removeEventListener('orientationchange', scheduleHeaderHeightUpdate);
      if (headerResizeObserver) {
        headerResizeObserver.disconnect();
        headerResizeObserver = null;
      }
      if (updateHeaderHeightRaf) {
        cancelAnimationFrame(updateHeaderHeightRaf);
      }
    });

    function goToProfile() {
      router.push({ name: 'profile_info' });
    };
    // function goToOrganization() {
    //   router.push('/organization_info');
    // };

    watch(() => route.path, () => {
      updatePageTitle();
      nextTick(() => {
        scheduleHeaderHeightUpdate();
      });
      if ($q.screen.lt.md) {
        leftDrawerOpen.value = false;
      }
    });

    const updatePageTitle = () => {
      const foundLink = linksList.value.find(link => link.link === route.path);
      if (foundLink) {
        if (foundLink.title === 'Сотрудники') {
          setPageTitle('Мои сотрудники');
        } else {
          setPageTitle(foundLink.title);
        }
      }
    };


    return {
      route,
      linksList,
      $q,
      leftDrawerOpen,
      miniOpen,

      pageTitle,
      toggleLeftDrawer() {
        if ($q.screen.gt.sm) {
          miniOpen.value = !miniOpen.value;
        } else {
          leftDrawerOpen.value = !leftDrawerOpen.value;
        }
      },
      goToProfile,
    };
  }
}
</script>


<style scoped>
.header-surface {
  background: rgba(244, 247, 251, 0.88);
  border-bottom: 1px solid #e6ebf2;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 18px rgba(19, 36, 58, 0.06);
}

.label {
  font-size: 22px;
  font-family: Arial;
  letter-spacing: 0.3px;
}

.my-title {
  color: #151C28;
  letter-spacing: 0.2px;
  font-size: 20px;
  display: flex;
  align-items: center;
}

.page-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.page-title {
  color: #22314b;
  line-height: 1.1;
}

.page-subtitle {
  color: #6d7b92;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.3px;
}

.page-breadcrumbs {
  color: #7c8aa0;
  font-size: 11px;
  margin-top: 2px;
}

.app-drawer {
  box-shadow: 6px 0 20px rgba(0, 0, 0, 0.12);
  background: linear-gradient(180deg, #202b3f 0%, #1a2334 100%);
  position: relative;
  overflow: hidden;
}

.app-drawer::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 10%, rgba(105, 179, 255, 0.18), transparent 45%),
    radial-gradient(circle at 80% 70%, rgba(94, 167, 253, 0.1), transparent 40%);
  opacity: 0.9;
}

.header-toolbar {
  min-height: 64px;
  padding: 0 12px;
  gap: 10px;
}

.profile-avatar {
  background: linear-gradient(145deg, #eff4fd, #e3ebf8);
  border: 1px solid #d8e3f3;
  box-shadow: 0 6px 14px rgba(24, 48, 86, 0.1);
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}

.profile-avatar:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px rgba(24, 48, 86, 0.16);
}

.brand-item {
  padding-top: 12px;
  padding-bottom: 6px;
  margin-bottom: 6px;
}

.label {
  position: relative;
  display: inline-block;
  padding-bottom: 4px;
}

.label::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(94, 167, 253, 0.9), rgba(105, 179, 255, 0.2));
}

.nav-toggle-btn {
  background: #ffffff;
  border: 1px solid #dbe5f5;
  box-shadow: 0 8px 18px rgba(24, 48, 86, 0.14);
  transition: transform 0.18s ease, box-shadow 0.2s ease;
}

.nav-toggle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(24, 48, 86, 0.18);
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
    max-width: 72vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .page-subtitle {
    display: none;
  }

  .page-breadcrumbs {
    display: none;
  }
}

.title-fade-enter-active,
.title-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.title-fade-enter-from,
.title-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

<style>
/* Header and menu button styling for dark theme (body class is set by Quasar Dark). */
body.body--dark .header-surface {
  background: rgba(28, 38, 54, 0.92);
  border-bottom-color: #2a3548;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
}

body.body--dark .my-title {
  color: #e8edf5;
}

body.body--dark .page-title {
  color: #dce6f5;
}

body.body--dark .page-subtitle {
  color: #9aa8bc;
}

body.body--dark .page-breadcrumbs {
  color: #8a9aac;
}

body.body--dark .profile-avatar {
  background: linear-gradient(145deg, #2a3548, #243042);
  border-color: #3d4f66;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}

body.body--dark .nav-toggle-btn {
  background: #243042;
  border-color: #3d4f66;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
}
</style>
