import axios from 'axios';

import { postToServer } from '../../src/axiosRequest';
import { userStore } from '../../src/usage';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('../../src/usage', () => ({
  userStore: {
    getState: jest.fn(),
    clearAll: jest.fn(),
  },
}));

jest.mock('../../src/router', () => ({
  __esModule: true,
  default: {
    push: jest.fn(),
  },
}));

describe('axiosRequest postToServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('возвращает reject если нет access_token', async () => {
    userStore.getState.mockReturnValue({});

    await expect(
      postToServer({
        url: '/api/test',
        data: {},
        request: 'get',
      })
    ).rejects.toBe('no token');
  });

  it('выполняет GET и возвращает данные', async () => {
    userStore.getState.mockReturnValue({ access_token: 'token' });
    axios.get.mockResolvedValue({
      status: 200,
      data: { ok: true },
    });

    const result = await postToServer({
      url: '/api/test',
      data: {},
      request: 'get',
    });

    expect(result).toEqual({ ok: true });
    expect(axios.get).toHaveBeenCalled();
  });

  it('передает body при POST и возвращает данные', async () => {
    userStore.getState.mockReturnValue({ access_token: 'token' });
    axios.post.mockResolvedValue({
      status: 200,
      data: { created: true },
    });

    const result = await postToServer({
      url: '/api/test',
      data: { id: 1 },
      request: 'post',
    });

    expect(result).toEqual({ created: true });
    expect(axios.post).toHaveBeenCalledWith(
      '/api/test',
      { id: 1 },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('выполняет PUT и возвращает данные', async () => {
    userStore.getState.mockReturnValue({ access_token: 'token' });
    axios.put.mockResolvedValue({
      status: 200,
      data: { updated: true },
    });

    const result = await postToServer({
      url: '/api/test',
      data: { id: 10 },
      request: 'put',
    });

    expect(result).toEqual({ updated: true });
    expect(axios.put).toHaveBeenCalled();
  });

  it('выполняет DELETE и возвращает данные', async () => {
    userStore.getState.mockReturnValue({ access_token: 'token' });
    axios.delete.mockResolvedValue({
      status: 200,
      data: { deleted: true },
    });

    const result = await postToServer({
      url: '/api/test',
      data: {},
      request: 'delete',
    });

    expect(result).toEqual({ deleted: true });
    expect(axios.delete).toHaveBeenCalled();
  });
});
