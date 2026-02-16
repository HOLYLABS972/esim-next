#!/usr/bin/env python3
"""
eSIM Order Email Processor

Replaces the n8n workflow — monitors IMAP inbox for payment notifications,
extracts the invoice number, looks up the order in Supabase, provisions
the eSIM via Airalo API, and updates the order record.

Usage:
    pip install supabase requests python-dotenv
    cp .env.example .env  # fill in credentials
    python email_processor.py
"""

import os
import re
import sys
import time
import email
import imaplib
import logging
from datetime import datetime

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
IMAP_HOST = os.environ["IMAP_HOST"]
IMAP_PORT = int(os.environ.get("IMAP_PORT", 993))
IMAP_USER = os.environ["IMAP_USER"]
IMAP_PASS = os.environ["IMAP_PASS"]

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

AIRALO_CLIENT_ID = os.environ["AIRALO_CLIENT_ID"]
AIRALO_CLIENT_SECRET = os.environ["AIRALO_CLIENT_SECRET"]
AIRALO_BASE_URL = "https://partners-api.airalo.com/v2"

POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", 30))  # seconds

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("email_processor.log"),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def extract_invoice_number(text: str) -> str | None:
    """Extract a 13-digit invoice number from the email body."""
    match = re.search(r"\b\d{13}\b", text)
    return match.group(0) if match else None


def get_email_body(msg: email.message.Message) -> str:
    """Return the plain-text (or HTML fallback) body of an email."""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if ct == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode(errors="replace")
            if ct == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode(errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            return payload.decode(errors="replace")
    return ""


def airalo_authenticate() -> str:
    """Obtain a Bearer token from the Airalo partner API."""
    resp = requests.post(
        f"{AIRALO_BASE_URL}/token",
        data={
            "client_id": AIRALO_CLIENT_ID,
            "client_secret": AIRALO_CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
        timeout=30,
    )
    resp.raise_for_status()
    token = resp.json()["data"]["access_token"]
    log.info("Airalo authentication successful")
    return token


def get_order_from_supabase(airalo_order_id: str) -> dict | None:
    """Look up an order by airalo_order_id."""
    result = (
        supabase.table("esim_orders")
        .select("*")
        .eq("airalo_order_id", airalo_order_id)
        .execute()
    )
    if result.data:
        return result.data[0]
    return None


def create_airalo_order(token: str, order: dict) -> dict:
    """Create a new eSIM order via Airalo API."""
    metadata = order.get("metadata") or {}
    resp = requests.post(
        f"{AIRALO_BASE_URL}/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        data={
            "quantity": 1,
            "package_id": metadata.get("package_slug"),
            "type": "sim",
            "to_email": order.get("customer_email", ""),
            "sharing_option[]": "link",
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    log.info("Airalo order created: %s", data.get("data", {}).get("id"))
    return data


def create_airalo_topup(token: str, order: dict) -> dict:
    """Create a topup order via Airalo API."""
    metadata = order.get("metadata") or {}
    resp = requests.post(
        f"{AIRALO_BASE_URL}/orders/topups",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        data={
            "iccid": order.get("iccid", ""),
            "package_id": metadata.get("package_slug"),
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    log.info("Airalo topup created: %s", data.get("data", {}).get("id"))
    return data


def update_new_order(order: dict, airalo_resp: dict) -> None:
    """Update Supabase after a new eSIM order."""
    sim = airalo_resp["data"]["sims"][0]
    supabase.table("esim_orders").update(
        {
            "iccid": sim["iccid"],
            "plan_name": airalo_resp["data"]["package"],
            "lpa": sim.get("lpa"),
            "qr_code_url": sim.get("qrcode_url"),
            "qr_code": sim.get("qrcode"),
            "direct_apple_installation_url": sim.get(
                "direct_apple_installation_url"
            ),
            "status": "active",
        }
    ).eq("airalo_order_id", order["airalo_order_id"]).execute()
    log.info("Supabase updated (new order) for %s", order["airalo_order_id"])


def update_topup_order(order: dict) -> None:
    """Update Supabase after a topup."""
    metadata = order.get("metadata") or {}
    iccid = metadata.get("existingEsimIccid") or order.get("iccid", "")
    supabase.table("esim_orders").update(
        {
            "status": "active",
            "iccid": iccid,
        }
    ).eq("airalo_order_id", order["airalo_order_id"]).execute()
    log.info("Supabase updated (topup) for %s", order["airalo_order_id"])


# ---------------------------------------------------------------------------
# Email processing
# ---------------------------------------------------------------------------
def process_email(body: str) -> None:
    """Full pipeline: extract ID → lookup → Airalo → Supabase."""
    invoice = extract_invoice_number(body)
    if not invoice:
        log.warning("No 13-digit invoice number found — skipping")
        return

    log.info("Extracted invoice number: %s", invoice)

    order = get_order_from_supabase(invoice)
    if not order:
        log.warning("No order found in Supabase for %s — skipping", invoice)
        return

    log.info(
        "Order found: type=%s, id=%s",
        order.get("order_type"),
        order.get("airalo_order_id"),
    )

    token = airalo_authenticate()

    if order.get("order_type") == "esim_topup":
        airalo_resp = create_airalo_topup(token, order)
        update_topup_order(order)
    else:
        airalo_resp = create_airalo_order(token, order)
        update_new_order(order, airalo_resp)

    log.info("Done processing invoice %s", invoice)


def poll_inbox() -> None:
    """Connect to IMAP, fetch unseen messages, process each one."""
    log.info("Connecting to IMAP %s:%s …", IMAP_HOST, IMAP_PORT)
    mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
    mail.login(IMAP_USER, IMAP_PASS)
    mail.select("INBOX")

    status, data = mail.search(None, "UNSEEN")
    if status != "OK" or not data[0]:
        log.debug("No new emails")
        mail.logout()
        return

    msg_ids = data[0].split()
    log.info("Found %d unseen email(s)", len(msg_ids))

    for msg_id in msg_ids:
        try:
            _, msg_data = mail.fetch(msg_id, "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)
            subject = msg.get("Subject", "(no subject)")
            log.info("Processing email: %s", subject)

            body = get_email_body(msg)
            process_email(body)

            # Mark as seen (IMAP flag is set automatically by fetch,
            # but explicitly flag it to be safe)
            mail.store(msg_id, "+FLAGS", "\\Seen")

        except Exception:
            log.exception("Failed to process email %s", msg_id)

    mail.logout()


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main() -> None:
    log.info("Email processor started (poll every %ds)", POLL_INTERVAL)
    while True:
        try:
            poll_inbox()
        except Exception:
            log.exception("Error during poll cycle")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
