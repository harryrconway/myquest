/* ============================================================
   MYQUEST — training.js
   ============================================================ */
(function () {
  'use strict';
  var escHtml = window.escHtml || function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  window.TrainingPage = {};

  document.addEventListener('mq:ready', function () {
    var btn = document.getElementById('training-complete-btn');
    var msg = document.getElementById('training-complete-msg');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        var session = (await MQ.supabase.auth.getSession()).data.session;
        if (!session) throw new Error('Not signed in');
        var resp = await fetch('/api/training-complete', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + session.access_token,
            'Content-Type': 'application/json',
          },
        });
        if (!resp.ok) {
          var errData = await resp.json().catch(function () { return {}; });
          throw new Error(errData.error || 'Request failed');
        }
        btn.style.display = 'none';
        if (msg) msg.style.display = '';
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Mark as Complete';
        MQ.ui.toast('Something went wrong. Please try again.', 'error');
      }
    });
  });
})();
