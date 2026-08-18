<<<<<<< ours
export { DocumentType, Prisma } from "@prisma/client";
=======
// Prisma removed - using Supabase tech stack.
// This file provides minimal type stubs so merged upstream code compiles.
// All real DB operations go through Supabase directly.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type InputJsonValue = JsonValue;
export type InputJsonObject = { [Key in string]?: InputJsonValue };
export interface InputJsonArray extends Array<InputJsonValue> {}

export enum DocumentType {
  NOTE = "NOTE",
  DOCUMENT = "DOCUMENT",
  DRAWING = "DRAWING",
  DESIGN = "DESIGN",
  STICKY_NOTES = "STICKY_NOTES",
  MIND_MAP = "MIND_MAP",
  RESEARCH_PAPER = "RESEARCH_PAPER",
  FLIPBOOK = "FLIPBOOK",
  PRESENTATION = "PRESENTATION",
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export const Prisma = {
  DocumentType,
  UserRole,
} as const;
>>>>>>> theirs
