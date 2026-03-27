import { NextResponse } from 'next/server';
import { env } from '@/env';

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        {
          available: false,
          error: 'Ollama server not responding',
          models: [],
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const models: OllamaModel[] = data.models || [];

    return NextResponse.json({
      available: true,
      baseUrl,
      models: models.map((m) => ({
        id: m.name,
        name: m.name,
        size: m.size,
        modified: m.modified_at,
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
