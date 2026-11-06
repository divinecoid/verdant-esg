# Rencana Aplikasi ESG Monitoring System

## 1. Tujuan
Aplikasi web untuk mengelola data ESG (Environmental, Social, Governance) end-to-end: meminta data dari perusahaan portofolio (investee), menghitung emisi/metrik, mereviu, lalu menampilkannya dalam laporan, dengan jejak audit yang lengkap.

**Pengguna utama**
- **ESG Team (reviewer/admin)**: kirim permintaan data, review, approve/minta revisi, kelola master data.
- **Portfolio Company (investee)**: mengisi data periodik/ad hoc, simpan draft, submit final.
- **Management/Viewer**: melihat dashboard dan laporan output.

## 2. Modul Fitur (dari pitch deck)
| # | Modul | Ringkasan |
|---|-------|-----------|
| 1 | Dashboard | KPI outstanding data, status data request & review, Asset Monitor List, grafik bar per status |
| 2 | ESG Output Report | Laporan per investee per periode; tab Environmental/Social/Governance/History/Attachments; tabel + grafik emisi (Scope 1/2/3, per sumber); export PDF; related portfolio & konsolidasi |
| 3 | Minutes of Meeting | CRUD notulen per investee/tahun + lampiran + contact person |
| 4 | Task Inbox | Daftar pending review (filter, sort, paginasi) |
| 5 | Metrics Management | Mapping tema & metrik ESG per perusahaan (versi, aktif/nonaktif); master list metrik |
| 6 | ESG Data Request | Ad hoc (dialog kirim permintaan), Periodic (pending/completed list, form input dengan progress %, Save Draft / Final Submit), Review (Approved / Need Revision + remarks + history approval) |
| 7 | Calculation Result | Jalankan kalkulasi, daftar hasil, detail (source, scope, unit, emission factor, hasil) |
| 8 | Master Data | ESG Theme, ESG Metric, Formula (dengan simulasi), Data Input Attribute, Emission Factor, Base Year GHG |
| 9 | Configuration | Parameter umum (deadline input, email reviewer 1 & 2) dan jadwal data capture |
| 10 | Master Company & Project | CRUD perusahaan (holding/parent, sektor, kontak) dan proyek/aset terkait (kepemilikan %, modal investasi) |
| 11 | Audit Trail | Log semua perubahan: objek, tipe, waktu UTC, pelaku, nilai lama vs baru; export Excel |

## 3. Alur Bisnis Inti
1. ESG Team mengatur **Metrics Management**: pilih tema & metrik per perusahaan.
2. Sistem membuat **Periodic Data Request** sesuai jadwal (bulanan/kuartalan/tahunan), atau ESG Team kirim **Ad Hoc**.
3. Investee dapat notifikasi, mengisi metrik (E/S/G + lampiran), simpan draft, lalu **Final Submit**.
4. Masuk **Task Inbox** reviewer: Review 1 → Review 2 (konfigurasi email reviewer). Status: Pending → On Going → Approved / Need Revision.
5. Jika Need Revision, kembali ke investee (resubmission).
6. Setelah Approved, **Calculation** menghitung hasil dengan Formula + Emission Factor + Base Year.
7. Hasil tampil di **Dashboard** dan **ESG Output Report** (export PDF).
8. Semua perubahan tercatat di **Audit Trail**.

**Status data request**: Not Started → On Going → Submitted → (Pending Review) → Approved / Need Revision.

## 4. Model Data (entitas utama)
- `User`, `Role`, `Permission`
- `Company` (kode, nama, tipe holding/asset, parent, sektor), `CompanyContact`
- `Project` (nama, sektor, % kepemilikan, modal investasi, tanggal investasi/closing), `ProjectAsset`
- `EsgTheme` (kode, nama, grup E/S/G, status), `EsgMetric` (kode, nama, tema, scope, unit, status)
- `CompanyMetricMapping` (company, tema/metrik, versi, aktif)
- `DataInputAttribute` (kode, nama, unit, tipe data, status)
- `Formula` (kode, nama, ekspresi, metrik), `EmissionFactor` (+ nilai per tahun), `BaseYearGhg` (tahun, nilai, kode, status)
- `DataRequest` (nomor, referensi, tipe periodic/ad hoc, company, frekuensi, periode, due date, status, progress)
- `DataRequestValue` (request, metrik/atribut, nilai, unit, status data, deskripsi, komentar), `Attachment`
- `ReviewApproval` (request, reviewer, level, status, remarks, timestamp)
- `CalculationRun`, `CalculationResultLine`
- `MinutesOfMeeting` (company, tanggal, notes, lampiran)
- `AppConfig` (code, value, description), `CaptureSchedule`
- `AuditLog` (objek, aksi, user, waktu UTC, `AuditLogLine` old/new value)

## 5. Arsitektur & Tech Stack (usulan)
- **Frontend**: React + TypeScript (Vite), TanStack Table/Query, React Hook Form + Zod, Recharts, Tailwind. Tema hijau mengikuti pitch deck, sidebar kiri, tabel dengan filter kolom.
- **Backend**: Node.js (NestJS) + TypeScript, REST API, validasi DTO.
- **Database**: PostgreSQL + Prisma; migrasi terversi.
- **Auth**: JWT/OIDC + RBAC (ESG Team, Investee, Viewer), scoping data per company.
- **Formula engine**: parser ekspresi aman (mis. `expr-eval`/`mathjs` tersandbox), variabel dari Data Input Attribute, Emission Factor, Base Year; endpoint simulasi.
- **Background jobs**: BullMQ/cron untuk generate periodic request, reminder deadline, email.
- **Penyimpanan file**: S3-compatible (lampiran, notulen).
- **Laporan**: render PDF (Playwright/Puppeteer) dari halaman laporan; export Excel (audit trail).
- **Audit**: middleware/Prisma extension yang otomatis menulis `AuditLog` pada setiap create/update/delete.
- **Integrasi**: adapter sinkronisasi master data company/project dari sistem Portfolio Monitoring eksternal (job terjadwal + manual sync). Pada fase awal gunakan seed/import CSV.
- **Infra**: Docker Compose untuk dev; CI untuk lint/test/build.

## 6. Fase Pengerjaan
**Fase 0 – Fondasi (1 minggu)**: repo monorepo, CI, Docker, skema DB awal, auth + RBAC, layout (sidebar/topbar), komponen tabel & form bersama.

**Fase 1 – Master & Konfigurasi (1–2 minggu)**: Master Company & Project, ESG Theme/Metric, Data Input Attribute, Emission Factor, Base Year, General Configuration, Audit Trail (infrastruktur logging dari awal).

**Fase 2 – Formula & Metrics Mapping (1–2 minggu)**: Formula Master + simulasi, Metrics Management (mapping, versi, aktif/nonaktif).

**Fase 3 – Data Request & Review (2–3 minggu)**: Periodic & Ad Hoc request, form input E/S/G dengan progress/draft/submit, lampiran, Task Inbox, review 2 level + history, notifikasi email, scheduler.

**Fase 4 – Kalkulasi & Laporan (2 minggu)**: Run Calculation, Calculation Result list/detail, ESG Output Report (tabel + grafik Scope 1/2/3, export PDF, konsolidasi portfolio).

**Fase 5 – Dashboard, MoM, Polish (1–2 minggu)**: Dashboard KPI & grafik, Minutes of Meeting, export Excel audit trail, hardening, UAT, dokumentasi.

Total estimasi: ±8–12 minggu untuk tim kecil (2–3 dev).

## 7. Non-Fungsional
- Keamanan: RBAC, data isolation per company, validasi input, rate limiting, enkripsi at-rest/in-transit, log akses.
- Audit-ready: log immutable (append-only), timestamp UTC, nilai lama/baru.
- Performa: paginasi server-side, indeks pada company/periode/status.
- Kualitas: unit test formula engine, e2e test alur submit → review → kalkulasi → laporan.
- Lokalisasi: UI Inggris dulu; siapkan i18n (ID/EN), format angka/tanggal.

## 8. Risiko & Pertanyaan Terbuka
1. Standar pelaporan yang diacu (GRI, SASB, TCFD, GHG Protocol)? Menentukan daftar tema/metrik awal.
2. Detail integrasi dengan sistem Portfolio Monitoring eksternal (API tersedia atau cukup import)?
3. Jumlah level reviewer: tetap 2 atau dinamis?
4. Skala: berapa investee dan pengguna? Multi-tenant atau single organisasi?
5. Sumber nilai emission factor (publik/regulator) dan kebijakan pembaruan tahunan.
6. Kebutuhan bahasa, SSO, dan hosting (cloud/on-prem).

## 9. Langkah Berikutnya
1. Konfirmasi stack dan jawaban pertanyaan terbuka di atas.
2. Buat wireframe/prototype layar utama (Dashboard, Data Request form, Review, Report).
3. Mulai Fase 0.
