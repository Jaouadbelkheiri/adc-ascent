'use strict';
const {app,BrowserWindow,ipcMain,desktopCapturer,session,shell,powerSaveBlocker}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const fsp=fs.promises;
const {spawn}=require('node:child_process');
let win, capture=null, apm=null, powerBlocker=null, apmSample={count:0,recordedSeconds:0,samples:[]};
const root=()=>path.join(app.getPath('videos'),'ADC ASCENT');
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
function safeFile(s){return String(s||'recording').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);}
function winSend(type,data){if(win&&!win.isDestroyed())win.webContents.send(type,data);}
async function ensureFolder(){await fsp.mkdir(root(),{recursive:true});}
async function recordings(){await ensureFolder();const files=await fsp.readdir(root());const out=[];for(const name of files.filter(x=>x.endsWith('.webm'))){let meta={};try{meta=JSON.parse(await fsp.readFile(path.join(root(),name+'.json'),'utf8'));}catch{}out.push({name,...meta});}return out.sort((a,b)=>b.name.localeCompare(a.name));}
function stopApm(){if(apm){apm.kill();apm=null;}return apmSample;}
function startApm(){if(process.platform!=='win32')throw Error('APM capture requires Windows.');if(apm)return true;apmSample={count:0,recordedSeconds:0,samples:[]};const script=path.join(__dirname,'apm-counter.ps1');apm=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['ignore','pipe','pipe']});let buffer='';apm.stdout.on('data',chunk=>{buffer+=chunk.toString();const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';for(const line of lines){try{const s=JSON.parse(line);if(typeof s.actions==='number'&&s.actions>=0){apmSample.count+=s.actions;apmSample.recordedSeconds+=s.seconds||5;apmSample.samples.push({time:new Date().toISOString(),actions:s.actions,seconds:s.seconds||5,apm:Math.round(s.actions*60/(s.seconds||5))});winSend('apm:sample',{...s,total:apmSample.count,average:Math.round(60*apmSample.count/Math.max(1,apmSample.recordedSeconds))});}}catch{}}});apm.once('exit',()=>{apm=null;winSend('apm:stopped',null)});return true;}
function createWindow(){win=new BrowserWindow({width:1450,height:930,minWidth:900,minHeight:650,backgroundColor:'#081521',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false,backgroundThrottling:false}});win.loadFile(path.join(__dirname,'..','index.html'));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 session.defaultSession.setDisplayMediaRequestHandler(async(_request,callback)=>{const sources=await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:1,height:1}});const league=sources.find(s=>/league of legends(\.exe)?/i.test(s.name)&&!/client/i.test(s.name));if(!league){winSend('capture:error','League game window not found. Start an actual match and retry.');callback({});return;}callback({video:league,audio:'loopback'});});
 win.on('closed',()=>{win=null;if(capture){try{capture.stream.end();}catch{}capture=null;}if(powerBlocker!==null){powerSaveBlocker.stop(powerBlocker);powerBlocker=null;}stopApm();});}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow()})});app.on('window-all-closed',()=>{stopApm();if(process.platform!=='darwin')app.quit()});
ipcMain.handle('recorder:game-running',async()=>{const sources=await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:1,height:1}});return sources.some(s=>/league of legends(\.exe)?/i.test(s.name)&&!/client/i.test(s.name));});
ipcMain.handle('recorder:status',()=>({desktop:true,recording:!!capture,apmEnabled:!!apm,folder:root()}));
ipcMain.handle('recorder:list',()=>recordings());
ipcMain.handle('recorder:begin',async(_e,opts={})=>{if(capture)throw Error('Recording already active');await ensureFolder();const filename=`ADC_${safeFile(opts.champion)}_${stamp()}.webm`;const stream=fs.createWriteStream(path.join(root(),filename),{flags:'wx'});capture={filename,stream,meta:{name:filename,champion:String(opts.champion||''),start:new Date().toISOString(),gameTimeAtStart:Number(opts.gameTimeAtStart)||0,markers:[],apm:null}};powerBlocker=powerSaveBlocker.start('prevent-app-suspension');return {filename};});
ipcMain.handle('recorder:chunk',async(_e,bytes)=>{if(!capture)throw Error('No active recording');const b=Buffer.from(bytes);if(b.length>12*1024*1024)throw Error('Chunk too large');await new Promise((resolve,reject)=>capture.stream.write(b,err=>err?reject(err):resolve()));return b.length;});
ipcMain.handle('recorder:mark',(_e,note='Manual highlight')=>{if(!capture)throw Error('Recording is not active');const elapsed=(Date.now()-Date.parse(capture.meta.start))/1000;const event={atSeconds:Math.max(0,Math.floor(elapsed)),label:String(note).slice(0,160),source:'manual'};capture.meta.markers.push(event);return event;});
ipcMain.handle('recorder:finish',async()=>{if(!capture)return null;const item=capture;capture=null;if(powerBlocker!==null){powerSaveBlocker.stop(powerBlocker);powerBlocker=null;}item.meta.end=new Date().toISOString();item.meta.durationSeconds=Math.max(0,(Date.parse(item.meta.end)-Date.parse(item.meta.start))/1000);item.meta.apm=apm?stopApm():apmSample;await new Promise((resolve,reject)=>item.stream.end(err=>err?reject(err):resolve()));await fsp.writeFile(path.join(root(),item.filename+'.json'),JSON.stringify(item.meta,null,2));return item.meta;});
ipcMain.handle('apm:start',()=>startApm());ipcMain.handle('apm:stop',()=>stopApm());
ipcMain.handle('recording:open-folder',async()=>{await ensureFolder();await shell.openPath(root());return true;});
ipcMain.handle('recording:open',async(_e,name)=>{const safe=path.basename(String(name));if(!safe.endsWith('.webm'))throw Error('Only WebM recordings can be opened');return shell.openPath(path.join(root(),safe));});
ipcMain.handle('recording:add-markers',async(_e,filename,markers)=>{const name=path.basename(String(filename));if(!name.endsWith('.webm'))throw Error('Invalid recording');if(!Array.isArray(markers)||markers.length>1000)throw Error('Invalid markers');const file=path.join(root(),name+'.json');const meta=JSON.parse(await fsp.readFile(file,'utf8'));meta.markers=[...(meta.markers||[]),...markers.map(m=>({atSeconds:Math.max(0,Number(m.atSeconds)||0),label:String(m.label||'Teamfight candidate').slice(0,160),source:'timeline_heuristic'}))];await fsp.writeFile(file,JSON.stringify(meta,null,2));return meta.markers;});
ipcMain.handle('recording:clip',async(_e,name,startSeconds,endSeconds)=>{const base=path.basename(String(name));if(!base.endsWith('.webm'))throw Error('Invalid file');const start=Math.max(0,Number(startSeconds)||0),end=Number(endSeconds);if(!Number.isFinite(end)||end<=start||end-start>300)throw Error('Clip duration must be between 0 and 300 seconds');await ensureFolder();const dest=path.join(root(),safeFile(base.slice(0,-5))+`_clip_${Math.round(start)}_${Math.round(end)}.webm`);return await new Promise((resolve,reject)=>{const ff=spawn('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',path.join(root(),base),'-t',String(end-start),'-c','copy',dest],{windowsHide:true});let error='';ff.stderr.on('data',d=>error+=d.toString());ff.on('error',()=>reject(Error('FFmpeg is required for clip export. Install FFmpeg and add it to PATH.')));ff.on('exit',code=>code===0?resolve({filename:path.basename(dest)}):reject(Error('Clip export failed: '+error.slice(-250))));});});

/* Post-game seeded computer-vision analysis; never during a running match. */
ipcMain.handle('analysis:run',async(_e,name,options={})=>{
 const safe=path.basename(String(name||''));
 if(!safe.endsWith('.webm')||safe!==name)throw Error('Select a saved recording');
 const video=path.join(root(),safe);
 await fsp.access(video);
 const shotTimes=String(options.shotTimes||'');
 const kiteTimes=String(options.kiteTimes||'');
 const isTimes=v=>v===''||/^(?:\d+(?:\.\d+)?)(?:,\d+(?:\.\d+)?)*$/.test(v);
 if(!isTimes(shotTimes)||!isTimes(kiteTimes))throw Error('Use comma-separated positive seconds');
 if(!shotTimes&&!kiteTimes)throw Error('Enter at least one skillshot or kiting segment timestamp');
 const script=path.join(__dirname,'..','vision','analyze.py');
 const python=process.platform==='win32'?'py':'python3';
 const args=process.platform==='win32'?['-3',script]:[script];
 args.push('--video',video,'--shot-times',shotTimes,'--kite-times',kiteTimes);
 return await new Promise((resolve,reject)=>{
  const child=spawn(python,args,{windowsHide:false,stdio:['ignore','pipe','pipe']});
  let output='',err='';
  child.stdout.on('data',d=>output=(output+d.toString()).slice(-12000));
  child.stderr.on('data',d=>err=(err+d.toString()).slice(-12000));
  child.once('error',e=>reject(Error('Python 3 and OpenCV are required: '+e.message)));
  child.once('exit',async code=>{
   if(code!==0)return reject(Error('Analysis failed: '+err.slice(-500)));
   try{const parsed=JSON.parse(output);const report=JSON.parse(await fsp.readFile(parsed.report,'utf8'));resolve(report)}
   catch(e){reject(Error('Analyzer did not produce a readable report: '+e.message))}
  });
 });
});
