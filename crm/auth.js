(function(){
'use strict';

var SUPABASE_URL='https://sfyalevtmdiwvefnsaja.supabase.co';
var SUPABASE_KEY='sb_publishable_7efLI_KQ7QAkZenEyXeuOA_qNnnH8U2';
var OWNER_EMAILS=['harryrconway@icloud.com','hello@myquest.au'];

window.MQ=window.MQ||{};
window.MQ.sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

// requireAuth(cb) — owner-only pages (backward compatible)
// requireAuth({allowStaff:true}, cb) — pages staff can also access
// cb receives (session) for owner, (session, staffRow) for staff
window.MQ.requireAuth=function(opts,cb){
  if(typeof opts==='function'){cb=opts;opts={};}

  var resolved=false,signedInAt=0;
  function resolve(s){
    if(resolved)return;
    resolved=true;
    if(!s){location.href='/login.html';return;}
    var email=s.user.email;
    if(OWNER_EMAILS.indexOf(email)!==-1){
      if(cb)cb(s);
      return;
    }
    MQ.sb.from('staff').select('id,name,role,status,email').eq('email',email).maybeSingle().then(function(r){
      if(!r.data){
        MQ.sb.auth.signOut().then(function(){location.href='/login.html?e=1';});
        return;
      }
      if(opts.allowStaff){
        if(cb)cb(s,r.data);
      }else{
        location.href='/crm/profile.html';
      }
    });
  }

  // Listen for auth events — catches magic link hash processing (SIGNED_IN)
  // and session expiry (SIGNED_OUT) in one place
  MQ.sb.auth.onAuthStateChange(function(event,session){
    if(event==='SIGNED_IN'){signedInAt=Date.now();resolve(session);}
    // Ignore SIGNED_OUT that fires within 5s of SIGNED_IN — Supabase emits it
    // when replacing an existing session with the magic link's new session.
    if(event==='SIGNED_OUT'&&resolved&&(Date.now()-signedInAt>5000)){location.href='/login.html';}
  });

  // getSession handles already-authenticated visits.
  // Skip if there's a magic link hash — let SIGNED_IN fire instead.
  if(!location.hash.includes('access_token=')){
    MQ.sb.auth.getSession().then(function(res){
      resolve(res.data.session);
    });
  }
};

window.MQ.isOwner=function(session){
  return session&&OWNER_EMAILS.indexOf(session.user.email)!==-1;
};

window.MQ.signOut=function(){
  MQ.sb.auth.signOut().then(function(){location.href='/login.html';});
};

window.MQ.toast=function(msg,isErr){
  var t=document.getElementById('mq-toast');
  if(!t){
    t=document.createElement('div');
    t.id='mq-toast';
    t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;font:500 13px/1.4 Inter,system-ui,sans-serif;color:#fff;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100vw - 40px);text-align:center';
    document.body.appendChild(t);
  }
  t.style.background=isErr?'#c0392b':'var(--navy,#0a0a0a)';
  t.textContent=msg;
  t.style.opacity='1';
  clearTimeout(t._tid);
  t._tid=setTimeout(function(){t.style.opacity='0';},3000);
};

window.addEventListener('unhandledrejection',function(e){
  console.error('Unhandled rejection:',e.reason);
  if(window.MQ&&window.MQ.toast)MQ.toast('Something went wrong — please refresh.',true);
});

})();
