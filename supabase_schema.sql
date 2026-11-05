-- =============================================================
-- Kas Kelas SD — Supabase / PostgreSQL Schema
-- Jalankan sekali di SQL Editor Supabase.
-- RLS dinonaktifkan secara default; aktifkan manual bila diperlukan.
-- =============================================================

-- Ekstensi
create extension if not exists "uuid-ossp";

-- Enum
create type expense_category as enum (
  'alat-tulis',
  'kebersihan',
  'fotokopi',
  'konsumsi',
  'sosial',
  'perlengkapan',
  'lainnya'
);

-- Tabel pengaturan kelas (satu baris per kelas / pengguna)
create table settings (
  id              text primary key default 'default',
  class_name      text        not null default 'Kelas 4B',
  school_name     text        not null default '',
  teacher_name    text        not null default '',
  academic_year   text        not null default '',
  weekly_amount   integer     not null default 2000,
  opening_balance integer     not null default 0,
  pin_enabled     boolean     not null default false,
  pin_hash        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger settings_updated_at
  before update on settings
  for each row execute procedure set_updated_at();

-- Siswa
create table students (
  id          uuid        primary key default uuid_generate_v4(),
  absen       integer     not null,
  name        text        not null,
  joined_week date        not null,          -- Senin dari minggu bergabung
  left_week   date,                          -- Senin dari minggu pertama tidak wajib (nullable)
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index idx_students_absen on students(absen);

-- Minggu kas
create table weeks (
  id          date        primary key,       -- Senin dari minggu tersebut (YYYY-MM-DD)
  amount      integer     not null,          -- Nominal kas (Rp)
  is_holiday  boolean     not null default false,
  note        text        not null default '',
  created_at  timestamptz not null default now()
);

-- Setoran / pembayaran
create table payments (
  id          uuid        primary key default uuid_generate_v4(),
  student_id  uuid        not null references students(id) on delete cascade,
  week_id     date        not null references weeks(id) on delete cascade,
  amount      integer     not null,          -- Nominal yang diterima (sama dengan weeks.amount)
  paid_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique(student_id, week_id)                -- Satu setoran per siswa per minggu
);

create index idx_payments_student on payments(student_id);
create index idx_payments_week    on payments(week_id);

-- Pengeluaran
create table expenses (
  id          uuid             primary key default uuid_generate_v4(),
  date        date             not null,
  category    expense_category not null default 'lainnya',
  amount      integer          not null,
  note        text             not null default '',
  has_receipt boolean          not null default false,
  created_at  timestamptz      not null default now()
);

-- Foto nota (opsional; simpan di Storage juga memungkinkan)
-- Untuk data offline-first, foto bisa tetap di IndexedDB lokal dan
-- diunggah ke kolom ini / Supabase Storage saat online.
create table receipts (
  expense_id  uuid    primary key references expenses(id) on delete cascade,
  full_image  text    not null,  -- base64 data URL atau URL Storage
  thumb_image text    not null,  -- thumbnail 200px
  updated_at  timestamptz not null default now()
);

-- Cash Opname
create table opnames (
  id          uuid        primary key default uuid_generate_v4(),
  date        date        not null,
  counts      jsonb       not null default '{}',  -- {denomination: count, ...}
  physical    integer     not null,
  system_bal  integer     not null,
  diff        integer     not null,               -- physical - system
  created_at  timestamptz not null default now()
);

-- =============================================================
-- View: ringkasan per minggu
-- =============================================================
create or replace view week_summary as
select
  w.id                                                    as week_id,
  w.amount,
  w.is_holiday,
  w.note,
  count(p.id)                                             as paid_count,
  coalesce(sum(p.amount), 0)                              as collected
from weeks w
left join payments p on p.week_id = w.id
group by w.id;

-- =============================================================
-- View: tunggakan siswa aktif
-- =============================================================
create or replace view arrears as
select
  s.id    as student_id,
  s.name,
  s.absen,
  w.id    as week_id,
  w.amount
from students s
join weeks w on
  not w.is_holiday
  and w.id >= s.joined_week
  and (s.left_week is null or w.id < s.left_week)
where s.is_active
  and not exists (
    select 1 from payments p
    where p.student_id = s.id and p.week_id = w.id
  );

-- =============================================================
-- RLS (opsional, aktifkan setelah menambahkan kolom user_id)
-- =============================================================
-- alter table students   enable row level security;
-- alter table weeks      enable row level security;
-- alter table payments   enable row level security;
-- alter table expenses   enable row level security;
-- alter table receipts   enable row level security;
-- alter table opnames    enable row level security;
-- alter table settings   enable row level security;
