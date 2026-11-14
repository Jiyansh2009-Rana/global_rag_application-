import smtplib
import logging
from email.mime.text import MIMEText
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from core.config import (
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, 
    SMTP_FROM_NAME, SMTP_FROM_EMAIL, APP_NAME
)

logger = logging.getLogger(__name__)

def send_organization_disabled_email(admin_email: str, org_id: str, reason: str = "Administrative policy enforcement"):
    """
    Sends an automated professional email notification to the Org Admin when their organization is suspended.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Skipping email dispatch.")
        return False

    subject = f"⚠️ Notice: Access Suspended for Organisation '{org_id}'"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 20px; }}
        .card {{ background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
        .header {{ border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }}
        .title {{ color: #f87171; font-size: 20px; font-weight: bold; margin: 0; }}
        .badge {{ background: rgba(248,113,113,0.15); color: #f87171; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 15px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 class="title">⚠️ Organisation Access Suspended</h2>
        </div>
        <p>Dear Administrator (<strong>{admin_email}</strong>),</p>
        <p>We are writing to notify you that access to the Global RAG platform for your organisation <strong>{org_id}</strong> has been <span class="badge">DISABLED</span> by the Super Administrator.</p>
        
        <div style="background: rgba(0,0,0,0.25); padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f87171;">
          <p style="margin: 0; font-size: 14px;"><strong>Reason / Notes:</strong></p>
          <p style="margin: 5px 0 0; color: #cbd5e1; font-style: italic;">{reason}</p>
        </div>

        <p><strong>Impact of this action:</strong></p>
        <ul>
          <li>All members of <strong>{org_id}</strong> are temporarily restricted from logging in.</li>
          <li>Document querying, indexing, and uploads are paused.</li>
          <li>Your data and indexed vector embeddings remain secure and preserved.</li>
        </ul>

        <p>If you believe this is in error or wish to reactivate your organisation, please contact platform support or your Super Admin.</p>
        
        <div class="footer">
          <p>Global RAG Platform · Enterprise Multi-Tenant Security & Governance</p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = admin_email

        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, [admin_email], msg.as_string())

        logger.info(f"Suspension notice email sent successfully to {admin_email} for org {org_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send suspension email: {e}")
        return False

def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    """Sends signup/reset OTP via SMTP."""
    if not SMTP_USER or not SMTP_PASSWORD:
        raise RuntimeError("SMTP credentials are not configured.")
    subjects = {
        "signup": "Verify your email to complete signup",
        "reset": "Password reset verification code",
    }
    subject = subjects.get(purpose, "Your OTP Code")
    text_body = (
        f"Hi from {APP_NAME}. Your verification code is: {otp}\n"
        f"This code is valid for 5 minutes. Please do not share it with anyone."
    )
    html_body = f"""
    <html>
      <body style="background-color: #f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px 20px; margin: 0;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px 30px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <h2 style="color: #0f766e; margin-top: 0; font-size: 26px;">{APP_NAME}</h2>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">
          <p style="font-size: 16px; color: #3f3f46; margin-top: 20px;">Hello,</p>
          <p style="font-size: 16px; color: #3f3f46; line-height: 1.5;">Here is your verification code. This code is valid for <strong>5 minutes</strong>.</p>
          <div style="margin: 35px auto; padding: 15px; background-color: #f0fdfa; border: 1px solid #5eead4; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f766e; max-width: 250px;">
            {otp}
          </div>
          <p style="font-size: 13px; color: #71717a; margin-top: 30px; margin-bottom: 0;">For your security, please do not share this code with anyone.</p>
        </div>
      </body>
    </html>
    """
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=5) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)