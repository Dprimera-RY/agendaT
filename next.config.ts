import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Origenes permitidos para los recursos internos de dev (websocket de HMR
  // incluido). Sin esto, al abrir la app desde otra PC de la red con
  // http://<ip-local>:3000 Next bloquea el upgrade del WS con 403.
  // Se comparan solo hostnames (sin protocolo) y sin puerto.
  allowedDevOrigins: ["localhost", "**.localhost", "192.168.*.*"],
};

export default nextConfig;
