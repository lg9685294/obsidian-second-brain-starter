(async function(){
  const C=window.SecondBrainCaptureCore;let state=JSON.parse(localStorage.getItem('second-brain-capture-preview')||'null')||{drafts:{},records:[]};
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('second-brain-capture-preview',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  function storeFile(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
  function loadFile(key){return new Promise((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  const resources={};for(const d of Object.values(state.drafts))for(const a of d.attachments||[]){const f=await loadFile(a.path);if(f)resources[a.path]=URL.createObjectURL(f);}
  function persist(){localStorage.setItem('second-brain-capture-preview',JSON.stringify(state));}
  const icons={
    'notebook-pen':'<path d="M5 3h11v18H5zM2 7h5M2 12h5M2 17h5m7-1 7-7 2 2-7 7-3 1z"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    'graduation-cap':'<path d="m2 8 10-5 10 5-10 5L2 8m4 2v6c4 3 8 3 12 0v-6m4-2v8"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18z"/>',
    lightbulb:'<path d="M9 18h6m-6 3h6M8 15a7 7 0 1 1 8 0l-1 3H9z"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8l10-5zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    'image-plus':'<rect x="3" y="3" width="15" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 10 8m3-17v6m-3-3h6"/>',
    'file-text':'<path d="M14 2H5v20h14V7l-5-5zm0 0v6h5M8 12h8m-8 4h8"/>',
    sparkles:'<path d="m12 3 2 6 6 3-6 2-2 7-3-7-6-2 6-3 3-6zm8 0v4m-2-2h4"/>'
  };
  const adapter={preview:true,scene:'meeting',projects:[{name:'示例App-组件设计',path:'Efforts（项目行动）/On（正在推进）/示例App-组件设计.md'},{name:'示例会员卡项目',path:'Efforts（项目行动）/On（正在推进）/示例会员卡项目.md'}],
    getDraft(s){return state.drafts[s]||(state.drafts[s]=C.fresh(s));},changed:persist,flush:async()=>persist(),startFresh(s){state.drafts[s]=C.fresh(s);persist();},
    icon(n,name){n.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons['file-text']}</svg>`;},
    resource:a=>resources[a.path]||'',
    async importFile(f,d){const p=`${C.ASSETS}/${d.id}/${C.safeName(f.name)}`;await storeFile(p,f);resources[p]=URL.createObjectURL(f);return{path:p,name:f.name,type:f.type,size:f.size,image:f.type.startsWith('image/'),caption:''};},
    async save(d){const md=C.markdown(d);const r={path:C.notePath(d),title:C.titleFor(d),date:d.date.slice(0,10),markdown:md};state.records.unshift(r);state.drafts[d.scene]=C.fresh(d.scene);persist();return r;},
    async recent(){return state.records.slice(0,4);},
    open(p){const r=state.records.find(r=>r.path===p);if(r){const url=URL.createObjectURL(new Blob([r.markdown],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=r.title+'.md';a.click();}},
    openIndex(){alert('正式版本会在 Obsidian 内打开“录入记录（按日期查看）”。此处只作界面预览。');}
  };
  new window.SecondBrainCaptureUI.CaptureUI(document.getElementById('preview'),adapter);
})();
