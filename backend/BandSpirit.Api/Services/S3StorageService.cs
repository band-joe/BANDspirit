using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Util;

namespace BandSpirit.Api.Services;

/// <summary>
/// Dienst für den Zugriff auf S3-kompatiblen Objektspeicher
/// (Upload, Löschen, Presigned URLs). Unterstützt AWS S3 und MinIO.
/// </summary>
public class S3StorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly IConfiguration _config;
    private readonly ILogger<S3StorageService> _logger;

    public S3StorageService(IAmazonS3 s3Client, IConfiguration config, ILogger<S3StorageService> logger)
    {
        _s3Client = s3Client;
        _config = config;
        _logger = logger;
    }

    private string BucketName => _config["S3:BucketName"] ?? string.Empty;
    private string FolderPrefix => _config["S3:FolderPrefix"] ?? "bandspirit";

    /// <summary>
    /// Stellt sicher, dass der konfigurierte Bucket existiert. MinIO (und S3)
    /// legen Buckets bei PutObject NICHT automatisch an – fehlt der Bucket,
    /// schlägt jeder Upload mit "NoSuchBucket" fehl. Dieser Aufruf ist idempotent.
    /// </summary>
    private async Task EnsureBucketAsync()
    {
        if (string.IsNullOrWhiteSpace(BucketName))
        {
            throw new InvalidOperationException(
                "S3:BucketName ist nicht konfiguriert – Upload nicht möglich.");
        }

        var existiert = await AmazonS3Util.DoesS3BucketExistV2Async(_s3Client, BucketName);
        if (existiert)
        {
            return;
        }

        try
        {
            await _s3Client.PutBucketAsync(new PutBucketRequest
            {
                BucketName = BucketName,
                UseClientRegion = true
            });
            _logger.LogInformation("S3-Bucket '{Bucket}' wurde automatisch angelegt.", BucketName);
        }
        catch (BucketAlreadyOwnedByYouException)
        {
            // Nebenläufig bereits angelegt – kein Problem.
        }
        catch (AmazonS3Exception ex) when (ex.ErrorCode == "BucketAlreadyOwnedByYou"
                                          || ex.ErrorCode == "BucketAlreadyExists")
        {
            // Bereits vorhanden – kein Problem.
        }
    }

    /// <summary>Lädt einen Stream nach S3 hoch und liefert den öffentlichen Schlüssel.</summary>
    public async Task<string> UploadAsync(Stream inhalt, string dateiname, string contentType)
    {
        await EnsureBucketAsync();

        var key = $"{FolderPrefix}/{Guid.NewGuid():N}-{dateiname}";
        var request = new PutObjectRequest
        {
            BucketName = BucketName,
            Key = key,
            InputStream = inhalt,
            ContentType = contentType
        };
        await _s3Client.PutObjectAsync(request);
        _logger.LogInformation("Datei nach S3 hochgeladen: {Key}", key);
        return key;
    }

    /// <summary>
    /// Lädt ein Objekt aus S3 herunter und liefert dessen Inhalt als Byte-Array
    /// sowie den Content-Type. Wird verwendet, um Bilder über die API auszuliefern
    /// (der Browser kann MinIO nicht direkt erreichen, da der Speicher privat und
    /// nur im internen Docker-Netz erreichbar ist).
    /// </summary>
    public async Task<(byte[] Inhalt, string ContentType)> DownloadAsync(string key)
    {
        using var response = await _s3Client.GetObjectAsync(new GetObjectRequest
        {
            BucketName = BucketName,
            Key = key
        });
        using var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms);
        var contentType = string.IsNullOrWhiteSpace(response.Headers.ContentType)
            ? "application/octet-stream"
            : response.Headers.ContentType;
        return (ms.ToArray(), contentType);
    }

    /// <summary>Löscht ein Objekt aus S3.</summary>
    public async Task DeleteAsync(string key)
    {
        await _s3Client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = BucketName,
            Key = key
        });
        _logger.LogInformation("Datei aus S3 gelöscht: {Key}", key);
    }

    /// <summary>Erstellt eine Presigned-URL für den Upload (gültig 15 Minuten).</summary>
    public string CreatePresignedUploadUrl(string dateiname, string contentType)
    {
        var key = $"{FolderPrefix}/{Guid.NewGuid():N}-{dateiname}";
        var expiryMinutes = _config.GetValue<int>("S3:PresignedUrlExpiryMinutes", 15);
        var request = new GetPreSignedUrlRequest
        {
            BucketName = BucketName,
            Key = key,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            ContentType = contentType
        };
        return _s3Client.GetPreSignedURL(request);
    }
}
