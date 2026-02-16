# eSIM Email Processor

Python script that replaces the n8n workflow for automated eSIM provisioning via email notifications.

## What It Does

1. **Monitors Email** — Polls IMAP inbox for payment confirmation emails
2. **Extracts Invoice** — Regex extracts 13-digit order ID from email body
3. **Lookup Order** — Queries Supabase `esim_orders` table by `airalo_order_id`
4. **Provision eSIM** — Calls Airalo partner API to:
   - Create new eSIM order, OR
   - Create topup for existing eSIM
5. **Update Database** — Writes back iccid, QR code, LPA, and sets status to "active"
6. **Mark as Read** — Flags email as seen to avoid reprocessing

## Architecture

```
┌──────────────┐
│  Email Inbox │
│   (IMAP)     │
└──────┬───────┘
       │ Poll every 30s
       ▼
┌──────────────────┐
│ email_processor  │
│     (Python)     │
└─────┬──────┬─────┘
      │      │
      │      └──────────────────┐
      │                         │
      ▼                         ▼
┌──────────────┐      ┌─────────────────┐
│   Supabase   │      │   Airalo API    │
│  (Orders DB) │      │ (eSIM Provider) │
└──────────────┘      └─────────────────┘
```

## Files

- `email_processor.py` — Main script
- `requirements.txt` — Python dependencies
- `.env.example` — Environment variable template
- `email-processor.service` — Systemd service file
- `DEPLOYMENT.md` — Full VPS deployment guide

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure credentials
cp .env.example .env
nano .env

# Run
python email_processor.py
```

For production deployment on VPS, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Differences from n8n

| Feature | n8n Workflow | This Script |
|---------|-------------|-------------|
| Trigger | Webhook + IMAP Email Trigger | IMAP polling (30s interval) |
| Execution | Cloud/self-hosted n8n | Standalone Python process |
| Dependencies | n8n + Docker + workflows | Python 3.8+ + 3 packages |
| Deployment | Docker Compose | Systemd service |
| Logs | n8n UI | Log files + journalctl |
| Cost | n8n hosting | Free (VPS only) |

## Requirements

- Python 3.8+
- Email account with IMAP enabled
- Supabase project
- Airalo partner API credentials

## Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) for common issues and solutions.

## License

Same as parent project.
