export const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface RpcResponse<T> {
  jsonrpc: "2.0";
  result?: T;
  error?: { code: number; message: string; data?: unknown };
  id: string | number;
}

let authToken: string | null = null;
let _refreshPromise: Promise<boolean> | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function rpcCall<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}/rpc`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: crypto.randomUUID(),
    }),
  });

  if (!response.ok) {
    throw new RpcError(-32603, `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: RpcResponse<T> = await response.json();

  if (data.error) {
    throw new RpcError(data.error.code, data.error.message, data.error.data);
  }

  return data.result as T;
}

export class RpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = "RpcError";
  }
}

export function refreshAccessToken(): Promise<boolean> {
  // Deduplicate concurrent refresh calls — all callers share the same promise.
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

async function _doRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "auth.refresh",
        params: { refreshToken },
        id: crypto.randomUUID(),
      }),
    });
    const data = await response.json();
    if (data.result?.tokens?.accessToken) {
      setAuthToken(data.result.tokens.accessToken);
      localStorage.setItem("refreshToken", data.result.tokens.refreshToken);
      return true;
    }
  } catch {
    // refresh failed — caller decides what to do
  }
  return false;
}
