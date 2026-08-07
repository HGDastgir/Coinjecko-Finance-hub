-- ============================================================
-- 0003 — Market data: providers, exchanges, indices, stocks,
-- crypto, forex, commodities, economic calendar.
-- Reference data + quotes are publicly readable; every quote row
-- records its provider, timestamp and delay status so the UI can
-- honour the data-transparency rules.
-- Writes: market_data.manage only (ingestion runs server-side).
-- ============================================================

create table public.data_providers (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[a-z0-9_]+$'),
  name          text not null,
  website       text,
  attribution   text,               -- required display attribution
  license_notes text,               -- usage / licensing constraints
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.exchanges (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- e.g. 'PSX', 'NYSE'
  name       text not null,
  country    text not null,
  region     text not null check (region in
               ('north_america','europe','asia_pacific','south_asia',
                'middle_east','other')),
  timezone   text not null,                 -- IANA, e.g. 'Asia/Karachi'
  -- trading sessions as [{"open":"09:32","close":"15:30"}] local time
  sessions   jsonb not null default '[]'::jsonb,
  trading_days int[] not null default '{1,2,3,4,5}', -- ISO dow, 1=Mon
  website    text,
  created_at timestamptz not null default now()
);

create table public.market_indices (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,         -- e.g. 'KSE100', 'SPX'
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  exchange_id uuid references public.exchanges (id),
  currency    text not null,
  region      text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.index_quotes (
  id            bigint generated always as identity primary key,
  index_id      uuid not null references public.market_indices (id) on delete cascade,
  price         numeric(18,4) not null,
  change_abs    numeric(18,4),
  change_pct    numeric(9,4),
  as_of         timestamptz not null,
  provider_id   uuid references public.data_providers (id),
  is_delayed    boolean not null default true,
  delay_minutes integer,
  created_at    timestamptz not null default now()
);

create table public.stocks (
  id          uuid primary key default gen_random_uuid(),
  symbol      text not null,
  exchange_id uuid references public.exchanges (id),
  name        text not null,
  currency    text not null,
  sector      text,
  created_at  timestamptz not null default now(),
  unique (symbol, exchange_id)
);

create table public.crypto_assets (
  id           uuid primary key default gen_random_uuid(),
  symbol       text not null unique,        -- e.g. 'BTC'
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table public.crypto_quotes (
  id            bigint generated always as identity primary key,
  asset_id      uuid not null references public.crypto_assets (id) on delete cascade,
  price_usd     numeric(24,8) not null,
  market_cap    numeric(24,2),
  volume_24h    numeric(24,2),
  supply_circulating numeric(24,2),
  supply_total  numeric(24,2),
  change_pct_24h numeric(9,4),
  as_of         timestamptz not null,
  provider_id   uuid references public.data_providers (id),
  created_at    timestamptz not null default now()
);

create table public.forex_pairs (
  id         uuid primary key default gen_random_uuid(),
  base_code  text not null,
  quote_code text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'), -- 'usd-pkr'
  created_at timestamptz not null default now(),
  unique (base_code, quote_code)
);

create table public.forex_quotes (
  id          bigint generated always as identity primary key,
  pair_id     uuid not null references public.forex_pairs (id) on delete cascade,
  rate        numeric(18,6) not null,
  change_pct  numeric(9,4),
  as_of       timestamptz not null,
  provider_id uuid references public.data_providers (id),
  created_at  timestamptz not null default now()
);

create table public.commodities (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,          -- e.g. 'XAU', 'BRENT'
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name       text not null,
  unit       text not null,                 -- 'oz', 'bbl'
  currency   text not null default 'USD',
  created_at timestamptz not null default now()
);

create table public.commodity_quotes (
  id           bigint generated always as identity primary key,
  commodity_id uuid not null references public.commodities (id) on delete cascade,
  price        numeric(18,4) not null,
  change_pct   numeric(9,4),
  as_of        timestamptz not null,
  provider_id  uuid references public.data_providers (id),
  created_at   timestamptz not null default now()
);

create table public.economic_events (
  id          uuid primary key default gen_random_uuid(),
  country     text not null,
  title       text not null,
  importance  text not null check (importance in ('low','medium','high')),
  event_time  timestamptz not null,
  actual      text,
  forecast    text,
  previous    text,
  provider_id uuid references public.data_providers (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS: public read, manager write
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'data_providers','exchanges','market_indices','index_quotes',
    'stocks','crypto_assets','crypto_quotes','forex_pairs','forex_quotes',
    'commodities','commodity_quotes','economic_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%s: public read" on public.%I for select using (true)',
      t, t);
    execute format(
      'create policy "%s: manage with market_data.manage" on public.%I
         for all to authenticated
         using (public.has_permission(''market_data.manage''))
         with check (public.has_permission(''market_data.manage''))',
      t, t);
  end loop;
end $$;

create trigger trg_econ_events_updated
  before update on public.economic_events
  for each row execute function public.set_updated_at();

-- Provider configuration changes are security-relevant: audit them.
create trigger trg_audit_data_providers
  after insert or update or delete on public.data_providers
  for each row execute function public.log_row_change();

-- ------------------------------------------------------------
-- Quote lookup indexes (latest-quote queries)
-- ------------------------------------------------------------
create index idx_index_quotes_latest
  on public.index_quotes (index_id, as_of desc);
create index idx_crypto_quotes_latest
  on public.crypto_quotes (asset_id, as_of desc);
create index idx_forex_quotes_latest
  on public.forex_quotes (pair_id, as_of desc);
create index idx_commodity_quotes_latest
  on public.commodity_quotes (commodity_id, as_of desc);
create index idx_econ_events_time
  on public.economic_events (event_time desc, importance);
