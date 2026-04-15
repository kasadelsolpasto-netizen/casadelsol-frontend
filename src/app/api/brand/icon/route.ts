import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/settings/brand`, {
      next: { revalidate: 60 } // Cachear en Vercel por 60 segs para no matar al DB
    });

    if (!res.ok) {
      return new NextResponse('Not found', { status: 404 });
    }

    const data = await res.json();
    if (!data || !data.logoBase64) {
      return new NextResponse('Icon not configured', { status: 404 });
    }

    // Extract mime type and base64 data
    const matches = data.logoBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new NextResponse('Invalid image data', { status: 500 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching brand icon:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
