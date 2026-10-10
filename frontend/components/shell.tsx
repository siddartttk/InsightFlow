"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "./icon";
import { useData } from "./data-provider";
const navigation = [
  ["overview", "Overview"],
  ["revenue", "Revenue"],
  ["products", "Products"],
  ["customers", "Customers"],
  ["insights", "Insights"],
  ["import", "Data Import"],
  ["reports", "Reports"],
  ["about", "About the Data"],
];
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const mobile = useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia("(max-width: 760px)").matches,
    () => false,
  );
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = menu.current;
    document.body.style.overflow = "hidden";
    const first =
      sidebar.current?.querySelector<HTMLButtonElement>(".nav-close");
    first?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) || [],
      ).filter((el) => el.offsetParent !== null);
      const current = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && current <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && current === items.length - 1) {
        event.preventDefault();
        items[0]?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [open, mobile]);
  const { meta, token, switchToDemo } = useData();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {open && mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-navigation"
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        inert={mobile && !open ? true : undefined}
      >
        <Link href="/overview" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-wordmark">
            insight<span>flow</span>
            <span className="brand-period">.</span>
          </span>
        </Link>
        <p className="brand-caption">RETAIL INTELLIGENCE</p>
        <button
          className="nav-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" />
        </button>
        <div className="workspace-card">
          <div>
            <small>WORKSPACE 01</small>
            <strong>Retail workspace</strong>
          </div>
        </div>
        <p className="nav-label">ANALYSIS</p>
        <nav>
          {navigation.map(([slug, title], i) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className={`nav-link ${path === `/${slug}` || (path === "/" && i === 0) ? "active" : ""} ${i === 5 ? "nav-divider" : ""}`}
              onClick={() => setOpen(false)}
              aria-current={path === `/${slug}` ? "page" : undefined}
            >
              <Icon name={slug} size={17} />
              <span>{title}</span>
              {path === `/${slug}` && <span className="nav-active-marker" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="dataset-label">
            <span className="status-dot" />
            {token ? "Private upload session" : "Demonstration dataset"}
          </div>
          <p>
            {token
              ? "Temporary · held in API memory"
              : meta?.synthetic
                ? "Synthetic · clearly labelled"
                : "UCI Online Retail · historical"}
          </p>
          {token && (
            <button onClick={switchToDemo} className="sidebar-reset">
              Delete session & use demo
            </button>
          )}
          <div className="sidebar-legal">
            <Link href="/privacy" onClick={() => setOpen(false)}>
              Privacy
            </Link>
            <Link href="/terms" onClick={() => setOpen(false)}>
              Terms
            </Link>
          </div>
          <div className="profile">
            <span>IF</span>
            <div>
              <strong>InsightFlow demo</strong>
              <small>Business intelligence, made actionable.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={mobile && open ? true : undefined}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              ref={menu}
              className="menu-button icon-button"
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="workspace-navigation"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb">
              Retail workspace <span>/</span>{" "}
              <strong>
                {navigation.find(([slug]) => path === `/${slug}`)?.[1] ||
                  (path === "/privacy"
                    ? "Privacy Policy"
                    : path === "/terms"
                      ? "Terms of Use"
                      : "Overview")}
              </strong>
            </span>
          </div>
          <span className="topbar-note">
            GBP <span className="topbar-rule" />{" "}
            {token ? "PRIVATE SESSION" : "HISTORICAL DEMO"}
          </span>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="main-footer">
          <span>
            InsightFlow <span className="footer-dot">·</span> Business
            intelligence, made actionable.
          </span>
          <Link href="/about">Data attribution & methodology</Link>
        </footer>
      </div>
    </div>
  );
}
