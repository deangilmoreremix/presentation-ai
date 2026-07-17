import "server-only";

import { createUploadthing } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

export const f = createUploadthing();
export const utapi = new UTApi();

export async function requireUploadThingUser(): Promise<{ userId: string }> {
  // No authentication required — uploads are open.
  return { userId: "anonymous" };
}

export async function requireAdminUploadThingUser(): Promise<{
  userId: string;
}> {
  // No authentication required — uploads are open.
  return { userId: "anonymous" };
}

function getUploadThingFileKeyFromUrl(url: string): string | null {
  const trimmedUrl = url.trim();

  if (trimmedUrl.length === 0) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const pathnameParts = parsedUrl.pathname.split("/").filter(Boolean);
    return pathnameParts.at(-1) ?? null;
  } catch {
    const pathnameParts = trimmedUrl.split("/").filter(Boolean);
    return pathnameParts.at(-1) ?? null;
  }
}

export async function deleteUploadThingFiles(
  fileKeys: string | string[],
): Promise<void> {
  const normalizedKeys = [
    ...new Set(
      (Array.isArray(fileKeys) ? fileKeys : [fileKeys])
        .map((fileKey) => fileKey.trim())
        .filter((fileKey) => fileKey.length > 0),
    ),
  ];

  if (normalizedKeys.length === 0) {
    return;
  }

  await utapi.deleteFiles(normalizedKeys);
}

export async function deleteUploadThingFilesByUrls(
  urls: string | string[],
): Promise<void> {
  const normalizedKeys = (Array.isArray(urls) ? urls : [urls])
    .map(getUploadThingFileKeyFromUrl)
    .filter((fileKey): fileKey is string => fileKey !== null);

  await deleteUploadThingFiles(normalizedKeys);
}
