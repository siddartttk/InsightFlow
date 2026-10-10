"use client";
import { useState } from "react";
import { useData } from "./data-provider";
import { Button } from "./ui";
export function Filters() {
  const { filters, setFilters, meta, loading } = useData();
  const [start, setStart] = useState(filters.start);
  const [end, setEnd] = useState(filters.end);
  const [country, setCountry] = useState(filters.country);
  const [error, setError] = useState("");
  const changed =
    start !== filters.start ||
    end !== filters.end ||
    country !== filters.country;
  function rangeStart(days: number | null) {
    if (!meta) return "";
    const day = new Date(meta.end + "T12:00:00Z");
    if (days) day.setUTCDate(day.getUTCDate() - days + 1);
    return days
      ? [meta.start, day.toISOString().slice(0, 10)].sort()[1]
      : meta.start;
  }
  function preset(days: number | null, resetMarket = false) {
    if (!meta) return;
    const nextStart = rangeStart(days);
    setStart(nextStart);
    setEnd(meta.end);
    if (resetMarket) setCountry("");
    setError("");
    setFilters({
      ...filters,
      start: nextStart,
      end: meta.end,
      country: resetMarket ? "" : country,
    });
  }
  return (
    <form
      className="filters"
      onSubmit={(event) => {
        event.preventDefault();
        if (!start || !end || start > end) {
          setError("Choose a start date on or before the end date.");
          return;
        }
        setError("");
        setFilters({ ...filters, start, end, country });
      }}
    >
      <div className="filter-presets" role="group" aria-label="Date presets">
        {(
          [
            [30, "Last 30 days"],
            [90, "Last 90 days"],
            [null, "All data"],
          ] as const
        ).map(([days, label]) => (
          <button
            key={label}
            type="button"
            disabled={loading}
            aria-pressed={start === rangeStart(days) && end === meta?.end}
            onClick={() => preset(days)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="filter-fields">
        <label>
          From
          <input
            aria-label="From date"
            type="date"
            aria-invalid={!!error}
            aria-describedby={error ? "filter-error" : undefined}
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <span className="date-separator">to</span>
        <label>
          To
          <input
            aria-label="To date"
            type="date"
            aria-invalid={!!error}
            aria-describedby={error ? "filter-error" : undefined}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
        <label className="country-filter">
          Market
          <select
            aria-label="Market"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">All markets</option>
            {meta?.countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          variant="primary"
          className="filter-apply"
          disabled={loading}
        >
          Apply filters
        </Button>
        <button
          type="button"
          className="filter-reset"
          disabled={loading}
          onClick={() => preset(null, true)}
        >
          Reset filters
        </button>
      </div>
      {changed && !error && (
        <p className="filter-draft" role="status">
          Changes ready to apply
        </p>
      )}
      {error && (
        <p id="filter-error" className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
