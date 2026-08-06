(function(){
'use strict';

var JK='mq_jobs';
var IDAYS={'weekly':7,'fortnightly':14,'4-weekly':28};
var WEEKS=12;

function iso(d){var m=d.getMonth()+1,dy=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dy<10?'0':'')+dy;}

function makeJob(src,ds){
  return{
    id:'j'+src.id+ds.replace(/-/g,''),
    date:ds,clientId:src.clientId,clientName:src.clientName,
    site:src.site||'',type:src.type,
    status:'upcoming',sourceJobId:src.id,fromSchedule:true
  };
}

window.mqGenerate=function(){
  try{
    var raw=localStorage.getItem(JK);
    var jobs=raw?JSON.parse(raw):[];
    var templates=jobs.filter(function(j){return j.repeat&&j.repeat!=='none'&&!j.fromSchedule;});
    if(!templates.length)return;
    var covered={};
    jobs.forEach(function(j){if(j.sourceJobId)covered[j.sourceJobId+'|'+j.date]=1;});
    var today=new Date();today.setHours(0,0,0,0);
    var winEnd=new Date(today);winEnd.setDate(winEnd.getDate()+WEEKS*7);
    var ts=iso(today),ws=iso(winEnd);
    var added=[];
    templates.forEach(function(src){
      if(src.repeat==='monthly'){
        var bd=new Date(src.date+'T00:00:00').getDate();
        for(var i=0;i<14;i++){
          var c=new Date(today.getFullYear(),today.getMonth()+i,bd);
          var cs=iso(c);
          if(cs>ws)break;
          if(cs>ts&&!covered[src.id+'|'+cs]){added.push(makeJob(src,cs));covered[src.id+'|'+cs]=1;}
        }
      } else {
        var iv=IDAYS[src.repeat]||7;
        var base=new Date(src.date+'T00:00:00');
        if(base<today){
          var diff=Math.floor((today-base)/86400000);
          base=new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000);
        }
        var cur=base;
        while(iso(cur)<=ws){
          var cs2=iso(cur);
          if(cs2>ts&&!covered[src.id+'|'+cs2]){added.push(makeJob(src,cs2));covered[src.id+'|'+cs2]=1;}
          cur=new Date(cur.getTime()+iv*86400000);
        }
      }
    });
    if(added.length)localStorage.setItem(JK,JSON.stringify(jobs.concat(added)));
  }catch(e){}
};

window.mqNextOcc=function(j){
  if(!j||!j.repeat||j.repeat==='none')return null;
  var today=new Date();today.setHours(0,0,0,0);
  var ts=iso(today);
  if(j.repeat==='monthly'){
    var bd=new Date(j.date+'T00:00:00').getDate();
    for(var i=0;i<13;i++){
      var c=new Date(today.getFullYear(),today.getMonth()+i,bd);
      var cs=iso(c);if(cs>ts)return cs;
    }
    return null;
  }
  var iv=IDAYS[j.repeat]||7;
  var base=new Date(j.date+'T00:00:00');
  if(base>today)return j.date;
  var diff=Math.floor((today-base)/86400000);
  return iso(new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000));
};

})();
