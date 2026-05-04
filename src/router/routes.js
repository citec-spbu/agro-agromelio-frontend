import { userStore } from "src/usage";

const routes = [
  {
    path: "/",
    component: () => import("layouts/EmptyLayout.vue"),
    children: [
      {
        path: "",
        name: "entry",
        component: () => import("pages/EntryPage.vue"),
      },
      {
        path: "reg",
        name: "reg",
        component: () => import("src/pages/RegPage.vue"),
      },

      {
        path: "login",
        name: "login",
        component: () => import("src/pages/LoginPage.vue"),
      },
    ],
  },
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "map",
        name: "map",
        component: () => import("pages/MapPage.vue"),
      },
      {
        path: "analytics",
        name: "analytics",
        component: () => import("pages/AnalyticsHostPage.vue"),
      },
      {
        path: "iot-dashboard",
        name: "iot-dashboard",
        component: () => import("pages/IotDashboardHostPage.vue"),
      },
      {
        path: "culture",
        name: "culture",
        component: () => import("pages/CulturePage.vue"),
      },
      {
        path: "season",
        name: "SeasonPage",
        component: () => import("pages/Season_page.vue"),
      },
      {
        path: "add_rotation",
        name: "add_rotation",
        component: () => import("pages/Rotation_add_page.vue")
      },
      {
        path: "add_soil",
        name: "add_soil",
        component: () => import("pages/Soil_add_page.vue")
      },
      {
        path: "rotation",
        name: "RotationPage",
        component: () => import("pages/RotationPage.vue")
      },
      {
        path: "field_weather_info",
        name: "FieldWeatherInfoPage",
        component: () => import("pages/Field_weatherInfo_page.vue")
      },
      {
        path: "field_dzz_info",
        name: "FieldDzzInfoPage",
        component: () => import("pages/FieldDzzInfoPage.vue")
      },
      {
        path: "workers",
        name: "workers",
        component: () => import("pages/WorkerPage.vue"),
        beforeEnter: (to, from) => {
          if (userStore.getState().role !== 'organization') {
            return false;
          }
        }
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("pages/SettingsPage.vue"),
      },
      {
        path: "profile_info",
        name: "profile_info",
        component: () => import("pages/Profile_info_page.vue")
      },
      {
        path: "field_information",
        name: "field_information",
        component: () => import("pages/Field_info_page.vue")
      },
      {
        path: "add_field",
        name: "add_field",
        component: () => import("pages/Add_field_page.vue")
      },
      {
        path: "fetch_field",
        name: "fetch_field",
        component: () => import("pages/Fetch_field_page.vue")
      },
      {
        path: "fetch_soil",
        name: "fetch_soil",
        component: () => import("pages/Fetch_soil_page.vue")
      },
      {
        path: "fetch_rotation",
        name: "fetch_rotation",
        component: () => import("pages/Fetch_rotation_page.vue")
      },
      {
        path: "fetch_rotation_field",
        name: "fetch_rotation_field",
        component: () => import("pages/Fetch_rotation_field_page.vue")
      },
      {
        path: "add_season",
        name: "add_season",
        component: () => import("pages/Add_season_page.vue")
      }
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
