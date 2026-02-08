# Lily

A proactive reminder assistant that lives in WhatsApp.
Built with Gemini 3 for the Gemini 3 Hackathon 2026.

## What it does

Tell Lily what you need to do — text, voice, photos, PDFs, YouTube links.
She remembers. When it's time, she shows up with a *scratch*:
the smallest starting point to get you going.

## Architecture

```
┌──────────────┐         ┌──────────────────────────┐         ┌──────────────┐
│  Landing Page │         │  lily (Next.js)           │         │  External    │
│  (1 page)     │         │  Vercel deployment        │         │              │
│               │         │                          │         │              │
│  [Talk to     │         │  POST /api/whatsapp/     │         │  WhatsApp    │
│   Lily 💬] ───────────→│   webhook                │←────────│  Cloud API   │
│               │         │    ↓                     │         │              │
│  wa.me link   │         │  Lily Engine             │         │              │
│               │         │  (Gemini 3 + Tools)      │────────→│  Gemini 3    │
│               │         │    ↓                     │         │  API         │
│               │         │  Supabase (tasks, users)  │         │              │
│               │         │    ↓                     │         │              │
│               │         │  GET /api/cron/sweep     │         │              │
│               │         │  (Vercel Cron, every min) │────────→│  WhatsApp    │
│               │         │  Sends reminders + scratch│         │  Cloud API   │
└──────────────┘         └──────────────────────────┘         └──────────────┘
```

## Gemini 3 Integration

- **Native multimodal**: one model processes text, audio, images, video, and documents
- **Tool use**: autonomous task creation, completion, scheduling, and memory
- **Proactive agent**: initiates contact at scheduled times with contextual scratches

## Tech Stack

- Next.js 15 (App Router)
- Gemini 3 via Vercel AI SDK
- Supabase (PostgreSQL)
- WhatsApp Cloud API
- Vercel (hosting + cron)

## Setup

1. **Supabase**: Create project → run `supabase/migrations/001_init.sql`
2. **WhatsApp**: Meta Business → Create App → Add WhatsApp → Configure webhook
3. **Gemini**: Get API key from [AI Studio](https://aistudio.google.com/apikey)
4. **Deploy**:

```bash
npm install
cp .env.example .env.local  # Fill in your keys
npm run dev                  # Local development
npx vercel deploy            # Production
```

5. Set webhook URL in Meta Dashboard: `https://{domain}/api/whatsapp/webhook`

## Environment Variables

See [.env.example](.env.example)

## Try it

[Talk to Lily on WhatsApp →](https://wa.me/YOUR_NUMBER?text=Hi%20Lily)
