(function(){
'use strict';

var SUPABASE_URL='https://sfyalevtmdiwvefnsaja.supabase.co';
var SUPABASE_KEY='sb_publishable_7efLI_KQ7QAkZenEyXeuOA_qNnnH8U2';
var OWNER_EMAILS=['harryrconway@icloud.com','hello@myquest.au'];

window.MQ=window.MQ||{};
window.MQ.sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

MQ.sb.auth.onAuthStateChange(function(event){
  if(event==='SIGNED_OUT')location.href='/login.html';
});

// requireAuth(cb) — owner-only pages (backward compatible)
// requireAuth({allowStaff:true}, cb) — pages staff can also access
// cb receives (session) for owner, (session, staffRow) for staff
window.MQ.requireAuth=function(opts,cb){
  if(typeof opts==='function'){cb=opts;opts={};}
  MQ.sb.auth.getSession().then(function(res){
    var s=res.data.session;
    if(!s){location.href='/login.html';return;}
    var email=s.user.email;

    if(OWNER_EMAILS.indexOf(email)!==-1){
      if(cb)cb(s);
      return;
    }

    // Not owner — look up staff record by email
    MQ.sb.from('staff').select('id,name,role,status,email').eq('email',email).maybeSingle().then(function(r){
      if(r.error)console.error('[auth] staff lookup error:',r.error);
      console.log('[auth] staff lookup email:',email,'data:',r.data,'error:',r.error);
      if(!r.data){
        MQ.sb.auth.signOut().then(function(){location.href='/login.html?e=1';});
        return;
      }
      if(opts.allowStaff){
        if(cb)cb(s,r.data);
      }else{
        // Owner-only page — send staff to their profile
        location.href='/crm/profile.html';
      }
    });
  });
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
