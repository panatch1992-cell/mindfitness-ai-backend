# Mind Fitness AI Backend

Backend API สำหรับ Mind Fitness ใช้ **OpenAI GPT-4o-mini**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# แก้ไข .env ใส่ OPENAI_API_KEY ของคุณ
```

### 3. Run Development Server
```bash
npm run dev
# หรือ
vercel dev
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | API Key จาก OpenAI |
| `LINE_CHANNEL_ACCESS_TOKEN` | ❌ | สำหรับ LINE Bot |
| `LINE_CHANNEL_SECRET` | ❌ | สำหรับ LINE Bot |

## 📁 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | MindBot AI Chat |
| `/api/toolkit` | POST | Toolkit Recommendations |
| `/api/vent` | POST | Vent Wall AI Analysis |
| `/api/line` | POST | LINE Bot Webhook |

## 💬 Chat API Usage

```javascript
// Basic Chat
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "รู้สึกเครียดมาก",
    caseType: "stress",
    language: "th"
  })
});

// Workshop Design (Premium)
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "ออกแบบ workshop stress management",
    isWorkshop: true,
    isPremium: true,
    targetGroup: "พนักงานบริษัท"
  })
});
```

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

อย่าลืมตั้ง Environment Variables ใน Vercel Dashboard!

## 🧪 Run Tests

```bash
npm test
```

## 📞 Support

- Email: admin@mindfitness.co
- Website: www.mindfitness.co
