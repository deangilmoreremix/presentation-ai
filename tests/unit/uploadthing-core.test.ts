// @vitest-environment node
// `new UTApi()` refuses to run in a jsdom (browser-like) environment, and this
// module is server-only by design.
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn(async () => ({ userId: "user_1" as string | null }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

import { ourFileRouter } from "@/app/api/uploadthing/core";
import { requireUploadThingUser } from "@/app/api/uploadthing/lib";

const ROUTES = ["imageUploader", "editorUploader", "fontUploader"] as const;

// The middleware runs with the request context UploadThing passes in; these
// tests only care about the auth decision, so an empty context is enough.
const context = {} as never;

describe("UploadThing router auth", () => {
  beforeEach(() => {
    authMock.mockImplementation(async () => ({ userId: "user_1" }));
  });

  it.each(ROUTES)("%s rejects an unauthenticated caller", async (route) => {
    authMock.mockImplementation(async () => ({ userId: null }));

    await expect(ourFileRouter[route].middleware(context)).rejects.toThrow();
  });

  it.each(ROUTES)("%s returns the Clerk user id for a signed-in caller", async (route) => {
    const metadata = await ourFileRouter[route].middleware(context);

    expect(metadata).toEqual({ userId: "user_1" });
  });
});

describe("requireUploadThingUser", () => {
  it("throws when there is no session", async () => {
    authMock.mockImplementation(async () => ({ userId: null }));

    await expect(requireUploadThingUser()).rejects.toThrow("UNAUTHORIZED");
  });

  it("returns the user id when signed in", async () => {
    authMock.mockImplementation(async () => ({ userId: "user_1" }));

    await expect(requireUploadThingUser()).resolves.toEqual({ userId: "user_1" });
  });
});
