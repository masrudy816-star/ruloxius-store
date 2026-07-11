import './globals.css';
import Script from 'next/script';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default:'RULOXIUS Home Care — Pembersih Kerak Membandel', template:'%s | RULOXIUS' },
  description: 'Pembersih kerak kamar mandi, WC, dan keramik. Pesan RULOXIUS dengan mudah dan aman.',
  icons: { icon: '/icon.svg', shortcut: '/icon.svg' },
  openGraph:{title:'RULOXIUS Home Care',description:'Kerak tuntas, kamar mandi kilap.',type:'website',locale:'id_ID',images:['/images/product-hero.png']},
  twitter:{card:'summary_large_image',title:'RULOXIUS Home Care',description:'Kerak tuntas, kamar mandi kilap.',images:['/images/product-hero.png']},
};

export default function RootLayout({ children }) {
  const metaPixel=process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const tiktokPixel=process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  return <html lang="id"><body>{children}{metaPixel?<Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel}');fbq('track','PageView');`}</Script>:null}{tiktokPixel?<Script id="tiktok-pixel" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var q=w[t]=w[t]||[];q.load=function(e){var i=d.createElement('script');i.async=!0;i.src='https://analytics.tiktok.com/i18n/pixel/events.js?sdkid='+e;d.head.appendChild(i)};q.load('${tiktokPixel}');q.page=function(){q.push(['page'])};q.track=function(){q.push(['track'].concat([].slice.call(arguments)))};q.page()}(window,document,'ttq');`}</Script>:null}</body></html>;
}
