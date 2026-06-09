/* ============================================================
   MYQUEST — supabase-client.js
   Shared Supabase client. Load BEFORE store.js and auth.js.
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  MQ.supabase = window.supabase.createClient(
    'https://mxgvkzyifphucndovypt.supabase.co',
    'sb_publishable_f4usL-7ZKKBvfodmIY_OwQ_7QRiFfpW',
    {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
})();
