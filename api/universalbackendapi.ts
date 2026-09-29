export const PRIMARY_HOST = 'foodco.heymimi.app';
export const FALLBACK_HOST = 'database.heymimi.app';

export const PRIMARY_BASE_URL = `https://${PRIMARY_HOST}/api`;
export const FALLBACK_BASE_URL = `https://${FALLBACK_HOST}/api`;

let activeBaseUrl = PRIMARY_BASE_URL;
let lastFailoverTime = 0;
const FAILOVER_RETRY_INTERVAL_MS = 60 * 1000;

export function getBackendBaseUrl(): string {
  const now = Date.now();
  if (activeBaseUrl !== PRIMARY_BASE_URL && now - lastFailoverTime > FAILOVER_RETRY_INTERVAL_MS) {
    activeBaseUrl = PRIMARY_BASE_URL;
  }
  return activeBaseUrl;
}

export function getApiUrl(endpoint: string, base: string = getBackendBaseUrl()): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export async function universalFetch(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 6000
): Promise<Response> {
  const currentBase = getBackendBaseUrl();
  const primaryUrl = getApiUrl(endpoint, currentBase);
  const fallbackBase = currentBase === PRIMARY_BASE_URL ? FALLBACK_BASE_URL : PRIMARY_BASE_URL;
  const fallbackUrl = getApiUrl(endpoint, fallbackBase);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const combinedSignal = options.signal || controller.signal;

    const res = await fetch(primaryUrl, {
      ...options,
      signal: combinedSignal,
    });
    clearTimeout(timer);

    if (!res.ok && res.status >= 502 && res.status <= 504) {
      throw new Error(`Server returned ${res.status}`);
    }

    return res;
  } catch (err) {
    activeBaseUrl = fallbackBase;
    lastFailoverTime = Date.now();

    const fallbackController = new AbortController();
    const fallbackTimer = setTimeout(() => fallbackController.abort(), timeoutMs);

    try {
      const fallbackRes = await fetch(fallbackUrl, {
        ...options,
        signal: fallbackController.signal,
      });
      clearTimeout(fallbackTimer);
      return fallbackRes;
    } catch (fallbackErr) {
      clearTimeout(fallbackTimer);
      throw fallbackErr;
    }
  }
}

export const UNIVERSAL_ENDPOINTS = {
  auth: () => getApiUrl('/auth'),
  productByBarcode: (barcode: string) => getApiUrl(`/products/${encodeURIComponent(barcode)}`),
  productsByCategory: (category: string) => getApiUrl(`/products/category/${encodeURIComponent(category)}`),
  searchProducts: () => getApiUrl('/products/search'),
  randomItems: () => getApiUrl('/items/random'),
  itemByBarcode: (barcode: string) => getApiUrl(`/items/${encodeURIComponent(barcode)}`),
};

export default {
  PRIMARY_HOST,
  FALLBACK_HOST,
  PRIMARY_BASE_URL,
  FALLBACK_BASE_URL,
  getBackendBaseUrl,
  getApiUrl,
  universalFetch,
  UNIVERSAL_ENDPOINTS,
};
