import { notFound } from "next/navigation";
import { AnalyticsPage } from "@/components/analytics-page";
const sections = [
  "overview",
  "revenue",
  "products",
  "customers",
  "insights",
  "import",
  "reports",
  "about",
  "privacy",
  "terms",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return <AnalyticsPage section={section} />;
}
