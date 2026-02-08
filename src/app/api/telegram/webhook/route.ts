import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { processMessage } from '@/lib/engine'
import { sendMessage, downloadMedia } from '@/lib/telegram'
import { supabase } from '@/lib/supabase'
import type { MessageContent } from '@/lib/types'

// POST — Incoming updates from Telegram
export async function POST(req: NextRequest) {
  const update = await req.json()

  const message = update.message
  if (!message) {
    return NextResponse.json({ status: 'ok' })
  }

  const chatId = String(message.chat.id)
  const phone = `tg_${chatId}` // prefix to distinguish from WhatsApp users

  after(async () => {
    try {
      let content: MessageContent

      if (message.text) {
        let text = message.text as string
        const urlMatch = text.match(/https?:\/\/[^\s]+/g)
        if (urlMatch) {
          text += `\n[This message contains a link: ${urlMatch[0]}]`
        }
        content = { type: 'text', text }
      } else if (message.voice) {
        const media = await downloadMedia(message.voice.file_id)
        content = { type: 'audio', ...media }
      } else if (message.audio) {
        const media = await downloadMedia(message.audio.file_id)
        content = { type: 'audio', ...media }
      } else if (message.photo) {
        // Telegram sends multiple sizes — use the largest
        const photo = message.photo[message.photo.length - 1]
        const media = await downloadMedia(photo.file_id)
        content = { type: 'image', ...media }
      } else if (message.video) {
        const media = await downloadMedia(message.video.file_id)
        content = { type: 'video', ...media }
      } else if (message.document) {
        const media = await downloadMedia(message.document.file_id)
        content = { type: 'file', ...media }
      } else {
        content = {
          type: 'text',
          text: `[Received an unsupported message type]`,
        }
      }

      // Ensure user exists
      await supabase
        .from('lily_users2')
        .upsert(
          { phone },
          { onConflict: 'phone', ignoreDuplicates: true }
        )

      // Process with Lily engine
      const result = await processMessage({ phone, content })

      // Send reply
      await sendMessage(chatId, result.reply)
    } catch (err) {
      console.error('[telegram webhook] Error processing message:', err)
    }
  })

  return NextResponse.json({ status: 'ok' })
}
