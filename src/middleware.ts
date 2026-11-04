import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC = ['/login', '/api/auth', '/manifest.json', '/sw.js'];
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-troque-em-producao');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();
  const token = req.cookies.get('estudaai_session')?.value;
  let ok = false;
  if (token) { try { await jwtVerify(token, key()); ok = true; } catch { /* sessão inválida */ } }
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
