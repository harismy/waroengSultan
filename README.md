# Toko Kue Basah - Waroeng Sultan

Website katalog dan admin sederhana untuk kue basah, dengan database SQLite.

## Fitur
- Halaman utama: katalog kue, detail, dan pemesanan via WhatsApp
- Admin: login, tambah/edit/hapus kue
- Upload gambar kue

## Prasyarat
- Node.js (disarankan LTS)
- npm

## Instalasi
```
npm install
```

## Menjalankan Server
```
npm run start
```
atau (development)
```
npm run dev
```

Akses:
- Website: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Default Admin
- Username: `admin`
- Password: `waroengsultanUjhe`

> Catatan: Akun admin default hanya dibuat jika belum ada data admin di database.

## Struktur Folder
- `backend/` API dan database
- `frontend/` HTML, CSS, JS

## Catatan Upload Gambar
File gambar disimpan di `backend/uploads/` dan sudah di-ignore oleh git.

