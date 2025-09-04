cd ~/your_project_directory
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt



(venv) timdev@vmi2638730:~/projects/timdev/python/image_bg_remover$ 

sudo nano /etc/systemd/system/image_autocrop.service

[Unit]
Description=FastAPI Background Remover Service
After=network.target

[Service]
User=timdev
WorkingDirectory=/home/timdev/projects/timdev/python/image_bg_remover
ExecStart=/home/timdev/projects/timdev/python/image_bg_remover/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target


sudo ufw allow 8000


sudo systemctl daemon-reload
sudo systemctl stop image_autocrop
sudo systemctl enable image_autocrop
sudo systemctl start image_autocrop
sudo systemctl status image_autocrop
journalctl -u image_autocrop -f


# Use a Python base image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your script and input image
COPY auto_crop_bg_remover.py .
COPY test4.jpg .

# Create the output directory inside the container
RUN mkdir output_images

# Command to run your script
CMD ["python3", "auto_crop_bg_remover.py"]






b68a5586148f4547e1891a4f4a8a10cfa


cropped-b68a5586148f4547e1891a4f4a8a10cfa