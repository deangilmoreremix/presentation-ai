import { NextResponse } from "next/server";

import {
  AssetRequestError,
  deleteAsset,
  type UploadedAsset,
  uploadAsset,
} from "@/lib/supabase/storage-server";

export const runtime = "nodejs";

/**
 * POST /api/assets/upload
 *
 * multipart/form-data with:
 *   - `file`   : the binary (required)
 *   - `bucket` : "presentation-images" | "user-assets" (required)
 *   - `prefix` : folder under `users/{userId}/` (optional, defaults to "files")
 *
 * 200 -> `{ path, publicUrl }`
 * 4xx -> `{ error }` for a rejected request (bad bucket/prefix/type/size)
 * 5xx -> `{ error }` when storage is unavailable
 *
 * The owning user id comes from the Clerk session, never the request body, so
 * a caller cannot write into another user's folder.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const result = await uploadAsset(formData);
    return NextResponse.json<UploadedAsset>(result);
  } catch (error) {
    if (error instanceof AssetRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Asset upload route failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

/**
 * DELETE /api/assets/upload
 *
 * Body: `{ bucket, path }`. The server rejects paths outside the caller's own
 * `users/{userId}/` folder.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      bucket?: unknown;
      path?: unknown;
    };
    await deleteAsset({ bucket: body?.bucket, path: body?.path });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AssetRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Asset delete route failed", error);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
