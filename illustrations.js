(() => {
  'use strict';
  const data=window.RP_ILLUSTRATIONS||{},entries=data.entries||[];
  const defaultStyle=data.defaultStyle||'style-001';
  const styles=data.styles?.length?data.styles:[{id:defaultStyle,name:'현대 판타지풍',number:1}];
  const styleMap=new Map(styles.map(style=>[style.id,style]));
  const params=new URLSearchParams(location.search),preferenceKey='rp.illustrationView.v1',legacyKey='rp.illustrationStyle.v1';
  const validView=value=>value==='fantasy'||value==='other';
  let savedView='',legacyStyle='';
  try{savedView=localStorage.getItem(preferenceKey)||'';legacyStyle=localStorage.getItem(legacyKey)||'';}catch{}
  if(!validView(savedView)){
    savedView=styleMap.has(legacyStyle)&&legacyStyle!==defaultStyle?'other':'fantasy';
    if(styleMap.has(legacyStyle))try{localStorage.setItem(preferenceKey,savedView);}catch{}
  }
  const sharedStyle=styleMap.has(params.get('style'))?params.get('style'):'';
  let preferredView=validView(params.get('view'))?params.get('view'):sharedStyle?(sharedStyle===defaultStyle?'fantasy':'other'):savedView;
  let sharedAnchor='';try{sharedAnchor=decodeURIComponent((location.hash||'').slice(1));}catch{}
  const sharedEntry=sharedAnchor.startsWith('illustration-')?sharedAnchor.slice(13):entries.find(entry=>entry.after===sharedAnchor)?.id;
  const requestedForEntry=entry=>document.body.dataset.page!=='illustrations'&&sharedStyle&&sharedEntry===entry.id?sharedStyle:preferredView;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const anchor=entry=>'illustration-'+entry.id;
  const styleName=id=>styleMap.get(id)?.name||styleMap.get(defaultStyle)?.name||'현대 판타지풍';
  const availableStyles=entry=>[defaultStyle,...styles.filter(style=>style.id!==defaultStyle&&entry.variants?.some(variant=>variant.style===style.id)).map(style=>style.id)];
  const resolveImage=(entry,requested=requestedForEntry(entry))=>{
    const wanted=requested==='other'?'other':styleMap.has(requested)?requested:defaultStyle;
    const variant=wanted==='other'?(entry.variants?.find(item=>item.representative)||entry.variants?.[0]):wanted===defaultStyle?null:entry.variants?.find(item=>item.style===wanted);
    return {image:variant?.image||entry.image,thumbnail:variant?.thumbnail||entry.thumbnail,
      width:variant?.width||entry.width,height:variant?.height||entry.height,
      thumbnailWidth:variant?.thumbnailWidth||Math.min(768,entry.width),
      alt:variant?(variant.alt||`${entry.alt} — ${styleName(variant.style)}`):entry.alt,
      style:variant?variant.style:defaultStyle,requestedStyle:wanted,fallback:wanted!==defaultStyle&&!variant};
  };
  const sceneLink=(entry,requested=preferredView,character='')=>`read.html?id=${encodeURIComponent(entry.session)}${character?'&character='+encodeURIComponent(character):''}&view=${validView(requested)?requested:preferredView}${styleMap.has(requested)?'&style='+encodeURIComponent(requested):''}#${anchor(entry)}`;
  const imageHTML=(entry,{style=requestedForEntry(entry),sizes='(max-width: 650px) 100vw, 720px',eager=false}={})=>{
    const asset=resolveImage(entry,style);
    return `<img src="${esc(asset.image)}" srcset="${esc(asset.thumbnail)} ${asset.thumbnailWidth}w, ${esc(asset.image)} ${asset.width}w" sizes="${sizes}" width="${asset.width}" height="${asset.height}" alt="${esc(asset.alt)}" data-art-style="${esc(asset.style)}" loading="${eager?'eager':'lazy'}" decoding="async"${eager?' fetchpriority="high"':''}>`;
  };
  const styleNote=asset=>`<p class="illustration-style-note${asset.fallback?' is-fallback':''}">${esc(styleName(asset.style))}${asset.fallback?' · 다른 화풍이 없어 판타지풍으로 표시합니다.':''}</p>`;
  const bySession=new Map();
  for(const entry of entries){if(!bySession.has(entry.session))bySession.set(entry.session,[]);bySession.get(entry.session).push(entry);}
  window.Illustrations={
    resolveImage,availableStyles,
    storyPreviewHTML(session,character=''){
      const own=bySession.get(session)||[];
      if(!own.length)return '';
      return `<div class="story-illustrations">${own.map(entry=>`<figure><a href="${sceneLink(entry,preferredView,character)}" aria-label="${esc(entry.title)} — 이 장면 읽기">${imageHTML(entry,{style:preferredView,sizes:'(max-width: 650px) 100vw, 420px'})}<figcaption>${esc(entry.title)} <span aria-hidden="true">→</span></figcaption></a></figure>`).join('')}</div>`;
    },
    anchorMessage(session,hash){return bySession.get(session)?.find(entry=>anchor(entry)===hash)?.after;},
    afterMessageHTML(session,message){
      return (bySession.get(session)||[]).filter(entry=>entry.after===message).map(entry=>{
        const asset=resolveImage(entry);
        return `<figure id="${anchor(entry)}" class="scene-illustration" tabindex="-1"><a class="illustration-image" href="${esc(asset.image)}" target="_blank" rel="noopener" aria-label="${esc(entry.title)} — 그림 크게 보기 (새 탭)">${imageHTML(entry)}</a><figcaption><span class="eyebrow">ILLUSTRATED MOMENT</span><h3>${esc(entry.title)}</h3><p>${esc(entry.caption)}</p>${styleNote(asset)}<div class="illustration-actions"><a href="#${esc(entry.after)}">이 장면의 대화 ↑</a><a href="${esc(asset.image)}" target="_blank" rel="noopener">그림 크게 보기 ↗</a><a href="illustrations.html?view=${preferredView}#${anchor(entry)}">일러스트집으로 →</a></div></figcaption></figure>`;
      }).join('');
    },
    renderContents(session){
      const box=document.getElementById('illustrationsBox');if(!box)return;
      const own=bySession.get(session)||[];box.hidden=!own.length;
      if(own.length)box.innerHTML=`<summary>이 이야기의 삽화 <span class="muted">· ${own.length}장</span></summary><ul class="scene-illustration-index">${own.map(entry=>`<li><a href="#${anchor(entry)}">${esc(entry.title)} <span aria-hidden="true">↓</span></a></li>`).join('')}</ul>`;
    }
  };
  if(document.body.dataset.page!=='illustrations')return;
  const $=id=>document.getElementById(id);
  $('artSearch').value=params.get('q')||'';
  $('artKind').value=['prepared','free'].includes(params.get('kind'))?params.get('kind'):'';
  $('artSort').value=['oldest','newest','random'].includes(params.get('sort'))?params.get('sort'):'random';
  $('artStyle').value=preferredView;
  $('artVariantsOnly').checked=params.get('variants')==='1';
  const overrides=new Map();
  const shuffled=[...entries];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const randomRank=new Map(shuffled.map((entry,index)=>[entry.id,index]));
  const norm=text=>String(text).normalize('NFKC').toLocaleLowerCase('ko').trim();
  const cardBody=(entry,index)=>{
    const requested=overrides.get(entry.id)||preferredView,asset=resolveImage(entry,requested),available=availableStyles(entry);
    const link=sceneLink(entry,requested);
    const controls=available.length>1?`<label class="illustration-style-choice" for="art-style-${entry.id}">이 그림의 화풍<select id="art-style-${entry.id}" data-illustration-style="${entry.id}">${available.map(id=>`<option value="${esc(id)}"${asset.style===id?' selected':''}>${esc(styleName(id))}</option>`).join('')}</select></label>`:'';
    return `<a class="illustration-image" href="${link}" aria-label="${esc(entry.title)} — 이 장면 읽기">${imageHTML(entry,{style:requested,sizes:index===0?'(max-width: 760px) 100vw, 700px':'(max-width: 650px) 100vw, 540px',eager:index===0})}</a><div class="illustration-caption"><p class="eyebrow"><time datetime="${entry.start.slice(0,10)}">${entry.start.slice(0,10).replaceAll('-','.')}</time> · ${esc(entry.storyLabel)}</p><h2><a href="${link}">${esc(entry.title)}</a></h2><p>${esc(entry.caption)}</p><p class="illustration-people">${entry.characters.map(esc).join(' · ')}</p><p class="illustration-source">${esc(entry.sessionTitle)}</p><div class="illustration-style-controls">${controls}${styleNote(asset)}</div><div class="illustration-actions"><a class="illustration-read" href="${link}">이 장면 읽기 →</a><a href="${esc(asset.image)}" target="_blank" rel="noopener" aria-label="${esc(entry.title)} — 그림 크게 보기 (새 탭)">크게 보기 ↗</a></div></div>`;
  };
  const render=()=>{
    const query=norm($('artSearch').value).split(/\s+/).filter(Boolean),kind=$('artKind').value,sort=$('artSort').value;
    const selected=entries.filter(entry=>(!$('artVariantsOnly').checked||availableStyles(entry).length>1)&&(!kind||entry.story===kind)&&query.every(word=>norm([entry.title,entry.caption,entry.sessionTitle,...entry.characters].join(' ')).includes(word))).sort((a,b)=>sort==='random'?randomRank.get(a.id)-randomRank.get(b.id):(sort==='oldest'?1:-1)*(a.start.localeCompare(b.start)||a.id.localeCompare(b.id)));
    $('artCount').textContent=`${selected.length}장의 삽화 · ${sort==='random'?'랜덤 순':sort==='oldest'?'오래된 세션 순':'최근 세션 순'}`;
    const matching=selected.filter(entry=>resolveImage(entry,'other').style!==defaultStyle).length;
    $('artStyleSummary').textContent=preferredView==='fantasy'?'판타지풍으로 표시합니다.':`다른 화풍의 대표 이미지 ${matching}장 · 나머지 ${selected.length-matching}장은 판타지풍으로 표시합니다.`;
    $('illustrationGallery').innerHTML=selected.map((entry,index)=>`<article id="${anchor(entry)}" data-illustration="${entry.id}" class="illustration-card${index===0?' illustration-featured':''}">${cardBody(entry,index)}</article>`).join('')||'<p class="empty">조건에 맞는 삽화가 없습니다.</p>';
    try{const url=new URL(location.href);url.searchParams.delete('style');for(const [key,value]of [['q',$('artSearch').value],['kind',kind],['sort',sort==='random'?'':sort],['view',preferredView],['variants',$('artVariantsOnly').checked?'1':'']]){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}history.replaceState(null,'',url);}catch{}
  };
  for(const id of ['artSearch','artKind','artSort'])$(id).addEventListener('input',render);
  $('artVariantsOnly').addEventListener('input',render);
  $('artStyle').addEventListener('input',()=>{
    preferredView=validView($('artStyle').value)?$('artStyle').value:'fantasy';
    overrides.clear();
    try{localStorage.setItem(preferenceKey,preferredView);localStorage.removeItem(legacyKey);}catch{}
    render();
  });
  $('illustrationGallery').addEventListener('change',event=>{
    const id=event.target.dataset.illustrationStyle;if(!id)return;
    const entry=entries.find(item=>item.id===id);if(!entry||!availableStyles(entry).includes(event.target.value))return;
    overrides.set(id,event.target.value);
    const card=document.getElementById(anchor(entry));
    card.innerHTML=cardBody(entry,card.classList.contains('illustration-featured')?0:1);
    document.getElementById('art-style-'+id)?.focus({preventScroll:true});
  });
  render();
  const jump=()=>{let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}if(hash)document.getElementById(hash)?.scrollIntoView({block:'start'});};
  window.addEventListener('hashchange',jump);jump();
})();
