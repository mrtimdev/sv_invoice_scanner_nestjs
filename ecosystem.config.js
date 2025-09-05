module.exports = {
  apps: [
    {
      name: 'sv-scanner',
      script: 'dist/main.js',
      instances: 'max',          // Use all CPU cores
      exec_mode: 'cluster',      // Cluster mode for load balancing
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    production: {
      user: 'deverloper',
      host: '192.168.1.249',
      port : 22236,
      ref: 'origin/master',
      repo: 'https://github.com/mrtimdev/sv_invoice_scanner_nestjs.git',
      path: '/home/deverloper/sv_scanner',
      'pre-deploy-local': 'echo "🚀 Starting deployment..."',
      'post-deploy': `
        cd /home/deverloper/sv_scanner/current && \
        npm install && \
        npm run build && \
        pm2 reload ecosystem.config.js --env production
      `,
      'pre-setup': 'echo "⚙️ Setting up server..."',
    },
  },
};
