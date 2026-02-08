import { generateText } from 'ai'
import { google } from '@ai-sdk/google'

export async function generateScratch(summary: string): Promise<string> {
  const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    prompt: `You're Lily, a personal assistant. Your friend needs to do this: "${summary}".
Write 1-3 sentences telling them the very first step to get started.
Be specific and actionable. Don't plan the whole thing — just the immediate next action.
Write it as a WhatsApp message — casual, warm, direct.
Do NOT add any greeting or prefix. Just the starting point.`,
  })
  return text
}
