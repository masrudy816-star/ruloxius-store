import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PRODUCTS, PRODUCT_WEIGHTS } from "../../catalog";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLE = "ruloxius_products";

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


  if (
    !body.id ||
    !body.name ||
    !body.size ||
    Number(body.price) < 0
  ) {
    return NextResponse.json(
      {
        error: "Data produk tidak valid",
      },
      {
        status: 400,
      }
    );
  }



  if ((body.image || "").length > 1500000) {
    return NextResponse.json(
      {
        error: "Foto maksimal sekitar 1 MB",
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



  const record = {
    name: body.name,
    size: body.size,
    description: body.detail || "",
    price: Number(body.price),
    stock: Number(body.stock || 0),
    image_url: body.image || "",
    active: body.active !== false,
  };



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
