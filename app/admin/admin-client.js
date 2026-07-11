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
const EMPTY_PRODUCT = { name: '', size: '', detail: '', price: 0, compareAt: 0, saving: 0, unit: '', image: '', popular: false, active: true, stock: 0, weight: 1000 };

export default function AdminClient() {
  const [auth, setAuth] = useState(null);
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(PRODUCTS);
  const [faqs, setFaqs] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    let sessionConfirmed = false;
    try {
      const [orderResponse, productResponse, faqResponse] = await Promise.all([
        fetch('/api/orders', { cache: 'no-store' }),
        fetch('/api/products?admin=1', { cache: 'no-store' }),
        fetch('/api/faqs?admin=1', { cache: 'no-store' }),
      ]);
      if (orderResponse.status === 401) {
        setAuth(false);
        return;
      }
      sessionConfirmed = true;
      setAuth(true);
      const [orderData, productData, faqData] = await Promise.all([orderResponse.json(), productResponse.json(), faqResponse.json()]);
      if (!orderResponse.ok) throw new Error(orderData.error || 'Gagal memuat order');
      if (!productResponse.ok) throw new Error(productData.error || 'Gagal memuat produk');
      setOrders(orderData.orders || []);
      setProducts(productData.products || PRODUCTS);
      setFaqs(faqData.faqs || []);
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat data.');
      setAuth(sessionConfirmed ? true : false);
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

  async function createProduct(product) {
    setError('');
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Gagal menambahkan produk');
      return false;
    }
    setProducts((current) => [...current, data.product].sort((a, b) => a.price - b.price));
    return true;
  }

  async function deleteProduct(product) {
    if (!confirm(`Hapus ${product.name} ${product.size}? Produk yang pernah dipesan mungkin tidak dapat dihapus; nonaktifkan sebagai pilihan aman.`)) return false;
    const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Gagal menghapus produk'); return false; }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    return true;
  }

  async function saveFaq(faq, method = 'PUT') {
    const response = await fetch('/api/faqs', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(faq) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || 'Gagal menyimpan FAQ'); return false; }
    setFaqs((current) => method === 'POST' ? [...current, data.faq] : current.map((item) => item.id === faq.id ? data.faq : item));
    return true;
  }

  async function deleteFaq(id) {
    if (!confirm('Hapus FAQ ini?')) return;
    const response = await fetch(`/api/faqs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) setFaqs((current) => current.filter((item) => item.id !== id));
  }

  if (auth === null) return <div className="app-page"><div className="empty">Memeriksa sesi admin…</div></div>;
  if (!auth) return <Login error={error} onLogin={load} />;

  return <div className="app-page">
    <AdminHeader onLogout={async () => { await fetch('/api/admin/session', { method: 'DELETE' }); setAuth(false); }} />
    <div className="admin-shell">
      <div className="admin-title">
        <small>CONTROL PANEL PEMILIK</small>
        <h1>{tab === 'orders' ? 'Kelola pesanan' : tab === 'products' ? 'Kelola produk' : 'Kelola FAQ'}</h1>
        <p>{tab === 'orders' ? 'Pantau order, pengiriman, dan komunikasi pelanggan.' : tab === 'products' ? 'Atur foto, harga, stok, status, dan informasi produk.' : 'Atur pertanyaan dan jawaban yang tampil di halaman utama.'}</p>
      </div>
      <nav className="admin-tabs">
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Pesanan <b>{metrics.newOrders}</b></button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Produk</button>
        <button className={tab === 'faqs' ? 'active' : ''} onClick={() => setTab('faqs')}>FAQ</button>
      </nav>
      {error ? <p className="notice">{error}</p> : null}
      {tab === 'orders'
        ? <OrdersPanel loading={loading} metrics={metrics} shown={shown} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} updateOrder={updateOrder} onDetail={setSelectedOrder} />
        : tab === 'products' ? <ProductsPanel products={products} orders={orders} onSave={saveProduct} onCreate={createProduct} onDelete={deleteProduct} />
          : <FaqPanel faqs={faqs} onSave={saveFaq} onDelete={deleteFaq} />}
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

function ProductsPanel({ products, orders, onSave, onCreate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const sold = useMemo(() => { const result = {}; orders.filter((order) => order.status !== 'cancelled').forEach((order) => (order.items || []).forEach((item) => { result[item.id] = (result[item.id] || 0) + item.quantity; })); return result; }, [orders]);
  return <div className="admin-products-wrap">
    <div className="admin-products-head"><p>{products.filter((p) => p.active).length} aktif • {products.filter((p) => p.stock <= 5).length} stok menipis</p><button className="btn btn-primary" onClick={() => setAdding(true)}>+ TAMBAH PRODUK</button></div>
    {adding ? <ProductEditor product={EMPTY_PRODUCT} onSave={async (product) => {
      const created = await onCreate(product);
      if (created) setAdding(false);
      return created;
    }} isNew onCancel={() => setAdding(false)} /> : null}
    <div className="admin-products">{products.map((product) => <ProductEditor key={product.id} product={product} sold={sold[product.id] || 0} onSave={onSave} onDelete={onDelete} />)}</div>
  </div>;
}

function ProductEditor({ product, onSave, onDelete, sold = 0, isNew = false, onCancel }) {
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
  return <form className={`panel product-editor ${isNew ? 'new-product-editor' : ''}`} onSubmit={submit}>
    <div className="editor-photo">{form.image ? <img src={form.image} alt={form.size || 'Foto produk'} /> : <div className="editor-photo-placeholder"><b>＋</b><span>Foto produk</span></div>}<label>{form.image ? 'Ganti foto' : 'Pilih foto'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} required={isNew && !form.image} /></label></div>
    <div className="editor-fields"><div className="form-grid">
      <Field label="Nama paket"><input value={form.name} onChange={(event) => set('name', event.target.value)} required /></Field>
      <Field label="Ukuran"><input value={form.size} onChange={(event) => set('size', event.target.value)} required /></Field>
      <Field label="Harga jual"><input type="number" value={form.price} onChange={(event) => set('price', Number(event.target.value))} required /></Field>
      <Field label="Harga normal"><input type="number" value={form.compareAt ?? 0} onChange={(event) => set('compareAt', Number(event.target.value))} /></Field>
      <Field label="Stok"><input type="number" min="0" value={form.stock ?? 0} onChange={(event) => set('stock', Number(event.target.value))} required /></Field>
      <Field label="Berat pengiriman (gram)"><input type="number" min="1" value={form.weight ?? 1000} onChange={(event) => set('weight', Number(event.target.value))} required /></Field>
      <Field label="Isi paket" full><input value={form.detail} onChange={(event) => set('detail', event.target.value)} /></Field>
      <Field label="Keterangan harga" full><input value={form.unit} onChange={(event) => set('unit', event.target.value)} /></Field>
    </div><div className="product-admin-meta"><b>{form.stock <= 0 ? 'Stok habis' : form.stock <= 5 ? `⚠ Stok menipis: ${form.stock}` : `Stok aman: ${form.stock}`}</b><span>Terjual {sold}</span></div><label className="admin-check"><input type="checkbox" checked={Boolean(form.popular)} onChange={(event) => set('popular', event.target.checked)} /> Tandai sebagai paling laris</label><label className="admin-check"><input type="checkbox" checked={form.active !== false} onChange={(event) => set('active', event.target.checked)} /> Tampilkan produk di toko</label>
      <div className="product-editor-actions">{!isNew ? <button type="button" className="btn danger-button" onClick={() => onDelete(form)}>HAPUS</button> : <button type="button" className="btn btn-outline" onClick={onCancel}>BATAL</button>}<button disabled={busy} className="btn btn-primary">{busy ? 'MENYIMPAN…' : saved ? 'TERSIMPAN ✓' : isNew ? 'TAMBAHKAN PRODUK' : 'SIMPAN PERUBAHAN'}</button></div></div>
  </form>;
}

function FaqPanel({ faqs, onSave, onDelete }) {
  const [adding, setAdding] = useState(false);
  return <div className="faq-admin"><div className="admin-products-head"><p>{faqs.filter((faq) => faq.active).length} FAQ aktif</p><button className="btn btn-primary" onClick={() => setAdding(true)}>+ TAMBAH FAQ</button></div>{adding ? <FaqEditor faq={{ question: '', answer: '', position: faqs.length + 1, active: true }} onSave={async (faq) => { const ok = await onSave(faq, 'POST'); if (ok) setAdding(false); return ok; }} onCancel={() => setAdding(false)} /> : null}{faqs.map((faq) => <FaqEditor key={faq.id} faq={faq} onSave={onSave} onDelete={onDelete} />)}</div>;
}
function FaqEditor({ faq, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState(faq); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); await onSave(form); setBusy(false); }
  return <form className="panel faq-editor" onSubmit={submit}><Field label="Pertanyaan" full><input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required /></Field><Field label="Jawaban" full><textarea rows="4" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} required /></Field><div className="faq-editor-options"><Field label="Urutan"><input type="number" min="0" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></Field><label className="admin-check"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Tampilkan FAQ</label></div><div className="product-editor-actions">{onCancel ? <button type="button" className="btn btn-outline" onClick={onCancel}>BATAL</button> : <button type="button" className="btn danger-button" onClick={() => onDelete(form.id)}>HAPUS</button>}<button className="btn btn-primary" disabled={busy}>{busy ? 'MENYIMPAN…' : 'SIMPAN FAQ'}</button></div></form>;
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
