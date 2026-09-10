(function(){
'use strict';

var SUPABASE_URL='https://sfyalevtmdiwvefnsaja.supabase.co';
var SUPABASE_KEY='sb_publishable_7efLI_KQ7QAkZenEyXeuOA_qNnnH8U2';
var ALLOWED=['harryrconway@icloud.com','hello@myquest.au'];

window.MQ=window.MQ||{};
window.MQ.sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

MQ.sb.auth.onAuthStateChange(function(event){
  if(event==='SIGNED_OUT')location.href='/login.html';
});

window.MQ.requireAuth=function(cb){
  MQ.sb.auth.getSession().then(function(res){
    var s=res.data.session;
    if(!s){location.href='/login.html';return;}
    if(ALLOWED.indexOf(s.user.email)===-1){
      MQ.sb.auth.signOut().then(function(){location.href='/login.html?e=1';});
      return;
    }
    if(cb)cb(s);
  });
};

window.MQ.signOut=function(){
  MQ.sb.auth.signOut().then(function(){location.href='/login.html';});
};

window.MQ.toast=function(msg,isErr){
  var t=document.getElementById('mq-toast');
  if(!t){
    t=document.createElement('div');
    t.id='mq-toast';
    t.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:8px;font:500 13px/1.4 system-ui,sans-serif;color:#fff;z-index:9999;opacity:0;transition:opacity .2s;pointer-events:none;max-width:calc(100vw - 40px);text-align:center';
    document.body.appendChild(t);
  }
  t.style.background=isErr?'#c0392b':'var(--navy,#1a2b4a)';
  t.textContent=msg;
  t.style.opacity='1';
  clearTimeout(t._tid);
  t._tid=setTimeout(function(){t.style.opacity='0';},3000);
};

window.addEventListener('unhandledrejection',function(e){
  console.error('Unhandled rejection:',e.reason);
  if(window.MQ&&window.MQ.toast)MQ.toast('Something went wrong — please refresh if this persists.',true);
});

})();
