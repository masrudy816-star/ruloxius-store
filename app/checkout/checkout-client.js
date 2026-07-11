'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCTS, PRODUCT_WEIGHTS, rupiah } from '../catalog';

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281382920207';
const SHOPEE = process.env.NEXT_PUBLIC_SHOPEE_URL || 'https://s.shopee.co.id/2qSqzbiP1J';
const ORIGIN_CITY_ID = '153';
const COURIERS = ['jne', 'jnt', 'tiki', 'sicepat'];

const initialShipping = { loading: false, options: [], selected: null, error: '' };

export default function CheckoutClient() {
  const params = useSearchParams();
  const qrisUrl = process.env.NEXT_PUBLIC_QRIS_IMAGE_URL;
  const [products, setProducts] = useState(PRODUCTS);
  const [payment, setPayment] = useState('qris');
  const [proof, setProof] = useState('');
  const [shipping, setShipping] = useState(initialShipping);
  const [location, setLocation] = useState({
    loadingProvinces: true,
    loadingCities: false,
    provinces: [],
    cities: [],
    provinceId: '',
    cityId: '',
    error: '',
  });
  const [state, setState] = useState({ loading: false, error: '', order: null });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/products', { signal: controller.signal }).then((response) => response.json()),
      fetch('/api/provinces', { signal: controller.signal }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memuat provinsi');
        return data;
      }),
    ]).then(([productData, provinceData]) => {
      if (productData.products) setProducts(productData.products);
      setLocation((current) => ({
        ...current,
        loadingProvinces: false,
        provinces: provinceData.provinces || [],
      }));
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        setLocation((current) => ({ ...current, loadingProvinces: false, error: error.message }));
      }
    });
    return () => controller.abort();
  }, []);

  const cart = useMemo(() => {
    try {
      return JSON.parse(params.get('cart') || '{"500ml":1}');
    } catch {
      return { '500ml': 1 };
    }
  }, [params]);

  const items = useMemo(() => products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ ...product, quantity: Number(cart[product.id]) })), [products, cart]);

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const totalWeight = items.reduce(
    (sum, item) => sum + Number(item.weight || PRODUCT_WEIGHTS[item.id] || 0) * item.quantity,
    0,
  );
  const shippingCost = Number(shipping.selected?.cost || 0);
  const total = subtotal + shippingCost;
  const selectedProvince = location.provinces.find((item) => item.id === location.provinceId);
  const selectedCity = location.cities.find((item) => item.id === location.cityId);

  async function selectProvince(provinceId) {
    setLocation((current) => ({
      ...current,
      provinceId,
      cityId: '',
      cities: [],
      loadingCities: Boolean(provinceId),
      error: '',
    }));
    setShipping(initialShipping);
    if (!provinceId) return;

    try {
      const response = await fetch(`/api/cities?province_id=${encodeURIComponent(provinceId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat kota');
      setLocation((current) => ({ ...current, loadingCities: false, cities: data.cities || [] }));
    } catch (error) {
      setLocation((current) => ({ ...current, loadingCities: false, error: error.message }));
    }
  }

  function selectCity(cityId) {
    const city = location.cities.find((item) => item.id === cityId);
    setLocation((current) => ({ ...current, cityId }));
    setShipping(initialShipping);
    const postal = document.querySelector('[name="postal"]');
    if (postal && city?.postalCode && !postal.value) postal.value = city.postalCode;
  }

  async function checkShipping() {
    if (!location.cityId) {
      setShipping({ ...initialShipping, error: 'Pilih provinsi dan kota/kabupaten terlebih dahulu.' });
      return;
    }
    if (!totalWeight) {
      setShipping({ ...initialShipping, error: 'Berat produk tidak tersedia.' });
      return;
    }

    setShipping((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await fetch('/api/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: ORIGIN_CITY_ID,
          destination: location.cityId,
          weight: totalWeight,
          courier: COURIERS.join(':'),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mengecek ongkir');
      const options = Array.isArray(data.data) ? data.data : [];
      if (!options.length) throw new Error('Tidak ada layanan pengiriman untuk tujuan ini.');
      setShipping({ loading: false, options, selected: options[0], error: '' });
    } catch (error) {
      setShipping({ ...initialShipping, error: error.message });
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (payment === 'shopee') {
      window.open(SHOPEE, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!items.length) return setState({ loading: false, error: 'Keranjang kosong.', order: null });
    if (!location.cityId || !selectedCity) return setState({ loading: false, error: 'Pilih kota tujuan.', order: null });
    if (!shipping.selected) return setState({ loading: false, error: 'Pilih layanan pengiriman.', order: null });

    const form = new FormData(event.currentTarget);
    const payload = {
      customer_name: form.get('name'),
      phone: form.get('phone'),
      address: form.get('address'),
      province: selectedProvince?.name || '',
      city: selectedCity.name,
      city_id: location.cityId,
      destination: location.cityId,
      postal_code: form.get('postal'),
      notes: form.get('notes'),
      payment_method: payment,
      payment_proof: proof,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        price: Number(item.price),
        weight: Number(item.weight || PRODUCT_WEIGHTS[item.id] || 0),
        quantity: item.quantity,
      })),
      subtotal,
      shipping_cost: shippingCost,
      courier: shipping.selected.name,
      service: shipping.selected.service,
      etd: shipping.selected.etd,
      total_weight: totalWeight,
      total,
      source: 'website',
    };

    setState({ loading: true, error: '', order: null });
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Order gagal disimpan');
      const order = { ...payload, ...data, created_at: new Date().toISOString(), status: 'pending' };
      setState({ loading: false, error: '', order });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setState({ loading: false, error: error.message, order: null });
    }
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      setState((current) => ({ ...current, error: 'Ukuran bukti maksimal 1,5 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProof(reader.result);
    reader.readAsDataURL(file);
  }

  if (state.order) return <Success order={state.order} />;

  return <div className="app-page">
    <SimpleHeader />
    <form id="checkout-form" className="checkout-shell" onSubmit={submit}>
      <div className="checkout-title">
        <small>CHECKOUT AMAN</small>
        <h1>Selesaikan pesanan</h1>
        <p>Lengkapi alamat, pilih pengiriman, lalu selesaikan pembayaran.</p>
      </div>

      <div className="checkout-layout">
        <div>
          <section className="panel">
            <h2>1. Data penerima</h2>
            <div className="form-grid">
              <Field name="name" label="Nama lengkap" required />
              <Field name="phone" label="Nomor WhatsApp" type="tel" required />
              <Field name="address" label="Alamat lengkap" textarea full required />
              <SelectField label="Provinsi" value={location.provinceId} onChange={(event) => selectProvince(event.target.value)} disabled={location.loadingProvinces} required>
                <option value="">{location.loadingProvinces ? 'Memuat provinsi…' : 'Pilih provinsi'}</option>
                {location.provinces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </SelectField>
              <SelectField label="Kota / Kabupaten" name="city_id" value={location.cityId} onChange={(event) => selectCity(event.target.value)} disabled={!location.provinceId || location.loadingCities} required>
                <option value="">{location.loadingCities ? 'Memuat kota…' : 'Pilih kota/kabupaten'}</option>
                {location.cities.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
              </SelectField>
              <Field name="postal" label="Kode pos" />
              <Field name="notes" label="Catatan (opsional)" textarea full />
            </div>
            <input type="hidden" name="city" value={selectedCity?.name || ''} />
            <p className="shipping-weight">Berat pengiriman: <b>{totalWeight.toLocaleString('id-ID')} gram</b></p>
            <button type="button" className="btn btn-primary shipping-check" onClick={checkShipping} disabled={shipping.loading || !location.cityId}>
              {shipping.loading ? 'MENGECEK ONGKIR…' : 'CEK ONGKIR JNE, J&T, TIKI & SICEPAT'}
            </button>
            {location.error ? <p className="notice">{location.error}</p> : null}
            {shipping.error ? <p className="notice">{shipping.error}</p> : null}
          </section>

          {shipping.options.length ? <ShippingOptions shipping={shipping} setShipping={setShipping} /> : null}

          <section className="panel payment-panel">
            <h2>3. Metode pembayaran</h2>
            <div className="payment-options">
              {[
                ['qris', '▦ QRIS', 'Scan dengan aplikasi pembayaran'],
                ['transfer', '▤ Transfer Bank', 'Bank BRI dan Mandiri'],
                ['cod', '◫ COD', 'Bayar saat barang diterima'],
                ['shopee', '🛒 Shopee', 'Checkout melalui toko resmi'],
              ].map(([id, title, description]) => <label key={id} className={`pay-option ${payment === id ? 'active' : ''}`}>
                <input type="radio" name="payment" checked={payment === id} onChange={() => setPayment(id)} />
                <span><b>{title}</b><br /><small>{description}</small></span>
              </label>)}
            </div>
            {payment === 'qris' ? qrisUrl
              ? <img className="qris-image" src={qrisUrl} alt="QRIS RULOXIUS" />
              : <p className="notice">QRIS belum diatur.</p> : null}
            {payment !== 'cod' && payment !== 'shopee' ? <div className="proof-upload">
              <b>Bukti pembayaran</b>
              <input type="file" accept="image/jpeg,image/png" onChange={upload} />
              {proof ? <p className="notice success">Bukti siap ✓</p> : null}
            </div> : null}
          </section>
        </div>

        <OrderSummary
          items={items}
          subtotal={subtotal}
          shippingCost={shippingCost}
          shipping={shipping.selected}
          total={total}
          state={state}
          payment={payment}
        />
      </div>
    </form>
  </div>;
}

function ShippingOptions({ shipping, setShipping }) {
  return <section className="panel shipping-panel">
    <h2>2. Pilih pengiriman</h2>
    <div className="shipping-options">
      {shipping.options.map((item, index) => {
        const selected = shipping.selected === item;
        return <label className={`shipping-option ${selected ? 'active' : ''}`} key={`${item.courier}-${item.service}-${index}`}>
          <input type="radio" name="shipping" checked={selected} onChange={() => setShipping((current) => ({ ...current, selected: item }))} />
          <span className="courier-name">{item.name}</span>
          <span className="courier-service"><b>{item.service}</b><small>{item.description}</small></span>
          <span className="courier-etd"><small>Estimasi</small><b>{item.etd}</b></span>
          <strong>{rupiah(item.cost)}</strong>
        </label>;
      })}
    </div>
  </section>;
}

function OrderSummary({ items, subtotal, shippingCost, shipping, total, state, payment }) {
  return <aside><section className="panel order-summary">
    <h2>Ringkasan pesanan</h2>
    {items.map((item) => <div className="order-row" key={item.id}>
      <b>{item.size} × {item.quantity}</b>
      <strong>{rupiah(item.price * item.quantity)}</strong>
    </div>)}
    <div className="summary-line"><span>Subtotal produk</span><b>{rupiah(subtotal)}</b></div>
    <div className="summary-line"><span>Ongkir{shipping ? ` • ${shipping.name} ${shipping.service}` : ''}</span><b>{shipping ? rupiah(shippingCost) : 'Belum dipilih'}</b></div>
    <div className="summary-total"><span>Total bayar</span><span>{rupiah(total)}</span></div>
    {state.error ? <p className="notice">{state.error}</p> : null}
    <button className="btn btn-primary submit-order" disabled={state.loading || (payment !== 'shopee' && !shipping)}>
      {state.loading ? 'MENYIMPAN…' : payment === 'shopee' ? 'LANJUT KE SHOPEE' : 'BUAT PESANAN'}
    </button>
    <p className="checkout-terms">Total sudah termasuk ongkir yang dipilih.</p>
  </section></aside>;
}

function Success({ order }) {
  const waText = encodeURIComponent(`ORDER RULOXIUS BARU\n\nNomor: ${order.order_number}\nNama: ${order.customer_name}\nProduk: ${order.items.map((item) => `${item.size} x ${item.quantity}`).join(', ')}\nSubtotal: ${rupiah(order.subtotal)}\nOngkir: ${rupiah(order.shipping_cost)}\nKurir: ${order.courier} ${order.service} (${order.etd})\nTotal: ${rupiah(order.total)}\nAlamat: ${order.address}, ${order.city}\nPembayaran: ${order.payment_method.toUpperCase()}`);
  return <div className="app-page"><SimpleHeader /><div className="checkout-shell">
    <div className="panel checkout-success">
      <div className="success-check">✓</div>
      <h1>Pesanan berhasil dibuat</h1>
      <p>Nomor pesanan</p><h2>{order.order_number}</h2>
      <div className="notice success">
        <p><b>Total pembayaran: {rupiah(order.total)}</b></p>
        <p>Ongkir: {rupiah(order.shipping_cost)}</p>
        <p>Kurir: {order.courier} {order.service} • {order.etd}</p>
      </div>
      <a className="btn btn-wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${WA}?text=${waText}`}>KONFIRMASI WHATSAPP</a>
      <br /><br /><Link href="/">Kembali belanja</Link>
    </div>
  </div></div>;
}

function SimpleHeader() {
  return <header className="simple-header">
    <Link className="brand brand-logo" href="/"><img src="/images/ruloxius-logo-v2.png" alt="RULOXIUS" /></Link>
    <Link href="/">← Kembali</Link>
  </header>;
}

function Field({ label, full, textarea, ...props }) {
  return <div className={`field ${full ? 'full' : ''}`}>
    <label htmlFor={props.name}>{label}</label>
    {textarea ? <textarea id={props.name} rows="3" {...props} /> : <input id={props.name} {...props} />}
  </div>;
}

function SelectField({ label, children, ...props }) {
  return <div className="field">
    <label>{label}</label>
    <select {...props}>{children}</select>
  </div>;
}
