
ssh deverloper@your-server-ip

📦 2. Install Required Packages

sudo apt update && sudo apt install -y curl wget git build-essential

# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install specific Node.js version
nvm install 22.17.0
nvm use 22.17.0

# Set default
nvm alias default 22.17.0

🪄 PM2
npm install -g pm2
pm2 start dist/main.js --name sv-scanner
pm2 startup
pm2 save

🛠 3. Create MySQL Database

sudo apt install mysql-server -y
sudo systemctl status mysql
sudo systemctl start mysql
sudo systemctl enable mysql

sudo mysql

CREATE DATABASE sv_scanner_db;
CREATE USER 'svuser'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON sv_scanner_db.* TO 'svuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;


📁 4. Upload Your NestJS Project

/home/deverloper/sv_scanner/source


🔧 6. Create systemd Service File

sudo nano /etc/systemd/system/sv-scanner.service

[Unit]
Description=SV Invoice Scanner
After=network.target

[Service]
User=deverloper
Group=deverloper
WorkingDirectory=/home/deverloper/sv_scanner
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin:/home/deverloper/.nvm/versions/node/v22.17.0/bin
ExecStart=/home/deverloper/.nvm/versions/node/v22.17.0/bin/node dist/main.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target


📂 7. Reload systemd & Enable the Service

sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl stop sv-scanner
sudo systemctl enable sv-scanner
sudo systemctl start sv-scanner
sudo journalctl -u sv-scanner.service -f
D!$$&3949acq

Check status:
sudo systemctl status sv-scanner

sudo journalctl -u sv-scanner.service -f

🌐 8. Allow Port 3000

sudo ufw allow 3000
sudo ufw reload

sudo ufw allow 3443
sudo ufw reload

# Create directories for uploads and backup
mkdir -p /home/deverloper/uploads
mkdir -p /home/deverloper/backup


# Change ownership to 'deverloper' user and group
chown -R deverloper:deverloper /home/deverloper/uploads
chown -R deverloper:deverloper /home/deverloper/backup

# Set appropriate permissions
chmod 755 /home/deverloper/uploads
chmod 755 /home/deverloper/backup

sudo mkdir -p /home/deverloper/backup
sudo chown -R deverloper:deverloper /home/deverloper/backup

nano /home/deverloper/backup.sh
#!/bin/bash

# Current date
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Paths
BACKUP_DIR="/home/deverloper/backup"
SOURCE_DIR="/home/deverloper/sv_scanner/source"
DB_NAME="sv_scanner_temp_1"
DB_USER="your_mysql_user"
DB_PASSWORD="your_mysql_password"

# Create backup folder for this session
mkdir -p "$BACKUP_DIR/$DATE"

# 1. Backup source code
zip -r "$BACKUP_DIR/$DATE/source_code.zip" "$SOURCE_DIR"

# 2. Backup MySQL database
mysqldump -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/$DATE/db_backup.sql"

# 3. (Optional) Clean old backups older than 7 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "✅ Backup completed at $DATE"

chmod +x /home/deverloper/backup.sh

⏲️ Step 2: Schedule Daily Cron Job
crontab -e
Add this line to run every day at 2 AM:
0 2 * * * /home/deverloper/backup.sh >> /home/deverloper/backup/backup.log 2>&1

Add this line to run every day at 3 AM:
0 3 * * * /home/deverloper/backup.sh >> /home/deverloper/backup/backup.log 2>&1


🔍 Explanation:
0 2 → At 2:00 AM

1,6,11,16,21,26,31 → On the 1st, 6th, 11th, 16th, 21st, 26th, and 31st of each month

* * → Every month, every day of the week

>> backup.log → Save output to a log file for troubleshooting
0 2 1,6,11,16,21,26,31 * * /home/deverloper/backup.sh >> /home/deverloper/backup/backup.log 2>&1


📂 App Directory Structure (example)

/home/deverloper/
├── sv_scanner/
│       ├── dist/
│       ├── uploads/
│       └── ...
├── uploads/
└── backup/

Uploads
scp -P 22236 dist.zip deverloper@192.168.1.249:/home/deverloper/sv_scanner
scp -P 22236 sv_invoice_scanner.zip deverloper@192.168.1.249:/home/deverloper/sv_scanner
scp -P 22236 sv_scanner_db_2025_07_31_backup.sql deverloper@192.168.1.249:/home/deverloper/

my
scp -P 22 sv_invoice_scanner.zip timdev@38.242.149.46:/home/timdev/projects/timdev/sv_invoice_scanner_nestjs/source

scp -P 22236 dist.zip deverloper@192.168.1.249:/home/deverloper/sv_scanner/uploads/scans

D:\uploads>scp -r -P 22236 scans/* deverloper@192.168.1.249:/home/deverloper/sv_scanner/uploads/scans

npm install -g npm@11.5.2

Import sql
mysql -u root -p sv_scanner_db < ./sv_scanner_db_2025_07_31_backup.sql


scp -P 22236 .env deverloper@192.168.1.249:/home/deverloper/sv_scanner/
scp -P 22236 sv_invoice_scanner.zip deverloper@192.168.1.249:/home/deverloper/sv_scanner/

find . -mindepth 1 -not -name 'uploads' -not -name 'uploads_backup_08_08_2025.zip' -not -name '.env' -exec rm -rf {} +


mkdir -p uploads backup

sudo chown -R deverloper:deverloper uploads backup

chmod -R 755 uploads backup

if can not access to your ssh
ssh-keygen -R [192.168.1.249]:22236


ssh -p 22236 deverloper@192.168.1.249
D!$$&3949acq

Check Specific Directory Usage
df -h




NODE_ENV=production
PORT=3000

# MySQL Database Configuration
DB_TYPE=mysql
DB_HOST=localhost # OR your MySQL server's actual IP if on a different machine
DB_PORT=3306
DB_USERNAME=root # DEDICATED USER, NOT ROOT!
DB_PASSWORD=password # LONG, RANDOM, COMPLEX PASSWORD!
DB_DATABASE=sv_scanner_db
TIMEZONE=local

# Redis Configuration
REDIS_TYPE=redis
REDIS_HOST=localhost
REDIS_PORT=6379
AI_SERVICE_URL="http://38.242.149.46:8000/timdev/api/v1/image_service/bg_remover"


# Security Secrets (MUST BE LONG, RANDOM, AND UNIQUE STRINGS)
SESSION_SECRET=TIMDEV

JWT_SECRET="TIMDEV"
JWT_EXPIRES_IN=7d # (e.g., '1h' for 1 hour, '7d' for 7 days, '30m' for 30 minutes)

# File upload configuration
MAX_FILE_SIZE_MB=5
UPLOAD_PATH=./uploads/scans

# Public-facing URL (update with your actual domain or public IP)
BASE_URL="http://192.168.1.249"

# Allowed CORS Origins (update with your actual frontend domains/IPs)
ALLOWED_ORIGINS="http://localhost,http://192.168.1.249"



GIT 

rm dist.zip package-lock.json package.json


git remote add origin https://github.com/mrtimdev/sv_invoice_scanner_nestjs.git
deverloper@hrms-VMware-Virtual-Platform:~/sv_scanner$ git fetch origin

Fetch last commit

git pull origin master
git pull origin main

This keeps the commit history of both local and remote
git config pull.rebase false
git pull origin master

 
git fetch origin

git log origin/master -1


# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365



sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl status redis

redis-cli ping




SSL 

Create SSL Certificate (if not yet)

sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/nest.key \
  -out /etc/ssl/certs/nest.crt


sudo nano /etc/nginx/sites-available/sv-scanner

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate /etc/ssl/certs/nest.crt;
    ssl_certificate_key /etc/ssl/private/nest.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Optional HTTP redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

sudo ln -s /etc/nginx/sites-available/sv-scanner /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 'Nginx Full'

