"use client";

import { useCallback, useState } from "react";

import { useUser } from "@clerk/nextjs";
import { uploadUserAssetClient } from "@/lib/supabase/storage";

export function useAssetUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useUser();

  const uploadAsset = useCallback(
    async (file: File, options: {
      bucket: string;
      prefix?: string;
    }): Promise<{ path: string; publicUrl: string }> => {
      setIsUploading(true);

      try {
        return await uploadUserAssetClient({
          bucket: options.bucket,
          userId: user?.id ?? "00000000-0000-0000-0000-000000000000",
          file,
          prefix: options.prefix,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [user],
  );

  return { uploadAsset, isUploading };
}
