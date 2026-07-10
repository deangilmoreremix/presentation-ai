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

export const Prisma = {
  DocumentType,
  UserRole,
} as const;

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
