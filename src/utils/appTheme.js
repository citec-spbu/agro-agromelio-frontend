/** Сохранение темы в localStorage (до async-инициализации userStore). */
export const APP_THEME_STORAGE_KEY = 'agromelio-ui-theme';

/** @returns {'light' | 'dark'} */
export function getStoredTheme() {
  const v = localStorage.getItem(APP_THEME_STORAGE_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

/** @param {'light' | 'dark'} mode @param $q useQuasar() */
export function setAppTheme(mode, $q) {
  const dark = mode === 'dark';
  localStorage.setItem(APP_THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  if ($q && $q.dark) {
    $q.dark.set(dark);
  }
}

/** Для boot: только Dark из quasar. */
export function readThemeIsDark() {
  return getStoredTheme() === 'dark';
}
