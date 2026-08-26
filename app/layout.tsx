import type { Metadata } from "next";
import "@fontsource-variable/m-plus-1-code";
import "./globals.css";

export const metadata: Metadata = {
  title: "日本住宅贷款利率比较",
  description: "日本住宅贷款变动、固定、全期间固定利率比较。住宅ローンの金利を比較。",
  metadataBase: new URL("https://loan.motoish.dev"),
  openGraph: {
    title: "日本住宅贷款利率比较",
    description: "日本住宅贷款变动、固定、全期间固定利率比较。",
    url: "https://loan.motoish.dev",
    siteName: "日本住宅贷款利率比较",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "日本住宅贷款利率比较",
    description: "日本住宅贷款利率比较",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
