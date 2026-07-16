import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  index,
  customType,
} from 'drizzle-orm/pg-core';

/** voyage/voyage-4-lite → 1024 dimensions */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1024)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    // pgvector may return "{1,2,...}" or "[1,2,...]"
    const normalized = value.replace(/^\{/, '[').replace(/\}$/, ']');
    return JSON.parse(normalized);
  },
});

const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
  toDriver(value: string): string {
    return value;
  },
  fromDriver(value: string): string {
    return value;
  },
});

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    storagePath: text('storage_path').notNull(),
    status: text('status').notNull().default('pending'),
    // pending | processing | ready | failed
    errorMessage: text('error_message'),
    pageCount: integer('page_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_documents_collection').on(table.collectionId),
    index('idx_documents_status').on(table.status),
  ],
);

export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    contextWindow: text('context_window').notNull(),
    page: integer('page'),
    chunkIndex: integer('chunk_index').notNull(),
    embedding: vector('embedding'),
    searchVector: tsvector('search_vector'),
    metadata: text('metadata'), // JSON string for simplicity
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_chunks_document').on(table.documentId),
    index('idx_chunks_collection').on(table.collectionId),
  ],
);

export type Collection = typeof collections.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
