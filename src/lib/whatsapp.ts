const GRAPH_API = 'https://graph.facebook.com/v21.0'

export async function sendMessage(phone: string, text: string) {
  const res = await fetch(
    `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[whatsapp] sendMessage failed:', err)
  }
}

export async function downloadMedia(
  mediaId: string
): Promise<{ data: Buffer; mimeType: string }> {
  // Step 1: get the media URL
  const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  })
  const meta = (await metaRes.json()) as { url: string; mime_type: string }

  // Step 2: download the binary
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  })
  const arrayBuffer = await fileRes.arrayBuffer()

  return {
    data: Buffer.from(arrayBuffer),
    mimeType: meta.mime_type,
  }
}
