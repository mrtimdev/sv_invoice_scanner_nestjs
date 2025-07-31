#!/bin/bash

# === CONFIGURATION ===
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="$HOME/projects/timdev/backup"
PROJECT_DIR="$HOME/projects/timdev/sv_invoice_scanner_nestjs/source"   # <-- Change this
MYSQL_USER="root"
MYSQL_PASSWORD="password"
MYSQL_DATABASE="sv_scanner_db"                            # <-- Change this

# === BACKUP MYSQL ===
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# === BACKUP PROJECT FILES ===
tar -czf "$BACKUP_DIR/project_backup_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" .

# === REMOVE OLD BACKUPS (optional: older than 15 days) ===
find "$BACKUP_DIR" -type f -mtime +15 -delete


The script is executable:

chmod +x /home/timdev/projects/timdev/backup/auto_backup.sh



mkdir -p ~/projects/timdev/backup/
chmod 755 ~/projects/timdev/backup/
chmod +x /home/timdev/projects/timdev/backup/auto_backup.sh
chmod +x /home/deverloper/backup/auto_backup.sh

run the script every day at 3 AM:
crontab -e
0 3 * * * /home/timdev/projects/timdev/backup/auto_backup.sh >> /home/timdev/projects/timdev/backup/backup.log 2>&1



. HRM

#!/bin/bash

# === CONFIGURATION ===
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_DIR="$HOME/backup"
JAR_PATH="/opt/svhrm/svhrm-0.0.1-SNAPSHOT.jar"
MYSQL_USER="root"
MYSQL_PASSWORD="password"
MYSQL_DATABASE="svhrmdb"

# === BACKUP MYSQL DATABASE ===
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/db_svhrmdb_backup_$TIMESTAMP.sql"

# === BACKUP SPRING BOOT JAR FILE ===
cp "$JAR_PATH" "$BACKUP_DIR/svhrm_backup_$TIMESTAMP.jar"

# === REMOVE OLD BACKUPS (>15 DAYS) ===
find "$BACKUP_DIR" -type f -mtime +15 -delete