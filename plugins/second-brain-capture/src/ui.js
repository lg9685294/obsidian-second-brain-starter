(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./core'));
  else root.SecondBrainCaptureUI=factory(root.SecondBrainCaptureCore);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
  'use strict';
  function el(tag,cls,text,parent){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;if(parent)parent.appendChild(n);return n;}
  function button(text,cls,parent,fn){const n=el('button',cls,text,parent);n.type='button';n.addEventListener('click',fn);return n;}
  function label(parent,text,optional){const l=el('label','gc-label',text,parent);if(optional)el('span','gc-optional','选填',l);return l;}
  class CaptureUI{
    constructor(container,adapter){this.root=container;this.a=adapter;this.scene=adapter.scene||'meeting';this.busy=false;this.previewURLs=[];this.render();}
    destroy(){clearTimeout(this.timer);this.root.onkeydown=null;this.root.replaceChildren();this.previewURLs.forEach(x=>URL.revokeObjectURL(x));}
    render(){
      this.root.replaceChildren();this.root.classList.add('gc-root');this.d=this.a.getDraft(this.scene);const s=Core.SCENES[this.scene];
      const page=el('div','gc-page',undefined,this.root);
      const header=el('header','gc-header',undefined,page),brand=el('div','gc-brand',undefined,header);
      this.icon(brand,'notebook-pen','gc-brand-icon');el('span','','我的第二大脑',brand);
      const hright=el('div','gc-header-right',undefined,header);this.draftState=el('span','gc-draft-state','草稿已保留',hright);
      const hero=el('div','gc-hero',undefined,page);el('h1','','记下这一刻',hero);el('p','','不必想好怎么写，按下面的提示记一点就好。',hero);
      const tabs=el('div','gc-scenes',undefined,page);tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','记录类型');
      for(const [key,scene]of Object.entries(Core.SCENES)){
        const b=button('',`gc-scene ${key===this.scene?'is-active':''}`,tabs,async()=>{if(this.busy)return;try{await this.a.flush();clearTimeout(this.timer);this.scene=key;this.a.scene=key;this.saved=false;this.render();}catch(e){this.showError('草稿暂未保留，请先保存或稍后再切换：'+e.message);}});
        b.setAttribute('role','tab');b.setAttribute('aria-selected',String(key===this.scene));this.icon(b,scene.icon);el('span','',scene.name,b);
      }
      const layout=el('div','gc-layout',undefined,page),form=el('div','gc-compose',undefined,layout),aside=el('aside','gc-aside',undefined,layout);
      const top=el('section','gc-section gc-top',undefined,form);this.sectionTitle(top,'01',s.body,'先记重点，标题可以稍后补。');
      const title=el('input','gc-title',undefined,top);title.type='text';title.placeholder=s.title;title.value=this.d.title;title.maxLength=160;title.setAttribute('aria-label','笔记标题（选填）');this.bind(title,'title');
      const area=el('textarea','gc-body',undefined,top);area.placeholder=s.bodyHint;area.value=this.d.body;area.setAttribute('aria-label',s.body);area.rows=7;this.bind(area,'body');
      area.addEventListener('paste',event=>this.pasteImages(event));
      const foot=el('div','gc-field-foot',undefined,top);el('span','','内容或附件，留下一项就能保存',foot);this.count=el('span','',`${this.d.body.length} 字`,foot);
      const metadata=el('details','gc-section gc-metadata',undefined,form);el('summary','','时间、类别已填好 · 可补充关联信息',metadata);
      const meta=el('div','gc-meta',undefined,metadata),time=el('div','gc-field',undefined,meta);const tl=label(time,'记录时间');
      const date=el('input','gc-input',undefined,time);date.type='datetime-local';date.value=this.d.date;date.setAttribute('aria-label','记录时间');tl.htmlFor=date.id='gc-date';this.bind(date,'date');
      const cat=el('div','gc-field',undefined,meta);label(cat,'内容类别');const select=el('select','gc-input',undefined,cat);select.setAttribute('aria-label','内容类别');
      for(const c of ['设计学习','项目实践','工具与AI','生活灵感']){const o=el('option','',c,select);o.value=c;}select.value=this.d.category;this.bind(select,'category');
      const project=el('div','gc-field gc-project',undefined,metadata);label(project,'关联项目',true);const ps=el('select','gc-input',undefined,project);ps.setAttribute('aria-label','关联项目');el('option','','暂时不关联',ps).value='';
      for(const p of this.a.projects||[]){const o=el('option','',p.name,ps);o.value=p.path;}ps.value=this.d.project;this.bind(ps,'project');
      const ctx=el('div','gc-field',undefined,metadata);label(ctx,s.context,true);const ci=el('input','gc-input',undefined,ctx);ci.type='text';ci.value=this.d.context;ci.placeholder=s.contextHint;ci.setAttribute('aria-label',s.context);this.bind(ci,'context');
      const extra=el('section','gc-section',undefined,form);this.sectionTitle(extra,'02','再留一点线索','现在想不起来，也可以下次补。',true);
      this.textarea(extra,s.result,s.resultHint,'result',3);this.textarea(extra,s.next,s.nextHint,'next',3);
      this.imageSection=el('section','gc-section gc-attachments',undefined,aside);this.sectionTitle(this.imageSection,'03','图片与附件','像发笔记一样，把材料放在这里。');
      const drop=el('div','gc-drop',undefined,this.imageSection);drop.setAttribute('aria-label','图片拖放区域');this.icon(drop,'image-plus','gc-drop-icon');el('strong','','拖入图片 / 截图',drop);el('p','','也可以在正文里直接粘贴截图',drop);
      const pick=el('div','gc-pick-row',undefined,drop);button('选择图片','gc-btn gc-btn-soft',pick,()=>this.choose(true));
      button('粘贴截图','gc-btn gc-btn-text',pick,()=>this.clipboard());
      for(const event of ['dragenter','dragover'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('is-dragging');});
      drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
      drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('is-dragging');this.addFiles(e.dataTransfer.files);});
      this.imageList=el('div','gc-image-list',undefined,this.imageSection);
      const fileHead=el('div','gc-file-head',undefined,this.imageSection);el('span','gc-label','文件附件',fileHead);button('＋ 添加文件','gc-btn gc-btn-text',fileHead,()=>this.choose(false));
      this.fileList=el('div','gc-file-list',undefined,this.imageSection);el('p','gc-attachment-hint','支持图片、PDF、文档、音视频；每个文件最多200 MB。',this.imageSection);
      const help=el('section','gc-guide',undefined,aside);this.icon(help,'sparkles');el('h3','','先记下来，之后再整理',help);el('p','','保存后会按日期收进知识库。之后对我说“整理今天的笔记”，我会结合这些文字和附件继续归纳。',help);
      el('p','gc-guide-small','“保存”只存原始记录，不会自动生成结论。',help);
      const recent=el('section','gc-recent',undefined,aside);el('h3','','最近保存',recent);this.recentList=el('div','',undefined,recent);this.renderRecent();
      const bar=el('footer','gc-savebar',undefined,page);const info=el('div','gc-save-info',undefined,bar);this.status=el('div','gc-status',this.a.preview?'交互预览 · 不写入真实知识库':'保存在你的知识库中',info);el('div','gc-save-sub','字段不用全填，附件会和笔记一起保留。',info);
      const actions=el('div','gc-save-actions',undefined,bar);button('查看全部记录','gc-btn gc-btn-text',actions,()=>this.a.openIndex());this.saveBtn=button('保存到知识库','gc-btn gc-btn-primary',actions,()=>this.save());
      this.saveBtn.setAttribute('aria-label','保存到知识库');
      this.error=el('div','gc-error',undefined,page);this.error.setAttribute('role','alert');this.error.hidden=true;
      if(this.a.preview)el('div','gc-preview-label','交互预览 · 示例保存仅用于验证，不写入你的知识库',page);
      this.renderAttachments();
      this.root.onkeydown=e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();this.save();}};
    }
    icon(parent,name,cls=''){const n=el('span','gc-icon '+cls,undefined,parent);n.setAttribute('aria-hidden','true');this.a.icon(n,name);return n;}
    sectionTitle(parent,num,title,hint,optional=false){const h=el('div','gc-section-heading',undefined,parent);el('span','gc-step',num,h);el('h2','',title,h);if(optional)el('span','gc-optional','选填',h);if(hint)el('p','gc-section-hint',hint,parent);}
    textarea(parent,name,hint,key,rows){const wrap=el('div','gc-field',undefined,parent);const l=label(wrap,name,true),n=el('textarea','gc-textarea',undefined,wrap);n.rows=rows;n.placeholder=hint;n.value=this.d[key];n.setAttribute('aria-label',name);this.bind(n,key);return n;}
    bind(n,key){n.addEventListener('input',()=>{this.d[key]=n.value;this.d.touched=true;this.d.updated=Date.now();this.a.changed();this.draftState.textContent='正在保留草稿…';if(this.count)this.count.textContent=`${this.d.body.length} 字`;clearTimeout(this.timer);this.timer=setTimeout(async()=>{try{await this.a.flush();if(!this.saved)this.draftState.textContent='草稿已保留';}catch(e){this.draftState.textContent='草稿暂未保留';this.showError('草稿暂未保留，请保持表单打开并重试保存：'+e.message);}},700);});}
    showError(message){this.error.textContent=message;this.error.hidden=false;this.error.scrollIntoView({behavior:'smooth',block:'nearest'});}
    choose(images){const input=document.createElement('input');input.type='file';input.multiple=true;if(images)input.accept='image/*';input.addEventListener('change',()=>this.addFiles(input.files));input.click();}
    pasteImages(event){const files=Array.from(event.clipboardData?.items||[]).filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);if(files.length){event.preventDefault();this.addFiles(files);}}
    async clipboard(){try{const items=await navigator.clipboard.read();const files=[];for(const item of items)for(const type of item.types.filter(x=>x.startsWith('image/'))){const blob=await item.getType(type);files.push(new File([blob],`截图-${Date.now()}.${type.includes('jpeg')?'jpg':'png'}`,{type}));break;}if(!files.length)throw Error('剪贴板里没有图片。可以先截图，或点击“选择图片”。');await this.addFiles(files);}catch(e){this.showError(e.message||'请在正文里粘贴截图，或点击“选择图片”。');}}
    async addFiles(list){if(this.busy||this.saved)return;this.busy=true;this.saveBtn.disabled=true;this.error.hidden=true;let failed=[];try{for(const f of Array.from(list||[])){if(!f.size){failed.push(`${f.name}：文件为空`);continue;}if(f.size>200*1024*1024){failed.push(`${f.name}：超过200 MB，可先在正文记下原文件位置`);continue;}try{this.status.textContent=`正在保存附件：${f.name}`;const meta=await this.a.importFile(f,this.d);this.d.attachments.push(meta);this.a.changed();await this.a.flush();}catch(e){failed.push(`${f.name}：${e.message||'保存失败，请重新添加'}`);}}this.renderAttachments();this.status.textContent='附件已随草稿保留';if(failed.length)this.showError(failed.join('；'));}finally{this.busy=false;this.saveBtn.disabled=false;}}
    renderAttachments(){this.imageList.replaceChildren();this.fileList.replaceChildren();const images=this.d.attachments.filter(x=>x.image),files=this.d.attachments.filter(x=>!x.image);
      for(const a of images){const card=el('div','gc-image-card',undefined,this.imageList);const media=el('div','gc-image-media',undefined,card),img=el('img','',undefined,media);img.src=this.a.resource(a);img.alt=a.name;const remove=button('×','gc-remove',media,()=>this.remove(a));remove.setAttribute('aria-label',`移除图片 ${a.name}`);const name=el('div','gc-image-name',a.name,card);name.title=a.name;const caption=el('input','gc-caption',undefined,card);caption.placeholder='图片说明（选填）';caption.value=a.caption||'';caption.setAttribute('aria-label',`图片说明 ${a.name}`);caption.addEventListener('input',()=>{a.caption=caption.value;this.a.changed();});}
      for(const a of files){const card=el('div','gc-file-card',undefined,this.fileList);this.icon(card,'file-text');const text=el('div','gc-file-text',undefined,card);el('strong','',a.name,text);el('small','',Core.bytes(a.size),text);const remove=button('×','gc-file-remove',card,()=>this.remove(a));remove.setAttribute('aria-label',`移除文件 ${a.name}`);}
      if(!files.length)el('div','gc-file-empty','还没有文件，PDF或录音可以放这里。',this.fileList);
    }
    async remove(a){if(this.busy||this.saved)return;this.d.attachments=this.d.attachments.filter(x=>x.path!==a.path);this.a.changed();this.renderAttachments();try{await this.a.flush();this.status.textContent='已从草稿移除；原文件不受影响';}catch(e){this.showError('移除操作尚未保留，请重试保存：'+e.message);}}
    async renderRecent(){this.recentList.replaceChildren();const rows=await this.a.recent();if(!rows.length){el('p','gc-muted','保存后，你的记录会出现在这里。',this.recentList);return;}for(const r of rows.slice(0,4)){const b=button('','gc-recent-item',this.recentList,()=>this.a.open(r.path));this.icon(b,r.icon||'file-text');const t=el('span','',undefined,b);el('strong','',r.title,t);el('small','',r.date||'',t);}}
    async save(){if(this.busy)return;if(this.saved){this.a.startFresh(this.scene);this.saved=false;this.render();return;}this.error.hidden=true;try{Core.validate(this.d);}catch(e){this.showError(e.message);return;}this.busy=true;this.saveBtn.disabled=true;this.saveBtn.textContent='正在保存…';try{await this.a.flush();const result=await this.a.save(this.d);this.saved=true;this.status.replaceChildren();el('span','gc-success','已存入知识库 · 待整理',this.status);button('打开笔记','gc-btn gc-btn-text',this.status,()=>this.a.open(result.path));this.saveBtn.textContent='再记一篇';this.saveBtn.setAttribute('aria-label','再记一篇');this.saveBtn.disabled=false;clearTimeout(this.timer);this.root.querySelectorAll('.gc-compose input,.gc-compose textarea,.gc-compose select,.gc-attachments button,.gc-attachments input').forEach(n=>n.disabled=true);this.draftState.textContent='已保存';await this.renderRecent();}catch(e){this.showError(`没能保存：${e.message||e}。文字和附件仍保留在草稿里。`);this.saveBtn.disabled=false;this.saveBtn.textContent='保存到知识库';}finally{this.busy=false;}}
  }
  return {CaptureUI};
});
