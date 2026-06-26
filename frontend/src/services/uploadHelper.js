import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const uploadAxios = axios.create({
  baseURL: apiBaseUrl,
});

// Request interceptor to attach bearer token
uploadAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Upload a single file
 * @param {File} file - File object to upload
 * @param {Function} onProgress - Progress callback function (progressEvent) => {}
 * @returns {Promise} Axios promise
 */
export const uploadSingleFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await uploadAxios.post('/files/upload', formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

/**
 * Upload multiple files
 * @param {FileList|File[]} files - Files to upload
 * @param {Function} onProgress - Progress callback function (progressEvent) => {}
 * @returns {Promise} Axios promise
 */
export const uploadMultipleFiles = async (files, onProgress) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await uploadAxios.post('/files/upload-multiple', formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

export default uploadAxios;
