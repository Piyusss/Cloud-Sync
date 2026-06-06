import { chunkApi } from '../api';
import type { FileItem } from '../types';

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
const PARALLEL = 3;                         // upload 3 chunks at a time
const MAX_RETRIES = 2;                      // retry a failed chunk up to 2 extra times

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

async function uploadChunkWithRetry(
  uploadId: string,
  index: number,
  blob: Blob,
  fileName: string,
  signal: AbortSignal
): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fd = new FormData();
      fd.append('chunk', blob, fileName);
      fd.append('chunkIndex', String(index));
      await chunkApi.uploadChunk(uploadId, fd, signal);
      return;
    } catch (err) {
      if (isCancelled(err)) throw err;
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Upload a file using the chunked upload protocol with SHA-256 deduplication.
 *
 * onProgress values:
 *   -1 → currently hashing the file
 *    0-99 → uploading chunks
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

  // 2 ── Initialise session (early dedup check happens here) ─────────────────
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
    // Server already has this exact file — no upload needed
    onProgress(100);
    return initData.fileItem;
  }

  const uploadId = initData.uploadId!;
  let uploadedBytes = 0;

  // 3 ── Upload chunks in parallel batches ───────────────────────────────────
  for (let i = 0; i < totalChunks; i += PARALLEL) {
    if (signal.aborted) {
      await chunkApi.cancel(uploadId).catch(() => {});
      const err = new Error('Upload cancelled');
      (err as unknown as { code: string }).code = 'ERR_CANCELED';
      throw err;
    }

    const batchEnd = Math.min(i + PARALLEL, totalChunks);
    const batch = Array.from({ length: batchEnd - i }, (_, j) => {
      const idx = i + j;
      const start = idx * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);
      const chunkBytes = end - start;

      return uploadChunkWithRetry(uploadId, idx, blob, file.name, signal).then(() => {
        uploadedBytes += chunkBytes;
        onProgress(Math.min(99, Math.round((uploadedBytes / file.size) * 100)));
      });
    });

    try {
      await Promise.all(batch);
    } catch (err) {
      if (isCancelled(err)) await chunkApi.cancel(uploadId).catch(() => {});
      throw err;
    }
  }

  // 4 ── Finalise ────────────────────────────────────────────────────────────
  const { data: fileItem } = await chunkApi.complete(uploadId, signal);
  onProgress(100);
  return fileItem;
}
