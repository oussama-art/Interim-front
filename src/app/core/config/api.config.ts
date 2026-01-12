import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  BASE_URL: environment.apiUrl,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh'
    },
    CLIENTS: {
      CREATE: '/clients/create',
      GET_ALL: '/clients',
      ME: '/clients/me',
      PATCH_ME: '/clients/me',
      MY_DEMANDES: '/clients/my-demandes',
      GET_BY_ID: (id: number) => `/clients/${id}`,
      UPDATE: (id: number) => `/clients/${id}`,
      DELETE: (id: number) => `/clients/${id}`,
      DEMANDES: (clientId: number) => `/clients/${clientId}/demandes`,
      CREATE_DEMANDE: (clientId: number) => `/clients/${clientId}/demandes/create`
    },
    CANDIDATES: {
      CREATE: '/candidates/create',
      GET_ALL: '/candidates',
      PAGE: '/candidates/page',
      ME: '/candidates/me',
      PATCH_ME: '/candidates/me',
      GET_BY_ID: (id: number) => `/candidates/${id}`,
      UPDATE: (id: number) => `/candidates/${id}`,
      DELETE: (id: number) => `/candidates/${id}`
    },
    DEMANDES: {
      CREATE: '/demandes/create',
      GET_ALL: '/demandes',
      GET_BY_ID: (id: number) => `/demandes/${id}`,
      MY_DEMANDE_DETAIL: '/demandes/my-demandes/detail',
      UPDATE: '/demandes/demande',
      DELETE: (id: number) => `/demandes/${id}`
    },
    ADMIN: {
      DASHBOARD: '/admin/dashboard',
      CLIENTS: '/admin/clients',
      CANDIDATES: '/admin/candidates',
      DEMANDES: '/demandes',
      STATS: '/admin/stats'
    }
  }
} as const;

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
