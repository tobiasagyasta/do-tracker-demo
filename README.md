# DO Tracker Demo

Frontend-only MVP untuk demonstrasi alur operasional Delivery Order, Mitra, invoice penjualan, bukti pembayaran Mitra, dan laporan transaksi.

## Getting Started

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` dan gunakan sidebar untuk mengakses modul demo.

## MVP Features

- Dashboard ringkas untuk status DO, outstanding, penjualan, dan margin operasional.
- DO Tracker untuk mencari, memfilter, dan membuka detail Delivery Order.
- Mitra Management Demo untuk master data Mitra berbasis state lokal.
- DO Lifecycle untuk simulasi pembayaran Mitra, pembuatan invoice, dan pembayaran Tambang.
- Invoice Maker dengan auto-fill data dari Delivery Order.
- Invoice PDF berbasis `jsPDF` dan `jspdf-autotable`.
- Bukti Pembayaran Mitra dengan preview dan download PDF.
- Reports / CSV Export untuk laporan DO, pembelian dibayar, dan penjualan dibayar.

## Demo Limitations

- Menggunakan static/mock data.
- Tidak ada backend persistence.
- Tidak ada authentication atau role permission.
- Tidak ada formal accounting engine.
- Tidak ada pembayaran nyata atau rekonsiliasi bank.
- Tidak mendukung invoice gabungan multi-DO.

## Future Backend Integration

- Integrasi backend NestJS.
- Database PostgreSQL.
- Authentication dan authorization.
- Model data normalized untuk Partner, Customer/Tambang, Delivery Order, Invoice, dan Payment.
- Modul accounting setelah discovery SOP finance, termasuk jurnal, ledger, dan laporan keuangan formal.
