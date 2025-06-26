module.exports = {
    apps : [{
        name: 'SV Invoice Scanner', // A name for your application
        script: 'dist/main.js',
        instances: 'max',            // Max instances based on CPU cores
        exec_mode: 'cluster',        // Run in cluster mode for better performance
        watch: false,                // Set to true for development, false for production
        env_production: {
        NODE_ENV: 'production',
        PORT: 3000, // Or whatever port your NestJS app listens on
        // ... other production specific env vars
        }
    }, {
            name: 'sv-invoice-scanner', // A name for your service worker
            script: './service-worker/index.js', // Assuming an index.js inside the service-worker folder
            watch: ['./service-worker']
    }],

  deploy : {
    production : {
        user : 'timdev', // Replace with your SSH username
        host : '38.242.149.46', // Replace with your server's IP address or hostname
        ref  : 'origin/master',
        repo : 'git@github.com:mrtimdev/sv_invoice_scanner_nestjs.git', // Replace with your Git repository URL
        // path : '/projects/timdev/sv_invoice_scanner_nestjs', // Replace with the deployment path on your server
        path : '~/sv_invoice_scanner_nestjs',
        'pre-deploy-local': 'echo "Starting deployment..."', // Command to run on your local machine before deployment
        'post-deploy' : 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
        'pre-setup': 'echo "Setting up server..."' // Command to run on the server before the first deploy
    }
  }
};