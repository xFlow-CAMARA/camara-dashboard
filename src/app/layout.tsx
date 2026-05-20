import type { Metadata } from "next";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";

export const metadata: Metadata = {
  title: "CAMARA API Dashboard",
  description: "Test and monitor CAMARA APIs with multiple 5G core backends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
