// No-op database client - actual DB operations use Supabase
// This file exists to prevent import errors in codebase during build

// Generic stub types
type StubImage = {
  id: string;
  imageUrl: string;
  url: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  modelId?: string;
};

type StubUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role?: string;
  hasAccess?: boolean;
  openaiApiKeyEncrypted?: string | null;
  openaiApiKeyIv?: string | null;
};

type StubBaseDocument = {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  presentation?: StubPresentation;
  thumbnailUrl?: string;
  isPublic?: boolean;
  type?: string;
  prompt?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  customization?: Record<string, unknown>;
  language?: string;
  searchResults?: string | unknown[];
  favorites?: Array<{ id: string }>;
  user?: { name?: string; image?: string };
  documentType?: string;
};

type StubFontPair = {
  id: string;
  heading: string;
  body: string;
  headingUrl?: string;
  bodyUrl?: string;
  createdAt: Date;
  userId: string;
};

type StubPresentation = {
  id: string;
  title: string;
  theme: string;
  createdAt: Date;
  userId: string;
  content?: string;
  prompt?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  customization?: Record<string, unknown>;
  language?: string;
  searchResults?: string | unknown[];
};

type StubPresentationTheme = {
  id: string;
  name: string;
  theme: string;
  logoUrl?: string;
  themeData?: Record<string, unknown>;
  createdAt: Date;
  userId: string;
  isPublic?: boolean;
  isAdmin?: boolean;
  _count?: { presentationThemeLikes: number; favoritePresentationThemes: number };
  presentationThemeLikes?: Array<{ id: string }>;
  favoritePresentationThemes?: Array<{ id: string }>;
};

type StubPresentationThemeLike = {
  id: string;
  themeId: string;
  userId: string;
  createdAt: Date;
  _count?: { id: number };
};

type StubFavoritePresentationTheme = {
  id: string;
  themeId: string;
  userId: string;
  createdAt: Date;
  theme?: StubPresentationTheme & {
    _count?: { presentationThemeLikes: number; favoritePresentationThemes: number };
    presentationThemeLikes?: Array<{ id: string }>;
  };
};

// Generic stub function that accepts any args and returns appropriate type
const stubFn = <T>(defaultValue: T) => async (_args?: unknown) => defaultValue;

// $executeRaw needs to handle tagged template literal calls
const executeRawStub = async (strings: TemplateStringsArray, ...values: unknown[]) => 0;

export const db = {
  generatedImage: {
    create: stubFn<StubImage>({} as StubImage),
    findMany: stubFn<StubImage[]>([]),
  },
  user: {
    findUnique: stubFn<StubUser | null>(null),
    upsert: stubFn<StubUser | null>(null),
  },
  baseDocument: {
    create: stubFn<StubBaseDocument>({} as StubBaseDocument),
    findUnique: stubFn<StubBaseDocument | null>(null),
    update: stubFn<StubBaseDocument>({} as StubBaseDocument),
    deleteMany: stubFn<{ count: number }>({ count: 0 }),
    findMany: stubFn<StubBaseDocument[]>([]),
    findFirst: stubFn<StubBaseDocument | null>(null),
    updateMany: stubFn<{ count: number }>({ count: 0 }),
    count: stubFn<number>(0),
    $queryRaw: stubFn<StubBaseDocument[]>([]),
  },
  fontPair: {
    create: stubFn<StubFontPair>({} as StubFontPair),
    findUnique: stubFn<StubFontPair | null>(null),
    findMany: stubFn<StubFontPair[]>([]),
    delete: stubFn<{ count: number }>({ count: 0 }),
  },
  presentation: {
    findUnique: stubFn<StubPresentation | null>(null),
    findMany: stubFn<StubPresentation[]>([]),
  },
  presentationTheme: {
    create: stubFn<StubPresentationTheme>({} as StubPresentationTheme),
    findUnique: stubFn<StubPresentationTheme | null>(null),
    update: stubFn<StubPresentationTheme>({} as StubPresentationTheme),
    delete: stubFn<{ count: number }>({ count: 0 }),
    findMany: stubFn<StubPresentationTheme[]>([]),
  },
  presentationThemeLike: {
    findUnique: stubFn<StubPresentationThemeLike | null>(null),
    delete: stubFn<{ count: number }>({ count: 0 }),
    create: stubFn<StubPresentationThemeLike>({} as StubPresentationThemeLike),
    count: stubFn<number>(0),
    groupBy: stubFn<StubPresentationThemeLike[]>([]),
    findMany: stubFn<StubPresentationThemeLike[]>([]),
  },
  favoritePresentationTheme: {
    findUnique: stubFn<StubFavoritePresentationTheme | null>(null),
    delete: stubFn<{ count: number }>({ count: 0 }),
    create: stubFn<StubFavoritePresentationTheme>({} as StubFavoritePresentationTheme),
    findMany: stubFn<StubFavoritePresentationTheme[]>([]),
  },
  $transaction: async (fn: (() => Promise<unknown>) | (() => Promise<unknown>)[] | Promise<unknown>[]) => {
    if (Array.isArray(fn)) {
      return fn.map((f) => (typeof f === "function" ? f() : f));
    }
    return fn();
  },
  $executeRaw: executeRawStub,
};

// Silently fail in dev mode
if (process.env.NODE_ENV === "development") {
  console.warn("Prisma DB client is disabled - using Supabase for data persistence");
}