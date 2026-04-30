import { userStore } from '../../src/usage';

describe('userStore business behavior', () => {
  beforeEach(() => {
    userStore.clearAll();
  });

  it('updateAll обновляет данные и isAuthorized возвращает true при токене', () => {
    userStore.updateAll({
      access_token: 'token',
      token_type: 'bearer',
      email: 'test@example.com',
    });

    expect(userStore.getState().email).toBe('test@example.com');
    expect(userStore.isAuthorized()).toBe(true);
  });

  it('clearKey очищает вложенный объект профиля', () => {
    userStore.updateAll({
      organizationInfo: {
        name: 'Org',
        description: 'Desc',
        city: 'Moscow',
        inn: '123',
        phone_number: '+7999',
        website: 'https://example.com',
      },
    });

    userStore.clearKey('organizationInfo');

    expect(userStore.getState().organizationInfo.name).toBeNull();
    expect(userStore.getState().organizationInfo.city).toBeNull();
  });

  it('setError/getError сохраняют и читают ошибку', () => {
    userStore.setError('Ошибка');
    expect(userStore.getError()).toBe('Ошибка');
  });
});
