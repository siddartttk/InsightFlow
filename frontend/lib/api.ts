import type { Filters } from "./types";
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");
export function query(filters: Filters) {
  const params = new URLSearchParams({
    start: filters.start,
    end: filters.end,
    interval: filters.interval,
  });
  if (filters.country) params.set("country", filters.country);
  return params.toString();
}
export function headers(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    signal: AbortSignal.any([
      ...(options.signal ? [options.signal] : []),
      AbortSignal.timeout(65_000),
    ]),
    headers: { ...headers(token), ...options.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : `The API could not complete this request (${response.status}). Check your filters or try again.`,
    );
  }
  return response.json() as Promise<T>;
}
export async function downloadReport(
  report: "kpis" | "products" | "segments",
  filters: Filters,
  token: string | null,
) {
  const response = await fetch(
    `${API_URL}/api/export?${query(filters)}&report=${report}`,
    {
      headers: headers(token),
      cache: "no-store",
      signal: AbortSignal.timeout(65_000),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "The report could not be downloaded. Try again, or check whether your upload session has expired.",
    );
  }
  saveBlob(
    await response.blob(),
    `insightflow-${report}-${filters.start}-${filters.end}.csv`,
  );
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
