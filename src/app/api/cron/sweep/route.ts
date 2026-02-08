import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendMessage } from '@/lib/whatsapp'
import { generateScratch } from '@/lib/scratch'
import type { LilyTask } from '@/lib/types'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find due tasks
  const { data: tasks } = await supabase
    .from('lily_tasks')
    .select('*')
    .eq('status', 'pending')
    .lte('reminder_at', new Date().toISOString())
    .order('reminder_at', { ascending: true })
    .limit(20)

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const task of tasks as LilyTask[]) {
    try {
      // Generate scratch
      const scratch = await generateScratch(task.summary)

      // Format message
      let msg: string
      if (task.is_preview) {
        msg = `Here's a preview of what a real reminder feels like 👇\n\n📋 ${task.summary}\n${scratch}\n\nThat's a scratch — just enough to get you started, not a whole plan.\nI'll send you one like this at the actual reminder time ✨`
      } else {
        msg = `Hey — ${task.summary}\n\n${scratch}`
      }

      // Send via WhatsApp
      await sendMessage(task.phone, msg)

      // Mark as reminded
      await supabase
        .from('lily_tasks')
        .update({ status: 'reminded', scratch })
        .eq('id', task.id)

      processed++
    } catch (err) {
      console.error(`[sweep] Failed to process task ${task.id}:`, err)
    }
  }

  return NextResponse.json({ processed })
}
