import { NextResponse } from "next/server";

const API_KEY = process.env.RAJAONGKIR_API_KEY;

const KOMERCE_URL =
  "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost";

const COURIER_NAMES = {
  jne: "JNE",
  jnt: "J&T",
  tiki: "TIKI",
  sicepat: "SiCepat"
};

function normalizeOptions(payload) {
  const rows = Array.isArray(payload) ? payload : [];

  return rows.flatMap((row) => {
    const code = String(row.code || row.courier_code || row.name || row.courier || "").toLowerCase();
    const name = COURIER_NAMES[code] || row.courier_name || row.name || row.code || "Kurir";
    const services = Array.isArray(row.costs) ? row.costs : [row];

    return services.flatMap((service) => {
      const costDetail = Array.isArray(service.cost) ? service.cost[0] : service.cost;
      const cost = Number(costDetail?.value ?? costDetail ?? service.price ?? service.shipping_cost ?? 0);
      if (!cost) return [];

      return [{
        courier: code || String(name).toLowerCase(),
        name,
        service: service.service || service.type || service.service_code || "REG",
        description: service.description || service.service_name || "Layanan pengiriman",
        cost,
        etd: String(costDetail?.etd || service.etd || service.estimated_delivery || "-")
      }];
    });
  });
}


export async function POST(request) {
  try {

    const body = await request.json();

    const {
      origin,
      destination,
      weight,
      courier = "jne:jnt:tiki:sicepat"
    } = body;


    if (!/^\d+$/.test(String(origin || "")) || !/^\d+$/.test(String(destination || ""))) {

      return NextResponse.json(
        {
          error:"Origin dan destination wajib diisi"
        },
        {
          status:400
        }
      );

    }

    const safeWeight = Number(weight);
    if (!Number.isInteger(safeWeight) || safeWeight <= 0 || safeWeight > 30000) {
      return NextResponse.json({ error:"Berat pengiriman tidak valid" }, { status:400 });
    }

    const allowedCouriers = new Set(["jne", "jnt", "tiki", "sicepat"]);
    const safeCouriers = String(courier)
      .split(":")
      .filter((item) => allowedCouriers.has(item))
      .join(":");

    if (!safeCouriers) {
      return NextResponse.json({ error:"Kurir tidak valid" }, { status:400 });
    }


    if (!API_KEY) {

      return NextResponse.json(
        {
          error:"RAJAONGKIR_API_KEY belum tersedia"
        },
        {
          status:500
        }
      );

    }



    const response = await fetch(
      KOMERCE_URL,
      {
        method:"POST",

        headers:{
          key: API_KEY,

          "Content-Type":
          "application/x-www-form-urlencoded",

          Accept:
          "application/json"
        },


        body:
        new URLSearchParams({

          origin,

          destination,

          weight:String(safeWeight),

          courier:safeCouriers

        }),

        cache:"no-store"

      }
    );



    const result =
      await response.json();



    if (!response.ok) {

      return NextResponse.json(
        {
          error:
          "Komerce menolak request",

          detail:
          result

        },
        {
          status:response.status
        }
      );

    }



    return NextResponse.json(
      {
        success:true,

        data: normalizeOptions(result.data || result)
      }
    );



  } catch(error) {


    console.error(
      "Shipping API Error:",
      error
    );


    return NextResponse.json(
      {
        error:
        "Gagal mengambil ongkir",

        detail:
        error.message
      },
      {
        status:500
      }
    );


  }
}
