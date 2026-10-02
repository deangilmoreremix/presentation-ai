import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const utapi = new UTApi();

/**
 * Every FileRoute requires a signed-in Clerk user.
 *
 * `src/proxy.ts` treats any route not on `isPublicRoute` as needing a session
 * and `auth()` is resolvable in the route handler because the Clerk middleware
 * matcher covers `/(api|trpc)(.*)`. Uploading used to be explicitly open
 * (`userId: "anonymous"`), which let any unauthenticated caller push files.
 */
async function requireSignedInUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new UploadThingError("Unauthorized");
  }

  // Whatever is returned here is accessible in onUploadComplete as `metadata`.
  return { userId };
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async () => requireSignedInUser())
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata.userId);

      console.log("file url", file.url);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
  editorUploader: f({
    image: { maxFileSize: "4MB" },
    pdf: { maxFileSize: "16MB" },
    text: { maxFileSize: "16MB" },
    video: { maxFileSize: "64MB" },
  })
    .middleware(async () => requireSignedInUser())
    .onUploadComplete(async ({ metadata, file }) => {
      // Simply return the file URL and name
      return {
        key: file.key,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.ufsUrl,
        uploadedBy: metadata.userId,
      };
    }),
  fontUploader: f({
    image: { maxFileSize: "4MB" },
    text: { maxFileSize: "2MB" },
  })
    .middleware(async () => requireSignedInUser())
    .onUploadComplete(async ({ metadata, file }) => {
      const familyName = file.name.replace(/\.[^.]+$/, "");
      return { familyName, uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
