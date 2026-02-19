import { generateOpenApiDocument } from '@flowershow/api-contract';
import { NextResponse } from 'next/server';

let cached: string | null = null;

/**
 * GET /api/docs/openapi.json
 * Serves the OpenAPI 3.1 spec as JSON.
 */
export async function GET() {
  if (!cached) {
    cached = JSON.stringify(generateOpenApiDocument());
  }

  return new NextResponse(cached, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
