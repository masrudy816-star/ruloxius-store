'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PRODUCTS, rupiah } from '../catalog';

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '6281382920207';
const labels = {
  pending: 'Order baru',
  paid: 'Sudah dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function AdminClient() {
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(PRODUCTS);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [orderResponse, productResponse] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ]);
      if (orderResponse.status === 401) {
        setAuth(false);
        return;
      }
      const [orderData, productData] = await Promise.all([orderResponse.json(), productResponse.json()]);
      if (!orderResponse.ok) throw new Error(orderData.error || 'Gagal memuat order');
      setOrders(orderData.orders || []);
      setProducts(productData.products || PRODUCTS);
      setAuth(true);
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat data.');
      setAuth(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const shown = useMemo(() => orders.filter((order) => (
    (filter === 'all' || order.status === filter)
    && `${order.order_number} ${order.customer_name} ${order.phone}`.toLowerCase().includes(query.toLowerCase())
  )), [orders, query, filter]);

  const metrics = useMemo(() => ({
    total: orders.length,
    newOrders: orders.filter((order) => order.status === 'pending').length,
    revenue: orders.filter((order) => order.status === 'completed').reduce((sum, order) => sum + Number(order.total || 0), 0),
  }), [orders]);

  async function updateOrder(order, changes) {
    setError('');
    const response = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, ...changes }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Gagal memperbarui order');
      return false;
    }
    const nextOrder = { ...order, ...changes };
    setOrders((current) => current.map((item) => item.id === order.id ? nextOrder : item));
    setSelectedOrder((current) => current?.id === order.id ? nextOrder : current);
    return true;
  }

  async function saveProduct(product) {
    setError('');
    const response = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Gagal menyimpan produk');
      return false;
    }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...product } : item));
    return true;
  }

  if (auth === null) return <div className="app-page"><div className="empty">Memeriksa sesi admin…</div></div>;
  if (!auth) return <Login error={error} onLogin={load} />;

  return <div className="app-page">
    <AdminHeader onLogout={async () => { await fetch('/api/admin/session', { method: 'DELETE' }); setAuth(false); }} />
    <div className="admin-shell">
      <div className="admin-title">
        <small>CONTROL PANEL PEMILIK</small>
        <h1>{tab === 'orders' ? 'Kelola pesanan' : 'Kelola produk'}</h1>
        <p>{tab === 'orders' ? 'Pantau order, pengiriman, dan komunikasi pelanggan.' : 'Ubah foto, harga, stok, dan informasi produk tanpa coding.'}</p>
      </div>
      <nav className="admin-tabs">
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Pesanan <b>{metrics.newOrders}</b></button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Produk</button>
      </nav>
      {error ? <p className="notice">{error}</p> : null}
      {tab === 'orders'
        ? <OrdersPanel loading={loading} metrics={metrics} shown={shown} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} updateOrder={updateOrder} onDetail={setSelectedOrder} />
        : <ProductsPanel products={products} onSave={saveProduct} />}
    </div>
    {selectedOrder ? <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} onUpdate={updateOrder} /> : null}
  </div>;
}

function AdminHeader({ onLogout }) {
  return <header className="simple-header">
    <Link className="brand brand-logo" href="/"><img src="/images/ruloxius-logo-v2.png" alt="RULOXIUS Home Care" /></Link>
    <button className="btn btn-outline" onClick={onLogout}>Keluar</button>
  </header>;
}

function OrdersPanel({ loading, metrics, shown, query, setQuery, filter, setFilter, updateOrder, onDetail }) {
  return <>
    <div className="metric-grid">
      <article><small>TOTAL ORDER</small><b>{metrics.total}</b></article>
      <article><small>ORDER BARU</small><b>{metrics.newOrders}</b></article>
      <article><small>PENDAPATAN SELESAI</small><b>{rupiah(metrics.revenue)}</b></article>
    </div>
    <div className="admin-toolbar">
      <input placeholder="Cari nomor, nama, telepon…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">Semua status</option>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="panel admin-order-panel">
      {loading ? <div className="empty">Memuat order…</div> : shown.length
        ? <table className="orders-table">
          <thead><tr><th>ORDER</th><th>PELANGGAN</th><th>ITEM</th><th>TOTAL</th><th>PENGIRIMAN</th><th>STATUS</th><th></th></tr></thead>
          <tbody>{shown.map((order) => <tr key={order.order_number}>
            <td><b>{order.order_number}</b><br /><small>{new Date(order.created_at).toLocaleString('id-ID')}</small></td>
            <td><b>{order.customer_name}</b><br /><small>{order.phone}</small></td>
            <td>{(order.items || []).map((item) => <div key={item.id}>{item.size} × {item.quantity}</div>)}</td>
            <td><b>{rupiah(order.total || 0)}</b><br /><small>{order.payment_method?.toUpperCase()}</small></td>
            <td><b>{order.courier || '-'}</b><br /><small>{order.service || '-'} • {rupiah(order.shipping_cost || 0)}</small></td>
            <td><select value={order.status} onChange={(event) => updateOrder(order, { status: event.target.value })}>
              {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{statusLabel(order, value, label)}</option>)}
            </select></td>
            <td><button className="detail-button" onClick={() => onDetail(order)}>Detail</button></td>
          </tr>)}</tbody>
        </table>
        : <div className="empty"><h3>Belum ada order</h3><p>Order baru akan muncul di sini.</p></div>}
    </div>
  </>;
}

function statusLabel(order, value, fallback) {
  if (value === 'pending') return order.payment_method === 'cod' ? 'Order baru (COD)' : 'Menunggu pembayaran';
  return fallback;
}

function OrderDetail({ order, onClose, onUpdate }) {
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [saving, setSaving] = useState(false);
  const phone = String(order.phone || '').replace(/\D/g, '').replace(/^0/, '62');
  const address = [order.address, order.city, order.province, order.postal_code].filter(Boolean).join(', ');
  const itemText = (order.items || []).map((item) => `${item.size} x ${item.quantity}`).join(', ');
  const messages = {
    confirm: `Halo ${order.customer_name}, pesanan ${order.order_number} sudah kami terima. Produk: ${itemText}. Total ${rupiah(order.total)}. Pesanan segera kami proses.`,
    process: `Halo ${order.customer_name}, pesanan ${order.order_number} sedang kami proses dan siapkan untuk pengiriman.`,
    ship: `Halo ${order.customer_name}, pesanan ${order.order_number} sudah dikirim melalui ${order.courier} ${order.service}.${tracking ? ` Nomor resi: ${tracking}.` : ''}`,
  };

  async function saveTracking() {
    setSaving(true);
    await onUpdate(order, { tracking_number: tracking });
    setSaving(false);
  }

  return <><button className="admin-detail-backdrop" onClick={onClose} aria-label="Tutup detail" />
    <aside className="admin-detail-drawer" aria-label={`Detail order ${order.order_number}`}>
      <div className="detail-drawer-head"><div><small>DETAIL PESANAN</small><h2>{order.order_number}</h2></div><button onClick={onClose} aria-label="Tutup">×</button></div>
      <div className="detail-drawer-body">
        <DetailSection title="Pelanggan">
          <DetailRow label="Nama" value={order.customer_name} />
          <DetailRow label="WhatsApp" value={order.phone} />
          <DetailRow label="Alamat" value={address} />
          <DetailRow label="Catatan" value={order.notes || '-'} />
        </DetailSection>
        <DetailSection title="Produk">
          {(order.items || []).map((item) => <div className="detail-item" key={item.id}><span><b>{item.size}</b><small>{item.name}</small></span><span>{item.quantity} × {rupiah(item.price)}</span></div>)}
          <DetailRow label="Berat" value={`${Number(order.total_weight || 0).toLocaleString('id-ID')} gram`} />
        </DetailSection>
        <DetailSection title="Pembayaran">
          <DetailRow label="Subtotal" value={rupiah(order.subtotal || 0)} />
          <DetailRow label={`Ongkir ${order.courier || ''} ${order.service || ''}`} value={rupiah(order.shipping_cost || 0)} />
          <DetailRow label="Estimasi" value={order.etd || '-'} />
          <DetailRow label="Metode" value={order.payment_method?.toUpperCase() || '-'} />
          <div className="detail-grand-total"><span>Total</span><b>{rupiah(order.total || 0)}</b></div>
        </DetailSection>
        <DetailSection title="Status & resi">
          <select className="detail-status" value={order.status} onChange={(event) => onUpdate(order, { status: event.target.value })}>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{statusLabel(order, value, label)}</option>)}
          </select>
          <div className="tracking-form"><input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Masukkan nomor resi" /><button onClick={saveTracking} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan resi'}</button></div>
        </DetailSection>
        <DetailSection title="Hubungi pelanggan">
          <div className="admin-wa-actions">
            <WaButton phone={phone} text={messages.confirm}>Konfirmasi order</WaButton>
            <WaButton phone={phone} text={messages.process}>Sedang diproses</WaButton>
            <WaButton phone={phone} text={messages.ship}>Kirim info resi</WaButton>
          </div>
        </DetailSection>
      </div>
    </aside>
  </>;
}

function DetailSection({ title, children }) { return <section className="detail-section"><h3>{title}</h3>{children}</section>; }
function DetailRow({ label, value }) { return <div className="detail-row"><span>{label}</span><b>{value}</b></div>; }
function WaButton({ phone, text, children }) { return <a href={`https://wa.me/${phone || WA}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">{children} ↗</a>; }

function ProductsPanel({ products, onSave }) { return <div className="admin-products">{products.map((product) => <ProductEditor key={product.id} product={product} onSave={onSave} />)}</div>; }

function ProductEditor({ product, onSave }) {
  const [form, setForm] = useState(product);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  function photo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1000000) return alert('Foto maksimal 1 MB');
    const reader = new FileReader();
    reader.onload = () => set('image', reader.result);
    reader.readAsDataURL(file);
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setSaved(await onSave(form)); setBusy(false); setTimeout(() => setSaved(false), 2500);
  }
  return <form className="panel product-editor" onSubmit={submit}>
    <div className="editor-photo"><img src={form.image} alt={form.size} /><label>Ganti foto<input type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} /></label></div>
    <div className="editor-fields"><div className="form-grid">
      <Field label="Nama paket"><input value={form.name} onChange={(event) => set('name', event.target.value)} required /></Field>
      <Field label="Ukuran"><input value={form.size} onChange={(event) => set('size', event.target.value)} required /></Field>
      <Field label="Harga jual"><input type="number" value={form.price} onChange={(event) => set('price', Number(event.target.value))} required /></Field>
      <Field label="Stok"><input type="number" value={form.stock ?? 0} onChange={(event) => set('stock', Number(event.target.value))} /></Field>
      <Field label="Isi paket" full><input value={form.detail} onChange={(event) => set('detail', event.target.value)} /></Field>
      <Field label="Keterangan harga" full><input value={form.unit} onChange={(event) => set('unit', event.target.value)} /></Field>
    </div><label className="admin-check"><input type="checkbox" checked={Boolean(form.popular)} onChange={(event) => set('popular', event.target.checked)} /> Tandai sebagai paling laris</label>
      <button disabled={busy} className="btn btn-primary">{busy ? 'MENYIMPAN…' : saved ? 'TERSIMPAN ✓' : 'SIMPAN PERUBAHAN'}</button></div>
  </form>;
}

function Field({ label, full, children }) { return <label className={`field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>; }

function Login({ onLogin, error: initialError }) {
  const [error, setError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    const pin = new FormData(event.currentTarget).get('pin');
    const response = await fetch('/api/admin/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || 'Login gagal.');
    await onLogin();
  }
  return <div className="app-page"><div className="checkout-shell"><form onSubmit={submit} className="panel admin-login">
    <div className="brand"><span>RULOXIUS</span><small>OWNER PANEL</small></div><h1>Masuk pemilik</h1><p>Gunakan PIN privat yang tersimpan di server.</p>
    <div className="field"><label>PIN admin</label><input name="pin" type="password" required autoFocus /></div>
    {error ? <p className="notice">{error}</p> : null}<button disabled={busy} className="btn btn-primary submit-order">{busy ? 'MEMERIKSA…' : 'MASUK CONTROL PANEL'}</button>
  </form></div></div>;
}
