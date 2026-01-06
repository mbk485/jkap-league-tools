"""
Ray-Ban Meta Cloner - Web API
FastAPI backend for processing images/videos with Ray-Ban Meta metadata
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
import struct
import subprocess
import tempfile
import shutil
import uuid as uuid_lib

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

app = FastAPI(title="Ray-Ban Meta Cloner API", version="2.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration - Set these as environment variables in production
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_...")

stripe.api_key = STRIPE_SECRET_KEY

# Simple in-memory user store (use a database in production)
users_db = {}
user_credits = {}  # user_id -> credits remaining
user_subscriptions = {}  # user_id -> subscription expiry datetime


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
    plan: str  # "single", "batch", "unlimited"


# ============ Pricing ============

PRICING = {
    "single": {"price": 3000, "credits": 1, "name": "Single Credit"},
    "batch": {"price": 9900, "credits": 5, "name": "Batch Pack (5 Credits)"},
    "unlimited": {"price": 50000, "credits": 0, "name": "Unlimited Monthly", "is_subscription": True},
}


# ============ Ray-Ban Meta EXIF Data ============

def generate_random_datetime():
    """Generate a random datetime within the last 30 days"""
    now = datetime.now()
    random_days = random.randint(0, 30)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    random_seconds = random.randint(0, 59)
    
    random_date = now - timedelta(days=random_days, hours=random_hours, 
                                   minutes=random_minutes, seconds=random_seconds)
    return random_date.strftime("%Y:%m:%d %H:%M:%S")

def generate_uuid():
    """Generate a UUID in the format used by Ray-Ban Meta"""
    return str(uuid_lib.uuid4()).upper()

def create_rayban_exif():
    """Create Ray-Ban Meta EXIF data - Metaspoof format (WORKING)"""
    
    random_datetime = generate_random_datetime()
    random_subsec = str(random.randint(100, 999))
    unique_uuid = generate_uuid()
    
    # Metaspoof format - the WORKING format
    make = "Meta AI"
    model = "Ray-Ban Meta Smart Glasses"
    exif_version = b"0231"
    user_comment_prefix = b"ASCII\x00\x00\x00"
    focal_length_35mm = 35
    scene_capture_type = 1  # Portrait - KEY!
    exposure_times = [(1, 4000), (1, 3000), (1, 2000), (1, 1000)]
    f_numbers = [(7, 5), (14, 5)]
    iso_values = [100, 125, 160, 200, 250, 320, 400]
    focal_length = (35, 1)
    
    body_serial = str(random.randint(10, 99))
    
    exif_dict = {
        "0th": {
            271: make,
            272: model,
            282: (72, 1),
            283: (72, 1),
            296: 2,
            305: "",
            306: random_datetime,
        },
        "Exif": {
            33434: random.choice(exposure_times),
            33437: random.choice(f_numbers),
            34850: 0,
            34855: random.choice(iso_values),
            36864: exif_version,
            36867: random_datetime,
            36868: random_datetime,
            37121: b"\x01\x02\x03\x00",
            37377: (14767, 2500),
            37378: (91, 40),
            37379: (0, 1),
            37383: 1,
            37385: 16,
            37386: focal_length,
            37510: user_comment_prefix + unique_uuid.encode('utf-8'),
            37520: random_subsec,
            37521: random_subsec,
            37522: random_subsec,
            40960: b"0100",
            40961: 1,
            40962: 3024,
            40963: 4032,
            41495: 1,
            41729: b"\x01",
            41986: 2,
            41987: 0,
            41989: focal_length_35mm,
            41990: scene_capture_type,
            42033: body_serial,
        },
        "GPS": {},
        "1st": {},
        "thumbnail": None
    }
    
    return exif_dict


# ============ Auth Helpers ============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
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

def check_user_access(user_id: str) -> bool:
    """Check if user has credits or active subscription"""
    # Check subscription
    if user_id in user_subscriptions:
        if user_subscriptions[user_id] > datetime.utcnow():
            return True
    # Check credits
    return user_credits.get(user_id, 0) > 0

def use_credit(user_id: str) -> bool:
    """Use one credit (if not on subscription)"""
    # Check subscription first
    if user_id in user_subscriptions:
        if user_subscriptions[user_id] > datetime.utcnow():
            return True  # Subscription active, don't deduct credit
    
    # Deduct credit
    credits = user_credits.get(user_id, 0)
    if credits > 0:
        user_credits[user_id] = credits - 1
        return True
    return False


# ============ Auth Endpoints ============

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    """Register a new user"""
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = secrets.token_hex(16)
    users_db[user.email] = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password)
    }
    
    # Give new users 1 free credit
    user_credits[user_id] = 1
    
    token = create_token(user_id)
    return TokenResponse(access_token=token, credits=1, has_subscription=False)

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    """Login existing user"""
    if user.email not in users_db:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    stored_user = users_db[user.email]
    if stored_user["password"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = stored_user["id"]
    credits = user_credits.get(user_id, 0)
    has_sub = user_id in user_subscriptions and user_subscriptions[user_id] > datetime.utcnow()
    token = create_token(user_id)
    
    return TokenResponse(access_token=token, credits=credits, has_subscription=has_sub)

@app.get("/api/auth/me")
async def get_current_user(user_id: str = Depends(verify_token)):
    """Get current user info"""
    for email, data in users_db.items():
        if data["id"] == user_id:
            has_sub = user_id in user_subscriptions and user_subscriptions[user_id] > datetime.utcnow()
            return {
                "id": user_id,
                "email": email,
                "credits": user_credits.get(user_id, 0),
                "has_subscription": has_sub,
                "subscription_expires": user_subscriptions.get(user_id)
            }
    raise HTTPException(status_code=404, detail="User not found")


# ============ Payment Endpoints ============

@app.post("/api/payments/create-checkout")
async def create_checkout_session(
    request: CheckoutRequest,
    user_id: str = Depends(verify_token)
):
    """Create Stripe checkout session"""
    try:
        if request.plan not in PRICING:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        plan = PRICING[request.plan]
        
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
            success_url="http://localhost:3000/dashboard?payment=success",
            cancel_url="http://localhost:3000/dashboard?payment=cancelled",
            metadata={
                "user_id": user_id,
                "plan": request.plan,
                "credits": plan["credits"]
            }
        )
        
        return {"checkout_url": session.url, "session_id": session.id}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/payments/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except Exception:
        # For testing without proper signature
        import json
        event = json.loads(payload)
    
    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        
        if user_id and plan:
            if plan == "unlimited":
                # Set subscription for 30 days
                user_subscriptions[user_id] = datetime.utcnow() + timedelta(days=30)
                print(f"Activated unlimited subscription for user {user_id}")
            else:
                # Add credits
                credits = PRICING[plan]["credits"]
                user_credits[user_id] = user_credits.get(user_id, 0) + credits
                print(f"Added {credits} credits to user {user_id}")
    
    return {"status": "success"}

@app.post("/api/payments/add-credits")
async def add_credits_test(credits: int = 10, user_id: str = Depends(verify_token)):
    """Add credits (for testing only - remove in production)"""
    user_credits[user_id] = user_credits.get(user_id, 0) + credits
    return {"credits": user_credits[user_id]}


# ============ File Processing ============

def process_image(image_data: bytes, filename: str) -> bytes:
    """Process image and inject Ray-Ban metadata"""
    
    # Check if we need to convert format
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in ['.heic', '.heif', '.png', '.webp', '.gif', '.bmp', '.tiff']:
        if not HAS_PIL:
            raise Exception("Image conversion not supported. Please upload JPEG.")
        
        # Convert to JPEG
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
    
    # Create Ray-Ban Meta EXIF
    exif_dict = create_rayban_exif()
    exif_bytes = piexif.dump(exif_dict)
    
    # Insert EXIF into image
    output = io.BytesIO()
    piexif.insert(exif_bytes, image_data, output)
    
    return output.getvalue()

def process_video(video_data: bytes, filename: str) -> bytes:
    """Process video and inject Ray-Ban metadata"""
    
    # Metaspoof format - the WORKING format
    model_name = "Ray-Ban Meta Smart Glasses"
    
    unique_uuid = generate_uuid()
    comment = f"app=Meta AI&device={model_name}&id={unique_uuid}"
    creation_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as tmp_in:
        tmp_in.write(video_data)
        tmp_in_path = tmp_in.name
    
    tmp_out_path = tmp_in_path + "_out.MOV"
    
    try:
        # Try ffmpeg for MOV conversion
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path:
            cmd = [
                ffmpeg_path, '-y', '-i', tmp_in_path,
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
                '-c:a', 'aac', '-b:a', '128k',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                '-f', 'mov',
                tmp_out_path
            ]
            result = subprocess.run(cmd, capture_output=True)
            
            if result.returncode == 0:
                # Add metadata with exiftool
                exiftool_path = shutil.which("exiftool")
                if exiftool_path:
                    meta_cmd = [
                        exiftool_path, '-overwrite_original',
                        f'-Keys:Model={model_name}',
                        f'-Keys:Copyright=Meta AI',
                        f'-Keys:Comment={comment}',
                        f'-Keys:Description=4V',
                        f'-Keys:CreationDate={creation_date}',
                        tmp_out_path
                    ]
                    subprocess.run(meta_cmd, capture_output=True)
                
                with open(tmp_out_path, 'rb') as f:
                    return f.read()
        
        # Fallback: return original video
        return video_data
    
    finally:
        # Cleanup temp files
        if os.path.exists(tmp_in_path):
            os.unlink(tmp_in_path)
        if os.path.exists(tmp_out_path):
            os.unlink(tmp_out_path)


@app.post("/api/process/file")
async def process_file(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token)
):
    """Process a single image or video"""
    
    # Check access
    if not check_user_access(user_id):
        raise HTTPException(
            status_code=402,
            detail="No credits remaining. Please purchase more credits."
        )
    
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
        
        # Use credit
        use_credit(user_id)
        
        return StreamingResponse(
            io.BytesIO(processed_data),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={out_filename}",
                "X-Credits-Remaining": str(user_credits.get(user_id, 0))
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.get("/api/credits")
async def get_credits(user_id: str = Depends(verify_token)):
    """Get current credit balance"""
    has_sub = user_id in user_subscriptions and user_subscriptions[user_id] > datetime.utcnow()
    return {
        "credits": user_credits.get(user_id, 0),
        "has_subscription": has_sub,
        "subscription_expires": user_subscriptions.get(user_id).isoformat() if user_id in user_subscriptions else None
    }


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Ray-Ban Meta Cloner API",
        "version": "2.0.0",
        "features": {
            "image_conversion": HAS_PIL,
            "heic_support": HAS_HEIF
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
