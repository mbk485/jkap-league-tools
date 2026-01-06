"""
Ray-Ban Meta Cloner - Web API
FastAPI backend for processing images/videos with Ray-Ban Meta metadata
Now with PostgreSQL database for persistent storage!
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import piexif
import io
import os
import stripe
import jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import hashlib
import secrets
import random
import subprocess
import tempfile
import shutil
import uuid as uuid_lib

# Database imports
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Try to import PIL for format conversion
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Try to import pillow-heif for HEIC support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HAS_HEIF = True
except ImportError:
    HAS_HEIF = False

app = FastAPI(title="Ray-Ban Meta Cloner API", version="3.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://metacloner.vercel.app",
        "https://*.vercel.app",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_...")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "metacloner2024")

# Database URL - Railway provides this automatically when you add PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./metacloner.db")

# Fix for Railway PostgreSQL URL (they use postgres:// but SQLAlchemy needs postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

stripe.api_key = STRIPE_SECRET_KEY


# ============ Database Setup ============

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    credits = Column(Integer, default=1)
    has_subscription = Column(Boolean, default=False)
    subscription_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables on startup
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============ Models ============

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    credits: int
    has_subscription: bool = False

class CheckoutRequest(BaseModel):
    plan: str

class AdminAuth(BaseModel):
    password: str

class CreditUpdate(BaseModel):
    credits: int


# ============ Pricing ============

PRICING = {
    "single": {"price": 3000, "credits": 1, "name": "Single Credit"},
    "batch": {"price": 9900, "credits": 5, "name": "Batch Pack (5 Credits)"},
    "unlimited": {"price": 50000, "credits": 0, "name": "Unlimited Monthly", "is_subscription": True},
}


# ============ Ray-Ban Meta EXIF Data ============

def generate_random_datetime():
    now = datetime.now()
    random_days = random.randint(0, 30)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    random_seconds = random.randint(0, 59)
    random_date = now - timedelta(days=random_days, hours=random_hours, 
                                   minutes=random_minutes, seconds=random_seconds)
    return random_date.strftime("%Y:%m:%d %H:%M:%S")

def generate_uuid():
    return str(uuid_lib.uuid4()).upper()

def create_rayban_exif():
    random_datetime = generate_random_datetime()
    random_subsec = str(random.randint(100, 999))
    unique_uuid = generate_uuid()
    
    make = "Meta AI"
    model = "Ray-Ban Meta Smart Glasses"
    exif_version = b"0231"
    user_comment_prefix = b"ASCII\x00\x00\x00"
    focal_length_35mm = 35
    scene_capture_type = 1
    exposure_times = [(1, 4000), (1, 3000), (1, 2000), (1, 1000)]
    f_numbers = [(7, 5), (14, 5)]
    iso_values = [100, 125, 160, 200, 250, 320, 400]
    focal_length = (35, 1)
    body_serial = str(random.randint(10, 99))
    
    exif_dict = {
        "0th": {
            271: make, 272: model, 282: (72, 1), 283: (72, 1),
            296: 2, 305: "", 306: random_datetime,
        },
        "Exif": {
            33434: random.choice(exposure_times), 33437: random.choice(f_numbers),
            34850: 0, 34855: random.choice(iso_values), 36864: exif_version,
            36867: random_datetime, 36868: random_datetime,
            37121: b"\x01\x02\x03\x00", 37377: (14767, 2500), 37378: (91, 40),
            37379: (0, 1), 37383: 1, 37385: 16, 37386: focal_length,
            37510: user_comment_prefix + unique_uuid.encode('utf-8'),
            37520: random_subsec, 37521: random_subsec, 37522: random_subsec,
            40960: b"0100", 40961: 1, 40962: 3024, 40963: 4032,
            41495: 1, 41729: b"\x01", 41986: 2, 41987: 0,
            41989: focal_length_35mm, 41990: scene_capture_type, 42033: body_serial,
        },
        "GPS": {}, "1st": {}, "thumbnail": None
    }
    return exif_dict


# ============ Auth Helpers ============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_admin(authorization: Optional[str] = Header(None)) -> bool:
    if not authorization or not authorization.startswith("Admin "):
        raise HTTPException(status_code=401, detail="Admin access required")
    token = authorization.split(" ")[1]
    if token != hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest():
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return True

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def check_subscription_active(user: User) -> bool:
    if user.has_subscription and user.subscription_expires:
        return user.subscription_expires > datetime.utcnow()
    return False


# ============ Auth Endpoints ============

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        id=secrets.token_hex(16),
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        credits=1  # Free credit for new users
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_token(user.id)
    return TokenResponse(access_token=token, credits=user.credits, has_subscription=False)

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user_by_email(db, user_data.email)
    if not user or user.password_hash != hash_password(user_data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    has_sub = check_subscription_active(user)
    token = create_token(user.id)
    return TokenResponse(access_token=token, credits=user.credits, has_subscription=has_sub)

@app.get("/api/auth/me")
async def get_current_user(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    has_sub = check_subscription_active(user)
    return {
        "id": user.id,
        "email": user.email,
        "credits": user.credits,
        "has_subscription": has_sub,
        "subscription_expires": user.subscription_expires.isoformat() if user.subscription_expires else None
    }


# ============ Payment Endpoints ============

@app.post("/api/payments/create-checkout")
async def create_checkout_session(
    request: CheckoutRequest,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    if request.plan not in PRICING:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = PRICING[request.plan]
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"Meta Cloner - {plan['name']}",
                        "description": "Process photos and videos with Ray-Ban Meta metadata",
                    },
                    "unit_amount": plan["price"],
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url="https://metacloner.com/dashboard?payment=success",
            cancel_url="https://metacloner.com/dashboard?payment=cancelled",
            metadata={"user_id": user_id, "plan": request.plan, "credits": plan["credits"]}
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/payments/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except Exception:
        import json
        event = json.loads(payload)
    
    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        
        if user_id and plan:
            user = get_user_by_id(db, user_id)
            if user:
                if plan == "unlimited":
                    user.has_subscription = True
                    user.subscription_expires = datetime.utcnow() + timedelta(days=30)
                else:
                    user.credits += PRICING[plan]["credits"]
                db.commit()
                print(f"✅ Updated user {user_id}: plan={plan}")
    
    return {"status": "success"}

# Test credits endpoint removed for production security
# Credits can only be added via Stripe payment or admin panel


# ============ File Processing ============

def process_image(image_data: bytes, filename: str) -> bytes:
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in ['.heic', '.heif', '.png', '.webp', '.gif', '.bmp', '.tiff']:
        if not HAS_PIL:
            raise Exception("Image conversion not supported. Please upload JPEG.")
        img = Image.open(io.BytesIO(image_data))
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=95)
        image_data = output.getvalue()
    
    exif_dict = create_rayban_exif()
    exif_bytes = piexif.dump(exif_dict)
    output = io.BytesIO()
    piexif.insert(exif_bytes, image_data, output)
    return output.getvalue()

def process_video(video_data: bytes, filename: str) -> bytes:
    model_name = "Ray-Ban Meta Smart Glasses"
    unique_uuid = generate_uuid()
    comment = f"app=Meta AI&device={model_name}&id={unique_uuid}"
    creation_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as tmp_in:
        tmp_in.write(video_data)
        tmp_in_path = tmp_in.name
    
    tmp_out_path = tmp_in_path + "_out.MOV"
    
    try:
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            cmd = [ffmpeg_path, '-y', '-i', tmp_in_path, '-c:v', 'libx264', '-preset', 'medium',
                   '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p',
                   '-movflags', '+faststart', '-f', 'mov', tmp_out_path]
            result = subprocess.run(cmd, capture_output=True)
            if result.returncode == 0:
                exiftool_path = shutil.which("exiftool")
                if exiftool_path:
                    meta_cmd = [exiftool_path, '-overwrite_original',
                                f'-Keys:Model={model_name}', f'-Keys:Copyright=Meta AI',
                                f'-Keys:Comment={comment}', f'-Keys:Description=4V',
                                f'-Keys:CreationDate={creation_date}', tmp_out_path]
                    subprocess.run(meta_cmd, capture_output=True)
                with open(tmp_out_path, 'rb') as f:
                    return f.read()
        return video_data
    finally:
        if os.path.exists(tmp_in_path):
            os.unlink(tmp_in_path)
        if os.path.exists(tmp_out_path):
            os.unlink(tmp_out_path)

@app.post("/api/process/file")
async def process_file(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    has_sub = check_subscription_active(user)
    if not has_sub and user.credits <= 0:
        raise HTTPException(status_code=402, detail="No credits remaining. Please purchase more credits.")
    
    filename = file.filename.lower()
    is_video = filename.endswith(('.mp4', '.mov', '.m4v'))
    is_image = filename.endswith(('.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.bmp', '.tiff'))
    
    if not is_video and not is_image:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    try:
        file_data = await file.read()
        
        if is_video:
            processed_data = process_video(file_data, file.filename)
            media_type = "video/quicktime"
            out_filename = f"RayBan_{os.path.splitext(file.filename)[0]}.MOV"
        else:
            processed_data = process_image(file_data, file.filename)
            media_type = "image/jpeg"
            out_filename = f"RayBan_{os.path.splitext(file.filename)[0]}.jpg"
        
        # Deduct credit if not on subscription
        if not has_sub:
            user.credits -= 1
            db.commit()
        
        return StreamingResponse(
            io.BytesIO(processed_data),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={out_filename}",
                "X-Credits-Remaining": str(user.credits)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/api/credits")
async def get_credits(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    has_sub = check_subscription_active(user)
    return {
        "credits": user.credits,
        "has_subscription": has_sub,
        "subscription_expires": user.subscription_expires.isoformat() if user.subscription_expires else None
    }


# ============ Admin Endpoints ============

@app.post("/api/admin/login")
async def admin_login(auth: AdminAuth):
    if auth.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    token = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()
    return {"token": token}

@app.get("/api/admin/users")
async def admin_get_users(admin: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.email).all()
    users_list = []
    for user in users:
        has_sub = check_subscription_active(user)
        users_list.append({
            "id": user.id,
            "email": user.email,
            "credits": user.credits,
            "has_subscription": has_sub,
            "subscription_expires": user.subscription_expires.isoformat() if user.subscription_expires else None,
        })
    return {"users": users_list, "total": len(users_list)}

@app.put("/api/admin/users/{email}/credits")
async def admin_update_credits(email: str, update: CreditUpdate, admin: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.credits = max(0, update.credits)
    db.commit()
    return {"email": email, "credits": user.credits, "message": f"Credits updated to {user.credits}"}

@app.post("/api/admin/users/{email}/add-credits")
async def admin_add_credits(email: str, amount: int = 1, admin: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.credits += amount
    db.commit()
    return {"email": email, "credits": user.credits, "added": amount, "message": f"Added {amount} credits. New balance: {user.credits}"}

@app.post("/api/admin/users/{email}/subscription")
async def admin_set_subscription(email: str, days: int = 30, admin: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.has_subscription = True
    user.subscription_expires = datetime.utcnow() + timedelta(days=days)
    db.commit()
    return {"email": email, "subscription_expires": user.subscription_expires.isoformat(), "message": f"Subscription active for {days} days"}

@app.delete("/api/admin/users/{email}/subscription")
async def admin_remove_subscription(email: str, admin: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.has_subscription = False
    user.subscription_expires = None
    db.commit()
    return {"email": email, "message": "Subscription removed"}


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Ray-Ban Meta Cloner API",
        "version": "3.0.0",
        "database": "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite",
        "features": {"image_conversion": HAS_PIL, "heic_support": HAS_HEIF}
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
