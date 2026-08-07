import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  description: "Web application",
  title: "Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
