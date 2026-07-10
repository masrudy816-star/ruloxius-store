import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const digest = value => createHash('sha256').update(value).digest('hex');

export async function POST(request) {
  const { pin } = await request.json();
  const expected = process.env.ADMIN_PIN || (process.env.NODE_ENV !== 'production' ? '2026' : undefined);
  if (!expected || !pin) return NextResponse.json({ error:'Admin belum dikonfigurasi.' }, { status:503 });
  const inputHash = Buffer.from(digest(String(pin)));
  const expectedHash = Buffer.from(digest(expected));
  if (!timingSafeEqual(inputHash, expectedHash)) return NextResponse.json({ error:'PIN tidak sesuai.' }, { status:401 });
  const response = NextResponse.json({ ok:true });
  response.cookies.set('ruloxius_admin', digest(`ruloxius:${expected}`), { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', path:'/', maxAge:60*60*8 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok:true });
  response.cookies.set('ruloxius_admin','',{ httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', path:'/', maxAge:0 });
  return response;
}
