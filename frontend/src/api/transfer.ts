import axios from 'axios';

// A bare client for transferring bytes directly to object storage via presigned
// URLs. It must NOT carry the Clerk Authorization header (that would break the
// storage request signature), so it deliberately avoids the shared `api` instance
// and its auth interceptor.
const transfer = axios.create();

/** PUT one multipart part to its presigned URL, reporting bytes uploaded so far. */
export function uploadPart(
  url: string,
  body: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number) => void
) {
  return transfer.put(url, body, {
    signal,
    headers: { 'Content-Type': 'application/octet-stream' },
    onUploadProgress: (e) => onProgress(e.loaded),
  });
}
