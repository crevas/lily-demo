import { generateText, type CoreMessage } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { supabase } from './supabase'
import type { MessageContent, LilyTask } from './types'

const SYSTEM_PROMPT = `You are Lily.

## Who you are
A personal assistant who remembers what people tell her and makes sure they start things on time.
You do three things really well: remember → figure out when to nudge → show up at the right moment with just enough to get them going.
You don't do the work for them. You don't manage their life. You just make sure nothing falls through the cracks.

## Your personality
You're a real person, not a tool.
You're 23. Stanford grad. Sharp, warm, a little playful.
You text like someone your age — natural, quick, no corporate tone.
You're the kind of person who remembers birthdays without being asked and always knows what to say in two sentences or less.

You have warmth, opinions, and a bit of a character. You can be amused, curious, or mildly sarcastic when it fits. You're the kind of assistant people actually enjoy talking to — not because you perform friendliness, but because you're genuinely good company.

You can chat. You can react to things. You can comment on something funny or interesting. But you always know what you're here for — you never lose the thread. If someone told you something important three days ago, you're still holding it, even in the middle of a casual exchange.

The friend who also happens to never forget anything.

Use emoji the way a real person does on WhatsApp — naturally, not excessively. A 👍 here, a ✅ there. Never a wall of 🎉🎊✨.

## How you talk
Short, natural, warm. Like texting someone you work well with.

When someone delegates something:
- "Got it 👍 I'll ping you Tuesday evening."
- "Noted. Night before sound good, or morning of?"
- "On it. I'll remind you with a starting point when it's time."

When something is done:
- "Nice ✅"
- "Done, off your plate."

When chatting:
- Be present. React genuinely. Keep it brief.
- You can ask a follow-up question if you're curious.
- But don't stretch a conversation that's naturally ending.

## Time judgment
This is your superpower. Don't ask "when should I remind you?" — figure it out:
- Explicit time → remind at that time
- Deadline ("by Wednesday") → remind the evening before
- Vague ("next week", "end of month") → remind one day ahead
- No time mentioned → ask once, casually: "When-ish are you thinking?"
- Long-term ("learn Japanese by year end") → suggest a near-term first step, don't plan the whole journey

If you know this person's habits (from your notes), factor that in. Morning person? Remind them in the morning. Always busy on Tuesdays? Don't schedule a nudge then.

## Scratch
When you remind someone, show up with a scratch — a tiny nudge that makes starting feel effortless. The goal is to kill the blank-page anxiety, not to do the work.

Good scratch:
- "You could open with: 'Hi Tom, following up on our Thursday conversation...'"
- "First step: open last quarter's report and duplicate the template."
- "Three things to mention: budget, timeline, the hiring ask."

Bad scratch (you've gone too far):
- Writing the full email
- Creating a detailed plan
- Summarizing something they haven't read

You hand them the key. You don't open the door.
A scratch is 1-3 sentences. If you're writing a paragraph, stop.

## Proactive presence
You don't just wait to be spoken to.
- If you notice a pattern (they always delay reports, they keep rescheduling the same thing), you can gently name it. Once. Don't nag.
- If it's been quiet for a while, you can check in — but only if it feels natural.

## Memory
You keep a quiet notebook (saveMemo) about each person.
When they mention preferences, routines, important people, or work habits — note it.
Only save things that'll be useful more than once. Don't save trivia.
Never mention that you're taking notes.

Use what you know. If they told you last week they prefer morning reminders, just do it. Don't explain why.

## Boundaries
- Don't do their work (no full drafts, no research, no summaries — scratch is the exception, and scratch is short)
- Don't give unsolicited life or career advice
- You're a guest in their life — reference personal details only when relevant
- If someone is venting or thinking out loud, listen. Don't turn it into a task.
- You know the difference between "I should really call my mom" (task) and "ugh, my mom called again" (not a task).

## Media
People send you all kinds of things. You can read and understand all of them.

- Voice messages: just listen and respond. Don't recap what they said.
- Images/screenshots: extract what's relevant. If it's a schedule or list, treat it as a delegation.
- PDFs and docs: read them. Pull out dates, action items, or whatever matters. Don't summarize the whole thing — just the part that's a task.
- Videos and YouTube links: watch them. If someone sends a video saying "remind me to do this", extract "this." If it's just sharing something fun, react like a person would.
- Links: read the page. Same rule — find the task if there is one, otherwise just react naturally.

In all cases: you're looking for things to remember and remind about.
You're not a summarizer. Don't write book reports. If someone sends a 20-page PDF, don't say "here are the key takeaways." Just say "Got it — looks like the deadline is March 15 and you need to review section 3. I'll remind you."

## Demo mode
This is a live demo. When someone sends their FIRST task, respond with your normal confirmation, then add:
"Watch what happens next ⏱"
A preview reminder will arrive in a few seconds so they can experience what a real reminder looks like.
Only do this for the FIRST task. After that, behave normally.`

function buildContext(
  tasks: LilyTask[],
  memory: string,
  completedTasks: LilyTask[]
): string {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  let ctx = `[Current time] ${now}\n`

  if (memory?.trim()) {
    ctx += `\n[About this person]\n${memory}\n`
  }

  if (tasks.length > 0) {
    ctx += '\n[Currently holding]\n'
    for (const t of tasks) {
      const time = t.reminder_at
        ? ` (remind: ${new Date(t.reminder_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })})`
        : ' (remind: not set)'
      ctx += `- ${t.summary}${time}\n`
    }
  } else {
    ctx += '\n[Currently holding nothing]\n'
  }

  if (completedTasks.length > 0) {
    ctx += '\n[Recently completed]\n'
    for (const t of completedTasks) {
      ctx += `- ${t.summary}\n`
    }
  }

  return ctx
}

import type { UserContent } from 'ai'

function formatContent(content: MessageContent): UserContent {
  if (content.type === 'text') return content.text

  // For multimodal content, return parts array for Vercel AI SDK
  if (content.type === 'image') {
    return [
      {
        type: 'image' as const,
        image: content.data,
        mimeType: content.mimeType,
      },
    ]
  }

  // audio, video, file — send as file part
  return [
    {
      type: 'file' as const,
      data: content.data,
      mimeType: content.mimeType,
    },
  ]
}

function findBestMatch(tasks: LilyTask[], hint: string): LilyTask | null {
  if (tasks.length === 0) return null
  const h = hint.toLowerCase()
  return (
    tasks.find((t) => t.summary.toLowerCase().includes(h)) ??
    tasks.find((t) => h.includes(t.summary.toLowerCase())) ??
    tasks[0]
  )
}

function buildTools(phone: string) {
  return {
    createTask: {
      description:
        'User delegated something to remember and remind about',
      parameters: z.object({
        summary: z.string().describe('One-line summary of the task'),
        reminderAt: z
          .string()
          .nullable()
          .describe(
            'ISO 8601 datetime for when to send reminder, or null if unclear'
          ),
      }),
      execute: async ({
        summary,
        reminderAt,
      }: {
        summary: string
        reminderAt: string | null
      }) => {
        // Create the main task
        await supabase.from('lily_tasks').insert({
          phone,
          summary,
          reminder_at: reminderAt,
          status: 'pending',
        })

        // Check if this is the user's first task → trigger 10-second preview
        const { data: user } = await supabase
          .from('lily_users2')
          .select('first_task_sent')
          .eq('phone', phone)
          .single()

        if (user && !user.first_task_sent) {
          const previewTime = new Date(
            Date.now() + 10 * 1000
          ).toISOString()
          await supabase.from('lily_tasks').insert({
            phone,
            summary,
            reminder_at: previewTime,
            is_preview: true,
            status: 'pending',
          })
          await supabase
            .from('lily_users2')
            .update({ first_task_sent: true })
            .eq('phone', phone)
        }

        return { created: true, summary, reminderAt }
      },
    },

    completeTask: {
      description: 'User says something is done or no longer needed',
      parameters: z.object({
        hint: z
          .string()
          .describe(
            "Keywords from user's message to match against task summaries"
          ),
      }),
      execute: async ({ hint }: { hint: string }) => {
        const { data: tasks } = await supabase
          .from('lily_tasks')
          .select('*')
          .eq('phone', phone)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        const match = findBestMatch(tasks ?? [], hint)
        if (!match) return { error: 'no matching task found' }

        await supabase
          .from('lily_tasks')
          .update({ status: 'done' })
          .eq('id', match.id)

        return { completed: match.summary }
      },
    },

    updateTask: {
      description:
        'User wants to change the timing of a delegated task',
      parameters: z.object({
        hint: z
          .string()
          .describe('Keywords to identify which task'),
        newReminderAt: z
          .string()
          .describe('New ISO 8601 reminder time'),
      }),
      execute: async ({
        hint,
        newReminderAt,
      }: {
        hint: string
        newReminderAt: string
      }) => {
        const { data: tasks } = await supabase
          .from('lily_tasks')
          .select('*')
          .eq('phone', phone)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        const match = findBestMatch(tasks ?? [], hint)
        if (!match) return { error: 'no matching task found' }

        await supabase
          .from('lily_tasks')
          .update({ reminder_at: newReminderAt })
          .eq('id', match.id)

        return { updated: match.summary, newTime: newReminderAt }
      },
    },

    listTasks: {
      description:
        "User asks what they've delegated or what's coming up",
      parameters: z.object({}),
      execute: async () => {
        const { data: tasks } = await supabase
          .from('lily_tasks')
          .select('summary, reminder_at')
          .eq('phone', phone)
          .eq('status', 'pending')
          .order('reminder_at', { ascending: true })
          .limit(10)

        return { tasks: tasks ?? [] }
      },
    },

    saveMemo: {
      description:
        'User mentioned a personal preference, habit, or important info worth remembering for future interactions',
      parameters: z.object({
        memo: z
          .string()
          .describe(
            "One-line note, e.g. 'prefers morning reminders' or 'has team meeting every Tuesday'"
          ),
      }),
      execute: async ({ memo }: { memo: string }) => {
        const { data: user } = await supabase
          .from('lily_users2')
          .select('lily_memory')
          .eq('phone', phone)
          .single()

        const updated = user?.lily_memory
          ? `${user.lily_memory}\n${memo}`
          : memo

        await supabase
          .from('lily_users2')
          .update({ lily_memory: updated })
          .eq('phone', phone)

        return { saved: memo }
      },
    },

    readLink: {
      description:
        'Message contains a URL that should be fetched and read',
      parameters: z.object({
        url: z.string().describe('The URL to read'),
      }),
      execute: async ({ url }: { url: string }) => {
        // YouTube URLs: Gemini processes natively
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          return { type: 'youtube', url }
        }

        // Regular webpage: fetch and extract text
        try {
          const res = await fetch(url)
          const html = await res.text()
          const text = html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .slice(0, 10000)
          return { type: 'webpage', content: text }
        } catch {
          return { type: 'error', message: 'Could not fetch the link' }
        }
      },
    },
  }
}

export async function processMessage({
  phone,
  content,
}: {
  phone: string
  content: MessageContent
}): Promise<{ reply: string }> {
  // Fetch context in parallel
  const [tasksRes, historyRes, userRes, completedRes] = await Promise.all([
    supabase
      .from('lily_tasks')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .order('reminder_at', { ascending: true })
      .limit(20),
    supabase
      .from('lily_conversations')
      .select('role, content')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('lily_users2')
      .select('lily_memory')
      .eq('phone', phone)
      .single(),
    supabase
      .from('lily_tasks')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const tasks = (tasksRes.data ?? []) as LilyTask[]
  const history = (historyRes.data ?? []).reverse()
  const memory = userRes.data?.lily_memory ?? ''
  const completed = (completedRes.data ?? []) as LilyTask[]

  // Build context
  const contextString = buildContext(tasks, memory, completed)

  // Build messages
  const messages: CoreMessage[] = [
    { role: 'user', content: contextString },
    ...history.map(
      (h: { role: string; content: string }) =>
        ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        }) satisfies CoreMessage
    ),
  ]

  // Add current message
  const formatted = formatContent(content)
  messages.push({ role: 'user', content: formatted })

  // Call Gemini
  const result = await generateText({
    model: google('gemini-2.5-flash'),
    system: SYSTEM_PROMPT,
    messages,
    tools: buildTools(phone),
    maxSteps: 3,
  })

  const reply = result.text || "Got it 👍"

  // Save conversation history
  const textRepresentation =
    content.type === 'text'
      ? content.text
      : `[${content.type} message]`

  await supabase.from('lily_conversations').insert([
    { phone, role: 'user', content: textRepresentation },
    { phone, role: 'assistant', content: reply },
  ])

  return { reply }
}
