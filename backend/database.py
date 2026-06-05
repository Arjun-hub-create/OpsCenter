import motor.motor_asyncio
from config import MONGODB_URI, DB_NAME

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

uploads = db["uploads"]
records = db["records"]
audit_logs = db["audit_logs"]


async def verify_connection():
    try:
        await client.admin.command("ping")
        print(f"[DB] Connected to MongoDB Atlas — database: {DB_NAME}")
        return True
    except Exception as e:
        print(f"[DB] Connection failed: {e}")
        return False
