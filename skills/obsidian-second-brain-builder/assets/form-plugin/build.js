const fs=require('fs'),path=require('path');
const base=__dirname;
const core=fs.readFileSync(path.join(base,'src/core.js'),'utf8');
const ui=fs.readFileSync(path.join(base,'src/ui.js'),'utf8');
const plugin=fs.readFileSync(path.join(base,'src/plugin.js'),'utf8').replace("const Core=require('./core');",'').replace("const UI=require('./ui');",'');
const bundle=`/* 记一笔 0.1.0 — built locally from the accompanying source; no external runtime dependencies. */\nconst Core=(()=>{const module={exports:{}};${core}\nreturn module.exports;})();\nconst UI=(()=>{const module={exports:{}};const require=(name)=>{if(name==='./core')return Core;throw new Error('Unknown local module');};${ui}\nreturn module.exports;})();\n${plugin}`;
fs.writeFileSync(path.join(base,'main.js'),bundle);
let html=fs.readFileSync(path.join(base,'preview.html'),'utf8');
for(const asset of ['styles.css','src/core.js','src/ui.js','preview.js']){
  const hash=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(base,asset))).digest('hex').slice(0,10);
  const escaped=asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  html=html.replace(new RegExp('(["\\\"])'+escaped+'(?:\\?v=[a-z0-9]+)?(["\\\"])','g'),`$1${asset}?v=${hash}$2`);
}
fs.writeFileSync(path.join(base,'preview.html'),html);
console.log('Built main.js',Buffer.byteLength(bundle),'bytes');
