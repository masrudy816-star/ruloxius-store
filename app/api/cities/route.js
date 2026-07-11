import { NextResponse } from 'next/server';

const API_KEY = process.env.RAJAONGKIR_API_KEY;
const BASE_URL = 'https://rajaongkir.komerce.id/api/v1/destination/city';

export async function GET(request) {
  const provinceId = new URL(request.url).searchParams.get('province_id');

  if (!/^\d+$/.test(provinceId || '')) {
    return NextResponse.json({ error: 'province_id tidak valid' }, { status: 400 });
  }
  if (!API_KEY) {
    return NextResponse.json({ error: 'RAJAONGKIR_API_KEY belum tersedia' }, { status: 500 });
  }

  try {
    const response = await fetch(`${BASE_URL}/${provinceId}`, {
      headers: { key: API_KEY, Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Gagal mengambil kota', detail: result }, { status: response.status });
    }

    const cities = (result.data || []).map((item) => ({
      id: String(item.id),
      name: item.name,
      postalCode: item.zip_code && item.zip_code !== '0' ? String(item.zip_code) : '',
    }));

    return NextResponse.json({ cities });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil kota', detail: error.message }, { status: 500 });
  }
}
