






BACKUP

mysqldump -u root -p svhrmdb_uat > ./upload/svhrmdb_uat_2025_06_30_backup.sql

mysqldump -u root -p svhrmdb > ./upload/svhrmdb_2025_07_14_backup.sql
mysqldump -u root -p svhrmdb > ./upload/svhrmdb_2025_07_21_backup.sql


mysqldump -u root -p svhrmdb > ./upload/svhrmdb_2025_06_30_backup.sql
mysqldump -u root -p svhrmdb > ./upload/svhrmdb_2025_07_01_backup.sql
mysqldump -u root -p svhrmdb > ./upload/svhrmdb_2025_07_09_backup.sql
scp -P 22  deverloper@154.26.134.117:/home/deverloper/upload/svhrmdb_2025_07_01_backup.sql ./svhrmdb_2025_07_01_backup.sql
scp -P 22  deverloper@154.26.134.117:/home/deverloper/upload/svhrmdb_2025_07_21_backup.sql ./svhrmdb_2025_07_21_backup.sql

Export from Ubuntu

scp -P 22  deverloper@154.26.134.117:/home/deverloper/upload/svhrmdb_uat_2025_06_30_backup.sql ./svhrmdb_uat_2025_06_30_backup.sql

scp -P 22  deverloper@154.26.134.117:/home/deverloper/upload/svhrmdb_2025_07_06_backup.sql ./svhrmdb_2025_07_06_backup.sql
scp -P 22  deverloper@154.26.134.117:/home/deverloper/upload/svhrmdb_2025_07_14_backup.sql ./svhrmdb_2025_07_14_backup.sql

upload to server
sudo cp /home/deverloper/upload/svhrm-0.0.1-SNAPSHOT.jar /opt/svhrm-uat/svhrm-0.0.1-SNAPSHOT.jar

Save to Deploy path

sudo cp /home/deverloper/upload/svhrm-0.0.1-SNAPSHOT.jar /opt/svhrm-uat/svhrm-0.0.1-SNAPSHOT.jar


sudo cp /home/deverloper/upload/svhrm-0.0.1-SNAPSHOT.jar /opt/svhrm/svhrm-0.0.1-SNAPSHOT.jar

scp -P 22 ./svhrmdb_temp_8.sql deverloper@154.26.134.117:/home/deverloper/upload


scp -P 22 ./shift_abbreviations.sql deverloper@154.26.134.117:/home/deverloper/upload

Import

mysql -u root -p svhrmdb < /home/deverloper/upload/positions_approval.sql
mysql -u root -p svhrmdb_uat < /home/deverloper/upload/positions_approval.sql
mysql -u root -p svhrmdb_uat < /home/deverloper/upload/shift_abbreviations.sql

mysql -u root -p svhrmdb < /home/deverloper/upload/shift_abbreviations.sql

mysql -u root -p svhrmdb_uat < /home/deverloper/upload/svhrmdb_temp_6.sql

mysql -u root -p svhrmdb_uat < /home/deverloper/upload/svhrmdb_temp_6.sql

mysql -u root -p svhrmdb_uat < /home/deverloper/upload/svhrmdb_temp_8.sql



sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl stop svhrm
sudo systemctl enable svhrm
sudo systemctl start svhrm

sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl stop svhrm-uat
sudo systemctl enable svhrm-uat
sudo systemctl start svhrm-uat

sudo systemctl restart mysql



cp svhrm-0.0.1-SNAPSHOT.jar svhrm-0.0.1-SNAPSHOT_07_15_2025.jar
cp svhrm-0.0.1-SNAPSHOT.jar svhrm-0.0.1-SNAPSHOT_07_16_2025.jar



SHOW COLUMNS FROM leaves LIKE 'status';
SHOW COLUMNS FROM approval_actions LIKE 'action';

sudo service mysql reload

sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
sudo nano /etc/mysql/mysql.conf.d/my.cnf


SCANNER APP - backup cmd
-Backup
mysqldump -u root -p sv_scanner_db > ./projects/timdev/uploads/sv_scanner_db_2025_07_31_backup.sql
-Export
scp -P 22  timdev@38.242.149.46:/home/timdev/uploads/sv_scanner_db_2025_07_31_backup.sql ./sv_scanner_db_2025_07_31_backup.sql
scp -P 22  timdev@38.242.149.46:/home/timdev/projects/timdev/uploads/sv_scanner_db_2025_07_17_backup.sql ./sv_scanner_db_2025_07_17_backup.sql


scp -P 22  timdev@38.242.149.46:/home/timdev/projects/timdev/sv_invoice_scanner_nestjs/source/uploads.zip ./uploads_backup.zip

zip -r ~/projects/timdev/backup/scans.zip /projects/timdev/sv_invoice_scanner_nestjs/source/uploads/scans
scp -P 22  timdev@38.242.149.46:/home/timdev/projects/timdev/uploads/scans.zip ./scans_backup.zip

zip uploads
sudo chown -R timdev:timdev /projects/timdev/backup
zip -r /projects/timdev/backup/uploads.zip uploads

Backup
zip -r ~/projects/timdev/backup/scans.zip ~/projects/timdev/sv_invoice_scanner_nestjs/source/uploads/scans

Export 
scp -P 22  timdev@38.242.149.46:/home/timdev/projects/timdev/backup/scans.zip ./scans_2025_07_31_backup.zip


-SCANNER
deploy from local to ubutu
pm2 deploy ecosystem.config.js production


scp -P 22  timdev@38.242.149.46:~/projects/timdev/uploads/scans.zip ./scans_backup.zip




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

🪄 PM2 (Optional but recommended)
npm install -g pm2
pm2 start dist/main.js --name sv-scanner
pm2 startup
pm2 save

🛠 3. Create MySQL Database

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
WorkingDirectory=/home/deverloper/sv_scanner/source
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
sudo systemctl enable sv-scanner
sudo systemctl start sv-scanner

Check status:
sudo systemctl status sv-scanner

🌐 8. Allow Port 3000

sudo ufw allow 3000
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



📂 App Directory Structure (example)

/home/deverloper/
├── sv_scanner/
│   └── source/
│       ├── dist/
│       ├── uploads/
│       └── ...
├── uploads/
└── backup/
