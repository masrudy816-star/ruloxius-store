import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'ruloxius_faqs';
const fallback = [
  { id: 'safe', question: 'Apakah aman untuk semua keramik?', answer: 'Gunakan sesuai petunjuk, tes dahulu pada area kecil, dan hindari permukaan sensitif terhadap cairan pembersih.', position: 1, active: true },
  { id: 'use', question: 'Bagaimana cara pakainya?', answer: 'Gunakan sarung tangan, oles pada area berkerak, tunggu sebentar, sikat, lalu bilas sampai bersih.', position: 2, active: true },
  { id: 'process', question: 'Berapa lama pesanan diproses?', answer: 'Pesanan terverifikasi diproses 1–2 hari kerja sebelum diserahkan ke kurir.', position: 3, active: true },
];
async function admin() { const pin = process.env.ADMIN_PIN || (process.env.NODE_ENV !== 'production' ? '2026' : ''); return pin && (await cookies()).get('ruloxius_admin')?.value === createHash('sha256').update(`ruloxius:${pin}`).digest('hex'); }
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const valid = (body) => body.question?.trim().length >= 5 && body.answer?.trim().length >= 5;

export async function GET(request) {
  if (!URL || !KEY) return NextResponse.json({ faqs: fallback, mode: 'demo' });
  const showAll = new globalThis.URL(request.url).searchParams.get('admin') === '1' && await admin();
  const response = await fetch(`${URL}/rest/v1/${TABLE}?select=*&${showAll ? '' : 'active=eq.true&'}order=position.asc`, { headers, cache: 'no-store' });
  if (!response.ok) return NextResponse.json({ faqs: fallback, mode: 'fallback' });
  return NextResponse.json({ faqs: await response.json(), mode: 'supabase' });
}
export async function POST(request) {
  if (!await admin()) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  const body = await request.json(); if (!valid(body)) return NextResponse.json({ error: 'Pertanyaan dan jawaban wajib diisi.' }, { status: 400 });
  const response = await fetch(`${URL}/rest/v1/${TABLE}`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ question: body.question.trim(), answer: body.answer.trim(), position: Number(body.position || 0), active: body.active !== false }) });
  if (!response.ok) return NextResponse.json({ error: 'Gagal menambah FAQ' }, { status: 500 });
  return NextResponse.json({ faq: (await response.json())[0] }, { status: 201 });
}
export async function PUT(request) {
  if (!await admin()) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  const body = await request.json(); if (!body.id || !valid(body)) return NextResponse.json({ error: 'Data FAQ tidak valid.' }, { status: 400 });
  const response = await fetch(`${URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ question: body.question.trim(), answer: body.answer.trim(), position: Number(body.position || 0), active: body.active !== false, updated_at: new Date().toISOString() }) });
  if (!response.ok) return NextResponse.json({ error: 'Gagal menyimpan FAQ' }, { status: 500 });
  return NextResponse.json({ faq: (await response.json())[0] });
}
export async function DELETE(request) {
  if (!await admin()) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  const id = new globalThis.URL(request.url).searchParams.get('id'); if (!id) return NextResponse.json({ error: 'FAQ tidak ditemukan' }, { status: 400 });
  const response = await fetch(`${URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  return response.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Gagal menghapus FAQ' }, { status: 500 });
}
