alter table jobs
  add column if not exists sqm              integer,
  add column if not exists floors           integer,
  add column if not exists baths            integer,
  add column if not exists kitchen          boolean,
  add column if not exists after_hours_pct  integer,
  add column if not exists extras           jsonb,
  add column if not exists consumables      boolean,
  add column if not exists quoted_price     numeric(10,2),
  add column if not exists quoted_hrs       numeric(5,2),
  add column if not exists buffer           boolean;
