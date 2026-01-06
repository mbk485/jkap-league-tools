# Meta Cloner - Web App

A SaaS platform for injecting Ray-Ban Meta metadata into photos and videos.

## 💰 Pricing

- **Single Credit**: $30 (1 photo/video)
- **Batch Pack**: $99 (5 photos/videos) - Save $51!
- **Unlimited Monthly**: $500 (30 days unlimited)

## ✨ Features

- ✅ Photo processing (JPG, PNG, HEIC, WebP)
- ✅ Video processing (MP4, MOV)
- ✅ Two metadata modes: Authentic 2024 & Metaspoof
- ✅ User authentication
- ✅ Stripe payment integration
- ✅ Credit-based system
- ✅ Unlimited monthly subscription

## 🚀 Quick Start

### 1. Start the Backend

```bash
cd web-app/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

Backend runs at: http://localhost:8000

### 2. Start the Frontend

```bash
cd web-app/frontend

# Install dependencies
npm install

# Run the dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## 🔧 Configuration

### Environment Variables (Backend)

Create a `.env` file in the backend folder:

```env
SECRET_KEY=your-super-secret-key-change-this
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Environment Variables (Frontend)

Create a `.env.local` file in the frontend folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎯 Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Set up a webhook endpoint pointing to `/api/payments/webhook`
4. Update the environment variables

### Test Mode

For testing, use Stripe test keys (starting with `sk_test_`).

Test card: `4242 4242 4242 4242` (any future date, any CVC)

## 📦 Deployment

### Backend (Railway)

1. Push code to GitHub
2. Connect Railway to your repo
3. Set environment variables
4. Deploy!

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Deploy!

## 📁 Project Structure

```
web-app/
├── backend/
│   ├── main.py           # FastAPI application
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── app/              # Next.js pages
│   ├── lib/              # API utilities
│   └── package.json      # Node dependencies
└── README.md
```

## 🔒 Security Notes

- Change `SECRET_KEY` in production
- Use HTTPS in production
- Set proper CORS origins
- Remove test credit endpoint in production

## 📝 License

Private - All rights reserved.

