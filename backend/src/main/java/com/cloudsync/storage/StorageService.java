package com.cloudsync.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CompletedPart;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.UploadPartRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

/**
 * All S3-compatible object-storage operations live here. File bytes never flow
 * through the app: uploads use presigned multipart-part URLs, downloads use
 * presigned GET URLs, and assembly happens server-side via CompleteMultipartUpload.
 */
@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Client s3;
    private final S3Presigner presigner;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${storage.presign-ttl-minutes:360}")
    private long presignTtlMinutes;

    private Duration ttl() {
        return Duration.ofMinutes(presignTtlMinutes);
    }

    // ── Multipart upload ───────────────────────────────────────────────────────

    public String createMultipartUpload(String key, String contentType) {
        return s3.createMultipartUpload(b -> b.bucket(bucket).key(key).contentType(contentType))
                .uploadId();
    }

    /** Presigned URL the browser PUTs a single part to (no auth header needed). */
    public String presignUploadPart(String key, String uploadId, int partNumber) {
        UploadPartRequest part = UploadPartRequest.builder()
                .bucket(bucket).key(key).uploadId(uploadId).partNumber(partNumber)
                .build();
        UploadPartPresignRequest presign = UploadPartPresignRequest.builder()
                .signatureDuration(ttl())
                .uploadPartRequest(part)
                .build();
        return presigner.presignUploadPart(presign).url().toString();
    }

    /**
     * Reads the uploaded parts (with their ETags) straight from storage so the
     * browser never has to echo ETags back — avoids the CORS expose-header gotcha.
     * Parts come back ascending by part number. (Single page = up to 1000 parts;
     * at the 5 MB part size that covers ~5 GB, well above the app's file cap.)
     */
    public List<CompletedPart> listParts(String key, String uploadId) {
        return s3.listParts(b -> b.bucket(bucket).key(key).uploadId(uploadId))
                .parts().stream()
                .map(p -> CompletedPart.builder().partNumber(p.partNumber()).eTag(p.eTag()).build())
                .toList();
    }

    public void completeMultipartUpload(String key, String uploadId, List<CompletedPart> parts) {
        s3.completeMultipartUpload(b -> b.bucket(bucket).key(key)
                .uploadId(uploadId)
                .multipartUpload(mp -> mp.parts(parts)));
    }

    public void abortMultipartUpload(String key, String uploadId) {
        s3.abortMultipartUpload(b -> b.bucket(bucket).key(key).uploadId(uploadId));
    }

    public long headObjectSize(String key) {
        return s3.headObject(b -> b.bucket(bucket).key(key)).contentLength();
    }

    public void deleteObject(String key) {
        s3.deleteObject(b -> b.bucket(bucket).key(key));
    }

    // ── Download ─────────────────────────────────────────────────────────────────

    /** Short-TTL presigned GET that downloads as an attachment with the right name. */
    public String presignGet(String key, String fileName, String contentType) {
        String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = "attachment; filename*=UTF-8''" + encoded;
        GetObjectRequest get = GetObjectRequest.builder()
                .bucket(bucket).key(key)
                .responseContentDisposition(disposition)
                .responseContentType(contentType)
                .build();
        GetObjectPresignRequest presign = GetObjectPresignRequest.builder()
                .signatureDuration(ttl())
                .getObjectRequest(get)
                .build();
        return presigner.presignGetObject(presign).url().toString();
    }
}
