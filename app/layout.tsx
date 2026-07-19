import type { Metadata } from "next";
import Nav from "../components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThesisMatch",
  description: "ThesisMatch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
