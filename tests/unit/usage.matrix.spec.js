import { userStore } from '../../src/usage';

describe('userStore matrix tests', () => {
  beforeEach(() => {
    userStore.clearAll();
  });

  const authCases = [
    [{ access_token: null, token_type: null }, false],
    [{ access_token: 'a', token_type: null }, false],
    [{ access_token: null, token_type: 'bearer' }, false],
    [{ access_token: 'a', token_type: 'bearer' }, true],
    [{ access_token: 'token-1', token_type: 'bearer' }, true],
    [{ access_token: 'token-2', token_type: 'jwt' }, true],
    [{ access_token: '', token_type: '' }, false],
    [{ access_token: ' ', token_type: 'bearer' }, true],
    [{ access_token: 'abc', token_type: ' ' }, true],
    [{ access_token: 'abc', token_type: 'bearer', email: 'x@y.z' }, true],
  ];

  test.each(authCases)('isAuthorized matrix %#', (input, expected) => {
    userStore.updateAll(input);
    expect(userStore.isAuthorized()).toBe(expected);
  });

  const clearKeyCases = [
    'organizationInfo',
    'workerInfo',
    'email',
    'role',
    'created_by',
    'access_token',
    'token_type',
    'error',
    'id',
    'user_id',
  ];

  test.each(clearKeyCases)('clearKey matrix for %s', (key) => {
    userStore.updateAll({
      organizationInfo: {
        name: 'Org',
        description: 'Desc',
        city: 'Moscow',
        inn: '123',
        phone_number: '+7999',
        website: 'site',
      },
      workerInfo: {
        name: 'Ivan',
        surname: 'Ivanov',
        patronimyc: 'Ivanovich',
        date_of_birth: '1990-01-01',
        phone_number: '+7998',
      },
      email: 'test@example.com',
      role: 'worker',
      created_by: 'creator',
      access_token: 'token',
      token_type: 'bearer',
      error: 'err',
      id: 'id-1',
      user_id: 'user-1',
    });

    userStore.clearKey(key);
    const state = userStore.getState();
    if (key === 'organizationInfo' || key === 'workerInfo') {
      expect(Object.values(state[key]).every((value) => value === null)).toBe(true);
    } else {
      expect(state[key]).toBeNull();
    }
  });
});
