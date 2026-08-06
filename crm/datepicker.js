(function(){
'use strict';

var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
var MONTHS_SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAYS_SHORT=['Su','Mo','Tu','We','Th','Fr','Sa'];

function pad(n){return n<10?'0'+n:String(n);}
function toIso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parseIso(s){
  if(!s)return null;
  var p=s.split('-');
  if(p.length!==3)return null;
  var d=new Date(+p[0],+p[1]-1,+p[2]);
  return isNaN(d.getTime())?null:d;
}
function fmtDisplay(iso){
  var d=parseIso(iso);
  if(!d)return '';
  return d.getDate()+' '+MONTHS_SHORT[d.getMonth()]+' '+d.getFullYear();
}

var activePopup=null;
function closeActive(){
  if(activePopup){activePopup.hidden=true;activePopup=null;}
}

document.addEventListener('click',closeActive);
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&activePopup){closeActive();e.stopImmediatePropagation();}
});

function initInput(inputEl){
  // Wrap
  var wrap=document.createElement('div');
  wrap.className='dp-wrap';
  inputEl.parentNode.insertBefore(wrap,inputEl);
  wrap.appendChild(inputEl);
  inputEl.style.cssText='position:absolute;opacity:0;pointer-events:none;width:1px;height:1px';

  // Trigger button — uses form-input class to inherit the exact input styling
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='dp-btn form-input';

  function updateBtn(){
    var v=inputEl._dpRawValue||inputEl.value;
    if(v){
      btn.textContent=fmtDisplay(v);
      btn.classList.remove('dp-empty');
    } else {
      btn.textContent=inputEl.dataset.placeholder||'Select date';
      btn.classList.add('dp-empty');
    }
  }
  updateBtn();
  wrap.insertBefore(btn,inputEl);

  // Popup
  var popup=document.createElement('div');
  popup.className='dp-popup';
  popup.hidden=true;
  wrap.appendChild(popup);

  var curYear,curMonth;

  function renderCalendar(){
    var todayIso=toIso(new Date());
    var selIso=inputEl._dpRawValue||inputEl.value||'';
    var firstDay=new Date(curYear,curMonth,1).getDay();
    var daysInMonth=new Date(curYear,curMonth+1,0).getDate();
    var daysInPrev=new Date(curYear,curMonth,0).getDate();

    var nav='<div class="dp-nav">'+
      '<button type="button" class="dp-nav-btn" data-dp-prev>&#8249;</button>'+
      '<span class="dp-nav-lbl">'+MONTHS[curMonth]+' '+curYear+'</span>'+
      '<button type="button" class="dp-nav-btn" data-dp-next>&#8250;</button>'+
    '</div>';

    var grid='<div class="dp-grid">';
    DAYS_SHORT.forEach(function(d){grid+='<div class="dp-dow">'+d+'</div>';});

    // Prev month trailing days
    for(var i=firstDay-1;i>=0;i--){
      grid+='<div class="dp-cell dp-other">'+(daysInPrev-i)+'</div>';
    }
    // Current month
    for(var d=1;d<=daysInMonth;d++){
      var iso=curYear+'-'+pad(curMonth+1)+'-'+pad(d);
      var cls='dp-cell';
      if(iso===todayIso)cls+=' dp-today';
      if(iso===selIso)cls+=' dp-selected';
      grid+='<div class="'+cls+'" data-date="'+iso+'">'+d+'</div>';
    }
    // Next month padding
    var total=firstDay+daysInMonth;
    var remaining=(7-total%7)%7;
    for(var n=1;n<=remaining;n++){
      grid+='<div class="dp-cell dp-other">'+n+'</div>';
    }
    grid+='</div>';

    popup.innerHTML=nav+grid;
  }

  function openPopup(){
    closeActive();
    var v=inputEl._dpRawValue||inputEl.value;
    var d=parseIso(v)||new Date();
    curYear=d.getFullYear();
    curMonth=d.getMonth();
    renderCalendar();
    popup.hidden=false;
    activePopup=popup;
    // Fixed positioning so the popup escapes overflow:hidden/auto containers (e.g. scrollable modals)
    var btnRect=btn.getBoundingClientRect();
    popup.style.position='fixed';
    popup.style.left=btnRect.left+'px';
    popup.style.top=(btnRect.bottom+6)+'px';
    popup.style.bottom='';
    var pr=popup.getBoundingClientRect();
    if(pr.right>window.innerWidth-8)popup.style.left=(window.innerWidth-pr.width-8)+'px';
    if(pr.bottom>window.innerHeight-8)popup.style.top=(btnRect.top-pr.height-6)+'px';
  }

  btn.addEventListener('click',function(e){
    e.stopPropagation();
    if(!popup.hidden){closeActive();return;}
    openPopup();
  });

  popup.addEventListener('click',function(e){
    e.stopPropagation();
    if(e.target.closest('[data-dp-prev]')){
      curMonth--;if(curMonth<0){curMonth=11;curYear--;}
      renderCalendar();return;
    }
    if(e.target.closest('[data-dp-next]')){
      curMonth++;if(curMonth>11){curMonth=0;curYear++;}
      renderCalendar();return;
    }
    var cell=e.target.closest('.dp-cell[data-date]');
    if(cell){
      var iso=cell.dataset.date;
      inputEl._dpRawValue=iso;
      // Set native value quietly (without triggering our setter's updateBtn double-call)
      try{
        var nd=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
        nd.set.call(inputEl,iso);
      }catch(err){inputEl.setAttribute('value',iso);}
      updateBtn();
      closeActive();
      inputEl.dispatchEvent(new Event('change',{bubbles:true}));
    }
  });

  // Intercept programmatic .value and .valueAsDate assignments so display stays in sync
  var nativeDesc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  try{
    Object.defineProperty(inputEl,'value',{
      get:function(){return inputEl._dpRawValue||nativeDesc.get.call(inputEl);},
      set:function(v){
        inputEl._dpRawValue=v;
        try{nativeDesc.set.call(inputEl,v);}catch(err){}
        updateBtn();
      },
      configurable:true
    });
    Object.defineProperty(inputEl,'valueAsDate',{
      get:function(){var v=inputEl.value;return v?parseIso(v):null;},
      set:function(d){inputEl.value=d?toIso(d):'';},
      configurable:true
    });
  }catch(err){}
}

document.querySelectorAll('[data-datepicker]').forEach(initInput);

})();
