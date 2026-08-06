(function(){
'use strict';

var SUPABASE_URL='https://sfyalevtmdiwvefnsaja.supabase.co';
var SUPABASE_KEY='sb_publishable_7efLI_KQ7QAkZenEyXeuOA_qNnnH8U2';
var ALLOWED=['harryrconway@icloud.com','hello@myquest.au'];

window.MQ=window.MQ||{};
window.MQ.sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

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

})();
