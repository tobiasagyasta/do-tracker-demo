# DO Tracker Demo

Frontend-only MVP untuk demonstrasi alur operasional Delivery Order, Mitra, invoice penjualan, bukti pembayaran Mitra, dan laporan transaksi.

## Getting Started

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` dan gunakan sidebar untuk mengakses modul demo.

Untuk showcase invoice gabungan, buka `/invoices/new`, pilih customer **PT Karya Bara Indonesia**, lalu pilih transaksi dari **DO KBD**, **DO ATIONG/TEAP**, dan **DO CMK/NIASO** (12 SPB yang sudah dibayar Mitra dan belum di-invoice). Jika pernah membuka demo sebelumnya, klik **Reset Demo Data** agar seed baru menggantikan data yang tersimpan di browser.

## MVP Features

- Dashboard ringkas untuk status DO, outstanding, penjualan, dan margin operasional.
- DO Tracker untuk mencari, memfilter, dan membuka detail Delivery Order.
- Mitra Management Demo untuk master data Mitra berbasis state lokal.
- DO Lifecycle untuk simulasi pembayaran Mitra, pembuatan invoice, dan pembayaran Tambang.
- Invoice Maker untuk memilih transaksi dari beberapa Delivery Order milik satu customer.
- Invoice PDF berbasis `jsPDF` dan `jspdf-autotable`.
- Bukti Pembayaran Mitra dengan preview dan download PDF.
- Reports / CSV Export untuk laporan DO, pembelian dibayar, dan penjualan dibayar.

## Demo Limitations

- Menggunakan static/mock data.
- Tidak ada backend persistence.
- Tidak ada authentication atau role permission.
- Tidak ada formal accounting engine.
- Tidak ada pembayaran nyata atau rekonsiliasi bank.

## Future Backend Integration

- Integrasi backend NestJS.
- Database PostgreSQL.
- Authentication dan authorization.
- Model data normalized untuk Partner, Customer/Tambang, Delivery Order, Invoice, dan Payment.
- Modul accounting setelah discovery SOP finance, termasuk jurnal, ledger, dan laporan keuangan formal.
