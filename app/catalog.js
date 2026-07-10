export const PRODUCTS = [
  { id: '500ml', name: 'Botol Praktis', size: '500ML', detail: '1 botol bulat ukuran 500ML', price: 28000, compareAt:32000, saving:4000, unit:'Ringkas untuk coba pertama', image: '/images/product-500ml-v2.png' },
  { id: '1000ml', name: 'Jerigen Andalan', size: '1000ML', detail: '1 botol jerigen ukuran 1000ML', price: 38000, compareAt:42000, saving:4000, unit:'Isi lebih banyak, lebih puas', image: '/images/product-1000ml-v2.png' },
  { id: 'bundle', name: 'Paket Hemat', size: '500ML + 1000ML', detail: '1 botol bulat + 1 jerigen', price: 60000, compareAt:66000, saving:6000, unit:'Paket lengkap paling hemat', image: '/images/product-bundle-v2.png', popular: true },
];

export const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
