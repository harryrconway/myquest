(function(){
'use strict';

var IDAYS={'weekly':7,'fortnightly':14,'4-weekly':28};
var WEEKS=52;

function iso(d){var m=d.getMonth()+1,dy=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dy<10?'0':'')+dy;}

function makeJob(src,ds){
  return{client_id:src.client_id,client_name:src.client_name,date:ds,
    start_time:src.start_time||null,
    type:src.type,status:'upcoming',site:src.site||'',
    assigned_staff_id:src.assigned_staff_id||null,
    assigned_staff_name:src.assigned_staff_name||null,
    source_job_id:src.id,from_schedule:true};
}

window.mqGenerate=function(){
  var sb=window.MQ&&window.MQ.sb;
  if(!sb)return Promise.resolve();
  var today=new Date();today.setHours(0,0,0,0);
  var ts=iso(today);

  // Pass 1: delete future instances whose source template no longer repeats
  return sb.from('jobs').select('id,repeat').eq('from_schedule',false)
    .then(function(tr){
      var orphanIds=(tr.data||[])
        .filter(function(t){return!t.repeat||t.repeat==='none';})
        .map(function(t){return t.id;});
      if(!orphanIds.length)return Promise.resolve();
      return Promise.all(orphanIds.map(function(id){
        return sb.from('jobs').delete().eq('source_job_id',id).gt('date',ts);
      }));
    })
    // Pass 2: generate missing instances for active repeating templates
    .then(function(){
      return sb.from('jobs').select('id,client_id,client_name,date,start_time,type,site,repeat,assigned_staff_id,assigned_staff_name')
        .not('repeat','is',null).neq('repeat','none').eq('from_schedule',false)
        .then(function(r1){
          var templates=r1.data||[];
          if(!templates.length)return;
          return sb.from('jobs').select('source_job_id,date').not('source_job_id','is',null)
            .then(function(r2){
              var covered={};
              (r2.data||[]).forEach(function(j){covered[j.source_job_id+'|'+j.date]=1;});
              var winEnd=new Date(today);winEnd.setDate(winEnd.getDate()+WEEKS*7);
              var ws=iso(winEnd);
              var added=[];
              templates.forEach(function(src){
                covered[src.id+'|'+src.date]=1;
                if(src.repeat==='monthly'){
                  var bd=new Date(src.date+'T00:00:00').getDate();
                  for(var i=0;i<14;i++){
                    var c=new Date(today.getFullYear(),today.getMonth()+i,bd);
                    var cs=iso(c);
                    if(cs>ws)break;
                    if(cs>ts&&!covered[src.id+'|'+cs]){added.push(makeJob(src,cs));covered[src.id+'|'+cs]=1;}
                  }
                }else{
                  var iv=IDAYS[src.repeat]||7;
                  var base=new Date(src.date+'T00:00:00');
                  if(base<today){var diff=Math.floor((today-base)/86400000);base=new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000);}
                  var cur=base;
                  while(iso(cur)<=ws){
                    var cs2=iso(cur);
                    if(cs2>ts&&!covered[src.id+'|'+cs2]){added.push(makeJob(src,cs2));covered[src.id+'|'+cs2]=1;}
                    cur=new Date(cur.getTime()+iv*86400000);
                  }
                }
              });
              if(added.length)return sb.from('jobs').insert(added);
            });
        });
    });
};

window.mqNextOcc=function(j){
  if(!j||!j.repeat||j.repeat==='none')return null;
  var today=new Date();today.setHours(0,0,0,0);
  var ts=iso(today);
  if(j.repeat==='monthly'){
    var bd=new Date(j.date+'T00:00:00').getDate();
    for(var i=0;i<13;i++){var c=new Date(today.getFullYear(),today.getMonth()+i,bd);var cs=iso(c);if(cs>ts)return cs;}
    return null;
  }
  var iv=IDAYS[j.repeat]||7;
  var base=new Date(j.date+'T00:00:00');
  if(base>today)return j.date;
  var diff=Math.floor((today-base)/86400000);
  return iso(new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000));
};

})();
