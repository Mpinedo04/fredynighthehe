import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

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
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    },
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
      <body>{children}</body>
    </html>
  );
}
