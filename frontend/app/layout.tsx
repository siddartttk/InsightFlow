import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./globals.css";
import "./design-tokens.css";
import "./editorial.css";
import "./components.css";
import "./chart-system.css";
import { DataProvider } from "@/components/data-provider";
import { Shell } from "@/components/shell";
import { chartCssVariables } from "@/lib/design-system";
export const metadata: Metadata = {
  title: "InsightFlow | Retail intelligence",
  description:
    "Business intelligence, made actionable. A working retail analytics demonstration with transparent metrics.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={chartCssVariables}>
        <DataProvider>
          <Shell>{children}</Shell>
        </DataProvider>
      </body>
    </html>
  );
}
