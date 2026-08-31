import logging
import psycopg2
from supabase import create_client, Client
import redis
import groq
from core.config import (
    NEON_DATABASE_URL,
    SUPABASE_URL,
    SUPABASE_KEY,
    REDIS_HOST,
    REDIS_PORT,
    GROQ_API_KEY,
)

logger = logging.getLogger(__name__)

# ── Neon PostgreSQL Connection ──
def get_neon_connection():
    try:
        return psycopg2.connect(NEON_DATABASE_URL, connect_timeout=3)
    except Exception as e:
        logger.warning(f"Neon DB connection failed: {e}")
        return None

# ── Supabase Client ──
try:
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    logger.warning(f"Supabase initialization failed: {e}")
    supabase_client = None

# ── Redis Client (Lazy connection) ──
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=0,
        
    )
except Exception as e:
    logger.warning(f"Redis initialization failed: {e}")
    redis_client = None

# ── Groq Client ──
groq_client = groq.Groq(api_key=GROQ_API_KEY)
