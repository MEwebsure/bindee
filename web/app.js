const MODEL = 'https://teachablemachine.withgoogle.com/models/T_bBfZNqi/';
const MAP = {
  'Plastic (พลาสติก)': ['พลาสติก', 'P', '#1a73e8'],
  'Paper (กระดาษ)': ['กระดาษ', 'A', '#f4a62a'],
  'Glass (เเก้ว)': ['แก้ว', 'G', '#12a594'],
  'Metal (เหล็ก)': ['โลหะ', 'M', '#7b61a8'],
  'Reject (ไม่รับรอง หรือมีขยะปนเปือน)': ['ไม่รับรอง', 'R', '#df5454']
};
let model, webcam, port, writer, reader, running = false, boardReady = false;
let frames = [], lastSent = '', lastSentAt = 0;
const $ = id => document.getElementById(id);
function log(text){ $('log').textContent = `${new Date().toLocaleTimeString('th-TH')} ${text}\n` + $('log').textContent; }

async function connectSerial(){
  try{
    if(!('serial' in navigator)) throw new Error('ใช้ Chrome หรือ Edge บนคอมพิวเตอร์');
    port = await navigator.serial.requestPort(); await port.open({baudRate:115200});
    writer = port.writable.getWriter(); boardReady = true;
    $('serialBadge').textContent = '● เชื่อมต่อบอร์ดแล้ว'; $('serialBadge').style.color = '#078258';
    readSerial(); log('เชื่อมต่อ Arduino/ESP32 สำเร็จ');
  }catch(e){ log('เชื่อมต่อไม่สำเร็จ: ' + e.message); }
}
async function readSerial(){
  const decoder = new TextDecoderStream(); port.readable.pipeTo(decoder.writable).catch(()=>{}); reader = decoder.readable.getReader();
  try{ while(true){ const {value,done}=await reader.read(); if(done) break; if(value){ log('บอร์ด: '+value.trim()); if(value.includes('DONE')||value.includes('BINDEE_READY')) boardReady=true; } } }catch(e){ log('อ่านบอร์ดหยุด: '+e.message); }
}
async function send(code, force=false){
  if(!writer){ log(`จำลองคำสั่ง ${code} (ยังไม่เชื่อมต่อบอร์ด)`); return; }
  if(!force && (!boardReady || (code===lastSent && Date.now()-lastSentAt<3000))) return;
  boardReady=false; await writer.write(new TextEncoder().encode(code+'\n')); lastSent=code; lastSentAt=Date.now(); log(`ส่งคำสั่ง ${code} ไปยังบอร์ด`);
}
async function start(){
  try{ $('status').textContent='กำลังโหลดโมเดลและขอสิทธิ์กล้อง…'; model=model||await tmImage.load(MODEL+'model.json',MODEL+'metadata.json'); webcam=new tmImage.Webcam(640,640,true); await webcam.setup(); await webcam.play(); $('webcam').innerHTML=''; $('webcam').appendChild(webcam.canvas); running=true; loop(); }
  catch(e){ $('status').textContent='เปิดกล้องไม่ได้: '+e.message; }
}
async function loop(){ if(!running)return; webcam.update(); const p=await model.predict(webcam.canvas); frames.push(p); if(frames.length>10)frames.shift(); render(average(frames)); requestAnimationFrame(loop); }
function average(all){ if(!all.length)return[]; return all[0].map((x,i)=>({className:x.className,probability:all.reduce((s,f)=>s+f[i].probability,0)/all.length})).sort((a,b)=>b.probability-a.probability); }
function render(p){
  $('bars').innerHTML=p.map(x=>{const m=MAP[x.className]||[x.className,'R','#777'];return `<div class="row"><div class="label"><span>${m[0]}</span><strong>${Math.round(x.probability*100)}%</strong></div><div class="meter"><i style="width:${x.probability*100}%;background:${m[2]}"></i></div></div>`}).join('');
  if(frames.length<10){$('status').textContent=`กำลังเก็บข้อมูล ${frames.length}/10 เฟรม`;return;}
  const [top,second]=p, ok=top.probability>=.85 && top.probability-second.probability>=.10 && !top.className.startsWith('Reject'), m=ok?MAP[top.className]:['ไม่รับรอง','R','#df5454'];
  $('decision').innerHTML=`<i style="background:${m[2]};color:white">${m[1]}</i><div><small>${ok?'ตรวจพบประเภท':'ต้องตรวจใหม่'}</small><h2>${m[0]}</h2></div><strong style="color:${m[2]}">${Math.round(top.probability*100)}%</strong>`;
  $('verdict').textContent=ok?'ผ่านเกณฑ์ — ส่งคำสั่งคัดแยก':'ไม่ผ่านเกณฑ์ — ส่งไปช่อง Reject'; $('verdict').style.background=ok?'#dcf5e9':'#fde5e5'; $('status').textContent='ประเมินจากค่าเฉลี่ย 10 เฟรม'; send(m[1]);
}
$('startBtn').onclick=start; $('connectBtn').onclick=connectSerial; $('testReject').onclick=()=>send('R',true);
