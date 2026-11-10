/* Talas City Bus Park - site scripts (2009, rev. 2024) */
(function(){
var UP=document.body.getAttribute('data-up')||'';
function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function pad(n){return (n<10?'0':'')+n;}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function fmt(s){var p=s.split('-');return p[2]+'.'+p[1]+'.'+p[0];}
function fnv(s){var x=0x811c9dc5;for(var i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,0x01000193)>>>0;}return x>>>0;}
/* Irad Time: UTC+6 */
var now=new Date(Date.now()+6*3600000);var today=new Date(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());

/* visitor counter (since 01.03.2009) */
var c=$('ctr');if(c){var days=Math.floor((today-new Date(2009,2,1))/864e5);var n=180000+days*61+fnv('c'+iso(today))%57;c.textContent=('0000000'+n).slice(-7);}

/* the season: winter or summer timetable, from the Governor's daily figures; date rule if they can't be read */
function fallback(){var m=today.getMonth()+1,d=today.getDate();return {winter:(m==12||m<=2||(m==3&&d<=15)),since:null,snow:false,ok:false};}
function apply(s){
 var w=s.winter;
 var t=$('ttnow');if(t){t.className=w?'winter':'summer';t.innerHTML=(w?'WINTER':'SUMMER')+'<small>timetable</small>';}
 var nt=$('ttnote');if(nt){nt.textContent=w?('Winter timetable in force'+(s.since?' since '+fmt(s.since):'')+'. Buses start 15 minutes later and finish earlier.'):'Summer timetable. The winter timetable starts with the first snow, by 1 December at the latest.';}
 var big=$('ttbigtxt');if(big){big.textContent=w?('the winter timetable'+(s.since?', in force since '+fmt(s.since):'')+'.'):'the summer timetable. The winter timetable has not started yet.';}
 var cur=w?'tt-winter':'tt-summer',oth=w?'tt-summer':'tt-winter';
 [].forEach.call(document.querySelectorAll('.'+cur),function(e){e.classList.add('now');});
 [].forEach.call(document.querySelectorAll('.'+oth),function(e){e.classList.remove('now');e.classList.add('notnow');});
 if(s.snow&&!INC){
  var sb=$('snowbox');if(sb){sb.hidden=false;sb.innerHTML='<b>Snow in Talas today.</b> Buses 10 and 16 and the marshrutkas to Alatau Heights may turn short of Alatau Heights while the road above the Conservatory is cleared. Dispatcher: 41-15-15.';}
  var sr=$('snowroute');if(sr)sr.hidden=false;
 }
}
var SNOW=[71,73,75,77,85,86];
/* today's incidents (the Governor's daily figures carry one list for every site): a burst main or a snowstorm that
   moves the buses. The box on the home page and the line on each route page it touches; the snow line gives way to it. */
var INC=false;
function incidents(d){
 var now=Date.now(),l=(d.incidents&&d.incidents.list||[]).filter(function(x){return x.bus&&Date.parse(x.start)<=now+3*3600000&&(!x.end||now<Date.parse(x.end));});
 if(!l.length)return;
 INC=true;
 var sb=$('snowbox');if(sb){sb.hidden=false;sb.innerHTML=l.map(function(x){return '<b>'+esc(x.title.en)+'.</b> '+esc(x.bus.text.en);}).join('<br>')+' Dispatcher: 41-15-15.';}
 var ir=$('incroute');if(ir){var no=ir.getAttribute('data-no'),hit=l.filter(function(x){return x.bus.routes.indexOf(no)>=0;});
  if(hit.length){ir.hidden=false;ir.innerHTML=hit.map(function(x){return '<b>Today:</b> '+esc(x.bus.text.en);}).join('<br>');var sr=$('snowroute');if(sr)sr.hidden=true;}}
}
function season(){
 var s=fallback();apply(s);
 if(!window.fetch)return;
 fetch('https://iradgov.org/data/today.json').then(function(r){return r.json();}).then(function(d){
  incidents(d);
  if(!d.season)return;
  var p=(d.weather&&d.weather.places||[]).filter(function(x){return x.id==='talas';})[0];
  var snow=!!(p&&(SNOW.indexOf(p.code)>=0||/snow/i.test(p.label&&p.label.en||'')));
  [].forEach.call(document.querySelectorAll('.notnow'),function(e){e.classList.remove('notnow');});
  [].forEach.call(document.querySelectorAll('.now'),function(e){e.classList.remove('now');});
  apply({winter:!!d.season.winter,since:d.season.winter?d.season.since:null,snow:snow,ok:true});
 }).catch(function(){});
}
season();

/* the data file: routes and stops */
var DATA=null;
function data(cb){if(DATA){cb(DATA);return;}if(!window.fetch)return;fetch(UP+'data/routes.json').then(function(r){return r.json();}).then(function(d){DATA=d;cb(d);}).catch(function(){});}
function rl(r){return '<a class="rn '+(r.kind=='bus'?'rb':'rm')+'" href="'+UP+'r/'+r.key+'.html">'+r.no+'</a>';}

/* route number box */
var q=(location.search.match(/[?&]q=([^&]*)/)||[])[1];
if(q&&$('qhit')){q=decodeURIComponent(q).replace(/\D/g,'');data(function(d){
 var hit=d.routes.filter(function(r){return r.no===q;});var el=$('qhit');el.hidden=false;
 el.innerHTML=hit.length?('Route '+esc(q)+': '+hit.map(function(r){return rl(r)+' '+(r.kind=='bus'?'bus':'marshrutka')+' '+esc(d.stops[r.stops[0]].name)+' &ndash; '+esc(d.stops[r.stops[r.stops.length-1]].name);}).join('; ')):'There is no route '+esc(q)+'.';
 if(hit.length==1)location.href=UP+'r/'+hit[0].key+'.html';
});}

/* trip finder: direct routes first, then one change */
var f=$('finder');
if(f){f.onsubmit=function(e){e.preventDefault();data(function(d){
 var a=$('ffrom').value,b=$('fto').value,out=$('fres');
 if(a===b){out.innerHTML='<p>Choose two different stops.</p>';return;}
 var live=d.routes.filter(function(r){return r.status==='ok';});
 var direct=live.filter(function(r){return r.stops.indexOf(a)>=0&&r.stops.indexOf(b)>=0;});
 direct.sort(function(x,y){return Math.abs(x.stops.indexOf(a)-x.stops.indexOf(b))-Math.abs(y.stops.indexOf(a)-y.stops.indexOf(b));});
 var h='';
 if(direct.length){h='<p><b>Direct:</b> '+direct.map(function(r){return rl(r)+' <small>('+Math.abs(r.stops.indexOf(a)-r.stops.indexOf(b))+' stops)</small>';}).join(' &nbsp; ')+'</p>';}
 else{
  var best=[];
  live.forEach(function(r1){if(r1.stops.indexOf(a)<0)return;live.forEach(function(r2){if(r2===r1||r2.stops.indexOf(b)<0)return;
   r1.stops.forEach(function(s){if(r2.stops.indexOf(s)>=0){var n=Math.abs(r1.stops.indexOf(a)-r1.stops.indexOf(s))+Math.abs(r2.stops.indexOf(s)-r2.stops.indexOf(b));best.push([n,r1,s,r2]);}});});});
  best.sort(function(x,y){return x[0]-y[0];});var seen={};best=best.filter(function(x){var k=x[1].key+x[3].key;if(seen[k])return false;seen[k]=1;return true;}).slice(0,6);
  h=best.length?'<p><b>With one change:</b></p><ul>'+best.map(function(x){return '<li>'+rl(x[1])+' to <b>'+esc(d.stops[x[2]].name)+'</b>, then '+rl(x[3])+' <small>('+x[0]+' stops)</small></li>';}).join('')+'</ul>':'<p>No route found. Call the dispatcher, 41-15-15.</p>';
 }
 out.innerHTML='<div class="fbox"><b>'+esc(d.stops[a].name)+'</b> &rarr; <b>'+esc(d.stops[b].name)+'</b>'+h+'</div>';
});};}

/* lost property: four weeks up to the Sunday before this Monday (same as the printed list) */
var lt=$('lost');
if(lt){data(function(d){
 var keys=d.routes.filter(function(r){return r.status==='ok';}).map(function(r){return r.key;});
 var tot=0;d.lost.forEach(function(x){tot+=x[1];});
 var wd=(today.getDay()+6)%7;var mon=new Date(today.getFullYear(),today.getMonth(),today.getDate()-wd);
 var rows='<tr><th>No.</th><th>Found</th><th>Item</th><th>Route</th></tr>';
 for(var i=1;i<=28;i++){
  var dd=new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()-i),s=iso(dd);
  var n=fnv('n'+s)%4;
  var doy=Math.round((dd-new Date(dd.getFullYear(),0,1))/864e5)+1;
  for(var j=0;j<n;j++){
   var h=fnv(s+':'+j),k=h%tot,item='';
   for(var t=0;t<d.lost.length;t++){if(k<d.lost[t][1]){item=d.lost[t][0];break;}k-=d.lost[t][1];}
   var rk=keys[(h>>>8)%keys.length];var cl=i>10&&((h>>>16)%3)===0;
   rows+='<tr'+(cl?' class="claimed"':'')+'><td>'+String(dd.getFullYear()).slice(2)+'/'+('00'+doy).slice(-3)+'-'+(j+1)+'</td><td>'+fmt(s)+'</td><td>'+esc(item)+'</td><td>'+(rk[0]=='b'?'bus ':'marshrutka ')+rk.slice(1)+'</td></tr>';
  }
 }
 lt.innerHTML=rows;
});}

/* ended notices */
[].forEach.call(document.querySelectorAll('.notice[data-until]'),function(e){var u=e.getAttribute('data-until');if(u&&u<iso(today)&&!e.querySelector('.old')){e.querySelector('.d').insertAdjacentHTML('afterend',' <span class="old">ended</span>');}});

/* version for the visually impaired (remembered in this browser) */
var vi=$('vi');function setVi(on){document.documentElement.classList.toggle('vi',on);try{localStorage.setItem('vi',on?'1':'');}catch(e){}}
try{if(localStorage.getItem('vi'))setVi(true);}catch(e){}
if(vi)vi.onclick=function(e){e.preventDefault();setVi(!document.documentElement.classList.contains('vi'));};

/* phone menu */
var m=document.getElementById('menu');if(m){var b=document.createElement('button');b.className='mbtn';b.textContent='☰ Menu';b.onclick=function(){m.classList.toggle('open');};m.parentNode.insertBefore(b,m);}
})();
