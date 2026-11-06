'use strict';
const {Plugin,ItemView,Notice,normalizePath,setIcon,Platform}=require('obsidian');
const Core=require('./core');
const UI=require('./ui');
const VIEW='second-brain-capture-view';

class CaptureView extends ItemView{
  constructor(leaf,plugin){super(leaf);this.plugin=plugin;}
  getViewType(){return VIEW;}
  getDisplayText(){return '新建笔记';}
  getIcon(){return 'notebook-pen';}
  async onOpen(){this.contentEl.empty();this.ui=new UI.CaptureUI(this.contentEl,this.plugin.adapter());}
  async onClose(){await this.plugin.flush();this.ui?.destroy();}
  async selectScene(scene){await this.plugin.flush();this.plugin.scene=scene;if(this.ui){this.ui.scene=scene;this.ui.saved=false;this.ui.render();}}
}

module.exports=class SecondBrainCapture extends Plugin{
  async onload(){
    const saved=await this.loadData();this.data={zone:Core.DEFAULT_ZONE,drafts:{},saved:{},...(saved||{})};this.scene='meeting';this.queue=Promise.resolve();
    this.registerView(VIEW,leaf=>new CaptureView(leaf,this));
    this.addRibbonIcon('notebook-pen','新建笔记表单',()=>this.activate());
    this.addCommand({id:'open-capture',name:'新建笔记表单',hotkeys:[{modifiers:Platform.isMacOS?['Mod','Ctrl']:['Mod','Alt'],key:'N'}],callback:()=>this.activate()});
    this.addCommand({id:'meeting-note',name:'记录会议',callback:()=>this.activate('meeting')});
    this.registerObsidianProtocolHandler('second-brain-capture',params=>this.activate(Core.SCENES[params.scene]?params.scene:undefined));
    this.registerMarkdownCodeBlockProcessor('capture-entry',(_source,node)=>{
      node.classList.add('gc-entry');
      for(const [key,title]of [['meeting','记录会议'],['course','记课堂笔记'],['idea','随手记一点']]){
        const b=node.createEl('button',{text:title,cls:key==='meeting'?'gc-entry-primary':''});b.onclick=()=>this.activate(key);
      }
    });
  }
  onunload(){clearTimeout(this.timer);this.flush().catch(()=>{});}
  getDraft(scene){
    const old=this.data.drafts[scene];
    const empty=old&&!old.touched&&!['title','context','body','result','next','project'].some(k=>String(old[k]||'').trim())&&!old.attachments?.length;
    if(!old||(empty&&old.date.slice(0,10)!==Core.localParts(new Date(),this.data.zone).slice(0,10)))this.data.drafts[scene]=Core.fresh(scene,this.data.zone);
    return this.data.drafts[scene];
  }
  changed(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(e=>new Notice('草稿暂未保留：'+e.message)),350);}
  flush(){clearTimeout(this.timer);const snapshot=JSON.parse(JSON.stringify(this.data));this.queue=this.queue.catch(()=>{}).then(()=>this.saveData(snapshot));return this.queue;}
  async ensureFolder(path){let current='';for(const part of path.split('/')){current=current?current+'/'+part:part;if(!this.app.vault.getAbstractFileByPath(current)){try{await this.app.vault.createFolder(current);}catch(e){if(!this.app.vault.getAbstractFileByPath(current))throw e;}}}}
  async activate(scene){
    const existing=this.app.workspace.getLeavesOfType(VIEW);let leaf=existing[0];
    if(scene)this.scene=scene;
    if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});}
    else if(scene)await leaf.view.selectScene(scene);
    await this.app.workspace.revealLeaf(leaf);
  }
  adapter(){
    const p=this;return{
      get scene(){return p.scene;},set scene(v){p.scene=v;},
      projects:p.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('Efforts（项目行动）/')&&!/本层说明|导航|模板|项目列表/.test(f.basename)).map(f=>({name:f.basename,path:f.path})).sort((a,b)=>a.name.localeCompare(b.name,'zh')),
      getDraft:s=>p.getDraft(s),changed:()=>p.changed(),flush:()=>p.flush(),
      startFresh:s=>{p.data.drafts[s]=Core.fresh(s,p.data.zone);p.changed();},
      icon:setIcon,
      resource:a=>{const f=p.app.vault.getAbstractFileByPath(a.path);return f?p.app.vault.getResourcePath(f):'';},
      importFile:async(file,d)=>{
        const dir=Core.ASSETS+'/'+Core.safeName(d.id);await p.ensureFolder(dir);
        const original=Core.safeName(file.name,'附件');const lastDot=original.lastIndexOf('.');
        const name=lastDot>0?original.slice(0,lastDot)+'-'+Core.id().slice(0,8)+original.slice(lastDot):original+'-'+Core.id().slice(0,8);
        const path=normalizePath(dir+'/'+name);const bytes=await file.arrayBuffer();await p.app.vault.createBinary(path,bytes);
        return {path,name:file.name.replace(/[\r\n]/g,' '),size:file.size,type:file.type,image:/^image\//.test(file.type)||/\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(file.name),caption:''};
      },
      save:async d=>{
        Core.validate(d);
        if(p.data.saved[d.id])return{path:p.data.saved[d.id]};
        for(const a of d.attachments)if(!p.app.vault.getAbstractFileByPath(a.path))throw Error('有附件未找到，请重新添加：'+a.name);
        await p.ensureFolder(Core.FOLDER);const path=Core.notePath(d);
        const existing=p.app.vault.getAbstractFileByPath(path);
        if(existing){
          const content=await p.app.vault.read(existing);
          if(!content.includes('capture_id: '+JSON.stringify(d.id)+'\n'))throw Error('已有同名文件，原笔记已保留。请关闭后重新打开表单。');
        }else await p.app.vault.create(path,Core.markdown(d,p.data.zone));
        p.data.saved[d.id]=path;p.data.drafts[d.scene]=Core.fresh(d.scene,p.data.zone);
        // Once the note exists, a failed preference write must not turn a successful save into data loss.
        try{await p.flush();}catch(e){new Notice('笔记已保存；草稿状态未能更新，重新打开前请先查看该笔记。');}
        return{path};
      },
      recent:async()=>p.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(Core.FOLDER+'/')&&/^\d{4}-\d{2}-\d{2}-\d{4}-/.test(f.basename)).sort((a,b)=>b.stat.ctime-a.stat.ctime).slice(0,4).map(f=>({path:f.path,title:p.app.metadataCache.getFileCache(f)?.frontmatter?.title||f.basename.replace(/^\d{4}-\d{2}-\d{2}-\d{4}-/,'').replace(/-[a-z0-9]{8}$/,''),date:f.basename.slice(0,10)})),
      open:path=>p.app.workspace.openLinkText(path,'',false),
      openIndex:()=>p.app.workspace.openLinkText('+（收集箱）/录入记录（按日期查看）.base','',false)
    };
  }
};
