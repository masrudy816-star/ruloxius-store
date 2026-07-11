import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { PRODUCT_WEIGHTS } from "../../catalog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLE = "ruloxius_orders";
const PRODUCTS_TABLE = "ruloxius_products";

async function getVerifiedItems(items) {
  const quantities = new Map();
  for (const item of items) {
    const id = String(item.id || "");
    const quantity = Number(item.quantity);
    if (!id || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new Error("Item pesanan tidak valid.");
    }
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return items.map((item) => ({ ...item, price: Number(item.price), weight: PRODUCT_WEIGHTS[item.id] || Number(item.weight || 0) }));
  }

  const ids = [...quantities.keys()];
  const filter = encodeURIComponent(`(${ids.join(",")})`);
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${PRODUCTS_TABLE}?select=id,name,size,price,weight,active&id=in.${filter}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: "no-store" }
  );
  if (!response.ok) throw new Error("Gagal memvalidasi produk.");

  const products = await response.json();
  if (products.length !== ids.length || products.some((product) => product.active === false)) {
    throw new Error("Produk tidak tersedia.");
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    size: product.size,
    price: Number(product.price),
      weight: Number(product.weight || PRODUCT_WEIGHTS[product.id] || 0),
    quantity: quantities.get(product.id),
  }));
}

const isAdmin = async () => {
  const pin =
    process.env.ADMIN_PIN ||
    (process.env.NODE_ENV !== "production" ? "2026" : undefined);

  if (!pin) return false;

  const token = (await cookies()).get("ruloxius_admin")?.value;

  return (
    token ===
    createHash("sha256")
      .update(`ruloxius:${pin}`)
      .digest("hex")
  );
};



export async function POST(request) {
  try {

    const body = await request.json();


    if (
      !body.customer_name ||
      !body.phone ||
      !body.address ||
      !body.items ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Data pesanan belum lengkap."
        },
        {
          status: 400
        }
      );
    }

    const verifiedItems = await getVerifiedItems(body.items);
    const subtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalWeight = verifiedItems.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const shippingCost = Number(body.shipping_cost);
    const total = Number(body.total);

    if (
      !Number.isFinite(subtotal) || subtotal < 0 || Number(body.subtotal) !== subtotal ||
      !Number.isFinite(shippingCost) || shippingCost < 0 ||
      !Number.isFinite(total) || total !== subtotal + shippingCost ||
      !body.courier || !body.service || !body.etd || !body.city ||
      Number(body.total_weight) !== totalWeight
    ) {
      return NextResponse.json({ error: "Data ongkir pesanan tidak valid." }, { status: 400 });
    }



    const order_number =
      "RLX-" +
      Date.now()
        .toString(36)
        .toUpperCase();



    const record = {

      order_number,

      customer_name: body.customer_name,

      phone: body.phone,

      address: body.address,

      city: body.city || null,

      province: body.province || null,

      city_id: body.city_id ? String(body.city_id) : null,

      postal_code: body.postal_code || null,

      notes: body.notes || null,


      items: verifiedItems,


      subtotal,

      shipping_cost: shippingCost,

      courier: String(body.courier),

      service: String(body.service),

      etd: String(body.etd),

      total_weight: totalWeight,

      total,


      payment_method:
        body.payment_method || "qris",


      payment_proof:
        body.payment_proof || null,


      payment_status:
        "pending",


      status:
        "pending",


      source:
        body.source || "website"

    };



    if (!SUPABASE_URL || !SERVICE_KEY) {

      return NextResponse.json({

        order_number,

        mode: "demo"

      });

    }



    const response = await fetch(

      `${SUPABASE_URL}/rest/v1/${TABLE}`,

      {

        method: "POST",

        headers: {

          apikey: SERVICE_KEY,

          Authorization:
            `Bearer ${SERVICE_KEY}`,

          "Content-Type":
            "application/json",

          Prefer:
            "return=representation"

        },

        body:
          JSON.stringify(record),

        cache:
          "no-store"

      }

    );



    if (!response.ok) {

      const error =
        await response.text();

      throw new Error(error);

    }



    const [saved] =
      await response.json();



    return NextResponse.json({

      id: saved.id,

      order_number:
        saved.order_number,

      mode:
        "supabase"

    });



  } catch(error) {


    console.error(
      "Order error:",
      error
    );


    return NextResponse.json(

      {
        error:
          "Terjadi gangguan saat menyimpan pesanan."
      },

      {
        status:500
      }

    );

  }

}




export async function GET() {


  if (!await isAdmin()) {

    return NextResponse.json(

      {
        error:
          "Tidak diizinkan"
      },

      {
        status:401
      }

    );

  }



  if (!SUPABASE_URL || !SERVICE_KEY) {

    return NextResponse.json({

      orders:[],

      mode:"demo"

    });

  }



  const response = await fetch(

    `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc`,

    {

      headers: {

        apikey:
          SERVICE_KEY,

        Authorization:
          `Bearer ${SERVICE_KEY}`

      },

      cache:
        "no-store"

    }

  );



  if (!response.ok) {

    return NextResponse.json(

      {
        error:
          "Gagal memuat order"
      },

      {
        status:500
      }

    );

  }



  return NextResponse.json({

    orders:
      await response.json(),

    mode:
      "supabase"

  });


}




export async function PATCH(request) {


  if (!await isAdmin()) {

    return NextResponse.json(

      {
        error:
          "Tidak diizinkan"
      },

      {
        status:401
      }

    );

  }



  const body =
    await request.json();



  const allowed = [

    "pending",

    "paid",

    "processing",

    "shipped",

    "completed",

    "cancelled"

  ];



  const hasStatus = allowed.includes(body.status);
  const hasTracking = typeof body.tracking_number === "string";

  if (!body.id || (!hasStatus && !hasTracking)) {

    return NextResponse.json(

      {
        error:
          "Status tidak valid"
      },

      {
        status:400
      }

    );

  }



  const response = await fetch(

    `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(body.id)}`,

    {

      method:
        "PATCH",

      headers: {

        apikey:
          SERVICE_KEY,

        Authorization:
          `Bearer ${SERVICE_KEY}`,

        "Content-Type":
          "application/json"

      },

      body: JSON.stringify({
        ...(hasStatus ? { status: body.status } : {}),
        ...(hasTracking ? { tracking_number: body.tracking_number.trim() || null } : {}),
        ...(body.status === "shipped" ? { shipped_at: new Date().toISOString() } : {}),
        ...(body.status === "completed" ? { completed_at: new Date().toISOString() } : {})
      })

    }

  );



  if (!response.ok) {

    return NextResponse.json(

      {
        error:
          "Gagal mengubah status"
      },

      {
        status:500
      }

    );

  }



  return NextResponse.json({

    ok:true,

    mode:
      "supabase"

  });


}
