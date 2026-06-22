module.exports = {
  apps: [
    {
      name: "psba-hr-api",
      script: "./src/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3100,
      },
      watch: false,
      ignore_watch: ["node_modules", "uploads", "logs"],
      max_memory_restart: "500M",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
