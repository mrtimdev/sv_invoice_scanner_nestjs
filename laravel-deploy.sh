sudo nano /etc/systemd/system/kcy.service


[Unit]
Description=KCY Laravel Application
After=network.target

[Service]
Type=simple
User=timdev
Group=www-data
WorkingDirectory=/var/www/php-project/kcy-logistic/public
ExecStart=/usr/bin/php8.2 /var/www/php-project/kcy-logistic/public/artisan serve --host=0.0.0.0 --port=8082
Restart=always
RestartSec=5s
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

[Install]
WantedBy=multi-user.target


sudo chown -R timdev:www-data /var/www/php-project/kcy-logistic/source
sudo chmod -R 775 /var/www/php-project/kcy-logistic/source/storage
sudo chmod -R 775 /var/www/php-project/kcy-logistic/source/bootstrap/cache


sudo chmod 644 /var/www/php-project/kcy-logistic/source/public/.htaccess
sudo chown -R timdev:www-data /var/www/php-project/kcy-logistic/source
sudo chown -R timdev:www-data /var/www/php-project/kcy-logistic/public

sudo nano /etc/nginx/sites-available/kcy
server {
    listen 8082;
    server_name _;
    root /var/www/php-project/kcy-logistic/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }

}

sudo nano /etc/hosts
38.242.149.46   ftd.admin.kcy.local

sudo nano /etc/apache2/sites-available/kcy.conf
<VirtualHost *:8082>
    ServerName 38.242.149.46
    DocumentRoot /var/www/php-project/kcy-logistic/public

    <Directory /var/www/php-project/kcy-logistic/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/kcy_logistic_error.log
    CustomLog ${APACHE_LOG_DIR}/kcy_logistic_access.log combined
</VirtualHost>


sudo a2ensite kcy.conf
sudo systemctl status apache2
sudo systemctl stop apache2
sudo systemctl enable apache2
sudo systemctl restart apache2

sudo chown -R www-data:www-data /var/www/php-project/kcy-logistic/source/storage
sudo chmod -R 775 /var/www/php-project/kcy-logistic/source/storage

sudo chown -R www-data:www-data /var/www/php-project/kcy-logistic/source/bootstrap/cache
sudo chmod -R 775 /var/www/php-project/kcy-logistic/source/bootstrap/cache

allow www-data user to write to the storage and cache directories
sudo chown -R www-data:www-data /var/www/php-project/kcy-logistic/public
sudo chown -R www-data:www-data /var/www/php-project/kcy-logistic/public/storage
sudo chown -R www-data:www-data /var/www/php-project/kcy-logistic/source


ln -s /var/www/php-project/kcy-logistic/source/storage/app/public /var/www/php-project/kcy-logistic/public/storage


sudo systemctl daemon-reexec
sudo systemctl daemon-reload

sudo systemctl stop kcy.service
sudo systemctl enable kcy.service
sudo systemctl start kcy.service
sudo journalctl -u kcy.service -f

sudo systemctl status kcy.service


sudo systemctl reload apache2



mysql -u root -p

DROP DATABASE IF EXISTS kcy_logistic;
CREATE DATABASE kcy_logistic CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;


sudo mkdir -p /home/timdev/uploads
sudo mkdir -p /home/timdev/backup

sudo chown -R timdev:timdev /home/timdev/uploads
sudo chown -R timdev:timdev /home/timdev/backup

upload_path="/home/timdev/uploads"
backup_path="/home/timdev/backup"
scp -P 22 ./kcy.sql timdev@38.242.149.46:/home/timdev/uploads

import_path="/home/timdev/uploads/kcy.sql"
mysql -u root -p kcy_logistic < /home/timdev/uploads/kcy.sql


scp public.zip timdev@38.242.149.46:/var/www/php-project/kcy-logistic/public/
cd /var/www/php-project/kcy-logistic/public/ unzip public.zip


find /var/www/php-project/kcy-logistic/source -mindepth 1 ! -name '.env' -exec rm -rf {} +
cd /var/www/php-project/kcy-logistic/source

scp source.zip timdev@38.242.149.46:/var/www/php-project/kcy-logistic/source/
cd /var/www/php-project/kcy-logistic/source/ unzip source.zip

GIT init

git pull origin refs/heads/Tim-delivery-system

git fetch origin
git reset --hard origin/Tim-delivery-system