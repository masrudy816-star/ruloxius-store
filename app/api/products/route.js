import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PRODUCTS, PRODUCT_WEIGHTS } from "../../catalog";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLE = "ruloxius_products";

const validImage = (image) => typeof image === "string" && image.length > 0 && image.length <= 1500000;

const validateProduct = (body) => (
  typeof body.name === "string" && body.name.trim().length >= 2
  && typeof body.size === "string" && body.size.trim().length > 0
  && Number.isFinite(Number(body.price)) && Number(body.price) >= 0
  && Number.isInteger(Number(body.stock)) && Number(body.stock) >= 0
  && Number.isInteger(Number(body.weight)) && Number(body.weight) > 0
  && validImage(body.image)
);

const productRecord = (body) => ({
  name: body.name.trim(),
  size: body.size.trim(),
  description: body.detail?.trim() || "",
  price: Number(body.price),
  compare_at: Number(body.compareAt || body.price),
  saving: Number(body.saving || 0),
  unit: body.unit?.trim() || "",
  stock: Number(body.stock),
  weight: Number(body.weight),
  image_url: body.image,
  popular: Boolean(body.popular),
  active: body.active !== false,
});

const isAdmin = async () => {
  const pin =
    process.env.ADMIN_PIN ||
    (process.env.NODE_ENV !== "production" ? "2026" : undefined);

  if (!pin) return false;

  const hash = createHash("sha256")
    .update(`ruloxius:${pin}`)
    .digest("hex");

  return (await cookies()).get("ruloxius_admin")?.value === hash;
};


const mapProduct = (p) => ({
  id: p.id,
  name: p.name,
  size: p.size,
  detail: p.description || "",
  price: Number(p.price || 0),
  compareAt: Number(p.compare_at || p.price || 0),
  saving: Number(p.saving || 0),
  unit: p.unit || "",
  image: p.image_url || "",
  popular: Boolean(p.popular),
  active: p.active !== false,
  stock: Number(p.stock || 0),
  weight: Number(p.weight || PRODUCT_WEIGHTS[p.id] || 0),
});


export async function GET() {

  // fallback demo jika supabase belum aktif
  if (!URL || !KEY) {
    return NextResponse.json({
      products: PRODUCTS,
      mode: "demo",
    });
  }


  const response = await fetch(
    `${URL}/rest/v1/${TABLE}?select=*&active=eq.true&order=price.asc`,
    {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
      cache: "no-store",
    }
  );


  if (!response.ok) {
    const error = await response.text();

    return NextResponse.json(
      {
        error: "Gagal mengambil produk Supabase",
        detail: error,
      },
      {
        status: 500,
      }
    );
  }


  const data = await response.json();


  return NextResponse.json({
    products: data.map(mapProduct),
    mode: "supabase",
  });

}



export async function PUT(request) {

  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        error: "Tidak diizinkan",
      },
      {
        status: 401,
      }
    );
  }


  const body = await request.json();


  if (!body.id || !validateProduct(body)) {
    return NextResponse.json(
      {
        error: "Data produk tidak valid",
      },
      {
        status: 400,
      }
    );
  }



  if (!URL || !KEY) {
    return NextResponse.json({
      product: body,
      mode: "demo",
    });
  }



  const record = productRecord(body);



  const response = await fetch(
    `${URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(body.id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(record),
    }
  );



  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Gagal menyimpan produk",
      },
      {
        status: 500,
      }
    );
  }



  const result = await response.json();


  return NextResponse.json({
    product: mapProduct(result[0]),
    mode: "supabase",
  });

}

export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json();
  if (!validateProduct(body)) {
    return NextResponse.json(
      { error: "Lengkapi nama, ukuran, harga, stok, berat, dan foto produk." },
      { status: 400 }
    );
  }

  const slug = body.size.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produk";
  const product = { id: `${slug}-${Date.now()}`, ...body };
  if (!URL || !KEY) return NextResponse.json({ product, mode: "demo" }, { status: 201 });

  const response = await fetch(`${URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ id: product.id, ...productRecord(body) }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Gagal menambahkan produk", detail }, { status: 500 });
  }

  const result = await response.json();
  return NextResponse.json({ product: mapProduct(result[0]), mode: "supabase" }, { status: 201 });
}
