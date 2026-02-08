const BOT_API = () =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`${BOT_API()}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[telegram] sendMessage failed:', err)
  }
}

export async function downloadMedia(
  fileId: string
): Promise<{ data: Buffer; mimeType: string }> {
  // Step 1: get file path
  const res = await fetch(`${BOT_API()}/getFile?file_id=${fileId}`)
  const json = (await res.json()) as {
    result: { file_path: string }
  }

  // Step 2: download from Telegram CDN
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${json.result.file_path}`
  const fileRes = await fetch(fileUrl)
  const arrayBuffer = await fileRes.arrayBuffer()

  // Infer MIME type from file extension
  const ext = json.result.file_path.split('.').pop()?.toLowerCase() ?? ''
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }

  return {
    data: Buffer.from(arrayBuffer),
    mimeType: mimeMap[ext] || 'application/octet-stream',
  }
}
