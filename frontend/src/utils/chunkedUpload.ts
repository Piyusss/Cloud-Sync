import { chunkApi } from '../api';
import { uploadPart } from '../api/transfer';
import type { FileItem } from '../types';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per part (S3 multipart minimum)
const PARALLEL = 3;                         // upload 3 parts at a time
const MAX_RETRIES = 2;                      // retry a failed part up to 2 extra times

// Files larger than this skip client-side hashing (would need too much RAM)
const HASH_SIZE_LIMIT = 500 * 1024 * 1024; // 500 MB

// ── SHA-256 hash ─────────────────────────────────────────────────────────────

async function sha256hex(file: File): Promise<string | null> {
  if (file.size > HASH_SIZE_LIMIT) return null;
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function isCancelled(err: unknown): boolean {
  return (
    (err as { name?: string })?.name === 'CanceledError' ||
    (err as { code?: string })?.code === 'ERR_CANCELED' ||
    (err as { message?: string })?.message === 'canceled'
  );
}

async function uploadPartWithRetry(
  url: string,
  body: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number) => void
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await uploadPart(url, body, signal, onProgress);
      return;
    } catch (err) {
      if (isCancelled(err)) throw err;
      if (attempt === MAX_RETRIES) throw err;
      onProgress(0); // reset this part's contribution before retrying
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Upload a file using S3 multipart with presigned part URLs and SHA-256 dedup.
 * Parts are PUT directly to object storage — the bytes never touch the app.
 *
 * onProgress values:
 *   -1 → currently hashing the file
 *    0-99 → uploading parts
 *   100 → done
 */
export async function chunkedUpload(
  file: File,
  folderId: string | undefined,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<FileItem> {
  // 1 ── Compute SHA-256 (signals hashing state via -1) ─────────────────────
  onProgress(-1);
  const hash = await sha256hex(file);
  onProgress(0);

  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  // 2 ── Initialise: dedup check, or get presigned part URLs ─────────────────
  const { data: initData } = await chunkApi.init(
    {
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      contentType: file.type || 'application/octet-stream',
      folderId,
      hash,
    },
    signal
  );

  if (initData.duplicate && initData.fileItem) {
    // Server already has this exact content — no upload needed
    onProgress(100);
    return initData.fileItem;
  }

  const uploadId = initData.uploadId!;
  const parts = initData.parts ?? [];

  // Track per-part uploaded bytes so aggregate progress stays accurate across
  // the parallel batches.
  const partLoaded = new Array(parts.length).fill(0);
  const reportProgress = () => {
    const loaded = partLoaded.reduce((a, b) => a + b, 0);
    onProgress(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  // 3 ── PUT parts directly to storage, in parallel batches ──────────────────
  for (let i = 0; i < parts.length; i += PARALLEL) {
    if (signal.aborted) {
      await chunkApi.cancel(uploadId).catch(() => {});
      const err = new Error('Upload cancelled');
      (err as unknown as { code: string }).code = 'ERR_CANCELED';
      throw err;
    }

    const batch = parts.slice(i, i + PARALLEL).map((part) => {
      const idx = part.partNumber - 1;
      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      return uploadPartWithRetry(part.url, blob, signal, (loaded) => {
        partLoaded[idx] = loaded;
        reportProgress();
      });
    });

    try {
      await Promise.all(batch);
    } catch (err) {
      if (isCancelled(err)) await chunkApi.cancel(uploadId).catch(() => {});
      throw err;
    }
  }

  // 4 ── Finalise — server assembles the parts and writes metadata ───────────
  const { data: fileItem } = await chunkApi.complete(uploadId, signal);
  onProgress(100);
  return fileItem;
}
