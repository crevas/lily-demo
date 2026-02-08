const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '14155551234'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Hero */}
      <div className="max-w-md space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Lily</h1>

        <p className="text-lg text-neutral-400 leading-relaxed">
          Tell her what&apos;s on your mind.
          <br />
          She&apos;ll make sure you start it.
        </p>

        {/* CTA */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20Lily`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-lg font-semibold text-white transition-transform hover:scale-105 active:scale-95"
        >
          Talk to Lily on WhatsApp 💬
        </a>

        {/* Subtext */}
        <p className="text-sm text-neutral-500 pt-4">
          Voice, text, photos, PDFs, YouTube links — she understands them all.
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-xs text-neutral-600">
        Built with Gemini 3 · Gemini 3 Hackathon 2026
      </footer>
    </main>
  )
}
