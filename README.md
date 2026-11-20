# MochiBooth

Website photobooth bergaya Korea yang dibuat dengan HTML, CSS, dan JavaScript. Ambil foto dari kamera, pilih desain frame dan filter, lalu unduh photostrip dalam format PNG.

**[Coba MochiBooth](https://mochibooth-rosa.vercel.app)**

## Fitur

- Sesi 4 atau 6 foto, dengan mode otomatis maupun manual.
- Countdown 3 detik dan retake untuk setiap foto.
- 20 desain frame, termasuk Polkadot, Pinkie Ribbon, dan Analog Film.
- Filter Glow, Analog, Realistic Vintage, serta pengaturan intensitas.
- Pink Heart Crown yang mengikuti posisi dan kemiringan wajah.
- Flash layar; dukungan lampu kamera belakang bergantung pada perangkat.
- Tulisan, tanggal, dekorasi, serta layout strip atau dua kolom.
- Download PNG dan berbagi file pada browser yang mendukungnya.
- Tampilan responsif untuk desktop dan ponsel.

## Menjalankan secara lokal

Tidak memerlukan instalasi dependency atau backend. Dengan Python 3:

```sh
git clone https://github.com/rosaa-AI/mochibooth.git
cd mochibooth
python -m http.server 8080
```

Buka **http://localhost:8080**, mulai sesi, lalu izinkan akses kamera. Untuk penggunaan melalui ponsel, buka link demo HTTPS di atas. Jangan membuka `index.html` langsung sebagai file.

## Struktur project

```text
index.html
css/
  style.css
js/
  app.js
  camera.js
  editor.js
  photostrip.js
  face-tracking.js
  face-worker.js
assets/
  face-tracking/
```

## Privasi

Pengambilan foto, penerapan filter, dan pelacakan wajah dijalankan di browser. Foto disimpan sementara di memori selama sesi dan tidak diunggah ke server oleh aplikasi. Tema tersimpan di LocalStorage. Google Fonts dimuat dari layanan Google; tersedia font cadangan jika tidak dapat dimuat.

## Deployment

Project ini merupakan website statis. Untuk Vercel, pilih preset **Other**, tanpa build command, dan gunakan direktori root sebagai output. Tidak memerlukan environment variable atau database. Repository ini berisi kode website; deployment aktif tersedia melalui link demo.

## Dependensi pihak ketiga

Runtime dan model MediaPipe Tasks Vision disertakan secara lokal untuk filter Heart Crown. Rincian sumber dan lisensi tersedia di [SOURCE.md](assets/face-tracking/SOURCE.md) dan [LICENSE](assets/face-tracking/LICENSE).

## Verifikasi

Pemeriksaan sintaks JavaScript dapat dijalankan dengan Node.js:

```sh
node --check js/app.js
node --check js/camera.js
node --check js/editor.js
node --check js/photostrip.js
node --check js/face-tracking.js
node --check js/face-worker.js
```

Pengujian izin kamera, flash, dan performa pada ponsel tetap memerlukan perangkat asli.
