"use client";

import { useCallback, useState } from "react";

import { uploadUserAssetClient } from "@/lib/supabase/storage";

/**
 * `uploadAsset` forwards to a Server Action that resolves the owning user from
 * the Clerk session, so no user id is threaded through the client.
 */
export function useAssetUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadAsset = useCallback(
    async (file: File, options: {
      bucket: string;
      prefix?: string;
    }): Promise<{ path: string; publicUrl: string }> => {
      setIsUploading(true);

      try {
        return await uploadUserAssetClient({
          bucket: options.bucket,
          file,
          prefix: options.prefix,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { uploadAsset, isUploading };
}
