# AI Therapist Backend (Pro)
This project is a Vercel-deployable backend for an AI Therapist chat widget.
Features:
- /api/chat serverless endpoint
- Moderation checks (OpenAI Moderation API)
- Sensitive crisis detection (Thai + English)
- Rate limiting (in-memory; replace with Redis for production)
- CORS limited to allowed origins (configured in api/chat.js)

Deployment:
1. Create a Vercel project and upload this repository or use Vercel's import.
2. Set environment variable OPENAI_API_KEY in the project settings.
3. Deploy. After deploy, use https://<your-project>.vercel.app/api/chat as your API endpoint.

Security:
- Keep OPENAI_API_KEY secret (set in Vercel Environment Variables).
- Replace in-memory rate limiter with Redis for production.
