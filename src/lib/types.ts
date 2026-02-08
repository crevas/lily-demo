export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'audio'; data: Buffer; mimeType: string }
  | { type: 'image'; data: Buffer; mimeType: string }
  | { type: 'video'; data: Buffer; mimeType: string }
  | { type: 'file'; data: Buffer; mimeType: string }

export type LilyTask = {
  id: string
  phone: string
  summary: string
  reminder_at: string | null
  scratch: string | null
  status: 'pending' | 'reminded' | 'done'
  is_preview: boolean
  created_at: string
}

export type LilyUser = {
  phone: string
  first_task_sent: boolean
  lily_memory: string
  created_at: string
}
