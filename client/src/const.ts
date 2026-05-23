const LOCAL_HTTP_HOSTS = new Set(["localhost", "127.0.0.1"]);

function getConfiguredApiBaseUrl() {
  const rawValue = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!rawValue) return "";

  try {
    const url = new URL(rawValue);
    const isHttps = url.protocol === "https:";
    const isLocalHttp =
      url.protocol === "http:" && LOCAL_HTTP_HOSTS.has(url.hostname);

    if (!isHttps && !isLocalHttp) return "";

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function getApiBaseUrl() {
  return getConfiguredApiBaseUrl();
}

export function getApiUrl(path: string) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) return path;

  return new URL(path, `${apiBaseUrl}/`).toString();
}
