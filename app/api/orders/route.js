import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isAdmin = async () => {
  const pin=process.env.ADMIN_PIN || (process.env.NODE_ENV !== 'production' ? '2026' : undefined);
  if(!pin) return false;
  const token=(await cookies()).get('ruloxius_admin')?.value;
  return token===createHash('sha256').update(`ruloxius:${pin}`).digest('hex');
};

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.customer_name || !body.phone || !body.address || !body.items?.length) return NextResponse.json({ error:'Data pesanan belum lengkap.' }, { status:400 });
    const order_number = `RLX-${Date.now().toString(36).toUpperCase()}`;
    const record = { order_number, customer_name:body.customer_name, phone:body.phone, address:body.address, city:body.city, postal_code:body.postal_code, notes:body.notes, payment_method:body.payment_method, payment_proof:body.payment_proof || null, items:body.items, subtotal:body.subtotal, total:body.total, status:'pending', source:body.source || 'website' };
    if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ order_number, mode:'demo' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, { method:'POST', headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}`, 'Content-Type':'application/json', Prefer:'return=representation' }, body:JSON.stringify(record), cache:'no-store' });
    if (!response.ok) throw new Error(await response.text());
    const [saved] = await response.json(); return NextResponse.json({ id:saved.id, order_number:saved.order_number, mode:'supabase' });
  } catch (error) { console.error('Order error', error); return NextResponse.json({ error:'Terjadi gangguan saat menyimpan pesanan.' }, { status:500 }); }
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error:'Tidak diizinkan' }, { status:401 });
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ orders:[], mode:'demo' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, { headers:{ apikey:SERVICE_KEY, Authorization:`Bearer ${SERVICE_KEY}` }, cache:'no-store' });
  if (!response.ok) return NextResponse.json({ error:'Gagal memuat order' },{status:500});
  return NextResponse.json({ orders:await response.json(), mode:'supabase' });
}

export async function PATCH(request) {
  if (!await isAdmin()) return NextResponse.json({ error:'Tidak diizinkan' }, { status:401 });
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ ok:true, mode:'demo' });
  const { id, status } = await request.json(); const allowed=['pending','paid','processing','shipped','completed','cancelled'];
  if (!id || !allowed.includes(status)) return NextResponse.json({error:'Status tidak valid'},{status:400});
  const response=await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({status})});
  return response.ok?NextResponse.json({ok:true}):NextResponse.json({error:'Gagal mengubah status'},{status:500});
}
