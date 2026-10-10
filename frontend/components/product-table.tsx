"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { money, number } from "@/lib/formatters";
import { Icon } from "./icon";
import { TableViewport } from "./ui";
export function ProductTable({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<
    "revenue" | "quantity" | "orders" | "description"
  >("revenue");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const sorted = useMemo(
    () =>
      products
        .filter((p) =>
          `${p.code} ${p.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort(
          (a, b) =>
            (sort === "description"
              ? a.description.localeCompare(b.description)
              : a[sort] - b[sort]) * (ascending ? 1 : -1),
        ),
    [products, search, sort, ascending],
  );
  const maxPage = Math.max(0, Math.ceil(sorted.length / 10) - 1);
  const activePage = Math.min(page, maxPage);
  const rows = sorted.slice(activePage * 10, activePage * 10 + 10);
  function order(key: typeof sort) {
    setAscending(key === sort ? !ascending : false);
    setSort(key);
    setPage(0);
  }
  return (
    <section className="panel product-table">
      <div className="panel-header">
        <div>
          <p className="eyebrow">THE DETAIL BEHIND THE NUMBERS</p>
          <h2>Product performance</h2>
        </div>
        <label className="search-field">
          <span className="sr-only">Search products</span>
          <Icon name="search" size={17} />
          <input
            type="search"
            placeholder="Search product or code…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
          {search && (
            <button
              type="button"
              className="icon-button search-clear"
              aria-label="Clear product search"
              onClick={() => {
                setSearch("");
                setPage(0);
              }}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </label>
      </div>
      <TableViewport label="Product performance table, scroll horizontally for all columns">
        <table>
          <caption className="sr-only">
            Products for the selected dates and market. Sort by product, gross
            sales, units or orders.
          </caption>
          <thead>
            <tr>
              <th
                aria-sort={
                  sort === "description"
                    ? ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button onClick={() => order("description")}>
                  Product {sort === "description" && (ascending ? "↑" : "↓")}
                </button>
              </th>
              <th>Stock code</th>
              <th
                aria-sort={
                  sort === "revenue"
                    ? ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button onClick={() => order("revenue")}>
                  Gross sales {sort === "revenue" && (ascending ? "↑" : "↓")}
                </button>
              </th>
              <th
                aria-sort={
                  sort === "quantity"
                    ? ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button onClick={() => order("quantity")}>
                  Units {sort === "quantity" && (ascending ? "↑" : "↓")}
                </button>
              </th>
              <th
                aria-sort={
                  sort === "orders"
                    ? ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button onClick={() => order("orders")}>
                  Orders {sort === "orders" && (ascending ? "↑" : "↓")}
                </button>
              </th>
              <th>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((p) => (
                <tr key={p.code}>
                  <td className="product-name">
                    {p.description.toLowerCase()}
                  </td>
                  <td className="mono muted">{p.code}</td>
                  <td className="table-money numeric">{money(p.revenue)}</td>
                  <td className="numeric">{number(p.quantity)}</td>
                  <td className="numeric">{number(p.orders)}</td>
                  <td>
                    <div className="contribution">
                      <span>{p.share.toFixed(1)}%</span>
                      <span className="contribution-track">
                        <span style={{ width: `${p.share}%` }} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="empty-table">
                  No products match this selection.
                  {search && (
                    <button
                      type="button"
                      className="text-link empty-search-reset"
                      onClick={() => {
                        setSearch("");
                        setPage(0);
                      }}
                    >
                      Clear search
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableViewport>
      <div className="table-pagination">
        <span role="status" aria-live="polite">
          {sorted.length ? activePage * 10 + 1 : 0}–
          {Math.min((activePage + 1) * 10, sorted.length)} of{" "}
          {number(sorted.length)} products
        </span>
        <div>
          <button
            disabled={activePage === 0}
            onClick={() => setPage(activePage - 1)}
          >
            Previous
          </button>
          <button
            disabled={activePage >= maxPage}
            onClick={() => setPage(activePage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
