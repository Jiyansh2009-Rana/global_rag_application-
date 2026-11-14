import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "SUPER_SECRET_JWT_KEY_CHANGE_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
OTP_TTL_SECONDS = int(os.getenv("OTP_TTL_SECONDS", "300"))
APP_NAME = os.getenv("APP_NAME", "AskMyDocsAI")

LOCAL_SESSION_TTL = 3600  # 1 hour in seconds
PAGES_PER_SET = 5         # Chunk batch size for SSE ingestion

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-supabase-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-supabase-service-role-key")

NEON_DATABASE_URL = os.getenv(
    "NEON_DATABASE_URL",
    "postgresql://user:password@ep-host.region.aws.neon.tech/dbname?sslmode=require"
)

# Support REDIS_URL or separate REDIS_HOST / REDIS_PORT
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
_port_env = os.getenv("REDIS_PORT")
REDIS_PORT = int(_port_env) if _port_env and _port_env.isdigit() else 6379
REDIS_URL = os.getenv("REDIS_URL") or f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your-groq-api-key")
JINA_API_KEY = os.getenv("JINA_API_KEY", "your-jina-api-key")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret")


SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "AskMydocsai")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER)