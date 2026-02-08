import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { processMessage } from '@/lib/engine'
import { sendMessage, downloadMedia } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import type { MessageContent } from '@/lib/types'

// GET — Webhook verification (Meta calls this once during setup)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Incoming messages from users
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Extract message — WhatsApp webhook structure
  const entry = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const value = changes?.value
  const message = value?.messages?.[0]

  // No message (e.g. status update) — acknowledge and return
  if (!message) {
    return NextResponse.json({ status: 'ok' })
  }

  const phone = message.from as string

  // Process async so WhatsApp doesn't timeout
  after(async () => {
    try {
      // Build MessageContent based on type
      let content: MessageContent

      switch (message.type) {
        case 'text': {
          let text = message.text.body as string
          // Check for URLs and annotate
          const urlMatch = text.match(
            /https?:\/\/[^\s]+/g
          )
          if (urlMatch) {
            text += `\n[This message contains a link: ${urlMatch[0]}]`
          }
          content = { type: 'text', text }
          break
        }

        case 'audio': {
          const media = await downloadMedia(message.audio.id)
          content = { type: 'audio', ...media }
          break
        }

        case 'image': {
          const media = await downloadMedia(message.image.id)
          content = { type: 'image', ...media }
          break
        }

        case 'video': {
          const media = await downloadMedia(message.video.id)
          content = { type: 'video', ...media }
          break
        }

        case 'document': {
          const media = await downloadMedia(message.document.id)
          content = { type: 'file', ...media }
          break
        }

        default:
          // Unsupported message type — treat as text
          content = {
            type: 'text',
            text: `[Received a ${message.type} message]`,
          }
      }

      // Ensure user exists
      await supabase
        .from('lily_users2')
        .upsert({ phone }, { onConflict: 'phone', ignoreDuplicates: true })

      // Process with Lily engine
      const result = await processMessage({ phone, content })

      // Send reply
      await sendMessage(phone, result.reply)
    } catch (err) {
      console.error('[webhook] Error processing message:', err)
    }
  })

  // Return 200 immediately to prevent WhatsApp retries
  return NextResponse.json({ status: 'ok' })
}
