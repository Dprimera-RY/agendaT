import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgendaT — Citas Multi-Negocio",
  description: "Plataforma de gestión de citas para múltiples negocios. Reserva, gestiona disponibilidad y controla tu agenda en un solo lugar.",
  keywords: ["citas", "agenda", "reservas", "negocios", "multi-negocio"],
  authors: [{ name: "AgendaT" }],
  manifest: "./manifest.json",
  applicationName: "AgendaT",
  appleWebApp: {
    capable: true,
    title: "AgendaT",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "./logo.png", sizes: "any", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// PWA: color de la barra del navegador/app instalada
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
