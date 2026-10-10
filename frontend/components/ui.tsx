import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./icon";

export function Button({
  variant = "secondary",
  pending = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  pending?: boolean;
  icon?: string;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`button button-${variant} ${className}`}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function StatusMessage({
  tone = "info",
  children,
  onDismiss,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`status-message status-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon
        name={
          tone === "success"
            ? "success"
            : tone === "error"
              ? "warning"
              : "about"
        }
        size={18}
      />
      <div>{children}</div>
      {onDismiss && (
        <button
          type="button"
          className="icon-button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <Icon name="close" size={15} />
        </button>
      )}
    </div>
  );
}

export function FeedbackState({
  tone,
  title,
  children,
  actions,
}: {
  tone: "empty" | "error";
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      className={`feedback-state ${tone === "error" ? "error-state" : "empty-state"}`}
      role={tone === "error" ? "alert" : undefined}
    >
      <span className="feedback-symbol">
        <Icon name={tone === "error" ? "warning" : "reports"} size={26} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
        {actions && <div className="state-actions">{actions}</div>}
      </div>
    </section>
  );
}

export function TableViewport({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div
      className="loading-state"
      role="status"
      aria-label="Loading analytics"
      aria-busy="true"
    >
      <p>Loading your analysis…</p>
      <div className="loading-metrics">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="loading-metric">
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
            <span className="skeleton skeleton-detail" />
          </div>
        ))}
      </div>
      <div className="loading-analysis">
        <div className="skeleton skeleton-analysis" />
        <div className="loading-rail">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton skeleton-stat" />
          ))}
        </div>
      </div>
    </div>
  );
}
