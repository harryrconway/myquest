/* ============================================================
   MYQUEST — supabase-client.js
   Shared Supabase client. Load BEFORE store.js and auth.js.
   ============================================================ */
(function () {
  'use strict';

  window.MQ = window.MQ || {};

  MQ.supabase = window.supabase.createClient(
    'https://mxgvkzyifphucndovypt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14Z3ZrenlpZnBodWNuZG92eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzUzOTgsImV4cCI6MjA5NjU1MTM5OH0.0qyToYFGeZCnBhQf5AuFXSGIKsjqC0zJbqVHB-3euk0',
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
