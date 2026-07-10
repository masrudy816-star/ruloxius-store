# RULOXIUS Storefront

Storefront Next.js responsif dengan landing page, keranjang, checkout, pilihan QRIS/transfer/COD, upload bukti, order API, serta dashboard admin.

## Jalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Dashboard tersedia di `/admin`. Tanpa konfigurasi environment, aplikasi masuk mode demo dan order tersimpan di browser yang sama. PIN lokal: `2026` (otomatis dinonaktifkan pada build produksi tanpa `ADMIN_PIN`).

## Aktifkan Supabase

1. Buat proyek Supabase dan jalankan `database/schema.sql` di SQL Editor.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` serta Vercel Environment Variables.
3. Jangan pernah mengekspos service role key sebagai variabel `NEXT_PUBLIC_*`.
4. Ganti `NEXT_PUBLIC_ADMIN_PIN`. Untuk produksi skala besar, migrasikan login PIN ke Supabase Auth.

## Checklist produksi

- Ganti QRIS contoh dengan QRIS merchant resmi melalui `NEXT_PUBLIC_QRIS_IMAGE_URL` dan tampilkan image tersebut pada checkout.
- Ganti `public/videos/demo.mp4` dengan video MP4 asli (file saat ini dari prototype bisa kosong/tidak valid).
- Hubungkan upload bukti ke Supabase Storage sebelum menerima transaksi publik; implementasi saat ini mengirim data gambar kecil bersama order.
- Isi pixel Meta/TikTok setelah ID iklan tersedia dan lengkapi halaman privasi.
- Uji order, pembayaran, notifikasi, tarif pengiriman, dan kebijakan refund dengan transaksi sandbox sebelum iklan dinyalakan.

## Deploy Vercel

Push ke Git, import repository di Vercel, salin seluruh environment variable, lalu jalankan deploy. Build command: `npm run build`.
