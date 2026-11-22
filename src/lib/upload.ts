import { useCallback, useState } from 'react';
import { createUploadUrl } from './api';
import { supabase } from './supabase';

/**
 * Replacement for Zite's useUpload(). Asks the server for a signed upload URL
 * (login required), then uploads the file straight to Supabase Storage.
 * Resolves to the public URL of the stored image.
 */
export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(async (file: File): Promise<{ url: string }> => {
    setIsUploading(true);
    try {
      const target = await createUploadUrl({ contentType: file.type, size: file.size });
      const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, { contentType: file.type });
      if (error) throw error;
      return { url: target.publicUrl };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading };
}
