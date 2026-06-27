"use server";
import "server-only";

import { auth } from "@/server/auth";
import { db } from "@/server/db";

const DocumentType = { PRESENTATION: "PRESENTATION" } as const;

export type PresentationDocument = Awaited<ReturnType<typeof db.baseDocument.findMany>>[number] & {
  presentation: unknown;
  favorites: { id: string }[];
};

const ITEMS_PER_PAGE = 10;

export async function fetchPresentations(page = 0) {
  const session = await auth();
  const userId = session!.user.id;

  const skip = page * ITEMS_PER_PAGE;

  const items = await db.baseDocument.findMany({
    where: {
      userId,
      type: DocumentType.PRESENTATION,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: ITEMS_PER_PAGE,
    skip,
    include: {
      presentation: true,
      favorites: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  return {
    items,
    hasMore: items.length === ITEMS_PER_PAGE,
  };
}

export async function fetchPublicPresentations(page = 0) {
  const skip = page * ITEMS_PER_PAGE;

  const [items, total] = await Promise.all([
    db.baseDocument.findMany({
      where: {
        type: DocumentType.PRESENTATION,
        isPublic: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip,
      include: {
        presentation: true,
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    }),
    db.baseDocument.count({
      where: {
        type: DocumentType.PRESENTATION,
        isPublic: true,
      },
    }),
  ]);

  return {
    items,
    hasMore: skip + ITEMS_PER_PAGE < total,
  };
}

export async function fetchUserPresentations(userId: string, page = 0) {
  const session = await auth();
  const currentUserId = session!.user.id;
  const skip = page * ITEMS_PER_PAGE;

  const [items, total] = await Promise.all([
    db.baseDocument.findMany({
      where: {
        userId,
        type: DocumentType.PRESENTATION,
        OR: [{ isPublic: true }, { userId: currentUserId }],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: ITEMS_PER_PAGE,
      skip,
      include: {
        presentation: true,
      },
    }),
    db.baseDocument.count({
      where: {
        userId,
        type: DocumentType.PRESENTATION,
        OR: [{ isPublic: true }, { userId: currentUserId }],
      },
    }),
  ]);

  return {
    items,
    hasMore: skip + ITEMS_PER_PAGE < total,
  };
}
