import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logOut, updateAccessToken } from '../authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  prepareHeaders: (headers, { getState }) => {
    const state = getState().auth;
    if (state.accessToken) {
      headers.set('authorization', `Bearer ${state.accessToken}`);
    }
    if (state.instituteId) {
      headers.set('x-institute-id', state.instituteId);
    }
    if (state.branchId) {
      headers.set('x-branch-id', state.branchId);
    }
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    const refreshToken = api.getState().auth.refreshToken;
    if (refreshToken) {
      try {
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh-token',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );
        
        if (refreshResult.data && refreshResult.data.success) {
          const newAccessToken = refreshResult.data.data.accessToken;
          api.dispatch(updateAccessToken({ accessToken: newAccessToken }));
          // Retry original request
          result = await baseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logOut());
        }
      } catch (err) {
        api.dispatch(logOut());
      }
    } else {
      api.dispatch(logOut());
    }
  }
  
  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User', 'Institute', 'Branch', 'Session', 'Class', 'Section', 'Subject', 
    'Course', 'Enrollment', 'Assignment', 'Submission', 'Attendance', 
    'Exam', 'ExamSchedule', 'Result', 'ReportCard', 'AcademicRecord', 
    'Fee', 'FeeInvoice', 'Payment', 'Notification', 'Announcement', 'AuditLog',
    'Certificate'
  ],
  endpoints: (builder) => ({}),
});
