import Link from "next/link";
export default function NotFound() {
  return (
    <div className="state-panel">
      <h1>Page not found</h1>
      <p>Return to your retail workspace.</p>
      <Link href="/overview" className="button button-primary">
        Open overview
      </Link>
    </div>
  );
}
