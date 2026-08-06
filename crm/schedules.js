(function(){
'use strict';

var SK='mq_schedules',JK='mq_jobs';
var IDAYS={'weekly':7,'fortnightly':14,'4-weekly':28};
var WEEKS=12;

function iso(d){var m=d.getMonth()+1,dy=d.getDate();return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dy<10?'0':'')+dy;}

function makeJob(sch,ds){
  return{
    id:'j'+sch.id+ds.replace(/-/g,''),
    date:ds,clientId:sch.clientId,clientName:sch.clientName,
    site:sch.site||'',type:sch.type,
    status:'upcoming',scheduleId:sch.id,fromSchedule:true
  };
}

window.mqGenerate=function(){
  try{
    var raw=localStorage.getItem(SK);
    var scheds=raw?JSON.parse(raw):[];
    if(!scheds.length)return;
    var jobsRaw=localStorage.getItem(JK);
    var jobs=jobsRaw?JSON.parse(jobsRaw):[];
    var covered={};
    jobs.forEach(function(j){if(j.scheduleId)covered[j.scheduleId+'|'+j.date]=1;});
    var today=new Date();today.setHours(0,0,0,0);
    var winEnd=new Date(today);winEnd.setDate(winEnd.getDate()+WEEKS*7);
    var ts=iso(today),ws=iso(winEnd);
    var added=[];
    scheds.forEach(function(sch){
      if(!sch.active||!sch.startDate)return;
      if(sch.endDate&&sch.endDate<ts)return;
      if(sch.frequency==='monthly'){
        var bd=new Date(sch.startDate+'T00:00:00').getDate();
        for(var i=0;i<14;i++){
          var c=new Date(today.getFullYear(),today.getMonth()+i,bd);
          var cs=iso(c);
          if(cs>ws)break;
          if(cs>=ts&&(!sch.endDate||cs<=sch.endDate)&&!covered[sch.id+'|'+cs]){
            added.push(makeJob(sch,cs));covered[sch.id+'|'+cs]=1;
          }
        }
      } else {
        var iv=IDAYS[sch.frequency]||7;
        var base=new Date(sch.startDate+'T00:00:00');
        if(base<today){
          var diff=Math.floor((today-base)/86400000);
          base=new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000);
        }
        var cur=base;
        while(iso(cur)<=ws){
          var cs2=iso(cur);
          if(!sch.endDate||cs2<=sch.endDate){
            if(!covered[sch.id+'|'+cs2]){added.push(makeJob(sch,cs2));covered[sch.id+'|'+cs2]=1;}
          }
          cur=new Date(cur.getTime()+iv*86400000);
        }
      }
    });
    if(added.length)localStorage.setItem(JK,JSON.stringify(jobs.concat(added)));
  }catch(e){}
};

window.mqNextOcc=function(sch){
  if(!sch.active||!sch.startDate)return null;
  var today=new Date();today.setHours(0,0,0,0);
  var ts=iso(today);
  if(sch.endDate&&sch.endDate<ts)return null;
  if(sch.frequency==='monthly'){
    var bd=new Date(sch.startDate+'T00:00:00').getDate();
    for(var i=0;i<13;i++){
      var c=new Date(today.getFullYear(),today.getMonth()+i,bd);
      var cs=iso(c);
      if(cs>=ts&&(!sch.endDate||cs<=sch.endDate))return cs;
    }
    return null;
  }
  var iv=IDAYS[sch.frequency]||7;
  var base=new Date(sch.startDate+'T00:00:00');
  if(base>=today)return sch.startDate;
  var diff=Math.floor((today-base)/86400000);
  var ns=iso(new Date(base.getTime()+Math.ceil(diff/iv)*iv*86400000));
  return(!sch.endDate||ns<=sch.endDate)?ns:null;
};

})();
