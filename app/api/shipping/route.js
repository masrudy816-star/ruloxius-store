import { NextResponse } from "next/server";


const RAJAONGKIR_URL =
  "https://api.rajaongkir.com/starter/cost";


export async function POST(request) {

  try {

    const body = await request.json();


    const {
      origin,
      destination,
      weight,
      courier
    } = body;


    if (
      !origin ||
      !destination ||
      !weight ||
      !courier
    ) {

      return NextResponse.json(
        {
          error: "Data ongkir belum lengkap"
        },
        {
          status:400
        }
      );

    }


    const API_KEY =
      process.env.RAJAONGKIR_API_KEY;


    if (!API_KEY) {

      return NextResponse.json(
        {
          error:
          "RAJAONGKIR_API_KEY belum dipasang"
        },
        {
          status:500
        }
      );

    }



    const response =
      await fetch(
        RAJAONGKIR_URL,
        {

          method:"POST",

          headers:{

            key: API_KEY,

            "Content-Type":
            "application/x-www-form-urlencoded"

          },

          body:
          new URLSearchParams({

            origin,

            destination,

            weight,

            courier

          })

        }
      );



    const result =
      await response.json();



    return NextResponse.json({

      success:true,

      data:
      result.rajaongkir?.results || []

    });



  } catch(error){


    console.error(
      "Shipping error:",
      error
    );


    return NextResponse.json(

      {
        error:
        "Gagal mengambil ongkir"
      },

      {
        status:500
      }

    );

  }

}