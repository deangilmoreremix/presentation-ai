import { NextResponse } from 'next/server';
import { env } from '@/env';

export async function GET(): Promise<NextResponse> {
  const baseUrl = env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseUrl}/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        {
          available: false,
          error: 'LM Studio server not responding',
          models: [],
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const models = data.data || [];

    return NextResponse.json({
      available: true,
      baseUrl,
      models: models.map((m: { id: string; name?: string; object?: string }) => ({
        id: m.id,
        name: m.name || m.id,
        object: m.object,
      })),
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
      models: [],
    });
  }
}
