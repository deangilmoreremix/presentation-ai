// Stub Prisma client - replaces real @prisma/client since we use Supabase
// Re-exports types and enums that the codebase expects

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

export type InputJsonValue = JsonValue;

export enum DocumentType {
  PRESENTATION = "PRESENTATION",
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

// Minimal Prisma namespace for code that references Prisma.X
export const Prisma = {
  DocumentType,
  UserRole,
} as const;

// Type namespace for Prisma generic types like Prisma.BaseDocumentGetPayload
export namespace Prisma {
  export type BaseDocumentGetPayload<T extends object> = T & {
    id: string;
    title: string;
    content: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    presentation?: {
      id: string;
      title: string;
      theme: string;
      language?: string;
      slides?: unknown[];
      outline?: unknown[];
    };
    favorites?: { id: string }[];
    isPublic?: boolean;
    type?: string;
    thumbnailUrl?: string;
  };
}
