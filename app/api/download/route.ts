import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL', { status: 400 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return new NextResponse('Failed to fetch resource', { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', 'attachment');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'no-store, max-age=0');

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Download proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
