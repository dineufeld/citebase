export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type DocumentDTO = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  status: DocumentStatus;
  errorMessage: string | null;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CitationSource = {
  index: number;
  chunkId: string;
  documentId: string;
  filename: string;
  page: number | null;
  excerpt: string;
  score: number;
};
