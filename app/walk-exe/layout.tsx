import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "M00NW4LK.EXE — Experiencia 3D",
  description:
    "Un laberinto de terror procedural en primera persona dentro de Premiere 22.",
};

export default function WalkExeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
