# PRD — [Nama Project Sementara: mana-mo-manabu-monster]

> Catatan: nama project ini masih sementara, akan diganti kemudian. Dokumen ini generik terhadap nama, fokus ke stack, schema, dan konvensi kode.

## 1. Overview

Backend API untuk aplikasi e-commerce sederhana (toko/kedai), meng-handle:
- Autentikasi & manajemen user
- Katalog produk (dengan kategori)
- Order & pembayaran (integrasi Midtrans, mendukung guest checkout)

Backend dibangun dengan NestJS, menggunakan Prisma sebagai ORM dan Zod sebagai satu-satunya sumber kebenaran untuk validasi + tipe data (schema-first, bukan class-based DTO manual).

## 2. Tech Stack

| Kategori | Teknologi |
|---|---|
| Framework | NestJS 11 (TypeScript 5.7) |
| ORM | Prisma 7.9 — `provider = "prisma-client"`, custom `output` ke `../generated/prisma` (bukan default `node_modules/@prisma/client`) |
| Database | PostgreSQL |
| Validasi & Tipe | Zod v4 + `nestjs-zod` — schema Zod jadi validasi runtime *dan* sumber tipe TypeScript (via `z.infer`), **tidak ada DTO class manual terpisah** |
| Auth | JWT manual (bcrypt untuk hash password + custom `AuthService` untuk generate/verify token). `@clerk/backend` ada di dependencies tapi belum dipakai — keputusan final soal Clerk vs JWT manual masih perlu dikonfirmasi ke user sebelum implementasi auth module |
| Payment | `midtrans-client` (Snap token, mode simulasi/sandbox) |
| Logging | `nest-winston` |
| API Docs | `@nestjs/swagger` + `swagger-ui-express` |
| Testing | Jest + ts-jest |
| Utilities | `slugify`, `uuid` |

**Catatan Prisma driver adapter:** dependencies punya `@prisma/adapter-mariadb` DAN `@prisma/adapter-pg` sekaligus. Datasource di schema pakai `provider = "postgresql"`, jadi seharusnya cuma `@prisma/adapter-pg` yang dipakai — `@prisma/adapter-mariadb` kemungkinan sisa dari project sebelumnya dan boleh dihapus dari dependencies kecuali ada rencana multi-database.

**Catatan migration:** developer akan menjalankan `prisma migrate` / `prisma generate` secara manual sendiri. AI/tool yang membantu coding **tidak perlu** menjalankan command migrasi — cukup fokus menulis kode aplikasi.

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  USER
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  EXPIRED
}

model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  password String
  name     String
  role     Role     @default(USER)
  orders   Order[]
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String
  products Product[]
}

model Product {
  id         Int         @id @default(autoincrement())
  name       String
  price      Int
  image      String?
  categoryId Int
  category   Category    @relation(fields: [categoryId], references: [id])
  orderItems OrderItem[]
}

model Order {
  id            Int           @id @default(autoincrement())
  userId        Int?
  user          User?         @relation(fields: [userId], references: [id])
  customerName  String?
  totalAmount   Int
  snapToken     String?
  paymentStatus PaymentStatus @default(PENDING)
  createdAt     DateTime      @default(now())
  items         OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  qty       Int
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}
```

## 4. Konvensi Kode (WAJIB diikuti)

### 4.1 Struktur folder per module
```
src/
  common/
    prisma.service.ts       # extends PrismaClient, pakai adapter
    validation.service.ts   # helper generic buat .parse() Zod schema
    auth/
      auth.service.ts       # generate & verify JWT
    roles.enum.ts
  <module>/                 # user, product, category, order
    <module>.controller.ts
    <module>.service.ts
    <module>.validation.ts  # Zod schema + inferred types, SATU-SATUNYA sumber tipe
    <module>.module.ts
    <module>.service.spec.ts
```

### 4.2 Pattern validasi (Zod schema-first, TIDAK ADA model/DTO terpisah)

Jangan buat file `*.model.ts` berisi interface manual untuk request yang divalidasi. Semua request type di-infer langsung dari Zod schema di file `*.validation.ts`. Response type (shape output, tidak divalidasi) boleh berupa interface manual biasa.

```ts
// <module>.validation.ts
import { z } from 'zod';

export class UserValidation {
  static readonly REGISTER = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  static readonly LOGIN = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });

  static readonly UPDATE = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  });
}

export type RegisterUserRequest = z.infer<typeof UserValidation.REGISTER>;
export type LoginUserRequest = z.infer<typeof UserValidation.LOGIN>;
export type UpdateUserRequest = z.infer<typeof UserValidation.UPDATE>;
```

Pemakaian di service:
```ts
const registerRequest = this.validationService.validate(
  UserValidation.REGISTER,
  request,
);
```

### 4.3 Pattern service

- Constructor inject: `ValidationService`, `PrismaService`, Winston `Logger` (via `@Inject(WINSTON_MODULE_PROVIDER)`), dan service lain yang relevan (`AuthService`, dll).
- Setiap method public: log debug di awal, validasi input via `ValidationService`, cek business rule (contoh: email sudah terdaftar → `HttpException`), lalu akses `PrismaService`.
- Password selalu di-hash pakai `bcrypt` sebelum disimpan.
- Response selalu dibentuk eksplisit (jangan return raw Prisma model) supaya field sensitif (password) tidak ikut ke response.

### 4.4 Import Prisma Client

Karena `output` custom, import selalu dari path relatif ke folder generated, **bukan** `@prisma/client`:
```ts
import { PrismaClient, Prisma } from '../../generated/prisma/client';
```

## 5. Modules & Endpoints

### 5.1 User Module (Auth)
| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/users/register` | POST | Public | Registrasi user baru, role default `USER` |
| `/users/login` | POST | Public | Login, return JWT token |
| `/users/current` | GET | Bearer token | Get profil user login |
| `/users/current` | PATCH | Bearer token | Update profil (name/email/password, semua optional) |

Business rules:
- Email harus unik saat register.
- Password minimal 6 karakter.
- Login gagal → `401` dengan pesan generik ("Email or password is wrong"), jangan bocorkan mana yang salah (email atau password).

### 5.2 Category Module
| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/categories` | POST | Bearer token, role ADMIN | Buat kategori |
| `/categories` | GET | Public | List semua kategori |
| `/categories/:id` | PATCH | Bearer token, role ADMIN | Update kategori |
| `/categories/:id` | DELETE | Bearer token, role ADMIN | Hapus kategori |

### 5.3 Product Module
| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/products` | POST | Bearer token, role ADMIN | Buat produk |
| `/products` | GET | Public | List produk, support filter by category, pagination |
| `/products/:id` | GET | Public | Detail produk |
| `/products/:id` | PATCH | Bearer token, role ADMIN | Update produk |
| `/products/:id` | DELETE | Bearer token, role ADMIN | Hapus produk |

### 5.4 Order Module
| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/orders` | POST | Public (opsional login) | Buat order — kalau login, `userId` diisi dari token; kalau tidak, wajib isi `customerName`. Hitung `totalAmount` dari `items` di server (jangan percaya total dari client). Generate Midtrans Snap token. |
| `/orders/:id` | GET | Public / owner | Detail order + status pembayaran |
| `/orders` | GET | Bearer token, role ADMIN | List semua order (untuk dashboard admin) |
| `/orders/webhook/midtrans` | POST | Midtrans signature verification | Callback update `paymentStatus` berdasarkan notifikasi Midtrans |

Business rules:
- Guest checkout: `userId` nullable, `customerName` wajib diisi kalau tidak login.
- `totalAmount` dihitung ulang di server dari harga produk × qty, tidak dipercaya dari input client.
- `paymentStatus` default `PENDING`, diupdate lewat webhook Midtrans (bukan diubah manual dari endpoint biasa).
- Validasi signature/notifikasi dari Midtrans sebelum update status (cegah spoofing).

## 6. Non-Functional Requirements
- Semua endpoint yang butuh auth pakai Bearer JWT, divalidasi via guard (`AuthGuard` + `RolesGuard` untuk endpoint role-restricted).
- Swagger docs aktif di semua endpoint (`@nestjs/swagger`).
- Logging pakai Winston untuk semua operasi penting (register, login, create order, payment callback).
- Semua validasi input via Zod schema di layer service (bukan cuma di controller/pipe).

## 7. Out of Scope / Keputusan yang Masih Terbuka
- **Auth strategy final**: JWT manual (sudah mulai diimplementasi) vs migrasi ke Clerk (dependency sudah ada tapi belum dipakai). Perlu diputuskan sebelum lanjut ke module lain yang bergantung pada identitas user.
- Prisma driver adapter: pastikan hanya `@prisma/adapter-pg` yang dipakai (datasource = postgresql), evaluasi apakah `@prisma/adapter-mariadb` perlu dihapus dari dependencies.
- Deployment target (Railway/VPS/dll) belum ditentukan.
- Migrasi database (`prisma migrate`) dijalankan manual oleh developer, di luar scope kode aplikasi.