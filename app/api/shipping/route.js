import { NextResponse } from "next/server";

const API_KEY = process.env.RAJAONGKIR_API_KEY;

const KOMERCE_URL =
  "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost";


export async function POST(request) {
  try {

    const body = await request.json();

    const {
      origin,
      destination,
      weight = 1000,
      courier = "jne"
    } = body;


    if (!origin || !destination) {

      return NextResponse.json(
        {
          error:"Origin dan destination wajib diisi"
        },
        {
          status:400
        }
      );

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

          weight:String(weight),

          courier

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

        data:
        result.data || result
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