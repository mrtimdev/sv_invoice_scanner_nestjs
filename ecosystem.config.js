module.exports = {
  apps : [{
    name: 'sv-invoice-scanner', // A name for your application
    script: 'dist/main.js',    // Your NestJS application's entry point after compilation
    instances: 'max',          // Max instances based on CPU cores
    exec_mode: 'cluster',      // Run in cluster mode for better performance
    watch: false,              // Set to true for development, false for production
    env_production: {
      NODE_ENV: 'production',
      // Note: PORT and other app-specific variables will be loaded from the .env file
      // that we're creating in the post-deploy script.
      // You can still define app-specific PM2 env vars here if they are *not* in .env
    }
  }],

  deploy : {
    production : {
      user : 'timdev', // Your SSH username
      host : '38.242.149.46', // Your server's IP address or hostname
      ref  : 'origin/master', // The Git branch to deploy from
      repo : 'https://github.com/mrtimdev/sv_invoice_scanner_nestjs.git', // Your Git repository URL
      path : '/home/timdev/projects/timdev/sv_invoice_scanner_nestjs', // The deployment path on your server
      'pre-deploy-local': 'echo "Starting deployment..."', // Command to run on your local machine before deployment
      'post-deploy': `
        cd {{current}} && \
        npm install && \
        npm run build && \
        pm2 reload ecosystem.config.js --env production
      `,

      'pre-setup': 'echo "Setting up server..."' // Command to run on the server before the first deploy
    }
  }
};