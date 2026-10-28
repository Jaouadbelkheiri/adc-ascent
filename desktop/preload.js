'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const allowed=['recorder:status','recorder:game-running','recorder:list','recorder:begin','recorder:chunk','recorder:mark','recorder:finish','apm:start','apm:stop','recording:open-folder','recording:open','recording:add-markers','recording:clip','analysis:run','analysis:auto'];
contextBridge.exposeInMainWorld('adcCompanion',Object.freeze({invoke:(name,...args)=>{if(!allowed.includes(name))return Promise.reject(Error('Unsupported command'));return ipcRenderer.invoke(name,...args);},onSample:fn=>{if(typeof fn==='function')ipcRenderer.on('apm:sample',(_e,v)=>fn(v));},onError:fn=>{if(typeof fn==='function')ipcRenderer.on('capture:error',(_e,v)=>fn(v));}}));
