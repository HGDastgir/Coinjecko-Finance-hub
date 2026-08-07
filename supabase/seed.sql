-- ============================================================
-- Seed: reference data only (no fabricated market prices).
-- Quotes arrive exclusively from licensed data providers.
-- ============================================================

-- Categories (Level 1 global topics)
insert into public.categories (slug, name_en, name_ur) values
  ('markets',          'Markets',          'مارکیٹس'),
  ('crypto',           'Crypto',           'کرپٹو'),
  ('forex',            'Forex',            'فاریکس'),
  ('commodities',      'Commodities',      'اجناس'),
  ('economy',          'Economy',          'معیشت'),
  ('business',         'Business',         'کاروبار'),
  ('personal-finance', 'Personal Finance', 'ذاتی مالیات'),
  ('technology',       'Technology',       'ٹیکنالوجی'),
  ('ai-fintech',       'AI & Fintech',     'اے آئی اور فن ٹیک')
on conflict (slug) do nothing;

-- Exchanges (sessions are regular local trading hours)
insert into public.exchanges (code, name, country, region, timezone, sessions, trading_days) values
  ('NYSE',   'New York Stock Exchange',   'United States',  'north_america', 'America/New_York',
   '[{"open":"09:30","close":"16:00"}]', '{1,2,3,4,5}'),
  ('NASDAQ', 'Nasdaq',                    'United States',  'north_america', 'America/New_York',
   '[{"open":"09:30","close":"16:00"}]', '{1,2,3,4,5}'),
  ('TSX',    'Toronto Stock Exchange',    'Canada',         'north_america', 'America/Toronto',
   '[{"open":"09:30","close":"16:00"}]', '{1,2,3,4,5}'),
  ('LSE',    'London Stock Exchange',     'United Kingdom', 'europe',        'Europe/London',
   '[{"open":"08:00","close":"16:30"}]', '{1,2,3,4,5}'),
  ('XETRA',  'Deutsche Börse Xetra',      'Germany',        'europe',        'Europe/Berlin',
   '[{"open":"09:00","close":"17:30"}]', '{1,2,3,4,5}'),
  ('EURONEXT-PA', 'Euronext Paris',       'France',         'europe',        'Europe/Paris',
   '[{"open":"09:00","close":"17:30"}]', '{1,2,3,4,5}'),
  ('SIX',    'SIX Swiss Exchange',        'Switzerland',    'europe',        'Europe/Zurich',
   '[{"open":"09:00","close":"17:30"}]', '{1,2,3,4,5}'),
  ('JPX',    'Japan Exchange Group (TSE)','Japan',          'asia_pacific',  'Asia/Tokyo',
   '[{"open":"09:00","close":"11:30"},{"open":"12:30","close":"15:00"}]', '{1,2,3,4,5}'),
  ('HKEX',   'Hong Kong Exchanges',       'Hong Kong',      'asia_pacific',  'Asia/Hong_Kong',
   '[{"open":"09:30","close":"12:00"},{"open":"13:00","close":"16:00"}]', '{1,2,3,4,5}'),
  ('SSE',    'Shanghai Stock Exchange',   'China',          'asia_pacific',  'Asia/Shanghai',
   '[{"open":"09:30","close":"11:30"},{"open":"13:00","close":"15:00"}]', '{1,2,3,4,5}'),
  ('SZSE',   'Shenzhen Stock Exchange',   'China',          'asia_pacific',  'Asia/Shanghai',
   '[{"open":"09:30","close":"11:30"},{"open":"13:00","close":"14:57"}]', '{1,2,3,4,5}'),
  ('KRX',    'Korea Exchange',            'South Korea',    'asia_pacific',  'Asia/Seoul',
   '[{"open":"09:00","close":"15:30"}]', '{1,2,3,4,5}'),
  ('TWSE',   'Taiwan Stock Exchange',     'Taiwan',         'asia_pacific',  'Asia/Taipei',
   '[{"open":"09:00","close":"13:30"}]', '{1,2,3,4,5}'),
  ('SGX',    'Singapore Exchange',        'Singapore',      'asia_pacific',  'Asia/Singapore',
   '[{"open":"09:00","close":"17:00"}]', '{1,2,3,4,5}'),
  ('ASX',    'Australian Securities Exchange', 'Australia', 'asia_pacific',  'Australia/Sydney',
   '[{"open":"10:00","close":"16:00"}]', '{1,2,3,4,5}'),
  ('PSX',    'Pakistan Stock Exchange',   'Pakistan',       'south_asia',    'Asia/Karachi',
   '[{"open":"09:32","close":"15:30"}]', '{1,2,3,4,5}'),
  ('NSE',    'National Stock Exchange of India', 'India',   'south_asia',    'Asia/Kolkata',
   '[{"open":"09:15","close":"15:30"}]', '{1,2,3,4,5}'),
  ('BSE',    'BSE (Bombay Stock Exchange)', 'India',        'south_asia',    'Asia/Kolkata',
   '[{"open":"09:15","close":"15:30"}]', '{1,2,3,4,5}'),
  ('TADAWUL','Saudi Exchange (Tadawul)',  'Saudi Arabia',   'middle_east',   'Asia/Riyadh',
   '[{"open":"10:00","close":"15:10"}]', '{7,1,2,3,4}'),
  ('DFM',    'Dubai Financial Market',    'United Arab Emirates', 'middle_east', 'Asia/Dubai',
   '[{"open":"10:00","close":"14:50"}]', '{1,2,3,4,5}'),
  ('ADX',    'Abu Dhabi Securities Exchange', 'United Arab Emirates', 'middle_east', 'Asia/Dubai',
   '[{"open":"10:00","close":"14:45"}]', '{1,2,3,4,5}'),
  ('QSE',    'Qatar Stock Exchange',      'Qatar',          'middle_east',   'Asia/Qatar',
   '[{"open":"09:30","close":"13:15"}]', '{7,1,2,3,4}'),
  ('BOURSAKW','Boursa Kuwait',            'Kuwait',         'middle_east',   'Asia/Kuwait',
   '[{"open":"09:30","close":"13:00"}]', '{7,1,2,3,4}'),
  ('BHB',    'Bahrain Bourse',            'Bahrain',        'middle_east',   'Asia/Bahrain',
   '[{"open":"09:30","close":"13:00"}]', '{7,1,2,3,4}'),
  ('MSX',    'Muscat Stock Exchange',     'Oman',           'middle_east',   'Asia/Muscat',
   '[{"open":"10:00","close":"14:00"}]', '{7,1,2,3,4}')
on conflict (code) do nothing;

-- Major indices (Level 3 market pages)
insert into public.market_indices (code, slug, name, exchange_id, currency, region) values
  ('DJI',    'dow-jones',          'Dow Jones Industrial Average', (select id from public.exchanges where code='NYSE'),   'USD', 'north_america'),
  ('SPX',    's-and-p-500',        'S&P 500',                      (select id from public.exchanges where code='NYSE'),   'USD', 'north_america'),
  ('IXIC',   'nasdaq-composite',   'Nasdaq Composite',             (select id from public.exchanges where code='NASDAQ'), 'USD', 'north_america'),
  ('RUT',    'russell-2000',       'Russell 2000',                 (select id from public.exchanges where code='NYSE'),   'USD', 'north_america'),
  ('GSPTSE', 'tsx-composite',      'S&P/TSX Composite',            (select id from public.exchanges where code='TSX'),    'CAD', 'north_america'),
  ('UKX',    'ftse-100',           'FTSE 100',                     (select id from public.exchanges where code='LSE'),    'GBP', 'europe'),
  ('MCX',    'ftse-250',           'FTSE 250',                     (select id from public.exchanges where code='LSE'),    'GBP', 'europe'),
  ('DAX',    'dax',                'DAX',                          (select id from public.exchanges where code='XETRA'),  'EUR', 'europe'),
  ('CAC',    'cac-40',             'CAC 40',                       (select id from public.exchanges where code='EURONEXT-PA'), 'EUR', 'europe'),
  ('SX5E',   'euro-stoxx-50',      'Euro Stoxx 50',                null,                                                   'EUR', 'europe'),
  ('IBEX',   'ibex-35',            'IBEX 35',                      null,                                                   'EUR', 'europe'),
  ('FTSEMIB','ftse-mib',           'FTSE MIB',                     null,                                                   'EUR', 'europe'),
  ('SMI',    'smi',                'Swiss Market Index',           (select id from public.exchanges where code='SIX'),    'CHF', 'europe'),
  ('NKY',    'nikkei-225',         'Nikkei 225',                   (select id from public.exchanges where code='JPX'),    'JPY', 'asia_pacific'),
  ('TPX',    'topix',              'TOPIX',                        (select id from public.exchanges where code='JPX'),    'JPY', 'asia_pacific'),
  ('HSI',    'hang-seng',          'Hang Seng Index',              (select id from public.exchanges where code='HKEX'),   'HKD', 'asia_pacific'),
  ('SHCOMP', 'shanghai-composite', 'Shanghai Composite',           (select id from public.exchanges where code='SSE'),    'CNY', 'asia_pacific'),
  ('SZCOMP', 'shenzhen-component', 'Shenzhen Component',           (select id from public.exchanges where code='SZSE'),   'CNY', 'asia_pacific'),
  ('KOSPI',  'kospi',              'KOSPI',                        (select id from public.exchanges where code='KRX'),    'KRW', 'asia_pacific'),
  ('TWII',   'taiwan-weighted',    'Taiwan Weighted Index',        (select id from public.exchanges where code='TWSE'),   'TWD', 'asia_pacific'),
  ('STI',    'straits-times',      'Straits Times Index',          (select id from public.exchanges where code='SGX'),    'SGD', 'asia_pacific'),
  ('AS51',   'asx-200',            'S&P/ASX 200',                  (select id from public.exchanges where code='ASX'),    'AUD', 'asia_pacific'),
  ('KSE100', 'kse-100',            'KSE-100',                      (select id from public.exchanges where code='PSX'),    'PKR', 'south_asia'),
  ('NIFTY',  'nifty-50',           'Nifty 50',                     (select id from public.exchanges where code='NSE'),    'INR', 'south_asia'),
  ('SENSEX', 'bse-sensex',         'BSE Sensex',                   (select id from public.exchanges where code='BSE'),    'INR', 'south_asia'),
  ('TASI',   'tadawul-tasi',       'Tadawul All Share (TASI)',     (select id from public.exchanges where code='TADAWUL'),'SAR', 'middle_east'),
  ('DFMGI',  'dfm-general',        'DFM General Index',            (select id from public.exchanges where code='DFM'),    'AED', 'middle_east'),
  ('ADSMI',  'adx-general',        'ADX General Index',            (select id from public.exchanges where code='ADX'),    'AED', 'middle_east'),
  ('QEAS',   'qe-index',           'QE Index',                     (select id from public.exchanges where code='QSE'),    'QAR', 'middle_east'),
  ('BKA',    'boursa-kuwait-all',  'Boursa Kuwait All Share',      (select id from public.exchanges where code='BOURSAKW'),'KWD','middle_east'),
  ('BAX',    'bahrain-all-share',  'Bahrain All Share',            (select id from public.exchanges where code='BHB'),    'BHD', 'middle_east'),
  ('MSM30',  'msx-30',             'MSX 30',                       (select id from public.exchanges where code='MSX'),    'OMR', 'middle_east')
on conflict (code) do nothing;

-- Core crypto assets, forex corridors and commodities
insert into public.crypto_assets (symbol, slug, name) values
  ('BTC',  'bitcoin',  'Bitcoin'),
  ('ETH',  'ethereum', 'Ethereum'),
  ('USDT', 'tether',   'Tether (USDT)'),
  ('XRP',  'xrp',      'XRP'),
  ('BNB',  'bnb',      'BNB'),
  ('SOL',  'solana',   'Solana'),
  ('ADA',  'cardano',  'Cardano')
on conflict (symbol) do nothing;

insert into public.forex_pairs (base_code, quote_code, slug) values
  ('USD', 'PKR', 'usd-pkr'),
  ('EUR', 'PKR', 'eur-pkr'),
  ('GBP', 'PKR', 'gbp-pkr'),
  ('AED', 'PKR', 'aed-pkr'),
  ('SAR', 'PKR', 'sar-pkr'),
  ('USD', 'INR', 'usd-inr'),
  ('EUR', 'USD', 'eur-usd'),
  ('GBP', 'USD', 'gbp-usd'),
  ('USD', 'JPY', 'usd-jpy'),
  ('USD', 'CAD', 'usd-cad')
on conflict (base_code, quote_code) do nothing;

insert into public.commodities (code, slug, name, unit, currency) values
  ('XAU',   'gold',      'Gold',            'oz',  'USD'),
  ('XAG',   'silver',    'Silver',          'oz',  'USD'),
  ('BRENT', 'brent-oil', 'Brent Crude Oil', 'bbl', 'USD'),
  ('WTI',   'wti-oil',   'WTI Crude Oil',   'bbl', 'USD')
on conflict (code) do nothing;
