# WebGIS Surabaya – Fasilitas Darurat & Keuangan

WebGIS berbasis Leaflet yang menampilkan fasilitas darurat (polisi, RS, damkar, klinik) dan fasilitas keuangan (bank, ATM) di Kota Surabaya.

## Fitur
| Fitur | Halaman | Keterangan |
|---|---|---|
| Peta interaktif + cluster + popup | `index.html` | Data OSM (509 fasilitas) + batas Kota Surabaya |
| Pencarian fasilitas | `index.html` (panel kiri) | Validasi: wajib diisi, min. 3 karakter, tanpa karakter khusus |
| Login admin | `login.html` | Akun demo: `admin` / `Surabaya123` |
| Tambah fasilitas (admin) | `index.html` → tombol **Tambah Fasilitas** | Validasi nama, kategori, angka koordinat, dan koordinat harus di dalam Surabaya |

## Struktur
```
index.html            -> halaman peta
login.html            -> halaman login admin
css/style.css
js/auth.js            -> logika login (sessionStorage)
js/app.js             -> logika peta, pencarian, tambah fasilitas
js/login.js           -> logika halaman login
data/fasilitas_surabaya.js   -> data fasilitas (dimuat via <script>, aman untuk file://)
data/batas_surabaya.js       -> batas kota (validasi koordinat)
data/*.geojson               -> data mentah GeoJSON
```

## Menjalankan
- **Lokal:** cukup buka `index.html` di browser (butuh internet untuk peta dasar & library CDN).
- **Deploy (Vercel / GitHub Pages / Netlify):** upload isi folder ini (folder yang berisi `index.html`) sebagai root. Tidak perlu build command.

Lihat `Readme.txt` untuk lisensi data OpenStreetMap.
