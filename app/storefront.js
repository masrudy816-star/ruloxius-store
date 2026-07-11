'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCTS, rupiah } from './catalog';

const WA = '6281382920207';
const SHOPEE_URL = process.env.NEXT_PUBLIC_SHOPEE_URL || 'https://s.shopee.co.id/2qSqzbiP1J';
const benefits = [
  ['✦', 'Kerak Membandel', 'Membantu meluruhkan noda kerak'],
  ['♢', 'Aman Dipakai', 'Ikuti petunjuk pada kemasan'],
  ['❉', 'Wangi Segar', 'Bersih tanpa bau menyengat'],
  ['✓', 'Mudah Digunakan', 'Oles, tunggu, sikat, lalu bilas'],
];
const DEFAULT_FAQS = [
  { id: 'safe', question: 'Apakah aman untuk semua keramik?', answer: 'Gunakan sesuai petunjuk, tes dahulu pada area kecil, dan hindari permukaan sensitif terhadap cairan pembersih.' },
  { id: 'use', question: 'Bagaimana cara pakainya?', answer: 'Gunakan sarung tangan, oles pada area berkerak, tunggu sebentar, sikat, lalu bilas sampai bersih.' },
  { id: 'process', question: 'Berapa lama pesanan diproses?', answer: 'Pesanan terverifikasi diproses 1–2 hari kerja sebelum diserahkan ke kurir.' },
];

function Header({ count, onCart }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <Link className="brand brand-logo" href="/"><Image src="/images/ruloxius-logo-v2.png" alt="RULOXIUS Home Care" width={190} height={80} priority /></Link>
    <button className="menu" onClick={() => setOpen(v => !v)} aria-label="Buka menu">☰</button>
    <nav className={open ? 'open' : ''}>
      <a href="#beranda">Beranda</a><a href="#produk">Produk</a><a href="#cara-pakai">Cara Pakai</a><a href="#review">Review</a><a href="#faq">FAQ</a>
    </nav>
    <a className="btn btn-wa header-cta" href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">◉ Order via WhatsApp</a>
    <button className="cart-pill" onClick={onCart} aria-label={`${count} produk di keranjang`}>🛒 <b>{count}</b></button>
  </header>;
}

export default function Storefront() {
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [products, setProducts] = useState(PRODUCTS);
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/products'),d=await r.json(),saved=JSON.parse(localStorage.getItem('ruloxius_products')||'null'),local=saved?.some(p=>p.id==='2x1000ml'||p.id==='4x1000ml')?null:saved,next=d.mode==='demo'&&local?local:(d.products||PRODUCTS);PRODUCTS.splice(0,PRODUCTS.length,...next);setProducts([...next])}catch{}})()},[]);
  useEffect(() => { fetch('/api/faqs').then((response) => response.json()).then((data) => setFaqs(data.faqs || DEFAULT_FAQS)).catch(() => {}); }, []);
  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);
  const update = (id, delta) => setCart((old) => { const product = products.find((item) => item.id === id); const limit = Math.max(0, Number(product?.stock || 0)); return { ...old, [id]: Math.min(limit, Math.max(0, (old[id] || 0) + delta)) }; });
  const checkoutHref = count ? `/checkout?cart=${encodeURIComponent(JSON.stringify(cart))}` : '/checkout?cart=%7B%22500ml%22%3A1%7D';

  return <main>
    <Header count={count} onCart={() => setCartOpen(true)} />
    <section id="beranda" className="hero section-shell">
      <div className="hero-copy">
        <span className="eyebrow">PEMBERSIH KERAK</span>
        <h1>KERAK MEMBANDEL?<br />BIARKAN <em>RULOXIUS</em><br />YANG BERESKAN!</h1>
        <p>Formula kuat untuk membantu membersihkan kerak kamar mandi, WC, dan permukaan keramik hingga bersih mengkilap.</p>
        <div className="hero-actions hero-actions-desktop"><a className="btn btn-wa" href="#produk">◉ PESAN SEKARANG</a><a className="btn btn-outline" href={SHOPEE_URL} target="_blank" rel="noopener noreferrer">🛍 BELI DI SHOPEE</a></div>
      </div>
      <div className="hero-media"><Image className="hero-image-desktop" src="/images/product-hero.png" alt="RULOXIUS 500ML dan 1000ML" fill priority sizes="58vw" /><Image className="hero-image-mobile" src="/images/product-hero-mobile.png" alt="RULOXIUS 500ML dan 1000ML" fill priority sizes="100vw" /></div>
      <div className="hero-price"><small>Harga mulai</small><strong>Rp28.000</strong></div>
      <div className="hero-actions hero-actions-mobile"><a className="btn btn-wa" href="#produk"><span>◉</span><b>PESAN SEKARANG</b><small>Chat Admin via WhatsApp</small></a><a className="btn btn-outline" href={SHOPEE_URL} target="_blank" rel="noopener noreferrer">🛍 <b>BELI DI SHOPEE</b></a></div>
      <div className="benefit-strip">{benefits.map(([icon, title, description]) => <div key={title}><i>{icon}</i><span><b>{title}</b><small>{description}</small></span></div>)}</div>
    </section>

    <section id="cara-pakai" className="before section-shell">
      <div className="section-heading"><small>HASIL YANG MUDAH DILIHAT</small><h2>DARI KOTOR JADI BERSIH</h2><p>Lihat proses RULOXIUS membantu membersihkan kerak pada lantai dan bagian bawah toilet.</p></div>
      <div className="steps">{[['01','Toilet & Lantai Berkerak','Noda kusam dan kerak menempel di lantai serta bagian bawah toilet.'],['02','Oleskan RULOXIUS','Gunakan sarung tangan, oles dengan kuas, lalu biarkan cairan bekerja.'],['03','Bilas Sampai Bersih','Siram dengan air hingga kerak terangkat dan permukaan tampak lebih bersih.']].map((s, i) => <article key={s[1]} className={`step step-${i}`}><div className="tile-texture" role="img" aria-label={s[1]}/><b>{s[0]}</b><h3>{s[1]}</h3><p>{s[2]}</p>{i<2?<span className="step-arrow" aria-hidden="true">→</span>:null}</article>)}</div>
      <div className="result-note"><span>💡</span><p><b>Hasil dapat berbeda pada setiap permukaan.</b> Selalu tes pada area kecil terlebih dahulu dan ikuti petunjuk penggunaan.</p></div>
    </section>

    <section className="proof section-shell">
      <div className="video-wrap">
        <div className="section-heading align-left"><small>VIDEO PROMOSI • 1 MENIT</small><h2>LIHAT KERAK LURUH<br/>DALAM 60 DETIK</h2><p>Tekan play dan lihat sendiri cara RULOXIUS membantu mengangkat kerak membandel.</p></div>
        <div className={`promo-video ${videoPlaying ? 'is-playing' : ''}`}>
          {videoPlaying?<video controls autoPlay preload="metadata"><source src="/videos/demo.mp4" type="video/mp4" /></video>:<button className="video-cover" onClick={()=>setVideoPlaying(true)} aria-label="Putar video promosi RULOXIUS"><span className="video-copy"><b>BUKTI BERSIHNYA<br/>BUKAN CUMA KATA-KATA</b><small>Oles • Tunggu • Sikat • Bilas</small></span><span className="play-button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 6.5v11l9-5.5-9-5.5Z"/></svg></span><span className="watch-label">TONTON SEKARANG</span></button>}
        </div>
        <p className="video-caption"><span>✓</span> Video promosi asli RULOXIUS • Durasi hanya 1 menit</p>
      </div>
      <div className="advantages">
        <span className="proof-number">01</span><div className="section-heading align-left"><small>KENAPA RULOXIUS?</small><h2>LEBIH MUDAH BERSIH,<br/>LEBIH NYAMAN DI RUMAH</h2><p>Bukan sekadar terlihat bersih. RULOXIUS dirancang untuk membuat pekerjaan kamar mandi terasa lebih ringan.</p></div>
        <div className="advantage-list">{benefits.map(([icon,title,desc]) => <div className="advantage" key={title}><i>{icon}</i><div><b>{title}</b><p>{desc}</p></div></div>)}</div>
        <a className="proof-cta" href="#produk"><span><small>SIAP COBA SENDIRI?</small><b>Pilih paket RULOXIUS</b></span><strong>→</strong></a>
      </div>
    </section>

    <section id="produk" className="products-section section-shell">
      <div className="offer-kicker"><span>🔥 PENAWARAN TERBAIK HARI INI</span><span>Stok siap kirim dari Gowa</span></div>
      <div className="section-heading product-heading"><small>PILIH SESUAI KEBUTUHAN</small><h2>PAKET TERBAIK UNTUK ANDA</h2><p>Makin banyak, makin hemat. Semua paket dipacking aman dan bisa COD.</p><div className="rating-proof"><span>★★★★★</span><b>5.0</b><small>Dipercaya pelanggan RULOXIUS</small></div><div className="swipe-hint"><span>←</span> Geser untuk lihat paket lainnya <span>→</span></div></div>
      <div className="product-grid">{products.map(product => { const out = Number(product.stock) <= 0; return <article className={`product-card ${product.popular ? 'popular' : ''} ${out ? 'out-of-stock' : ''}`} key={product.id}>{product.popular ? <span className="popular-label">★ PALING LARIS</span> : null}<div className="card-top"><p className="package-name">{product.name}</p>{product.saving > 0 ? <span className="save-chip">HEMAT {rupiah(product.saving)}</span> : null}</div><div className="product-thumb"><Image src={product.image} alt={`${product.name} RULOXIUS ${product.size}`} fill sizes="(max-width: 800px) 100vw, 360px" /></div><div className="product-info"><h3>{product.size}</h3><p className="product-detail"><span>✓</span>{product.detail}</p><p className="unit-price">{product.unit}</p><div className="price-line"><strong>{rupiah(product.price)}</strong>{product.compareAt > product.price ? <del>{rupiah(product.compareAt)}</del> : null}</div><div className="stock-line"><span><i/> {out ? 'Stok habis' : `Stok tersedia (${product.stock})`}</span><span>{out ? 'Belum dapat dipesan' : 'Siap dikirim'}</span></div><div className="qty"><button disabled={out} onClick={() => update(product.id,-1)} aria-label={`Kurangi ${product.size}`}>−</button><span>{cart[product.id] || 0}</span><button disabled={out} onClick={() => update(product.id,1)} aria-label={`Tambah ${product.size}`}>+</button></div><button disabled={out} className="choose-package" onClick={() => update(product.id,1)}>{out ? 'STOK HABIS' : cart[product.id] ? 'TAMBAH LAGI' : 'PILIH PAKET'} {!out ? <span>→</span> : null}</button></div></article>; })}</div>
      <div className="purchase-bar"><div><span className="cart-icon">🛒</span><p><small>Subtotal sementara</small><b>{rupiah(products.reduce((sum,p)=>sum+(cart[p.id]||0)*p.price,0))}</b></p></div><button className="btn btn-primary checkout-main" onClick={() => setCartOpen(true)}>LIHAT KERANJANG {count ? `• ${count} ITEM` : ''} <span>→</span></button></div>
      <div className="service-row"><span><i>✓</i><b>COD Tersedia</b><small>Bayar saat barang tiba</small></span><span><i>♢</i><b>Packing Aman</b><small>Dilapisi pelindung ekstra</small></span><span><i>▱</i><b>Pengiriman Cepat</b><small>Diproses setiap hari</small></span><span><i>₿</i><b>Transfer Bank</b><small>BRI dan Mandiri</small></span></div>
      <p className="checkout-note">🔒 Checkout aman • Pesanan langsung tercatat • Konfirmasi cepat via WhatsApp</p>
    </section>

    <section id="review" className="reviews section-shell"><div className="section-heading"><small>RIBUAN PELANGGAN PUAS</small><h2>APA KATA MEREKA?</h2><div className="stars">★★★★★ <span>4,9/5</span></div></div><div className="review-grid">{[['Budi Santoso','Kerak WC yang susah hilang akhirnya bersih. Wanginya juga enak!'],['Rina Martina','Lantai kamar mandi jadi lebih mengkilap. Recomended banget!'],['Putri Pratama','Produk mantap, hasil cepat dan tidak bikin keramik rusak.']].map(([n,t]) => <blockquote key={n}><div>★★★★★</div><p>“{t}”</p><cite>{n} • Pembeli terverifikasi</cite></blockquote>)}</div></section>

    <section id="faq" className="faq section-shell"><div className="section-heading"><small>YANG SERING DITANYAKAN</small><h2>FAQ</h2></div>{faqs.map((faq) => <details key={faq.id}><summary>{faq.question}<span>+</span></summary><p>{faq.answer}</p></details>)}</section>

    <footer><div className="footer-logo"><Image src="/images/ruloxius-logo-v2.png" alt="RULOXIUS Home Care" width={240} height={100}/></div><p>Solusi praktis untuk rumah yang lebih bersih.</p><a href={`https://wa.me/${WA}`}>WhatsApp +62 813-8292-0207</a><a href={SHOPEE_URL} target="_blank" rel="noopener noreferrer">Kunjungi RULOXIUS di Shopee →</a><small>© 2026 RULOXIUS. Seluruh hak dilindungi.</small></footer>
    <a className="floating-wa" href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" aria-label="Chat RULOXIUS melalui WhatsApp"><span className="wa-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2a9.75 9.75 0 0 0-8.38 14.73L2.2 21.8l5.2-1.36A9.77 9.77 0 1 0 12 2Zm0 17.55a7.8 7.8 0 0 1-3.98-1.08l-.28-.17-3.08.81.82-3-.18-.3A7.8 7.8 0 1 1 12 19.55Zm4.28-5.84c-.23-.12-1.39-.69-1.61-.77-.21-.08-.37-.12-.53.12-.15.23-.6.76-.74.91-.13.16-.27.18-.5.06-.24-.12-.99-.36-1.88-1.16a7.04 7.04 0 0 1-1.3-1.62c-.13-.23-.01-.36.1-.48.1-.1.23-.27.35-.41.12-.14.16-.24.23-.39.08-.16.04-.3-.02-.42-.06-.11-.53-1.27-.72-1.74-.19-.46-.38-.4-.53-.41h-.45c-.16 0-.41.06-.63.29-.21.23-.82.8-.82 1.96s.84 2.28.96 2.44c.12.15 1.65 2.52 4 3.53.56.24 1 .39 1.34.5.56.18 1.07.15 1.48.09.45-.07 1.39-.57 1.58-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.27Z"/></svg></span><span className="wa-label">Chat WhatsApp</span></a>
    {cartOpen?<><button className="cart-backdrop" aria-label="Tutup keranjang" onClick={()=>setCartOpen(false)}/><aside className="cart-drawer"><div className="cart-head"><div><small>KERANJANG ANDA</small><h2>{count} item dipilih</h2></div><button onClick={()=>setCartOpen(false)} aria-label="Tutup">×</button></div><div className="cart-lines">{count?products.filter(p=>cart[p.id]>0).map(p=><div className="cart-line" key={p.id}><div className="cart-image"><Image src={p.image} alt="" fill sizes="70px"/></div><div><b>{p.size}</b><small>{p.name}</small><div className="mini-qty"><button onClick={()=>update(p.id,-1)}>−</button><span>{cart[p.id]}</span><button onClick={()=>update(p.id,1)}>+</button></div></div><strong>{rupiah(p.price*cart[p.id])}</strong></div>):<div className="empty-cart"><span>🛒</span><h3>Keranjang masih kosong</h3><p>Pilih paket RULOXIUS yang Anda butuhkan.</p></div>}</div><div className="cart-footer"><div><span>Subtotal</span><b>{rupiah(products.reduce((sum,p)=>sum+(cart[p.id]||0)*p.price,0))}</b></div><Link aria-disabled={!count} className={`btn btn-primary ${!count?'disabled':''}`} href={checkoutHref}>CHECKOUT SEKARANG</Link><small>Checkout aman • Order langsung tercatat</small></div></aside></>:null}
  </main>;
}
