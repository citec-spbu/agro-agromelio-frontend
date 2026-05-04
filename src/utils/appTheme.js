/** Persist theme in localStorage before async userStore initialization. */
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

/** For boot phase: map only to Quasar dark flag. */
export function readThemeIsDark() {
  return getStoredTheme() === 'dark';
}
