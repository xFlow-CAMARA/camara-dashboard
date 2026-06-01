import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAMARA API Dashboard",
  description: "Test and monitor CAMARA APIs with multiple 5G core backends",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
