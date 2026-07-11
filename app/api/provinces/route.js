import { NextResponse } from 'next/server';

const API_KEY = process.env.RAJAONGKIR_API_KEY;
const URL = 'https://rajaongkir.komerce.id/api/v1/destination/province';

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: 'RAJAONGKIR_API_KEY belum tersedia' }, { status: 500 });
  }

  try {
    const response = await fetch(URL, {
      headers: { key: API_KEY, Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Gagal mengambil provinsi', detail: result }, { status: response.status });
    }

    const provinces = (result.data || []).map((item) => ({
      id: String(item.id),
      name: item.name,
    }));

    return NextResponse.json({ provinces });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil provinsi', detail: error.message }, { status: 500 });
  }
}
