# Object Storage Setup

Uploads and downloads transfer **directly between the browser and object
storage** using presigned URLs (S3 multipart upload for uploads, presigned GET
for downloads). File bytes never pass through the backend — it only issues
presigned URLs and writes metadata — which keeps the app stateless and
horizontally scalable.

For this to work, the storage **bucket** must allow the frontend origin via
CORS. This is separate from the backend's own CORS configuration.

## Local development (MinIO)

`docker-compose.yml` sets `MINIO_API_CORS_ALLOW_ORIGIN` so the browser can
PUT/GET directly against MinIO. Nothing else to do — just `docker compose up`.

## Production (Cloudflare R2 / Backblaze B2 / S3)

Apply a CORS policy to the bucket allowing your deployed frontend origin:

```json
[
  {
    "AllowedOrigins": ["https://your-frontend-domain"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- **R2:** Dashboard -> your bucket -> Settings -> CORS Policy -> paste the JSON.
- **B2 / S3:** set bucket CORS via the console or `aws s3api put-bucket-cors`.

`ExposeHeaders: ETag` is optional (the backend reads part ETags server-side via
ListParts), but harmless to include.

## Presigned URL lifetime

Controlled by `storage.presign-ttl-minutes` (env `PRESIGN_TTL`, default 360).
