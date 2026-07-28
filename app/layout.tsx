import type { Metadata } from "next";
import { Antonio, Space_Mono, Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const display = Antonio({
  variable: "--font-display",
  subsets: ["latin"],
});

const mono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const metadataBase = host ? new URL(`${protocol}://${host}`) : undefined;
  const description =
    "Una experiencia cinematográfica para celebrar los 22 años de Raúl García. La historia continúa.";

  return {
    metadataBase,
    title: "Premiere 22 — Raúl García",
    description,
    openGraph: {
      title: "Premiere 22 — Raúl García",
      description,
      type: "website",
      locale: "es_ES",
      images: [{ url: "/og.png", width: 1672, height: 941 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Premiere 22 — Raúl García",
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${mono.variable} ${sans.variable}`}>
        {children}
      </body>
    </html>
  );
}
