# Email Processor Deployment Guide

## Prerequisites
- Ubuntu/Debian VPS with Python 3.8+
- SSH access with sudo privileges
- Email account with IMAP access

## Installation Steps

### 1. Upload files to VPS
```bash
# From your local machine
scp -r backend/ user@your-vps-ip:/tmp/
```

### 2. SSH into your VPS
```bash
ssh user@your-vps-ip
```

### 3. Install Python dependencies
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
```

### 4. Set up the application directory
```bash
sudo mkdir -p /var/www/esim-backend
sudo cp -r /tmp/backend/* /var/www/esim-backend/
cd /var/www/esim-backend
```

### 5. Create virtual environment (recommended)
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 6. Configure environment variables
```bash
cp .env.example .env
nano .env
```

Fill in all required values:
```env
# IMAP Email Configuration
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Airalo API Credentials
AIRALO_CLIENT_ID=your-client-id
AIRALO_CLIENT_SECRET=your-client-secret

# Optional: Poll interval in seconds (default: 30)
POLL_INTERVAL=30
```

**For Gmail:** Enable 2FA and generate an [App Password](https://myaccount.google.com/apppasswords)

### 7. Test the script manually
```bash
# Make sure you're in the virtual environment
source /var/www/esim-backend/venv/bin/activate
python email_processor.py
```

Press `Ctrl+C` to stop. Check the output for errors.

### 8. Set up systemd service

If using virtual environment, update the service file:
```bash
sudo nano email-processor.service
```

Change the `ExecStart` line to:
```ini
ExecStart=/var/www/esim-backend/venv/bin/python /var/www/esim-backend/email_processor.py
```

Install the service:
```bash
sudo cp email-processor.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable email-processor
sudo systemctl start email-processor
```

### 9. Verify it's running
```bash
sudo systemctl status email-processor
```

Should show `active (running)`.

### 10. View logs
```bash
# Real-time logs
sudo journalctl -u email-processor -f

# Application logs
tail -f /var/log/email-processor.log
tail -f /var/log/email-processor-error.log

# Or the local log file
tail -f /var/www/esim-backend/email_processor.log
```

## Managing the Service

```bash
# Start
sudo systemctl start email-processor

# Stop
sudo systemctl stop email-processor

# Restart
sudo systemctl restart email-processor

# Status
sudo systemctl status email-processor

# Disable auto-start on boot
sudo systemctl disable email-processor

# Enable auto-start on boot
sudo systemctl enable email-processor
```

## Updating the Script

```bash
# Stop the service
sudo systemctl stop email-processor

# Update files (upload new version via scp or git pull)
cd /var/www/esim-backend

# Activate venv and update dependencies
source venv/bin/activate
pip install -r requirements.txt

# Restart
sudo systemctl start email-processor
```

## Troubleshooting

### Check if Python dependencies are installed
```bash
cd /var/www/esim-backend
source venv/bin/activate
python -c "import supabase; import requests; print('OK')"
```

### Test IMAP connection manually
```bash
python3 << 'EOF'
import imaplib
import os
from dotenv import load_dotenv

load_dotenv()
mail = imaplib.IMAP4_SSL(os.environ["IMAP_HOST"], int(os.environ.get("IMAP_PORT", 993)))
mail.login(os.environ["IMAP_USER"], os.environ["IMAP_PASS"])
print("IMAP connection successful!")
mail.logout()
EOF
```

### Test Supabase connection
```bash
python3 << 'EOF'
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
result = supabase.table("esim_orders").select("*").limit(1).execute()
print(f"Supabase connection successful! Found {len(result.data)} orders")
EOF
```

### Service won't start
1. Check the service file path: `ls -l /etc/systemd/system/email-processor.service`
2. Check logs: `sudo journalctl -u email-processor -n 50`
3. Verify permissions: `ls -la /var/www/esim-backend`
4. Test script manually: `cd /var/www/esim-backend && source venv/bin/activate && python email_processor.py`

### No emails being processed
- Verify IMAP credentials
- Check if emails are actually marked as "UNSEEN"
- Check the poll interval (default 30 seconds)
- Review logs: `tail -f /var/www/esim-backend/email_processor.log`

## Security Notes

- Keep `.env` file secure with proper permissions: `chmod 600 /var/www/esim-backend/.env`
- Never commit `.env` to version control
- Use app-specific passwords for email (don't use your main password)
- Regularly rotate API credentials
- Monitor logs for unusual activity

## Alternative: Running with Docker (Optional)

If you prefer Docker, here's a minimal setup:

**Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY email_processor.py .
CMD ["python", "email_processor.py"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  email-processor:
    build: .
    env_file: .env
    restart: unless-stopped
    volumes:
      - ./email_processor.log:/app/email_processor.log
```

**Run:**
```bash
docker-compose up -d
docker-compose logs -f
```
