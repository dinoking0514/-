'use strict';
(()=>{
const A=window.RP_AWARDS;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>n.toLocaleString('ko-KR');
if(!A){document.querySelector('main').insertAdjacentHTML('beforeend','<p class="empty">어워드 기록을 불러오지 못했습니다.</p>');return;}

const BASE=20*60+28;
const hhmm=m=>{const t=(BASE+m)%(24*60);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');};
const [SPAN0,SPAN1]=A.span;const SPAN=SPAN1-SPAN0;
const rooms=A.rooms;const people=A.people;
const SITE=window.AW_SITE||'';
const charLink=id=>`${SITE}character.html?id=${encodeURIComponent(id)}`;
const pname=i=>people[i]?.name||'';
const plink=(i,cls='chip')=>{const p=people[i];if(!p)return '';return p.id?`<a class="${cls}" href="${charLink(p.id)}">${esc(p.name)}</a>`:`<span class="${cls} aw-plain" title="기록실에 아직 인물 항목이 없습니다">${esc(p.name)}</span>`;};
const roomTag=r=>`<span class="room-tag" data-room="${r}"><span class="room-dot"></span>${esc(rooms[r].label)}${r===0?' · 단상':''}</span>`;
const TYPE={SAY:0,MEDIA:1,SYS:2,NOTICE:3,BOT:4,OWNER:5};

// 메시지 펼치기
const M=A.messages.map((r,i)=>({i,room:r[0],m:r[1],p:r[2],prof:A.profiles[r[3]],type:r[4],body:r[5],react:r[6]===1,note:r[7]||''}));
const spoken=M.filter(x=>x.p>=0&&(x.type===TYPE.SAY||x.type===TYPE.MEDIA));

// 수상 정보
const awardsOf=new Map();
for(const s of A.segments){
  for(const w of s.winners)for(const p of w.people){if(!awardsOf.has(p))awardsOf.set(p,[]);awardsOf.get(p).push(`${s.title}${w.label&&w.label!=='수상'?' · '+w.label:''}`);}
  for(const pair of s.pairs||[])for(const p of pair){if(!awardsOf.has(p))awardsOf.set(p,[]);awardsOf.get(p).push(`${s.title} · ${pair.map(pname).join(' × ')}`);}
}

// 개요 수치
const present=new Set(spoken.map(x=>x.p));
const first=Math.min(...M.map(x=>x.m)),closeSeg=A.segments.find(s=>s.id==='close');
$('awStats').innerHTML=[
  [(()=>{const d=(closeSeg?closeSeg.to:SPAN1);return `${Math.floor(d/60)}시간 ${d%60}분`;})(),`${hhmm(0)} – ${hhmm(closeSeg?closeSeg.to:SPAN1)}`],
  [`${rooms.length}개 방`,'단상 1 · 관람석 3'],
  [`${A.segments.filter(s=>s.winners.length).length}개`,'시상 순서'],
  [`${num(present.size)}명`,'등장 인물'],
  [`${num(M.length)}`,'수록 메시지'],
].map(([v,l])=>`<div class="stat"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('');

// 방 구성
$('awRooms').innerHTML=rooms.map((r,i)=>{
  const ms=spoken.filter(x=>x.room===i);const ps=new Set(ms.map(x=>x.p));
  return `<div class="aw-room" data-room="${i}"><strong>${esc(r.label)}</strong><span>${esc(r.role)}</span><span>${num(ps.size)}명 · ${num(M.filter(x=>x.room===i).length)}개 메시지</span></div>`;
}).join('');

// 시상 결과
const winnersHTML=(s,votes=true)=>s.winners.map(w=>{const label=votes?w.label:String(w.label||'').replace(/\s*·\s*\d+표$/,'');return `<span class="aw-win-row">${label?`<span class="aw-win-label">${esc(label)}</span>`:''}${w.people.map(p=>plink(p)).join('')}${w.note?`<span class="aw-win-note">${esc(w.note)}</span>`:''}</span>`;}).join('');
$('awResults').innerHTML=A.segments.filter(s=>s.winners.length).map(s=>`<div class="aw-result"><time>${hhmm(s.from)}</time><h3><a href="#seg-${esc(s.id)}">${esc(s.title)}</a></h3><div class="aw-win">${winnersHTML(s)}</div></div>`).join('');

// 개요 그래프
(function overview(){
  const W=1000,L=70,R=8,binM=5,rowH=13,gap=4,segH=24;
  const x=m=>L+(m-SPAN0)/SPAN*(W-L-R);
  const bins=Math.ceil(SPAN/binM);
  const counts=rooms.map(()=>Array(bins).fill(0));
  for(const s of M)if(s.type!==TYPE.SYS)counts[s.room][Math.min(bins-1,Math.floor((s.m-SPAN0)/binM))]++;
  const max=Math.max(...counts.flat());
  const top=18;let out='';
  rooms.forEach((r,ri)=>{
    const y=top+ri*(rowH+gap);
    out+=`<text class="ov-label" x="0" y="${y+rowH-3}">${esc(r.label)}${ri===0?' 단상':''}</text>`;
    counts[ri].forEach((c,b)=>{if(!c)return;const op=(0.15+0.85*Math.sqrt(c/max)).toFixed(2);out+=`<rect x="${x(SPAN0+b*binM).toFixed(1)}" y="${y}" width="${(x(SPAN0+binM)-x(SPAN0)-1).toFixed(1)}" height="${rowH}" fill="var(--room-${ri})" opacity="${op}"><title>${esc(r.label)} ${hhmm(b*binM)}~ · ${c}개</title></rect>`;});
  });
  const segY=top+rooms.length*(rowH+gap)+6;
  A.segments.forEach((s,i)=>{
    const x0=x(s.from),x1=x(Math.max(s.to,s.from+1));const w=Math.max(2,x1-x0-1);
    out+=`<g class="ov-seg" tabindex="0" role="link" data-seg="${esc(s.id)}" aria-label="${esc(s.title)} ${hhmm(s.from)}"><rect x="${x0.toFixed(1)}" y="${segY}" width="${w.toFixed(1)}" height="${segH}"><title>${esc(s.title)} · ${hhmm(s.from)}–${hhmm(s.to)}</title></rect>${w>18?`<text x="${(x0+w/2).toFixed(1)}" y="${segY+16}" text-anchor="middle">${i+1}</text>`:''}</g>`;
  });
  for(const mo of A.moments){const mx=x(mo.t);out+=`<path class="ov-moment" d="M${mx.toFixed(1)} 4 l4 5 l-4 5 l-4 -5z"><title>${esc(hhmm(mo.t)+' '+mo.title)}</title></path>`;}
  const axisY=segY+segH+16;
  for(let h=21;h<=25;h++){const m=h*60-BASE;if(m<SPAN0||m>SPAN1)continue;const xx=x(m);out+=`<line x1="${xx}" x2="${xx}" y1="${top-2}" y2="${segY+segH+2}" stroke="var(--line-strong)" stroke-width=".6" stroke-dasharray="2 3"/><text class="ov-axis" x="${xx}" y="${axisY}" text-anchor="middle">${String(h%24).padStart(2,'0')}:00</text>`;}
  out+=`<text class="ov-label" x="0" y="${segY+16}">순서</text><text class="ov-label" x="0" y="13">◆ 교차</text>`;
  $('awOverview').innerHTML=`<svg viewBox="0 0 ${W} ${axisY+6}" role="img" aria-label="방별 메시지 밀도와 시상 순서">${out}</svg>`;
  $('awOverview').addEventListener('click',e=>{const g=e.target.closest('[data-seg]');if(g)location.hash='seg-'+g.dataset.seg;});
  $('awOverview').addEventListener('keydown',e=>{const g=e.target.closest('[data-seg]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();location.hash='seg-'+g.dataset.seg;}});
  $('awSegnav').innerHTML=A.segments.map((s,i)=>`<li><a href="#seg-${esc(s.id)}"><b>${i+1}</b>${esc(s.title)}</a></li>`).join('');
})();

// 원문 표시 설정
const opt={original:false,hideReact:true,sys:false,focus:-1,only:false,show:[true,true,true,true]};
try{const saved=JSON.parse(localStorage.getItem('aw-opt2')||'{}');for(const k of ['original','hideReact','sys'])if(k in saved)opt[k]=!!saved[k];if(Array.isArray(saved.show)&&saved.show.length===4&&saved.show.some(Boolean))opt.show=saved.show.map(Boolean);}catch{}
const params=new URLSearchParams(location.search);
const whoParam=params.get('who');
if(whoParam){const i=people.findIndex(p=>p.id===whoParam||p.key===whoParam||p.name===whoParam);if(i>=0)opt.focus=i;}
const focusSel=$('awFocus');
const counts=new Map();for(const s of spoken)counts.set(s.p,(counts.get(s.p)||0)+1);
focusSel.insertAdjacentHTML('beforeend',[...counts.keys()].sort((a,b)=>pname(a).localeCompare(pname(b),'ko')).map(i=>`<option value="${i}">${esc(pname(i))} (${counts.get(i)})</option>`).join(''));
focusSel.value=String(opt.focus);
$('awOriginal').checked=opt.original;$('awHideReact').checked=opt.hideReact;$('awSys').checked=opt.sys;$('awOnly').checked=opt.only;

const visible=x=>{
  if(x.type===TYPE.SYS&&!opt.sys)return false;
  if(opt.hideReact&&(x.react||x.type===TYPE.MEDIA))return false;
  if(opt.only&&opt.focus>=0&&x.p!==opt.focus)return false;
  return true;
};
const speaker=x=>{
  if(x.type===TYPE.SYS)return '';
  if(x.type===TYPE.NOTICE)return `<span class="who">안내</span>`;
  if(x.type===TYPE.BOT)return `<span class="who">${esc(x.prof||'봇')}</span>`;
  if(opt.original||x.p<0)return `<span class="who">${esc(x.prof)}</span>`;
  const p=people[x.p];
  const alt=x.prof&&x.prof!==p.key&&x.prof!==p.name?` title="원래 프로필: ${esc(x.prof)}"`:'';
  return `<span class="who"${alt}>${p.id?`<a href="${charLink(p.id)}">${esc(p.name)}</a>`:esc(p.name)}</span>`;
};
const clean=t=>String(t).split('\n').map(l=>l.trim().replace(/^([“"‘'])\s+/,'$1').replace(/\s+([”"’'])$/,'$1')).join('\n').replace(/\n{2,}/g,'\n').trim();
const msgHTML=(x,withMeta=false,cont=false)=>{
  const cls=['aw-msg'];if(cont)cls.push('cont');if(x.type===TYPE.SYS)cls.push('sys');if(x.type===TYPE.MEDIA)cls.push('media');if(x.react)cls.push('react');if(x.type===TYPE.OWNER)cls.push('owner');if(!withMeta&&opt.focus>=0&&x.p===opt.focus)cls.push('focus');
  const body=`${cont?'':speaker(x)}<span class="txt">${esc(clean(x.body))}</span>${x.note?`<span class="note">${esc(x.note)}</span>`:''}`;
  if(withMeta)return `<div class="${cls.join(' ')}" data-room="${x.room}"><div class="meta"><time>${hhmm(x.m)}</time>${roomTag(x.room)}</div>${body}</div>`;
  return `<div class="${cls.join(' ')}" data-room="${x.room}">${body}</div>`;
};
function logHTML(from,to){
  const list=M.filter(x=>x.m>=from&&x.m<=to&&visible(x));
  const byMin=new Map();
  for(const x of list){if(!byMin.has(x.m))byMin.set(x.m,rooms.map(()=>[]));byMin.get(x.m)[x.room].push(x);}
  const shown=rooms.map((r,i)=>i).filter(i=>opt.show[i]);
  const cols=`style="--aw-cols:${shown.length}"`;
  const same=(a,b)=>a&&b&&a.type!==TYPE.SYS&&b.type!==TYPE.SYS&&a.type!==TYPE.NOTICE&&b.type!==TYPE.NOTICE&&a.p===b.p&&a.prof===b.prof&&(a.type===TYPE.OWNER)===(b.type===TYPE.OWNER);
  const cell=c=>c.map((x,k)=>msgHTML(x,false,same(c[k-1],x))).join('');
  const head=`<div class="aw-log-head" ${cols}><span></span>${shown.map(i=>roomTag(i)).join('')}</div>`;
  const rows=[...byMin.entries()].sort((a,b)=>a[0]-b[0]).filter(([m,cells])=>shown.some(i=>cells[i].length)).map(([m,cells])=>`<div class="aw-row" ${cols}><time>${hhmm(m)}</time>${shown.map(ri=>{const c=cells[ri];return `<div class="aw-cell${c.length?'':' is-empty'}" data-room="${ri}">${c.length?roomTag(ri)+cell(c):''}</div>`;}).join('')}</div>`).join('');
  const dim=opt.focus>=0&&!opt.only?' dim':'';
  return `<div class="aw-log${dim}">${head}${rows||'<p class="empty">이 조건에 맞는 메시지가 없습니다.</p>'}</div><p class="aw-log-more">${hhmm(from)}–${hhmm(to)} · ${num(list.length)}개 메시지</p>`;
}

// 단상 요약: {t,text} 진행 · {who,text} 발언 · {tag,text} 결과
const quotes=t=>esc(t).replace(/“([^”]*)”/g,'<q>$1</q>');
const times=t=>esc(t).replace(/(?<![\d:])(\d{2}:\d{2}(?:[~–]\d{2}(?::\d{2})?)?)(?![\d:])/g,'<time class="tm">$1</time>');
const stageHTML=items=>`<ol class="aw-stage">${(Array.isArray(items)?items:[{text:items}]).map(it=>{
  if(it.tag)return `<li class="st-tag"><span class="st-k">${esc(it.tag)}</span><span class="st-v">${quotes(it.text)}</span></li>`;
  if(it.who)return `<li class="st-say"><span class="st-k">${esc(it.who)}</span><span class="st-v">${quotes(it.text)}</span></li>`;
  return `<li class="st-note">${it.t?`<time class="st-k">${esc(it.t)}</time>`:'<span class="st-k" aria-hidden="true"></span>'}<span class="st-v">${quotes(it.text)}</span></li>`;
}).join('')}</ol>`;
// 구간
const momentsBySeg=new Map();
for(const mo of A.moments){const s=A.segments.find(s=>mo.t>=s.from&&mo.t<=s.to)||A.segments[0];if(!momentsBySeg.has(s.id))momentsBySeg.set(s.id,[]);momentsBySeg.get(s.id).push(mo);}
$('awSegments').innerHTML=A.segments.map((s,i)=>{
  const cols=rooms.map((r,ri)=>{
    if(ri===0)return `<div class="aw-col" data-room="0">${roomTag(0)}${stageHTML(s.stage)}</div>`;
    const notes=s.rooms[String(ri)]||[];
    return `<div class="aw-col${notes.length?'':' empty-col'}" data-room="${ri}">${roomTag(ri)}${notes.length?`<ul>${notes.map(n=>`<li>${times(n)}</li>`).join('')}</ul>`:'<p>이 시간에 기록된 장면이 거의 없습니다.</p>'}</div>`;
  }).join('');
  const moms=(momentsBySeg.get(s.id)||[]).map(mo=>`<aside class="aw-moment"><header><strong>↔ ${esc(mo.title)}</strong><time>${hhmm(mo.t)}</time><span class="aw-route">${mo.rooms.map(r=>roomTag(r)).join('<span aria-hidden="true">·</span>')}</span></header><p>${times(mo.text)}</p></aside>`).join('');
  const total=M.filter(x=>x.m>=s.from&&x.m<=s.to).length;
  return `<article class="aw-seg" id="seg-${esc(s.id)}"><div class="aw-seg-head"><p class="eyebrow">${String(i+1).padStart(2,'0')} · ${hhmm(s.from)}–${hhmm(s.to)}</p><h3>${esc(s.title)}</h3></div>${s.winners.length?`<div class="aw-seg-winners aw-win">${winnersHTML(s,false)}</div>`:''}<div class="aw-cols">${cols}</div>${moms}<div class="aw-seg-actions"><button type="button" data-log="${esc(s.id)}" aria-expanded="false">이 시간의 원문 나란히 보기 (${num(total)})</button></div><div class="aw-seg-log" id="log-${esc(s.id)}" hidden></div></article>`;
}).join('');
const openLogs=new Set();
const renderLog=id=>{const s=A.segments.find(s=>s.id===id);const host=$('log-'+id);host.innerHTML=logHTML(s.from,s.to);};
$('awSegments').addEventListener('click',e=>{
  const b=e.target.closest('[data-log]');if(!b)return;
  const id=b.dataset.log,host=$('log-'+id);const open=host.hidden;
  host.hidden=!open;b.setAttribute('aria-expanded',String(open));
  b.textContent=(open?'원문 접기':'이 시간의 원문 나란히 보기')+` (${num(M.filter(x=>{const s=A.segments.find(s=>s.id===id);return x.m>=s.from&&x.m<=s.to;}).length)})`;
  if(open){openLogs.add(id);renderLog(id);}else{openLogs.delete(id);host.innerHTML='';}
});
const rerender=()=>{for(const id of openLogs)renderLog(id);try{localStorage.setItem('aw-opt2',JSON.stringify({original:opt.original,hideReact:opt.hideReact,sys:opt.sys,show:opt.show}));}catch{}
  const u=new URL(location.href);if(opt.focus>=0)u.searchParams.set('who',people[opt.focus].id||people[opt.focus].key);else u.searchParams.delete('who');try{history.replaceState(null,'',u);}catch{}};
$('awOriginal').onchange=e=>{opt.original=e.target.checked;rerender();};
$('awHideReact').onchange=e=>{opt.hideReact=e.target.checked;rerender();};
$('awSys').onchange=e=>{opt.sys=e.target.checked;rerender();};
$('awOnly').onchange=e=>{opt.only=e.target.checked;rerender();};
focusSel.onchange=e=>{opt.focus=Number(e.target.value);rerender();};
$('awShow').innerHTML=rooms.map((r,i)=>`<label data-room="${i}"><input type="checkbox" id="awShow${i}" data-show="${i}"${opt.show[i]?' checked':''}><span class="room-dot"></span>${esc(r.label)}</label>`).join('');
$('awShow').addEventListener('change',e=>{const i=Number(e.target.dataset.show);opt.show[i]=e.target.checked;if(!opt.show.some(Boolean)){opt.show[i]=true;e.target.checked=true;}rerender();});
$('awOpenAll').onclick=()=>{const all=[...document.querySelectorAll('[data-log]')];const anyClosed=all.some(b=>b.getAttribute('aria-expanded')!=='true');for(const b of all)if((b.getAttribute('aria-expanded')==='true')!==anyClosed)b.click();$('awOpenAll').textContent=anyClosed?'모든 원문 접기':'모든 원문 펼치기';};

// 인물
const GAP=15;
const intervals=p=>{
  const out=[];
  for(let r=0;r<rooms.length;r++){
    const ts=spoken.filter(x=>x.p===p&&x.room===r).map(x=>x.m);
    let cur=null;
    for(const t of ts){if(cur&&t-cur[1]<=GAP)cur[1]=t;else{cur=[t,t,r,0];out.push(cur);}cur[3]++;}
  }
  return out.sort((a,b)=>a[0]-b[0]);
};
const pct=m=>((m-SPAN0)/SPAN*100).toFixed(2)+'%';
const segTicks=A.segments.map(s=>`<b style="left:${pct(s.from)}"></b>`).join('');
const plist=[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a));
$('awAxis').innerHTML=`<span></span><span class="ticks">${[21,22,23,24,25].map(h=>`<span style="left:${pct(h*60-BASE)}">${String(h%24).padStart(2,'0')}:00</span>`).join('')}</span>`;
const personRow=p=>{
  const iv=intervals(p);const aw=awardsOf.get(p)||[];
  const lane=iv.map(([a,b,r,n])=>`<i data-room="${r}" style="left:${pct(a)};width:calc(${((b-a)/SPAN*100).toFixed(2)}% + 3px)" title="${esc(rooms[r].label)} ${hhmm(a)}–${hhmm(b)} · ${n}개"></i>`).join('');
  const roomsUsed=[...new Set(iv.map(v=>v[2]))];
  return `<details class="aw-person" data-p="${p}" data-rooms="${roomsUsed.join(',')}" data-aw="${aw.length?1:0}"><summary><span class="aw-pname"><span>${esc(pname(p))}</span><small>${roomsUsed.map(r=>esc(rooms[r].label)).join(' · ')} · ${counts.get(p)}개${aw.length?` <span class="medal">· 수상 ${aw.length}</span>`:''}</small></span><span class="aw-lane">${segTicks}${lane}</span></summary><div class="aw-pbody"></div></details>`;
};
$('awPeople').innerHTML=plist.map(personRow).join('');
$('awPeople').addEventListener('toggle',e=>{
  const d=e.target;if(!d.open||d.dataset.done)return;d.dataset.done='1';
  const p=Number(d.dataset.p);const iv=intervals(p);const aw=awardsOf.get(p)||[];
  const per=rooms.map((r,i)=>[i,spoken.filter(x=>x.p===p&&x.room===i).length]).filter(v=>v[1]);
  const lines=M.filter(x=>x.p===p&&x.type!==TYPE.SYS);
  const person=people[p];
  d.querySelector('.aw-pbody').innerHTML=`<div class="aw-pfacts">${per.map(([r,n])=>`<span>${roomTag(r)} ${n}개</span>`).join('')}${aw.length?`<span>🏆 ${aw.map(esc).join(' / ')}</span>`:''}</div><ol class="aw-trail" aria-label="머문 방 순서">${iv.map(([a,b,r],k)=>`${k?'<li class="arrow" aria-hidden="true">→</li>':''}<li>${roomTag(r)}<time>${hhmm(a)}${b>a?'–'+hhmm(b):''}</time></li>`).join('')}</ol><div class="aw-plog">${lines.map((x,k)=>{const prev=lines[k-1];return prev&&prev.m===x.m&&prev.room===x.room?msgHTML(x,false,true):msgHTML(x,true);}).join('')}</div><p class="aw-plink"><button type="button" data-focus="${p}">원문 나란히 보기에서 이 인물 강조</button>${person.id?` · <a href="${charLink(person.id)}">기록실 인물 페이지 ↗</a>`:''}</p>`;
},true);
$('awPeople').addEventListener('click',e=>{const b=e.target.closest('[data-focus]');if(!b)return;opt.focus=Number(b.dataset.focus);focusSel.value=String(opt.focus);rerender();$('timeline').scrollIntoView({behavior:'smooth',block:'start'});});
const filterPeople=()=>{
  const q=$('awPeopleQ').value.trim().toLowerCase(),r=$('awPeopleRoom').value,aw=$('awPeopleAw').checked;
  let n=0;
  for(const d of document.querySelectorAll('.aw-person')){const p=Number(d.dataset.p);const ok=(!q||pname(p).toLowerCase().includes(q)||(people[p].key||'').toLowerCase().includes(q))&&(!r||d.dataset.rooms.split(',').includes(r))&&(!aw||d.dataset.aw==='1');d.hidden=!ok;if(ok)n++;}
  $('awPeopleCount').textContent=`${n}명`;
};
for(const id of ['awPeopleQ','awPeopleRoom','awPeopleAw'])$(id).addEventListener('input',filterPeople);
$('awPeopleRoom').insertAdjacentHTML('beforeend',rooms.map((r,i)=>`<option value="${i}">${esc(r.label)}${i===0?' (단상)':''}</option>`).join(''));
filterPeople();
$('awLegend').innerHTML=rooms.map((r,i)=>roomTag(i)).join('');
const measure=()=>{const nav=document.querySelector('.site-nav');const ctl=document.querySelector('.aw-controls-sticky');const st=document.documentElement.style;st.setProperty('--aw-nav',(nav?nav.offsetHeight:72)+'px');st.setProperty('--aw-ctl',(ctl&&getComputedStyle(ctl).position==='sticky'?ctl.offsetHeight:0)+'px');};
measure();addEventListener('resize',measure);if(window.ResizeObserver){const ro=new ResizeObserver(measure);for(const el of document.querySelectorAll('.site-nav,.aw-controls-sticky'))ro.observe(el);}document.fonts?.ready?.then(measure);
if(opt.focus>=0){const d=document.querySelector(`.aw-person[data-p="${opt.focus}"]`);if(d)d.open=true;}
})();
