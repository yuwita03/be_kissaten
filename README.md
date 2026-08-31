# Neko Kissaten (猫喫茶)

Full-stack e-commerce demo bertema kedai kopi Jepang. Dua repo terpisah (bukan monorepo): `be-kissaten` (backend) dan `fe-kissaten` (frontend).

> Demo publik — data direset otomatis tiap 3 jam ke kondisi seed awal. Pembayaran memakai Midtrans **sandbox** (simulasi, bukan transaksi nyata).

**Live:**
- Frontend: `https://kissaten-orcin.vercel.app`
- Backend API: `https://kissatenbe-production.up.railway.app`
- API Docs (Swagger): `https://kissatenbe-production.up.railway.app/api/docs`

**Akun demo:**
| Role | Email | Password |
|---|---|---|
| Admin | `admin@kissaten.jp` | `adminpassword123` |
| User | `user@kissaten.jp` | `userpassword123` |

---

## Backend — `be-kissaten`

### Tech Stack
- **NestJS** — framework utama
- **Prisma ORM** + **PostgreSQL** (`@prisma/adapter-pg`)
- **JWT** (Passport strategy) + **Guards** (Auth & Role-based)
- **Zod** (`nestjs-zod`) — validasi request, bukan `class-validator`
- **Midtrans Snap** — payment gateway
- **Winston** — structured logging
- **Swagger** — dokumentasi API otomatis
- **Helmet** — security headers
- **@nestjs/throttler** — rate limiting
- **@nestjs/schedule** — cron job

### Struktur Module
```
src/
├── user/       — register, login, profile
├── product/    — CRUD produk (admin), list & search (public)
├── category/   — kategori produk
├── order/      — checkout, riwayat order, webhook Midtrans
├── cart/       — cart per user (login only)
├── reset/      — cron auto-reset database tiap 3 jam
└── common/     — PrismaService, ValidationService, Auth (Guards, Strategy)
```

### Skema Database
```
User (id, email, password, name, role: ADMIN|USER)
Category (id, name)
Product (id, name, price, image, categoryId)
Order (id, userId?, customerName, totalAmount, snapToken, paymentStatus, createdAt)
OrderItem (id, orderId, productId, qty)
Cart (id, userId [unique])
CartItem (id, cartId, productId, qty)
```
Role bukan tabel terpisah — cukup kolom `role` di `User`. Order boleh tanpa `userId` (guest checkout).

### Autentikasi & Otorisasi
- JWT manual (bukan session), token dicek lewat `AuthGuard` (Passport `jwt` strategy)
- `RolesGuard` + `@Roles(Role.ADMIN)` decorator buat endpoint admin-only
- Register selalu hardcode `role: USER` — field `role` tidak ada di schema Zod register, jadi tidak bisa di-override lewat request body (dicek & aman dari privilege escalation)

### Payment Flow (Midtrans)
1. `POST /orders` → order dibuat status `PENDING`, `order_id` yang dikirim ke Midtrans digabung timestamp (`{orderId}-{timestamp}`) supaya selalu unik meski ID Order kembali ke angka kecil setelah auto-reset
2. Snap token disimpan di `Order.snapToken`, dipakai FE untuk buka popup Midtrans
3. Midtrans kirim notifikasi ke `POST /orders/webhook/midtrans` — signature diverifikasi (SHA512) sebelum status order diupdate jadi `PAID`/`FAILED`
4. Kalau user tutup popup tanpa bayar, order tetap `PENDING` — FE punya tombol "Bayar Sekarang" di halaman Order History yang membuka ulang Snap pakai `snapToken` yang sama

### Auto-Reset (Cron)
`@Cron(CronExpression.EVERY_3_HOURS)` di `ResetService`:
```sql
TRUNCATE TABLE "CartItem","Cart","OrderItem","Order","Product","Category","User"
RESTART IDENTITY CASCADE;
```
`RESTART IDENTITY` memastikan auto-increment ID balik ke 1, bukan cuma `DELETE` (yang tidak reset sequence). Setelah truncate, data seed (admin, user, kategori, produk) dibuat ulang.

### Security
- **Helmet** — CSP, X-Frame-Options, HSTS, dll, dengan whitelist domain eksternal (Cloudinary, Unsplash, Midtrans sandbox)
- **Rate limiting** — global 30 req/menit; endpoint `login`/`register` diperketat jadi 5 req/menit via `@Throttle`
- **`.env` tidak pernah masuk Git** (dicek lewat `git log --all --full-history`)
- Hasil scan securityheaders.com: header lengkap terpasang di kedua layer (BE & FE)

### Testing
Unit test (Jest) untuk service dengan business logic:
- `CartService` — tambah/update/hapus item, hitung total, error handling (produk/item tidak ditemukan)
- `UserService` — register (termasuk verifikasi role selalu `USER`), login, update profil (termasuk conflict email)

Pola: mock `PrismaService` & dependency lain manual (bukan `TestingModule` penuh), fokus ke isolasi logic per method.

---

## Frontend — `fe-kissaten`

### Tech Stack
- **React + Vite + TypeScript**
- **Tailwind CSS**
- **Zustand** — state management (Auth, Cart, Product, Order), migrasi dari Context API
- **React Router**
- **Midtrans Snap.js** — loaded via script tag di `index.html`

### Struktur
```
src/
├── pages/       — Home, Menu, Story, Contact, Admin, Login, History
├── components/  — Navbar, Footer, ProductCard, CartDrawer, VideoHero, dll
├── store/       — Zustand stores (authStore, cartStore, productStore, orderStore)
├── service/     — HTTP layer per domain (product, category, order, user)
├── context/     — ThemeContext (dark/light — tetap pakai Context API)
└── lib/         — api.ts (axios instance, base URL dari VITE_API_URL)
```

### State Management
- **Zustand** untuk state yang butuh dipakai lintas komponen & persist logic (cart, auth, product list, order)
- **Context API** dipertahankan khusus untuk `ThemeContext` (state sederhana, jarang berubah)
- Search & filter kategori di halaman Menu dikirim ke server (bukan filter di client-side), pakai debounce 400ms

### Performance
- **Code splitting** per halaman lewat `React.lazy` + `Suspense` — halaman berat (Admin) tidak ikut ter-load di bundle awal
- Video Hero: satu elemen `<video>` (sebelumnya duplikat 2x untuk light/dark tema), URL Cloudinary dengan transformasi (`q_70,w_1920,c_limit,vc_h264`), `poster` image, `preload="metadata"`
- Gambar produk: `loading="lazy"`, sumber Unsplash dengan `auto=format` (auto-serve WebP/AVIF)
- Skor PageSpeed (mobile) naik dari 58 → 72+ setelah optimasi di atas

### Auth Flow
- Login → JWT disimpan, auto-attach ke request lewat interceptor `api.ts`
- Checkout: kalau user login, nama otomatis terisi dari akun (read-only); guest tetap isi manual
- Order History: order status `PENDING` bisa dibayar ulang lewat `snapToken` yang sama tanpa membuat order baru

---

## Deployment

| | Platform | Catatan |
|---|---|---|
| Backend | Railway | PostgreSQL managed di project yang sama; env var `DATABASE_URL` pakai reference `${{Postgres.DATABASE_URL}}` |
| Frontend | Vercel | Auto-deploy dari branch `main`; env var `VITE_API_URL` menunjuk ke URL Railway |

Kedua repo di-mirror ke dua akun GitHub berbeda (dual remote: `origin` & `origin2`) sebagai backup.

### Environment Variables (Backend)
```
DATABASE_URL
JWT_SECRET
MIDTRANS_SERVER_KEY_SANDBOX / MIDTRANS_CLIENT_KEY_SANDBOX
MIDTRANS_SERVER_KEY_PROD / MIDTRANS_CLIENT_KEY_PROD   (diisi sandbox juga — Railway force NODE_ENV=production di level container, tidak bisa di-override dari UI)
NODE_ENV
```

### Environment Variables (Frontend)
```
VITE_API_URL
```

---

## Catatan Desain/Trade-off

- **Cart disimpan client-side** (Zustand, bukan tabel `Cart` di server) untuk guest — tabel `Cart`/`CartItem` di database hanya dipakai untuk user yang login, sengaja tidak sinkron lintas device demi menjaga scope demo tetap simpel
- **CORS `origin: true`** — sengaja longgar karena ini demo publik, bukan API privat
- **Midtrans PROD key diisi sandbox** — workaround karena Railway memaksa `NODE_ENV=production` di level platform, bukan bug aplikasi
