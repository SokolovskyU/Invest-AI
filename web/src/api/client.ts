type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
};

type ApiErrorBody = {
  error?: string;
  details?: unknown;
};

async function requestJson<T>(url: string, options?: RequestOptions): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Number(options?.timeoutMs || 20_000);
  const timerId = window.setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(url, {
    method: options?.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    signal: controller.signal,
  })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Request timeout after ${Math.round(timeoutMs / 1000)}s`);
      }
      throw error;
    })
    .finally(() => {
      window.clearTimeout(timerId);
    });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errorBody = (await response.json()) as ApiErrorBody;
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export function fetchJson<T>(url: string): Promise<T> {
  return requestJson<T>(url, { method: "GET" });
}

export function postJson<TRes, TReq = unknown>(url: string, body: TReq): Promise<TRes> {
  return requestJson<TRes>(url, { method: "POST", body });
}
