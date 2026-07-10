import CheckoutClient from './checkout-client';
import { Suspense } from 'react';

export const metadata = { title: 'Checkout | RULOXIUS' };
export default function CheckoutPage() { return <Suspense fallback={<div className="empty">Memuat checkout…</div>}><CheckoutClient /></Suspense>; }
