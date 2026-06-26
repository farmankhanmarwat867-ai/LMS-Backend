import { createSlice, createSelector } from '@reduxjs/toolkit';

const getInitialState = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const instituteId = localStorage.getItem('instituteId') || (user?.instituteId || null);
    const branchId = localStorage.getItem('branchId') || (user?.branchId || null);

    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : systemTheme;

    return {
      user: user || null,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      instituteId: instituteId || null,
      branchId: branchId || null,
      isAuthenticated: !!accessToken,
      theme,
    };
  } catch (error) {
    let systemTheme = 'light';
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (_) {}
    return {
      user: null,
      accessToken: null,
      refreshToken: null,
      instituteId: null,
      branchId: null,
      isAuthenticated: false,
      theme: systemTheme,
    };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = true;
      if (refreshToken) {
        state.refreshToken = refreshToken;
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user?.instituteId) {
        state.instituteId = user.instituteId;
        localStorage.setItem('instituteId', user.instituteId);
      }
      if (user?.branchId) {
        state.branchId = user.branchId;
        localStorage.setItem('branchId', user.branchId);
      }
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
    },
    updateAccessToken: (state, action) => {
      const { accessToken } = action.payload;
      state.accessToken = accessToken;
      localStorage.setItem('accessToken', accessToken);
    },
    setTenantContext: (state, action) => {
      const { instituteId, branchId } = action.payload;
      if (instituteId !== undefined) {
        state.instituteId = instituteId;
        if (instituteId) localStorage.setItem('instituteId', instituteId);
        else localStorage.removeItem('instituteId');
      }
      if (branchId !== undefined) {
        state.branchId = branchId;
        if (branchId) localStorage.setItem('branchId', branchId);
        else localStorage.removeItem('branchId');
      }
    },
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    logOut: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.instituteId = null;
      state.branchId = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('instituteId');
      localStorage.removeItem('branchId');
    },
  },
});

export const { setCredentials, updateAccessToken, setTenantContext, toggleTheme, logOut } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.accessToken;
export const selectCurrentRefreshToken = (state) => state.auth.refreshToken;
export const selectTenantContext = createSelector(
  [(state) => state.auth.instituteId, (state) => state.auth.branchId],
  (instituteId, branchId) => ({ instituteId, branchId })
);
export const selectTheme = (state) => state.auth.theme;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
