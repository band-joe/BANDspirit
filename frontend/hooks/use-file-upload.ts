// hooks/use-file-upload.ts
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient }  from '@/lib/api-client';

interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey:   string;
}

/**
 * Datei-Upload über S3 Presigned URL.
 * Ablauf:
 *   1. POST an uploadEndpoint → C# Backend liefert { uploadUrl, fileKey }
 *   2. PUT direkt an S3 (kein Umweg über Backend)
 *   3. fileKey zurückgeben (für anschliessenden PATCH an OData-Entität)
 */
export function useFileUpload(uploadEndpoint: string) {
  const { data: session } = useSession();
  const [progress, setProgress]   = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError]          = useState<string | null>(null);

  async function upload(file: File): Promise<string> {
    setIsUploading(true);
    setError(null);
    try {
      // 1. Presigned URL vom Backend holen
      const { uploadUrl, fileKey } = await apiClient.post<PresignedUploadResponse>(
        uploadEndpoint,
        { fileName: file.name, contentType: file.type },
        session
      );

      // 2. Datei direkt an S3 hochladen
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error('S3 Upload fehlgeschlagen')));
        xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      return fileKey;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return { upload, progress, isUploading, error };
}
