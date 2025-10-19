// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


// import path from "path"
// import tailwindcss from "@tailwindcss/vite"
// import react from "@vitejs/plugin-react"
// import { defineConfig } from "vite"

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
// })


// import path from "path";
// import tailwindcss from "@tailwindcss/vite";
// import react from "@vitejs/plugin-react";
// import { defineConfig } from "vite";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
//   server: {
//     proxy: {
//       "/api": {
//         target: "http://localhost:3000",
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
// });

// import path from "path";
// import tailwindcss from "@tailwindcss/vite";
// import react from "@vitejs/plugin-react";
// import { defineConfig } from "vite";

// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
//   server: {
//     host: "0.0.0.0",  // allow external access (LAN/public)
//     port: 5175,       // use your open port
//     proxy: {
//       "/api": {
//         target: "http://localhost:3000", // backend (Express)
//         changeOrigin: true,
//         secure: false,
//       },
//     },
//   },
// });



import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const HMR_HOST = process.env.VITE_HMR_HOST || process.env.HMR_HOST || '';
  const HMR_HTTPS = (process.env.VITE_HMR_HTTPS || '').toLowerCase() === 'true';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5175,
      strictPort: true,
      host: true, // binds to all interfaces (0.0.0.0)
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3000", // backend running on same server
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: HMR_HOST
        ? {
            host: HMR_HOST,
            protocol: HMR_HTTPS ? "wss" : "ws",
            clientPort: HMR_HTTPS ? 443 : 5175,
          }
        : undefined,
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
    },
  };
});

