import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist@5 ships ESM and a worker subpath; let Next bundle it and
  // resolve the worker subpath through Node's normal module resolution.
  // `extract-pdf.ts` configures `GlobalWorkerOptions.workerSrc` at runtime
  // so pdfjs's "fake" (main-thread) worker can import the worker source
  // that Next has bundled.
  serverExternalPackages: [],
};

export default nextConfig;
