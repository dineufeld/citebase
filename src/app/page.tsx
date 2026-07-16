import Link from 'next/link';
import { Button, Card } from '@/components/ui/primitives';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(52,211,153,0.18), transparent 60%)',
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-dim)] text-xs font-bold text-[var(--accent)]">
            CB
          </span>
          <span className="text-sm font-semibold tracking-tight">Citebase</span>
        </div>
        <Link href="/app">
          <Button variant="ghost">Open workspace</Button>
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-20 pt-10 md:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Chat with your docs
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Answers you can cite from your own document library.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
          Upload PDFs, Markdown, or plain text. Citebase chunks and embeds your
          corpus, retrieves with hybrid BM25 + vector search, and streams grounded
          answers with source chips — not free-form hallucination.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app">
            <Button>Open workspace</Button>
          </Link>
          <a href="#how">
            <Button variant="ghost">How it works</Button>
          </a>
        </div>

        <section
          id="how"
          className="mt-16 grid gap-4 md:grid-cols-3"
        >
          {[
            {
              step: '01',
              title: 'Upload',
              body: 'Drop PDFs or text files into your library. We extract text, chunk paragraphs, and store files locally for the demo.',
            },
            {
              step: '02',
              title: 'Index',
              body: 'Voyage embeddings land in pgvector; full-text tsvector powers BM25. Results fuse with Reciprocal Rank Fusion.',
            },
            {
              step: '03',
              title: 'Ask',
              body: 'Stream answers from Gemini with [n] citation markers and UI chips that show which file each claim came from.',
            },
          ].map((item) => (
            <Card key={item.step} className="p-5">
              <p className="font-mono text-[11px] text-[var(--accent)]">{item.step}</p>
              <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {item.body}
              </p>
            </Card>
          ))}
        </section>

        <section className="mt-12">
          <Card className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">Stack</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Next.js · Vercel AI SDK · Gemini 2.5 Flash · Voyage 4 Lite · Neon/pgvector · Hybrid RRF
              </p>
            </div>
            <Link href="/app">
              <Button>Start indexing</Button>
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
