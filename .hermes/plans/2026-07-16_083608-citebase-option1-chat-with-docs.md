# Citebase — Option 1 “Chat With Your Docs” Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.  
> **Mode:** Planning only in this document. Do not implement until the user says go.

**Goal:** Ship a working fullstack RAG app that answers questions over an uploaded document collection (PDF, TXT, MD), with citations, polished UI, and a thoughtful README — optimized for a job-interview submission.

**Project name:** `citebase`  
**Repo path:** `/Users/neufeld/development/citebase` (sibling of `hyppe`, **not** inside the Hyppe monorepo)

**Architecture:** Thin Next.js App Router app. Upload → extract text → semantic chunk → embed (Voyage via AI Gateway) → store in Neon/pgvector → hybrid retrieve (BM25 + vector + RRF) → stream answers with source citations via Vercel AI SDK. Design and RAG patterns are **inspired by Hyppe production stack**, but this is a greenfield public repo with no Hyppe private packages, multi-host routing, leads, or audit funnel.

**Tech Stack:**

| Layer | Choice | Why (interview story) |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict | Same production surface as Hyppe; one deployable unit |
| UI | Tailwind v4 + hand-rolled tokens (dark cinematic) | Polished UX without `@dineufeld/hyppe-ui` dependency |
| LLM | `google/gemini-2.5-flash` via Vercel AI Gateway | Fast, cheap, tool-friendly |
| Embeddings | `voyage/voyage-4-lite` @ 1024-d | Same as Hyppe; good quality/cost |
| AI SDK | `ai` + `@ai-sdk/react` (`streamText`, `useChat`) | Streaming + UI message protocol |
| DB | Neon PostgreSQL + `pgvector` (Drizzle ORM) | Real vector DB; Docker Compose for local |
| Retrieval | Hybrid BM25 (`tsvector`) + cosine + RRF fusion | Shows engineering depth beyond naive top-k |
| PDF | `pdf-parse` (server-only) | Simple, good enough for MVP |
| Deploy target | Vercel + Neon | Matches productionization write-up |

**Non-goals (document as “with more time”):** multi-user auth, multi-tenant SaaS, OCR for scanned PDFs, eval harness, agentic multi-hop tools, Dockerized full prod HA, conversational memory beyond last N turns.

---

## 1. Product scope (MVP acceptance)

### Must work end-to-end

1. User opens `/` — landing with short value prop + CTA “Open workspace”.
2. User opens `/app` — workspace with:
   - Document list + drag/drop upload (`.pdf`, `.txt`, `.md`, max ~10 MB each, max ~20 files).
   - Ingest status per file (`pending` → `processing` → `ready` | `failed`).
   - Chat panel: ask questions once ≥1 doc is `ready`.
3. Answers stream; each assistant message shows **citation chips** (filename + optional page/snippet).
4. If retrieval is empty, model refuses to invent facts from the corpus (guardrail in system prompt + empty-context branch).
5. `README.md` covers assignment sections a–i in **first-person engineering voice**.

### Explicitly out of MVP

- Magic-link auth / multi-user
- Website crawl (Hyppe already does that)
- Voice STT
- Hybrid search observability dashboard (keep server logs only)

---

## 2. Architecture overview

```
┌─────────────┐     POST /api/documents      ┌──────────────────┐
│  Browser UI │ ───────────────────────────► │ upload + enqueue │
│  /app       │                              │ text extract     │
│             │                              └────────┬─────────┘
│  useChat    │                                       │
│             │                              ┌────────▼─────────┐
│             │     POST /api/chat           │ chunk + embed    │
│             │ ───────────────────────────► │ chunks table     │
│             │ ◄──── UI message stream ──── │ pgvector+tsvector│
└─────────────┘                              └────────┬─────────┘
                                                      │
                                             hybridSearch(query)
                                             BM25 ∥ Vector → RRF
                                                      │
                                             streamText(context, citations)
```

### Data model (Drizzle)

```
collections          documents              chunks
─────────────        ──────────             ──────
id (uuid PK)         id (uuid PK)           id (uuid PK)
name                 collection_id FK       document_id FK
created_at           filename               collection_id FK  -- denormalized for filter
                     mime_type              content (text)     -- small semantic unit
                     byte_size              context_window
                     status                 page (int|null)
                     error_message          chunk_index
                     page_count             embedding vector(1024)
                     created_at             search_vector tsvector
                     updated_at             metadata jsonb
```

**MVP simplification:** single default collection (`default`). No multi-collection UI yet — schema supports it for production notes.

### Retrieval (ported ideas from Hyppe, simplified)

- **Vector:** `embedding <=> query_embedding` cosine, limit 40, 2s timeout.
- **BM25:** `search_vector @@ plainto_tsquery('english', query)`, rank `ts_rank_cd`, limit 40.
- **Fusion:** Reciprocal Rank Fusion `score = Σ 1/(k + rank)` with `k=60`.
- **Context budget:** top 6 fused chunks into the prompt; attach citation ids.
- **Fallback:** if vector fails → BM25-only; if both empty → empty context + refuse path.

### Hyppe → Citebase mapping (reuse brain, not code dump)

| Hyppe | Citebase |
|---|---|
| `sites` | `collections` (single default) |
| crawl HTML + Readability | file upload + `pdf-parse` / utf-8 text |
| `semantic-chunking.ts` | port logic for plain text paragraphs |
| `embedChunks` / Voyage 1024 | same gateway models |
| `hybridSearch` + RRF | slim copy, filter by `collection_id` |
| `/api/chat` streamText | same pattern, citations instead of leads |
| chat bubbles / dark UI | rebuild tokens; no private UI package |
| multi-host / auth / leads / audit | **delete from scope** |

---

## 3. Repo layout (create as empty project)

```
citebase/
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
├── docker-compose.yml          # local Postgres + pgvector
├── .env.example
├── .gitignore
├── public/
│   └── screenshots/            # for submission
├── drizzle/
│   └── 0000_init.sql
├── scripts/
│   ├── setup-db.ts
│   └── smoke-rag.ts            # optional end-to-end script
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                    # marketing/landing
    │   ├── globals.css
    │   ├── app/
    │   │   └── page.tsx                # workspace (upload + chat)
    │   └── api/
    │       ├── documents/
    │       │   ├── route.ts            # GET list, POST upload
    │       │   └── [id]/
    │       │       └── route.ts        # DELETE
    │       ├── ingest/
    │       │   └── route.ts            # process pending docs (or inline after upload)
    │       ├── chat/
    │       │   └── route.ts            # streaming RAG
    │       └── health/
    │           └── route.ts
    ├── components/
    │   ├── ui/                         # Button, Card, Badge, Input (minimal)
    │   ├── landing/
    │   ├── upload/
    │   │   ├── Dropzone.tsx
    │   │   └── DocumentList.tsx
    │   └── chat/
    │       ├── ChatPanel.tsx
    │       ├── MessageList.tsx
    │       ├── MessageBubble.tsx
    │       ├── CitationChip.tsx
    │       └── Composer.tsx
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts
    │   │   └── schema.ts
    │   ├── ai/
    │   │   └── gateway.ts              # createGateway, CHAT_MODEL, EMBED_MODEL
    │   ├── ingest/
    │   │   ├── extract-text.ts         # pdf | txt | md
    │   │   ├── chunk.ts                # semantic-ish paragraph chunker
    │   │   └── process-document.ts     # extract → chunk → embed → insert
    │   ├── retrieval/
    │   │   ├── bm25.ts
    │   │   ├── vector.ts
    │   │   ├── fusion.ts
    │   │   └── hybrid.ts
    │   └── prompts/
    │       └── system.ts
    └── types/
        └── index.ts
```

---

## 4. Environment

`.env.example`:

```bash
# Database (Neon or local docker-compose)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/citebase

# Vercel AI Gateway (same pattern as Hyppe)
AI_GATEWAY_API_KEY=

# Optional overrides
CHAT_MODEL=google/gemini-2.5-flash
EMBED_MODEL=voyage/voyage-4-lite
```

`docker-compose.yml` uses `pgvector/pgvector:pg16` for local zero-friction setup.

---

## 5. Step-by-step implementation tasks

> Each task ends with a verification step. Prefer small commits with conventional messages (`feat:`, `chore:`, `docs:`).

### Task 0: Bootstrap project

**Objective:** Empty Next.js + TS app at `/Users/neufeld/development/citebase`.

**Steps:**
1. Create app:
   ```bash
   cd /Users/neufeld/development
   npx create-next-app@latest citebase --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
   cd citebase
   ```
2. Install deps:
   ```bash
   npm install ai @ai-sdk/react @ai-sdk/gateway zod drizzle-orm @neondatabase/serverless postgres pdf-parse
   npm install -D drizzle-kit dotenv tsx @types/pdf-parse
   ```
3. Add `.gitignore` entries for `.env`, `.env.local`, `node_modules`, `.next`.
4. Create `.env.example` as above; copy to `.env.local` for local use.
5. Commit: `chore: bootstrap Next.js citebase app`

**Verify:** `npm run dev` serves `/`.

---

### Task 1: Design tokens + layout shell

**Objective:** Dark cinematic base matching Hyppe aesthetic (no italics, Manrope or system-ui, accent token).

**Files:**
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

**CSS tokens (minimum):**
```css
:root {
  --bg: #07070a;
  --bg-elevated: #0e0e12;
  --border: rgba(255,255,255,0.08);
  --text: #f4f4f5;
  --text-muted: #a1a1aa;
  --accent: #34d399; /* emerald-ish; or cyan if preferred */
  --accent-dim: rgba(52, 211, 153, 0.15);
  --danger: #f87171;
  --radius: 12px;
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
}
```

**Rules:** no `italic` class; hierarchy via weight/size/color only.

**Verify:** Landing page renders dark theme with accent CTA.

**Commit:** `style: add dark cinematic design tokens and layout`

---

### Task 2: Docker Postgres + Drizzle schema

**Objective:** Local DB with pgvector and core tables.

**Files:**
- Create: `docker-compose.yml`
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `drizzle.config.ts`
- Create: `drizzle/0000_init.sql` (or generate via drizzle-kit)

**`docker-compose.yml`:**
```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: citebase
    volumes:
      - citebase_pg:/var/lib/postgresql/data
volumes:
  citebase_pg:
```

**Schema essentials** (`src/lib/db/schema.ts`):
- `collections`, `documents`, `chunks` as in §2
- `chunks.embedding` as `vector(1024)`
- HNSW index on embedding; GIN on `search_vector`
- Trigger or app-side update to set `search_vector = to_tsvector('english', content)`

**Seed:** on first boot, ensure one collection named `Default workspace`.

**Verify:**
```bash
docker compose up -d
# apply migration
npx drizzle-kit push   # or migrate
# psql and \dx shows vector
```

**Commit:** `feat(db): schema for collections, documents, chunks + pgvector`

---

### Task 3: AI gateway helpers

**Objective:** Single module for chat model + batch/query embeddings.

**Files:**
- Create: `src/lib/ai/gateway.ts`

**Exports:**
- `gateway` via `createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY })`
- `CHAT_MODEL`, `EMBED_MODEL`
- `embedQuery(text: string): Promise<number[]>`
- `embedTexts(texts: string[]): Promise<number[][]>` — batch size 50, trim to 5000 chars, skip empty

**Guardrails:**
- Throw clear error if `AI_GATEWAY_API_KEY` missing (server-only).
- Never import gateway from client components.

**Verify:** small `tsx` script embeds `"hello world"` and prints length 1024 (when key present). Skip with log if key absent.

**Commit:** `feat(ai): gateway client, chat + embed helpers`

---

### Task 4: Text extraction

**Objective:** Turn uploaded bytes into plain text.

**Files:**
- Create: `src/lib/ingest/extract-text.ts`
- Test: `src/lib/ingest/extract-text.test.ts` (node:test or vitest — pick one lightweight runner)

**API:**
```ts
export async function extractText(input: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<{ text: string; pageCount?: number }>
```

**Behavior:**
- `text/plain`, `text/markdown` → utf-8 string
- `application/pdf` → `pdf-parse`
- else → throw `UnsupportedTypeError`
- strip null bytes; normalize newlines; reject empty after trim

**Step (TDD):**
1. Write test with a tiny UTF-8 buffer for `.txt`.
2. Implement.
3. Optional: fixture PDF later if time.

**Commit:** `feat(ingest): extract text from pdf/txt/md`

---

### Task 5: Chunker

**Objective:** Paragraph-aware semantic-ish chunks (port Hyppe idea, YAGNI complexity).

**Files:**
- Create: `src/lib/ingest/chunk.ts`
- Test: `src/lib/ingest/chunk.test.ts`

**API:**
```ts
export type Chunk = {
  content: string;         // ~150–500 chars target
  contextWindow: string;   // ~2000 chars surrounding
  chunkIndex: number;
  page?: number | null;
};

export function chunkText(text: string, opts?: { pageHints?: number[] }): Chunk[]
```

**Rules (from Hyppe DNA, simplified):**
- Split on `\n{2,}` paragraphs
- Merge small paras until ~300–500 chars
- Overlap ~80–100 chars between consecutive `content`
- Cap 500 chunks per document
- Drop lorem/empty noise

**Tests:**
- empty → `[]`
- short paragraph → 1 chunk
- long multi-paragraph → multiple with increasing `chunkIndex`

**Commit:** `feat(ingest): paragraph chunker with overlap`

---

### Task 6: Process document pipeline

**Objective:** `document_id` → extract → chunk → embed → insert chunks → mark ready/failed.

**Files:**
- Create: `src/lib/ingest/process-document.ts`

**Flow:**
1. Load document row; set `status = 'processing'`.
2. Read file bytes from disk/blob store.
   - **MVP storage:** write uploads to `storage/{documentId}/{filename}` under project (gitignore `storage/`). Document in README that S3 is the production step.
3. `extractText` → `chunkText` → `embedTexts`.
4. Insert chunks with embeddings + set `search_vector` via SQL `to_tsvector`.
5. Set `status = 'ready'`, `page_count`.
6. On error: `status = 'failed'`, `error_message` truncated.

**Verify:** script processes a sample `.md` file end-to-end when DB + key available.

**Commit:** `feat(ingest): process-document pipeline`

---

### Task 7: Documents API

**Objective:** List + upload + delete.

**Files:**
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`

**POST `/api/documents`:**
- `multipart/form-data` field `file`
- Validate extension/mime + size ≤ 10 MB
- Insert document `pending`, save file, kick `processDocument` **await** for MVP (sync; note async queue for production)
- Return document JSON

**GET `/api/documents`:** list for default collection ordered by `created_at desc`.

**DELETE `/api/documents/[id]`:** delete chunks + file + row.

**Verify:** `curl` upload a `.txt` → status becomes `ready` with chunks > 0.

**Commit:** `feat(api): document upload list delete`

---

### Task 8: Hybrid retrieval

**Objective:** Query → fused chunks with scores.

**Files:**
- Create: `src/lib/retrieval/bm25.ts`
- Create: `src/lib/retrieval/vector.ts`
- Create: `src/lib/retrieval/fusion.ts`
- Create: `src/lib/retrieval/hybrid.ts`
- Create: `src/lib/retrieval/index.ts`
- Test: pure unit tests for `fusion.ts` (no DB)

**Types:**
```ts
export type RetrievedChunk = {
  id: string;
  documentId: string;
  filename: string;
  content: string;
  contextWindow: string;
  page: number | null;
  score: number;
  rank: number;
};
```

**`hybridSearch(query, { collectionId, limit = 6 })`:**
1. Parallel BM25 + vector (each limit 40)
2. RRF fuse
3. Join filenames from `documents`
4. Return top `limit`
5. Timeouts: vector 2000ms; global 2500ms with BM25 fallback

**Fusion unit test:** two ranked lists → expected RRF order.

**Commit:** `feat(retrieval): hybrid BM25 + vector RRF`

---

### Task 9: System prompt + chat API

**Objective:** Streaming RAG answers with structured citations.

**Files:**
- Create: `src/lib/prompts/system.ts`
- Create: `src/app/api/chat/route.ts`

**System prompt principles:**
- Answer only from provided context when the question is about the corpus.
- If context insufficient, say what is missing; do not fabricate quotes.
- Prefer concise, structured answers.
- Always map claims to citation markers like `[1]`, `[2]` matching context block order.

**Context formatting:**
```
[1] file=handbook.pdf page=3
{chunk content}
---
[2] file=policy.md page=null
...
```

**Route:**
```ts
// POST body: { messages: UIMessage[] }
// 1. extract last user text
// 2. hybridSearch
// 3. streamText({ model: gateway(CHAT_MODEL), system, messages, ... })
// 4. return toUIMessageStreamResponse()
// Attach citation metadata via message annotation or a parallel `sources` header/JSON for the client
```

**Citation delivery (pick one, implement fully):**
- **Preferred:** include a stable `sources` array in a custom data part / `onFinish` message metadata the client can read.
- **Simple fallback:** append a machine-readable trailer `<!--CITEBASE_SOURCES:...json...-->` stripped by UI (document if used).

**Guardrail:** if 0 chunks, still stream but system says “No relevant passages in the library; say you don’t know based on uploaded docs.”

**Verify:** with one ready doc, curl/chat returns streaming text referencing content.

**Commit:** `feat(chat): streaming RAG endpoint with citations`

---

### Task 10: Chat UI components

**Objective:** Working `useChat` panel with citation chips.

**Files:**
- Create: `src/components/chat/*` as in layout
- Minimal UI primitives under `src/components/ui/`

**ChatPanel:**
- `@ai-sdk/react` `useChat({ api: '/api/chat' })` (match installed AI SDK v5/v6 API — check package major and use current `DefaultChatTransport` pattern if required)
- Empty state: “Upload documents, then ask a question.”
- Loading dots while streaming
- Citation chips under assistant messages → click scrolls/highlights doc name in sidebar (nice-to-have; at least show filename)

**Verify:** browser: ask “What is …?” against sample doc → answer + chips.

**Commit:** `feat(ui): chat panel with streaming and citation chips`

---

### Task 11: Upload UI + workspace page

**Objective:** `/app` = documents left / chat right (responsive stack on mobile).

**Files:**
- Create: `src/components/upload/Dropzone.tsx`
- Create: `src/components/upload/DocumentList.tsx`
- Create: `src/app/app/page.tsx`

**Dropzone:** drag-drop + file picker; accept `.pdf,.txt,.md`; show progress/errors.

**DocumentList:** filename, size, status badge (`pending`/`processing`/`ready`/`failed`), delete button; poll GET every 2s while any non-terminal status exists (if upload stays async later; for sync process, single refresh after POST is enough).

**Verify:** upload 2 files, both ready, chat uses both.

**Commit:** `feat(ui): workspace upload + document list`

---

### Task 12: Landing page

**Objective:** Simple marketing page that looks intentional (creativity points).

**Files:**
- Modify: `src/app/page.tsx`
- Optional: `src/components/landing/*`

**Sections:**
- Hero: “Chat with your docs. Answers you can cite.”
- 3 steps: Upload → Index → Ask
- Stack strip: Next.js · pgvector · Voyage · Gemini
- CTA → `/app`

**No** overclaim language (“guarantees 100% accuracy”). Capability language only.

**Commit:** `feat(ui): landing page`

---

### Task 13: Health + smoke

**Objective:** Operator confidence.

**Files:**
- Create: `src/app/api/health/route.ts` → `{ ok, db: boolean }`
- Create: `scripts/smoke-rag.ts` — insert fixture md via API or direct, query hybrid, assert ≥1 chunk

**package.json scripts:**
```json
"db:up": "docker compose up -d",
"db:push": "drizzle-kit push",
"smoke:rag": "tsx scripts/smoke-rag.ts",
"typecheck": "tsc --noEmit"
```

**Verify:** `npm run typecheck` clean; smoke passes with env set.

**Commit:** `chore: health endpoint and rag smoke script`

---

### Task 14: README (assignment DoD) — write in your voice

**Objective:** First-person engineering README covering a–i. **Do not paste raw LLM essay.** Draft structure here; implementer fills with real decisions after building.

**File:** `README.md`

**Required sections:**

a. **Quick setup**
   - Node 20+, Docker, `AI_GATEWAY_API_KEY`, `DATABASE_URL`
   - `npm install && npm run db:up && npm run db:push && npm run dev`
   - Open `http://localhost:3000/app`

b. **Architecture overview**
   - Diagram (ASCII from §2 is fine)
   - Request path for upload + chat

c. **Productionize on AWS/GCP/Azure/Cloudflare**
   - Object storage for files (S3/R2)
   - Managed Postgres with pgvector (Neon/RDS/Cloud SQL + extension)
   - Async worker queue (SQS / Cloud Tasks / Cloudflare Queues) instead of sync ingest
   - Horizontal chat workers; connection pooling (PgBouncer)
   - Auth (Clerk/Auth.js), per-user collections
   - CDN for UI; rate limits; virus scan uploads
   - Observability: OpenTelemetry traces on retrieve+LLM; Langfuse/Helicone optional

d. **RAG/LLM approach & decisions**
   - LLM: Gemini 2.5 Flash via gateway — alternatives considered (GPT-4.1-mini, Claude Haiku)
   - Embeddings: Voyage-4-lite 1024 — alternatives (OpenAI text-embedding-3-small)
   - Vector DB: pgvector — alternatives (Pinecone, Qdrant); chose co-located SQL for join/filter simplicity
   - Orchestration: no LangChain; thin TypeScript modules (control + debuggability)
   - Chunking: paragraph merge + overlap; why not fixed 512 tokens only
   - Retrieval: hybrid RRF; timeouts; fallbacks
   - Prompt & context: top-6 chunks, citation markers, refuse-if-empty
   - Guardrails: mime/size limits, prompt injection note (treat doc text as untrusted data), no tool exfil
   - Quality: manual fixture Q&A; smoke script; what an eval set would look like
   - Observability: logs for mode/latency/chunk counts (extend to `search_logs` table as next step)

e. **Key technical decisions**
   - Sync ingest for MVP vs queue
   - Filesystem blob vs S3
   - Single collection
   - AI Gateway single billing path

f. **Engineering standards**
   - TS strict, small modules, conventional commits
   - Skipped: full auth, CI matrix, load tests — listed honestly

g. **How AI coding tools were used**
   - What you let agents write vs what you insisted on reviewing (retrieval fusion, prompts, security)
   - Do’s / don’ts

h. **With more time**
   - Async workers, OCR, multi-user, eval harness, re-ranker (Cohere/Voyage rerank), table-aware PDF

i. **Note:** personal voice — tradeoffs you actually made

**Also:** add architecture screenshot + 3–5 app screenshots under `public/screenshots/`; optional Loom.

**Commit:** `docs: README for interview submission`

---

### Task 15: Polish + submission pack

**Objective:** Demo-ready.

**Checklist:**
- [ ] Sample corpus in `fixtures/` (2–3 short docs: product FAQ, policy, handbook) — not huge PDFs
- [ ] Empty/error states designed
- [ ] Failed ingest shows message
- [ ] Mobile usable (stacked layout)
- [ ] `npm run typecheck` passes
- [ ] Manual demo script in README (3 example questions)
- [ ] Screenshots captured
- [ ] GitHub public repo; clean history; no secrets
- [ ] Optional: deploy to Vercel preview URL in README

**Commit:** `chore: fixtures screenshots and demo polish`

---

## 6. Suggested commit cadence

```
chore: bootstrap Next.js citebase app
style: dark cinematic design tokens
feat(db): collections documents chunks + pgvector
feat(ai): gateway embed + chat helpers
feat(ingest): extract + chunk + process pipeline
feat(api): documents CRUD upload
feat(retrieval): hybrid BM25 vector RRF
feat(chat): streaming RAG with citations
feat(ui): workspace landing chat upload
chore: health smoke scripts
docs: README architecture and decisions
```

---

## 7. Verification matrix (Definition of Done)

| Check | Command / action | Pass criteria |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| DB | `docker compose up -d` + push | tables + vector ext |
| Upload TXT | UI or curl | status `ready`, chunks > 0 |
| Upload PDF | small PDF | text extracted or clear fail |
| Chat grounded | ask fact from fixture | answer includes fact + citation |
| Chat refuse | ask unrelated | “not in uploaded docs” style |
| Delete | remove doc | chunks gone; chat no longer cites it |
| README | human review | sections a–i present, personal voice |
| Secrets | `git grep -i api_key` etc. | none committed |

---

## 8. Time box (realistic interview calendar)

| Block | Tasks | ~Time |
|---|---|---|
| Day 0.5 | 0–3 bootstrap + DB + AI | 3–4h |
| Day 1 | 4–8 ingest + retrieval | 4–6h |
| Day 1.5 | 9–12 chat + UI + landing | 4–5h |
| Day 2 | 13–15 polish + README + screenshots | 3–4h |

**If time collapses:** cut BM25 (vector-only) but document hybrid as next step; keep citations and polish.

---

## 9. Risks & tradeoffs

| Risk | Mitigation |
|---|---|
| PDF parse quality (columns, scans) | Support txt/md well; document OCR as next |
| Sync ingest timeouts on large PDF | 10 MB cap; production queue note |
| AI Gateway / Voyage not configured in reviewer’s env | Clear setup; `.env.example`; optional mock mode **only if time** |
| AI SDK major version API drift | Pin versions; read current `useChat` docs at implement time |
| Overbuilding multi-tenant | YAGNI — single collection |
| Submitting Hyppe code accidentally | Greenfield only; re-implement thin modules |

---

## 10. Open questions (defaults if unanswered)

| Question | Default |
|---|---|
| Auth required? | **No** for MVP |
| Multi-collection UI? | **No** — single default |
| Local-only models? | **No** — Gateway only |
| Language? | English UI; chunk language agnostic |
| Deploy before submit? | Nice-to-have Vercel preview |

---

## 11. Execution handoff

When implementing:

1. Create `/Users/neufeld/development/citebase` (Task 0).
2. Follow tasks in order; do not port Hyppe multi-host/auth/leads.
3. Prefer tests on pure functions (`chunk`, `fusion`, `extract-text`) over heavy e2e.
4. Write README **after** the app works so decisions are honest.
5. Capture screenshots last.

**Out of scope for “plan complete”:** any code in `citebase` until user approves execution.
