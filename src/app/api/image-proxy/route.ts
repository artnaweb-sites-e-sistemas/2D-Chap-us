import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
    'https://firebasestorage.googleapis.com',
    'https://storage.googleapis.com',
    'https://storage.cloud.google.com',
];

function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        const origin = `${parsed.protocol}//${parsed.host}`;
        return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url');
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 });
        }
        if (!isAllowedUrl(url)) {
            return NextResponse.json({ error: 'URL não permitida' }, { status: 403 });
        }

        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) {
            return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 });
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const buffer = await res.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Erro no image-proxy:', error);
        return NextResponse.json({ error: 'Erro ao carregar imagem' }, { status: 500 });
    }
}
