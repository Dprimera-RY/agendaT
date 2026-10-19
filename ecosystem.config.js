module.exports = {
  apps: [
    {
      name: 'agendat',
      script: '.next/standalone/server.js',
      cwd: '/media/kronos/PROJECTS/rycode/dprimera/agendaT',          // 👈 raíz del proyecto
      env: {
        NODE_ENV: 'production',
        PORT: 3009,
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: 'file:/media/kronos/PROJECTS/rycode/dprimera/agendaTdb/custom.db',  // 👈 absoluta
      },
    },
  ],
};
