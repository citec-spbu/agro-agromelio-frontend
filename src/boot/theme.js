import { boot } from 'quasar/wrappers';
import { Dark } from 'quasar';
import { readThemeIsDark } from 'src/utils/appTheme';

export default boot(() => {
  Dark.set(readThemeIsDark());
});
