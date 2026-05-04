 import { mount } from '@vue/test-utils';
import RegPage from '@/pages/RegPage.vue';
import { postreg } from '@/axiosRequest';
import { userStore } from '@/usage';
 import { createRouter, createWebHistory } from 'vue-router';

// Mock external dependencies.
jest.mock('@/axiosRequest', () => ({
  postreg: jest.fn()
}));

jest.mock('@/usage', () => ({
  userStore: {
    updateAll: jest.fn(),
    setError: jest.fn(),
  }
}));

jest.mock('vue-router', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Create a test router instance.
const mockRouter = createRouter({
  history: createWebHistory(),
  routes: []
});

// Registration page test suite.
describe('RegPage.vue', () => {
  it('успешная регистрация перенаправляет пользователя на страницу входа', async () => {
    const wrapper = mount(RegPage, {
      global: {
        plugins: [mockRouter]
      }
    });

    wrapper.vm.email = 'test@example.com';
    wrapper.vm.password = 'password123';
    wrapper.vm.role = 'organization';

    // Configure successful registration response.
    postreg.mockResolvedValueOnce({
      id: 1,
      email: 'test@example.com',
      role: 'organization',
      created_by: 'admin'
    });

    await wrapper.vm.readyClick();

    expect(postreg).toHaveBeenCalledWith({
      email: 'test@example.com',
      text_password: 'password123',
      role: 'organization'
    });

    expect(userStore.updateAll).toHaveBeenCalledWith({
      id: 1,
      email: 'test@example.com',
      role: 'organization',
      created_by: 'admin'
    });

    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'login' });
  });

  it('показывает ошибку если поля пустые', async () => {
    const wrapper = mount(RegPage, {
      global: {
        plugins: [mockRouter]
      }
    });

    wrapper.vm.email = '';
    wrapper.vm.password = '';

    // Verify that validation error is thrown.
    expect(() => {
      wrapper.vm.readyClick();
    }).toThrow('не все данные введены');
  });

  it('показывает ошибку сервера', async () => {
    const wrapper = mount(RegPage, {
      global: {
        plugins: [mockRouter]
      }
    });

    wrapper.vm.email = 'test@example.com';
    wrapper.vm.password = 'password123';

    postreg.mockRejectedValueOnce(new Error('серверная ошибка'));

    // Trigger submit action.
    await wrapper.vm.readyClick();

    // Verify that error handler is called.
    expect(userStore.setError).toHaveBeenCalledWith(new Error('серверная ошибка'));
  });
});
