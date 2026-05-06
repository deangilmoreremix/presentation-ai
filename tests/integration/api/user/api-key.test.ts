import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { appLogger } from "@/lib/observability/logger";
import { decryptApiKey, encryptApiKey, validateKeyFormat } from "@/lib/crypto/key-encryption";
import OpenAI from "openai";
import { GET, POST, DELETE } from "../../../../src/app/api/user/api-key/route";
import { POST as validatePOST } from "../../../../src/app/api/user/api-key/validate/route";

// Mock dependencies
jest.mock("@/server/auth");
jest.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/crypto/key-encryption", () => ({
  decryptApiKey: jest.fn(),
  encryptApiKey: jest.fn(),
  validateKeyFormat: jest.fn(),
}));
jest.mock("openai");
jest.mock("@/lib/observability/logger", () => ({
  appLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuth = jest.mocked(auth);
const mockDb = require("@/server/db").db;
const mockDecryptApiKey = jest.mocked(decryptApiKey);
const mockEncryptApiKey = jest.mocked(encryptApiKey);
const mockValidateKeyFormat = jest.mocked(validateKeyFormat);
const mockOpenAIConstructor = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockLogger = jest.mocked(appLogger);

const mockUserId = "user-123";
const baseSession = {
  user: { id: mockUserId, email: "test@example.com" },
  expires: new Date().toISOString(),
};

describe("GET /api/user/api-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.user.findUnique.mockResolvedValue({} as any);
    mockDb.user.update.mockResolvedValue({} as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const response = await GET();
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns masked key and storage=server when key exists", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.findUnique.mockResolvedValue({
      openaiApiKeyEncrypted: "encrypted-key",
      openaiApiKeyIv: "test-iv",
    } as any);
    mockDecryptApiKey.mockResolvedValue("sk-proj-1234567890abcdefghijklmnopqrstuvwxyzABCD");

    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.storage).toBe("server");
    expect(json.maskedKey).toBe("sk-...ABCD");
    expect(mockDecryptApiKey).toHaveBeenCalledWith("encrypted-key", mockUserId, "test-iv");
  });

  it("returns storage=none and null maskedKey when no key stored", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.findUnique.mockResolvedValue({
      openaiApiKeyEncrypted: null,
      openaiApiKeyIv: null,
    } as any);

    const response = await GET();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.storage).toBe("none");
    expect(json.maskedKey).toBeNull();
  });

  it("handles decryption failure gracefully", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.findUnique.mockResolvedValue({
      openaiApiKeyEncrypted: "bad-encrypted",
      openaiApiKeyIv: "bad-iv",
    } as any);
    mockDecryptApiKey.mockRejectedValue(new Error("Decryption failed"));

    const response = await GET();
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.storage).toBe("none");
    expect(json.maskedKey).toBeNull();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe("POST /api/user/api-key", () => {
  const createRequest = (body: { key: string; storage: "client" | "server" }) => {
    return new NextRequest("http://localhost/api/user/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateKeyFormat.mockReturnValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const request = createRequest({ key: "sk-validkey1234567890abcdefghijklmnop", storage: "server" });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when key is missing", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    const request = createRequest({ key: "", storage: "server" });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Key required");
  });

  it("returns 400 when key format is invalid", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockValidateKeyFormat.mockReturnValue(false);
    const request = createRequest({ key: "invalid-key", storage: "server" });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid API key format");
  });

  it("saves encrypted key to DB when storage=server", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockEncryptApiKey.mockResolvedValue({ encrypted: "encrypted-value", iv: "test-iv" });
    mockDb.user.update.mockResolvedValue({} as any);
    const request = createRequest({ key: "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz", storage: "server" });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockEncryptApiKey).toHaveBeenCalledWith(
      "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz",
      mockUserId
    );
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { openaiApiKeyEncrypted: "encrypted-value", openaiApiKeyIv: "test-iv" },
    });
    expect(mockLogger.info).toHaveBeenCalledWith("API key encrypted and saved", { userId: mockUserId });
  });

  it("clears server key when storage=client", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.update.mockResolvedValue({} as any);
    const request = createRequest({ key: "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz", storage: "client" });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { openaiApiKeyEncrypted: null, openaiApiKeyIv: null },
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Client-only storage selected, server copy cleared",
      { userId: mockUserId }
    );
  });

  it("handles server errors gracefully", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockEncryptApiKey.mockRejectedValue(new Error("Encryption failed"));
    const request = createRequest({ key: "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz", storage: "server" });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal server error");
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe("DELETE /api/user/api-key", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const response = await DELETE();
    expect(response.status).toBe(401);
  });

  it("deletes the API key from DB", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.update.mockResolvedValue({} as any);

    const response = await DELETE();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { openaiApiKeyEncrypted: null, openaiApiKeyIv: null },
    });
    expect(mockLogger.info).toHaveBeenCalledWith("API key deleted", { userId: mockUserId });
  });

  it("handles server errors gracefully", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockDb.user.update.mockRejectedValue(new Error("DB error"));

    const response = await DELETE();
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal server error");
  });
});

describe("POST /api/user/api-key/validate", () => {
  const createValidateRequest = (key: string) => {
    return new NextRequest("http://localhost/api/user/api-key/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateKeyFormat.mockReturnValue(true);
    mockOpenAIConstructor.mockImplementation(() => ({
      models: { list: jest.fn().mockResolvedValue({}) },
    } as any));
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null as any);
    const request = createValidateRequest("sk-validkey1234567890abcdefghijklmnop");

    const response = await validatePOST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid key format", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockValidateKeyFormat.mockReturnValue(false);
    const request = createValidateRequest("invalid-key");

    const response = await validatePOST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("Invalid format");
  });

  it("returns valid:true when OpenAI API call succeeds", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    const request = createValidateRequest("sk-proj-1234567890abcdefghijklmnopqrstuvwxyz");

    const response = await validatePOST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.valid).toBe(true);
  });

  it("returns valid:false when OpenAI API call fails", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    const errorMessage = "Invalid API key";
    mockOpenAIConstructor.mockImplementation(() => ({
      models: { list: jest.fn().mockRejectedValue(new Error(errorMessage)) },
    } as any));
    const request = createValidateRequest("sk-invalidkey1234567890abcdefghijklmnop");

    const response = await validatePOST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe(errorMessage);
  });

  it("handles unexpected errors", async () => {
    mockAuth.mockResolvedValue(baseSession as any);
    mockValidateKeyFormat.mockImplementation(() => { throw new Error("Unexpected"); });
    const request = createValidateRequest("sk-validkey1234567890abcdefghijklmnop");

    const response = await validatePOST(request);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal server error");
  });
});
