import { NextResponse } from 'next/server';
import { cols, oid } from '@/lib/db';

/** Recortes do caderno guardados no MongoDB. O id muda a cada reprocessamento, então o cache pode ser eterno. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = oid((await params).id);
  const img = id && (await (await cols()).images.findOne({ _id: id }));
  if (!img) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return new NextResponse(new Uint8Array(img.data.buffer), {
    headers: { 'content-type': img.mime, 'cache-control': 'private, max-age=31536000, immutable' },
  });
}
