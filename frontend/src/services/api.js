import axios from 'axios';

const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

rawApi.interceptors.request.use((config) => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };
  const token = getCookie('csrftoken');
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

rawApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid redirecting if already on the login page or checking auth
      if (!window.location.pathname.includes('/login') && !error.config.url.includes('/auth/check/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// In-Memory Cache Store and In-Flight Request Deduplicator
const cacheStore = new Map();
const inFlightRequests = new Map();

// Lookup endpoints that stay fresh for longer (5 minutes)
const LOOKUP_ENDPOINTS = [
  '/projects/projects/all/',
  '/inventory/materials/',
  '/subcontractors/subcontractors/all/',
  '/projects/projects/filters_data/',
  '/sites/sites/',
  '/sites/consumptions/eligible-projects/'
];

const LOOKUP_TTL = 5 * 60 * 1000; // 5 minutes
const DATA_TTL = 30 * 1000;        // 30 seconds for list / datalist GETs

const isLookupUrl = (url) => {
  return LOOKUP_ENDPOINTS.some((ep) => url.includes(ep));
};

const getCacheKey = (url, config = {}) => {
  const paramsStr = config.params ? JSON.stringify(config.params) : '';
  return `${url}_${paramsStr}`;
};

export const clearApiCache = (urlPattern = null) => {
  if (!urlPattern) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(urlPattern)) {
      cacheStore.delete(key);
    }
  }
};

// Enhanced GET with in-memory caching and in-flight request deduplication
const originalGet = rawApi.get.bind(rawApi);

rawApi.get = async function (url, config = {}) {
  // Never cache auth endpoints or explicitly bypassed requests
  if (url.includes('/auth/') || config.skipCache) {
    return originalGet(url, config);
  }

  const cacheKey = getCacheKey(url, config);
  const now = Date.now();
  const cached = cacheStore.get(cacheKey);

  // Return cached result if still fresh
  if (cached && now - cached.timestamp < cached.ttl) {
    return {
      ...cached.response,
      data: JSON.parse(JSON.stringify(cached.response.data)), // Deep copy to prevent accidental state mutation
      fromCache: true
    };
  }

  // Deduplicate concurrent in-flight requests for identical endpoints
  if (inFlightRequests.has(cacheKey)) {
    const res = await inFlightRequests.get(cacheKey);
    return {
      ...res,
      data: JSON.parse(JSON.stringify(res.data)),
      fromCache: true
    };
  }

  const ttl = isLookupUrl(url) ? LOOKUP_TTL : DATA_TTL;

  const requestPromise = originalGet(url, config)
    .then((response) => {
      cacheStore.set(cacheKey, {
        response,
        timestamp: Date.now(),
        ttl
      });
      return response;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

// Automatically invalidate data cache on any mutation (POST, PUT, PATCH, DELETE)
const invalidateOnMutation = (originalMethod) => {
  return async function (...args) {
    try {
      const response = await originalMethod.apply(rawApi, args);
      cacheStore.clear();
      return response;
    } catch (error) {
      throw error;
    }
  };
};

rawApi.post = invalidateOnMutation(rawApi.post.bind(rawApi));
rawApi.put = invalidateOnMutation(rawApi.put.bind(rawApi));
rawApi.patch = invalidateOnMutation(rawApi.patch.bind(rawApi));
rawApi.delete = invalidateOnMutation(rawApi.delete.bind(rawApi));

rawApi.clearCache = clearApiCache;

export default rawApi;

