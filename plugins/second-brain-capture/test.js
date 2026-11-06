const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('./src/core');
async function run(){
  let d=Core.fresh('meeting');d.date='2026-11-02T10:30';d.title='首页评审 / 初稿';d.body='讨论：容器遮住了图标特征。';d.result='保留原3D形象。';d.next='我 · 周五前调整\n老师 · 下次确认';
  const mk=Core.markdown(d);assert(mk.includes('- [ ] 我 · 周五前调整'));assert(mk.includes('status: "待整理"'));assert(!Core.notePath(d).includes(' / '));assert(mk.includes('保留原3D形象。'));
  assert.throws(()=>Core.markdown(Core.fresh()),/先写一点/);
  const img={path:Core.ASSETS+'/'+d.id+'/图.png',name:'图.png',type:'image/png',image:true,size:20,caption:'参考'};
  const file={path:Core.ASSETS+'/'+d.id+'/课件.pdf',name:'课件.pdf',type:'application/pdf',image:false,size:12};
  const attachmentOnly=Core.fresh('course');attachmentOnly.attachments=[img,file];assert(Core.markdown(attachmentOnly).includes(`![[${img.path}|520]]`));assert(Core.markdown(attachmentOnly).includes(`[[${file.path}|课件.pdf]]`));
  assert.throws(()=>Core.markdown({...d,attachments:[{...img,path:'/etc/passwd'}]}),/附件位置异常/);
  assert.throws(()=>Core.markdown({...d,project:'../../secret.md'}),/项目关联有误/);
  assert.equal(Core.localParts(new Date('2026-11-02T18:00:00Z'),'Asia/Shanghai'),'2026-11-03T02:00');
  const store=new Map(),persisted=[];let failCreate=false;const folders=new Set();
  const fakeApp={vault:{getAbstractFileByPath:p=>store.get(p)|| (folders.has(p)?{path:p}:null),createFolder:async p=>folders.add(p),create:async(p,text)=>{if(failCreate)throw Error('disk full');assert(!store.has(p));const v={path:p,content:text,basename:p.split('/').pop().replace(/\.md$/,''),stat:{ctime:Date.now()}};store.set(p,v);return v;},createBinary:async(p,b)=>{store.set(p,{path:p,bytes:b});},read:async f=>f.content,getMarkdownFiles:()=>[...store.values()].filter(x=>x.content),getResourcePath:f=>'file://'+f.path},workspace:{getLeavesOfType:()=>[],openLinkText:()=>{},on:()=>{}},metadataCache:{getFileCache:()=>null}};
  class Plugin{constructor(){this.app=fakeApp;}async loadData(){return null;}async saveData(v){persisted.push(JSON.parse(JSON.stringify(v)));}registerView(){}addRibbonIcon(){}addCommand(){}registerObsidianProtocolHandler(){}registerMarkdownCodeBlockProcessor(){}}
  const mod={exports:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/main.js','utf8'),{module:mod,exports:mod.exports,require:n=>{assert.equal(n,'obsidian');return{Plugin,ItemView:class{},Notice:class{},normalizePath:p=>p,setIcon:()=>{},Platform:{isMacOS:true}};},console,crypto:globalThis.crypto,Intl,Date,setTimeout,clearTimeout});
  const plugin=new mod.exports();await plugin.onload();const a=plugin.adapter();const draft=a.getDraft('meeting');draft.body='测试：保存原始记录';draft.date='2026-11-02T10:30';
  await a.flush();const r=await a.save(draft);assert(store.has(r.path));const count=store.size;assert.equal((await a.save(draft)).path,r.path);assert.equal(store.size,count,'double save must be idempotent');
  const failure=a.getDraft('meeting');failure.body='保存失败也要保留';failCreate=true;await assert.rejects(a.save(failure),/disk full/);assert.equal(a.getDraft('meeting').body,'保存失败也要保留');failCreate=false;
  const uploaded=await a.importFile({name:'照片[1].png',type:'image/png',size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer},failure);assert(store.has(uploaded.path));failure.attachments.push(uploaded);await a.save(failure);assert([...store.values()].some(x=>x.content?.includes(uploaded.path)));
  // Simulate restart after file creation but before preferences have persisted.
  delete plugin.data.saved[draft.id];assert.equal((await a.save(draft)).path,r.path);
  console.log('PASS: content and attachment-only notes; timezone; safe paths; preserved text; idempotent save; failed-save recovery; attachment links; interrupted-save recovery.');
}
run().catch(e=>{console.error(e);process.exit(1);});
