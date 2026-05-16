import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Divvy — CSV Splitter",
  description:
    "Split any CSV into equal parts and download them instantly. No signup, no upload — runs 100% in your browser.",
  metadataBase: new URL("https://divvy.ericscottstudios.com"),
  openGraph: {
    title: "Divvy — CSV Splitter",
    description:
      "Split any CSV into equal parts and download them instantly. No signup, no upload — runs 100% in your browser.",
    url: "https://divvy.ericscottstudios.com",
    siteName: "Divvy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Divvy — CSV Splitter",
    description:
      "Split any CSV into equal parts and download them instantly. No signup, no upload — runs 100% in your browser.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
