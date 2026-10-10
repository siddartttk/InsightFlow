"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Dashboard, Filters, Metadata, UploadResult } from "@/lib/types";
import { API_URL, query, request } from "@/lib/api";

interface State {
  meta: Metadata | null;
  data: Dashboard | null;
  filters: Filters;
  loading: boolean;
  error: string;
  token: string | null;
  setFilters: (filters: Filters) => void;
  retry: () => void;
  applyUpload: (result: UploadResult) => void;
  switchToDemo: () => Promise<void>;
}
const DataContext = createContext<State | null>(null);
const initial: Filters = {
  start: "",
  end: "",
  country: "",
  interval: "weekly",
};
export function defaultFilters(meta: Metadata): Filters {
  const day = new Date(`${meta.end}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 89);
  return {
    start: [meta.start, day.toISOString().slice(0, 10)].sort()[1],
    end: meta.end,
    country: "",
    interval: "weekly",
  };
}
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [filters, setFilters] = useState<Filters>(initial);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      try {
        const metadata = await request<Metadata>("/api/meta", token, {
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        setMeta(metadata);
        const active =
          filters.start && filters.end ? filters : defaultFilters(metadata);
        if (!filters.start) {
          setFilters(active);
          return;
        }
        const dashboard = await request<Dashboard>(
          `/api/dashboard?${query(active)}`,
          token,
          { signal: abort.signal },
        );
        if (!abort.signal.aborted) setData(dashboard);
      } catch (err) {
        if (!abort.signal.aborted)
          setError(
            err instanceof TypeError
              ? "The data service could not be reached. Check your connection and try again in a moment."
              : err instanceof Error
                ? err.message
                : "Something went wrong. Please try again.",
          );
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [token, filters, revision]);
  const applyUpload = useCallback((result: UploadResult) => {
    setMeta(result.metadata);
    setFilters(defaultFilters(result.metadata));
    setToken(result.token);
  }, []);
  const switchToDemo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (token) {
        const response = await fetch(`${API_URL}/api/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok && response.status !== 401)
          throw new Error("Deletion failed");
      }
      setToken(null);
      setMeta(null);
      setData(null);
      setFilters(initial);
      setRevision((r) => r + 1);
    } catch {
      setError(
        "The API could not confirm session deletion. Try again when it reconnects. The server session will still expire at its original deadline.",
      );
      setData(null);
      setLoading(false);
    }
  }, [token]);
  return (
    <DataContext.Provider
      value={{
        meta,
        data,
        filters,
        setFilters,
        loading,
        error,
        token,
        retry: () => setRevision((r) => r + 1),
        applyUpload,
        switchToDemo,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("Missing DataProvider");
  return value;
}
