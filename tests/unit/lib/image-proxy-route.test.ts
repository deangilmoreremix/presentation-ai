import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/image-proxy/route";

function proxyRequest(target: string | null) {
  const url = new URL("http://localhost:3000/api/image-proxy");
  if (target !== null) {
    url.searchParams.set("url", target);
  }
  return new NextRequest(url);
}

async function statusFor(target: string | null): Promise<number> {
  const response = await GET(proxyRequest(target));
  return response.status;
}

describe("GET /api/image-proxy", () => {
  it("rejects a missing url parameter", async () => {
    expect(await statusFor(null)).toBe(400);
  });

  it("rejects non-http protocols", async () => {
    expect(await statusFor("file:///etc/passwd")).toBe(400);
    expect(await statusFor("ftp://example.com/a.png")).toBe(400);
    expect(await statusFor("gopher://example.com/a")).toBe(400);
  });

  it("blocks loopback addresses", async () => {
    expect(await statusFor("http://127.0.0.1:3000/a.png")).toBe(400);
    expect(await statusFor("http://127.5.5.5/a.png")).toBe(400);
    expect(await statusFor("http://[::1]/a.png")).toBe(400);
    expect(await statusFor("http://[::]/a.png")).toBe(400);
  });

  it("blocks IPv6 unique-local and link-local ranges", async () => {
    expect(await statusFor("http://[fd00::1]/a.png")).toBe(400);
    expect(await statusFor("http://[fe80::1]/a.png")).toBe(400);
  });

  it("blocks IPv4-mapped IPv6 loopback", async () => {
    expect(await statusFor("http://[::ffff:127.0.0.1]/a.png")).toBe(400);
  });

  it("blocks the cloud metadata endpoint", async () => {
    expect(await statusFor("http://169.254.169.254/latest/meta-data/")).toBe(400);
  });

  it("blocks RFC1918 and other non-public ranges", async () => {
    expect(await statusFor("http://10.0.0.5/a.png")).toBe(400);
    expect(await statusFor("http://172.16.0.1/a.png")).toBe(400);
    expect(await statusFor("http://192.168.1.1/a.png")).toBe(400);
    expect(await statusFor("http://100.64.0.1/a.png")).toBe(400);
    expect(await statusFor("http://0.0.0.0/a.png")).toBe(400);
  });

  it("blocks hostnames that resolve to a private address", async () => {
    // `localhost` resolves to 127.0.0.1, so the DNS result must be rejected
    // even though the hostname string itself looks harmless.
    expect(await statusFor("http://localhost:3000/a.png")).toBe(400);
  });
});