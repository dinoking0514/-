'use strict';
window.PlaceGuide=(()=>{
  const sourceLink=(sid,anchor)=>`${readLink(sid)}#${encodeURIComponent(anchor)}`;
  const quote=(e,sid)=>e?`<figure class="place-evidence"><blockquote>${e.truncatedBefore?'…':''}${esc(e.quote)}${e.truncatedAfter?'…':''}</blockquote><figcaption>${esc(e.speaker)} · <a href="${sourceLink(sid,e.anchor)}">이 원문에서 확인 →</a></figcaption></figure>`:'';
  const label=status=>({reviewed:'무대 편집 완료',summary:'요약·원문의 장소 단서',unresolved:'진행 장소 미확정'}[status]||status);
  const geographyLine=p=>[p.geography.country,p.geography.direction,p.geography.region].join(' → ');
  function renderSetting(s){
    const host=$('settingContent'),e=window.RP_SETTINGS?.entries[s.id];if(!host)return;
    if(!e){host.innerHTML='<p class="muted">배경 자료를 불러오지 못했습니다. 새로고침해 주세요.</p>';return;}
    const refs=e.namedReferences;
    host.innerHTML=`<div class="setting-heading"><h2>이 이야기의 배경과 장소</h2><span class="tag ${e.status==='unresolved'?'unknown':''}">${label(e.status)}</span></div>
      <p class="setting-background">${esc(e.background)}</p>
      <dl class="setting-facts"><div><dt>주요 무대</dt><dd>${e.scenes.length?e.scenes.map((v,i)=>`<span class="scene-item">${esc(v)}</span>`).join(''):'현재 남은 요약과 장소 표현만으로 특정하지 못했습니다.'}</dd></div>
      <div><dt>국가·지역·지형</dt><dd>${s.setting.scenePlaceIds.length?s.setting.scenePlaceIds.map(id=>{const p=places.get(id);return `<div class="scene-geography"><a href="${placeLink(id)}">${esc(p.name)}</a><p>${esc(geographyLine(p))}</p><small>${esc(p.geography.terrain)}</small></div>`;}).join(''):'주요 무대와 연결할 상위 지명이 확인되지 않았습니다. 채팅방 이름을 작중 국가나 지역으로 해석하지 않습니다.'}</dd></div>
      <div><dt>공간·시점</dt><dd>${esc([e.note,...e.spaceTags].filter(Boolean).join(' · ')||'별도의 꿈·회상 공간 표시는 확인되지 않았습니다.')}</dd></div>
      ${e.environment.length?`<div><dt>시간·환경 단서</dt><dd>${esc(e.environment.join(' · '))}<small>요약에 나타난 단서이며 모든 장면에 동시에 적용되는 조건은 아닙니다.</small></dd></div>`:''}</dl>
      <p class="muted small">${esc(e.basis)} 무대 목록은 방문 순서표가 아닙니다. 이름 없는 장소끼리는 같은 곳으로 합치지 않았습니다.</p>
      ${refs.some(r=>r.role!=='mention')?`<div class="chips">${placeChips(refs.filter(r=>r.role!=='mention').map(r=>r.placeId))}</div>`:''}
      <details class="reading-details setting-details"><summary>원문에서 장소 확인 · ${e.evidence.length}개 단서</summary><p class="muted small">장소 표현이 있는 대목을 모았습니다. 대사 속 추측·회상·목적지는 실제 방문을 뜻하지 않을 수 있습니다.</p>${e.evidence.length?e.evidence.map(v=>quote(v,s.id)).join(''):e.opening?'<p>장소를 특정할 표현을 찾지 못해 도입부를 함께 표시합니다.</p>'+quote(e.opening,s.id):'<p>장소 근거가 없습니다.</p>'}</details>
      <details class="reading-details setting-details"><summary>회차별 배경 단서 · ${e.parts.length}개 장면</summary><p class="muted small">각 수록 회차의 앞부분에서 찾은 공간 표현입니다. 긴 회차의 모든 이동 경로를 대신하지 않습니다.</p>${e.parts.map(p=>`<section class="part-setting"><h3><a href="${sourceLink(s.id,p.anchor)}">${esc(p.title)}</a></h3>${p.evidence?quote(p.evidence,s.id):'<p class="muted">이 회차에서 장소를 특정할 단서를 찾지 못했습니다. 회차 제목을 누르면 도입부를 읽을 수 있습니다.</p>'}</section>`).join('')}</details>
      ${refs.some(r=>r.role==='mention')?`<details class="reading-details setting-details"><summary>그 밖에 언급된 지명 · ${refs.filter(r=>r.role==='mention').length}곳</summary><p class="muted small">출신·소문·계획·비유·회상일 수 있습니다. 이 목록은 방문 기록이 아닙니다.</p>${refs.filter(r=>r.role==='mention').map(r=>`<div class="place-mention"><h3><a href="${placeLink(r.placeId)}">${esc(places.get(r.placeId)?.name)}</a></h3>${quote(r.evidence,s.id)}</div>`).join('')}</details>`:''}`;
    // Same-story citations are handled by the existing reader's hash navigation.
    host.addEventListener('click',event=>{
      const a=event.target.closest('a');if(!a)return;
      const url=new URL(a.href,location.href);
      if(url.pathname===location.pathname&&url.searchParams.get('id')===s.id&&url.hash){
        event.preventDefault();$('bodySearch').value='';$('onlyCharacter').checked=false;$('showBots').checked=true;
        const hash=url.hash;if(location.hash===hash)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=hash;
      }
    });
  }
  /* 지명 도감: 색 = 대륙 방위, 아이콘 = 장소 유형, 별 = 등장 이야기 수 */
  const DIRS={
    C:{name:'중앙',color:'#b48ae0'},N:{name:'북부',color:'#86aee8'},E:{name:'동부',color:'#68b878'},
    S:{name:'남부',color:'#4fb8b4'},W:{name:'서부',color:'#dd9550'},U:{name:'방위 미확인',color:'#7c7a75'}
  };
  const dirParts=d=>{if(!d||d.includes('미확인'))return['U'];const m={'중':'C','북':'N','동':'E','남':'S','서':'W'};const out=[...d].map(ch=>m[ch]).filter(Boolean);return out.length?out:['U'];};
  const ICON_PATHS={
    nation:'M3 18h18M4.5 18 3.5 8l5 4 3.5-6 3.5 6 5-4-1 10M12 14.5v.5',
    city:'M3 21h18M5 21V9h2v2h2V9h2v2h2V9h2v2h2V9h2v12M10 21v-4a2 2 0 0 1 4 0v4',
    village:'M3 11.5 12 4l9 7.5M5.5 9.5V21h13V9.5M10 21v-5.5h4V21',
    facility:'M3 21h18M5 21V8l7-4 7 4v13M9 12h6M9 16h6',
    faith:'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    nature:'M12 3l5.5 8h-3.5l4.5 6.5h-13L10 11H6.5zM12 17.5V21',
    ruin:'M3 21h18M5 21v-9a7 7 0 0 1 12-4.9M19 12v2M19 17.5V21M9 21v-6a3 3 0 0 1 6 0v6',
    special:'M12 12a1 1 0 0 1 1 1 2 2 0 0 1-2 2 3 3 0 0 1-3-3 4 4 0 0 1 4-4 5 5 0 0 1 5 5 6 6 0 0 1-6 6 7 7 0 0 1-7-7 8 8 0 0 1 8-8'
  };
  const KINDS=[['nation','국가·세력'],['city','도시'],['village','마을·영지'],['facility','거점·시설'],['faith','종교'],['nature','자연·섬'],['ruin','유적·던전'],['special','특수 공간']];
  const kindOf=t=>/특수/.test(t)?'special':/종교/.test(t)?'faith':/유적|던전|무덤/.test(t)?'ruin':/국가|왕국|연맹|세력권|정치권/.test(t)?'nation':/마을|영지|거주지/.test(t)?'village':/도시/.test(t)?'city':/자연|습지|섬·해역/.test(t)?'nature':'facility';
  const icon=(k,cls='')=>`<svg class="kind-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON_PATHS[k]}"/></svg>`;
  const storyCount=p=>new Set(p.references.map(r=>r.sessionId)).size;
  const starsOf=n=>n>=30?3:n>=5?2:1;
  const dirStyle=p=>{const parts=dirParts(p.geography.direction);return `--c1:${DIRS[parts[0]].color};--c2:${DIRS[parts[1]||parts[0]].color}`;};
  const dirLabel=d=>d.includes('미확인')?'미확인':d;
  function placeTile(p){
    const n=storyCount(p),st=starsOf(n),k=kindOf(p.type),unknown=dirParts(p.geography.direction)[0]==='U';
    const country=p.geography.country.includes('미확인')||p.name.startsWith(p.geography.country.split(' ')[0])?'':p.geography.country;
    return `<a class="atlas-tile${unknown?' is-unknown':''}" href="${placeLink(p.id)}" style="${dirStyle(p)}" title="${esc(p.description)}">
      <span class="tile-dir">${esc(dirLabel(p.geography.direction))}</span>
      <span class="tile-kind" title="${esc(p.type)}">${icon(k)}</span>
      ${icon(k,'tile-emblem')}
      <span class="tile-stars" aria-label="${number(n)}개 이야기">${'★'.repeat(st)}<span>${'★'.repeat(3-st)}</span></span>
      <strong class="tile-name">${esc(p.name)}</strong>
      <span class="tile-sub">${esc(p.type)}${country?` · ${esc(country)}`:''}</span></a>`;
  }
  /* 대륙의 국가·세력: 세계관 기준 설정의 방위별 세력 + 세계관 주요 설정(티플럼시아).
     방위별·국가별 보기에서 2칸(30편 이상은 2×2) 타일로 크게 보여 준다. */
  const MAJOR_EXTRA=['L-tiflum'];
  let majorIds=null;
  const isMajor=p=>{if(!majorIds)majorIds=new Set([...(window.RP_PLACES?.worldGeography?.regions||[]).flatMap(r=>r.places),...MAJOR_EXTRA]);return majorIds.has(p.id);};
  const memberCount=p=>{const c=p.geography.country;return c.includes('미확인')?0:window.RP_PLACES.places.filter(q=>q.id!==p.id&&q.geography.country===c).length;};
  function majorTile(p){
    const n=storyCount(p),st=starsOf(n),k=kindOf(p.type),m=memberCount(p),big=n>=30;
    const country=p.geography.country.includes('미확인')||p.name.startsWith(p.geography.country.split(' ')[0])?'':p.geography.country;
    return `<a class="atlas-tile is-major ${big?'is-major-big':'is-major-wide'}" href="${placeLink(p.id)}" style="${dirStyle(p)}" title="${esc(p.description)}">
      <span class="tile-dir">${esc(dirLabel(p.geography.direction))}</span>
      <span class="tile-kind" title="${esc(p.type)}">${icon(k)}</span>
      ${icon(k,'tile-emblem')}
      <span class="major-body"><strong class="tile-name">${esc(p.name)}</strong>
      <span class="tile-sub">${esc(p.type)}${country?` · ${esc(country)}`:''}</span>
      <span class="major-meta">${n?`<span class="tile-stars" aria-label="${number(n)}개 이야기">${'★'.repeat(st)}<span>${'★'.repeat(3-st)}</span></span> ${number(n)}편`:'세계관 기준 설정'}${m?` · 소속 지명 ${number(m)}곳`:''}</span>
      ${big?`<span class="major-desc">${esc(p.description)}</span>`:''}</span></a>`;
  }
  const featuredTile=p=>isMajor(p)?majorTile(p):placeTile(p);
  function renderPlaces(){
    const data=window.RP_PLACES;if(!data){$('results').innerHTML='<p>지명 자료를 불러오지 못했습니다.</p>';return;}
    const world=data.worldGeography,regionByKey={};
    for(const r of world.regions){const k=dirParts(r.name==='중앙'?'중부':r.name)[0];regionByKey[k]=r;}
    const state={view:['dir','country','name'].includes(params.get('view'))?params.get('view'):'dir',dir:DIRS[params.get('dir')]?params.get('dir'):'',kind:KINDS.some(([k])=>k===params.get('kind'))?params.get('kind'):''};
    $('search').value=params.get('q')||'';
    const r=data.report;
    $('placeOverview').innerHTML=stats([[number(data.places.length),'지명·장소'],[number(r.sessions),'배경란 수록 이야기'],[number(r.statuses.reviewed),'무대 편집'],[number(r.statuses.unresolved||0),'장소 미확정']]);
    $('worldNote').textContent=`${world.source} · ${world.note}`;
    $('atlasLegend').innerHTML=`<span>색 = 대륙 방위</span><span>${icon('village')} = 장소 유형</span><span><b>★★★</b> 30편 이상 · <b>★★</b> 5편 이상 · <b>★</b> 그 밖의 등장 이야기 수</span>`;
    const countDir=k=>data.places.filter(p=>dirParts(p.geography.direction).includes(k)).length;
    const cell=(k,area)=>{const reg=regionByKey[k],d=DIRS[k];
      return `<button type="button" class="compass-cell" data-dir="${k}" style="grid-area:${area};--c1:${d.color}"><b>${esc(d.name)}</b>${reg?`<small>${esc(reg.terrain)}</small><small class="compass-politics">${esc(reg.politics)}</small>`:'<small>위치가 확인되지 않은 곳</small>'}<span class="compass-count">${number(countDir(k))}</span></button>`;};
    $('compass').innerHTML=`<button type="button" class="compass-cell compass-all" data-dir="" style="grid-area:all"><b>전체</b><small>모든 방위</small><span class="compass-count">${number(data.places.length)}</span></button>${cell('N','n')}${cell('W','w')}${cell('C','c')}${cell('E','e')}${cell('S','s')}${cell('U','u')}<span class="compass-rose" aria-hidden="true">N<br>✦</span>`;
    $('kinds').innerHTML=KINDS.map(([k,label])=>`<button type="button" class="kind-btn" data-kind="${k}" title="${esc(label)}">${icon(k)}<span>${esc(label)}</span><small>${number(data.places.filter(p=>kindOf(p.type)===k).length)}</small></button>`).join('');
    const DIR_ORDER=['중부','북부','동북부','동부','중동부','남부','남서부','서부'];
    const dirRank=d=>{const i=DIR_ORDER.indexOf(d);return i<0?99:i;};
    const byWeight=(a,b)=>storyCount(b)-storyCount(a)||a.name.localeCompare(b.name,'ko');
    const section=(title,sub,list,style='')=>`<section class="atlas-group" style="${style}"><h2 class="atlas-group-head"><span class="group-mark" aria-hidden="true"></span>${esc(title)}<small>${esc(sub)}</small><span class="group-count">${number(list.length)}</span></h2><div class="atlas-grid">${list.map(featuredTile).join('')}</div></section>`;
    const render=()=>{
      const q=$('search').value;
      const found=data.places.filter(p=>(!state.dir||dirParts(p.geography.direction).includes(state.dir))&&(!state.kind||kindOf(p.type)===state.kind)&&queryMatches(norm([p.name,p.type,p.region,p.description,...p.aliases,...Object.values(p.geography)].join(' ')),q));
      $('resultCount').textContent=`${number(found.length)}개 지명·장소`;
      document.querySelectorAll('.atlas-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));
      document.querySelectorAll('.compass-cell').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dir===state.dir)));
      document.querySelectorAll('.kind-btn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kind===state.kind)));
      let html='';
      if(!found.length)html='<p class="empty">해당하는 지명이 없습니다.</p>';
      else if(state.view==='name')html=`<div class="atlas-grid">${[...found].sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(placeTile).join('')}</div>`;
      else{
        const key=state.view==='dir'?p=>p.geography.direction:p=>p.geography.country;
        const groups=new Map();for(const p of found){const k=key(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
        const unknownLast=k=>k.includes('미확인')?1:0;
        const keys=[...groups.keys()].sort(state.view==='dir'?(a,b)=>dirRank(a)-dirRank(b):(a,b)=>unknownLast(a)-unknownLast(b)||groups.get(b).length-groups.get(a).length||a.localeCompare(b,'ko'));
        html=keys.map(k=>{const list=groups.get(k).sort((a,b)=>isMajor(b)-isMajor(a)||byWeight(a,b));
          if(state.view==='dir'){const parts=dirParts(k);const reg=parts.length===1?regionByKey[parts[0]]:null;
            return section(k.includes('미확인')?'대륙 방위 미확인':k,reg?`${reg.terrain} · ${reg.politics}`:parts.length>1?`${parts.map(x=>DIRS[x].name).join('과 ')} 사이`:'원문에서 대륙 방위를 확인하지 못한 곳',list,`--c1:${DIRS[parts[0]].color};--c2:${DIRS[parts[1]||parts[0]].color}`);}
          return section(k,k.includes('미확인')?'소속을 확인하지 못한 곳':'',list,'--c1:var(--accent);--c2:var(--accent)');}).join('');
      }
      $('results').innerHTML=html;$('results').className=`atlas-results view-${state.view}`;
      updateURL({q,view:state.view==='dir'?'':state.view,dir:state.dir,kind:state.kind,page:''});
    };
    document.querySelectorAll('.atlas-tabs button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();});
    document.querySelectorAll('.compass-cell').forEach(b=>b.onclick=()=>{state.dir=state.dir===b.dataset.dir?'':b.dataset.dir;render();});
    document.querySelectorAll('.kind-btn').forEach(b=>b.onclick=()=>{state.kind=state.kind===b.dataset.kind?'':b.dataset.kind;render();});
    $('search').oninput=render;
    const tabs=document.querySelector('.atlas-tabs'),syncTabs=()=>document.documentElement.style.setProperty('--atlas-tabs-h',tabs.offsetHeight+'px');syncTabs();addEventListener('resize',syncTabs);
    $('reset').onclick=()=>{$('search').value='';state.dir='';state.kind='';render();};render();
  }
  function renderPlace(){
    const p=window.RP_PLACES?.places.find(p=>p.id===params.get('id'));
    if(!p){$('title').textContent='지명을 찾지 못했습니다';$('placeContent').hidden=true;return;}
    document.title=`${p.name} · 어설픈 용맹 지명록`;$('title').textContent=p.name;$('placeKind').innerHTML=`<span class="place-kind-badge" style="${dirStyle(p)}">${icon(kindOf(p.type))}${esc(p.type)} · ${esc(p.geography.direction)}</span>`;$('placeDescription').textContent=p.description;
    $('placeFacts').innerHTML=`<div><dt>소속 국가·정치권</dt><dd>${esc(p.geography.country)}</dd></div><div><dt>대륙 방위</dt><dd>${esc(p.geography.direction)}</dd></div><div><dt>현지 위치·상위 지역</dt><dd>${esc(p.region)}</dd></div><div><dt>주변 지형·공간</dt><dd>${esc(p.geography.terrain)}</dd></div>${p.geography.note?`<div><dt>위치 확인 메모</dt><dd>${esc(p.geography.note)}</dd></div>`:''}<div><dt>찾아볼 표기</dt><dd>${esc(p.aliases.join(' · '))}</dd></div><div><dt>해석할 때의 구분</dt><dd>${esc(p.caution)}</dd></div>`;
    $('placeSources').innerHTML=p.evidence.map(e=>`<div><p><a href="${sourceLink(e.sessionId,e.anchor)}">${esc(sessions.get(e.sessionId)?.title)}</a></p>${quote(e,e.sessionId)}</div>`).join('')||(p.sourceIds.length?'<p class="muted">현재 설명은 아래 검토 요약에 근거합니다. 지명과 일치하는 원문 구절은 추가 확인이 필요합니다.</p>':'<p class="muted">2026-10-02 제공된 세계관 기준 설정입니다. 연결할 원문 구절은 아직 확인되지 않았습니다.</p>');
    $('placeEvents').innerHTML=p.sources.map(s=>`<article class="place-event"><h3><a href="${readLink(s.id)}#settingContent">${esc(s.title)}</a></h3><p>${esc(s.summary)}</p><a href="${readLink(s.id)}#summaryBox">검토 요약과 원문 →</a></article>`).join('');
    let page=initialPage();const size=20;
    $('scope').value=params.get('scope')||'scene';if(!$('scope').value)$('scope').value='scene';
    const render=()=>{
      const found=p.references.filter(r=>$('scope').value==='all'||($('scope').value==='mention'?r.role==='mention':r.role!=='mention'));
      const total=Math.max(1,Math.ceil(found.length/size));page=Math.min(page,total-1);
      $('resultCount').textContent=`${number(found.length)}개 이야기 · ${$('scope').value==='scene'?'주요 무대':$('scope').value==='mention'?'단순 언급':'주요 무대와 단순 언급'}`;
      $('results').innerHTML=found.slice(page*size,(page+1)*size).map(r=>`<div class="place-story"><p class="place-role">${r.role==='mention'?'단순 언급 · 방문 확정 아님':r.role==='summary'?'주요 무대 · 검토 요약 기준':'주요 무대 · 검토 요약과 원문 단서'} · <a href="${sourceLink(r.sessionId,r.anchor)}">해당 대목</a></p>${storyCard(sessions.get(r.sessionId))}</div>`).join('')||'<p class="empty">이 범위에서 확인된 이야기가 없습니다. 단순 언급을 포함해 볼 수 있습니다.</p>';
      updateURL({scope:$('scope').value==='scene'?'':$('scope').value,page:page?String(page+1):''});pager(page,total,n=>{page=n;render();$('resultCount').scrollIntoView();});
    };
    $('scope').oninput=()=>{page=0;render();};render();
  }
  return {renderSetting,renderPlaces,renderPlace};
})();
