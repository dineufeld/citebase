import './pdf-dom-shim';
// Side-effect import to make sure the pdfjs worker source is bundled into
// the Vercel function. pdfjs's "fake" (main-thread) worker dynamically
// `import()`s the URL at `GlobalWorkerOptions.workerSrc`; if the file
// isn't part of the deployment, parsing throws "Setting up fake worker
// failed: Cannot find module ...". Importing it here makes Next.js trace
// it via `serverExternalPackages: ["pdfjs-dist"]`.
import * as PdfjsWorkerModule from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import {
  getDocument,
  GlobalWorkerOptions,
  PDFWorker,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizeText } from './extract-text';

// Suppress "unused" warning — this is a side-effect import.
void PdfjsWorkerModule;

export type ExtractResult = {
  text: string;
  pageCount?: number;
};

type PdfJsTextItem = { str: string; hasEOL?: boolean };
type PdfJsTextContent = { items: PdfJsTextItem[] };

// Disable pdfjs's worker bootstrap entirely. On Vercel, the dynamic worker
// file path can't be traced into the deployment and throws
// "Setting up fake worker failed: Cannot find module ... pdf.worker.mjs".
// Running the parse on the function's main thread is fine for a single-doc
// ingest per request. The setter is private upstream, so we mutate the static
// field through the prototype chain. We also need to point `workerSrc` at
// the bundled worker module so the fake-worker bootstrap can import it.
Object.defineProperty(GlobalWorkerOptions, 'workerSrc', {
  value: new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href,
  writable: true,
  configurable: true,
});

export async function extractPdfText(buffer: Buffer): Promise<ExtractResult> {
  // Pass `port: null` so pdfjs uses its built-in "fake" (main-thread) worker
  // instead of trying to spawn a Web Worker. The constructor types mark
  // `port` as `null | undefined` only, but the runtime accepts a string port
  // too. We only need the in-process parser.
  const worker = new PDFWorker({ port: null });
  await worker.promise;
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    verbosity: 0,
    worker,
  });

  const doc = await loadingTask.promise;
  try {
    const total = doc.numPages;
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= total; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      try {
        const textContent = (await page.getTextContent()) as PdfJsTextContent;
        const lines = textContent.items
          .map((item) => item.str ?? '')
          .filter((str) => Boolean(str && str.trim()));
        if (lines.length) pageTexts.push(lines.join(' '));
      } finally {
        await page.cleanup();
      }
    }
    const text = normalizeText(pageTexts.join('\n\n'));
    if (!text) {
      throw new Error('PDF produced no extractable text (scanned image?).');
    }
    return { text, pageCount: total };
  } finally {
    await doc.cleanup();
    await doc.destroy();
    await worker.destroy();
  }
}
