import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Currency Converter — AllRatesToday starter",
  description:
    "Next.js currency converter starter powered by the AllRatesToday API. Works keyless with official ECB reference rates; add a free key for 160+ currencies in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
