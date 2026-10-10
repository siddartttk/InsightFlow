"use client";
import { useRef, useState } from "react";
import { useData } from "./data-provider";
import { request, saveBlob } from "@/lib/api";
import type { UploadResult } from "@/lib/types";
import { number } from "@/lib/formatters";
import { Icon } from "./icon";
import Link from "next/link";
import { Button, StatusMessage, TableViewport } from "./ui";
const schema = [
  "InvoiceNo",
  "StockCode",
  "Description",
  "Quantity",
  "InvoiceDate",
  "UnitPrice",
  "CustomerID",
  "Country",
];
export function ImportData() {
  const { meta, applyUpload, switchToDemo, token } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [templateReady, setTemplateReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function select(selected: File | null) {
    setError("");
    setResult(null);
    setFile(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError(
        "Choose a CSV file. Excel workbooks must first be saved as CSV.",
      );
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError(
        "The file exceeds 5 MB. Export a smaller range of transactions.",
      );
      return;
    }
    if (!selected.size) {
      setError("The file is empty. Choose a CSV containing transactions.");
      return;
    }
    setFile(selected);
  }
  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const uploaded = await request<UploadResult>("/api/upload", null, {
        method: "POST",
        body: form,
      });
      setResult(uploaded);
      applyUpload(uploaded);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "The data service is unavailable. Please try importing again in a moment."
          : err instanceof Error
            ? err.message
            : "Upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function template() {
    saveBlob(
      new Blob(
        [
          schema.join(",") +
            "\n10001,P001,Ceramic mug,2,2024-01-01 10:00:00,4.95,customer-1,United Kingdom\n10002,P001,Ceramic mug,3,2024-01-02 10:00:00,4.95,customer-1,United Kingdom\nC10002,P001,Ceramic mug,-1,2024-01-03 10:00:00,4.95,customer-1,United Kingdom\n",
        ],
        { type: "text/csv" },
      ),
      "insightflow-upload-template.csv",
    );
    setTemplateReady(true);
  }
  const enabled = meta?.uploads_enabled !== false;
  return (
    <>
      <section className="panel import-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">TRANSACTION DATA</p>
            <h2>Import transaction data</h2>
          </div>
          <Button icon="download" onClick={template}>
            CSV template
          </Button>
        </div>
        <div className="import-content">
          <p>
            Your CSV is sent to the data service for processing. Accepted data
            is held in server memory for{" "}
            {meta ? Math.round(meta.session_ttl_seconds / 60) : 30} minutes in a
            separate temporary session. Raw files are not saved by the
            application. Customer IDs are excluded from the preview.
          </p>
          {!enabled ? (
            <StatusMessage>
              Private uploads are disabled on this deployment. You can explore
              the demonstration dataset and download a CSV template.
            </StatusMessage>
          ) : (
            <>
              <div
                className="upload-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy) select(event.dataTransfer.files[0] || null);
                }}
              >
                <Icon name="import" size={30} />
                <h3>{file ? file.name : "Choose your transaction CSV"}</h3>
                <p>
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB · ready to validate`
                    : "Drag a CSV here, or choose a file from your computer."}
                </p>
                <input
                  ref={input}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Choose transaction CSV"
                  aria-describedby="upload-guidance"
                  aria-invalid={!!error}
                  disabled={busy}
                  onChange={(event) => select(event.target.files?.[0] || null)}
                />
                <small id="upload-guidance">
                  UTF-8 CSV · up to 5 MB · up to 100,000 rows
                </small>
                {file && (
                  <button
                    className="text-link"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      select(null);
                      if (input.current) input.current.value = "";
                    }}
                  >
                    Remove file
                  </button>
                )}
              </div>
              <div className="upload-actions">
                <span>
                  Use ISO dates such as 2024-01-31. Prices are in GBP.
                </span>
                <Button
                  variant="primary"
                  pending={busy}
                  disabled={!file || busy}
                  onClick={() => void upload()}
                >
                  {busy ? "Validating & importing…" : "Validate & import"}
                </Button>
              </div>
            </>
          )}
          {error && <StatusMessage tone="error">{error}</StatusMessage>}
          {busy && (
            <div className="inline-loading" role="status">
              Validating schema, cleaning transactions and creating your
              session…
            </div>
          )}
          {result && (
            <div className="upload-success">
              <StatusMessage tone="success">
                <h3>Dataset imported</h3>
                <p>
                  {number(result.metadata.quality.retained_rows)} valid
                  transaction rows now power every analytics page. Session
                  lifetime: {Math.round(result.expires_in / 60)} minutes.
                  Reloading the page clears the token from this browser.
                </p>
                <Link href="/overview" className="text-link">
                  Open business overview ↗
                </Link>
              </StatusMessage>
              <QualitySummary quality={result.metadata.quality} />
              <h3 className="preview-title">Record preview</h3>
              <TableViewport label="Imported records preview, scroll horizontally for all columns">
                <table>
                  <caption className="sr-only">
                    Preview of accepted records. Customer identifiers are
                    excluded.
                  </caption>
                  <thead>
                    <tr>
                      {Object.keys(result.preview[0] || {}).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j}>{value ?? "Missing"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableViewport>
            </div>
          )}
          {token && (
            <Button
              className="reset-upload"
              onClick={() => {
                switchToDemo();
                setResult(null);
                setFile(null);
                if (input.current) input.current.value = "";
              }}
            >
              Delete this session & return to demo
            </Button>
          )}
        </div>
        {templateReady && (
          <StatusMessage
            tone="success"
            onDismiss={() => setTemplateReady(false)}
          >
            CSV template download prepared. The included example rows show the
            required format.
          </StatusMessage>
        )}
      </section>
      <section className="panel prose-panel">
        <p className="eyebrow">COMPATIBILITY & CLEANING</p>
        <h2>A clear data contract</h2>
        <p>
          Required columns: <code>{schema.join(", ")}</code>. Column casing,
          spaces and underscores are normalized. Basic aliases are supported:
          order_id → InvoiceNo, sku → StockCode, product_name → Description, qty
          → Quantity, order_date → InvoiceDate, price → UnitPrice and market →
          Country.
        </p>
        <p>
          Exact duplicates after normalization are removed once. Invalid dates,
          non-positive prices, missing invoice/product codes, zero or fractional
          quantities, and values beyond the documented bounds are excluded and
          counted. Missing customer IDs remain in sales analysis and are
          excluded from customer counts. Missing product descriptions remain in
          sales totals but are excluded from product rankings. Missing countries
          become Unknown.
        </p>
        <p>
          C-prefixed invoices and negative quantities are returns. Each
          contributes a negative absolute value to net sales. No matching to the
          original sale is assumed. Use the data-quality report to review the
          exclusions.
        </p>
      </section>
    </>
  );
}
export function QualitySummary({
  quality,
}: {
  quality: NonNullable<ReturnType<typeof useData>["meta"]>["quality"];
}) {
  return (
    <dl className="quality-grid">
      {[
        ["Input rows", quality.input_rows],
        ["Retained rows", quality.retained_rows],
        ["Duplicates removed", quality.duplicate_rows],
        ["Invalid rows excluded", quality.invalid_rows],
        ["Missing customer ID", quality.missing_customer_rows],
        ["Missing description", quality.missing_description_rows],
        ["Missing country", quality.missing_country_rows],
        ["Return rows", quality.return_rows],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{number(value as number)}</dd>
        </div>
      ))}
    </dl>
  );
}
