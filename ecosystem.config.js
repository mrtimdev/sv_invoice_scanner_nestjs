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
      'post-deploy' : `
        npm install && npm run build && \\
        echo "Creating/Updating .env file..." && \\
        cd {{current}} && \\
        echo "NODE_ENV=production" > .env && \\
        echo "PORT=3000" >> .env && \\
        echo "" >> .env && \\ # Empty line for readability in .env
        echo "# MySQL Database Configuration" >> .env && \\
        echo "DB_TYPE=mysql" >> .env && \\
        echo "DB_HOST=localhost" >> .env && \\
        echo "DB_PORT=3306" >> .env && \\
        echo "DB_USERNAME=root" >> .env && \\ # IMPORTANT: Use a dedicated user, not root, in production!
        echo "DB_PASSWORD=password" >> .env && \\ # IMPORTANT: Use a strong, random, and complex password!
        echo "DB_DATABASE=sv_scanner_db" >> .env && \\
        echo "" >> .env && \\
        echo "# Security Secrets (MUST BE LONG, RANDOM, AND UNIQUE STRINGS)" >> .env && \\
        echo "SESSION_SECRET=TIMDEV_RANDOM_SESSION_SECRET_CHANGE_ME" >> .env && \\ # IMPORTANT: CHANGE THIS!
        echo "JWT_SECRET=\"TIMDEV_RANDOM_JWT_SECRET_CHANGE_ME\"" >> .env && \\   # IMPORTANT: CHANGE THIS!
        echo "JWT_EXPIRES_IN=7d" >> .env && \\
        echo "" >> .env && \\
        echo "# File upload configuration" >> .env && \\
        echo "MAX_FILE_SIZE_MB=5" >> .env && \\
        echo "UPLOAD_PATH=./uploads/scans" >> .env && \\
        echo "" >> .env && \\
        echo "# Public-facing URL (update with your actual domain or public IP)" >> .env && \\
        echo "BASE_URL=\"http://38.242.149.46\"" >> .env && \\
        echo "" >> .env && \\
        echo "# Allowed CORS Origins (update with your actual frontend domains/IPs)" >> .env && \\
        echo "ALLOWED_ORIGINS=\"http://localhost,http://38.242.149.46\"" >> .env && \\
        echo "Service worker removed from PM2 management." && \\
        pm2 reload ecosystem.config.js --env production
      `,
      'pre-setup': 'echo "Setting up server..."' // Command to run on the server before the first deploy
    }
  }
};