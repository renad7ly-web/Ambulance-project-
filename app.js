/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r=Math.round;
const g=(x,m,s,a)=>a*Math.exp(-((x-m)*(x-m))/(2*s*s));
const sig=x=>1/(1+Math.exp(-x));
const fmtT=s=>{s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
const APP={mode:'train',view:'sim'};
const train=()=>{const m=APP.view==='mega'?(MC&&MC.mode):(SIM&&SIM.mode);return m!=='exam';};
function toast(m,k='info',sub){const t=document.createElement('div');t.className='toast '+k;t.innerHTML=m+(sub?`<small>${sub}</small>`:'');$('#toasts').prepend(t);const all=$$('#toasts .toast');if(all.length>3)all.at(-1).remove();setTimeout(()=>t.remove(),k==='bad'?6500:4500);}
const gcsTxt=x=>x>=15?'واعٍ ومتجاوب':x>=13?'مشوش':x>=9?'يستجيب للصوت أو الألم':'غير واعٍ';

/* ---------- audio ---------- */
const AUD={ctx:null,on:true,beep:true,voice:true,metro:true,muteUntil:0,noise:null};
function actx(){if(!AUD.ctx){try{AUD.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(_){return null;}}if(AUD.ctx.state==='suspended')AUD.ctx.resume();return AUD.ctx;}
document.addEventListener('pointerdown',()=>{if(AUD.on)actx();},{capture:true});
function tone(f,d=.07,v=.06,delay=0,type='sine'){if(!AUD.on||!AUD.ctx)return;const c=AUD.ctx,o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.value=f;o.connect(gn);gn.connect(c.destination);const t0=c.currentTime+delay;gn.gain.setValueAtTime(v,t0);gn.gain.exponentialRampToValueAtTime(.0001,t0+d);o.start(t0);o.stop(t0+d+.02);}
function noiseBuf(){const c=AUD.ctx;if(AUD.noise)return AUD.noise;const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return AUD.noise=b;}
function env(g,t,peak,att,dur){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+att);g.gain.linearRampToValueAtTime(0,t+dur);}
function say(text){if(!AUD.on||!AUD.voice||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=1.02;u.pitch=.9;speechSynthesis.speak(u);}catch(_){}}
const SFX={
  ok(){tone(660,.12,.06);tone(880,.18,.06,.12);},
  bad(){tone(150,.35,.07,0,'square');tone(112,.4,.05,.06,'square');},
  tick(){tone(540,.05,.04);},
  warn(){tone(880,.16,.06,0,'triangle');tone(660,.22,.06,.18,'triangle');},
  rosc(){[523,659,784,1047].forEach((f,i)=>tone(f,.25,.06,i*.13));},
  click(){tone(1500,.025,.045,0,'square');},
  ready(){tone(1250,.1,.05);},
  cycle(){[0,.25,.5].forEach(d=>tone(1000,.15,.06,d));},
  siren(dur=3.6){if(!AUD.on||!actx())return;const c=AUD.ctx,t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.4);g.gain.setValueAtTime(.045,t+dur-.7);g.gain.linearRampToValueAtTime(0,t+dur);g.connect(c.destination);
    [0,5].forEach(dt=>{const o=c.createOscillator(),l=c.createOscillator(),lg=c.createGain();o.type='triangle';o.frequency.value=950+dt;l.frequency.value=.45;lg.gain.value=330;l.connect(lg);lg.connect(o.frequency);o.connect(g);o.start(t);l.start(t);o.stop(t+dur);l.stop(t+dur);});},
  charge(dur=1.8){if(!AUD.on||!actx())return;const c=AUD.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(300,t);o.frequency.exponentialRampToValueAtTime(2300,t+dur);g.gain.setValueAtTime(.035,t);g.gain.setValueAtTime(.035,t+dur-.05);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur);},
  shock(){if(!AUD.on||!actx())return;const c=AUD.ctx,t=c.currentTime,s=c.createBufferSource(),lp=c.createBiquadFilter(),g=c.createGain();s.buffer=noiseBuf();lp.type='lowpass';lp.frequency.value=900;g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);s.connect(lp);lp.connect(g);g.connect(c.destination);s.start(t);s.stop(t+.2);
    const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(40,t+.35);og.gain.setValueAtTime(.3,t);og.gain.exponentialRampToValueAtTime(.001,t+.4);o.connect(og);og.connect(c.destination);o.start(t);o.stop(t+.42);}
};
/* auscultation: synthesized breath sounds */
function lungSound(type,cycles=2){
  if(!AUD.on||!actx())return;const c=AUD.ctx,nb=noiseBuf();let t=c.currentTime+.05;
  for(let i=0;i<cycles;i++)[[1.1,1],[1.5,.6]].forEach(([d,a],pi)=>{
    const src=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();src.buffer=nb;bp.type='bandpass';bp.frequency.value=type.includes('stridor')?900:450;bp.Q.value=.8;
    env(g,t,(type==='absent'?.004:type==='shallow'?.025:.07)*a,d*.35,d);src.connect(bp);bp.connect(g);g.connect(c.destination);src.start(t,Math.random());src.stop(t+d);
    if(type.includes('wheeze')&&pi===1)[420,530].forEach(f=>{const o=c.createOscillator(),og=c.createGain();o.type='triangle';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*.92,t+d);env(og,t,.025,.2,d);o.connect(og);og.connect(c.destination);o.start(t);o.stop(t+d);});
    if(type.includes('stridor')&&pi===0){const o=c.createOscillator(),f2=c.createBiquadFilter(),og=c.createGain();o.type='sawtooth';o.frequency.value=640;f2.type='bandpass';f2.frequency.value=1100;f2.Q.value=3;env(og,t,.05,.3,d);o.connect(f2);f2.connect(og);og.connect(c.destination);o.start(t);o.stop(t+d);}
    if(type==='crackles'&&pi===0)for(let k=0;k<14;k++){const ct=t+d*(.45+Math.random()*.5),s2=c.createBufferSource(),hp=c.createBiquadFilter(),cg=c.createGain();s2.buffer=nb;hp.type='highpass';hp.frequency.value=1500;cg.gain.setValueAtTime(.12,ct);cg.gain.exponentialRampToValueAtTime(.001,ct+.012);s2.connect(hp);hp.connect(cg);cg.connect(c.destination);s2.start(ct,Math.random());s2.stop(ct+.015);}
    t+=d+(pi===1?.4:.1);
  });
}
const LUNG={stemi:'normal',hypo:'normal',chb:'crackles',svt:'normal',ana:s=>s.flags.epi1?'wheeze':'stridor+wheeze',cspine:'shallow',tension:s=>s.flags.decomp?'normal':'absent',bleed:'normal',ape:'crackles',stroke:'normal',asthma:s=>s.flags.better?'wheeze':s.v.spo2<82?'shallow':'wheeze',opioid:'shallow',vt:'crackles',heat:'normal',tbi:'shallow',burn:'wheeze',pelvis:'normal',stab:s=>s.flags.tension?'absent':s.flags.sealed?'normal':'shallow'};
const LUNG_LBL={normal:'أصوات تنفس طبيعية',crackles:'خراخر (crackles) في القاعدتين',wheeze:'أزيز (wheeze) في الزفير','stridor+wheeze':'Stridor في الشهيق + أزيز في الزفير',shallow:'أصوات تنفس ضعيفة وسطحية',absent:'غياب أصوات التنفس في الجهة اليمنى'};
const lungType=s=>{if(s.arrest)return 'absent';const l=LUNG[s.sc.id];return typeof l==='function'?l(s):l||'normal';};
/* CPR metronome + charged-ready beep */
setInterval(()=>{if(!AUD.on||!AUD.metro)return;
  const simCPR=APP.view==='sim'&&SIM&&SIM.cprOn&&!SIM.paused&&!SIM.over;
  const mcCPR=APP.view==='mega'&&MC&&MC.cprOn&&!MC.over;
  if(simCPR||mcCPR)SFX.click();},545);
setInterval(()=>{if(APP.view==='mega'&&MC&&MC.charged&&!MC.over)SFX.ready();},1000);

/* ---------- waveform model ---------- */
const SPEC={
  n:{p:.12,q:-.08,r:1,s:-.22,t:.28},
  st:{p:.12,q:-.14,r:.8,s:-.04,t:.42,st:.24},
  svt:{p:0,q:-.05,r:1,s:-.25,t:.22},
  af:{p:0,q:-.06,r:.95,s:-.22,t:.24},
  wide:{p:0,r:.8,s:-.4,t:-.28,wide:1},
  paced:{paced:1,r:.75,s:-.5,t:-.3,wide:1}
};
const RHY={
  sinus:{lbl:'Sinus rhythm',spec:'n'}, sinustach:{lbl:'Sinus tachycardia',spec:'n'}, sinusbrady:{lbl:'Sinus bradycardia',spec:'n'},
  stemi:{lbl:'Sinus + ST elevation',spec:'st'}, svt:{lbl:'SVT',spec:'svt'}, af:{lbl:'Atrial fibrillation',spec:'af',irr:1},
  chb:{lbl:'3rd-degree AV block',spec:'wide',atrial:82}, paced:{lbl:'Paced rhythm',spec:'paced'},
  vf:{lbl:'VF',special:'vf',arrest:1,shock:1}, pvt:{lbl:'Pulseless VT',special:'vt',arrest:1,shock:1},
  asystole:{lbl:'Asystole',special:'flat',arrest:1}, pea:{lbl:'PEA',spec:'wide',arrest:1},
  pause:{lbl:'Pause',special:'flat'},
  vtp:{lbl:'Ventricular tachycardia',spec:'wide'}
};
function wf(dt,o,rr){
  if(dt<0||dt>2.2)return 0;
  const sc=clamp(rr/0.85,.5,1),w=o.wide?2.6:1;let y=0;
  if(o.p)y+=g(dt,.095,.022,o.p);
  if(o.paced)y+=g(dt,.168,.0022,1.5);
  y+=g(dt,.186,.007*w,o.q||0)+g(dt,.2,.0095*w,o.r)+g(dt,.2+.02*w,.011*w,o.s||0);
  const tp=.2+.25*sc+(o.wide?.05:0);
  if(o.st)y+=o.st*sig((dt-(.215+.02*w))/.008)*(1-sig((dt-tp)/.035));
  y+=g(dt,tp,.045*Math.max(.75,sc)*(o.wide?1.4:1),o.t||0);
  return y;
}

/* ---------- monitor ---------- */
function monitorHTML(){return `
<div class="mon" dir="ltr">
  <div class="mon-top"><span>II ×1 · 25 mm/s</span><span class="mon-alarm" data-alarm></span><span data-clock>00:00</span><button class="mon-zoom" data-mact="zoom" aria-pressed="false" title="تكبير شاشة المراقبة">⤢ تكبير</button></div>
  <div class="mon-grid">
    <div class="wcell"><canvas class="w-ecg"></canvas><span class="wtag" style="color:var(--mon-ecg)">ECG II</span><span class="nosig" data-nosig>لا توجد إشارة — وصّل أقطاب المونيتور</span></div>
    <div class="ncell n-hr"><b>HR</b><span data-n="hr">--</span><i>bpm</i></div>
    <div class="wcell"><canvas class="w-pl"></canvas><span class="wtag" style="color:var(--mon-spo2)">Pleth</span></div>
    <div class="ncell n-sp"><b>SpO₂</b><span data-n="spo2">--</span><i>% · PR <em data-n="pr">--</em></i></div>
    <div class="wcell"><canvas class="w-co"></canvas><span class="wtag" style="color:var(--mon-co2)">CO₂</span></div>
    <div class="ncell n-co"><b>EtCO₂</b><span data-n="co2">--</span><i>mmHg · RR <em data-n="rr">--</em></i></div>
  </div>
  <div class="mon-foot">
    <div class="nibp"><b>NIBP</b><span data-n="nibp">---/---</span><i data-n="map" style="font-style:normal;font-size:.8rem">(--)</i><small data-n="nibpt"></small></div>
    <div class="mon-btns"><button data-mact="nibp">قياس الضغط</button><button data-mact="sound" aria-pressed="true">نغمة النبض</button><button data-mact="mute">كتم الإنذار 60ث</button></div>
  </div>
</div>`;}
class Monitor{
  constructor(host,src){
    host.innerHTML=monitorHTML();this.root=host.firstElementChild;this.src=src;
    this.c={ecg:$('.w-ecg',this.root),pl:$('.w-pl',this.root),co:$('.w-co',this.root)};
    this.t=0;this.x=0;this.prev={};this.lastBeat=-9;this.prevBeat=-9;this.nextBeat=0;this.lastP=-9;this.nextP=0;this.lastPerf=-9;
    this.nibp=null;this.nibpAge=0;this.nibpT=50;this.numT=0;this.alarmT=0;
    new ResizeObserver(()=>this.resize()).observe(this.root);
    this.root.addEventListener('click',e=>{const b=e.target.closest('[data-mact]');if(!b)return;const a=b.dataset.mact;
      if(a==='nibp'){this.nibpT=999;}
      if(a==='sound'){actx();AUD.beep=!AUD.beep;$$('[data-mact="sound"]').forEach(x=>x.setAttribute('aria-pressed',AUD.beep));}
      if(a==='zoom'){const big=!this.root.classList.contains('big');this.root.classList.toggle('big',big);b.setAttribute('aria-pressed',big);b.textContent=big?'⤡ تصغير':'⤢ تكبير';b.title=big?'تصغير شاشة المراقبة':'تكبير شاشة المراقبة';document.body.classList.toggle('mon-open',big);}
      if(a==='mute'){AUD.muteUntil=performance.now()+60000;toast('تم كتم صوت الإنذار 60 ثانية — الإنذار المرئي مستمر','info');}
    });
    this.last=performance.now();requestAnimationFrame(n=>this.loop(n));
  }
  resize(){const d=window.devicePixelRatio||1;for(const k in this.c){const cv=this.c[k],rc=cv.getBoundingClientRect();if(!rc.width)continue;cv.width=Math.round(rc.width*d);cv.height=Math.round(rc.height*d);const x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);cv._w=rc.width;cv._h=rc.height;x.fillStyle='#030809';x.fillRect(0,0,rc.width,rc.height);}this.x=0;this.prev={};}
  loop(now){const dt=Math.min(.1,(now-this.last)/1000);this.last=now;if(this.root.getClientRects().length){try{this.step(dt);}catch(e){console.error(e);}}requestAnimationFrame(n=>this.loop(n));}
  step(dt){
    const s=this.src();if(!s)return;
    const W=this.c.ecg._w;if(!W){this.resize();return;}
    const pxps=Math.max(60,W/6),n=Math.max(1,Math.ceil(dt*pxps/1.5)),h=dt/n;
    const pts={ecg:[],pl:[],co:[]};
    for(let i=0;i<n;i++){
      this.t+=h;this.x+=h*pxps;
      if(this.x>W){this.x=0;for(const k in pts)pts[k].push(null);}
      pts.ecg.push([this.x,this.ecg(s)]);pts.pl.push([this.x,this.pleth(s)]);pts.co.push([this.x,this.capno(s)]);
    }
    this.draw('ecg',pts.ecg,v=>.58-v*.34,'#3df07b');
    this.draw('pl',pts.pl,v=>.88-v*.62,'#45d5ff');
    this.draw('co',pts.co,v=>.92-v/50*.75,'#ffd54a');
    this.numT+=dt;if(this.numT>=.5){this.numT=0;this.nums(s,.5);}
  }
  draw(k,pts,ymap,col){
    const cv=this.c[k],ctx=cv.getContext('2d'),W=cv._w,H=cv._h;if(!W)return;
    ctx.fillStyle='#030809';
    let seg=[];const flush=()=>{if(!seg.length)return;const x0=seg[0][0],x1=seg[seg.length-1][0];ctx.fillRect(x0-1,0,x1-x0+16,H);seg=[];};
    for(const p of pts){if(p===null){flush();this.prev[k]=null;continue;}seg.push(p);}
    flush();
    ctx.strokeStyle=col;ctx.lineWidth=1.7;ctx.lineJoin='round';ctx.beginPath();
    let pv=this.prev[k];
    for(const p of pts){
      if(p===null){pv=null;continue;}
      if(p[1]===null){pv=null;continue;}
      const y=ymap(p[1])*H;
      if(pv&&pv[0]<=p[0])ctx.moveTo(pv[0],pv[1]);else ctx.moveTo(p[0],y);
      ctx.lineTo(p[0],y);pv=[p[0],y];
    }
    ctx.stroke();this.prev[k]=pv;
  }
  ecg(s){
    if(!s.connected)return null;
    const t=this.t,R=RHY[s.rhythm]||RHY.sinus;let y=0;
    if(s.cpr&&s.cpr.on){const ph=(t*(s.cpr.rate||110)/60)%1;y+=ph<.45?Math.sin(Math.PI*ph/.45)*.85:0;}
    if(R.special==='vf'){return y+.3*(Math.sin(2*Math.PI*4.7*t)+.6*Math.sin(2*Math.PI*3.3*t+1.3)+.45*Math.sin(2*Math.PI*6.9*t+.4))*(.55+.45*Math.sin(2*Math.PI*.23*t));}
    if(R.special==='flat'){return y+.015*Math.sin(2*Math.PI*.35*t);}
    if(R.special==='vt'){const f=(s.v.hr||180)/60,ph=Math.sin(2*Math.PI*f*t);return y+.95*Math.sign(ph)*Math.pow(Math.abs(ph),.6);}
    const hr=Math.max(20,s.v.hr||70),rr=60/hr;
    if(t>=this.nextBeat){this.prevBeat=this.lastBeat;this.lastBeat=this.nextBeat;let nr=rr;if(R.irr)nr=rr*(.65+Math.random()*.7);this.nextBeat=this.lastBeat+nr;if(this.nextBeat<t)this.nextBeat=t+nr;this.beat(s,R);}
    const o=SPEC[R.spec];y+=wf(t-this.lastBeat,o,rr)+wf(t-this.prevBeat,o,rr);
    if(R.atrial){const pr=60/R.atrial;if(t>=this.nextP){this.lastP=this.nextP;this.nextP=this.lastP+pr;if(this.nextP<t)this.nextP=t+pr;}y+=g(t-this.lastP,.05,.022,.14);}
    if(R.irr)y+=.035*Math.sin(2*Math.PI*6.1*t)+.025*Math.sin(2*Math.PI*4.3*t+1);
    return y;
  }
  beat(s,R){
    if(!R.arrest&&s.v.sbp>45){this.lastPerf=this.t;if(AUD.on&&AUD.beep)tone(380+clamp(s.v.spo2-80,0,20)*16,.06,.05);}
  }
  pleth(s){
    if(!s.connected)return null;
    const R=RHY[s.rhythm]||RHY.sinus;
    if(R.arrest||s.v.sbp<45||R.special){return s.cpr&&s.cpr.on?.12*Math.max(0,Math.sin(2*Math.PI*this.t*(s.cpr.rate||110)/60)):0;}
    const dt=this.t-this.lastPerf-.15,amp=clamp(s.v.sbp/115,.2,1.1);
    return amp*(g(dt,.13,.055,1)+g(dt,.34,.06,.32));
  }
  capno(s){
    if(!s.capno)return null;
    const rr=s.cpr&&s.cpr.on?10:s.v.rr;if(rr<1)return 0;
    const per=60/rr,ph=(this.t%per)/per,e=s.v.etco2;
    if(ph<.06)return e*ph/.06*.92;if(ph<.45)return e*(.92+.08*(ph-.06)/.39);if(ph<.5)return e*(1-(ph-.45)/.05);return 0;
  }
  nums(s,dt){
    const q=k=>$(`[data-n="${k}"]`,this.root);
    const R=RHY[s.rhythm]||RHY.sinus,on=s.connected,pulse=on&&!R.arrest&&!R.special&&s.v.sbp>45;
    $('[data-clock]',this.root).textContent=s.clock||'';
    $('[data-nosig]',this.root).hidden=on;
    const cpr=s.cpr&&s.cpr.on;
    q('hr').textContent=!on?'--':(R.special==='vf'||R.special==='flat'||cpr)?'---':r(s.v.hr);
    q('spo2').textContent=pulse?r(s.v.spo2):'--';
    q('pr').textContent=pulse?r(s.v.hr):'--';
    q('rr').textContent=on?(cpr?10:r(s.v.rr)):'--';
    q('co2').textContent=s.capno?r(s.v.etco2):'--';
    this.nibpT+=dt;this.nibpAge+=dt;
    if(on&&this.nibpT>=60){this.nibpT=0;this.nibpAge=0;this.nibp=pulse?{s:r(s.v.sbp+(Math.random()*4-2)),d:r(s.v.dbp+(Math.random()*4-2))}:{s:null};}
    if(!on){this.nibp=null;}
    if(this.nibp&&this.nibp.s){q('nibp').textContent=this.nibp.s+'/'+this.nibp.d;q('map').textContent='('+r((this.nibp.s+2*this.nibp.d)/3)+')';}
    else{q('nibp').textContent='---/---';q('map').textContent='(--)';}
    q('nibpt').textContent=this.nibp?('قبل '+r(this.nibpAge)+'ث'):'';
    const al=[];
    if(on){
      if(R.arrest)al.push([2,s.hideRhythm?'*** ALARM — CHECK PATIENT':s.rhythm==='pea'?'*** PEA — NO PULSE':'*** '+R.lbl.toUpperCase()]);
      else if(!R.special){
        if(s.v.hr<40||s.v.hr>160)al.push([2,'*** HR '+r(s.v.hr)]);else if(s.v.hr<50||s.v.hr>130)al.push([1,'** HR '+r(s.v.hr)]);
        if(s.v.spo2<85)al.push([2,'*** SpO2 '+r(s.v.spo2)]);else if(s.v.spo2<90)al.push([1,'** SpO2 '+r(s.v.spo2)]);
        if(this.nibp&&this.nibp.s){if(this.nibp.s<80)al.push([2,'*** NIBP LOW']);else if(this.nibp.s<90)al.push([1,'** NIBP LOW']);else if(this.nibp.s>190)al.push([1,'** NIBP HIGH']);}
        if(s.capno&&s.v.etco2>50)al.push([1,'** EtCO2 HIGH']);
      }
    }
    al.sort((a,b)=>b[0]-a[0]);
    const el=$('[data-alarm]',this.root);el.textContent=al.length?al[0][1]:'';el.className='mon-alarm'+(al.length?' s'+al[0][0]:'');
    this.alarmT+=dt;
    if(al.length&&AUD.on&&performance.now()>AUD.muteUntil){const sev=al[0][0];if(sev===2&&this.alarmT>=1.5){this.alarmT=0;tone(960,.12,.07);tone(960,.12,.07,.18);tone(960,.12,.07,.36);}else if(sev===1&&this.alarmT>=3){this.alarmT=0;tone(700,.14,.06);tone(700,.14,.06,.2);}}
  }
}

/* ---------- 12-lead ---------- */
const LEADS={I:{p:.07,q:-.05,r:.55,s:-.1,t:.18},II:{p:.12,q:-.08,r:1,s:-.2,t:.28},III:{p:.05,q:-.05,r:.45,s:-.15,t:.1},aVR:{p:-.09,r:-.75,s:.08,t:-.2},aVL:{p:.03,q:-.04,r:.3,s:-.25,t:.08},aVF:{p:.08,q:-.06,r:.7,s:-.15,t:.18},V1:{p:.05,r:.18,s:-.9,t:.06},V2:{p:.06,r:.35,s:-1.05,t:.32},V3:{p:.06,r:.7,s:-.6,t:.38},V4:{p:.07,r:1.25,s:-.35,t:.36},V5:{p:.07,q:-.06,r:1.1,s:-.2,t:.3},V6:{p:.07,q:-.06,r:.85,s:-.1,t:.24},V4R:{p:.05,r:.25,s:-.6,t:.08}};
function leadSpec(tw,L){
  const name=L,Ld=LEADS[L],rh=tw.rh;const st=(tw.st&&tw.st[name])||0;
  if(rh==='chb'||rh==='paced'||rh==='vtp'){const sgn=Math.sign(Ld.r+Ld.s)||1;return{r:Ld.r*.9,s:Ld.s*1.3,t:-.25*sgn,wide:1,paced:rh==='paced'};}
  const o={p:(rh==='svt'||rh==='af')?0:Ld.p,q:Ld.q||0,r:Ld.r,s:Ld.s,t:Ld.t,st:st};
  if(st>0){o.t=Ld.t+st*1.3;o.s=Ld.s*.3;}
  if(st<0){o.t=Ld.t*.2-.05;}
  return o;
}
function draw12(cv,tw,leadsOverride){
  const box=cv.parentElement;const W=Math.max(box.clientWidth,660);const pxps=W/10,mm=pxps/25;
  const rows=leadsOverride?1:4,rowH=16*mm;const H=rows*rowH+5*mm;
  const d=window.devicePixelRatio||1;cv.width=W*d;cv.height=H*d;cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.setTransform(d,0,0,d,0,0);
  ctx.fillStyle='#fff8f8';ctx.fillRect(0,0,W,H);
  for(let i=0;i*mm<=W;i++){ctx.strokeStyle=i%5?'#f6d6d9':'#e4a0a7';ctx.lineWidth=i%5?.5:1;ctx.beginPath();ctx.moveTo(i*mm,0);ctx.lineTo(i*mm,H);ctx.stroke();}
  for(let j=0;j*mm<=H;j++){ctx.strokeStyle=j%5?'#f6d6d9':'#e4a0a7';ctx.lineWidth=j%5?.5:1;ctx.beginPath();ctx.moveTo(0,j*mm);ctx.lineTo(W,j*mm);ctx.stroke();}
  const hr=tw.hr,rr=60/hr,beats=[],atr=[];
  for(let b=.12;b<10.5;b+=rr)beats.push(b);
  if(tw.rh==='chb')for(let a=.05;a<10.5;a+=60/82)atr.push(a);
  const val=(L,t)=>{const o=leadSpec(tw,L);let y=0;for(let i=beats.length-1;i>=0;i--){const dt=t-beats[i];if(dt<0)continue;y+=wf(dt,o,rr);if(dt>1.5)break;}
    for(const a of atr){const dt=t-a;if(dt>=0&&dt<.2)y+=g(dt,.05,.022,LEADS[L].p*1.2||.1);}return y;};
  const tr=(L,t0,t1,x0,yb)=>{ctx.strokeStyle='#1b1b1b';ctx.lineWidth=1.2;ctx.beginPath();for(let t=t0;t<=t1;t+=1/pxps){const x=x0+(t-t0)*pxps,y=yb-val(L,t)*10*mm;t===t0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();ctx.fillStyle='#1b1b1b';ctx.font=`600 ${Math.max(11,3*mm)}px JetBrains Mono, monospace`;ctx.fillText(L,x0+4,yb-6*mm);};
  if(leadsOverride){tr(leadsOverride,0,10,0,rowH*.62);}
  else{
    const LAY=[['I','aVR','V1','V4'],['II','aVL','V2','V5'],['III','aVF','V3','V6']];
    LAY.forEach((row,ri)=>row.forEach((L,ci)=>{tr(L,ci*2.5,(ci+1)*2.5-.01,ci*2.5*pxps,rowH*(ri+.62));if(ci){ctx.strokeStyle='#1b1b1b';ctx.beginPath();ctx.moveTo(ci*2.5*pxps,rowH*(ri+.45));ctx.lineTo(ci*2.5*pxps,rowH*(ri+.8));ctx.stroke();}}));
    tr('II',0,10,0,rowH*3.62);
  }
  ctx.fillStyle='#555';ctx.font=`500 ${Math.max(10,2.6*mm)}px JetBrains Mono, monospace`;ctx.fillText('25 mm/s · 10 mm/mV',6,H-6);
}

/* ---------- catalogs ---------- */
const EQ=[
  {id:'monitor',l:'Monitor / Defibrillator',d:'ECG و12-lead وSpO₂ وNIBP وصدمات وpacing'},
  {id:'lifebag',l:'Life Bag',d:'BVM وOPA/NPA وشفاط يدوي وضمادات وTourniquet'},
  {id:'probag',l:'Pro Bag',d:'IV/IO ومحاليل وأدوية وi-gel وإبرة تفريغ'},
  {id:'oxygen',l:'أسطوانة O₂ محمولة',d:'قنية أنفية وقناع NRB وnebulizer'},
  {id:'gluco',l:'جهاز السكر',d:'Glucometer وشرائط ووخّاز'},
  {id:'spinal',l:'معدات التثبيت',d:'C-collar وScoop وHead blocks'}
];
const EQL=Object.fromEntries(EQ.map(e=>[e.id,e.l]));
const ASSESS=[
  {id:'scene',g:'S',l:'سلامة الموقع + PPE'},{id:'impression',g:'GI',l:'الانطباع العام / AVPU'},
  {id:'xhem',g:'X',l:'نزيف كارثي'},{id:'airway',g:'A',l:'المجرى الهوائي'},{id:'breathing',g:'B',l:'التنفس + تسمّع الصدر'},
  {id:'circ',g:'C',l:'النبض والجلد وCRT'},{id:'disab',g:'D',l:'GCS والحدقات'},{id:'expose',g:'E',l:'الكشف والحرارة'},
  {id:'monitor',g:'MON',l:'توصيل المونيتور',eq:'monitor'},{id:'capno',g:'CO₂',l:'Capnography',eq:'monitor'},
  {id:'ecg12',g:'12L',l:'تخطيط 12-lead',eq:'monitor'},{id:'rightecg',g:'V4R',l:'تخطيط أيمن V4R',eq:'monitor'},
  {id:'glucose',g:'BGL',l:'قياس السكر',eq:'gluco'},
  {id:'sample',g:'Hx',l:'SAMPLE'},{id:'opqrst',g:'Hx',l:'OPQRST للألم'},{id:'secondary',g:'H2T',l:'الفحص الثانوي من الرأس للقدم'}
];
const AS=Object.fromEntries(ASSESS.map(a=>[a.id,a]));
const AGROUPS=[['المشهد والانطباع',['scene','impression']],['التقييم الأولي X-A-B-C-D-E',['xhem','airway','breathing','circ','disab','expose']],['الأجهزة',['monitor','capno','ecg12','rightecg','glucose']],['التاريخ المرضي والفحص الثانوي',['sample','opqrst','secondary']]];
const RX={
  o2nc:{c:'air',l:'O₂ nasal cannula',d:'2–4 L/min',eq:'oxygen'},
  o2nrb:{c:'air',l:'O₂ NRB mask',d:'12–15 L/min',eq:'oxygen'},
  jaw:{c:'air',l:'Jaw thrust',d:'فتح المجرى دون تحريك الرقبة'},
  htcl:{c:'air',l:'Head tilt–chin lift',d:'فتح المجرى بإمالة الرأس'},
  suction:{c:'air',l:'Suction',d:'شفط المجرى ≤ 15 ث',eq:'lifebag',rep:1},
  opa:{c:'air',l:'OPA / NPA',d:'مجرى هوائي بسيط',eq:'lifebag'},
  bvm:{c:'air',l:'BVM assisted ventilation',d:'نفَس كل 6 ث مع O₂',eq:'lifebag'},
  sga:{c:'air',l:'i-gel (SGA)',d:'مجرى متقدم + تأكيد بالـ EtCO₂',eq:'probag'},
  neb:{c:'air',l:'Salbutamol neb',d:'5 mg بخار',eq:'oxygen',rep:1},
  needle:{c:'air',l:'Needle decompression',d:'14G — المسافة 4–5 خط الإبط الأمامي',eq:'probag',rep:1},
  occl:{c:'air',l:'Chest seal',d:'ضماد محكم بصمام',eq:'lifebag'},
  iv:{c:'circ',l:'IV access',d:'كانيولا 18G'},
  ns:{c:'circ',l:'NS bolus 250 mL',d:'ثم إعادة التقييم',iv:1,rep:1,eq:'probag'},
  nsLarge:{c:'circ',l:'NS 2 L wide open',d:'تسريب سريع كامل',iv:1,eq:'probag'},
  tq:{c:'circ',l:'Tourniquet',d:'5–7 سم فوق الجرح',eq:'lifebag',rep:1},
  pressure:{c:'circ',l:'Direct pressure / packing',d:'ضغط مباشر وحشو الجرح',eq:'lifebag'},
  asa:{c:'med',l:'Aspirin 300 mg',d:'مضغ — غير مغلف معوياً',eq:'probag'},
  ntg:{c:'med',l:'Nitroglycerin 0.4 mg',d:'تحت اللسان',eq:'probag',rep:1},
  fent:{c:'med',l:'Fentanyl 1 mcg/kg',d:'IV ببطء',eq:'probag',iv:1,rep:1},
  ondan:{c:'med',l:'Ondansetron 4 mg',d:'IV للغثيان',eq:'probag',iv:1},
  atropine:{c:'med',l:'Atropine 1 mg',d:'IV كل 3–5 د (حد أقصى 3 mg)',eq:'probag',iv:1,rep:1},
  adeno6:{c:'med',l:'Adenosine 6 mg',d:'دفع سريع + 20 mL flush',eq:'probag',iv:1},
  adeno12:{c:'med',l:'Adenosine 12 mg',d:'دفع سريع + flush',eq:'probag',iv:1,rep:1},
  epiIM:{c:'med',l:'Epinephrine 0.5 mg IM',d:'1 mg/mL — الفخذ الجانبي',eq:'probag',rep:1},
  epiIV:{c:'med',l:'Epinephrine 1 mg IV',d:'0.1 mg/mL — للتوقف القلبي',eq:'probag',iv:1,rep:1},
  epiInf:{c:'med',l:'Epinephrine infusion',d:'2–10 mcg/min',eq:'probag',iv:1},
  amio:{c:'med',l:'Amiodarone 300 mg',d:'IV/IO — ثم 150 mg',eq:'probag',iv:1,rep:1},
  d10:{c:'med',l:'Dextrose 10% 100 mL',d:'IV (10 g) ثم إعادة القياس',eq:'probag',iv:1,rep:1},
  glucagon:{c:'med',l:'Glucagon 1 mg IM',d:'عند تعذر الوريد',eq:'probag'},
  oralglu:{c:'med',l:'Oral glucose 15 g',d:'جل بالفم',eq:'probag'},
  naloxone:{c:'med',l:'Naloxone 0.4 mg',d:'IV/IM',eq:'probag'},
  antihist:{c:'med',l:'Diphenhydramine 50 mg',d:'IV — علاج مساعد',eq:'probag',iv:1},
  txa:{c:'med',l:'Tranexamic acid 1 g',d:'IV خلال 10 دقائق',eq:'probag',iv:1},
  vagal:{c:'elec',l:'Modified Valsalva',d:'نفخ 15 ث ثم رفع الساقين',rep:1},
  sync:{c:'elec',l:'Synchronized cardioversion',d:'SYNC ON',eq:'monitor',rep:1},
  defib:{c:'elec',l:'Defibrillation 200 J',d:'صدمة غير متزامنة',eq:'monitor',rep:1},
  pace:{c:'elec',l:'Transcutaneous pacing',d:'60–80/د · رفع mA حتى الالتقاط',eq:'monitor',rep:1},
  cpr:{c:'elec',l:'Start CPR',d:'100–120/د · عمق 5–6 سم'},
  mils:{c:'trauma',l:'Manual in-line stabilization',d:'تثبيت يدوي للرأس والرقبة'},
  smr:{c:'trauma',l:'SMR',d:'C-collar + Scoop / Vacuum mattress',eq:'spinal'},
  splint:{c:'trauma',l:'Splinting',d:'تجبير الطرف',eq:'lifebag'},
  warm:{c:'trauma',l:'Prevent hypothermia',d:'بطانية حرارية وتدفئة الكابينة'},
  pelvic:{c:'trauma',l:'Pelvic binder',d:'على مستوى المدورين الكبيرين',eq:'spinal'},
  cpap:{c:'air',l:'CPAP',d:'5–10 cmH₂O بقناع محكم',eq:'oxygen'},
  ipra:{c:'med',l:'Ipratropium 0.5 mg',d:'بخار مع الـ Salbutamol',eq:'oxygen'},
  mag:{c:'med',l:'Magnesium sulfate 2 g',d:'IV خلال 20 دقيقة',eq:'probag',iv:1},
  steroid:{c:'med',l:'Hydrocortisone 200 mg',d:'IV — كورتيزون',eq:'probag',iv:1},
  cool:{c:'pos',l:'Active cooling',d:'ماء بارد + تهوية + ثلج',rep:1},
  burn:{c:'pos',l:'Burn cooling & cover',d:'ماء فاتر 20 د ثم غلاف بلاستيكي'},
  headup:{c:'pos',l:'Head-up 30°',d:'رفع رأس النقالة'}
};
const RXCATS=[['air','المجرى الهوائي والتنفس'],['circ','الدورة الدموية'],['med','الأدوية'],['elec','كهربائي / إنعاش'],['trauma','الإصابات'],['pos','الوضعيات والتبريد']];

/* ---------- scenario helpers ---------- */
const T=(s,o)=>Object.assign(s.target,o);
const A=(s,o)=>{for(const k in o)s.target[k]=(s.target[k]??s.v[k])+o[k];};
const has=(s,id)=>s.did.has(id);
const atA=(s,id)=>s.at['a:'+id];
function setRhythm(s,rh){const was=s.arrest;s.rhythm=rh;const R=RHY[rh];
  if(R.arrest){if(!was){s.arrest=true;s.cprOn=false;s.arrestAt=s.t;s.fixed=false;s.shocks=0;s.epi=0;s.amioN=0;s.arrests=(s.arrests||0)+1;}}
  else{s.arrest=false;s.cprOn=false;}}
function convert(s,hr=96){setRhythm(s,'pause');s.later.push({at:s.t+4,fx:x=>{setRhythm(x,'sinus');T(x,{hr})},m:'عاد الإيقاع جيبياً منتظماً بعد توقف قصير.',k:'good'});}
function asthmaImprove(s){if(has(s,'neb')&&has(s,'ipra')){T(s,{spo2:95,rr:22,etco2:40,hr:118});s.flags.better=1;}}
const ECG_OPTS_TACHY=['Sinus tachycardia','SVT','Atrial fibrillation','Ventricular tachycardia'];

/* ---------- scenarios ---------- */
const SC=[
/* 1 STEMI */
{id:'stemi',nt:'ألم في الصدر',cat:'medical',title:'ألم صدر — احتشاء عضلة القلب',tags:['MI','12-lead','V4R','RV infarct'],level:'متوسط',
 dispatch:{no:'24117',pri:'أحمر',loc:'حي سكني — فيلا، الطابق الثاني بلا مصعد',age:58,sex:'ذكر',cc:'ألم ضاغط في الصدر منذ 40 دقيقة ينتشر للفك والذراع الأيسر، مع تعرق وغثيان',hx:'ارتفاع ضغط، سكري نوع 2، مدخن منذ 30 سنة',meds:'Metformin 500 mg، Amlodipine 5 mg',alg:'لا يوجد',note:'الزوجة: «وجهه أصفر ويعرق كثير»'},
 req:['monitor','probag','lifebag','oxygen'],
 init:{rhythm:'stemi',v:{hr:56,sbp:86,dbp:54,rr:20,spo2:95,etco2:34,gcs:15,glu:188,temp:36.7}},
 skin:'شاحب، بارد ومتعرق',
 find:{
  scene:'المنزل آمن. المريض في غرفة النوم بالطابق الثاني ولا يوجد مصعد ← خطط للنزول بكرسي الدرج، لا تدعه يمشي.',
  impression:'رجل جالس على حافة السرير، شاحب ومتعرق، يضع قبضته على صدره (Levine sign). واعٍ (A على AVPU) ويتكلم بجمل كاملة.',
  airway:'سالك — يتكلم بوضوح، لا أصوات غير طبيعية.',
  breathing:s=>`RR ${r(s.v.rr)}، تمدد الصدر متساوٍ، دخول الهواء متساوٍ والرئتان صافيتان بلا خراخر.`,
  circ:s=>`نبض كعبري ضعيف منتظم ${r(s.v.hr)}/د، الجلد بارد رطب، CRT 3 ث. وريد الرقبة متوسع (JVD) مع أن الرئتين صافيتان.`,
  disab:'GCS 15، الحدقتان متساويتان ومتفاعلتان، لا ضعف في الأطراف.',
  expose:'لا إصابات أو طفح، لا وذمة في الساقين.',
  sample:'S: ألم صدر، تعرق، غثيان. A: لا حساسية. M: Metformin وAmlodipine، وينفي استخدام Sildenafil أو Tadalafil. P: ضغط، سكري، تدخين. L: آخر وجبة قبل 3 ساعات. E: بدأ الألم أثناء الراحة.',
  opqrst:'O: مفاجئ أثناء الراحة. P: لا يتغير مع الحركة أو التنفس. Q: ضاغط وثقيل. R: الفك والذراع الأيسر. S: 8/10. T: مستمر منذ 40 دقيقة.',
  secondary:'لا نتائج إضافية مهمة. البطن لين.',
  ecg12:'ارتفاع ST في II وIII وaVF (III أعلى من II) مع انخفاض انعكاسي في I وaVL.',
  rightecg:'ارتفاع ST ≥ 1 mm في V4R ← إصابة البطين الأيمن.'
 },
 fp:{circ:'الثلاثي: هبوط ضغط + JVD + رئتان صافيتان = اشتبه في احتشاء البطين الأيمن.',ecg12:'في كل احتشاء سفلي سجّل V4R قبل التفكير في النترات.',scene:'اختر طريقة النزول قبل الحمل: المجهود يزيد حاجة القلب للأكسجين.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','ecg12','rightecg','sample','opqrst'],
 twelve:{rh:'stemi',hr:56,st:{II:.18,III:.28,aVF:.22,I:-.08,aVL:-.16},v4r:.14},
 ecgQ:{need:'ecg12',opts:['Anterior STEMI','Inferior STEMI','Sinus bradycardia بدون تغيرات ST','Pericarditis','3rd-degree AV block'],ans:'Inferior STEMI',why:'ارتفاع ST في الاتجاهات السفلية II وIII وaVF مع تغيرات انعكاسية في I وaVL. ارتفاع ST في III أكبر من II يرجّح انسداد الشريان التاجي الأيمن RCA، وهو الذي يغذي البطين الأيمن غالباً.'},
 stab:{ans:'unstable',why:'الضغط 86/54 مع جلد بارد رطب وCRT متأخر = نقص تروية. المريض غير مستقر هيموديناميكياً.'},
 crit:{ans:'yes',why:'STEMI حالة حرجة مرتبطة بالوقت: الهدف من أول اتصال طبي إلى فتح الشريان 90 دقيقة أو أقل.'},
 rx:{
  asa:{k:'good',c:1,m:'Aspirin 300 mg مضغ — يقلل الوفيات في STEMI.',p:'موانع الأسبرين: حساسية له، نزيف هضمي نشط.'},
  iv:{k:'good',c:1,m:'خط وريدي 18G — جاهز للسوائل والأدوية.'},
  ntg:s=>({k:'bad',m:s.v.sbp<90?'النترات ممنوعة: الضغط الانقباضي أقل من 90 mmHg، ومع إصابة البطين الأيمن.':'النترات ممنوعة: احتشاء سفلي مع إصابة البطين الأيمن.',p:'البطين الأيمن المصاب يعتمد على الـ preload، والنترات تسبب هبوطاً حاداً. العلاج: استلقاء ورفع الساقين وسوائل.',fx:s=>{A(s,{sbp:-28,dbp:-18,hr:8});s.flags.ntgDrop=1;}}),
  ns:s=>s.v.sbp<100?{k:'good',c:1,m:'NS 250 mL bolus — احتشاء البطين الأيمن يستجيب للسوائل. أعد تسمّع الرئتين بعد كل bolus.',fx:s=>A(s,{sbp:14,dbp:8,hr:-3})}:{k:'neutral',m:'الضغط أصبح مقبولاً؛ لا داعي لسوائل إضافية الآن — راقب الاحتقان الرئوي.'},
  o2nc:{k:'neutral',m:'SpO₂ 95%: الأكسجين الروتيني غير مستطب في متلازمة الشريان التاجي إلا إذا SpO₂ أقل من 90% أو ضيق تنفس.'},
  o2nrb:{k:'neutral',m:'SpO₂ 95%: الأكسجين عالي التدفق غير مستطب — فرط الأكسجين لا يفيد في الاحتشاء.'},
  fent:s=>s.v.sbp>=100?{k:'good',m:'ألم مستمر والضغط يسمح: Fentanyl 25–50 mcg IV مع مراقبة الضغط.'}:{k:'bad',m:'المسكنات الأفيونية مع ضغط أقل من 100 قد تزيد الهبوط.',fx:s=>A(s,{sbp:-12,dbp:-6})},
  atropine:s=>s.v.hr<50?{k:'good',m:'بطء عرضي: Atropine 1 mg.',fx:s=>A(s,{hr:18,sbp:6})}:{k:'neutral',m:'النبض 56 والمشكلة في الـ preload وليس المعدل؛ الأتروبين غير مطلوب الآن.'},
  ondan:{k:'info',m:'Ondansetron للغثيان — مقبول.'}
 },
 ideal:['asa','iv','ns'],
 tl:[{at:420,if:s=>!has(s,'ns'),fx:s=>A(s,{sbp:-6,dbp:-4}),m:'المريض يقول: «أحس بدوخة أكثر».'}],
 chal:[{l:'VF مفاجئ أثناء النقل',fx:s=>setRhythm(s,'vf'),m:'المريض فقد الوعي فجأة أثناء النقل!'},{l:'المريض يطلب أقرب مستشفى',m:'المريض: «خذني لأقرب مستشفى، ما أبي أروح بعيد».'}],
 rosc:{rhythm:'stemi',v:{hr:88,sbp:94,dbp:58,spo2:94,rr:14,gcs:8,etco2:38}},
 transport:[{id:'pci',l:'مركز قسطرة PCI يعمل 24/7 — تفعيل Cath lab مسبقاً وإرسال الـ 12-lead',ok:1,why:'الهدف 90 دقيقة أو أقل من أول اتصال طبي إلى فتح الشريان.'},{id:'near',l:'أقرب مستشفى عام بدون قسطرة (5 دقائق)',ok:0,why:'النقل الثانوي لاحقاً يؤخر فتح الشريان، إلا إذا كان مركز PCI بعيداً جداً حسب البروتوكول المحلي.'},{id:'stay',l:'التثبيت في المنزل 20 دقيقة ثم النقل',ok:0,why:'«الوقت عضلة»: العلاج الحقيقي في المستشفى.'},{id:'phc',l:'مركز رعاية أولية قريب',ok:0,why:'لا يملك قدرات علاج STEMI.'}],
 critical:[
  {l:'تخطيط 12-lead خلال 10 دقائق من الوصول',t:s=>atA(s,'ecg12')!=null&&atA(s,'ecg12')<=600},
  {l:'Aspirin 300 mg مضغ',t:s=>has(s,'asa')},
  {l:'تسجيل V4R في الاحتشاء السفلي',t:s=>atA(s,'rightecg')!=null},
  {l:'تجنّب النترات (ضغط أقل من 90 + إصابة RV)',t:s=>!has(s,'ntg')},
  {l:'سوائل للهبوط مع إعادة تقييم الرئتين',t:s=>has(s,'ns')},
  {l:'النقل لمركز PCI مع تفعيل مسبق',t:s=>s.ans.transport==='pci'}],
 protocol:['ABC وتوصيل المونيتور، وتجهيز وسادات الصدمات','12-lead خلال 10 دقائق، وV4R في كل احتشاء سفلي','Aspirin 162–325 mg مضغ (غالباً 300 mg في البروتوكول المحلي)','O₂ فقط إذا SpO₂ أقل من 90% أو ضيق تنفس','Nitroglycerin 0.4 mg SL فقط إذا SBP ≥ 90 ولا إصابة RV ولا مثبطات PDE5 خلال 24–48 ساعة','هبوط الضغط مع إصابة RV: NS 250 mL boluses مع مراقبة الرئتين','مسكن أفيوني للألم المستمر إذا الضغط يسمح','تفعيل Cath lab مبكراً والنقل لمركز PCI'],
 pearls:['احتشاء البطين الأيمن يعتمد على الحجم: لا نترات، لا مدرات، أعطِ سوائل.','أغلب وفيات STEMI المبكرة بسبب VF — الوسادات ملصقة طوال النقل.']},

/* 2 Hypoglycemia */
{id:'hypo',nt:'تغيّر مفاجئ في الوعي',cat:'medical',title:'تغير الوعي — نقص السكر',tags:['BGL','D10','Glucagon','Stroke mimic'],level:'مبتدئ',
 dispatch:{no:'24152',pri:'أحمر',loc:'حي سكني — شقة، الطابق الأرضي',age:67,sex:'أنثى',cc:'ابنتها وجدتها مشوشة ومتعرقة ولا تتكلم بشكل مفهوم',hx:'سكري نوع 2 على الأنسولين، ارتفاع ضغط',meds:'Insulin glargine، Insulin aspart، Lisinopril',alg:'Penicillin',note:'الابنة: «أخذت إبرة الأنسولين وما تعشّت»'},
 req:['monitor','probag','gluco'],
 init:{rhythm:'sinustach',v:{hr:112,sbp:150,dbp:88,rr:18,spo2:97,etco2:36,gcs:10,glu:36,temp:36.4}},
 skin:'شاحبة ومتعرقة بغزارة',
 find:{
  scene:'المنزل آمن. المريضة على الكنبة، بجانبها قلم أنسولين وصحن عشاء لم يُلمس.',
  impression:'سيدة مشوشة، متعرقة، تستجيب للصوت (V على AVPU)، كلامها غير مفهوم.',
  airway:'سالك حالياً، لكن رد فعل البلع ضعيف.',
  breathing:s=>`RR ${r(s.v.rr)}، الرئتان صافيتان.`,
  circ:s=>`نبض سريع قوي منتظم ${r(s.v.hr)}/د، الجلد بارد رطب، CRT أقل من 2 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} (${gcsTxt(s.v.gcs)})، الحدقتان متساويتان ومتفاعلتان.`+(s.v.glu<70?' ضعف خفيف في الذراع اليمنى.':' لا ضعف بؤري الآن.'),
  glucose:s=>`سكر الدم ${r(s.v.glu)} mg/dL`+(s.v.glu<70?' ← انخفاض شديد.':' ← ضمن المقبول.'),
  sample:'S: تشوش وتعرق. A: Penicillin. M: أنسولين طويل وقصير المفعول. P: سكري، ضغط. L: لم تتعشَّ بعد جرعة الأنسولين. E: أخذت الأنسولين قبل ساعتين.',
  secondary:'لا آثار سقوط أو إصابة في الرأس. لا عضة لسان.',
  ecg12:'Sinus tachycardia بدون تغيرات ST.'
 },
 fp:{disab:'الضعف في جهة واحدة مع نقص السكر قد يحاكي السكتة الدماغية — قِس السكر في كل تغير بالوعي قبل تفعيل مسار السكتة.',glucose:'نقص السكر: أقل من 70 mg/dL (3.9 mmol/L).',airway:'لا تعطِ شيئاً بالفم لمريض لا يحمي مجراه الهوائي.'},
 relevant:['scene','impression','airway','breathing','circ','disab','glucose','sample','monitor'],
 twelve:{rh:'sinustach',hr:112},
 ecgQ:{need:'monitor',opts:['Sinus tachycardia','SVT','Atrial fibrillation','Sinus rhythm'],ans:'Sinus tachycardia',why:'موجة P قبل كل QRS، منتظم، والمعدل أكثر من 100: تسرع جيبي بسبب إفراز الأدرينالين مع نقص السكر.'},
 stab:{ans:'unstable',why:'تغير مستوى الوعي (GCS 10) يجعل المريضة غير مستقرة حتى لو كانت العلامات الحيوية مقبولة.'},
 crit:{ans:'yes',why:'نقص السكر الشديد مع تغير الوعي يهدد الدماغ وقد يسبب تشنجات أو غيبوبة، لكنه يُعالج بسرعة في الميدان.'},
 rx:{
  iv:s=>s.flags.noIV?{k:'info',nodone:1,m:'محاولتان فاشلتان لإيجاد وريد (أوردة منهارة). فكّر في البديل العضلي.'}:{k:'good',c:1,m:'خط وريدي 18G.'},
  d10:{k:'good',c:1,m:'Dextrose 10% 100 mL IV — أعد قياس السكر بعد 5 دقائق وكرر إذا بقي أقل من 70.',fx:s=>{T(s,{glu:118,gcs:15,hr:92,sbp:138,dbp:82});}},
  glucagon:{k:'good',c:1,m:'Glucagon 1 mg IM — يبدأ مفعوله خلال 10–15 دقيقة، وأقل فعالية إذا كان مخزون الجلايكوجين منخفضاً.',fx:s=>s.later.push({at:s.t+120,fx:x=>T(x,{glu:84,gcs:14,hr:98}),m:'المريضة بدأت تستجيب بعد الـ Glucagon.',k:'good'})},
  oralglu:s=>s.v.gcs<14?{k:'bad',m:'خطر الشفط! الجلوكوز الفموي فقط للمريض الواعي الذي يبلع ويحمي مجراه الهوائي.',fx:s=>{A(s,{spo2:-6,rr:6});s.flags.badOral=1;}}:{k:'good',m:'المريضة واعية وتبلع: جلوكوز فموي ثم وجبة كربوهيدرات.',fx:s=>A(s,{glu:30})},
  naloxone:{k:'neutral',m:'لا علامات تسمم أفيونات (الحدقات طبيعية والتنفس كافٍ).'},
  o2nc:{k:'neutral',m:'SpO₂ 97% — لا حاجة للأكسجين.'},o2nrb:{k:'neutral',m:'SpO₂ 97% — لا حاجة للأكسجين.'}
 },
 ideal:['iv','d10'],
 tl:[{at:240,if:s=>s.v.glu<60,fx:s=>{T(s,{gcs:7,hr:126});s.flags.seizure=1;},m:'المريضة دخلت في تشنج عام 40 ثانية ثم توقف — انخفض مستوى الوعي.'}],
 chal:[{l:'تعذّر الحصول على خط وريدي',fx:s=>{s.flags.noIV=1;},m:'(المدرب) لا توجد أوردة مناسبة — محاولة IV القادمة ستفشل.'},{l:'تشنج',fx:s=>T(s,{gcs:6,spo2:90,hr:132}),m:'المريضة تتشنج الآن!'},{l:'رفض النقل بعد التحسن',m:'المريضة بعد الإفاقة: «أنا بخير الحين، ما أبي أروح المستشفى».'}],
 transport:[{id:'ed',l:'قسم الطوارئ مع قياس السكر كل 10–15 دقيقة أثناء النقل',ok:1,why:'الأنسولين طويل المفعول (glargine) يجعل عودة الانخفاض محتملة جداً.'},{id:'stroke',l:'مركز السكتة الدماغية مع تفعيل كود السكتة',ok:0,why:'الأعراض البؤرية زالت بتصحيح السكر — كانت محاكاة للسكتة.'},{id:'home',l:'تركها في المنزل بعد الإفاقة',ok:0,why:'غير آمن مع الأنسولين طويل المفعول، ولا يتم إلا وفق بروتوكول عدم النقل وتوقيع واضح.'}],
 critical:[
  {l:'قياس السكر خلال 5 دقائق',t:s=>atA(s,'glucose')!=null&&atA(s,'glucose')<=300},
  {l:'Dextrose IV أو Glucagon IM',t:s=>has(s,'d10')||has(s,'glucagon')},
  {l:'عدم إعطاء جلوكوز فموي لمريضة لا تحمي مجراها',t:s=>!s.flags.badOral},
  {l:'إعادة قياس السكر بعد العلاج',t:s=>(s.cnt['a:glucose']||0)>=2},
  {l:'النقل للطوارئ مع المراقبة',t:s=>s.ans.transport==='ed'}],
 protocol:['ABC، وقياس السكر في كل تغير بالوعي','أقل من 70 mg/dL مع تغير الوعي: Dextrose 10% 100 mL IV ويكرر حسب الحاجة (أو D50 25 g حسب البروتوكول)','بدون وريد: Glucagon 1 mg IM','جلوكوز فموي فقط للواعي الذي يبلع ويحمي مجراه','إعادة القياس بعد 5–10 دقائق','بعد الإفاقة: وجبة كربوهيدرات، والنقل خاصة مع الأنسولين طويل المفعول أو السلفونيل يوريا'],
 pearls:['Dextrose 10% أقل تهييجاً للوريد من D50 وأقل تسبباً في الارتفاع الارتدادي.','السلفونيل يوريا مثل Gliclazide تسبب انخفاضاً متكرراً لساعات طويلة.']},

/* 3 CHB */
{id:'chb',nt:'دوخة وإغماء متكرر',cat:'medical',title:'إغماء متكرر — بطء قلب غير مستقر',tags:['3rd-degree AVB','Atropine','TCP'],level:'متقدم',
 dispatch:{no:'24188',pri:'أحمر',loc:'مسجد الحي — بعد صلاة العصر',age:74,sex:'ذكر',cc:'دوخة شديدة وإغماء مرتين خلال ساعة',hx:'ارتفاع ضغط، ارتفاع دهون، قصور قلب خفيف',meds:'Amlodipine، Atorvastatin، Furosemide',alg:'لا يوجد',note:'أحد المصلين: «طاح مرتين وصار لونه رمادي»'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'chb',v:{hr:34,sbp:76,dbp:42,rr:20,spo2:94,etco2:33,gcs:14,glu:122,temp:36.5}},
 skin:'رمادي شاحب، بارد ومتعرق',
 find:{
  scene:'المكان آمن. المريض ممدد على السجاد وحوله عدد من المصلين ← اطلب مساحة للعمل.',
  impression:'رجل مسن شاحب، مشوش قليلاً، يستجيب للصوت ويجيب ببطء.',
  airway:'سالك.',
  breathing:s=>`RR ${r(s.v.rr)}، الصدر متساوٍ، خراخر خفيفة في القاعدتين.`,
  circ:s=>`نبض كعبري بطيء جداً ${r(s.v.hr)}/د منتظم، الجلد بارد رطب، CRT 4 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} (${gcsTxt(s.v.gcs)})، الحدقتان متساويتان، لا ضعف بؤري.`,
  expose:'كدمة بسيطة في الجبهة من السقوط.',
  sample:'S: دوخة وإغماء متكرر وتعب منذ يومين. A: لا يوجد. M: كما في البلاغ — لا يتناول Beta-blockers أو Digoxin. P: ضغط، قصور قلب. L: الغداء. E: إغماء مفاجئ دون مقدمات أثناء الوقوف.',
  secondary:'كدمة جبهة بدون جرح كبير، لا ألم في الرقبة.',
  ecg12:'موجات P منتظمة (~82/د) لا علاقة لها بمركبات QRS العريضة (~34/د) — انفصال أذيني بطيني كامل.'
 },
 fp:{circ:'بطء + هبوط ضغط + تغير وعي = بطء قلب غير مستقر يحتاج علاجاً فورياً.',ecg12:'ابحث عن موجات P «تمشي» عبر QRS دون علاقة ثابتة.',sample:'اسأل دائماً عن الأدوية المبطئة: Beta-blockers وCCB غير الديهيدروبيريدين وDigoxin.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','ecg12','sample','glucose'],
 twelve:{rh:'chb',hr:34},
 ecgQ:{need:'ecg12',opts:['Sinus bradycardia','2nd-degree AV block Mobitz I','3rd-degree AV block','Junctional rhythm','Slow atrial fibrillation'],ans:'3rd-degree AV block',why:'المسافة P–P ثابتة والمسافة R–R ثابتة لكن لا علاقة بينهما، وQRS عريض = إيقاع هروب بطيني. غالباً لا يستجيب للأتروبين.'},
 stab:{ans:'unstable',why:'HR 34 مع SBP 76 وتشوش وعلامات صدمة = بطء غير مستقر.'},
 crit:{ans:'yes',why:'قد يتطور إلى Asystole أو Torsades، ويحتاج pacing.'},
 rx:{
  iv:{k:'good',c:1,m:'خط وريدي 18G.'},
  atropine:s=>{const n=s.cnt.atropine;if(n>3)return{k:'bad',m:'تجاوزت الجرعة القصوى 3 mg.'};return n===1?{k:'good',c:1,m:'Atropine 1 mg — ارتفاع بسيط فقط (من 34 إلى ~37). الإحصار تحت العقدة لا يستجيب غالباً؛ لا تؤخر الـ pacing.',fx:s=>A(s,{hr:3,sbp:2})}:{k:'neutral',m:'لا استجابة تذكر لجرعة إضافية — انتقل للـ pacing أو Epinephrine infusion.'};},
  pace:s=>s.rhythm==='paced'?{k:'neutral',m:'الـ pacer يعمل والالتقاط مستمر.'}:{k:'good',c:1,m:'Pacing بمعدل 70/د، رفع التيار حتى الالتقاط الكهربائي عند 70 mA — تحقق من النبض الفخذي (التقاط ميكانيكي).',p:'الـ pacing مؤلم: أعطِ مسكناً أو مهدئاً حسب البروتوكول إذا سمح الوقت.',fx:s=>{setRhythm(s,'paced');T(s,{hr:70,sbp:108,dbp:66,gcs:15,spo2:96});}},
  epiInf:s=>s.rhythm==='paced'?{k:'neutral',m:'المريض مستقر على الـ pacing.'}:{k:'good',c:1,m:'Epinephrine 2–10 mcg/min — بديل مقبول عند فشل الـ pacing أو تأخره.',fx:s=>A(s,{hr:16,sbp:16,dbp:8,gcs:1})},
  fent:s=>s.rhythm==='paced'?{k:'good',m:'تسكين ألم الـ pacing مع مراقبة الضغط.'}:{k:'neutral',m:'لا يوجد استطباب للتسكين الآن.'},
  ns:{k:'info',m:'bolus صغير قد يساعد قليلاً، لكن المشكلة في المعدل وليس في الحجم.',fx:s=>A(s,{sbp:3})},
  o2nc:{k:'info',m:'SpO₂ 94% — الأكسجين اختياري (الهدف ≥ 94%).',fx:s=>A(s,{spo2:2})}
 },
 ideal:['iv','atropine','pace'],
 tl:[{at:180,if:s=>s.rhythm!=='paced'&&!has(s,'epiInf'),fx:s=>T(s,{hr:28,sbp:64,dbp:36,gcs:10}),m:'المريض أصبح أقل استجابة والنبض أبطأ.'},{at:420,if:s=>s.rhythm==='chb'&&!has(s,'epiInf'),fx:s=>setRhythm(s,'asystole'),m:'توقف القلب — Asystole!'}],
 chal:[{l:'فقدان الالتقاط (Loss of capture)',fx:s=>{if(s.rhythm==='paced'){setRhythm(s,'chb');T(s,{hr:34,sbp:72,dbp:40,gcs:13});}},m:'المونيتور يظهر نبضات الـ pacer بدون QRS بعدها — فقدان الالتقاط!'},{l:'Asystole',fx:s=>setRhythm(s,'asystole'),m:'توقف القلب — Asystole!'}],
 rosc:{rhythm:'chb',v:{hr:34,sbp:70,dbp:40,spo2:92,rr:12,gcs:6,etco2:36}},
 transport:[{id:'cardiac',l:'مركز قلب فيه pacing وريدي مؤقت ومختبر قسطرة',ok:1,why:'يحتاج منظماً مؤقتاً ثم دائماً.'},{id:'near',l:'أقرب مستشفى عام بدون قسم قلب',ok:0,why:'سيحتاج نقلاً ثانوياً؛ اختر مركز القلب إذا كان ضمن مسافة معقولة.'},{id:'scene',l:'المراقبة في الموقع حتى تتحسن العلامات',ok:0,why:'لن تتحسن دون علاج نهائي.'}],
 critical:[
  {l:'التعرف على 3rd-degree AV block',t:s=>s.ans.ecg==='3rd-degree AV block'},
  {l:'خط وريدي',t:s=>has(s,'iv')},
  {l:'Pacing أو Epinephrine infusion',t:s=>has(s,'pace')||has(s,'epiInf')},
  {l:'عدم تأخير الـ pacing أكثر من 5 دقائق',t:s=>(s.at.pace??s.at.epiInf??9999)<=300},
  {l:'النقل لمركز قلب',t:s=>s.ans.transport==='cardiac'}],
 protocol:['ABC، O₂ إذا SpO₂ أقل من 94%، مونيتور، IV، 12-lead','ابحث عن الأسباب: أدوية، نقص أكسجين، فرط بوتاسيوم، احتشاء سفلي','Atropine 1 mg IV كل 3–5 دقائق (حد أقصى 3 mg)','عند عدم الاستجابة: Transcutaneous pacing أو Epinephrine 2–10 mcg/min أو Dopamine 5–20 mcg/kg/min','تسكين وتهدئة أثناء الـ pacing حسب البروتوكول','النقل لمركز قلب'],
 pearls:['في الإحصار عالي الدرجة بـ QRS عريض لا تنتظر الأتروبين — جهّز الـ pacing فوراً.','تحقق من الالتقاط الميكانيكي بالنبض الفخذي، لأن حركة العضلات تشوش النبض السباتي.']},

/* 4 SVT */
{id:'svt',nt:'خفقان سريع',cat:'medical',title:'خفقان سريع — تسرع فوق بطيني',tags:['SVT','Valsalva','Adenosine'],level:'متوسط',
 dispatch:{no:'24203',pri:'أصفر',loc:'مبنى إداري — الطابق 5',age:32,sex:'أنثى',cc:'خفقان سريع مفاجئ منذ 30 دقيقة مع دوخة خفيفة',hx:'نوبات خفقان مشابهة سابقاً توقفت وحدها',meds:'لا يوجد',alg:'لا يوجد',note:'زميلتها: «قلبها يدق بسرعة مرة»'},
 req:['monitor','probag'],
 init:{rhythm:'svt',v:{hr:188,sbp:112,dbp:74,rr:20,spo2:98,etco2:34,gcs:15,glu:104,temp:36.8}},
 skin:'لون طبيعي، دافئ وجاف',
 find:{
  scene:'المكتب آمن، المصعد يعمل.',impression:'سيدة واعية قلقة، جالسة، تتكلم بجمل كاملة.',airway:'سالك.',breathing:'RR 20، الرئتان صافيتان.',
  circ:s=>`نبض كعبري سريع جداً منتظم ${r(s.v.hr)}/د وقوي، الجلد دافئ، CRT أقل من 2 ث.`,
  disab:'GCS 15، لا عجز عصبي.',
  sample:'S: خفقان ودوخة خفيفة، لا ألم صدر ولا إغماء. A: لا يوجد. M: لا يوجد. P: نوبات سابقة. L: قهوة صباحاً. E: بدأ فجأة أثناء الانحناء.',
  opqrst:'لا يوجد ألم صدر.',ecg12:'تسرع منتظم بـ QRS ضيق ومعدل 188، لا موجات P واضحة.'
 },
 fp:{impression:'ابحث عن علامات عدم الاستقرار: هبوط ضغط، تغير وعي، ألم صدري إقفاري، صدمة، فشل قلب حاد.',ecg12:'سجّل 12-lead قبل العلاج إن أمكن — يفيد الطبيب في التشخيص لاحقاً.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','ecg12','sample'],
 twelve:{rh:'svt',hr:188},
 ecgQ:{need:'ecg12',opts:['Sinus tachycardia','SVT','Atrial flutter 2:1','Ventricular tachycardia','Atrial fibrillation'],ans:'SVT',why:'منتظم، QRS ضيق، 188/د، بلا P واضحة، وبداية مفاجئة — غالباً AVNRT. التسرع الجيبي يبدأ تدريجياً ونادراً يتجاوز (220 − العمر).'},
 stab:{ans:'stable',why:'الضغط 112/74، واعية، لا ألم صدر ولا علامات صدمة ← مستقرة.'},
 crit:{ans:'no',why:'لا تهدد الحياة فوراً طالما بقيت مستقرة، لكنها تحتاج علاجاً ومراقبة لاحتمال عدم الاستقرار.'},
 rx:{
  iv:{k:'good',c:1,m:'خط وريدي كبير في الوريد المرفقي (antecubital) — ضروري للـ Adenosine.'},
  vagal:s=>{if(s.rhythm!=='svt')return{k:'neutral',m:'الإيقاع ليس SVT الآن.'};const ok=Math.random()<.3;return ok?{k:'good',c:1,m:'نجحت المناورة المعدلة!',fx:s=>convert(s,94)}:{k:'good',c:1,m:'لم يتحول الإيقاع. المناورة المعدلة تنجح في نحو 43% مقابل 17% للتقليدية (REVERT). الخطوة التالية: Adenosine.'};},
  adeno6:s=>{if(s.rhythm!=='svt')return{k:'neutral',m:'الإيقاع ليس SVT الآن.'};const ok=Math.random()<.6;return{k:'good',c:1,m:ok?'Adenosine 6 mg دفع سريع + flush — توقف قصير ثم تحول الإيقاع.':'Adenosine 6 mg — تباطؤ لحظي ثم عاد SVT. أعطِ 12 mg.',p:'أخبر المريضة مسبقاً: شعور بضيق أو «توقف» لثوانٍ. اطبع شريط الإيقاع أثناء الحقن.',fx:ok?s=>convert(s,96):null};},
  adeno12:s=>{if(s.rhythm!=='svt')return{k:'neutral',m:'الإيقاع ليس SVT الآن.'};const ok=Math.random()<.9;return{k:'good',c:1,m:ok?'Adenosine 12 mg — تحول الإيقاع إلى جيبي.':'لم يتحول بعد 12 mg — تواصل مع التوجيه الطبي؛ يمكن تكرار 12 mg مرة واحدة.',fx:ok?s=>convert(s,96):null};},
  sync:s=>s.v.sbp<90&&s.rhythm==='svt'?{k:'good',c:1,m:'المريضة أصبحت غير مستقرة: Synchronized cardioversion — تحول الإيقاع.',fx:s=>convert(s,98)}:{k:'bad',m:'المريضة مستقرة — الـ cardioversion للمريض غير المستقر ويحتاج تهدئة.'},
  o2nc:{k:'neutral',m:'SpO₂ 98% — لا حاجة.'},o2nrb:{k:'neutral',m:'SpO₂ 98% — لا حاجة.'},asa:{k:'neutral',m:'لا يوجد اشتباه في متلازمة الشريان التاجي.'}
 },
 ideal:['iv','vagal','adeno6'],
 tl:[],
 chal:[{l:'تصبح غير مستقرة (BP 78/40 + ألم صدر)',fx:s=>{if(s.rhythm==='svt')T(s,{sbp:78,dbp:40,hr:205});},m:'المريضة: «صدري يعورني وراح أطيح» — الضغط ينخفض.'},{l:'عودة SVT بعد التحويل',fx:s=>{setRhythm(s,'svt');T(s,{hr:186});},m:'عاد الخفقان السريع فجأة.'}],
 transport:[{id:'ed',l:'قسم الطوارئ للمراقبة وتقييم القلب',ok:1,why:'حتى بعد التحويل تحتاج تقييماً (WPW؟ تكرار؟). رفض النقل ممكن فقط وفق بروتوكول واضح.'},{id:'pci',l:'تفعيل Cath lab',ok:0,why:'لا يوجد STEMI.'},{id:'home',l:'لا داعي للنقل بعد التحويل',ok:0,why:'تحتاج تقييماً وتوثيقاً؛ وعدم النقل يحتاج بروتوكولاً وتوقيعاً.'}],
 critical:[
  {l:'12-lead قبل العلاج الدوائي',t:s=>atA(s,'ecg12')!=null&&atA(s,'ecg12')<=(s.at.adeno6??99999)},
  {l:'تصنيفها مستقرة',t:s=>s.ans.stab==='stable'},
  {l:'مناورة المبهم قبل الـ Adenosine',t:s=>has(s,'vagal')&&(s.at.vagal<=(s.at.adeno6??99999))},
  {l:'Adenosine بالتسلسل الصحيح (6 ثم 12 mg)',t:s=>has(s,'adeno6')&&(!has(s,'adeno12')||s.at.adeno6<=s.at.adeno12)},
  {l:'لا صدمات لمريضة مستقرة',t:s=>!has(s,'defib')&&!(has(s,'sync')&&!s.flags.syncOk)},
  {l:'النقل للطوارئ',t:s=>s.ans.transport==='ed'}],
 protocol:['ABC، مونيتور، 12-lead، وIV كبير في الوريد المرفقي','مستقرة: مناورة Valsalva المعدلة','Adenosine 6 mg دفع سريع + 20 mL NS flush، ثم 12 mg إذا لزم','غير مستقرة: Synchronized cardioversion فوراً (مع تهدئة إن أمكن)','وثّق الإيقاع بشريط مطبوع أثناء إعطاء الـ Adenosine'],
 pearls:['التسرع غير المنتظم بـ QRS عريض لا يُعطى فيه Adenosine (احتمال AF مع WPW).']},

/* 5 Anaphylaxis */
{id:'ana',nt:'تورم وضيق تنفس بعد الأكل',cat:'medical',title:'تورم وضيق تنفس — صدمة تأقية',tags:['Anaphylaxis','Epi IM','Stridor'],level:'متوسط',
 dispatch:{no:'24219',pri:'أحمر',loc:'مطعم مأكولات بحرية — الواجهة البحرية',age:24,sex:'ذكر',cc:'تورم في الشفايف وصعوبة تنفس وطفح جلدي بعد الأكل بـ 10 دقائق',hx:'ربو خفيف',meds:'Salbutamol عند الحاجة',alg:'غير معروفة سابقاً',note:'صديقه: «صوته تغيّر ويحك جسمه كله»'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'sinustach',v:{hr:132,sbp:80,dbp:48,rr:30,spo2:89,etco2:30,gcs:15,glu:110,temp:37}},
 skin:'محمر مع شرى منتشر',
 find:{
  scene:'المطعم آمن. المريض جالس منحنٍ للأمام على كرسي.',
  impression:'شاب قلق جداً، وجه منتفخ، شفتان متورمتان، يتكلم بكلمات متقطعة.',
  airway:s=>s.flags.epi1?'تحسن التورم، الصوت أوضح، لا stridor.':'صوت أجش وstridor خفيف عند الشهيق — خطر انسداد علوي.',
  breathing:s=>`RR ${r(s.v.rr)}، أزيز منتشر في الرئتين، استخدام عضلات مساعدة.`,
  circ:s=>`نبض سريع ضعيف ${r(s.v.hr)}/د، CRT 3 ث.`,
  disab:'GCS 15، قلق.',expose:'شرى منتشر على الجذع والأطراف مع احمرار.',
  sample:'S: حكة وتورم وضيق تنفس ودوخة. A: لا حساسية معروفة — أول مرة يأكل الروبيان. M: Salbutamol. P: ربو. L: روبيان قبل 15 دقيقة. E: بدأت الأعراض بعد الأكل بـ 10 دقائق.'
 },
 fp:{airway:'Stridor وبحة الصوت = تورم حنجري: الأدرينالين IM فوراً ولا تنتظر.',expose:'معايير التأق: إصابة الجلد أو الأغشية المخاطية + (تنفس أو ضغط) بعد التعرض لمسبب محتمل.'},
 relevant:['scene','impression','airway','breathing','circ','disab','expose','monitor','sample'],
 twelve:{rh:'sinustach',hr:132},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'موجات P موجودة: تسرع جيبي تعويضي بسبب الصدمة التوزيعية ونقص الأكسجين.'},
 stab:{ans:'unstable',why:'هبوط ضغط 80/48 + stridor + SpO₂ 89% = صدمة تأقية مع إصابة المجرى الهوائي.'},
 crit:{ans:'yes',why:'التأق قد يقتل خلال دقائق بانسداد المجرى أو الانهيار الدوري.'},
 rx:{
  epiIM:s=>{const n=s.cnt.epiIM;if(n===1)return{k:'good',c:1,m:'Epinephrine 0.5 mg IM في الفخذ الجانبي — تحسن جزئي.',p:'يمكن التكرار كل 5–15 دقيقة إذا لم تتحسن الأعراض.',fx:s=>{s.flags.epi1=1;T(s,{sbp:96,dbp:60,hr:118,spo2:93,rr:24});}};
    if(n<=3){const early=s.t-(s.last.epiIM??-999)<300;return{k:'good',m:'جرعة IM إضافية — تحسن واضح.'+(early?' (الفاصل المعتاد 5 دقائق على الأقل)':''),fx:s=>T(s,{sbp:112,dbp:70,hr:108,spo2:96,rr:20})};}
    return{k:'neutral',m:'جرعات متعددة بلا استجابة كافية — فكّر في Epinephrine infusion حسب البروتوكول.'};},
  epiIV:s=>({k:'bad',m:'Epinephrine 1 mg IV bolus لمريض لديه نبض خطير جداً: تسرع شديد وارتفاع ضغط واضطرابات بطينية. هذا التركيز للتوقف القلبي فقط.',fx:s=>{T(s,{hr:172,sbp:214,dbp:120});s.later.push({at:s.t+45,fx:x=>T(x,{hr:126,sbp:118,dbp:72,spo2:94}),m:'بدأت موجة الأدرينالين الحادة بالانحسار.'});}}),
  o2nrb:{k:'good',c:1,m:'O₂ عالي التدفق عبر NRB.',fx:s=>A(s,{spo2:3})},
  neb:{k:'good',m:'Salbutamol — علاج مساعد للأزيز، لا يغني عن الأدرينالين.',fx:s=>A(s,{spo2:2,rr:-2})},
  iv:{k:'good',c:1,m:'خط وريدي كبير.'},
  ns:{k:'good',c:1,m:'NS bolus — في التأق يحتاج البالغ عادة 1–2 L.',fx:s=>A(s,{sbp:6,dbp:3})},
  nsLarge:{k:'good',m:'NS 1–2 L سريعاً — مناسب للصدمة التأقية مع مراقبة الرئتين.',fx:s=>A(s,{sbp:14,dbp:8,hr:-6})},
  antihist:{k:'info',m:'علاج مساعد للحكة والشرى فقط — لا يعالج الصدمة ولا الانسداد ولا يجوز أن يؤخر الأدرينالين.'},
  sga:{k:'neutral',m:'الأدوات فوق المزمار قد تفشل مع تورم الحنجرة؛ الأولوية للأدرينالين ونقل سريع لمجرى هوائي متقدم في المستشفى.'}
 },
 ideal:['epiIM','o2nrb','iv','ns'],
 tl:[{at:150,if:s=>!has(s,'epiIM'),fx:s=>T(s,{spo2:80,sbp:68,dbp:38,hr:146,rr:36,gcs:13}),m:'الـ stridor يزداد والمريض أصبح مشوشاً — تدهور سريع!'},{at:330,if:s=>!has(s,'epiIM'),fx:s=>setRhythm(s,'pea'),m:'فقد النبض — PEA!'}],
 chal:[{l:'عودة الأعراض بعد التحسن',fx:s=>T(s,{sbp:84,dbp:50,spo2:90,hr:130}),m:'بعد التحسن عاد الأزيز وانخفض الضغط.'},{l:'انسداد مجرى متزايد',fx:s=>T(s,{spo2:80,rr:34}),m:'الـ stridor أعلى والمريض لا يستطيع الكلام!'}],
 rosc:{rhythm:'sinustach',v:{hr:128,sbp:84,dbp:50,spo2:90,rr:14,gcs:7,etco2:36}},
 transport:[{id:'ed',l:'أقرب قسم طوارئ قادر على التعامل مع مجرى هوائي صعب',ok:1,why:'احتمال التفاعل ثنائي الطور، ويحتاج مراقبة عدة ساعات.'},{id:'clinic',l:'عيادة الحساسية',ok:0,why:'حالة طارئة مهددة للحياة.'},{id:'home',l:'لا داعي للنقل بعد التحسن',ok:0,why:'خطر عودة الأعراض بعد زوال مفعول الأدرينالين.'}],
 critical:[
  {l:'Epinephrine IM خلال 3 دقائق من الوصول',t:s=>(s.at.epiIM??9999)<=180},
  {l:'التعرف على إصابة المجرى الهوائي',t:s=>atA(s,'airway')!=null},
  {l:'O₂ عالي التدفق',t:s=>has(s,'o2nrb')},
  {l:'سوائل للهبوط',t:s=>has(s,'ns')||has(s,'nsLarge')},
  {l:'لا Epinephrine IV bolus مع وجود نبض',t:s=>!s.errIds.has('epiIV')},
  {l:'النقل للطوارئ',t:s=>s.ans.transport==='ed'}],
 protocol:['أبعد المسبب إن أمكن','Epinephrine 0.5 mg IM (1 mg/mL) في الفخذ الجانبي، ويكرر كل 5–15 دقيقة','O₂ عالي التدفق، ووضعية مريحة (جلوس لضيق التنفس، استلقاء مع رفع الساقين للصدمة)','IV + NS 1–2 L للبالغ مع الهبوط','Salbutamol للأزيز، ومضادات الهستامين علاج مساعد فقط','Epinephrine 1 mg IV bolus للتوقف القلبي فقط'],
 pearls:['مرضى الربو أكثر عرضة للتأق الشديد والوفاة.']},

/* 6 C-spine */
{id:'cspine',nt:'انقلاب مركبة — ضعف في الأطراف',cat:'trauma',title:'انقلاب مركبة — إصابة الفقرات العنقية',tags:['C4–C5','Neurogenic shock','SMR'],level:'متقدم',
 dispatch:{no:'24231',pri:'أحمر',loc:'طريق سريع — مخرج 9، انقلاب مركبة',age:22,sex:'ذكر',cc:'سائق انقلبت سيارته، لا يستطيع تحريك يديه ورجليه ويشتكي من صعوبة تنفس',hx:'غير معروف',meds:'غير معروف',alg:'غير معروف',note:'الدفاع المدني في الموقع، المركبة مستقرة. السائق لم يكن يلبس الحزام.'},
 req:['monitor','probag','oxygen','lifebag','spinal'],
 init:{rhythm:'sinusbrady',v:{hr:50,sbp:80,dbp:44,rr:30,spo2:90,etco2:46,gcs:15,glu:130,temp:36.1}},
 skin:'دافئ وجاف ووردي تحت مستوى الإصابة',
 find:{
  scene:'حركة مرور عالية — أوقف الإسعاف بزاوية حماية والبس سترة عاكسة. تأكد من إطفاء محرك المركبة وعدم وجود تسرب وقود. آلية إصابة عالية الطاقة (انقلاب + بدون حزام).',
  impression:'شاب ممدد على ظهره بجانب السيارة (أخرجه المارة)، واعٍ، يتكلم بجمل قصيرة، لا يحرك أطرافه.',
  xhem:'لا يوجد نزيف كارثي خارجي.',
  airway:'سالك، يتكلم. ألم في مؤخرة الرقبة ← يحتاج تثبيتاً يدوياً للرقبة الآن.',
  breathing:s=>`RR ${r(s.v.rr)} سطحي. التنفس بطني: البطن يرتفع والصدر لا يتمدد (عضلات ما بين الأضلاع مشلولة). السعال ضعيف. أصوات التنفس متساوية.`,
  circ:s=>`نبض بطيء ${r(s.v.hr)}/د، الجلد دافئ وجاف، CRT أقل من 2 ث. لا نزيف ظاهر، البطن لين، الحوض ثابت.`,
  disab:s=>`GCS ${r(s.v.gcs)}. شلل رخو في الأطراف الأربعة، وفقدان الإحساس تحت الترقوة. انتصاب مستمر (priapism).`,
  expose:'لا إصابات ظاهرة أخرى. الجلد دافئ والمريض يفقد حرارته بسرعة (poikilothermia).',
  sample:'S: لا يستطيع تحريك أطرافه، صعوبة تنفس. A: لا يوجد. M: لا يوجد. P: سليم. L: قبل 3 ساعات. E: انقلاب أثناء السرعة بدون حزام.',
  secondary:'ألم وتشوه بسيط عند جسّ الفقرات العنقية الوسطى. لا إصابات صدرية واضحة.',
  ecg12:'Sinus bradycardia 50/د بدون تغيرات إقفارية.'
 },
 fp:{breathing:'إصابات الفقرة C4 وC5 من العمود الفقري ممكن تظهر كمشكلة تنفسية للمريض! العصب الحجابي يخرج من C3–C5 («C3, 4, 5 keeps the diaphragm alive»). الإصابة هنا تشل عضلات ما بين الأضلاع، وقد يضعف الحجاب الحاجز تدريجياً مع تورم النخاع ← إرهاق تنفسي.',circ:'صدمة عصبية: هبوط ضغط + بطء قلب + جلد دافئ جاف، بعكس الصدمة النزفية (تسرع + جلد بارد رطب). لا تفترضها قبل استبعاد النزيف.',airway:'افتح المجرى بالـ Jaw thrust وليس Head tilt في أي اشتباه بإصابة الرقبة.',scene:'انقلاب + عدم ربط الحزام = اشتباه عالٍ بإصابة العمود الفقري.',disab:'المستوى الحسي: الترقوة ≈ C4، الإبهام ≈ C6، الحلمة ≈ T4.'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor','capno','secondary'],
 twelve:{rh:'sinus',hr:50},
 ecgQ:{need:'monitor',opts:['Sinus bradycardia','3rd-degree AV block','Junctional rhythm','Sinus rhythm'],ans:'Sinus bradycardia',why:'P قبل كل QRS ومعدل 50: بطء جيبي بسبب فقدان التعصيب الودي للقلب (T1–T4) مع بقاء العصب المبهم.'},
 stab:{ans:'unstable',why:'هبوط ضغط + فشل تنفسي وشيك.'},
 crit:{ans:'yes',why:'إصابة نخاع عنقي عالية مع إرهاق تنفسي وصدمة عصبية — Load & Go لمركز إصابات.'},
 rx:{
  mils:{k:'good',c:1,m:'تثبيت يدوي على خط مستقيم — قبل أي تدخل في المجرى.'},
  htcl:{k:'bad',m:'Head tilt–chin lift ممنوع مع اشتباه إصابة الرقبة — قد يزيد إصابة النخاع.',fx:s=>A(s,{spo2:-2})},
  jaw:{k:'info',m:'المجرى سالك والمريض يتكلم؛ Jaw thrust جاهز عند الحاجة مع الحفاظ على تثبيت الرقبة.'},
  o2nrb:{k:'good',c:1,m:'O₂ عالي التدفق.',fx:s=>A(s,{spo2:4})},
  bvm:{k:'good',c:1,m:'تهوية مساعدة متزامنة مع تنفس المريض — تقلل الإرهاق وترفع التشبع.',fx:s=>T(s,{spo2:97,rr:14,etco2:40})},
  smr:s=>({k:'good',c:1,m:'SMR: C-collar مقاس مناسب + Scoop/Vacuum mattress مع head blocks.',p:has(s,'mils')?null:'كان يجب البدء بالتثبيت اليدوي قبل تجهيز الأدوات.'}),
  iv:{k:'good',c:1,m:'خط وريدي كبير.'},
  ns:s=>s.v.sbp<95?{k:'good',c:1,m:'NS 250 mL — الهدف SBP ≥ 90 لأن النخاع المصاب يحتاج تروية.',fx:s=>A(s,{sbp:8,dbp:4,hr:2})}:{k:'neutral',m:'الضغط ضمن الهدف؛ لا تزد السوائل.'},
  nsLarge:{k:'neutral',m:'كمية كبيرة دون إعادة تقييم قد تسبب وذمة رئوية في الصدمة العصبية؛ الأفضل boluses صغيرة متكررة.',fx:s=>A(s,{sbp:10,spo2:-3})},
  atropine:s=>s.v.hr<55?{k:'good',m:'Atropine 1 mg للبطء العرضي مع الهبوط.',fx:s=>A(s,{hr:16,sbp:6})}:{k:'neutral',m:'النبض مقبول الآن.'},
  warm:{k:'good',c:1,m:'تدفئة المريض — فقدان التحكم الحراري تحت مستوى الإصابة.'},
  sga:s=>s.v.gcs<9?{k:'good',m:'مجرى متقدم مع تثبيت الرقبة.'}:{k:'bad',m:'المريض واعٍ GCS 15 — لا يُدخل مجرى متقدم؛ قدّم تهوية مساعدة بالـ BVM.'},
  epiInf:{k:'info',m:'قد تُستخدم الأدوية الرافعة إذا لم يستجب الضغط للسوائل — حسب البروتوكول والتوجيه الطبي.'}
 },
 ideal:['mils','o2nrb','bvm','smr','iv','ns','warm'],
 tl:[{at:150,if:s=>!has(s,'bvm'),fx:s=>T(s,{spo2:84,rr:36,etco2:54,hr:46}),m:'المريض أصبح منهكاً، التنفس أسرع وأضعف، ويقول: «ما أقدر آخذ نفس».'},{at:300,if:s=>!has(s,'bvm'),fx:s=>T(s,{spo2:76,rr:8,gcs:11,etco2:62,hr:40}),m:'إرهاق تنفسي شديد — التنفس أصبح بطيئاً وسطحياً!'}],
 chal:[{l:'توقف تنفس',fx:s=>T(s,{rr:4,spo2:80,gcs:9,etco2:60}),m:'المريض توقف عن التنفس الفعال!'},{l:'أحد المارة يرفع رأس المريض',m:'أحد المارة يحاول رفع رأس المريض «عشان يرتاح»!'},{l:'هبوط ضغط إضافي',fx:s=>A(s,{sbp:-15,dbp:-8}),m:'الضغط ينخفض أكثر.'}],
 transport:[{id:'trauma',l:'مركز إصابات (Level I) فيه جراحة عمود فقري — مع تبليغ مسبق',ok:1,why:'إصابة نخاع عالية تحتاج تثبيتاً جراحياً ورعاية مركزة.'},{id:'near',l:'أقرب مستشفى عام',ok:0,why:'سيحتاج نقلاً ثانوياً ويضيع وقت حرج.'},{id:'wait',l:'الانتظار في الموقع لتحسن التنفس',ok:0,why:'التنفس سيسوء مع تورم النخاع.'}],
 critical:[
  {l:'تثبيت يدوي للرقبة خلال أول دقيقة',t:s=>(s.at.mils??9999)<=60},
  {l:'عدم استخدام Head tilt',t:s=>!has(s,'htcl')},
  {l:'تهوية مساعدة BVM للإرهاق التنفسي',t:s=>has(s,'bvm')},
  {l:'SMR كامل',t:s=>has(s,'smr')},
  {l:'سوائل لهدف SBP ≥ 90',t:s=>has(s,'ns')},
  {l:'النقل لمركز إصابات',t:s=>s.ans.transport==='trauma'}],
 protocol:['سلامة المشهد وآلية الإصابة','X-A-B-C-D-E: السيطرة على النزيف الكارثي ثم المجرى مع تثبيت يدوي للرقبة','Jaw thrust عند الحاجة لفتح المجرى','O₂ عالي التدفق + تهوية مساعدة BVM عند الإرهاق، ومراقبة EtCO₂','SMR: C-collar + Scoop أو Vacuum mattress','IV + NS boluses صغيرة لهدف SBP ≥ 90، وAtropine للبطء العرضي','منع انخفاض الحرارة','Load & Go لمركز إصابات'],
 pearls:['EtCO₂ المرتفع (أكثر من 50) علامة مبكرة على فشل التهوية قبل هبوط SpO₂.']},

/* 7 Tension pneumothorax */
{id:'tension',nt:'حادث تصادم — ضيق تنفس',cat:'trauma',title:'ارتطام بالمقود — استرواح صدري ضاغط',tags:['Tension PTX','Needle decompression'],level:'متوسط',
 dispatch:{no:'24246',pri:'أحمر',loc:'تقاطع داخل المدينة — تصادم أمامي',age:40,sex:'ذكر',cc:'السائق ارتطم صدره بالمقود، ضيق تنفس شديد ويزداد',hx:'غير معروف',meds:'غير معروف',alg:'لا يوجد',note:'الشرطة في الموقع. السيارة متضررة من الأمام والمقود مكسور.'},
 req:['monitor','probag','oxygen','lifebag','spinal'],
 init:{rhythm:'sinustach',v:{hr:134,sbp:84,dbp:56,rr:34,spo2:85,etco2:30,gcs:14,glu:140,temp:36.6}},
 skin:'شاحب، بارد، شفاه مزرقة',
 find:{
  scene:'الشرطة أمّنت التقاطع. المريض خارج السيارة جالس على الرصيف. مقود مكسور = طاقة عالية على الصدر.',
  impression:'رجل في ضيق تنفس شديد، يتكلم بكلمة أو كلمتين، قلق.',
  xhem:'لا نزيف كارثي.',airway:'سالك.',
  breathing:s=>s.flags.decomp?`RR ${r(s.v.rr)} — تحسن دخول الهواء في الجهة اليمنى بعد التفريغ.`:`RR ${r(s.v.rr)}، دخول الهواء شبه معدوم في الجهة اليمنى، قرع رنيني يميناً، تمدد غير متساوٍ، انتفاخ هوائي تحت الجلد. القصبة الهوائية منحرفة لليسار قليلاً (علامة متأخرة).`,
  circ:s=>`نبض سريع ضعيف ${r(s.v.hr)}/د، JVD واضح، CRT 3 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)}.`,
  expose:'كدمة على شكل المقود على الصدر. لا جروح نافذة.',
  secondary:'ألم عند جسّ الأضلاع اليمنى 4–6. البطن لين.',
  sample:'S: ضيق تنفس وألم صدر. A: لا يوجد. M: لا يوجد. P: سليم. L: الإفطار. E: تصادم أمامي بسرعة متوسطة.'
 },
 fp:{breathing:'Tension pneumothorax تشخيص سريري: ضيق تنفس + غياب أصوات التنفس في جهة + هبوط ضغط + JVD. لا تنتظر الأشعة.',circ:'قد يغيب الـ JVD إذا كان المريض نازفاً.'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor','secondary'],
 twelve:{rh:'sinustach',hr:134},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي تعويضي بسبب الصدمة الانسدادية ونقص الأكسجين.'},
 stab:{ans:'unstable',why:'SBP 84 + SpO₂ 85% + ضيق تنفس شديد.'},
 crit:{ans:'yes',why:'Tension pneumothorax يسبب صدمة انسدادية، والقلب قد يتوقف خلال دقائق إن لم يُفرّغ.'},
 rx:{
  needle:s=>s.flags.decomp?{k:'neutral',m:'تم التفريغ — راقب عودة التوتر؛ قد تحتاج إعادة التفريغ إذا انسدت الإبرة.'}:{k:'good',c:1,m:'Needle decompression يميناً (14G، 8 سم) — صوت خروج هواء وتحسن فوري.',p:'الموقع: المسافة الضلعية 4–5 على خط الإبط الأمامي (مفضل للبالغين) أو المسافة الثانية على خط منتصف الترقوة، فوق الضلع السفلي.',fx:s=>{s.flags.decomp=1;T(s,{sbp:114,dbp:72,hr:108,spo2:94,rr:24,gcs:15});}},
  o2nrb:{k:'good',c:1,m:'O₂ عالي التدفق.',fx:s=>A(s,{spo2:3})},
  bvm:s=>s.flags.decomp?{k:'neutral',m:'المريض يتنفس بفعالية بعد التفريغ.'}:{k:'bad',m:'الضغط الإيجابي قبل التفريغ يزيد التوتر داخل الصدر ويسرّع الانهيار.',fx:s=>A(s,{sbp:-12,spo2:-3})},
  occl:{k:'neutral',m:'لا يوجد جرح صدري مفتوح — الإصابة مغلقة.'},
  iv:{k:'good',c:1,m:'خط وريدي (يُفضّل أثناء النقل).'},
  ns:{k:'info',m:'السوائل لا تعالج الصدمة الانسدادية؛ التفريغ هو العلاج.',fx:s=>A(s,{sbp:3})},
  smr:{k:'info',m:'طبّق معايير SMR الانتقائية: ألم الرقبة والعجز العصبي. الأولوية الآن للتنفس.'}
 },
 ideal:['o2nrb','needle','iv'],
 tl:[{at:90,if:s=>!s.flags.decomp,fx:s=>T(s,{spo2:78,sbp:70,dbp:44,hr:148,gcs:12}),m:'المريض يزداد ازرقاقاً ويصبح مشوشاً!'},{at:210,if:s=>!s.flags.decomp,fx:s=>setRhythm(s,'pea'),m:'فقد النبض — PEA بسبب انسدادي!'}],
 arrestFix:['needle'],
 rosc:{rhythm:'sinustach',v:{hr:118,sbp:96,dbp:60,spo2:92,rr:12,gcs:8,etco2:38}},
 chal:[{l:'انسداد الإبرة / عودة التوتر',fx:s=>{s.flags.decomp=0;T(s,{spo2:84,sbp:82,dbp:52,hr:132});},m:'عاد ضيق التنفس والهبوط — الإبرة انثنت!'},{l:'PEA',fx:s=>setRhythm(s,'pea'),m:'فقد النبض — PEA!'}],
 transport:[{id:'trauma',l:'مركز إصابات مع تبليغ مسبق لوضع أنبوب صدري',ok:1,why:'التفريغ بالإبرة إجراء مؤقت؛ يحتاج أنبوباً صدرياً.'},{id:'near',l:'أقرب مركز رعاية أولية',ok:0,why:'لا يستطيع التعامل مع إصابات الصدر الكبرى.'},{id:'stay',l:'المراقبة في الموقع بعد التحسن',ok:0,why:'التوتر قد يعود في أي لحظة.'}],
 critical:[
  {l:'تقييم التنفس خلال دقيقتين',t:s=>(atA(s,'breathing')??9999)<=120},
  {l:'Needle decompression خلال 3 دقائق',t:s=>(s.at.needle??9999)<=180},
  {l:'تجنّب الضغط الإيجابي قبل التفريغ',t:s=>!s.errIds.has('bvm')},
  {l:'O₂ عالي التدفق',t:s=>has(s,'o2nrb')},
  {l:'إعادة تقييم التنفس بعد التفريغ',t:s=>(s.cnt['a:breathing']||0)>=2},
  {l:'النقل لمركز إصابات',t:s=>s.ans.transport==='trauma'}],
 protocol:['سلامة المشهد','X-A-B-C: فحص الصدر سريعاً (نظر، جس، قرع، تسمّع)','O₂ عالي التدفق','Needle decompression فوراً عند العلامات مع هبوط الضغط','إعادة التقييم المتكرر — الإبرة قد تنسد','IV أثناء النقل، والنقل لمركز إصابات'],
 pearls:['في المريض على تهوية بضغط إيجابي يتطور التوتر أسرع — راقب صعوبة الضغط على الـ BVM.']},

/* 8 Hemorrhage */
{id:'bleed',nt:'إصابة عمل — نزيف من الرجل',cat:'trauma',title:'نزيف شرياني — إصابة آلة صناعية',tags:['<C>ABC','Tourniquet','TXA'],level:'مبتدئ',
 dispatch:{no:'24260',pri:'أحمر',loc:'موقع إنشاءات — المنطقة الصناعية',age:35,sex:'ذكر',cc:'عامل علقت رجله في آلة قطع، نزيف شديد من الفخذ',hx:'سليم',meds:'لا يوجد',alg:'لا يوجد',note:'المشرف: «الدم يطلع بقوة، حطينا قماش ومو قاعد يوقف»'},
 req:['monitor','probag','lifebag'],
 init:{rhythm:'sinustach',v:{hr:138,sbp:86,dbp:58,rr:26,spo2:96,etco2:30,gcs:14,glu:150,temp:36}},
 skin:'شاحب جداً، بارد ورطب',
 find:{
  scene:'تأكد من إيقاف الآلة وفصل الكهرباء قبل الاقتراب. الأرضية زلقة بالدم.',
  impression:'رجل قلق جداً، شاحب، ملقى على الأرض في بركة دم كبيرة.',
  xhem:s=>s.flags.tq?'النزيف متوقف بعد التورنيكيت.':'نزيف شرياني نابض من جرح عميق في منتصف الفخذ الأيمن — نزيف كارثي!',
  airway:'سالك.',breathing:s=>`RR ${r(s.v.rr)}، الرئتان صافيتان.`,
  circ:s=>`نبض كعبري ضعيف وسريع ${r(s.v.hr)}/د، الجلد بارد رطب، CRT 4 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} — قلق ومضطرب.`,
  expose:s=>`كسر مفتوح في عظمة الفخذ مع الجرح. لا إصابات أخرى. الحرارة ${s.v.temp.toFixed(1)}°C.`,
  secondary:'لا إصابات أخرى. الحوض ثابت.',
  sample:'S: ألم شديد ونزيف. A: لا يوجد. M: لا يوجد. P: سليم. L: قبل ساعتين. E: علقت رجله في آلة القطع.'
 },
 fp:{xhem:'<C>ABC / MARCH: النزيف الكارثي قبل المجرى الهوائي، لأن الوفاة من النزيف تحدث خلال دقائق.',circ:'الصدمة النزفية: تسرع + جلد بارد رطب + ضيق فرق الضغط.',expose:'غطِّ المريض فوراً — «الثالوث القاتل»: انخفاض الحرارة + الحموضة + اضطراب التخثر.'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor'],
 twelve:{rh:'sinustach',hr:138},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي تعويضي لفقدان الدم.'},
 stab:{ans:'unstable',why:'نزيف شرياني نشط + تسرع + هبوط ضغط + جلد بارد رطب.'},
 crit:{ans:'yes',why:'نزيف شرياني مع صدمة من الدرجة III — يحتاج سيطرة فورية ونقلاً سريعاً لمركز إصابات.'},
 rx:{
  tq:s=>{if(s.flags.tq)return{k:'neutral',m:'التورنيكيت مثبت والنزيف متوقف.'};return{k:'good',c:1,m:s.flags.rebleed?'شد التورنيكيت أكثر وتورنيكيت ثانٍ فوق الأول — توقف النزيف.':'Tourniquet عالٍ ومشدود 5–7 سم فوق الجرح — توقف النزيف واختفى النبض الطرفي. سجّل الوقت على التورنيكيت.',fx:s=>{s.flags.tq=1;s.flags.rebleed=0;T(s,{hr:124,sbp:92,dbp:62,gcs:15});}};},
  pressure:s=>s.flags.tq?{k:'neutral',m:'النزيف متوقف بالفعل.'}:{k:'neutral',m:'الضغط المباشر خفف النزيف قليلاً لكنه لم يوقفه — النزيف الشرياني في الطرف يحتاج Tourniquet.',fx:s=>A(s,{sbp:2})},
  iv:{k:'good',c:1,m:'خطان وريديان كبيران (أو IO).'},
  ns:s=>s.v.sbp<=88?{k:'good',c:1,m:'NS 250 mL لهدف SBP 80–90 ووجود نبض كعبري (permissive hypotension).',fx:s=>A(s,{sbp:6,dbp:3})}:{k:'neutral',m:'الضغط كافٍ لهدف permissive hypotension — لا تزد السوائل.'},
  nsLarge:{k:'bad',m:'الكريستالويد بكميات كبيرة يخفف عوامل التخثر ويبرد المريض ويرفع الضغط فيعيد النزيف.',fx:s=>{A(s,{sbp:16,hr:-4,temp:-.6});s.flags.dilute=1;}},
  txa:{k:'good',c:1,m:'TXA 1 g IV خلال 10 دقائق — خلال 3 ساعات من الإصابة حسب البروتوكول المحلي.'},
  warm:{k:'good',c:1,m:'بطانية حرارية وتدفئة الكابينة.',fx:s=>T(s,{temp:36.3})},
  splint:s=>s.flags.tq?{k:'good',m:'تجبير الفخذ بعد السيطرة على النزيف يقلل الألم والنزيف الداخلي.'}:{k:'bad',m:'التجبير قبل السيطرة على النزيف يضيع وقتاً حرجاً.'},
  o2nrb:{k:'good',m:'O₂ — قدرة حمل الأكسجين منخفضة مع فقدان الدم.',fx:s=>A(s,{spo2:2})},
  fent:s=>s.v.sbp>=90&&s.flags.tq?{k:'good',m:'تسكين بعد السيطرة على النزيف مع مراقبة الضغط.'}:{k:'bad',m:'الأفيونات مع الهبوط قد تخفض الضغط أكثر.',fx:s=>A(s,{sbp:-8})}
 },
 ideal:['tq','iv','ns','txa','warm'],
 tl:[{at:60,if:s=>!s.flags.tq,fx:s=>T(s,{sbp:72,dbp:48,hr:150,gcs:13}),m:'النزيف مستمر — المريض يزداد شحوباً واضطراباً.'},{at:180,if:s=>!s.flags.tq,fx:s=>T(s,{sbp:58,dbp:34,hr:158,gcs:9,spo2:90}),m:'فقد كمية كبيرة من الدم — أصبح شبه غائب عن الوعي!'},{at:300,if:s=>!s.flags.tq,fx:s=>setRhythm(s,'pea'),m:'توقف قلب نزفي — PEA!'},{at:200,fx:s=>A(s,{temp:-.6}),m:''}],
 arrestFix:['tq'],
 rosc:{rhythm:'sinustach',v:{hr:132,sbp:78,dbp:48,spo2:93,rr:14,gcs:7,etco2:32}},
 chal:[{l:'عودة النزيف (ارتخاء التورنيكيت)',fx:s=>{if(s.flags.tq){s.flags.rebleed=1;s.flags.tq=0;}T(s,{sbp:78,dbp:50,hr:140});},m:'دم يخرج من تحت التورنيكيت أثناء الحمل!'},{l:'انخفاض الحرارة',fx:s=>T(s,{temp:34.8}),m:'المريض يرتجف — الحرارة 34.8°C.'}],
 transport:[{id:'trauma',l:'مركز إصابات مع تفعيل بروتوكول نقل الدم الكثيف (MTP)',ok:1,why:'يحتاج دماً وجراحة أوعية بسرعة.'},{id:'near',l:'أقرب مستشفى بدون جراحة أوعية',ok:0,why:'لا يملك العلاج النهائي.'},{id:'stay',l:'الاستقرار في الموقع قبل النقل',ok:0,why:'العلاج النهائي في غرفة العمليات.'}],
 critical:[
  {l:'Tourniquet خلال أول دقيقة',t:s=>(s.at.tq??9999)<=60},
  {l:'X قبل A (النزيف أولاً)',t:s=>(s.at.tq??9999)<=(atA(s,'airway')??99999)||(atA(s,'xhem')??9999)<=(atA(s,'airway')??99999)},
  {l:'تجنب الكميات الكبيرة من السوائل',t:s=>!has(s,'nsLarge')},
  {l:'منع انخفاض الحرارة',t:s=>has(s,'warm')},
  {l:'TXA حسب البروتوكول',t:s=>has(s,'txa')},
  {l:'النقل لمركز إصابات',t:s=>s.ans.transport==='trauma'}],
 protocol:['سلامة المشهد — أوقف الآلة','X: Tourniquet فوري للنزيف الشرياني في الطرف (عالٍ ومشدود وسجّل الوقت)','A-B: O₂ حسب الحاجة','C: IV/IO وNS boluses صغيرة لهدف SBP 80–90 ووجود نبض كعبري (لا تُطبّق permissive hypotension مع إصابات الرأس)','TXA 1 g حسب البروتوكول خلال 3 ساعات','منع انخفاض الحرارة، والتجبير بعد السيطرة','Load & Go مع تبليغ مسبق لتفعيل نقل الدم'],
 pearls:['لا تُرخِ التورنيكيت في الميدان لـ «فحص» النزيف.']},
/* 9 Acute pulmonary edema */
{id:'ape',nt:'ضيق تنفس شديد ليلاً',cat:'medical',title:'ضيق تنفس حاد — وذمة رئوية حادة',tags:['ADHF','CPAP','Nitroglycerin'],level:'متوسط',
 dispatch:{no:'24302',pri:'أحمر',loc:'حي سكني — شقة، الطابق الثالث، الساعة 3 فجراً',age:69,sex:'ذكر',cc:'صحا من النوم مختنقاً، لا يستطيع الاستلقاء، ويسعل رغوة وردية',hx:'قصور قلب، ارتفاع ضغط، احتشاء سابق',meds:'Furosemide، Bisoprolol، Ramipril',alg:'لا يوجد',note:'ابنه: «يقول ما يقدر يتنفس وهو منسدح»'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'sinustach',v:{hr:124,sbp:196,dbp:112,rr:34,spo2:84,etco2:30,gcs:14,glu:160,temp:36.8}},
 skin:'شاحب، متعرق، شفاه مزرقة',
 find:{
  scene:'المريض جالس على حافة السرير منحنٍ للأمام. لا مخاطر في المكان.',
  impression:'رجل مسن في ضيق تنفس شديد، يتكلم بكلمات متقطعة، قلق جداً.',
  airway:'سالك، رغوة وردية خفيفة في الفم.',
  breathing:s=>`RR ${r(s.v.rr)}، خراخر رطبة منتشرة حتى منتصف الرئتين في الجهتين، استخدام عضلات مساعدة.`,
  circ:s=>`نبض سريع قوي ${r(s.v.hr)}/د، الجلد بارد متعرق، JVD واضح.`,
  disab:s=>`GCS ${r(s.v.gcs)} — قلق.`,
  expose:'وذمة في الكاحلين.',
  sample:'S: ضيق تنفس شديد مفاجئ وكحة. A: لا يوجد. M: Furosemide — توقف عنه منذ 4 أيام. P: قصور قلب، احتشاء سابق. L: عشاء مالح. E: صحا من النوم مختنقاً.',
  opqrst:'لا يوجد ألم صدر.',
  ecg12:'Sinus tachycardia مع علامات تضخم البطين الأيسر وتغيرات ST غير نوعية — لا يوجد STEMI.'
 },
 fp:{breathing:'خراخر ثنائية + ضغط مرتفع + رغوة وردية = وذمة رئوية حادة بسبب ارتفاع الضغط (SCAPE).',sample:'اسأل عن الالتزام بالأدوية والملح والسوائل — أشهر أسباب انتكاس قصور القلب.',impression:'لا تجعل المريض يستلقي — أبقه جالساً والساقان متدليتان.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','ecg12','sample'],
 twelve:{rh:'sinustach',hr:124},
 ecgQ:{need:'ecg12',opts:['Sinus tachycardia','Anterior STEMI','Atrial fibrillation','SVT'],ans:'Sinus tachycardia',why:'موجة P قبل كل QRS بمعدل 124. مهم استبعاد STEMI لأنه سبب شائع للوذمة الرئوية الحادة.'},
 stab:{ans:'unstable',why:'SpO₂ 84% مع ضيق تنفس شديد وتشوش خفيف = فشل تنفسي وشيك.'},
 crit:{ans:'yes',why:'الوذمة الرئوية الحادة قد تتطور خلال دقائق إلى فشل تنفسي وتوقف قلب.'},
 rx:{
  cpap:s=>s.v.sbp>=90?{k:'good',c:1,m:'CPAP 5–10 cmH₂O — يدفع السوائل من الحويصلات ويقلل جهد التنفس.',fx:s=>T(s,{spo2:94,rr:24,hr:108,gcs:15})}:{k:'bad',m:'CPAP ممنوع مع هبوط الضغط.'},
  ntg:s=>s.v.sbp>=100?{k:'good',c:1,m:'Nitroglycerin 0.4 mg SL — يخفض الـ preload والـ afterload بسرعة. كرر كل 5 دقائق مع مراقبة الضغط.',fx:s=>A(s,{sbp:-22,dbp:-12,spo2:3,rr:-3})}:{k:'bad',m:'النترات ممنوعة مع SBP أقل من 100 في هذه الحالة.',fx:s=>A(s,{sbp:-20})},
  o2nrb:{k:'good',c:1,m:'O₂ عالي التدفق إلى أن يجهز الـ CPAP.',fx:s=>A(s,{spo2:3})},
  o2nc:{k:'neutral',m:'القنية الأنفية لا تكفي مع SpO₂ 84%.'},
  iv:{k:'good',c:1,m:'خط وريدي 18G.'},
  ns:{k:'bad',m:'السوائل تزيد الوذمة الرئوية!',fx:s=>A(s,{spo2:-5,rr:4})},
  nsLarge:{k:'bad',m:'السوائل تزيد الوذمة الرئوية!',fx:s=>A(s,{spo2:-8,rr:6})},
  bvm:s=>s.v.gcs<10||s.v.rr<10?{k:'good',m:'تهوية مساعدة بالـ BVM — المريض منهك.',fx:s=>T(s,{spo2:92,rr:14})}:{k:'neutral',m:'المريض يتنفس ويتعاون — الـ CPAP أفضل من الـ BVM.'},
  sga:{k:'bad',m:'المريض واعٍ — جرّب الـ CPAP أولاً.'},
  fent:{k:'neutral',m:'الأفيونات لم تعد موصى بها روتينياً في الوذمة الرئوية.'},
  asa:{k:'neutral',m:'لا يوجد STEMI أو ألم صدري إقفاري.'}
 },
 ideal:['o2nrb','cpap','ntg','iv'],
 tl:[{at:150,if:s=>!has(s,'cpap')&&!has(s,'ntg'),fx:s=>T(s,{spo2:76,gcs:11,rr:40,hr:136}),m:'المريض أصبح مشوشاً وزاد ازرقاقه — فشل تنفسي!'},{at:330,if:s=>!has(s,'cpap')&&!has(s,'ntg'),fx:s=>T(s,{rr:8,spo2:68,gcs:7,hr:60}),m:'التنفس أصبح بطيئاً ومنهكاً!'}],
 chal:[{l:'المريض لا يتحمل قناع الـ CPAP',m:'المريض يسحب القناع: «أحس إني أختنق!» — طمئنه وابدأ بضغط منخفض.'},{l:'هبوط الضغط بعد النترات',fx:s=>A(s,{sbp:-50,dbp:-30}),m:'الضغط انخفض بشدة بعد العلاج.'}],
 transport:[{id:'ed',l:'أقرب طوارئ فيها قسم قلب ورعاية مركزة — مع تبليغ مسبق',ok:1,why:'يحتاج استمرار التهوية غير الجراحية وعلاجاً وريدياً ومراقبة.'},{id:'pci',l:'تفعيل Cath lab',ok:0,why:'التخطيط لا يظهر STEMI.'},{id:'stay',l:'إكمال العلاج في المنزل حتى يتحسن',ok:0,why:'قد ينتكس في أي لحظة.'}],
 critical:[
  {l:'CPAP خلال 5 دقائق',t:s=>(s.at.cpap??9999)<=300},
  {l:'Nitroglycerin مع التحقق من الضغط',t:s=>has(s,'ntg')&&!s.errIds.has('ntg')},
  {l:'عدم إعطاء سوائل',t:s=>!has(s,'ns')&&!has(s,'nsLarge')},
  {l:'O₂ عالي التدفق',t:s=>has(s,'o2nrb')||has(s,'cpap')},
  {l:'12-lead لاستبعاد STEMI',t:s=>atA(s,'ecg12')!=null},
  {l:'النقل للطوارئ مع تبليغ مسبق',t:s=>s.ans.transport==='ed'}],
 protocol:['أبقِ المريض جالساً والساقان متدليتان','O₂ ثم CPAP 5–10 cmH₂O إذا SBP ≥ 90 والمريض واعٍ ومتعاون','Nitroglycerin تحت اللسان كل 5 دقائق إذا SBP ≥ 100 (جرعات أعلى حسب البروتوكول)','12-lead لاستبعاد STEMI','لا سوائل','BVM أو مجرى متقدم عند الإرهاق أو تدهور الوعي','النقل مع تبليغ مسبق'],
 pearls:['الـ CPAP يقلل الحاجة للتنبيب في الوذمة الرئوية الحادة.','الـ Furosemide قد يفيد لاحقاً، لكنه أبطأ من النترات والـ CPAP.']},

/* 10 Stroke */
{id:'stroke',nt:'ضعف مفاجئ وصعوبة في الكلام',cat:'medical',title:'ضعف مفاجئ — سكتة دماغية',tags:['BE-FAST','Last Known Well','Stroke center'],level:'مبتدئ',
 dispatch:{no:'24315',pri:'أحمر',loc:'مجمع تجاري — منطقة المطاعم',age:63,sex:'أنثى',cc:'فجأة صار كلامها غير واضح ووجهها مائل ويدها اليمنى ضعيفة',hx:'ارتفاع ضغط، رجفان أذيني',meds:'Amlodipine — وتوقفت عن Apixaban قبل شهر',alg:'لا يوجد',note:'زوجها: «كانت طبيعية قبل 40 دقيقة لما دخلنا المطعم»'},
 req:['monitor','probag','gluco'],
 init:{rhythm:'af',v:{hr:96,sbp:178,dbp:96,rr:18,spo2:96,etco2:36,gcs:14,glu:132,temp:36.9}},
 skin:'لون طبيعي، دافئ وجاف',
 find:{
  scene:'المكان آمن ومزدحم — اطلب إفساح الطريق للنقالة.',
  impression:'سيدة جالسة واعية، تحاول الكلام بصعوبة، زاوية الفم اليمنى متدلية.',
  airway:'سالك، تبلع لعابها بصعوبة خفيفة — لا تعطِ شيئاً بالفم.',
  breathing:s=>`RR ${r(s.v.rr)}، الرئتان صافيتان.`,
  circ:s=>`نبض غير منتظم تماماً ${r(s.v.hr)}/د، الجلد دافئ.`,
  disab:s=>`GCS ${r(s.v.gcs)}. BE-FAST: B — لا اختلال توازن ظاهر، E — العينان منحرفتان لليسار، F — تدلي الوجه الأيمن، A — ضعف الذراع اليمنى، S — كلام متلعثم وصعوبة إيجاد الكلمات، T — آخر وقت كانت طبيعية قبل 40 دقيقة.`,
  glucose:s=>`سكر الدم ${r(s.v.glu)} mg/dL — ليس سبب الأعراض.`,
  sample:'S: ضعف أيمن وصعوبة كلام مفاجئة. A: لا يوجد. M: Amlodipine، وتوقفت عن Apixaban قبل شهر. P: ضغط، رجفان أذيني. L: قبل ساعة. E: بدأت الأعراض فجأة على الطاولة.',
  secondary:'لا إصابة رأس. لا تشنجات.',
  ecg12:'Atrial fibrillation: إيقاع غير منتظم تماماً بلا موجات P.'
 },
 fp:{disab:'وثّق وقت آخر مرة كانت فيها طبيعية (Last Known Well) بالساعة والدقيقة — يحدد أهلية الإذابة والقسطرة.',glucose:'قِس السكر دائماً لاستبعاد محاكيات السكتة.',sample:'رجفان أذيني مع إيقاف مضاد التخثر = سبب انصمامي محتمل.',circ:'لا تخفّض الضغط في الميدان عند الاشتباه بسكتة.'},
 relevant:['scene','impression','airway','breathing','circ','disab','glucose','monitor','sample'],
 twelve:{rh:'af',hr:96},
 ecgQ:{need:'monitor',opts:['Atrial fibrillation','Sinus rhythm','Atrial flutter','Multifocal atrial tachycardia'],ans:'Atrial fibrillation',why:'غير منتظم تماماً بلا موجات P واضحة مع خط قاعدي مهتز.'},
 stab:{ans:'stable',why:'المجرى والتنفس والدورة الدموية مستقرة — لكن الخطورة عالية جداً (السؤال التالي).'},
 crit:{ans:'yes',why:'السكتة حالة حرجة بالوقت: «الوقت دماغ» — يفقد الدماغ نحو مليوني خلية عصبية كل دقيقة.'},
 rx:{
  iv:{k:'good',c:1,m:'خط وريدي 18G في المرفق (مناسب لأشعة الصبغة) — لا تؤخر النقل لأجله.'},
  o2nc:{k:'neutral',m:'SpO₂ 96% — الأكسجين فقط إذا أقل من 94%.'},o2nrb:{k:'neutral',m:'SpO₂ 96% — الأكسجين فقط إذا أقل من 94%.'},
  asa:{k:'bad',m:'لا أسبرين في الميدان للسكتة — قد تكون نزفية، ويحتاج تأكيداً بالأشعة.'},
  ntg:{k:'bad',m:'لا تخفض الضغط — الدماغ المتضرر يحتاج ضغطاً كافياً للتروية.',fx:s=>A(s,{sbp:-30,dbp:-15})},
  oralglu:{k:'bad',m:'خطر الشفط — لم يُجرَ اختبار البلع.'},
  d10:{k:'bad',m:'السكر طبيعي — الجلوكوز الزائد قد يضر الدماغ المتضرر.'},
  ns:{k:'neutral',m:'لا يوجد هبوط ضغط؛ السوائل غير مطلوبة الآن.'},
  headup:{k:'info',m:'رفع الرأس 30° مقبول إذا كان هناك خطر شفط.'}
 },
 ideal:['iv'],
 tl:[{at:420,fx:s=>A(s,{gcs:-2}),m:'الضعف ازداد والمريضة أصبحت أقل تجاوباً.'}],
 chal:[{l:'قيء',fx:s=>{s.flags.vomit=1;A(s,{spo2:-6});},m:'المريضة تقيأت — خطر الشفط! ضعها على جانبها واشفط.'},{l:'تشنج',fx:s=>T(s,{gcs:8}),m:'تشنج عام قصير ثم توقف.'}],
 transport:[{id:'stroke',l:'مركز سكتة دماغية شامل (إذابة + قسطرة) — تفعيل Stroke code مسبقاً مع وقت LKW',ok:1,why:'داخل نافذة العلاج؛ وانحراف العين مع اضطراب الكلام يشير لانسداد وعاء كبير قد يحتاج قسطرة.'},{id:'near',l:'أقرب مستشفى عام بدون أشعة مقطعية على مدار الساعة',ok:0,why:'يؤخر التشخيص والعلاج.'},{id:'clinic',l:'عيادة الأعصاب صباحاً',ok:0,why:'حالة طارئة.'}],
 critical:[
  {l:'قياس السكر',t:s=>atA(s,'glucose')!=null},
  {l:'BE-FAST وتوثيق Last Known Well خلال 3 دقائق',t:s=>(atA(s,'disab')??9999)<=180},
  {l:'لا أسبرين',t:s=>!has(s,'asa')},
  {l:'لا خفض للضغط',t:s=>!has(s,'ntg')},
  {l:'وقت الموقع 15 دقيقة أو أقل',t:s=>(s.at.tr??9999)<=900},
  {l:'النقل لمركز سكتة مع تبليغ مسبق',t:s=>s.ans.transport==='stroke'}],
 protocol:['ABC، و O₂ فقط إذا SpO₂ أقل من 94%','قياس السكر','BE-FAST + مقياس شدة (مثل LAMS أو RACE حسب البروتوكول)','وثّق Last Known Well بدقة','لا أسبرين، لا خفض للضغط، لا شيء بالفم','IV ومونيتور أثناء النقل — لا تؤخر النقل لأجلها','وقت الموقع ≤ 15 دقيقة، والنقل لمركز سكتة مع تبليغ مسبق، وخذ رقم هاتف الشاهد'],
 pearls:['انحراف العين + اضطراب الكلام أو الإهمال = اشتباه انسداد وعاء كبير (LVO).']},

/* 11 Asthma */
{id:'asthma',nt:'ضيق تنفس في مدرسة',cat:'medical',title:'نوبة ربو شديدة',tags:['Asthma','Ipratropium','MgSO₄','Shark fin'],level:'متوسط',
 dispatch:{no:'24327',pri:'أحمر',loc:'مدرسة ثانوية — غرفة الممرضة',age:17,sex:'ذكر',cc:'نوبة ربو لم تتحسن مع البخاخ، يتكلم بصعوبة',hx:'ربو منذ الطفولة، دخل العناية المركزة مرة',meds:'Salbutamol inhaler، Budesonide/Formoterol',alg:'Ibuprofen',note:'الممرضة: «استخدم البخاخ 10 مرات وما تحسن»'},
 req:['monitor','oxygen','probag','lifebag'],
 init:{rhythm:'sinustach',v:{hr:138,sbp:128,dbp:78,rr:36,spo2:87,etco2:48,gcs:15,glu:120,temp:37}},
 skin:'شاحب، متعرق',
 find:{
  scene:'غرفة الممرضة آمنة. أبعد الطلاب المتجمعين.',
  impression:'شاب جالس منحنٍ للأمام (tripod)، يتكلم بكلمة واحدة، متعرق وقلق.',
  airway:'سالك.',
  breathing:s=>s.flags.better?`RR ${r(s.v.rr)}، تحسن دخول الهواء وخف الأزيز.`:`RR ${r(s.v.rr)}، أزيز منتشر في الزفير، دخول هواء ضعيف في القاعدتين، زفير طويل، سحب بين الأضلاع.`,
  circ:s=>`نبض سريع ${r(s.v.hr)}/د، CRT أقل من 2 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} — واعٍ لكنه منهك.`,
  sample:'S: ضيق تنفس شديد وكحة. A: Ibuprofen يسبب له ضيقاً. M: بخاخ Salbutamol 10 مرات بدون فائدة. P: ربو شديد ودخول عناية سابق. L: الإفطار. E: بعد حصة الرياضة في الغبار.',
  ecg12:'Sinus tachycardia.'
 },
 fp:{breathing:'الصدر «الصامت» علامة خطيرة جداً — قلة الأزيز قد تعني قلة الهواء وليس التحسن.',sample:'دخول العناية سابقاً وكثرة استخدام البخاخ = خطر ربو قاتل.',impression:'الكلام بكلمة واحدة + وضعية tripod = نوبة شديدة جداً.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','capno','sample'],
 twelve:{rh:'sinustach',hr:138},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي بسبب الجهد التنفسي ونقص الأكسجين والـ Salbutamol.'},
 stab:{ans:'unstable',why:'SpO₂ 87% ويتكلم بكلمة واحدة و EtCO₂ مرتفع 48 = نوبة مهددة للحياة.'},
 crit:{ans:'yes',why:'EtCO₂ الطبيعي أو المرتفع أثناء نوبة ربو يعني إرهاقاً وفشلاً تنفسياً وشيكاً.'},
 rx:{
  neb:s=>{const n=s.cnt.neb;if(n===1)return{k:'good',c:1,m:'Salbutamol 5 mg بخار مع O₂ — تحسن بسيط.',fx:s=>{A(s,{spo2:3,rr:-3});asthmaImprove(s);}};if(n<=3)return{k:'good',m:'جرعة Salbutamol متتالية — تحسن إضافي.',fx:s=>{A(s,{spo2:2,hr:4});asthmaImprove(s);}};return{k:'neutral',m:'جرعات كثيرة — راقب التسرع ونقص البوتاسيوم.'};},
  ipra:{k:'good',c:1,m:'Ipratropium 0.5 mg مع الـ Salbutamol — يعزز توسع الشعب الهوائية.',fx:s=>{A(s,{spo2:2});asthmaImprove(s);}},
  mag:{k:'good',m:'Magnesium sulfate 2 g IV خلال 20 دقيقة — للنوبة الشديدة غير المستجيبة.',fx:s=>{A(s,{spo2:2,rr:-2});asthmaImprove(s);}},
  steroid:{k:'good',c:1,m:'Hydrocortisone 200 mg IV (أو Methylprednisolone حسب البروتوكول) — مفعوله بعد ساعات لكن يجب إعطاؤه مبكراً.'},
  epiIM:s=>s.v.spo2<85||s.v.gcs<14?{k:'good',m:'Epinephrine IM — مقبول في الربو المهدد للحياة غير المستجيب للبخار.',fx:s=>A(s,{spo2:4,hr:10})}:{k:'neutral',m:'يُحفظ للحالات المهددة للحياة غير المستجيبة للبخار.'},
  o2nrb:{k:'good',c:1,m:'O₂ — الهدف SpO₂ 94–98%.',fx:s=>A(s,{spo2:3})},
  o2nc:{k:'neutral',m:'القنية الأنفية غير كافية — استخدم البخار بالأكسجين.'},
  iv:{k:'good',m:'خط وريدي.'},
  bvm:s=>s.v.gcs<12?{k:'good',m:'تهوية مساعدة بطيئة مع زفير طويل — تجنب فرط التهوية (air trapping).',fx:s=>T(s,{spo2:90,etco2:50})}:{k:'neutral',m:'المريض واعٍ ويتنفس — الـ BVM قد يزيد الهلع؛ ركّز على البخار.'},
  antihist:{k:'neutral',m:'مضادات الهستامين لا تعالج نوبة الربو.'}
 },
 ideal:['o2nrb','neb','ipra','steroid'],
 tl:[{at:180,if:s=>!has(s,'neb'),fx:s=>T(s,{spo2:80,rr:40,etco2:58,hr:148}),m:'الأزيز أصبح أخف والصدر شبه صامت — هذه علامة خطيرة!'},{at:360,if:s=>!has(s,'neb'),fx:s=>T(s,{gcs:10,rr:10,spo2:72,etco2:68,hr:110}),m:'المريض منهك ويغفو — توقف تنفس وشيك!'}],
 chal:[{l:'صدر صامت وإرهاق',fx:s=>{s.flags.better=0;T(s,{spo2:80,gcs:12,etco2:60,rr:12});},m:'المريض يغفو والتنفس ضعيف جداً!'},{l:'جهاز البخار تعطل',m:'جهاز البخار لا يعمل — استخدم البخاخ مع الحاجز (spacer).'}],
 transport:[{id:'ed',l:'أقرب طوارئ مع تبليغ مسبق (احتمال تنبيب)',ok:1,why:'نوبة مهددة للحياة تحتاج مراقبة وعلاجاً مستمراً.'},{id:'clinic',l:'المستوصف القريب',ok:0,why:'لا يملك قدرات التعامل مع فشل تنفسي.'},{id:'home',l:'إرجاعه للصف بعد التحسن',ok:0,why:'خطر الانتكاس عالٍ بعد زوال مفعول البخار.'}],
 critical:[
  {l:'O₂ خلال دقيقتين',t:s=>(s.at.o2nrb??9999)<=120},
  {l:'Salbutamol خلال 3 دقائق',t:s=>(s.at.neb??9999)<=180},
  {l:'Ipratropium',t:s=>has(s,'ipra')},
  {l:'Corticosteroid مبكراً',t:s=>has(s,'steroid')},
  {l:'Capnography لتقييم الإرهاق',t:s=>atA(s,'capno')!=null},
  {l:'النقل للطوارئ',t:s=>s.ans.transport==='ed'}],
 protocol:['وضعية الجلوس، و O₂ لهدف SpO₂ 94–98%','Salbutamol 5 mg + Ipratropium 0.5 mg بخار، ويُكرر الـ Salbutamol متتالياً','Corticosteroid مبكراً (Hydrocortisone أو Methylprednisolone حسب البروتوكول)','MgSO₄ 2 g IV للنوبة الشديدة غير المستجيبة','Epinephrine IM للنوبة المهددة للحياة غير المستجيبة','Capnography: EtCO₂ المرتفع أو شكل «زعنفة القرش» = انسداد وإرهاق','تهوية بطيئة مع زفير طويل إذا احتاج BVM'],
 pearls:['شكل موجة الـ Capnography في الربو يشبه زعنفة القرش (shark fin).','لا تعطِ مضادات الالتهاب غير الستيرويدية لمرضى الربو الحساسين لها.']},

/* 12 Opioid overdose */
{id:'opioid',nt:'شخص غير مستجيب في الحمّام',cat:'medical',title:'غيبوبة — جرعة زائدة من الأفيونات',tags:['Naloxone','BVM','Pinpoint pupils'],level:'مبتدئ',
 dispatch:{no:'24339',pri:'أحمر',loc:'شقة سكنية — الحمّام',age:28,sex:'ذكر',cc:'صديقه وجده غائباً عن الوعي في الحمام ولا يتنفس جيداً',hx:'غير معروف — صديقه يقول عنده آلام ظهر مزمنة',meds:'غير معروف',alg:'غير معروف',note:'الصديق: «لقيت حبوب وإبرة جنبه»'},
 req:['monitor','lifebag','oxygen','probag'],
 init:{rhythm:'sinusbrady',v:{hr:54,sbp:104,dbp:62,rr:5,spo2:78,etco2:62,gcs:6,glu:98,temp:36.2}},
 skin:'مزرق وبارد',
 find:{
  scene:'انتبه للأدوات الحادة! إبرة مستعملة على الأرض — ارتدِ القفازات وتخلص منها في حاوية الأدوات الحادة.',
  impression:'شاب ممدد على الأرض، يستجيب للألم فقط (P على AVPU)، يشخر.',
  airway:'شخير — انسداد جزئي باللسان. يحتاج فتح المجرى.',
  breathing:s=>s.v.rr<8?`RR ${r(s.v.rr)} — تنفس بطيء جداً وسطحي.`:`RR ${r(s.v.rr)} — التنفس تحسن.`,
  circ:s=>`نبض بطيء ${r(s.v.hr)}/د، CRT 3 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)}. الحدقتان دبوسيتان (pinpoint) ومتساويتان.`,
  expose:'آثار حقن في الذراعين. لا إصابات.',
  sample:'الصديق: يستخدم حبوباً مسكنة «من السوق» ومؤخراً حقناً. لا يعرف الكمية.',
  ecg12:'Sinus bradycardia.'
 },
 fp:{disab:'الثلاثي: نقص الوعي + حدقات دبوسية + بطء التنفس = تسمم بالأفيونات.',airway:'التهوية أولاً: BVM مع O₂ قبل الـ Naloxone — نقص الأكسجين هو ما يقتل.',scene:'خطر الوخز بالإبر — سلامتك أولاً.'},
 relevant:['scene','impression','airway','breathing','circ','disab','glucose','monitor','capno','expose'],
 twelve:{rh:'sinus',hr:54},
 ecgQ:{need:'monitor',opts:['Sinus bradycardia','3rd-degree AV block','Junctional rhythm','Sinus rhythm'],ans:'Sinus bradycardia',why:'بطء جيبي ثانوي لنقص الأكسجين وتأثير الأفيونات.'},
 stab:{ans:'unstable',why:'RR 5 و SpO₂ 78% = فشل تنفسي.'},
 crit:{ans:'yes',why:'توقف التنفس يتبعه توقف القلب خلال دقائق.'},
 rx:{
  jaw:{k:'good',c:1,m:'فتح المجرى — توقف الشخير.',fx:s=>A(s,{spo2:2})},
  htcl:{k:'good',c:1,m:'فتح المجرى — توقف الشخير.',fx:s=>A(s,{spo2:2})},
  opa:{k:'good',m:'OPA — يحافظ على المجرى مفتوحاً.'},
  bvm:{k:'good',c:1,m:'BVM مع O₂: نفَس كل 6 ثوانٍ — التشبع يرتفع.',fx:s=>T(s,{spo2:95,etco2:42,rr:10,hr:78})},
  naloxone:s=>{if(s.cnt.naloxone>2)return{k:'neutral',m:'جرعات كافية — الهدف تنفس كافٍ وليس إفاقة كاملة.'};const fx=s=>{T(s,{rr:14,gcs:13,spo2:96,etco2:40,hr:88});};return has(s,'bvm')?{k:'good',c:1,m:'Naloxone 0.4 mg IV/IM (أو 2–4 mg عبر الأنف) — المريض بدأ يتنفس تلقائياً.',fx}:{k:'good',c:1,m:'Naloxone — تحسن التنفس، لكن كان يجب التهوية أولاً.',p:'التهوية قبل النالوكسون: الإفاقة المفاجئة مع نقص الأكسجين قد تسبب قيئاً أو وذمة رئوية أو هياجاً.',fx};},
  o2nrb:s=>s.v.rr<8?{k:'neutral',m:'قناع NRB لا يفيد مع تنفس 5/د — يحتاج تهوية مساعدة BVM.'}:{k:'good',m:'O₂ عالي التدفق.',fx:s=>A(s,{spo2:3})},
  sga:s=>has(s,'naloxone')?{k:'neutral',m:'لا حاجة بعد عودة التنفس.'}:{k:'neutral',m:'جرّب BVM ثم Naloxone أولاً.'},
  iv:{k:'good',m:'خط وريدي.'},
  d10:{k:'neutral',m:'السكر طبيعي.'}
 },
 ideal:['bvm','naloxone','opa'],
 tl:[{at:120,if:s=>!has(s,'bvm')&&!has(s,'naloxone'),fx:s=>T(s,{spo2:65,hr:40,rr:3}),m:'التشبع ينهار والنبض يتباطأ!'},{at:240,if:s=>!has(s,'bvm')&&!has(s,'naloxone'),fx:s=>setRhythm(s,'pea'),m:'توقف قلب — PEA!'}],
 chal:[{l:'هياج بعد النالوكسون',m:'المريض صحا فجأة وهو هائج ويحاول سحب الكانيولا — تواصل بهدوء وحافظ على سلامة الفريق.'},{l:'عودة تثبيط التنفس',fx:s=>T(s,{rr:6,spo2:82,gcs:8,etco2:58}),m:'زال مفعول النالوكسون — التنفس تباطأ مرة أخرى!'},{l:'قيء',fx:s=>{s.flags.vomit=1;A(s,{spo2:-8});},m:'المريض تقيأ — صوت قرقرة في المجرى!'}],
 rosc:{rhythm:'sinustach',v:{hr:110,sbp:90,dbp:56,spo2:92,rr:12,gcs:5,etco2:40}},
 transport:[{id:'ed',l:'قسم الطوارئ للمراقبة',ok:1,why:'مفعول النالوكسون (30–90 دقيقة) أقصر من بعض الأفيونات — خطر عودة التثبيط.'},{id:'home',l:'تركه مع صديقه بعد الإفاقة',ok:0,why:'خطر عودة التثبيط التنفسي بعد زوال مفعول النالوكسون.'},{id:'police',l:'تسليمه للشرطة فقط',ok:0,why:'هو مريض أولاً ويحتاج رعاية طبية.'}],
 critical:[
  {l:'تقييم سلامة المشهد (الإبر) أولاً',t:s=>(atA(s,'scene')??9999)<=30},
  {l:'فتح المجرى الهوائي',t:s=>has(s,'jaw')||has(s,'htcl')||has(s,'opa')},
  {l:'التهوية بالـ BVM قبل الـ Naloxone',t:s=>has(s,'bvm')&&s.at.bvm<=(s.at.naloxone??99999)},
  {l:'Naloxone',t:s=>has(s,'naloxone')},
  {l:'قياس السكر',t:s=>atA(s,'glucose')!=null},
  {l:'النقل للطوارئ',t:s=>s.ans.transport==='ed'}],
 protocol:['سلامة المشهد — الإبر','افتح المجرى وابدأ تهوية BVM مع O₂ (نفَس كل 6 ث)','Naloxone 0.4 mg IV/IM ويُكرر، أو 2–4 mg عبر الأنف — الهدف تنفس كافٍ وليس إفاقة كاملة','قِس السكر','مونيتور + Capnography','النقل ومراقبة عودة التثبيط'],
 pearls:['الفنتانيل المصنّع قد يحتاج جرعات Naloxone أعلى ومتكررة.']},

/* 13 Unstable VT */
{id:'vt',nt:'خفقان وألم صدر ودوخة',cat:'medical',title:'خفقان وألم صدر — تسرع بطيني مع نبض',tags:['VT','Sync cardioversion','Amiodarone'],level:'متقدم',
 dispatch:{no:'24348',pri:'أحمر',loc:'مبنى حكومي — الطابق الأول',age:61,sex:'ذكر',cc:'خفقان شديد وألم صدر ودوخة منذ 20 دقيقة',hx:'احتشاء سابق قبل 3 سنوات، ضعف في عضلة القلب',meds:'Aspirin، Bisoprolol، Atorvastatin',alg:'لا يوجد',note:'زميله: «لونه أصفر ويتعرق»'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'vtp',v:{hr:182,sbp:78,dbp:50,rr:26,spo2:92,etco2:32,gcs:14,glu:140,temp:36.7}},
 skin:'شاحب، بارد ومتعرق',
 find:{
  scene:'المكتب آمن.',
  impression:'رجل جالس على الكرسي، شاحب ومتعرق، يمسك صدره، يجيب ببطء.',
  airway:'سالك.',
  breathing:s=>`RR ${r(s.v.rr)}، خراخر خفيفة في القاعدتين.`,
  circ:s=>`نبض سريع جداً ضعيف منتظم ${r(s.v.hr)}/د، الجلد بارد رطب، CRT 4 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} — مشوش قليلاً.`,
  sample:'S: خفقان وألم صدر ودوخة. A: لا يوجد. M: Aspirin، Bisoprolol، Atorvastatin. P: احتشاء سابق وضعف في عضلة القلب. L: الغداء. E: بدأ فجأة أثناء الجلوس.',
  ecg12:'تسرع منتظم بـ QRS عريض ومعدل 182، مع انفصال أذيني بطيني — VT أحادي الشكل.'
 },
 fp:{circ:'تسرع + هبوط ضغط + ألم صدر + تشوش = تسرع غير مستقر ← Synchronized cardioversion فوراً.',ecg12:'أي تسرع منتظم بـ QRS عريض في مريض لديه احتشاء سابق = VT حتى يثبت العكس.'},
 relevant:['scene','impression','airway','breathing','circ','disab','monitor','ecg12','sample'],
 twelve:{rh:'vtp',hr:182},
 ecgQ:{need:'ecg12',opts:['SVT with aberrancy','Ventricular tachycardia','Sinus tachycardia','Atrial flutter 2:1','Ventricular fibrillation'],ans:'Ventricular tachycardia',why:'QRS عريض ومنتظم بمعدل 182 مع انفصال أذيني بطيني وتاريخ احتشاء سابق ← VT. المريض لديه نبض، لذلك ليس VF ولا pVT.'},
 stab:{ans:'unstable',why:'SBP 78 + ألم صدر + تشوش = غير مستقر.'},
 crit:{ans:'yes',why:'الـ VT غير المستقر قد يتحول إلى VF في أي لحظة.'},
 rx:{
  sync:s=>s.rhythm==='vtp'?{k:'good',c:1,m:'Synchronized cardioversion (حسب الجهاز، مثلاً 100 J) بعد تهدئة سريعة إن أمكن — عاد الإيقاع جيبياً.',fx:s=>{setRhythm(s,'sinus');T(s,{hr:92,sbp:112,dbp:70,gcs:15,spo2:96});}}:{k:'neutral',m:'الإيقاع ليس VT الآن.'},
  defib:s=>s.rhythm==='vtp'?{k:'bad',m:'صدمة غير متزامنة لمريض لديه نبض قد تسبب VF — استخدم SYNC.',fx:s=>setRhythm(s,'vf')}:{k:'bad',m:'صدمة غير متزامنة لمريض لديه نبض!',fx:s=>setRhythm(s,'vf')},
  amio:s=>s.rhythm==='vtp'?{k:'neutral',m:'Amiodarone للـ VT المستقر — هذا المريض غير مستقر ويحتاج cardioversion أولاً.'}:{k:'good',c:1,m:'Amiodarone 150 mg IV خلال 10 دقائق — يقلل عودة الـ VT بعد التحويل.'},
  adeno6:s=>s.rhythm==='vtp'?{k:'bad',m:'Adenosine لا يعالج الـ VT ويؤخر الصدمة.'}:{k:'neutral',m:'لا يوجد استطباب.'},
  adeno12:{k:'bad',m:'Adenosine لا يعالج الـ VT ويؤخر الصدمة.'},
  fent:s=>s.rhythm==='vtp'?{k:'info',m:'تسكين أو تهدئة قبل الصدمة حسب البروتوكول — لا تؤخر الصدمة إذا تدهور المريض.'}:{k:'neutral',m:'لا يوجد استطباب.'},
  asa:{k:'neutral',m:'يتناول الأسبرين يومياً — الأولوية لعلاج الإيقاع.'},
  iv:{k:'good',c:1,m:'خط وريدي 18G.'},
  ns:{k:'info',m:'المشكلة في الإيقاع وليس في الحجم.'}
 },
 ideal:['iv','sync','amio'],
 tl:[{at:240,if:s=>s.rhythm==='vtp',fx:s=>T(s,{sbp:66,dbp:40,gcs:11}),m:'المريض أصبح أقل وعياً والضغط ينخفض!'},{at:420,if:s=>s.rhythm==='vtp',fx:s=>setRhythm(s,'pvt'),m:'فقد النبض — Pulseless VT!'}],
 chal:[{l:'عودة الـ VT بعد التحويل',fx:s=>{setRhythm(s,'vtp');T(s,{hr:178,sbp:82,dbp:52});},m:'عاد التسرع العريض!'},{l:'VF',fx:s=>setRhythm(s,'vf'),m:'المريض فقد الوعي فجأة — لا نبض!'}],
 rosc:{rhythm:'sinustach',v:{hr:108,sbp:92,dbp:58,spo2:94,rr:12,gcs:7,etco2:38}},
 transport:[{id:'pci',l:'مركز قلب فيه قسطرة ورعاية قلبية — تبليغ مسبق',ok:1,why:'يحتاج تقييم الإقفار ومراقبة، واحتمال جهاز ICD.'},{id:'near',l:'أقرب مستشفى عام',ok:0,why:'قد يحتاج نقلاً ثانوياً لمركز قلب.'},{id:'stay',l:'المراقبة في الموقع بعد التحويل',ok:0,why:'خطر عودة الـ VT أو VF.'}],
 critical:[
  {l:'التعرف على الـ VT',t:s=>s.ans.ecg==='Ventricular tachycardia'},
  {l:'تصنيفه غير مستقر',t:s=>s.ans.stab==='unstable'},
  {l:'Synchronized cardioversion خلال 5 دقائق',t:s=>(s.at.sync??9999)<=300&&s.flags.syncOk},
  {l:'لا صدمة غير متزامنة ولا Adenosine',t:s=>!s.errIds.has('defib')&&!has(s,'adeno6')&&!has(s,'adeno12')},
  {l:'Amiodarone بعد التحويل',t:s=>has(s,'amio')&&!s.errIds.has('amio')},
  {l:'النقل لمركز قلب',t:s=>s.ans.transport==='pci'}],
 protocol:['ABC، O₂ إذا SpO₂ أقل من 94%، IV، مونيتور ووسادات','12-lead إذا سمح الوقت','غير مستقر: Synchronized cardioversion فوراً (تهدئة إن أمكن)','مستقر: Amiodarone 150 mg IV خلال 10 دقائق مع تجهيز الصدمة','بعد التحويل: Amiodarone حسب البروتوكول','بدون نبض: خوارزمية التوقف القلبي (Defibrillation)'],
 pearls:['تأكد أن علامة SYNC تظهر على كل QRS قبل الصدمة، وبعض الأجهزة تلغي SYNC بعد كل صدمة.']},

/* 14 Heat stroke */
{id:'heat',nt:'انهيار عامل في الحر',cat:'medical',title:'انهيار في الحر — ضربة شمس',tags:['Heat stroke','Active cooling'],level:'متوسط',
 dispatch:{no:'24361',pri:'أحمر',loc:'موقع عمل خارجي — وقت الظهر، 47°C',age:34,sex:'ذكر',cc:'عامل سقط أثناء العمل، يتكلم كلاماً غير مفهوم وجسمه حار جداً',hx:'سليم',meds:'لا يوجد',alg:'لا يوجد',note:'المشرف: «كان يشتغل من الصبح تحت الشمس»'},
 req:['monitor','probag','gluco'],
 init:{rhythm:'sinustach',v:{hr:148,sbp:92,dbp:54,rr:30,spo2:95,etco2:28,gcs:10,glu:88,temp:41.6}},
 skin:'حار جداً، أحمر',
 find:{
  scene:'حرارة شديدة — انقل المريض فوراً إلى الظل أو الإسعاف المكيّف. انتبه لسلامة الفريق من الإجهاد الحراري.',
  impression:'رجل ممدد على الأرض، مضطرب، يتكلم كلاماً غير مفهوم.',
  airway:'سالك.',
  breathing:s=>`RR ${r(s.v.rr)}، الرئتان صافيتان.`,
  circ:s=>`نبض سريع ${r(s.v.hr)}/د، الجلد حار جداً.`,
  disab:s=>`GCS ${r(s.v.gcs)} — مضطرب ومشوش.`,
  expose:s=>`الحرارة ${s.v.temp.toFixed(1)}°C (مستقيمية). لا إصابات.`,
  sample:'S: انهيار وتشوش. A: لا يوجد. M: لا يوجد. P: سليم. L: لم يأكل منذ الصباح وشرب قليلاً. E: عمل تحت الشمس 6 ساعات.',
  ecg12:'Sinus tachycardia.'
 },
 fp:{expose:'ضربة الشمس: حرارة أعلى من 40°C + اضطراب في الجهاز العصبي = طارئة مهددة للحياة. «برّد أولاً، ثم انقل».',circ:'غياب التعرق ليس شرطاً — كثير من مرضى ضربة الشمس بعد الجهد يتعرقون.',disab:'التشوش مع الحرارة يفرّق ضربة الشمس عن الإجهاد الحراري.'},
 relevant:['scene','impression','airway','breathing','circ','disab','expose','glucose','monitor'],
 twelve:{rh:'sinustach',hr:148},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي بسبب الحرارة والجفاف.'},
 stab:{ans:'unstable',why:'GCS 10 وحرارة 41.6 وتسرع وهبوط نسبي في الضغط.'},
 crit:{ans:'yes',why:'كل دقيقة بحرارة فوق 40°C تزيد تلف الأعضاء — الهدف خفض الحرارة لأقل من 39°C خلال 30 دقيقة.'},
 rx:{
  cool:s=>s.v.temp<38.5?{k:'bad',m:'الحرارة أصبحت طبيعية — أوقف التبريد لتجنب انخفاض الحرارة.',fx:s=>A(s,{temp:-1})}:{k:'good',c:1,m:'تبريد فعّال: غمر بالماء البارد أو تبليل مستمر مع تهوية وكمادات ثلج على الرقبة والإبطين والفخذين. أوقف عند 38.5–39°C.',fx:s=>T(s,{temp:38.8,gcs:14,hr:112,sbp:108,dbp:64})},
  ns:{k:'good',c:1,m:'NS bolus (بارد إن توفر) — لعلاج الجفاف والهبوط.',fx:s=>A(s,{sbp:8,hr:-6})},
  nsLarge:{k:'neutral',m:'مقبول بحذر — راقب الرئتين.',fx:s=>A(s,{sbp:12})},
  warm:{k:'bad',m:'تدفئة مريض ضربة شمس!',fx:s=>A(s,{temp:.6})},
  iv:{k:'good',c:1,m:'خط وريدي.'},
  d10:{k:'neutral',m:'السكر طبيعي.'}
 },
 ideal:['cool','iv','ns'],
 tl:[{at:180,if:s=>!has(s,'cool'),fx:s=>T(s,{temp:42.3,gcs:7,hr:160,sbp:80}),m:'الحرارة ترتفع والمريض تشنج تشنجاً قصيراً — تدهور!'},{at:420,if:s=>!has(s,'cool'),fx:s=>setRhythm(s,'vf'),m:'توقف قلب — VF!'}],
 chal:[{l:'تشنج',fx:s=>T(s,{gcs:7}),m:'المريض يتشنج!'},{l:'تبريد زائد',fx:s=>T(s,{temp:37.4}),m:'الحرارة نزلت إلى 37.4°C والمريض يرتجف — أوقف التبريد!'}],
 rosc:{rhythm:'sinustach',v:{hr:130,sbp:86,dbp:50,spo2:93,rr:14,gcs:5,etco2:34}},
 transport:[{id:'ed',l:'أقرب طوارئ مع استمرار التبريد أثناء النقل وتبليغ مسبق',ok:1,why:'يحتاج مراقبة لفشل الكلى والكبد واضطراب التخثر وتحلل العضلات.'},{id:'clinic',l:'عيادة الموقع لإعطائه سوائل',ok:0,why:'حالة مهددة للحياة.'},{id:'stay',l:'إبقاؤه في الظل حتى يتحسن ثم يعود للعمل',ok:0,why:'ضربة الشمس تحتاج تبريداً فعّالاً ونقلاً.'}],
 critical:[
  {l:'قياس الحرارة خلال 3 دقائق',t:s=>(atA(s,'expose')??9999)<=180},
  {l:'بدء التبريد الفعال خلال 5 دقائق',t:s=>(s.at.cool??9999)<=300},
  {l:'عدم تدفئة المريض',t:s=>!has(s,'warm')},
  {l:'قياس السكر',t:s=>atA(s,'glucose')!=null},
  {l:'IV وسوائل',t:s=>has(s,'ns')||has(s,'nsLarge')},
  {l:'النقل للطوارئ',t:s=>s.ans.transport==='ed'}],
 protocol:['انقل المريض من الحر وأزل الملابس الزائدة','قِس الحرارة (المستقيمية الأدق)','تبريد فعّال فوري: الغمر بالماء البارد هو الأفضل، أو التبليل والتهوية والثلج','أوقف التبريد عند 38.5–39°C','IV وسوائل للجفاف والهبوط','قِس السكر وراقب التشنجات','لا Paracetamol — لا يفيد في ضربة الشمس','النقل مع استمرار التبريد'],
 pearls:['خافضات الحرارة لا تعمل في ضربة الشمس، لأن ارتفاع الحرارة ليس بسبب مركز التحكم الحراري.']},

/* 15 TBI */
{id:'tbi',nt:'سقوط من علو',cat:'trauma',title:'سقوط من علو — إصابة رأس شديدة',tags:['TBI','Cushing triad','EtCO₂'],level:'متقدم',
 dispatch:{no:'24372',pri:'أحمر',loc:'موقع بناء — سقوط من سقالة بارتفاع 6 أمتار',age:41,sex:'ذكر',cc:'سقط من السقالة على رأسه وهو فاقد الوعي',hx:'غير معروف',meds:'غير معروف',alg:'غير معروف',note:'زميله: «كان يرد في البداية، بعدين صار ما يرد»'},
 req:['monitor','probag','oxygen','lifebag','spinal'],
 init:{rhythm:'sinusbrady',v:{hr:52,sbp:182,dbp:98,rr:8,spo2:88,etco2:50,gcs:7,glu:146,temp:36.6}},
 skin:'شاحب، دافئ',
 find:{
  scene:'أوقف العمل في الموقع وانتبه للأدوات الساقطة. السقوط من أكثر من 3 أمتار = إصابة عالية الخطورة.',
  impression:'رجل ممدد على ظهره، لا يفتح عينيه، يشخر.',
  xhem:'جرح في فروة الرأس ينزف ببطء — لا نزيف كارثي.',
  airway:'شخير ودم في الفم — يحتاج Jaw thrust وشفط مع تثبيت الرقبة.',
  breathing:s=>`RR ${r(s.v.rr)} غير منتظم، أصوات التنفس متساوية.`,
  circ:s=>`نبض بطيء قوي ${r(s.v.hr)}/د، الجلد دافئ.`,
  disab:s=>`GCS ${r(s.v.gcs)}. الحدقة اليمنى متوسعة (5 mm) وبطيئة الاستجابة، واليسرى 3 mm متفاعلة. ثني غير طبيعي للأطراف عند الألم.`,
  expose:'كدمة خلف الأذن (Battle sign). لا إصابات أخرى واضحة.',
  secondary:'تورم في فروة الرأس الجدارية اليمنى، كدمات حول العينين (raccoon eyes)، وسائل شفاف ممزوج بالدم من الأنف.',
  sample:'زميله: لا أمراض معروفة. كان يرد في البداية ثم فقد الوعي بعد 5 دقائق.'
 },
 fp:{disab:'ثلاثي Cushing: ارتفاع الضغط + بطء القلب + تنفس غير منتظم = ارتفاع الضغط داخل الجمجمة وخطر الانفتاق (herniation).',airway:'في إصابات الرأس تجنب نقص الأكسجين (SpO₂ أقل من 90%) وهبوط الضغط (SBP أقل من 110) — كل واحد منهما يضاعف الوفيات.',sample:'الفترة الصافية (lucid interval) تشير إلى نزيف فوق الجافية (epidural).',secondary:'كسر قاعدة الجمجمة: لا تُدخل أي أنبوب عبر الأنف (NPA ممنوع).'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor','capno','secondary','glucose'],
 twelve:{rh:'sinus',hr:52},
 ecgQ:{need:'monitor',opts:['Sinus bradycardia','3rd-degree AV block','Junctional rhythm','Sinus rhythm'],ans:'Sinus bradycardia',why:'بطء جيبي مع ارتفاع الضغط — جزء من منعكس Cushing.'},
 stab:{ans:'unstable',why:'GCS 7 + SpO₂ 88% + تنفس غير منتظم.'},
 crit:{ans:'yes',why:'إصابة دماغية شديدة مع علامات انفتاق — تحتاج جراحة أعصاب عاجلة.'},
 rx:{
  mils:{k:'good',c:1,m:'تثبيت يدوي للرقبة على خط مستقيم.'},
  jaw:{k:'good',c:1,m:'Jaw thrust مع تثبيت الرقبة — تحسن الشخير.',fx:s=>A(s,{spo2:2})},
  suction:{k:'good',c:1,m:'شفط الدم من الفم — المجرى أنظف.',fx:s=>A(s,{spo2:2})},
  opa:{k:'good',m:'OPA — ولا تستخدم NPA مع اشتباه كسر قاعدة الجمجمة.'},
  bvm:{k:'good',c:1,m:'BVM مع O₂ — 10 أنفاس/د، الهدف EtCO₂ 35–40 و SpO₂ ≥ 94%.',fx:s=>T(s,{spo2:96,etco2:38,rr:10})},
  sga:{k:'good',m:'i-gel مع Capnography — حماية من الشفط مع GCS 7.',fx:s=>{s.capno=true;T(s,{spo2:96,etco2:38,rr:10});}},
  smr:{k:'good',c:1,m:'SMR كامل مع head blocks.'},
  headup:{k:'good',m:'رفع رأس النقالة 30° مع الحفاظ على استقامة العمود الفقري — يحسن التصريف الوريدي للدماغ.'},
  ns:s=>s.v.sbp<110?{k:'good',c:1,m:'NS bolus — الهدف SBP ≥ 110 في إصابات الرأس.',fx:s=>A(s,{sbp:12})}:{k:'neutral',m:'الضغط مرتفع — لا حاجة للسوائل الآن، لكن تجنب أي هبوط.'},
  ntg:{k:'bad',m:'لا تخفض الضغط — الدماغ يحتاج ضغطاً كافياً للتروية (منعكس Cushing تعويضي).',fx:s=>A(s,{sbp:-40})},
  atropine:{k:'neutral',m:'البطء هنا بسبب ارتفاع الضغط داخل الجمجمة — العلاج تهوية وأكسجة ونقل.'},
  o2nrb:s=>s.v.rr<10?{k:'neutral',m:'التنفس 8 وغير منتظم — يحتاج تهوية مساعدة BVM.'}:{k:'good',m:'O₂ عالي التدفق.',fx:s=>A(s,{spo2:3})},
  iv:{k:'good',m:'خط وريدي.'}
 },
 ideal:['mils','jaw','suction','bvm','smr','iv'],
 tl:[{at:150,if:s=>!has(s,'bvm')&&!has(s,'sga'),fx:s=>T(s,{spo2:80,etco2:58,hr:46,sbp:196}),m:'التنفس يسوء والتشبع ينخفض — نقص الأكسجين يزيد تلف الدماغ!'},{at:360,if:s=>!has(s,'bvm')&&!has(s,'sga'),fx:s=>T(s,{gcs:4,hr:40,rr:4}),m:'الحدقتان أصبحتا متوسعتين — تدهور شديد!'}],
 chal:[{l:'تشنج',fx:s=>T(s,{gcs:5,spo2:84}),m:'المريض يتشنج!'},{l:'قيء أثناء النقل',fx:s=>{s.flags.vomit=1;A(s,{spo2:-8});},m:'المريض تقيأ — ميّل لوح التثبيت كقطعة واحدة واشفط!'},{l:'هبوط ضغط مفاجئ',fx:s=>A(s,{sbp:-70,dbp:-40,hr:40}),m:'الضغط هبط فجأة — ابحث عن نزيف في مكان آخر!'}],
 transport:[{id:'trauma',l:'مركز إصابات فيه جراحة أعصاب وأشعة مقطعية — تبليغ مسبق',ok:1,why:'يحتاج تصريف النزيف جراحياً بسرعة.'},{id:'near',l:'أقرب مستشفى بدون جراحة أعصاب',ok:0,why:'لا يملك العلاج النهائي.'},{id:'stay',l:'الانتظار في الموقع حتى يستقر',ok:0,why:'لن يستقر دون جراحة.'}],
 critical:[
  {l:'تثبيت الرقبة خلال أول دقيقة',t:s=>(s.at.mils??9999)<=60},
  {l:'Jaw thrust وشفط وعدم استخدام Head tilt',t:s=>has(s,'jaw')&&has(s,'suction')&&!has(s,'htcl')},
  {l:'تهوية BVM أو i-gel',t:s=>has(s,'bvm')||has(s,'sga')},
  {l:'مراقبة EtCO₂',t:s=>atA(s,'capno')!=null||has(s,'sga')},
  {l:'عدم خفض الضغط',t:s=>!has(s,'ntg')},
  {l:'النقل لمركز فيه جراحة أعصاب',t:s=>s.ans.transport==='trauma'}],
 protocol:['سلامة المشهد وآلية الإصابة','تثبيت يدوي + Jaw thrust + شفط، ولا NPA مع كسر قاعدة الجمجمة','O₂ وتهوية BVM: SpO₂ ≥ 94% و EtCO₂ 35–40 — تجنب فرط التهوية الروتيني','SBP ≥ 110 (سوائل عند الهبوط)، ولا تخفض الضغط المرتفع','GCS والحدقات كل 5 دقائق، وقِس السكر','SMR ورفع الرأس 30°','النقل لمركز فيه جراحة أعصاب'],
 pearls:['فرط التهوية يقبض أوعية الدماغ ويقلل ترويته — يُستخدم مؤقتاً فقط مع علامات الانفتاق وحسب البروتوكول.']},

/* 16 Burns */
{id:'burn',nt:'حريق منزلي — حروق',cat:'trauma',title:'حريق منزلي — حروق واستنشاق دخان',tags:['Burns','Rule of 9s','Airway burns','CO'],level:'متوسط',
 dispatch:{no:'24386',pri:'أحمر',loc:'منزل — حريق في المطبخ (أطفأه الدفاع المدني)',age:45,sex:'أنثى',cc:'حروق في الوجه والذراعين والصدر، وتكح',hx:'سليمة',meds:'لا يوجد',alg:'لا يوجد',note:'الدفاع المدني: «طلعناها من المطبخ وهو مليان دخان»'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'sinustach',v:{hr:126,sbp:132,dbp:80,rr:28,spo2:98,etco2:34,gcs:14,glu:140,temp:36.4}},
 skin:'حروق في الوجه والذراعين والصدر',
 find:{
  scene:'تأكد من إطفاء الحريق وأمان المبنى مع الدفاع المدني. أوقف الحرق: انزع الملابس والإكسسوارات غير الملتصقة.',
  impression:'سيدة واعية متألمة، صوتها أجش، تكح بلغماً أسود.',
  airway:'صوت أجش، شعر الأنف والحاجبين محروق، سخام في الفم، و stridor خفيف — علامات حروق المجرى الهوائي!',
  breathing:s=>`RR ${r(s.v.rr)}، أزيز خفيف.`,
  circ:s=>`نبض سريع ${r(s.v.hr)}/د.`,
  disab:s=>`GCS ${r(s.v.gcs)} — مشوشة قليلاً وتشكو صداعاً.`,
  expose:'حروق في الوجه والرقبة (≈ 4.5%) والذراعين كاملين (18%) ومقدمة الصدر (9%) ≈ 31% من مساحة الجسم. أغلبها سماكة جزئية مع فقاعات، وبعض المناطق بيضاء جلدية بلا ألم (سماكة كاملة).',
  sample:'S: ألم وكحة وصداع. A: لا يوجد. M: لا يوجد. P: سليمة. L: الغداء. E: اشتعال مقلاة زيت في مطبخ مغلق، وبقيت في الدخان دقيقتين.',
  secondary:'لا إصابات أخرى. الحروق لا تحيط بالأطراف بالكامل.'
 },
 fp:{airway:'حروق المجرى تتورم بسرعة خلال ساعات — بحة + stridor + سخام = مجرى مهدد يحتاج تبليغاً مبكراً لتأمينه.',expose:'قاعدة التسعات للبالغ: الرأس 9، كل ذراع 9، مقدمة الجذع 18، خلفه 18، كل رجل 18، العجان 1. لا تحسب الحروق السطحية (احمرار فقط).',disab:'حريق في مكان مغلق + صداع + تشوش = اشتبه بالتسمم بأول أكسيد الكربون — قراءة SpO₂ قد تكون طبيعية بشكل كاذب!'},
 relevant:['scene','impression','airway','breathing','circ','disab','expose','monitor','secondary'],
 twelve:{rh:'sinustach',hr:126},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي بسبب الألم ونقص الحجم والتسمم.'},
 stab:{ans:'unstable',why:'حروق في المجرى الهوائي + 31% من مساحة الجسم + اشتباه تسمم بأول أكسيد الكربون.'},
 crit:{ans:'yes',why:'خطر انسداد المجرى خلال ساعات، وصدمة الحروق، والتسمم بأول أكسيد الكربون.'},
 rx:{
  o2nrb:{k:'good',c:1,m:'O₂ 100% عبر NRB — يقصّر بقاء أول أكسيد الكربون في الدم من 4–5 ساعات إلى 60–90 دقيقة تقريباً.',p:'جهاز SpO₂ العادي لا يميز الـ carboxyhemoglobin — عالج حسب القصة والأعراض.'},
  o2nc:{k:'neutral',m:'غير كافٍ مع اشتباه التسمم بأول أكسيد الكربون.'},
  burn:{k:'good',c:1,m:'تبريد الحروق بماء جارٍ فاتر 20 دقيقة (خلال 3 ساعات من الحرق) ثم تغطيتها بغلاف بلاستيكي نظيف — مع الحذر من انخفاض الحرارة.'},
  warm:{k:'good',c:1,m:'غطِّ المريضة — مرضى الحروق يفقدون حرارتهم بسرعة.'},
  iv:{k:'good',c:1,m:'خطان وريديان، في جلد سليم إن أمكن.'},
  ns:{k:'good',c:1,m:'سوائل حسب البروتوكول — مثلاً Lactated Ringer 500 mL/ساعة للبالغ قبل المستشفى.'},
  nsLarge:{k:'neutral',m:'الإفراط في السوائل يزيد الوذمة؛ اتبع معادلة البروتوكول.'},
  fent:{k:'good',c:1,m:'Fentanyl للألم — الحروق مؤلمة جداً.'},
  sga:s=>s.v.gcs<9?{k:'good',m:'تأمين المجرى.'}:{k:'neutral',m:'قد تحتاج تنبيباً مبكراً بفريق مؤهل — بلّغ مسبقاً. الـ i-gel لا يحمي من تورم الحنجرة.'},
  neb:{k:'good',m:'Salbutamol للأزيز.',fx:s=>A(s,{rr:-2})}
 },
 ideal:['o2nrb','burn','iv','ns','warm','fent'],
 tl:[{at:240,if:s=>!has(s,'o2nrb'),fx:s=>T(s,{gcs:12,hr:132}),m:'الصداع والتشوش يزدادان — اشتباه تسمم بأول أكسيد الكربون!'},{at:360,fx:s=>A(s,{spo2:-4,rr:4}),m:'البحة ازدادت والـ stridor أوضح — المجرى يتورم!'}],
 chal:[{l:'Stridor شديد',fx:s=>T(s,{spo2:85,rr:34}),m:'stridor شديد والمريضة لا تستطيع الكلام!'},{l:'تشوش شديد',fx:s=>T(s,{gcs:11}),m:'المريضة أصبحت مشوشة جداً ولا تعرف أين هي.'}],
 transport:[{id:'burn',l:'مركز حروق أو مستشفى فيه تخدير لتأمين المجرى الصعب — تبليغ مسبق',ok:1,why:'حروق أكثر من 20% مع إصابة الوجه والمجرى تحتاج مركز حروق وتأمين مجرى مبكراً.'},{id:'clinic',l:'مستوصف لتضميد الحروق',ok:0,why:'حالة مهددة للحياة.'},{id:'near',l:'أقرب مستشفى صغير بدون تخدير',ok:0,why:'لا يستطيع تأمين المجرى الصعب.'}],
 critical:[
  {l:'O₂ 100% خلال دقيقتين',t:s=>(s.at.o2nrb??9999)<=120},
  {l:'التعرف على حروق المجرى الهوائي',t:s=>atA(s,'airway')!=null},
  {l:'حساب مساحة الحروق',t:s=>atA(s,'expose')!=null},
  {l:'تبريد الحروق وتغطيتها',t:s=>has(s,'burn')},
  {l:'منع انخفاض الحرارة',t:s=>has(s,'warm')},
  {l:'النقل لمركز حروق',t:s=>s.ans.transport==='burn'}],
 protocol:['أوقف الحرق وأزل الملابس والإكسسوارات','O₂ 100% عبر NRB لاشتباه التسمم بأول أكسيد الكربون','قيّم المجرى: بحة، stridor، سخام، حروق الوجه ← تبليغ مبكر لتأمين المجرى','احسب مساحة الحروق بقاعدة التسعات (أو كف المريض = 1%)','برّد الحرق 20 دقيقة بماء فاتر ثم غطّه بغلاف بلاستيكي، وامنع انخفاض الحرارة','IV وسوائل حسب البروتوكول، ومسكن','النقل لمركز حروق'],
 pearls:['كف المريض مع الأصابع ≈ 1% من مساحة الجسم — مفيد للحروق المتفرقة.','لا تضع ثلجاً أو معجون أسنان أو زيوتاً على الحرق.']},

/* 17 Pelvic fracture */
{id:'pelvis',nt:'دهس مشاة',cat:'trauma',title:'دهس مشاة — كسر الحوض',tags:['Pelvic binder','Hemorrhagic shock'],level:'متوسط',
 dispatch:{no:'24395',pri:'أحمر',loc:'شارع رئيسي — دهس مشاة',age:52,sex:'أنثى',cc:'سيارة صدمت امرأة أثناء العبور، تتألم في الحوض ولا تستطيع الوقوف',hx:'سكري',meds:'Metformin',alg:'لا يوجد',note:'الشرطة: «السيارة كانت مسرعة»'},
 req:['monitor','probag','lifebag','spinal'],
 init:{rhythm:'sinustach',v:{hr:128,sbp:88,dbp:62,rr:26,spo2:95,etco2:30,gcs:15,glu:170,temp:36.2}},
 skin:'شاحبة، باردة ورطبة',
 find:{
  scene:'أمّن الطريق مع الشرطة. آلية عالية الطاقة: مشاة مقابل سيارة مسرعة.',
  impression:'سيدة ممددة على الطريق، واعية، تتألم بشدة، شاحبة.',
  xhem:'لا نزيف خارجي كارثي.',
  airway:'سالك.',
  breathing:s=>`RR ${r(s.v.rr)}، الرئتان صافيتان.`,
  circ:s=>`نبض كعبري ضعيف وسريع ${r(s.v.hr)}/د، الجلد بارد رطب، CRT 3 ث.`,
  disab:s=>`GCS ${r(s.v.gcs)} — قلقة.`,
  expose:'كدمات على الحوض والفخذ الأيسر، والرجل اليسرى أقصر ومدورة للخارج. لا نزيف ظاهر. دم عند فتحة البول.',
  secondary:'ألم شديد عند لمس عظم الحوض بلطف — لا تكرر الضغط. البطن لين. لا إصابة رأس.',
  sample:'S: ألم في الحوض. A: لا يوجد. M: Metformin. P: سكري. L: الإفطار. E: صدمتها سيارة من الجانب.'
 },
 fp:{expose:'كسر الحوض قد ينزف 2–3 لترات داخلياً. صدمة بدون نزيف ظاهر؟ ابحث في الصدر والبطن والحوض والعظام الطويلة والأرض.',secondary:'لا تهز الحوض ولا تكرر فحصه — يزيد النزيف. ضع الرباط الحوضي عند الاشتباه بناءً على الآلية والأعراض.',circ:'الصدمة النزفية: تسرع + جلد بارد رطب + هبوط ضغط.'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor','secondary'],
 twelve:{rh:'sinustach',hr:128},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي تعويضي لفقدان الدم.'},
 stab:{ans:'unstable',why:'SBP 88 + تسرع + جلد بارد رطب = صدمة نزفية.'},
 crit:{ans:'yes',why:'نزيف داخلي من الحوض يحتاج سيطرة جراحية أو قسطرة لإيقاف النزيف.'},
 rx:{
  pelvic:s=>s.flags.binder?{k:'neutral',m:'الرباط الحوضي مثبت.'}:{k:'good',c:1,m:'Pelvic binder على مستوى المدورين الكبيرين (greater trochanters) — يقلل حجم الحوض والنزيف.',fx:s=>{s.flags.binder=1;T(s,{hr:116,sbp:96,dbp:64});}},
  smr:{k:'good',m:'Scoop stretcher مع أقل تحريك ممكن (تجنب الـ logroll الكامل مع كسر الحوض).'},
  iv:{k:'good',c:1,m:'خطان وريديان كبيران (أو IO).'},
  ns:s=>s.v.sbp<=88?{k:'good',c:1,m:'NS 250 mL لهدف SBP 80–90 ووجود نبض كعبري (permissive hypotension).',fx:s=>A(s,{sbp:6})}:{k:'neutral',m:'الضغط كافٍ لهدف permissive hypotension — لا تزد السوائل.'},
  nsLarge:{k:'bad',m:'الكريستالويد بكميات كبيرة يخفف عوامل التخثر ويبرد المريض ويعيد النزيف.',fx:s=>A(s,{sbp:14,temp:-.5})},
  txa:{k:'good',c:1,m:'TXA 1 g IV خلال 10 دقائق — حسب البروتوكول المحلي.'},
  warm:{k:'good',c:1,m:'بطانية حرارية وتدفئة الكابينة.'},
  fent:s=>s.v.sbp>=90?{k:'good',m:'تسكين مع مراقبة الضغط.'}:{k:'bad',m:'الأفيونات مع الهبوط قد تخفض الضغط أكثر.',fx:s=>A(s,{sbp:-8})},
  splint:{k:'neutral',m:'الرباط الحوضي يكفي، مع ربط الركبتين والكاحلين معاً.'},
  o2nrb:{k:'good',m:'O₂ — قدرة حمل الأكسجين منخفضة مع فقدان الدم.',fx:s=>A(s,{spo2:2})}
 },
 ideal:['pelvic','iv','txa','warm','ns'],
 tl:[{at:120,if:s=>!s.flags.binder,fx:s=>T(s,{sbp:76,hr:140,gcs:14}),m:'المريضة تزداد شحوباً — الضغط ينخفض!'},{at:300,if:s=>!s.flags.binder,fx:s=>T(s,{sbp:60,hr:150,gcs:11}),m:'صدمة شديدة — المريضة شبه غائبة عن الوعي!'},{at:480,if:s=>!s.flags.binder,fx:s=>setRhythm(s,'pea'),m:'توقف قلب نزفي — PEA!'}],
 arrestFix:['pelvic'],
 rosc:{rhythm:'sinustach',v:{hr:132,sbp:78,dbp:48,spo2:93,rr:14,gcs:7,etco2:32}},
 chal:[{l:'هبوط مفاجئ',fx:s=>A(s,{sbp:-20,hr:15}),m:'المريضة أصبحت أكثر شحوباً والضغط ينخفض.'},{l:'المارة يحاولون إيقافها',m:'أحد المارة يحاول مساعدتها على الوقوف!'}],
 transport:[{id:'trauma',l:'مركز إصابات مع تفعيل نقل الدم الكثيف وإمكانية قسطرة أو جراحة الحوض',ok:1,why:'يحتاج دماً وإيقافاً للنزيف الحوضي.'},{id:'near',l:'أقرب مستشفى عام',ok:0,why:'لا يملك العلاج النهائي.'},{id:'ortho',l:'مستشفى عظام صغير',ok:0,why:'المشكلة الآن نزيف وليس العظم فقط.'}],
 critical:[
  {l:'Pelvic binder خلال 5 دقائق',t:s=>(s.at.pelvic??9999)<=300},
  {l:'البحث عن مصدر النزيف الداخلي',t:s=>atA(s,'expose')!=null},
  {l:'تجنب الكميات الكبيرة من السوائل',t:s=>!has(s,'nsLarge')},
  {l:'TXA حسب البروتوكول',t:s=>has(s,'txa')},
  {l:'منع انخفاض الحرارة',t:s=>has(s,'warm')},
  {l:'النقل لمركز إصابات',t:s=>s.ans.transport==='trauma'}],
 protocol:['سلامة المشهد','X-A-B-C: ابحث عن مصدر النزيف الداخلي (صدر، بطن، حوض، عظام طويلة)','Pelvic binder عند الاشتباه على مستوى المدورين الكبيرين — ولا تكرر فحص ثبات الحوض','Scoop مع أقل تحريك ممكن','IV/IO و boluses صغيرة لهدف SBP 80–90، و TXA حسب البروتوكول','منع انخفاض الحرارة','النقل لمركز إصابات مع تفعيل نقل الدم الكثيف'],
 pearls:['الرباط الحوضي يوضع على المدورين الكبيرين وليس على الخصر (عظم الحرقفة).']},

/* 18 Stab wound */
{id:'stab',nt:'طعنة في الصدر',cat:'trauma',title:'طعنة في الصدر — جرح صدري مفتوح',tags:['Open pneumothorax','Chest seal','Penetrating'],level:'متوسط',
 dispatch:{no:'24407',pri:'أحمر',loc:'موقف سيارات — شجار',age:26,sex:'ذكر',cc:'طُعن في الجهة اليسرى من الصدر، ينزف ويتنفس بصعوبة',hx:'غير معروف',meds:'غير معروف',alg:'غير معروف',note:'الشرطة أمّنت الموقع والمعتدي مقبوض عليه.'},
 req:['monitor','probag','oxygen','lifebag'],
 init:{rhythm:'sinustach',v:{hr:124,sbp:100,dbp:66,rr:30,spo2:89,etco2:30,gcs:15,glu:120,temp:36.5}},
 skin:'شاحب، متعرق',
 find:{
  scene:'لا تدخل مشهد عنف حتى تؤمّنه الشرطة. الموقع آمن الآن.',
  impression:'شاب جالس يضغط بيده على صدره، يتكلم بجمل قصيرة.',
  xhem:'الجرح ينزف قليلاً — ليس نزيفاً كارثياً.',
  airway:'سالك.',
  breathing:s=>s.flags.sealed&&!s.flags.tension?`RR ${r(s.v.rr)} — توقف صوت المص وتحسن التنفس.`:s.flags.tension?`RR ${r(s.v.rr)} — غياب أصوات التنفس يساراً مع ضيق شديد.`:`RR ${r(s.v.rr)}، جرح 2 سم في الجهة اليسرى (المسافة الضلعية الخامسة على خط منتصف الترقوة) مع صوت مص هواء وفقاعات مع التنفس. دخول الهواء أقل يساراً.`,
  circ:s=>s.flags.tension?`نبض سريع ضعيف ${r(s.v.hr)}/د، JVD واضح.`:`نبض سريع ${r(s.v.hr)}/د، CRT 3 ث، لا JVD.`,
  disab:s=>`GCS ${r(s.v.gcs)}.`,
  expose:'افحص الظهر والإبطين: لا جروح أخرى.',
  secondary:'لا إصابات أخرى.',
  sample:'S: ألم وضيق تنفس. A: لا يوجد. M: لا يوجد. P: سليم. L: العشاء. E: طعنة بسكين قبل 10 دقائق.'
 },
 fp:{breathing:'الجرح الصدري الماص: غطّه فوراً بيدك (مع قفاز) ثم بضماد محكم بصمام (vented chest seal).',expose:'ابحث عن جرح خروج أو جروح أخرى في الظهر والإبطين.',circ:'راقب تحوله لاسترواح ضاغط بعد إغلاق الجرح: ضيق متزايد + هبوط + JVD ← ارفع طرف الضماد أو فرّغ بالإبرة.'},
 relevant:['scene','impression','xhem','airway','breathing','circ','disab','expose','monitor'],
 twelve:{rh:'sinustach',hr:124},
 ecgQ:{need:'monitor',opts:ECG_OPTS_TACHY,ans:'Sinus tachycardia',why:'تسرع جيبي بسبب نقص الأكسجين والألم والنزيف.'},
 stab:{ans:'unstable',why:'SpO₂ 89% + ضيق تنفس + جرح صدري مفتوح.'},
 crit:{ans:'yes',why:'الإصابة الصدرية النافذة قد تسبب استرواحاً ضاغطاً أو نزيفاً داخلياً أو إصابة القلب — تحتاج جراحاً بسرعة.'},
 rx:{
  occl:s=>s.flags.tension?{k:'good',c:1,m:'رفع طرف الضماد (burping) — خرج الهواء المحبوس وتحسن المريض.',fx:s=>{s.flags.tension=0;T(s,{spo2:93,sbp:104,dbp:66,hr:114});}}:s.flags.sealed?{k:'neutral',m:'الجرح مغلق بالفعل.'}:{k:'good',c:1,m:'Vented chest seal على الجرح — توقف صوت المص وتحسن التنفس.',fx:s=>{s.flags.sealed=1;T(s,{spo2:94,rr:24,hr:112});}},
  pressure:{k:'neutral',m:'الضغط المباشر لا يكفي لجرح صدري ماص — يحتاج ضماداً محكماً.'},
  o2nrb:{k:'good',c:1,m:'O₂ عالي التدفق.',fx:s=>A(s,{spo2:3})},
  iv:{k:'good',c:1,m:'خط وريدي كبير (يفضل أثناء النقل).'},
  ns:s=>s.v.sbp<90?{k:'good',m:'NS 250 mL لهدف SBP 80–90.',fx:s=>A(s,{sbp:6})}:{k:'neutral',m:'الضغط كافٍ — لا تزد السوائل في الإصابات النافذة.'},
  needle:s=>s.flags.tension?{k:'good',c:1,m:'Needle decompression يساراً — خرج الهواء وتحسن فوري.',fx:s=>{s.flags.tension=0;T(s,{spo2:93,sbp:104,dbp:66,hr:114});}}:{k:'bad',m:'لا توجد علامات استرواح ضاغط — التفريغ بالإبرة غير مستطب الآن.'},
  bvm:s=>!s.flags.sealed?{k:'bad',m:'الضغط الإيجابي مع جرح غير مغلق يزيد تسرب الهواء — أغلق الجرح أولاً.',fx:s=>A(s,{spo2:-3})}:{k:'neutral',m:'المريض يتنفس بفعالية.'}
 },
 ideal:['occl','o2nrb','iv'],
 tl:[{at:120,if:s=>!s.flags.sealed,fx:s=>T(s,{spo2:82,rr:36,hr:138,sbp:92}),m:'الضيق يزداد — الهواء يدخل عبر الجرح مع كل نفَس!'}],
 chal:[{l:'استرواح ضاغط بعد إغلاق الجرح',fx:s=>{s.flags.tension=1;T(s,{spo2:80,sbp:74,dbp:44,hr:142});},m:'بعد إغلاق الجرح: ضيق شديد وهبوط و JVD — استرواح ضاغط! ارفع طرف الضماد أو فرّغ بالإبرة.'},{l:'هبوط ضغط (نزيف داخلي)',fx:s=>A(s,{sbp:-25,hr:18}),m:'الضغط ينخفض والمريض أكثر شحوباً.'}],
 transport:[{id:'trauma',l:'مركز إصابات فيه جراحة صدر — تبليغ مسبق',ok:1,why:'الإصابات النافذة تحتاج تقييماً جراحياً سريعاً وأنبوباً صدرياً.'},{id:'near',l:'أقرب مركز رعاية أولية',ok:0,why:'لا يستطيع التعامل مع إصابات الصدر.'},{id:'stay',l:'المراقبة في الموقع بعد إغلاق الجرح',ok:0,why:'خطر الاسترواح الضاغط والنزيف الداخلي.'}],
 critical:[
  {l:'سلامة المشهد قبل الدخول',t:s=>(atA(s,'scene')??9999)<=30},
  {l:'Chest seal خلال دقيقتين',t:s=>(s.at.occl??9999)<=120},
  {l:'فحص الظهر والإبطين',t:s=>atA(s,'expose')!=null},
  {l:'O₂ عالي التدفق',t:s=>has(s,'o2nrb')},
  {l:'تجنب الضغط الإيجابي قبل إغلاق الجرح',t:s=>!s.errIds.has('bvm')},
  {l:'النقل لمركز إصابات',t:s=>s.ans.transport==='trauma'}],
 protocol:['لا تدخل مشهد عنف قبل تأمينه','غطِّ الجرح فوراً بيد مع قفاز، ثم Vented chest seal','O₂ لهدف SpO₂ ≥ 94%','افحص الظهر والإبطين','راقب الاسترواح الضاغط: ارفع طرف الضماد أو Needle decompression','IV أثناء النقل و boluses صغيرة عند الهبوط','Load & Go لمركز إصابات'],
 pearls:['في الطعنات بين الحلمتين ولوحي الكتف فكّر في إصابة القلب والدكاك القلبي (ثلاثي Beck).']}

];

/* ---------- sim engine ---------- */
let SIM=null,monSim=null;
function newSim(sc){return{sc,phase:0,maxPhase:0,t:0,arrived:false,paused:false,over:false,
  v:{...sc.init.v},target:{...sc.init.v},rhythm:sc.init.rhythm,connected:false,capno:false,
  arrest:false,cprOn:false,shocks:0,epi:0,amioN:0,fixed:false,
  did:new Set(),seen:new Set(),scored:new Set(),errIds:new Set(),at:{},last:{},cnt:{},flags:{},brought:new Set(),
  ans:{},score:0,log:[],errs:[],later:[],fired:new Set(),hist:[],findings:[],adj:0,notes:'',lastMsg:'',bHist:[],chLog:[],badList:[],rxTab:'airway',mode:'train',tut:null};}
function addLog(k,m,full){const s=SIM;s.log.push({t:s.t,k,m,full:full||m});renderLog();}
function event(s,m,k='warn'){if(!m)return;if(s.mode==='exam')m=examSafe(m);s.lastMsg=m;addLog(k,m);toast(m,k);if(k==='bad'||k==='warn'){flashMon();SFX.warn();}}
function examSafe(m){if(/\b(PEA|VF|Asystole|VT)\b|Pulseless/.test(m))return 'تغيّر مفاجئ في حالة المريض — أعد التقييم فوراً.';if(m.includes('اشتباه'))return m.split(' — ')[0]+'.';return m;}
function flashMon(){const m=$('#monSim .mon');if(!m)return;m.classList.remove('flash');void m.offsetWidth;m.classList.add('flash');}

function startSim(id,mode='train',opts={}){
  const sc=SC.find(x=>x.id===id);SIM=newSim(sc);SIM.mode=mode;SIM.tut=(opts.tutorial&&mode==='train')?{seen:new Set(),skip:false}:null;
  if(monSim){monSim.nibp=null;monSim.nibpT=50;monSim.nibpAge=0;}
  $('#toasts').innerHTML='';
  $('#picker').hidden=true;$('#debrief').hidden=true;$('#sim').hidden=false;$('#trainer').hidden=true;
  $('#simPause').textContent='إيقاف مؤقت';$('#simTrainer').hidden=mode==='exam';
  const mp=$('#simMode');mp.textContent=mode==='exam'?'وضع الاختبار':'وضع التدريب';mp.className='pill '+(mode==='exam'?'bad':'ok');
  renderSim();window.scrollTo(0,0);
}
function fetchEq(eq){const s=SIM;s.t+=60;s.brought.add(eq);s.score-=3;s.errs.push(`نسيت ${EQL[eq]} — رجعت للإسعاف وضاعت 60 ثانية من وقت المريض.`);addLog('bad',`رجوع للإسعاف لإحضار ${EQL[eq]} (+60 ث)`);toast(`لم تُحضر ${EQL[eq]} — العودة للإسعاف أخذت 60 ثانية`,'warn');}

function assess(id){
  const s=SIM;if(!s.arrived||s.over)return;
  const Aa=AS[id];if(Aa.eq&&!s.brought.has(Aa.eq))fetchEq(Aa.eq);
  const first=!s.seen.has(id);
  if(s.seen.size===0){if(id==='scene')s.score+=3;else{s.score-=3;s.errs.push('لم تبدأ بتقييم سلامة الموقع وارتداء معدات الوقاية.');}}
  if(first&&s.sc.relevant.includes(id))s.score+=2;
  if(first&&id==='airway'&&s.sc.cat==='trauma'&&s.sc.relevant.includes('xhem')&&!s.seen.has('xhem')&&!has(s,'tq')){s.score-=3;s.errs.push('في الإصابات: افحص النزيف الكارثي (X) قبل المجرى الهوائي.');}
  s.seen.add(id);s.cnt['a:'+id]=(s.cnt['a:'+id]||0)+1;if(s.at['a:'+id]==null)s.at['a:'+id]=s.t;
  if(id==='breathing')setTimeout(()=>lungSound(lungType(s)),150);
  if(id==='monitor')s.connected=true;if(id==='capno'){s.capno=true;s.connected=true;}if(id==='ecg12'||id==='rightecg')s.connected=true;
  let f;
  if(s.arrest&&['impression','airway','breathing','circ'].includes(id))f='المريض غير مستجيب، لا يتنفس طبيعياً، ولا يوجد نبض سباتي — توقف قلب! ابدأ CPR.';
  else{f=s.sc.find[id];if(typeof f==='function')f=f(s);if(!f)f=DEF_FIND[id]?DEF_FIND[id](s):'لا توجد نتائج غير طبيعية ذات صلة.';}
  if(s.mode==='exam'&&(id==='ecg12'||id==='rightecg'))f='تم تسجيل التخطيط — اقرأه في مرحلة «العلاج وقراءة ECG».';
  else if(s.mode==='exam'){f=(LANG==='en'?trText(f):f).replace(/\s*[←→][^.]*(\.|$)/g,'.').replace(/\.{2,}/g,'.');}
  const p=first&&s.sc.fp?s.sc.fp[id]:null;
  s.findings.unshift({id,t:s.t,txt:f,p});
  addLog('info','تقييم: '+Aa.l);
  renderPhase();renderLog();
}
const DEF_FIND={
  monitor:()=>'تم توصيل المونيتور: أقطاب ECG وSpO₂ وكفة NIBP — راقب الشاشة.',
  capno:()=>'تم توصيل Capnography عبر قنية أنفية — EtCO₂ يظهر على الشاشة.',
  glucose:s=>`سكر الدم ${r(s.v.glu)} mg/dL.`,
  disab:s=>`GCS ${r(s.v.gcs)} (${gcsTxt(s.v.gcs)})، الحدقتان متساويتان ومتفاعلتان.`,
  rightecg:()=>'لا ارتفاع في ST في V4R.',
  xhem:()=>'لا يوجد نزيف كارثي.',
  expose:s=>`لا إصابات ظاهرة. الحرارة ${s.v.temp.toFixed(1)}°C.`,
  ecg12:s=>`${RHY[s.rhythm].lbl} بدون تغيرات ST واضحة.`,
  opqrst:()=>'لا يوجد ألم محدد.',secondary:()=>'لا نتائج إضافية مهمة.'
};

function defaultRx(s,id){
  switch(id){
    case 'cpr':return{k:'bad',m:'المريض لديه نبض — CPR غير مستطب.'};
    case 'defib':return{k:'bad',m:'صدمة غير متزامنة لمريض لديه نبض ← سقطت على موجة T (R-on-T) وتحول الإيقاع إلى VF!',fx:s=>setRhythm(s,'vf')};
    case 'sync':return{k:'bad',m:'Cardioversion غير مستطب — المريض ليس في تسرع غير مستقر.'};
    case 'pace':return{k:'bad',m:'الـ pacing غير مستطب — لا يوجد بطء عرضي.'};
    case 'epiIV':return{k:'bad',m:'Epinephrine 1 mg IV bolus مخصص للتوقف القلبي — مع وجود نبض يسبب تسرعاً شديداً وارتفاع ضغط.',fx:s=>{A(s,{hr:40,sbp:60,dbp:30});s.later.push({at:s.t+45,fx:x=>A(x,{hr:-36,sbp:-55,dbp:-28}),m:''});}};
    case 'iv':return{k:'good',m:'خط وريدي 18G.'};
    case 'o2nc':case 'o2nrb':return s.v.spo2<94?{k:'good',m:'أكسجين — الهدف SpO₂ 94–98%.',fx:s=>A(s,{spo2:id==='o2nrb'?5:3})}:{k:'neutral',m:`SpO₂ ${r(s.v.spo2)}% — لا حاجة للأكسجين.`};
    case 'suction':return s.flags.vomit?{k:'good',m:'شفط المجرى — زالت القرقرة وتحسن التنفس.',fx:s=>{s.flags.vomit=0;A(s,{spo2:8});}}:{k:'neutral',m:'لا توجد إفرازات تستدعي الشفط.'};
    case 'ntg':return s.v.sbp<90?{k:'bad',m:'النترات ممنوعة مع SBP أقل من 90.',fx:s=>A(s,{sbp:-20,dbp:-10})}:{k:'neutral',m:'لا يوجد ألم صدري إقفاري.'};
    case 'htcl':return s.sc.cat==='trauma'?{k:'bad',m:'Head tilt ممنوع مع احتمال إصابة الرقبة — استخدم Jaw thrust.'}:{k:'neutral',m:'المجرى سالك.'};
    case 'warm':return{k:'info',m:'تدفئة المريض — مقبول.'};
    case 'mils':case 'smr':return s.sc.cat==='trauma'?{k:'info',m:'طبّق معايير SMR الانتقائية.'}:{k:'neutral',m:'لا توجد آلية إصابة تستدعي تثبيت العمود الفقري.'};
    case 'fent':return s.v.sbp<90?{k:'bad',m:'الأفيونات مع الهبوط قد تخفض الضغط أكثر.',fx:s=>A(s,{sbp:-10})}:{k:'neutral',m:'لا يوجد استطباب واضح للتسكين الآن.'};
  }
  return{k:'neutral',m:'لا يوجد استطباب واضح لهذا الإجراء في هذه الحالة — يضيّع وقتاً.'};
}
const ARREST_IDS=new Set(['cpr','defib','epiIV','amio','sync','pace','bvm','sga','iv']);
function arrestRx(s,id){
  const R=RHY[s.rhythm];const canRosc=!s.sc.arrestFix||s.fixed;
  if(id==='cpr'){if(s.cprOn)return{k:'info',m:'CPR مستمر — بدّل الضاغط كل دقيقتين.'};s.cprOn=true;return{k:'good',c:1,m:'بدء CPR عالي الجودة: 100–120/د، عمق 5–6 سم، ارتداد كامل، أقل مقاطعة ممكنة.'};}
  if(id==='defib'){if(!R.shock)return{k:'bad',m:`صدمة على ${R.lbl} — إيقاع غير قابل للصدم. استمر في CPR وأعطِ Epinephrine وابحث عن السبب.`};
    s.shocks++;const ch=(s.cprOn?.25:.1)+(s.epi?.2:0)+(s.amioN?.25:0)+.07*s.shocks;
    if(canRosc&&Math.random()<ch)return{k:'good',c:1,m:`صدمة رقم ${s.shocks} (200 J).`,fx:s=>rosc(s,'بعد الصدمة')};
    return{k:'good',c:1,m:`صدمة رقم ${s.shocks} (200 J) — ما زال ${R.lbl}. استأنف CPR فوراً لمدة دقيقتين.`};}
  if(id==='epiIV'){s.epi++;const ok=!R.shock||s.shocks>=2;
    const res={k:ok?'good':'neutral',c:ok?1:0,m:R.shock?(ok?'Epinephrine 1 mg IV/IO — كرر كل 3–5 دقائق.':'في VF/pVT يُعطى Epinephrine بعد الصدمة الثانية؛ الأولوية للصدمة وCPR.'):'Epinephrine 1 mg IV/IO فوراً في الإيقاع غير القابل للصدم، وكرر كل 3–5 دقائق.'};
    if(!R.shock&&canRosc&&s.cprOn&&Math.random()<.45)res.fx=s=>rosc(s,'بعد Epinephrine');return res;}
  if(id==='amio'){if(!R.shock)return{k:'bad',m:'Amiodarone لا يُستخدم في Asystole أو PEA.'};s.amioN++;return s.shocks>=2?{k:'good',m:'Amiodarone 300 mg IV/IO (الجرعة الثانية 150 mg).'}:{k:'neutral',m:'Amiodarone يُعطى بعد الصدمة الثالثة.'};}
  if(id==='sync')return{k:'bad',m:'لا يمكن التزامن في التوقف القلبي — استخدم Defibrillation للإيقاعات القابلة للصدم.'};
  if(id==='pace')return{k:'bad',m:'الـ pacing غير موصى به في التوقف القلبي.'};
  if(id==='bvm')return{k:'good',m:'BVM: نفَسان كل 30 ضغطة، كل نفَس ثانية واحدة مع ارتفاع مرئي للصدر — تجنب فرط التهوية.'};
  if(id==='sga')return{k:'good',m:'i-gel + Capnography: ضغطات مستمرة ونفَس كل 6 ثوانٍ.',fx:s=>{s.capno=true;}};
  if(id==='iv')return{k:'good',m:'IV/IO access.'};
  return null;
}
function rosc(s,why){const R0=s.sc.rosc||{};s.arrest=false;s.cprOn=false;s.rhythm=R0.rhythm||'sinustach';
  T(s,Object.assign({hr:112,sbp:94,dbp:58,spo2:93,rr:12,gcs:6,etco2:40},R0.v||{}));s.v.sbp=70;s.v.dbp=40;s.v.hr=s.target.hr;s.v.spo2=86;
  s.roscN=(s.roscN||0)+1;s.score+=10;SFX.rosc();event(s,'ROSC — عادت الدورة الدموية التلقائية'+(why?' ('+why+')':'')+'. ابدأ رعاية ما بعد الإنعاش.','good');}

function doRx(id){
  const s=SIM;if(!s.arrived||s.over)return;
  const X=RX[id];
  if(!X.rep&&s.did.has(id)){toast('تم تنفيذ هذا الإجراء مسبقاً','info');return;}
  if(X.eq&&!s.brought.has(X.eq))fetchEq(X.eq);
  if(X.iv&&!s.did.has('iv')){toast('يتطلب خطاً وريدياً — افتح IV أولاً','warn');return;}
  s.cnt[id]=(s.cnt[id]||0)+1;
  let res=null;
  if(s.arrest&&ARREST_IDS.has(id))res=arrestRx(s,id);
  if(!res&&s.arrest&&!(s.sc.arrestFix||[]).includes(id))res={k:'neutral',m:'في التوقف القلبي ركّز على CPR والصدمات والأدوية والأسباب العكسية.'};
  if(!res){const r0=s.sc.rx[id];res=typeof r0==='function'?r0(s):r0;if(!res)res=defaultRx(s,id);}
  if(s.arrest&&(s.sc.arrestFix||[]).includes(id)&&res.k==='good')s.fixed=true;
  if(res.nodone){s.cnt[id]--;}else{s.did.add(id);if(s.at[id]==null)s.at[id]=s.t;}
  s.last[id]=s.t;
  if(id==='sync'&&res.k==='good')s.flags.syncOk=1;
  if(res.fx)res.fx(s);
  const elec=(id==='defib'||id==='sync')&&res.k!=='neutral';
  if(elec){SFX.charge(1.2);say(id==='sync'?'Synchronized. Stand clear.':'Stand clear.');setTimeout(SFX.shock,1300);}
  if(id==='pace'&&res.k==='good'){[0,.55,1.1,1.65].forEach(d=>tone(1800,.02,.04,d,'square'));}
  setTimeout(()=>{if(!train()||res.k==='neutral'||res.k==='info')SFX.tick();else if(res.k==='good')SFX.ok();else SFX.bad();},elec?1700:0);
  if(res.k==='good'){if(!s.scored.has(id)){s.score+=(s.sc.ideal.includes(id)||res.c)?10:3;s.scored.add(id);}}
  else if(res.k==='bad'){s.score-=15;s.errIds.add(id);s.badList.push({id,t:s.t,m:res.m});s.errs.push(`${X.l}: ${res.m}`);}
  else if(res.k==='neutral'){s.score-=2;}
  const full=X.l+' — '+res.m;
  if(train()){toast(full,res.k==='neutral'?'warn':res.k,res.p?'ملاحظة: '+res.p:'');}
  else toast('تم: '+X.l,'info');
  if(res.k==='bad')flashMon();
  s.lastMsg=train()?res.m:'تم تنفيذ: '+X.l;
  s.log.push({t:s.t,k:res.k==='neutral'?'warn':res.k,m:'تنفيذ: '+X.l,full,p:res.p});
  if(res.p&&train())s.findings.unshift({id:'rx',t:s.t,txt:'بعد '+X.l,p:res.p,rx:1});
  renderRx();renderLog();renderPt();if(s.phase===1)renderPhase();
}

function simTick(){
  const s=SIM;if(!s||!s.arrived||s.paused||s.over)return;
  s.t++;
  (s.sc.tl||[]).forEach((e,i)=>{if(s.fired.has(i)||s.t<e.at)return;s.fired.add(i);if(e.if&&!e.if(s))return;e.fx(s);event(s,e.m,'bad');});
  s.later=s.later.filter(l=>{if(s.t>=l.at){l.fx(s);if(l.m)event(s,l.m,l.k||'info');return false;}return true;});
  if(s.arrest&&s.fixed&&s.cprOn)rosc(s,'بعد علاج السبب العكسي');
  if(s.arrest)Object.assign(s.target,{hr:s.rhythm==='pvt'?180:s.rhythm==='pea'?40:0,sbp:0,dbp:0,spo2:0,gcs:3,rr:s.cprOn?10:0,etco2:s.cprOn?16:3});
  const lim={hr:[0,230],sbp:[0,240],dbp:[0,140],rr:[0,60],spo2:[0,100],etco2:[0,80],gcs:[3,15],glu:[10,600],temp:[30,42]};
  for(const k in s.target){s.target[k]=clamp(s.target[k],...lim[k]);const rate=s.arrest?.5:k==='gcs'?.1:k==='glu'?.2:.13;
    const noise={hr:1,sbp:1,dbp:.6,rr:.4,spo2:.25,etco2:.4}[k]||0;
    s.v[k]=clamp(s.v[k]+(s.target[k]-s.v[k])*rate+(Math.random()*2-1)*noise*(s.arrest?0:1),...lim[k]);}
  if(s.arrest&&s.rhythm==='pea')s.v.hr=40;
  const bad=s.arrest?100:Math.max(0,90-s.v.sbp)+Math.max(0,94-s.v.spo2)*2+Math.max(0,s.v.hr-120)*.4+Math.max(0,50-s.v.hr)+Math.max(0,15-s.v.gcs)*2;
  s.bHist.push(bad);if(s.bHist.length>40)s.bHist.shift();
  if(s.t%5===0)s.hist.push({t:s.t,hr:s.arrest?0:s.v.hr,sbp:s.v.sbp,spo2:s.arrest?null:s.v.spo2,arrest:s.arrest});
  $('#simClock').textContent=fmtT(s.t);
  renderPt();updateStrip();
  if(!$('#trainer').hidden)renderTrainerLive();
}
setInterval(simTick,1000);

/* ---------- sim render ---------- */
const STEPS=['البلاغ والتجهيز','التقييم الأولي','تصنيف الحالة','العلاج وقراءة ECG','النقل والتسليم'];
const NOW_T=['اقرأ البلاغ واختر المعدات التي ستأخذها معك، ثم اضغط «الوصول إلى الموقع».','ابدأ بسلامة الموقع، ثم قيّم المريض بالترتيب ووصّل المونيتور. عالج أي خطر فوري من «التدخلات العلاجية» دون انتظار.','قرّر هل المريض مستقر وهل الحالة خطرة، بناءً على نتائج تقييمك.','اقرأ التخطيط، ثم اختر العلاج حسب أولوية الخطر وراقب استجابة المريض على المونيتور.','اختر وجهة النقل المناسبة وتابع العلاج أثناء النقل، ثم أنهِ الحالة لرؤية التقرير.'];
const NOW_E=['اقرأ البلاغ واختر المعدات، ثم انتقل إلى الموقع.','أجرِ التقييم الذي تراه مناسباً. النتائج تظهر أدناه، والتدخلات متاحة في أي وقت.','أجب عن سؤالي التصنيف ثم انتقل للمرحلة التالية.','أكمل قراءة التخطيط وخطتك العلاجية، ثم انتقل للنقل.','اختر وجهة النقل ثم اضغط «إنهاء الحالة» لتسليم الاختبار.'];
const TUT=[
 {p:0,t:'هدف الحالة: مريضة تغيّر وعيها فجأة. المطلوب تقييم منظم، اكتشاف السبب القابل للعلاج، علاج آمن، ونقل مناسب. التقرير في النهاية يشرح قراراتك.'},
 {p:0,t:'اقرأ البلاغ: العمر والشكوى والتاريخ المرضي والأدوية تعطيك أول فكرة عن السبب. لاحظ قائمة الأدوية وملاحظة المتصل.'},
 {p:0,t:'اختر المعدات قبل النزول: فكّر فيما تحتاجه لتقييم الوعي، ومراقبة القلب، والعلاج الوريدي. ثم اضغط «الوصول إلى الموقع».'},
 {p:1,t:'ابدأ دائماً بـ«سلامة الموقع + PPE»، ثم قيّم A ثم B ثم C ثم D ثم E. كل نتيجة تظهر في قائمة نتائج الفحص أسفل الأزرار.'},
 {p:1,t:'في أي تغيّر بالوعي قِس السكر (BGL) مبكراً. وإذا وجدت خطراً فورياً عالجه من «التدخلات العلاجية» في أي وقت — لا تنتظر نهاية التقييم.'},
 {p:2,t:'قرّر بناءً على ما وجدته: هل العلامات الحيوية والوعي مستقرة؟ وهل الحالة تهدد الحياة أو مرتبطة بالوقت؟'},
 {p:3,t:'اقرأ الإيقاع على المونيتور، ثم اختر العلاج من مجموعات التدخلات. راقب بطاقة المريض والمونيتور لترى أثر كل قرار، وأعد القياس بعد العلاج.'},
 {p:4,t:'اختر الوجهة الأنسب ثم اضغط «إنهاء الحالة». التقرير يعرض أهم قرارين للمراجعة وتوقيت كل خطوة، وزر «أعد الحالة» للتجربة من جديد.'}];
function topHTML(s){let h=`<div class="now"><b>المطلوب الآن</b><p>${(s.mode==='exam'?NOW_E:NOW_T)[s.phase]}</p></div>`;
  if(s.tut&&!s.tut.skip){const i=TUT.findIndex((x,k)=>x.p===s.phase&&!s.tut.seen.has(k));
    if(i>=0)h+=`<div class="tut" role="note"><div class="tut-h"><b>إرشاد ${i+1} من ${TUT.length}</b><button class="linkbtn" data-tut="skip">تخطَّ الإرشاد</button></div><p>${TUT[i].t}</p><button class="btn primary" data-tut="next" data-i="${i}">فهمت</button></div>`;}
  return h;}
function updateStrip(){const s=SIM,el=$('#simStrip');if(!el||!s)return;const nb=monSim&&monSim.nibp&&monSim.nibp.s?`${monSim.nibp.s}/${monSim.nibp.d}`:'---/---';
  const v=s.connected?`HR ${s.arrest?'---':r(s.v.hr)} · SpO₂ ${s.arrest?'--':r(s.v.spo2)} · NIBP ${nb}`:'';
  el.innerHTML=`<span class="ph">${s.phase+1}/5 · ${STEPS[s.phase]}</span><span class="vit">${v}</span>${s.connected?'':'<span class="muted">المونيتور غير موصول</span>'}<span class="mono">${fmtT(s.t)}</span>${s.arrived?'<button class="btn" data-act="jumprx">التدخلات ↓</button>':''}`;}
function renderSim(){const s=SIM;$('#simTitle').textContent=s.mode==='exam'?s.sc.nt:s.sc.title;updateStrip();$('#simClock').textContent=fmtT(s.t);renderStepper();renderPhase();renderRx();renderPt();renderLog();}
function renderStepper(){const s=SIM;$('#stepper').innerHTML=STEPS.map((l,i)=>`<button data-step="${i}" class="${i===s.phase?'cur':i<s.maxPhase||(i<=s.maxPhase&&i!==s.phase)?'done':''}" ${i>s.maxPhase?'disabled':''}><b>${i+1}</b>${l}</button>`).join('');}
function goPhase(p){const s=SIM;s.phase=p;s.maxPhase=Math.max(s.maxPhase,p);renderStepper();renderPhase();$('#phaseBody').scrollIntoView({block:'nearest'});}
function renderPhase(){renderPhaseCore();const s=SIM;$('#phaseBody').insertAdjacentHTML('afterbegin',topHTML(s));updateStrip();}
function renderPhaseCore(){
  const s=SIM,sc=s.sc,el=$('#phaseBody');
  if(s.phase===0){const d=sc.dispatch;
    el.innerHTML=`<h3>البلاغ والتجهيز<span class="sub">اقرأ البلاغ وجهّز ما تحتاجه قبل النزول</span></h3>
    <div class="disp"><div class="disp-h"><span>بلاغ رقم ${d.no}</span><span>الأولوية: ${d.pri}</span></div>
    <dl class="kv"><dt>الموقع</dt><dd>${d.loc}</dd><dt>العمر / الجنس</dt><dd>${d.age} سنة — ${d.sex}</dd><dt>الشكوى الرئيسية</dt><dd>${d.cc}</dd><dt>التاريخ المرضي</dt><dd>${d.hx}</dd><dt>الأدوية</dt><dd>${d.meds}</dd><dt>الحساسية</dt><dd>${d.alg}</dd><dt>ملاحظة المتصل</dt><dd>${d.note}</dd></dl></div>
    <div><h3>ماذا ستحمل معك من الإسعاف؟</h3><p class="muted small">ما تنساه يكلفك رحلة عودة للإسعاف (60 ثانية من وقت المريض).</p></div>
    <div class="eqgrid">${EQ.map(e=>`<button class="eq ${s.brought.has(e.id)?'on':''}" data-eq="${e.id}" aria-pressed="${s.brought.has(e.id)}" ${s.arrived?'disabled':''}><b>${e.l}</b><small>${e.d}</small></button>`).join('')}</div>
    ${s.arrived?`<button class="btn dark" data-go="1">متابعة التقييم</button>`:`<button class="btn primary" data-act="arrive">الوصول إلى الموقع وبدء التقييم</button>`}`;
    return;}
  if(s.phase===1){
    el.innerHTML=`<h3>التقييم الأولي${s.mode==='exam'?'':`<span class="sub">ابدأ بالمشهد، ثم ${sc.cat==='trauma'?'X-A-B-C-D-E':'A-B-C-D-E'}، ثم الأجهزة والتاريخ</span>`}</h3>
    ${AGROUPS.map(([gl,ids])=>`<div class="agroup"><span>${gl}</span><div class="abtns">${ids.map(id=>`<button class="abtn ${s.seen.has(id)?'seen':''}" data-as="${id}"><span class="g">${AS[id].g}</span>${AS[id].l}</button>`).join('')}</div></div>`).join('')}
    <div class="findings">${s.findings.length?s.findings.map(f=>`<div class="find"><header><span>${f.rx?'ملاحظة علاجية':AS[f.id].l}</span><span class="mono">${fmtT(f.t)}</span></header>${f.rx?'':`<div>${f.txt}</div>`}${f.id==='breathing'?`<button class="btn" style="margin-top:6px;padding:4px 10px;font-size:.8rem" data-lung="1">استمع لأصوات التنفس</button>`:''}${f.p&&train()?`<div class="pearl"><b>ملاحظة تذكيرية: </b>${f.p}</div>`:''}</div>`).join(''):'<p class="muted small">نتائج الفحص ستظهر هنا.</p>'}</div>
    <div class="row"><button class="btn dark" data-go="2">التالي: تصنيف الحالة</button></div>`;
    return;}
  if(s.phase===2){
    const Q=[{k:'stab',q:'هل الحالة مستقرة أم غير مستقرة مبدئياً؟',o:[['stable','مستقرة'],['unstable','غير مستقرة']]},{k:'crit',q:'هل الحالة خطرة (تهدد الحياة أو حرجة بالوقت)؟',o:[['yes','نعم — خطرة'],['no','لا — غير خطرة حالياً']]}];
    el.innerHTML=`<h3>تصنيف الحالة<span class="sub">قرار مبني على تقييمك وليس على التشخيص النهائي</span></h3>
    ${Q.map(q=>{const a=s.ans[q.k],cor=sc[q.k].ans;return `<div class="q"><p>${q.q}</p><div class="opts">${q.o.map(([v,l])=>`<button class="opt ${a?(a===v?(train()?(v===cor?'right':'wrong'):'pick'):(train()&&v===cor?'right':'')):''}" data-q="${q.k}" data-v="${v}" ${a?'disabled':''}>${l}</button>`).join('')}</div>${a?(train()?`<div class="fb ${a===cor?'ok':'no'}">${a===cor?'صحيح. ':'غير صحيح. '}${sc[q.k].why}</div>`:'<div class="fb neutral">تم تسجيل الإجابة.</div>'):''}</div>`;}).join('')}
    <div class="row"><button class="btn dark" data-go="3">التالي: العلاج وقراءة ECG</button></div>`;
    return;}
  if(s.phase===3){
    const Q=sc.ecgQ,a=s.ans.ecg;const ready=Q.need==='ecg12'?s.seen.has('ecg12'):s.connected;
    el.innerHTML=`<h3>العلاج وقراءة ECG<span class="sub">اختر التدخلات من القائمة أدناه وراقب استجابة المريض</span></h3>
    ${Q.need==='ecg12'?(s.seen.has('ecg12')?`<div><p class="small muted">تخطيط 12-lead</p><div class="paperwrap"><canvas id="ecg12cv"></canvas></div></div>${s.seen.has('rightecg')&&sc.twelve.v4r!=null?`<div><p class="small muted">V4R (التخطيط الأيمن)</p><div class="paperwrap"><canvas id="v4rcv"></canvas></div></div>`:''}`:`<div class="q"><p>لم تسجل تخطيط 12-lead بعد.</p><button class="btn" data-as="ecg12">سجّل 12-lead الآن</button></div>`)
      :(s.connected?`<p class="small muted">اقرأ الإيقاع من شاشة المونيتور (Lead II).</p>`:`<div class="q"><p>المونيتور غير موصول.</p><button class="btn" data-as="monitor">وصّل المونيتور</button></div>`)}
    ${ready?`<div class="q"><p>ما قراءتك للتخطيط؟</p><div class="opts">${Q.opts.map(o=>`<button class="opt ${a?(a===o?(train()?(o===Q.ans?'right':'wrong'):'pick'):(train()&&o===Q.ans?'right':'')):''}" data-ecg="${o}" ${a?'disabled':''}><span class="ltr">${o}</span></button>`).join('')}</div>${a?(train()?`<div class="fb ${a===Q.ans?'ok':'no'}">${a===Q.ans?'صحيح. ':'غير صحيح. '}${Q.why}</div>`:'<div class="fb neutral">تم تسجيل الإجابة.</div>'):''}</div>`:''}
    <div class="row"><button class="btn dark" data-go="4">التالي: النقل والتسليم</button></div>`;
    if(Q.need==='ecg12'&&s.seen.has('ecg12'))requestAnimationFrame(()=>{const c=$('#ecg12cv');if(c)draw12(c,sc.twelve);const c2=$('#v4rcv');if(c2)draw12(c2,{...sc.twelve,st:{V4R:sc.twelve.v4r}},'V4R');});
    return;}
  if(s.phase===4){const a=s.ans.transport;
    el.innerHTML=`<h3>النقل والتسليم<span class="sub">اختر الوجهة ونوع التبليغ المسبق</span></h3>
    <div class="q"><p>إلى أين تنقل المريض؟</p><div class="opts">${sc.transport.map(o=>`<button class="opt ${a?(a===o.id?(train()?(o.ok?'right':'wrong'):'pick'):(train()&&o.ok?'right':'')):''}" data-tr="${o.id}" ${a?'disabled':''}>${o.l}</button>`).join('')}</div>
    ${a?(train()?(()=>{const o=sc.transport.find(x=>x.id===a);const c=sc.transport.find(x=>x.ok);return `<div class="fb ${o.ok?'ok':'no'}">${o.ok?'صحيح. '+o.why:'غير صحيح. '+o.why+' الأفضل: '+c.l+'.'}</div>`;})():'<div class="fb neutral">تم تسجيل الوجهة.</div>'):''}</div>
    <p class="small muted">يمكنك الاستمرار في العلاج أثناء النقل. عند الوصول للمستشفى اضغط إنهاء الحالة.</p>
    <div class="row"><button class="btn primary" data-act="finish" ${a?'':'disabled'}>الوصول للمستشفى — إنهاء الحالة وعرض التقييم</button></div>`;
  }
}
const RXG=[['airway','Airway','المجرى الهوائي',['jaw','htcl','suction','opa','sga','mils']],['breathing','Breathing','التنفس',['o2nc','o2nrb','bvm','cpap','neb','needle','occl']],['circ','Circulation','الدورة الدموية',['iv','ns','nsLarge','tq','pressure','pelvic']],['elec','Cardiac','الإنعاش والكهرباء',['cpr','defib','sync','pace','vagal']],['meds','Medications','الأدوية',null],['trauma','Trauma','الإصابات والبيئة',['smr','splint','warm','cool','burn','headup']]];
(()=>{const used=new Set(RXG.flatMap(g=>g[3]||[]));RXG.find(g=>g[0]==='meds')[3]=Object.keys(RX).filter(id=>!used.has(id));})();
function renderRx(){
  const s=SIM,el=$('#rxPanel');el.hidden=!s.arrived;if(!s.arrived)return;
  const g=RXG.find(x=>x[0]===s.rxTab)||RXG[0];
  el.innerHTML=`<h3>التدخلات العلاجية <span class="small muted" style="font-family:var(--f-body)">${train()?'متاحة في أي مرحلة — المريض يستجيب فوراً لكل قرار':'متاحة في أي مرحلة — التغذية الراجعة في التقرير'}</span></h3>
  <div class="rxtabs" role="tablist">${RXG.map(([k,en,ar,ids])=>{const n=ids.filter(id=>s.did.has(id)).length;return `<button role="tab" data-rxtab="${k}" aria-selected="${k===g[0]}"><b>${en}</b><span>${ar}${n?` <i>✓${n}</i>`:''}</span></button>`;}).join('')}</div>
  <div class="rxgrid">${g[3].map(id=>{const x=RX[id];return `<button class="rxb ${s.did.has(id)?'done':''}" data-rx="${id}" data-n="${s.cnt[id]>1?'×'+s.cnt[id]:'✓'}"><b>${x.l}</b><small>${x.d}</small></button>`;}).join('')}</div>`;
}
function renderPt(){
  const s=SIM;if(!s)return;const v=s.v,sc=s.sc,d=sc.dispatch;
  let tr='flat',tl='دون تغيّر';
  if(s.arrest){tr='down';tl='توقف قلب';}
  else if(s.bHist.length>20){const dlt=s.bHist.at(-1)-s.bHist[s.bHist.length-21];if(dlt<-3){tr='up';tl='يتحسن';}else if(dlt>3){tr='down';tl='يتدهور';}}
  const good=v.sbp>=100&&v.spo2>=94&&v.hr>=55&&v.hr<=110;
  const skin=s.arrest?'شاحب مزرق':good?'تحسن اللون والدفء':sc.skin;
  const br=s.arrest?(s.cprOn?'تهوية أثناء CPR':'لا يتنفس / شهقات'):v.rr>28?'سريع ومجهد':v.rr<10?'بطيء وسطحي':'منتظم';
  $('#ptCard').innerHTML=`<h3><span>المريض: ${d.sex}، ${d.age} سنة</span><span class="trend ${tr}">اتجاه الحالة: ${tr==='up'?'↑ ':tr==='down'?'↓ ':''}${tl}</span></h3>
  <dl class="ptgrid"><div><dt>الوعي</dt><dd>${s.arrest?'غير مستجيب':gcsTxt(v.gcs)}</dd></div><div><dt>الجلد</dt><dd>${skin}</dd></div><div><dt>التنفس</dt><dd>${br}</dd></div><div><dt>${s.seen.has('glucose')?'سكر الدم (آخر قياس)':'الإيقاع'}</dt><dd class="${s.seen.has('glucose')?'mono':'ltr'}">${s.seen.has('glucose')?r(v.glu)+' mg/dL':(s.connected?'على المونيتور':'المونيتور غير موصول')}</dd></div></dl>
  ${s.arrived?`<div class="lastmsg">${s.lastMsg||'وصلت إلى الموقع. ابدأ بتقييم سلامة المشهد.'}</div>`:'<div class="lastmsg">في الطريق إلى الموقع — اقرأ البلاغ وجهّز المعدات.</div>'}
  ${s.arrest?`<div class="row" style="margin-top:8px"><span class="pill bad">${s.cprOn?'CPR جارٍ':'لا CPR!'}</span><span class="pill">صدمات: ${s.shocks}</span><span class="pill">Epinephrine: ${s.epi}</span></div>`:''}`;
}
function renderLog(){const s=SIM;if(!s)return;$('#simLog').innerHTML=s.log.slice().reverse().map(l=>`<div><time>${fmtT(l.t)}</time><span class="${train()?'k-'+l.k:''}">${train()?l.full:l.m}</span></div>`).join('')||'<p class="muted small">لا أحداث بعد.</p>';}

/* ---------- trainer ---------- */
const GEN_CH=[
  {l:'VF',fx:s=>setRhythm(s,'vf'),m:'المريض فقد الوعي فجأة — لا نبض!'},
  {l:'Pulseless VT',fx:s=>setRhythm(s,'pvt'),m:'المريض فقد الوعي — تسرع عريض على الشاشة، لا نبض!'},
  {l:'Asystole',fx:s=>setRhythm(s,'asystole'),m:'المريض غير مستجيب — خط مستقيم على الشاشة!'},
  {l:'PEA',fx:s=>setRhythm(s,'pea'),m:'المريض غير مستجيب — إيقاع على الشاشة بلا نبض!'},
  {l:'هبوط الضغط',fx:s=>A(s,{sbp:-25,dbp:-15,hr:12}),m:'المريض يشعر بدوخة شديدة وأصبح شاحباً.'},
  {l:'انخفاض التشبع',fx:s=>A(s,{spo2:-10,rr:8}),m:'المريض يزداد ضيقاً في التنفس.'},
  {l:'قيء + قرقرة في المجرى',fx:s=>{s.flags.vomit=1;A(s,{spo2:-8});},m:'المريض تقيأ — صوت قرقرة في المجرى الهوائي!'}
];
function injectCh(c){const s=SIM;if(!s.arrived){toast('ابدأ الحالة أولاً','warn');return;}if(c.fx)c.fx(s);s.chLog.push({t:s.t,l:c.l});event(s,c.m||c.l,'bad');addLog('warn','(تحدٍّ من المدرب) '+c.l);renderPt();renderRx();}
function renderTrainer(){
  const s=SIM,sc=s.sc;
  $('#trBody').innerHTML=`
  <div><h4>الإجابات المتوقعة</h4><ul class="list small"><li>الاستقرار: <b>${sc.stab.ans==='stable'?'مستقرة':'غير مستقرة'}</b></li><li>الخطورة: <b>${sc.crit.ans==='yes'?'خطرة':'غير خطرة'}</b></li><li>التخطيط: <b class="ltr">${sc.ecgQ.ans}</b></li><li>النقل: <b>${sc.transport.find(x=>x.ok).l}</b></li></ul></div>
  <div><h4>النقاط الحرجة (تُحدَّث مباشرة)</h4><ul class="chk" id="trCrit"></ul></div>
  <div><h4>تحديات خاصة بالحالة</h4><div class="row">${sc.chal.map((c,i)=>`<button class="btn" data-ch="s${i}">${c.l}</button>`).join('')}</div></div>
  <div><h4>تحديات عامة</h4><div class="row">${GEN_CH.map((c,i)=>`<button class="btn" data-ch="g${i}">${c.l}</button>`).join('')}</div></div>
  <div><h4>تعديل الدرجة يدوياً</h4><div class="row"><button class="btn" data-adj="5">+5</button><button class="btn" data-adj="-5">−5</button><span class="mono small" id="trAdj">${s.adj>0?'+':''}${s.adj}</span></div></div>
  <div><h4>ملاحظات المدرب (تظهر في التقييم النهائي)</h4><textarea id="trNotes" placeholder="مثال: تواصل جيد مع الأسرة، تأخر في طلب المساندة...">${s.notes}</textarea></div>
  <div><h4>الإيقاع الحالي والعلامات</h4><p class="mono small ltr" id="trVit"></p></div>`;
  renderTrainerLive();
}
function renderTrainerLive(){const s=SIM;if(!s)return;const ul=$('#trCrit');if(ul)ul.innerHTML=s.sc.critical.map(c=>`<li class="${c.t(s)?'ok':''}">${c.l}</li>`).join('');
  const v=$('#trVit');if(v)v.textContent=`${RHY[s.rhythm].lbl} · HR ${r(s.v.hr)} · BP ${r(s.v.sbp)}/${r(s.v.dbp)} · SpO2 ${r(s.v.spo2)} · RR ${r(s.v.rr)} · GCS ${r(s.v.gcs)} · score ${s.score+s.adj}`;}

/* ---------- debrief ---------- */
function analyze(s){
  const sc=s.sc,items=[],good=[];const NEG=/^s=>\s*\(?!/;
  const why=id=>{try{const r0=sc.rx[id];const res=typeof r0==='function'?r0(s):r0;if(res&&res.k==='good'&&res.m)return res.m;}catch(_){}
    if(sc.fp&&sc.fp[id])return sc.fp[id];const lbl=RX[id]?RX[id].l.split(' ')[0]:null;const pl=lbl&&sc.protocol.find(p=>p.includes(lbl));if(pl)return pl;
    if(id==='tr')return (sc.transport.find(x=>x.ok)||{}).why;return 'راجع الخطة العلاجية المعتمدة في هذا التقرير.';};
  const negFail=sc.critical.filter(c=>NEG.test(c.t.toString())&&!c.t(s)),used=new Set();
  s.badList.forEach(b=>{let c=negFail.find(c=>c.t.toString().includes(`'${b.id}'`));if(!c)c=negFail.find(c=>!used.has(c));if(c)used.add(c);
    items.push({kind:'bad',pri:0,t:b.t,title:RX[b.id].l,did:`نفّذت «${RX[b.id].l}» عند ${fmtT(b.t)}`,exp:c?c.l:'تجنّب هذا الإجراء في هذا السياق، واتبع الخطة المعتمدة.',why:b.m});});
  const MAP={stable:'مستقرة',unstable:'غير مستقرة',yes:'خطرة',no:'غير خطرة'};
  [['stab','تصنيف الاستقرار'],['crit','تقدير الخطورة']].forEach(([k,l])=>{const a=s.ans[k];if(a!==sc[k].ans)items.push({kind:a?'bad':'miss',pri:2,t:s.at['q:'+k],title:l,did:a?`اخترت «${MAP[a]}» عند ${fmtT(s.at['q:'+k])}`:'لم تُجب',exp:`«${MAP[sc[k].ans]}»`,why:sc[k].why});});
  if(s.ans.ecg!==sc.ecgQ.ans)items.push({kind:s.ans.ecg?'bad':'miss',pri:2,t:s.at['q:ecg'],title:'قراءة التخطيط',did:s.ans.ecg?`اخترت «${s.ans.ecg}» عند ${fmtT(s.at['q:ecg'])}`:'لم تُجب',exp:`«${sc.ecgQ.ans}»`,why:sc.ecgQ.why});
  const trY=sc.transport.find(x=>x.id===s.ans.transport),trR=sc.transport.find(x=>x.ok);
  if(!trY||!trY.ok)items.push({kind:trY?'bad':'miss',pri:2,t:s.at.tr,title:'وجهة النقل',did:trY?`اخترت «${trY.l}» عند ${fmtT(s.at.tr)}`:'لم تُحدَّد',exp:trR.l,why:trY?trY.why:trR.why});
  sc.critical.forEach(c=>{const src=c.t.toString(),ok=!!c.t(s);
    const ids=[...src.matchAll(/(?:has\(s,'|s\.at\.|atA\(s,'|cnt\['a:)(\w+)/g)].map(m=>m[1]).filter(x=>x!=='tr'||src.includes('s.at.tr'));
    const times=ids.map(id=>s.at[id]??s.at['a:'+id]).filter(x=>x!=null);const t=times.length?Math.min(...times):null;
    if(ok){good.push({l:c.l,t});return;}
    if(/s\.ans\./.test(src)||NEG.test(src)||ids.some(id=>s.errIds.has(id)))return;
    const dl=(src.match(/<=\s*(\d+)/)||[])[1];const key=ids[0];
    if(t!=null&&!/cnt\[/.test(src))items.push({kind:'late',pri:3,t,title:c.l,did:`نُفّذ عند ${fmtT(t)}${dl&&+dl<9999?` — الحد المتوقع ${fmtT(+dl)}`:''}`,exp:c.l,why:why(key)});
    else items.push({kind:'miss',pri:1,title:c.l,did:'لم يُنفَّذ',exp:c.l,why:why(key)});});
  items.sort((a,b)=>a.pri-b.pri||(a.t??1e9)-(b.t??1e9));return{items,good};}
const KIND={bad:'غير مناسبة',miss:'لم تُنفَّذ',late:'تأخّرت أو بترتيب غير مناسب'};
function simEnd(){
  const s=SIM,sc=s.sc;s.over=true;$('#trainer').hidden=true;$('#toasts').innerHTML='';
  const crit=sc.critical.map(c=>({l:c.l,ok:!!c.t(s)}));
  const max=3+2*sc.relevant.length+2*sc.req.length+20+10+10+10*sc.ideal.length;
  const pct=clamp(r((s.score+s.adj)/max*100),0,100);
  const pct2=clamp(pct-crit.filter(c=>!c.ok).length*4,0,100);
  const grade=pct2>=85?'ممتاز':pct2>=75?'جيد جداً':pct2>=65?'جيد':'يحتاج تحسين';
  const outcome=s.arrest?'انتهت الحالة والمريض في توقف قلبي.':(s.v.sbp>=90&&s.v.spo2>=92&&s.v.gcs>=13)?'وصل المريض للمستشفى بحالة أكثر استقراراً.':'وصل المريض للمستشفى وما زال غير مستقر.';
  const {items,good}=analyze(s);
  const ansRow=(lbl,yours,right)=>`<tr><td>${lbl}</td><td>${yours??'<span class="muted">لم يُجب</span>'}</td><td>${right}</td><td>${yours===right?'<span class="pill ok">صحيح</span>':'<span class="pill bad">خطأ</span>'}</td></tr>`;
  const map={stable:'مستقرة',unstable:'غير مستقرة',yes:'خطرة',no:'غير خطرة'};
  const trY=sc.transport.find(x=>x.id===s.ans.transport),trR=sc.transport.find(x=>x.ok);
  const pearls=[...Object.values(sc.fp||{}),...(sc.pearls||[])];
  const pill=k=>`<span class="pill ${k==='bad'?'bad':k}">${KIND[k]}</span>`;
  const ref=sc.ref,pend='المرجع بانتظار مراجعة المدرب';
  $('#debrief').innerHTML=`
  <div class="simbar"><h2>تقرير الحالة: ${sc.title}</h2><span class="pill ${s.mode==='exam'?'bad':'ok'}">${s.mode==='exam'?'وضع الاختبار':'وضع التدريب'}</span></div>
  <div class="deb">
    <div class="card pad full"><div class="sum">
      <div><div class="score"><div class="big">${pct2}%</div><div><div class="grade">${grade}</div><p class="muted small">${outcome}</p><p class="muted small">الوقت في الحالة: <span class="mono">${fmtT(s.t)}</span></p></div></div>
        <p class="small" style="margin-top:10px"><b>الحالة:</b> ${sc.title}${s.chLog.length?` · <b>تحديات المدرب:</b> ${s.chLog.map(c=>c.l).join('، ')}`:''}</p>
        <div class="retry-row"><button class="btn primary big" data-act="again">أعد الحالة</button><button class="btn" data-act="otherMode">محاولة بوضع ${s.mode==='exam'?'التدريب':'الاختبار'}</button><button class="btn" data-act="pick">حالة أخرى</button></div></div>
      <div><h3>أهم قرارين يحتاجان مراجعة</h3><div class="top2" style="margin-top:8px">${items.slice(0,2).map(it=>`<div>${pill(it.kind)} <b>${it.title}</b><p class="small" style="margin-top:4px">${it.did}</p><p class="small muted">المتوقع: ${it.exp}</p></div>`).join('')||'<p class="muted">لا توجد قرارات تحتاج مراجعة في هذه المحاولة — أداء ممتاز.</p>'}</div></div>
    </div></div>
    <div class="card pad full"><h3>تحليل القرارات (${items.length})</h3><p class="muted small">مرتبة حسب الأهمية: الإجراءات غير المناسبة أولاً، ثم الخطوات الحرجة التي لم تُنفَّذ، ثم قرارات التصنيف والقراءة، ثم الخطوات المتأخرة.</p>
      <div class="ana" style="margin-top:10px">${items.map(it=>`<div class="ana-item ${it.kind}">${pill(it.kind)}<h4>${it.title}</h4><dl><dt>قرارك وتوقيته</dt><dd>${it.did}</dd><dt>المتوقع</dt><dd>${it.exp}</dd><dt>لماذا يهم</dt><dd>${it.why||'—'}</dd></dl></div>`).join('')||'<p class="muted">لا توجد ملاحظات.</p>'}</div></div>
    <div class="card pad"><h3>ما أنجزته من النقاط الحرجة</h3><ul class="chk" style="margin-top:8px">${good.map(g=>`<li class="ok"><span>${g.l}${g.t!=null?` <span class="mono muted">${fmtT(g.t)}</span>`:''}</span></li>`).join('')||'<li class="no">لم تتحقق أي نقطة حرجة.</li>'}</ul></div>
    <div class="card pad"><h3>سجل الأخطاء والملاحظات</h3>${s.errs.length?`<ul class="list" style="margin-top:8px">${s.errs.map(e=>`<li>${e}</li>`).join('')}</ul>`:'<p class="muted" style="margin-top:8px">لا أخطاء مسجلة.</p>'}${s.notes?`<div class="pearl" style="margin-top:10px"><b>ملاحظات المدرب: </b>${s.notes.replace(/</g,'&lt;')}</div>`:''}</div>
    <div class="card pad full"><h3>قراراتك مقارنة بالمتوقع</h3><div class="tblwrap"><table class="cmp" style="margin-top:6px"><thead><tr><th>القرار</th><th>إجابتك</th><th>المتوقع</th><th></th></tr></thead><tbody>
      ${ansRow('الاستقرار',map[s.ans.stab],map[sc.stab.ans])}${ansRow('الخطورة',map[s.ans.crit],map[sc.crit.ans])}
      ${ansRow('قراءة التخطيط',s.ans.ecg?`<span class="ltr">${s.ans.ecg}</span>`:null,`<span class="ltr">${sc.ecgQ.ans}</span>`)}
      <tr><td>وجهة النقل</td><td>${trY?trY.l:'<span class="muted">لم يُحدد</span>'}</td><td>${trR.l}</td><td>${trY&&trY.ok?'<span class="pill ok">صحيح</span>':'<span class="pill bad">خطأ</span>'}</td></tr>
    </tbody></table></div>
    <p class="small muted" style="margin-top:8px">${sc.stab.why} ${sc.ecgQ.why}</p></div>
    <div class="card pad full chart"><h3>العلامات الحيوية خلال الحالة</h3>${chartSVG(s.hist)}</div>
    <div class="card pad"><h3>الخطة العلاجية المعتمدة ميدانياً</h3><ol class="list" style="margin-top:8px">${sc.protocol.map(p=>`<li>${p}</li>`).join('')}</ol>
      <h4 style="margin:14px 0 6px">المرجع</h4><dl class="kv" style="border:1px solid var(--line);border-radius:8px;overflow:hidden"><dt>البروتوكول أو المرجع</dt><dd>${ref&&ref.name?ref.name:pend}</dd><dt>الإصدار</dt><dd>${ref&&ref.ver?ref.ver:'—'}</dd><dt>تاريخ المراجعة</dt><dd>${ref&&ref.date?ref.date:'—'}</dd></dl></div>
    <div class="card pad"><h3>ملاحظات تذكيرية</h3><div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${pearls.map(p=>`<div class="pearl" style="margin:0">${p}</div>`).join('')}</div></div>
    <div class="card pad full"><h3>التسلسل الزمني الكامل</h3><div class="log" style="max-height:none;margin-top:6px">${s.log.map(l=>`<div><time>${fmtT(l.t)}</time><span class="k-${l.k}">${l.full}</span></div>`).join('')}</div></div>
  </div>`;
  $('#sim').hidden=true;$('#debrief').hidden=false;window.scrollTo(0,0);
}
function chartSVG(h){
  if(h.length<2)return '<p class="muted">لا بيانات كافية.</p>';
  const W=640,H=200,pl=34,pr=10,pt=10,pb=24,maxT=h.at(-1).t||1;
  const x=t=>pl+(t/maxT)*(W-pl-pr),y=v=>pt+(1-v/200)*(H-pt-pb);
  const line=(k,col)=>{let d='';h.forEach((p,i)=>{if(p[k]==null){return;}d+=(d?'L':'M')+x(p.t).toFixed(1)+' '+y(p[k]).toFixed(1);});return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`;};
  let grid='';[0,50,100,150,200].forEach(v=>{grid+=`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-6}" y="${y(v)+4}" font-size="10" text-anchor="end" fill="var(--muted)" font-family="JetBrains Mono">${v}</text>`;});
  const steps=5;for(let i=0;i<=steps;i++){const t=maxT*i/steps;grid+=`<text x="${x(t)}" y="${H-6}" font-size="10" text-anchor="middle" fill="var(--muted)" font-family="JetBrains Mono">${fmtT(t)}</text>`;}
  let ar='';h.forEach((p,i)=>{if(p.arrest&&i<h.length-1)ar+=`<rect x="${x(p.t)}" y="${pt}" width="${x(h[i+1].t)-x(p.t)}" height="${H-pt-pb}" fill="var(--bad-soft)"/>`;});
  return `<div class="legend" style="margin:6px 0"><span><i style="background:var(--ch-hr)"></i>HR</span><span><i style="background:var(--ch-bp)"></i>SBP</span><span><i style="background:var(--ch-sp)"></i>SpO₂</span><span><i style="background:var(--bad-soft);height:10px"></i>توقف قلب</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="منحنى العلامات الحيوية" dir="ltr">${ar}${grid}${line('hr','var(--ch-hr)')}${line('sbp','var(--ch-bp)')}${line('spo2','var(--ch-sp)')}</svg>`;
}

/* ---------- sim events ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.view){setView(b.dataset.view);return;}
  if(b.closest('#scFilter')&&b.dataset.f){$$('#scFilter button').forEach(x=>x.setAttribute('aria-selected',x===b));renderPicker(b.dataset.f);return;}
  if(b.dataset.sc){openSimStart(b.dataset.sc);return;}
  if(b.dataset.start){const o=START;$('#startOvl').hidden=true;START=null;if(o&&b.dataset.start!=='cancel')o.run(b.dataset.start);return;}
  if(b.dataset.act==='firstrun'){startSim('hypo','train',{tutorial:true});return;}
  const s=SIM;
  if(b.dataset.eq&&s&&!s.arrived){s.brought.has(b.dataset.eq)?s.brought.delete(b.dataset.eq):s.brought.add(b.dataset.eq);renderPhase();return;}
  if(b.dataset.act==='arrive'){s.arrived=true;SFX.siren();s.sc.req.forEach(q=>{if(s.brought.has(q))s.score+=2;});const miss=s.sc.req.filter(q=>!s.brought.has(q));addLog('info',`الوصول للموقع — المعدات: ${[...s.brought].map(x=>EQL[x]).join('، ')||'لا شيء'}`);if(train()&&miss.length)toast('تنبيه: قد تحتاج معدات لم تحضرها','warn');goPhase(1);renderRx();renderPt();return;}
  if(b.dataset.go){goPhase(+b.dataset.go);return;}
  if(b.dataset.tut&&s&&s.tut){if(b.dataset.tut==='skip')s.tut.skip=true;else s.tut.seen.add(+b.dataset.i);renderPhase();return;}
  if(b.dataset.rxtab&&s){s.rxTab=b.dataset.rxtab;renderRx();return;}
  if(b.dataset.act==='jumprx'){$('#rxPanel').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(b.dataset.step){goPhase(+b.dataset.step);return;}
  if(b.dataset.as){assess(b.dataset.as);if(s.phase===3)renderPhase();return;}
  if(b.dataset.rx){doRx(b.dataset.rx);return;}
  if(b.dataset.q){const k=b.dataset.q;if(s.ans[k])return;s.ans[k]=b.dataset.v;s.at['q:'+k]=s.t;const ok=b.dataset.v===s.sc[k].ans;s.score+=ok?10:-5;if(!ok)s.errs.push(k==='stab'?'تصنيف الاستقرار غير صحيح.':'تقدير الخطورة غير صحيح.');addLog(ok?'good':'bad',`التصنيف: ${b.textContent}`);renderPhase();return;}
  if(b.dataset.ecg){if(s.ans.ecg)return;s.ans.ecg=b.dataset.ecg;s.at['q:ecg']=s.t;const ok=s.ans.ecg===s.sc.ecgQ.ans;s.score+=ok?10:-5;if(!ok)s.errs.push(`قراءة التخطيط: اخترت ${s.ans.ecg} والصحيح ${s.sc.ecgQ.ans}.`);addLog(ok?'good':'bad','قراءة التخطيط: '+s.ans.ecg);renderPhase();return;}
  if(b.dataset.tr){if(s.ans.transport)return;s.ans.transport=b.dataset.tr;s.at.tr=s.t;const o=s.sc.transport.find(x=>x.id===b.dataset.tr);s.score+=o.ok?10:-10;if(!o.ok)s.errs.push('وجهة النقل: '+o.why);addLog(o.ok?'good':'bad','قرار النقل: '+o.l);renderPhase();return;}
  if(b.dataset.act==='finish'){simEnd();return;}
  if(b.dataset.act==='again'){startSim(s.sc.id,s.mode);return;}
  if(b.dataset.act==='otherMode'){startSim(s.sc.id,s.mode==='exam'?'train':'exam');return;}
  if(b.dataset.act==='pick'){showPicker();return;}
  if(b.dataset.ch){const c=b.dataset.ch[0]==='s'?s.sc.chal[+b.dataset.ch.slice(1)]:GEN_CH[+b.dataset.ch.slice(1)];injectCh(c);return;}
  if(b.dataset.adj){s.adj+=+b.dataset.adj;$('#trAdj').textContent=(s.adj>0?'+':'')+s.adj;addLog('info',`(المدرب) تعديل الدرجة ${b.dataset.adj>0?'+':''}${b.dataset.adj}`);return;}
});
document.addEventListener('input',e=>{if(e.target.id==='trNotes'&&SIM)SIM.notes=e.target.value;});
$('#simPause').onclick=()=>{const s=SIM;if(!s)return;s.paused=!s.paused;$('#simPause').textContent=s.paused?'استئناف':'إيقاف مؤقت';};
$('#simTrainer').onclick=()=>{const t=$('#trainer');t.hidden=!t.hidden;if(!t.hidden)renderTrainer();};
$('#trClose').onclick=()=>{$('#trainer').hidden=true;};
$('#simRestart').onclick=()=>{if(SIM)openSimStart(SIM.sc.id);};
let START=null;
function openStart(o){START=o;$('#stBody').innerHTML=`<div><span class="pill">${o.kind}</span><h2 id="stTitle" style="margin-top:6px">${o.title}</h2><p class="muted" style="margin-top:4px">${o.sub}</p></div>
  <div class="modes"><div class="mode"><h3>وضع التدريب</h3><ul><li>إرشاد «المطلوب الآن» محدد لكل مرحلة</li><li>تعليق فوري على كل قرار وملاحظات تذكيرية</li><li>لوحة المدرب متاحة</li><li>تقرير مفصل في النهاية</li></ul><button class="btn primary" data-start="train">ابدأ التدريب</button></div>
  <div class="mode exam"><h3>وضع الاختبار</h3><ul><li>عنوان محايد بصيغة بلاغ — التشخيص مخفي</li><li>ترى نتائج الفحوص واستجابة المريض فقط</li><li>لا تلميحات ولا تعليق صواب أو خطأ حتى التقرير</li><li>لوحة المدرب مخفية</li></ul><button class="btn dark" data-start="exam">ابدأ الاختبار</button></div></div>
  <p class="small muted">يُثبَّت الوضع عند البدء. لتغييره ابدأ محاولة جديدة.</p><button class="btn ghost" data-start="cancel" style="align-self:flex-start">إلغاء</button>`;
  $('#startOvl').hidden=false;setTimeout(()=>{const f=$('#stBody [data-start="train"]');if(f)f.focus();},30);}
function openSimStart(id){const sc=SC.find(x=>x.id===id);openStart({kind:(sc.cat==='medical'?'حالة طبية':'حالة إصابة')+' · '+sc.level,title:sc.nt,sub:`${sc.dispatch.sex}، ${sc.dispatch.age} سنة — ${sc.dispatch.cc}`,run:m=>startSim(id,m)});}
function openMcStart(id){const c=MC_CASES[id];openStart({kind:'ACLS Megacode',title:c.nt,sub:`${c.who} — ${c.story}`,run:m=>{setView('mega');mcStart(id,m);}});}
$('#startOvl').addEventListener('click',e=>{if(e.target.id==='startOvl'){$('#startOvl').hidden=true;START=null;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#startOvl').hidden){$('#startOvl').hidden=true;START=null;}});
$('#simExit').onclick=e=>{const b=e.currentTarget;if(b.dataset.c){delete b.dataset.c;b.textContent='خروج';showPicker();}else{b.dataset.c=1;b.textContent='تأكيد الخروج؟';setTimeout(()=>{if(b.dataset.c){delete b.dataset.c;b.textContent='خروج';}},3000);}};
function showPicker(){if(SIM)SIM.over=true;$('#sim').hidden=true;$('#debrief').hidden=true;$('#trainer').hidden=true;$('#picker').hidden=false;window.scrollTo(0,0);}
function renderPicker(f='all'){
  $('#scGrid').innerHTML=SC.filter(x=>f==='all'||x.cat===f).map(x=>`<button class="scard" data-sc="${x.id}"><div class="row"><span class="pill ${x.cat==='medical'?'med':'tra'}">${x.cat==='medical'?'حالة طبية':'حالة إصابة'}</span><span class="pill">${x.level}</span></div><h3>${x.nt}</h3><p>${x.dispatch.sex}، ${x.dispatch.age} سنة — ${x.dispatch.cc}</p></button>`).join('');
}
/* ---------- mode / view ---------- */
function setView(v){APP.view=v;$$('.tabs[role=tablist] button').forEach(b=>b.setAttribute('aria-selected',b.dataset.view===v));['sim','mega','check','amb3d'].forEach(x=>$('#view-'+x).hidden=x!==v);if(v==='amb3d')requestAnimationFrame(()=>{if(A3.photo){a3SetPhoto(true);}else initAmb3D();});try{localStorage.setItem('amb-view',v);}catch(_){}window.scrollTo(0,0);}

/* ---------- MEGACODE ---------- */
const MC_CASES={
  vf:{nt:'توقف قلب مشهود في مركز تسوق',title:'VF — توقف قلب مشهود',who:'رجل، 62 سنة',story:'انهار فجأة في مركز تسوق بعد أن اشتكى من ألم في الصدر. أحد المارة بدأ CPR، ووصلتم بعد 6 دقائق من الانهيار.',start:'vf',pads:false,rule:'vf',ht:{coronary:'ألم صدر قبل الانهيار ← اشتباه احتشاء (Thrombosis, coronary). بعد ROSC: 12-lead ونقل لمركز PCI.'},tags:['VF','Shock','Epi','Amiodarone']},
  pea:{nt:'انهيار مريضة غسيل كلوي',title:'PEA — مريضة غسيل كلوي',who:'سيدة، 55 سنة',story:'مريضة فشل كلوي على الغسيل فاتتها جلستان، اشتكت من ضعف عام ثم انهارت أمام أسرتها قبل 3 دقائق. لا يوجد CPR من المارة.',start:'pea',pads:false,rule:'hyperk',fix:m=>m.ca>0,fixMsg:'لم يُعالج السبب العكسي (فرط البوتاسيوم) — PEA لا يُعالج بالصدمات بل بإيجاد السبب.',ht:{hyperk:'فشل كلوي + فوات الغسيل + QRS عريض جداً ← اشتباه فرط بوتاسيوم: Calcium chloride 1 g IV وSodium bicarbonate حسب البروتوكول.'},tags:['PEA','Hs & Ts','Hyperkalemia']},
  pvt:{nt:'فقدان وعي داخل الإسعاف',title:'Pulseless VT — توقف داخل الإسعاف',who:'رجل، 45 سنة',story:'كان على المونيتور داخل الإسعاف بسبب خفقان، ثم فقد الوعي فجأة. المونيتور موصول والوسادات ملصقة.',start:'pvt',pads:true,rule:'pvt',ht:{},tags:['pVT','Monitored arrest','Early shock']},
  drown:{nt:'غريق في مسبح',title:'Asystole — غرق في مسبح',who:'رجل، 30 سنة',story:'أُخرج من قاع مسبح بعد نحو 8 دقائق تحت الماء. لا يوجد CPR من المارة. لا يتنفس ولا نبض.',start:'asystole',pads:false,rule:'cause',fix:m=>m.sga,fixMsg:'لم يُعالج السبب: في الغرق نقص الأكسجين هو سبب التوقف — يحتاج تهوية فعالة ومجرى هوائي مبكراً.',ht:{hypoxia:'الغرق = توقف بسبب نقص الأكسجين ← الأولوية للتهوية: مجرى متقدم مبكراً مع O₂ 100%، ثم Epinephrine.',hypoth:'ماء المسبح ليس بارداً جداً — انخفاض الحرارة غير مرجح هنا، لكن جفف المريض.'},tags:['Asystole','Hypoxia','Drowning']},
  bleedpea:{nt:'فقد النبض بعد حادث دراجة',title:'PEA — نزيف بعد حادث',who:'رجل، 38 سنة',story:'سائق دراجة نارية بعد حادث، كسر مفتوح في الفخذ ونزيف كبير على الأرض (طُبق تورنيكيت متأخراً). فقد النبض أمامكم.',start:'pea',pads:false,rule:'cause',fix:m=>(m.fluids||0)>=2,fixMsg:'لم يُعالج السبب: النزيف ونقص الحجم يحتاجان تعويض حجم سريعاً (دم أو سوائل) — الأدوية وحدها لا تكفي.',ht:{hypovol:'نزيف كبير + كسر مفتوح ← Hypovolemia: تعويض حجم سريع (boluses متكررة أو دم حسب البروتوكول) مع السيطرة على النزيف.',tension:'لا علامات إصابة صدرية — غير مرجح.'},tags:['PEA','Hypovolemia','Trauma arrest']}
};
const HT=[['hypovol','Hypovolemia'],['hypoxia','Hypoxia'],['acid','H⁺ (Acidosis)'],['hyperk','Hypo/Hyperkalemia'],['hypoth','Hypothermia'],['tension','Tension pneumothorax'],['tamp','Tamponade'],['tox','Toxins'],['pe','Thrombosis, pulmonary'],['coronary','Thrombosis, coronary']];
const POST=[['oxy','عايِر الأكسجين: SpO₂ 92–98%'],['vent','تهوية 10/د، EtCO₂ 35–45 — تجنب فرط التهوية'],['bp','SBP ≥ 90 / MAP ≥ 65 — سوائل أو رافعات ضغط'],['ecg','12-lead ECG فوراً'],['glu','قياس السكر'],['dest','النقل لمركز PCI / رعاية ما بعد التوقف']];
let MC=null,monMc=null;
function mcStart(id,mode='train'){const c=MC_CASES[id];if(monMc){monMc.nibp=null;monMc.nibpT=50;}
  MC={id,c,t:0,speed:1,cprOn:false,auto:true,taps:[],lastTap:0,compT:0,rateOkT:0,pauseCur:0,pauses:[],cycleStart:0,everCPR:false,cprStartT:null,
    rhythm:c.start,pads:c.pads,roscPending:false,rosc:false,charged:false,shocks:0,epiT:[],amio:[],lido:0,ca:0,bicarb:0,iv:false,sga:false,capno:false,
    ht:new Set(),checks:0,checking:false,pendingShock:false,needResume:false,resumeFrom:null,log:[],errs:[],post:new Set(),over:false,etco2:4,paused:false,compressing:false,firstShock:null,lastMsg:''};
  $('#mcPick').hidden=true;$('#mcDeb').hidden=true;$('#mcRun').hidden=false;MC.mode=mode;$('#mcTitle').textContent=mode==='exam'?c.nt:c.title;const mm=$('#mcMode');mm.textContent=mode==='exam'?'وضع الاختبار':'وضع التدريب';mm.className='pill '+(mode==='exam'?'bad':'ok');$('#toasts').innerHTML='';
  $$('#mcSpeed button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sp==='1'));
  mcLog('info',`${c.who}: ${c.story}`);renderMcCtl();mcLive(true);window.scrollTo(0,0);}
function mcLog(k,m){MC.log.push({t:MC.t,k,m});MC.lastMsg=m;const el=$('#mcLog');if(el)el.innerHTML=MC.log.slice().reverse().map(l=>`<div><time>${fmtT(l.t)}</time><span class="k-${l.k}">${l.m}</span></div>`).join('');}
function mcErr(m,judge=true){MC.errs.push(m);if(MC.mode==='exam'&&judge){SFX.tick();return;}mcLog('bad',m);toast(m,'bad');SFX.bad();}
function mcX(ex){if(MC.mode==='exam')mcLog('info',ex);}
function mcOK(m,ex){if(MC.mode==='exam'){mcLog('info',ex||m);SFX.tick();return;}mcLog('good',m);toast(m,'good');SFX.ok();}
function mcNote(m,k='warn',ex){if(MC.mode==='exam'){if(ex)mcLog('info',ex);return;}mcLog(k,m);toast(m,k);}
const shockable=()=>MC.rhythm==='vf'||MC.rhythm==='pvt';
function mcRate(){if(MC.auto)return 110;const ts=MC.taps.filter(x=>performance.now()-x<3500);if(ts.length<3)return 0;const iv=[];for(let i=1;i<ts.length;i++)iv.push(ts[i]-ts[i-1]);return r(60000/(iv.reduce((a,b)=>a+b,0)/iv.length));}
const inRange=x=>x>=100&&x<=120;
function mcCCF(){return MC.t>0?MC.compT/MC.t:0;}
function mcQuality(){return mcCCF()>=.6&&(MC.auto||MC.compT===0||MC.rateOkT/MC.compT>=.6);}
setInterval(()=>{
  if(!MC||MC.over||MC.paused||APP.view!=='mega')return;
  const dt=.2*MC.speed;MC.t+=dt;
  const now=performance.now();const comp=MC.cprOn&&(MC.auto||now-MC.lastTap<1300);MC.compressing=comp;
  if(!MC.rosc){
    if(comp){MC.compT+=dt;if(MC.auto||inRange(mcRate()))MC.rateOkT+=dt;if(MC.pauseCur>0){if(MC.pauseCur>=2)MC.pauses.push(MC.pauseCur);MC.pauseCur=0;}}
    else MC.pauseCur+=dt;
  }
  const good=MC.auto||inRange(mcRate());
  if(MC.cprOn&&!MC.rosc&&MC.t-MC.cycleStart>=120&&MC.cycAlert!==MC.cycleStart){MC.cycAlert=MC.cycleStart;SFX.cycle();say('Two minutes. Check rhythm.');}
  const tgt=MC.rosc?38:MC.roscPending?(comp?44:40):comp?(good?18:9):3;
  MC.etco2+=(tgt-MC.etco2)*.15;
  if(!MC.rosc&&MC.t>=1800){mcEnd(false,'مرت 30 دقيقة دون ROSC.');return;}
  mcLive();
},200);
function mcSrc(){if(!MC)return null;const rh=MC.rhythm;const pulse=MC.rosc||MC.roscPending;
  return{hideRhythm:MC.mode==='exam',connected:MC.pads,rhythm:rh,capno:MC.capno,clock:fmtT(MC.t),cpr:{on:MC.compressing,rate:mcRate()||110},
    v:{hr:rh==='pvt'?180:rh==='pea'?36:rh==='sinustach'?112:0,sbp:pulse?102:0,dbp:pulse?64:0,spo2:MC.rosc?95:MC.roscPending?90:0,rr:MC.rosc?12:10,etco2:MC.etco2,temp:36.5}};}
function mcCoach(){
  const m=MC,cyc=m.t-m.cycleStart;
  if(m.rosc)return 'ROSC! نفّذ رعاية ما بعد الإنعاش من القائمة.';
  if(m.checking)return 'حدد نوع الإيقاع خلال أقل من 10 ثوانٍ.';
  if(m.charging)return 'الجهاز يشحن… استمر في الضغطات حتى يكتمل الشحن.';
  if(m.charged)return 'الجهاز مشحون: أوقف الضغطات، أعلن «ابتعدوا!» وتأكد بالنظر، ثم اضغط صدمة.';
  if(m.c.start==='pvt'&&m.shocks===0&&m.checks===0)return 'توقف مشهود على المونيتور والوسادات ملصقة: حلّل الإيقاع واصدم فوراً.';
  if(!m.everCPR)return 'ابدأ CPR فوراً (30:2) واطلب من زميلك لصق الوسادات.';
  if(!m.pads)return 'ألصق وسادات الجهاز مع استمرار الضغطات.';
  if(m.needResume&&!m.cprOn)return 'استأنف CPR فوراً — لا تفحص النبض الآن.';
  if(m.pendingShock)return 'إيقاع قابل للصدم: اشحن 200 J (يمكن الشحن أثناء الضغطات).';
  if(m.checks===0)return 'حلّل الإيقاع الأول الآن.';
  if(!m.cprOn)return 'لا توجد ضغطات! كل ثانية بدون CPR تقلل فرص النجاة.';
  if(!m.iv)return 'افتح IV أو IO مع استمرار الضغطات.';
  const lastE=m.epiT.at(-1);
  if(shockable()){
    if(m.shocks>=2&&!m.epiT.length)return 'أعطِ Epinephrine 1 mg IV/IO الآن (بعد الصدمة الثانية).';
    if(m.shocks>=3&&!m.amio.length&&!m.lido)return 'أعطِ Amiodarone 300 mg IV/IO (بعد الصدمة الثالثة).';
  }else if(!m.epiT.length)return 'إيقاع غير قابل للصدم: Epinephrine 1 mg IV/IO في أسرع وقت.';
  if(lastE!=null&&m.t-lastE>=180)return 'حان موعد Epinephrine (كل 3–5 دقائق).';
  if(!m.ht.size)return 'راجع الأسباب العكسية Hs & Ts من القصة والفحص.';
  if(!m.sga)return 'فكّر في مجرى هوائي متقدم + Capnography لمراقبة جودة CPR.';
  if(cyc>=120)return 'مرت دقيقتان: حلّل الإيقاع الآن وبدّل الضاغط.';
  return `استمر في CPR عالي الجودة — باقي ${r(Math.max(0,120-cyc))} ثانية على تحليل الإيقاع.`;
}
function renderMcCtl(){
  const m=MC;
  $('#mcCtl').innerHTML=`
  <div class="card pad"><h3>الضغطات الصدرية</h3>
    <div class="cprbox" style="margin-top:10px">
      <button class="pad-btn" id="mcPad" aria-label="ضغطة صدرية">اضغط<br><small>أو مسطرة المسافة</small></button>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div class="row"><button class="btn primary" id="mcCpr"></button><label class="small"><input type="checkbox" id="mcAuto" ${m.auto?'checked':''}> ضغطات تلقائية مثالية</label></div>
        <div class="row small"><label><input type="checkbox" id="mcMetro" ${AUD.metro?'checked':''}> مترونوم 110/د</label><label><input type="checkbox" id="mcVoice" ${AUD.voice?'checked':''}> أوامر الجهاز الصوتية</label></div>
        <div class="meters"><div class="meter" id="mtRate"><b>المعدل /د</b><span>--</span></div><div class="meter" id="mtCCF"><b>CCF</b><span>--</span></div><div class="meter" id="mtPause"><b>توقف حالي</b><span>0</span></div></div>
      </div>
    </div>
    <p class="small muted" style="margin-top:8px">الهدف: 100–120/د، عمق 5–6 سم، ارتداد كامل، CCF ≥ 80% والتوقف أقل من 10 ثوانٍ. ألغِ «تلقائية» واضغط بإيقاع ثابت لتقيس معدلك.</p>
  </div>
  <div class="card pad"><h3>الدورة (دقيقتان)</h3>
    <div class="row" style="margin-top:8px"><div class="cycle" id="mcCyc" style="flex:1;min-width:140px"><i></i></div><span class="mono" id="mcCycT">0:00</span></div>
    <div class="bigbtns" style="margin-top:10px">
      <button class="btn" data-mc="pads">لصق الوسادات</button>
      <button class="btn dark" data-mc="check">تحليل الإيقاع</button>
      <button class="btn" data-mc="pulse">فحص النبض</button>
    </div>
    <div id="mcQ" hidden class="q" style="margin-top:10px"><p>ما الإيقاع على الشاشة؟</p><div class="opts">
      <button class="opt" data-mca="shock">قابل للصدم (VF / pVT)</button>
      <button class="opt" data-mca="non">غير قابل للصدم (Asystole / PEA)</button>
      <button class="opt" data-mca="org">إيقاع منظم — افحص النبض</button></div></div>
  </div>
  <div class="card pad"><h3>جهاز الصدمات</h3>
    <div class="bigbtns" style="margin-top:8px"><span class="pill" style="justify-content:center;font-family:var(--f-mono)">200 J Biphasic</span><button class="btn" data-mc="charge" id="mcCharge">شحن</button><button class="btn shock" data-mc="shock">صدمة</button></div>
  </div>
  <div class="card pad"><h3>الأدوية والمجرى الهوائي</h3>
    <div class="bigbtns" style="margin-top:8px">
      <button class="btn" data-mc="iv">IV / IO</button><button class="btn" data-mc="sga">i-gel + تهوية</button><button class="btn" data-mc="capno">Capnography</button>
      <button class="btn" data-mc="epi"><span class="ltr">Epinephrine 1 mg</span></button><button class="btn" data-mc="amio300"><span class="ltr">Amiodarone 300</span></button><button class="btn" data-mc="amio150"><span class="ltr">Amiodarone 150</span></button>
      <button class="btn" data-mc="lido"><span class="ltr">Lidocaine 1.5 mg/kg</span></button><button class="btn" data-mc="ca"><span class="ltr">CaCl 1 g</span></button><button class="btn" data-mc="bicarb"><span class="ltr">NaHCO₃ 50 mEq</span></button><button class="btn" data-mc="ns"><span class="ltr">NS bolus 500 mL</span></button>
    </div>
  </div>
  <div class="card pad"><h3>الأسباب العكسية Hs & Ts</h3><div class="ht" style="margin-top:8px">${HT.map(([id,l])=>`<button data-ht="${id}" class="${m.ht.has(id)?'on':''}">${l}</button>`).join('')}</div></div>
  <div class="card pad" id="mcPost" hidden><h3>رعاية ما بعد الإنعاش</h3><div class="opts" style="margin-top:8px">${POST.map(([id,l])=>`<button class="opt" data-post="${id}">${l}</button>`).join('')}</div><button class="btn primary" style="margin-top:10px" data-mc="finish">إنهاء والتقييم</button></div>`;
  $('#mcAuto').onchange=e=>{MC.auto=e.target.checked;if(!MC.auto&&MC.speed>1){MC.speed=1;$$('#mcSpeed button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sp==='1'));toast('السرعة رجعت ×1 للضغط اليدوي','info');}};
  $('#mcPad').addEventListener('pointerdown',e=>{e.preventDefault();mcTap();});
  $('#mcCpr').onclick=mcCpr;
  $('#mcMetro').onchange=e=>{AUD.metro=e.target.checked;};$('#mcVoice').onchange=e=>{AUD.voice=e.target.checked;if(!AUD.voice)try{speechSynthesis.cancel();}catch(_){}};
  mcLive(true);
}
function mcTap(){if(!MC||MC.over||!MC.cprOn)return;MC.taps.push(performance.now());if(MC.taps.length>12)MC.taps.shift();MC.lastTap=performance.now();const p=$('#mcPad');p.classList.add('hit');setTimeout(()=>p.classList.remove('hit'),80);}
document.addEventListener('keydown',e=>{if(e.code==='Space'&&APP.view==='mega'&&MC&&!MC.over&&!$('#mcRun').hidden&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();mcTap();}});
function mcCpr(){const m=MC;if(m.over)return;if(m.rosc){mcErr('المريض لديه نبض — لا CPR.',false);return;}
  if(m.checking){m.checking=false;$('#mcQ').hidden=true;}
  m.cprOn=!m.cprOn;
  if(m.cprOn){if(!m.everCPR){m.everCPR=true;m.cprStartT=m.t;mcOK('بدء CPR.');}
    if(m.needResume){const d=m.t-m.resumeFrom;if(d>10)m.errs.push(`تأخر استئناف CPR ${r(d)} ثانية بعد الصدمة/التحليل.`);m.needResume=false;m.cycleStart=m.t;}
    else if(m.checks===0&&m.shocks===0)m.cycleStart=m.t;
    if(!m.auto)m.lastTap=performance.now();
  }else mcLog('warn','إيقاف الضغطات.');
  mcLive(true);}
function mcAct(a){const m=MC;if(m.over)return;const ex=m.mode==='exam';
  if(a==='pads'){if(m.pads)return toast('الوسادات ملصقة بالفعل','info');m.pads=true;mcOK('تم لصق الوسادات — الإيقاع على الشاشة.','تم لصق الوسادات.');}
  if(a==='check'){if(!m.pads){mcErr('ألصق الوسادات أولاً — لا يمكن تحليل الإيقاع.',false);return;}if(m.checking||m.rosc)return;
    const cyc=m.t-m.cycleStart;if(m.checks>0&&m.cprOn&&cyc<90){m.errs.push(`تحليل الإيقاع بعد ${r(cyc)} ثانية فقط — الدورة دقيقتان دون مقاطعة.`);mcNote(`تحليل مبكر (${r(cyc)} ث) — الدورة دقيقتان.`);}
    m.cprOn=false;m.checks++;m.checking=true;say('Analyzing heart rhythm. Do not touch the patient.');
    if(m.c.fix&&!m.roscPending){if(m.c.fix(m)&&m.epiT.length&&mcQuality()){m.rhythm='sinustach';m.roscPending=true;}else if(m.checks>=4&&!m.c.fix(m)&&m.rhythm==='pea'){m.rhythm='asystole';if(!ex)mcLog('bad','تحول الإيقاع إلى Asystole — السبب العكسي لم يُعالج.');}}
    $('#mcQ').hidden=false;$$('#mcQ .opt').forEach(o=>{o.disabled=false;o.className='opt';});mcLog('info','إيقاف الضغطات لتحليل الإيقاع.');}
  if(a==='pulse'){m.cprOn=false;if(m.checking){m.checking=false;$('#mcQ').hidden=true;}
    if(m.rhythm==='sinustach'&&m.roscPending){m.rosc=true;m.roscT=m.t;SFX.rosc();mcOK('نبض سباتي قوي — ROSC!','نبض سباتي قوي — ROSC!');$('#mcPost').hidden=false;}
    else if(m.rhythm==='pea'){mcNote('لا يوجد نبض — PEA. استأنف CPR فوراً.','warn','فحص النبض: لا يوجد نبض.');m.needResume=true;m.resumeFrom=m.t;}
    else{mcErr(`فحص النبض في ${RHY[m.rhythm].lbl} غير مطلوب ويزيد زمن المقاطعة.`);mcX('فحص النبض: لا يوجد نبض.');m.needResume=true;m.resumeFrom=m.t;}}
  if(a==='charge'){if(!m.pads){mcErr('لا توجد وسادات.',false);return;}if(m.charged||m.charging)return;m.charging=true;SFX.charge(1.8);say('Charging.');setTimeout(()=>{if(MC!==m||m.over)return;m.charging=false;m.charged=true;say('Stand clear. Press shock now.');mcLive(true);},1900);mcLog('info','شحن 200 J'+(!ex&&m.cprOn?' أثناء الضغطات (ممتاز — يقلل زمن التوقف).':'.'));}
  if(a==='shock'){if(!m.pads){mcErr('لا توجد وسادات.',false);return;}if(m.charging){toast('الجهاز ما زال يشحن…','warn');return;}if(!m.charged){toast('اشحن الجهاز أولاً','warn');return;}
    if(m.cprOn){mcErr('لا تصدم أثناء الضغطات! أوقف CPR وأعلن «ابتعدوا» أولاً.',false);return;}
    m.charged=false;SFX.shock();if(m.checking){m.checking=false;$('#mcQ').hidden=true;}if(shockable())setTimeout(()=>say('Shock delivered. Begin CPR.'),500);
    if(!shockable()){mcErr(`صدمة على ${RHY[m.rhythm].lbl} — إيقاع غير قابل للصدم!`);mcX('صدمة — 200 J.');m.needResume=true;m.resumeFrom=m.t;}
    else{m.shocks++;m.pendingShock=false;if(m.firstShock==null)m.firstShock=m.t;m.needResume=true;m.resumeFrom=m.t;
      const q=mcQuality();
      if(m.c.rule==='vf'&&m.shocks>=3&&m.epiT.length&&(m.amio.length||m.lido)&&q){m.rhythm='sinustach';m.roscPending=true;}
      if(m.c.rule==='pvt'){if(m.shocks===1)m.rhythm='vf';else if(q){m.rhythm='sinustach';m.roscPending=true;}}
      mcOK(`صدمة رقم ${m.shocks} — 200 J. استأنف CPR فوراً.`,`صدمة رقم ${m.shocks} — 200 J.`);}}
  const needIV=['epi','amio300','amio150','lido','ca','bicarb','ns'];
  if(needIV.includes(a)&&!m.iv){mcErr('افتح IV أو IO أولاً.',false);mcLive(true);return;}
  if(a==='iv'){if(m.iv)return;m.iv=true;mcOK('IV/IO access.','IV/IO.');}
  if(a==='sga'){if(m.sga)return;m.sga=true;mcOK('i-gel: ضغطات مستمرة + نفَس كل 6 ثوانٍ (10/د).','i-gel.');}
  if(a==='capno'){if(m.capno)return;m.capno=true;mcOK('Capnography موصول — EtCO₂ أقل من 10 يعني ضغطات غير فعالة.','Capnography موصول.');}
  if(a==='epi'){const last=m.epiT.at(-1);
    if(last!=null&&m.t-last<180){mcErr(`Epinephrine مبكر: مرت ${fmtT(m.t-last)} فقط — الفاصل 3–5 دقائق.`);mcX('Epinephrine 1 mg.');}
    else if(shockable()&&m.shocks<2){m.errs.push('Epinephrine قبل الصدمة الثانية في إيقاع قابل للصدم.');mcNote('في VF/pVT يُعطى Epinephrine بعد الصدمة الثانية.','warn','Epinephrine 1 mg.');}
    else{if(!shockable()&&!m.epiT.length&&m.t>300)m.errs.push('تأخر أول جرعة Epinephrine في الإيقاع غير القابل للصدم.');mcOK('Epinephrine 1 mg IV/IO + flush 20 mL.','Epinephrine 1 mg.');}
    m.epiT.push(m.t);}
  if(a==='amio300'){if(!shockable()){mcErr('Amiodarone لا يُستخدم في الإيقاع غير القابل للصدم.');mcX('Amiodarone 300 mg.');}else if(m.amio.length){mcErr('الجرعة الأولى أُعطيت — الثانية 150 mg.');mcX('Amiodarone 300 mg.');}else{if(m.shocks<3){m.errs.push('Amiodarone قبل الصدمة الثالثة.');mcNote('Amiodarone يُعطى بعد الصدمة الثالثة.','warn','Amiodarone 300 mg.');}else mcOK('Amiodarone 300 mg IV/IO.','Amiodarone 300 mg.');m.amio.push(m.t);}}
  if(a==='amio150'){if(m.amio.length!==1){mcErr('جرعة 150 mg تأتي بعد 300 mg مرة واحدة.');mcX('Amiodarone 150 mg.');}else if(!shockable()){mcErr('الإيقاع غير قابل للصدم.');mcX('Amiodarone 150 mg.');}else{m.amio.push(m.t);mcOK('Amiodarone 150 mg IV/IO.','Amiodarone 150 mg.');}}
  if(a==='lido'){if(!shockable()){mcErr('Lidocaine لا يُستخدم في الإيقاع غير القابل للصدم.');mcX('Lidocaine 1–1.5 mg/kg.');}else{m.lido++;mcOK('Lidocaine 1–1.5 mg/kg — بديل مقبول عن Amiodarone.','Lidocaine 1–1.5 mg/kg.');}}
  if(a==='ca'){m.ca++;if(m.c.rule==='hyperk')mcOK('Calcium chloride 1 g — يثبت غشاء عضلة القلب في فرط البوتاسيوم.','Calcium chloride 1 g.');else{m.errs.push('Calcium دون استطباب.');mcNote('لا يوجد اشتباه فرط بوتاسيوم أو تسمم CCB.','warn','Calcium chloride 1 g.');}}
  if(a==='ns'){m.fluids=(m.fluids||0)+1;if(m.c.ht.hypovol)mcOK(`NS bolus 500 mL (رقم ${m.fluids}) — تعويض الحجم مع السيطرة على النزيف.`,`NS bolus 500 mL (رقم ${m.fluids}).`);else{m.errs.push('سوائل دون دلائل نقص حجم.');mcNote('لا دلائل نقص حجم — السوائل ليست روتينية في التوقف القلبي.','warn',`NS bolus 500 mL (رقم ${m.fluids}).`);}}
  if(a==='bicarb'){m.bicarb++;if(m.c.rule==='hyperk')mcOK('Sodium bicarbonate — علاج مساعد في فرط البوتاسيوم حسب البروتوكول.','Sodium bicarbonate 50 mEq.');else{m.errs.push('Bicarbonate روتيني دون استطباب.');mcNote('Bicarbonate غير روتيني في التوقف القلبي.','warn','Sodium bicarbonate 50 mEq.');}}
  if(a==='finish'){mcEnd(true);return;}
  mcLive(true);}
function mcAnswer(a){const m=MC;if(!m.checking)return;const rh=m.rhythm;const sh=rh==='vf'||rh==='pvt';const ex=m.mode==='exam';
  const ok=sh?a==='shock':rh==='asystole'?a==='non':rh==='pea'?(a==='non'||a==='org'):a==='org';
  m.checking=false;$('#mcQ').hidden=true;(m.reads=m.reads||[]).push({t:m.t,ok});
  const lbl={shock:'قابل للصدم',non:'غير قابل للصدم',org:'إيقاع منظم'}[a];
  if(ex){if(!ok)m.errs.push(`قراءة خاطئة للإيقاع عند ${fmtT(m.t)}: اخترت «${lbl}» والإيقاع كان ${RHY[rh].lbl}.`);mcLog('info',`تحليل الإيقاع: تم تسجيل قراءتك («${lbl}»).`);SFX.tick();}
  else{if(ok)mcOK(`الإيقاع: ${RHY[rh].lbl} — قراءة صحيحة.`);else mcErr(`قراءة خاطئة: الإيقاع كان ${RHY[rh].lbl}.`);say(sh?'Shock advised.':rh==='sinustach'?'Check pulse.':'No shock advised. Start CPR.');}
  if(sh){m.pendingShock=true;}
  else if(rh==='sinustach'){if(!ex)mcNote('إيقاع منظم — افحص النبض (أقل من 10 ثوانٍ).','info');}
  else{m.needResume=true;m.resumeFrom=m.t;}
  mcLive(true);}
function mcLive(full){
  if(!MC)return;const m=MC;
  $('#mcClock').textContent=fmtT(m.t);
  const co=$('#mcCoach');co.hidden=!train()&&!m.rosc;$('#mcCoach p').textContent=mcCoach();
  const cpr=$('#mcCpr');if(!cpr)return;
  cpr.textContent=m.cprOn?'إيقاف CPR':'بدء CPR';cpr.className='btn '+(m.cprOn?'dark':'primary');
  $('#mcPad').disabled=!m.cprOn||m.auto;
  const rate=m.cprOn?mcRate():0;const mr=$('#mtRate');mr.querySelector('span').textContent=m.cprOn?(rate||'--'):'--';mr.className='meter '+(m.cprOn&&rate?(inRange(rate)?'okc':'badc'):'');
  const ccf=r(mcCCF()*100);const mc=$('#mtCCF');mc.querySelector('span').textContent=m.t>5?ccf+'%':'--';mc.className='meter '+(m.t>5?(ccf>=80?'okc':ccf<60?'badc':''):'');
  const mp=$('#mtPause');mp.querySelector('span').textContent=m.rosc?'--':r(m.pauseCur);mp.className='meter '+(m.pauseCur>10&&!m.rosc?'badc':'');
  const cyc=m.t-m.cycleStart;const cb=$('#mcCyc');cb.querySelector('i').style.width=clamp(cyc/120*100,0,100)+'%';cb.classList.toggle('due',cyc>=120);$('#mcCycT').textContent=fmtT(cyc).replace(/^0/,'');
  const ch=$('#mcCharge');ch.classList.toggle('charged',m.charged);ch.textContent=m.charging?'يشحن…':m.charged?'مشحون ✓':'شحن';
  if(full){$$('[data-ht]').forEach(b=>b.classList.toggle('on',m.ht.has(b.dataset.ht)));$('#mcPost').hidden=!m.rosc;$$('[data-post]').forEach(b=>b.classList.toggle('right',m.post.has(b.dataset.post)));}
}
function mcEnd(success,why){const m=MC;m.over=true;m.cprOn=false;m.compressing=false;
  const dur=m.rosc?m.roscT:m.t;const ccf=r((m.compT/Math.max(1,dur))*100);
  const pauses=[...m.pauses,m.rosc?0:m.pauseCur];const longest=r(Math.max(0,...pauses));const over10=pauses.filter(p=>p>10).length;
  const rateOk=m.auto?null:(m.compT?r(m.rateOkT/m.compT*100):0);
  const sh=m.c.start==='vf'||m.c.start==='pvt';
  const reasons=[];
  if(ccf<60)reasons.push(`نسبة الضغطات CCF ${ccf}% (الهدف ≥ 80%) — التوقفات تمنع تروية الدماغ والقلب.`);
  if(over10)reasons.push(`${over10} توقف أطول من 10 ثوانٍ (أطولها ${longest} ث).`);
  if(rateOk!=null&&rateOk<60)reasons.push(`المعدل كان ضمن 100–120 في ${rateOk}% فقط من الوقت.`);
  if(m.cprStartT==null||m.cprStartT>30)reasons.push('تأخر بدء CPR'+(m.cprStartT!=null?` (${r(m.cprStartT)} ث)`:'')+'.');
  if(sh&&(m.firstShock==null||m.firstShock>(m.c.start==='pvt'?60:180)))reasons.push('تأخر الصدمة الأولى'+(m.firstShock!=null?` (${fmtT(m.firstShock)})`:' — لم تُعطَ')+'.');
  if(!m.epiT.length)reasons.push('لم يُعطَ Epinephrine.');
  if(m.c.rule==='vf'&&!m.amio.length&&!m.lido)reasons.push('لم يُعطَ Amiodarone أو Lidocaine للـ VF المستعصي.');
  if(m.c.fix&&!m.c.fix(m))reasons.push(m.c.fixMsg);
  const early=!success&&m.t<1200&&!why;
  $('#mcDeb').innerHTML=`
  <div class="simbar"><h2>تقييم الإنعاش: ${m.c.title}</h2><span class="pill ${m.mode==='exam'?'bad':'ok'}">${m.mode==='exam'?'وضع الاختبار':'وضع التدريب'}</span></div><div class="retry-row" style="margin:-4px 0 14px"><button class="btn primary big" data-mcredo="1">أعد الحالة</button><button class="btn" data-mcmode="1">محاولة بوضع ${m.mode==='exam'?'التدريب':'الاختبار'}</button><button class="btn" data-mcback="1">حالة أخرى</button></div>
  <div class="deb">
    <div class="card pad full"><div class="score"><div class="big" style="color:${success?'var(--ok)':'var(--bad)'}">${success?'ROSC':'لا ROSC'}</div><div><div class="grade">${success?'إنعاش ناجح':'إنعاش غير ناجح'}</div><p class="muted">${success?`عادت الدورة الدموية عند <span class="mono">${fmtT(m.roscT)}</span>.`:(why||'تم إيقاف الإنعاش.')+(early?' الإيقاف قبل 20 دقيقة من الإنعاش المتقدم ودون علاج الأسباب العكسية يُعد مبكراً.':'')}</p></div></div></div>
    <div class="card pad"><h3>مؤشرات الأداء</h3><div class="tblwrap"><table class="cmp" style="margin-top:6px"><tbody>
      <tr><td>بدء CPR</td><td class="mono">${m.cprStartT!=null?fmtT(m.cprStartT):'—'}</td></tr>
      ${sh?`<tr><td>الصدمة الأولى</td><td class="mono">${m.firstShock!=null?fmtT(m.firstShock):'—'}</td></tr>`:''}
      <tr><td>عدد الصدمات</td><td class="mono">${m.shocks}</td></tr>
      <tr><td>CCF (نسبة وقت الضغطات)</td><td class="mono">${ccf}%</td></tr>
      <tr><td>المعدل ضمن 100–120</td><td class="mono">${rateOk==null?'تلقائي':rateOk+'%'}</td></tr>
      <tr><td>أطول توقف</td><td class="mono">${longest} ث</td></tr>
      <tr><td>جرعات Epinephrine</td><td class="mono">${m.epiT.map(fmtT).join('، ')||'—'}</td></tr>
      <tr><td>Amiodarone / Lidocaine</td><td class="mono">${m.amio.map(fmtT).join('، ')||'—'}${m.lido?' · Lido ×'+m.lido:''}</td></tr>
      <tr><td>Hs & Ts المختارة</td><td class="ltr">${[...m.ht].map(h=>HT.find(x=>x[0]===h)[1]).join(', ')||'—'}</td></tr>
    </tbody></table></div></div>
    <div class="card pad"><h3>${success?'عوامل النجاح وما يمكن تحسينه':'لماذا لم ينجح الإنعاش؟'}</h3>
      ${success?`<ul class="list" style="margin-top:8px"><li>CPR بجودة كافية (CCF ${ccf}%).</li>${sh?'<li>صدمات في وقتها مع استئناف فوري للضغطات.</li>':'<li>علاج السبب العكسي مع Epinephrine مبكر.</li>'}${reasons.map(x=>`<li>تحسين: ${x}</li>`).join('')}</ul>`:`<ul class="list" style="margin-top:8px">${reasons.map(x=>`<li>${x}</li>`).join('')||'<li>لم تتحقق الشروط الكافية للعودة رغم الأداء — بعض الحالات لا تنجح حتى مع إنعاش مثالي.</li>'}</ul>`}
      ${m.errs.length?`<h3 style="margin-top:12px">أخطاء مسجلة</h3><ul class="list" style="margin-top:6px">${m.errs.map(e=>`<li>${e}</li>`).join('')}</ul>`:''}
      ${m.rosc?`<p class="small" style="margin-top:10px">رعاية ما بعد الإنعاش: ${m.post.size}/${POST.length} خطوات.</p>`:''}</div>
    ${guideHTML()}
    <div class="card pad full"><h3>التسلسل الزمني</h3><div class="log" style="max-height:none;margin-top:6px">${m.log.map(l=>`<div><time>${fmtT(l.t)}</time><span class="k-${l.k}">${l.m}</span></div>`).join('')}</div></div>
  </div>`;
  $('#mcRun').hidden=true;$('#mcDeb').hidden=false;window.scrollTo(0,0);}
function guideHTML(){return `<div class="card pad full"><h3>متى يُعتبر الإنعاش ناجحاً ومتى يُعتبر فاشلاً؟</h3><div class="guide" style="margin-top:10px">
  <div><p><b style="color:var(--ok)">علامات النجاح (ROSC)</b></p><ul class="list small"><li>نبض سباتي واضح وضغط دم قابل للقياس.</li><li>ارتفاع مفاجئ ومستمر في EtCO₂ (عادة ≥ 40 mmHg).</li><li>ظهور موجة pleth أو موجة ضغط شرياني منتظمة.</li><li>حركة أو تنفس تلقائي.</li></ul></div>
  <div><p><b style="color:var(--bad)">أسباب الفشل الشائعة</b></p><ul class="list small"><li>CPR ضعيف: معدل أو عمق خاطئ، ارتداد غير كامل، CCF أقل من 80%.</li><li>توقفات طويلة أكثر من 10 ثوانٍ، وفحص نبض في غير وقته.</li><li>تأخر الصدمة في VF/pVT، أو صدم Asystole/PEA.</li><li>فرط التهوية (يقلل العائد الوريدي).</li><li>تأخر Epinephrine في الإيقاع غير القابل للصدم.</li><li>عدم البحث عن الأسباب العكسية Hs & Ts وعلاجها.</li></ul></div>
  <div><p><b>متى يُفكَّر في إيقاف الإنعاش؟</b></p><ul class="list small"><li>حسب البروتوكول المحلي والتوجيه الطبي فقط.</li><li>غالباً بعد 20 دقيقة على الأقل من ALS مع Asystole مستمر، وعدم وجود ROSC، وEtCO₂ أقل من 10 mmHg.</li><li>بعد مراجعة الأسباب العكسية واستبعادها.</li></ul></div>
  <div><p><b>جودة CPR بالأرقام</b></p><ul class="list small"><li>المعدل 100–120/د، العمق 5–6 سم.</li><li>30:2 بدون مجرى متقدم؛ مع المجرى: ضغطات مستمرة + نفَس كل 6 ث.</li><li>تبديل الضاغط كل دقيقتين.</li><li>EtCO₂ أقل من 10 أثناء CPR = حسّن الضغطات.</li></ul></div>
  </div></div>`;}
function renderMcPick(){
  $('#mcPick').innerHTML=`<div class="hero"><div><h1>ACLS Megacode</h1><p>تدرّب على خوارزميات التوقف القلبي حسب جمعية القلب الأمريكية (AHA): دورات دقيقتين، تحليل الإيقاع، الصدمات، الأدوية في وقتها، والأسباب العكسية. اضغط بنفسك لتقيس معدل الضغطات، وتابع EtCO₂ كمؤشر على جودة CPR.</p></div>
  <div class="card pad"><h3>خطوات إرشادية</h3><ol class="list small" style="margin-top:6px"><li>CPR فوراً + O₂ + لصق الوسادات.</li><li>تحليل الإيقاع: قابل للصدم ← صدمة ثم CPR دقيقتين فوراً.</li><li>VF/pVT: Epinephrine بعد الصدمة الثانية، Amiodarone 300 بعد الثالثة ثم 150.</li><li>Asystole/PEA: Epinephrine في أسرع وقت، ولا صدمات.</li><li>كل دقيقتين: تحليل الإيقاع وتبديل الضاغط، وابحث عن Hs & Ts.</li></ol></div></div>
  <div class="sgrid">${Object.entries(MC_CASES).map(([id,c])=>`<button class="scard" data-mcstart="${id}"><div class="row"><span class="pill bad">توقف قلب</span></div><h3>${c.nt}</h3><p>${c.who} — ${c.story}</p></button>`).join('')}</div>
  <div style="margin-top:14px">${guideHTML()}</div>`;}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mcstart){openMcStart(b.dataset.mcstart);return;}
  if(b.dataset.mcredo&&MC){mcStart(MC.id,MC.mode);return;}
  if(b.dataset.mcmode&&MC){mcStart(MC.id,MC.mode==='exam'?'train':'exam');return;}
  if(b.dataset.mcback){$('#mcDeb').hidden=true;$('#mcRun').hidden=true;$('#mcPick').hidden=false;return;}
  if(!MC||MC.over)return;
  if(b.dataset.mc)mcAct(b.dataset.mc);
  if(b.dataset.mca)mcAnswer(b.dataset.mca);
  if(b.dataset.ht){const id=b.dataset.ht;if(MC.ht.has(id)){MC.ht.delete(id);}else{MC.ht.add(id);const clue=MC.c.ht[id];if(MC.mode==='exam')mcLog('info',`تم تسجيل سبب محتمل: ${HT.find(x=>x[0]===id)[1]}`);else clue?mcOK(clue):mcNote(`${HT.find(x=>x[0]===id)[1]}: لا توجد دلائل من القصة أو الفحص تدعم هذا السبب.`,'info');}mcLive(true);}
  if(b.dataset.post){MC.post.add(b.dataset.post);mcLog('good','بعد الإنعاش: '+b.textContent);mcLive(true);}
  if(b.dataset.sp){MC.speed=+b.dataset.sp;if(MC.speed>1&&!MC.auto){MC.auto=true;$('#mcAuto').checked=true;toast('السرعة الأعلى تعمل مع الضغطات التلقائية فقط','info');}$$('#mcSpeed button').forEach(x=>x.setAttribute('aria-pressed',x===b));}
});
$('#mcStop').onclick=e=>{const b=e.currentTarget;if(!MC||MC.over)return;if(MC.rosc){mcEnd(true);return;}if(b.dataset.c){delete b.dataset.c;b.textContent='إيقاف الإنعاش';mcEnd(false);}else{b.dataset.c=1;b.textContent='تأكيد الإيقاف؟';setTimeout(()=>{delete b.dataset.c;b.textContent='إيقاف الإنعاش';},3000);}};
$('#mcNew').onclick=()=>{if(MC)openMcStart(MC.id);};
$('#mcExit').onclick=()=>{if(MC)MC.over=true;$('#mcRun').hidden=true;$('#mcDeb').hidden=true;$('#mcPick').hidden=false;};

/* ---------- AMBULANCE CHECK ---------- */
const NOW=new Date();
const mdate=k=>{const d=new Date(NOW.getFullYear(),NOW.getMonth()+k,1);return String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();};
const medItem=(n,qty,extraBad=[])=>({g:'med',n,ok:()=>`صالح حتى ${mdate(6+Math.floor(Math.random()*14))} — الكمية ${qty}/${qty}، العبوات مختومة.`,bad:[()=>`منتهي الصلاحية: ${mdate(-1-Math.floor(Math.random()*5))}.`,()=>`الكمية ${Math.max(0,qty-2)}/${qty} — أقل من الحد الأدنى.`,...extraBad]});
const CHK_ITEMS=[
  {g:'dev',n:'Life Bag (حقيبة BLS)',ok:()=>'BVM بالغ وأطفال، OPA/NPA بكل المقاسات، شفاط يدوي، ضمادات، Tourniquet ×2 — مكتملة ومختومة.',bad:[()=>'BVM للبالغين غير موجود في الحقيبة.',()=>'الختم مكسور ومقاسان من OPA مفقودان.',()=>'لا يوجد Tourniquet في الحقيبة.']},
  {g:'dev',n:'Pro Bag (حقيبة ALS)',ok:()=>'كانيولات 14–24G، محاليل، i-gel مقاسات 3/4/5، أدوات IO، جيب الأدوية — مكتملة.',bad:[()=>'كانيولات 18G نفدت.',()=>'i-gel مقاس 4 غير موجود.',()=>'إبرة Needle decompression 14G غير موجودة.']},
  {g:'dev',n:'جهاز السكر (Glucometer)',ok:()=>`يعمل، الشرائط صالحة حتى ${mdate(8)}، ومحلول التحكم ضمن المدى.`,bad:[()=>`الشرائط منتهية: ${mdate(-2)}.`,()=>'البطارية ضعيفة — الجهاز ينطفئ.',()=>'نتيجة محلول التحكم خارج المدى.']},
  {g:'dev',n:'أسطوانة الأكسجين المحمولة',ok:()=>'الضغط 1900 psi، المنظم يعمل، لا تسريب.',bad:[()=>'الضغط 350 psi — أقل من حد الاستبدال (500 psi).',()=>'صوت تسريب عند وصلة المنظم.']},
  {g:'dev',n:'أسطوانة الأكسجين الرئيسية',ok:()=>'الضغط 1800 psi ومثبتة بإحكام.',bad:[()=>'الضغط 400 psi.',()=>'غير مثبتة بالحزام.']},
  {g:'dev',n:'جهاز AED',ok:()=>`الفحص الذاتي ناجح، البطارية 90%، الوسادات صالحة حتى ${mdate(14)}.`,bad:[()=>`الوسادات منتهية: ${mdate(-1)}.`,()=>'مؤشر الفحص الذاتي أحمر — خطأ بطارية.',()=>'لا توجد وسادات أطفال.']},
  {g:'dev',n:'Monitor / Defibrillator',ok:()=>'الفحص اليومي ناجح، بطاريتان مشحونتان، ورق طباعة، كابل 12-lead كامل.',bad:[()=>'ورق الطباعة منتهٍ.',()=>'كابل 12-lead ينقصه قطب V4.',()=>'البطارية الاحتياطية غير مشحونة.']},
  {g:'dev',n:'جهاز الشفط (Suction)',ok:()=>'الشفط ≥ 300 mmHg، الوعاء نظيف، Yankauer موجود.',bad:[()=>'الوعاء غير نظيف من الحالة السابقة.',()=>'الشفط ضعيف (120 mmHg).']},
  medItem('Aspirin 300 mg مضغ',10),medItem('Nitroglycerin 0.4 mg SL',2,[()=>'البخاخ مفتوح وغير مؤرخ.']),medItem('Epinephrine 1 mg/mL (IM)',4),medItem('Epinephrine 0.1 mg/mL (IV)',6),
  medItem('Amiodarone 150 mg/3 mL',3),medItem('Atropine 1 mg',3),medItem('Adenosine 6 mg',3),medItem('Dextrose 10%',2),medItem('Glucagon 1 mg',1),medItem('Naloxone 0.4 mg',4),medItem('Salbutamol nebules',4),
  {g:'med',n:'Fentanyl (عهدة مخدرات)',ok:()=>'العدد في السجل 5 والموجود 5 — الختم سليم والتوقيعات مكتملة.',bad:[()=>'العدد في السجل 5 والموجود 4 — اختلاف في عهدة المخدرات!',()=>'سجل التسليم غير موقّع من المناوبة السابقة.']},
  medItem('Normal saline 500 mL',6),
  {g:'tool',n:'C-collars (كل المقاسات)',ok:()=>'بالغ (قابل للتعديل) ×2، أطفال ×2.',bad:[()=>'لا يوجد C-collar للأطفال.']},
  {g:'tool',n:'Scoop stretcher + Head blocks',ok:()=>'سليم، الأقفال تعمل، الأحزمة كاملة.',bad:[()=>'قفل الجهة اليسرى لا يغلق.',()=>'Head blocks مفقودة.']},
  {g:'tool',n:'Vacuum mattress',ok:()=>'يحافظ على الشفط بلا تسريب.',bad:[()=>'يفقد الشفط خلال دقيقتين — تسريب.']},
  {g:'tool',n:'الجبائر (Splints)',ok:()=>'جبائر SAM ×3 وجبيرة شد للفخذ.',bad:[()=>'جبيرة الشد للفخذ غير موجودة.']},
  {g:'tool',n:'النقالة الرئيسية',ok:()=>'العجلات والأقفال والأحزمة تعمل، والبطانية نظيفة.',bad:[()=>'حزام الكتف مقطوع.']},
  {g:'tool',n:'معدات الوقاية PPE',ok:()=>'قفازات بكل المقاسات، أقنعة N95، نظارات واقية، أثواب عزل.',bad:[()=>'أقنعة N95 نفدت.',()=>'لا توجد قفازات مقاس كبير.']},
  {g:'tool',n:'حاوية الأدوات الحادة',ok:()=>'أقل من نصف ممتلئة ومغلقة جيداً.',bad:[()=>'ممتلئة أكثر من ثلاثة أرباع — يجب استبدالها.']},
  {g:'tool',n:'جهاز الضغط والسماعة والمصباح',ok:()=>'كفات بالغ وأطفال وسمين، السماعة والمصباح يعملان.',bad:[()=>'لا توجد كفة للبالغ السمين.',()=>'بطارية المصباح فارغة.']}
];
const CKG=[['dev','الأجهزة والحقائب'],['med','الأدوية'],['tool','الأدوات الطبية']];
let CK=null;
function ckNew(){CK={items:CHK_ITEMS.map((it,i)=>{const bad=Math.random()<.3;const txt=bad?it.bad[Math.floor(Math.random()*it.bad.length)]():it.ok();return{i,g:it.g,n:it.n,bad,txt,open:false,ans:null};}),done:false};renderCk();}
function renderCk(){
  const decided=CK.items.filter(x=>x.ans).length,N=CK.items.length;
  let res='';
  if(CK.done){const right=CK.items.filter(x=>(x.ans==='n')===x.bad).length;const missed=CK.items.filter(x=>x.bad&&x.ans!=='n');const fa=CK.items.filter(x=>!x.bad&&x.ans==='n');
    res=`<div class="card pad" style="margin-bottom:14px"><div class="score"><div class="big">${r(right/N*100)}%</div><div><div class="grade">${missed.length?'الإسعاف غير جاهز للمناوبة':'الإسعاف جاهز للمناوبة'}</div><p class="muted">تعرّفت بشكل صحيح على ${right} من ${N} بنداً.</p></div></div>
    ${missed.length?`<h3 style="margin-top:12px">مشاكل لم يتم الإبلاغ عنها</h3><ul class="list" style="margin-top:6px">${missed.map(x=>`<li><b>${x.n}:</b> ${x.txt}</li>`).join('')}</ul>`:''}
    ${fa.length?`<h3 style="margin-top:12px">بنود سليمة تم تعليمها كمشكلة</h3><ul class="list" style="margin-top:6px">${fa.map(x=>`<li>${x.n}</li>`).join('')}</ul>`:''}</div>`;}
  $('#ckWrap').innerHTML=`<div class="hero"><div><h1>تشييك الإسعاف داخلياً</h1><p>قبل استلام المناوبة: افحص كل بند واحكم عليه — جاهز أو يحتاج إجراء (استبدال، تعبئة، إبلاغ). بعض البنود فيها مشاكل مخفية تتغير في كل جولة.</p></div>
  <div class="card pad"><div class="row"><div class="prog"><i style="width:${decided/N*100}%"></i></div><span class="mono">${decided}/${N}</span></div><div class="row" style="margin-top:10px"><button class="btn primary" id="ckDone" ${decided<N?'disabled':''}>عرض تقرير الجاهزية</button><button class="btn" id="ckNew">جولة جديدة</button></div></div></div>
  ${res}
  <div class="ckgrid">${CKG.map(([g,l])=>`<div class="card pad"><h3>${l}</h3>${CK.items.filter(x=>x.g===g).map(x=>`<div class="ckitem"><div class="top2"><b>${x.n}</b>${x.open?'':`<button class="btn" style="padding:3px 10px;font-size:.78rem" data-ckopen="${x.i}">افحص</button>`}</div>${x.open?`<div class="ckdetail">${x.txt}</div><div class="ckbtns"><button class="y" data-ck="${x.i}" data-v="y" aria-pressed="${x.ans==='y'}">جاهز</button><button class="n" data-ck="${x.i}" data-v="n" aria-pressed="${x.ans==='n'}">يحتاج إجراء</button>${CK.done?(x.ans==='n')===x.bad?'<span class="pill ok">صحيح</span>':'<span class="pill bad">خطأ</span>':''}</div>`:''}</div>`).join('')}</div>`).join('')}</div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!CK)return;
  if(b.dataset.ckopen){CK.items[+b.dataset.ckopen].open=true;renderCk();}
  if(b.dataset.ck&&!CK.done){CK.items[+b.dataset.ck].ans=b.dataset.v;renderCk();}
  if(b.id==='ckDone'){CK.done=true;renderCk();window.scrollTo(0,0);}
  if(b.id==='ckNew'){ckNew();}
});

$('#sndBtn').onclick=e=>{AUD.on=!AUD.on;const b=e.currentTarget;b.setAttribute('aria-pressed',AUD.on);b.textContent=AUD.on?'الصوت: يعمل':'الصوت: متوقف';if(AUD.on){actx();SFX.ok();}else try{speechSynthesis.cancel();}catch(_){}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-lung]');if(b&&SIM){lungSound(lungType(SIM));if(train())toast('تسمّع الصدر: '+LUNG_LBL[lungType(SIM)],'info');}});
/* ---------- 3D AMBULANCE ---------- */
const A3CATS={resp:['الأكسجين والمجرى الهوائي','#2f6fd6'],cardiac:['القلب والإنعاش','#16a34a'],med:['الأدوية والمحاليل','#d23b3b'],trauma:['الإصابات والتثبيت','#e67e22'],bags:['الحقائب','#c2410c'],gen:['عام ووقاية','#6b7580']};
const A3ITEMS={
  stretcher:{cat:'gen',n:'النقالة الرئيسية',where:'وسط الكابينة على سكة التثبيت في الأرضية، رأسها باتجاه مقعد المسعف',has:'مرتبة، أحزمة الكتف والصدر والرجلين، رفع الرأس والقدمين، مثبت الأرضية (clamp)',tip:'تأكد أن النقالة مقفلة في المثبت قبل تحرك الإسعاف.'},
  seat:{cat:'gen',n:'مقاعد المسعفين',where:'عند الحاجز الأمامي: مقعد عند رأس المريض، والكرسي الكحلي الكبير في الزاوية الأمامية اليمنى',has:'مقعد عند رأس النقالة للمجرى الهوائي، وكرسي بحزام خماسي يتجه للخلف',tip:'من هذا الكرسي تدير المجرى الهوائي والتهوية أثناء النقل — اربط الحزام.'},
  o2main:{cat:'resp',n:'أسطوانة الأكسجين الرئيسية',where:'الخزانة الطويلة ذات الباب الزجاجي في الزاوية الأمامية اليسرى',has:'أسطوانة كبيرة (M) موصولة بمنافذ الأكسجين في الجدار',tip:'افحص الضغط في بداية كل مناوبة، وافتح الصمام الرئيسي قبل استخدام المنافذ.'},
  o2panel:{cat:'resp',n:'منافذ الأكسجين وعداد التدفق',where:'على الجدار الأيسر فوق سطح العمل، بين قفازات الوقاية وجهاز الشفط',has:'منافذ O₂ ثابتة، عداد تدفق 0–15 L/min، منفذ للشفط',tip:'استخدم المنفذ الثابت أثناء النقل ووفّر الأسطوانة المحمولة.'},
  suction:{cat:'resp',n:'جهاز الشفط الثابت',where:'على سطح العمل في الجدار الأيسر بجانب المونيتور، والمنظم على الجدار فوقه',has:'جهاز شفط، وعاء تجميع، أنبوب، Yankauer وقساطر شفط',tip:'شغّله واختبره (≥ 300 mmHg) في بداية المناوبة.'},
  monitor:{cat:'cardiac',n:'Monitor / Defibrillator',where:'على حامل فوق سطح العمل في الجدار الأيسر، مقابل صدر المريض',has:'ECG و 12-lead، SpO₂، NIBP، EtCO₂، صدمات، pacing، وسادات بالغ وأطفال، ورق طباعة',tip:'يُفك من الحامل ويُحمل مع المريض — تأكد من شحن البطاريتين.'},
  airway:{cat:'resp',n:'خزانة المجرى الهوائي',where:'الخزائن الزجاجية العلوية في الجدار الأيسر — الجزء الخلفي (علامة زرقاء)',has:'OPA و NPA بكل المقاسات، BVM بالغ وأطفال، أقنعة، i-gel، Laryngoscope، أنابيب ETT، قساطر شفط، أدوات Needle decompression',tip:'رتّب الأدوات حسب المقاس — في التوقف لا يوجد وقت للبحث.'},
  meds:{cat:'med',n:'خزانة الأدوية',where:'الخزائن الزجاجية العلوية في الجدار الأيسر — الجزء الأمامي (علامة حمراء)',has:'Aspirin، Nitroglycerin، Epinephrine بالتركيزين، Amiodarone، Atropine، Adenosine، Dextrose، Glucagon، Naloxone، Salbutamol، Ondansetron، TXA',tip:'افحص الصلاحية والكميات يومياً، وافصل التركيزات المتشابهة.'},
  iv:{cat:'med',n:'أدراج المحاليل وأدوات IV',where:'الأدراج تحت سطح العمل في الجدار الأيسر — الصفوف الوسطى والسفلية',has:'Normal saline و Lactated Ringer، أجهزة تسريب، كانيولات 14–24G، أدوات IO، لاصق، ضاغط الوريد',tip:'دفّئ المحاليل في الطقس البارد وخاصة لمرضى الإصابات.'},
  diag:{cat:'gen',n:'أدراج أدوات التشخيص',where:'الصف العلوي من الأدراج تحت سطح العمل في الجدار الأيسر',has:'Glucometer وشرائط، أجهزة ضغط بمقاسات مختلفة، سماعة، مقياس حرارة، مصباح للحدقات',tip:'هنا جهاز السكر — قِس السكر في كل تغير بالوعي.'},
  sharps:{cat:'gen',n:'حاوية الأدوات الحادة',where:'الحاوية الصفراء على الطرف الخلفي لسطح العمل',has:'حاوية صفراء/حمراء للإبر والكانيولات المستعملة',tip:'تخلص من الإبرة فوراً بعد الاستخدام، واستبدل الحاوية عند امتلاء ثلاثة أرباعها.'},
  narc:{cat:'med',n:'درج المخدرات المقفل',where:'الدرج المعدني المقفل في الصف الثاني من الأدراج (يمين)',has:'Fentanyl و Morphine و Midazolam حسب البروتوكول، مع سجل العهدة',tip:'تُسلّم وتُستلم بالعدد والتوقيع في كل مناوبة.'},
  waste:{cat:'gen',n:'النفايات الطبية',where:'الباب السفلي في الطرف الأمامي لسطح العمل',has:'كيس النفايات الطبية الملوثة',tip:'افصل النفايات الملوثة عن العادية.'},
  o2port:{cat:'resp',n:'أسطوانة الأكسجين المحمولة',where:'حامل في الزاوية الخلفية اليمنى بجانب الباب الخلفي',has:'أسطوانة D مع منظم وعداد تدفق، قنية أنفية وقناع NRB',tip:'هذه تنزل مع الفريق للمريض — استبدلها عند أقل من 500 psi.'},
  stairchair:{cat:'trauma',n:'كرسي الدرج',where:'الزاوية الخلفية اليمنى بجانب الأسطوانة المحمولة',has:'كرسي نقل قابل للطي بمسارات للدرج',tip:'لمرضى القلب والضيق في المباني بدون مصعد — لا تجعل المريض يمشي.'},
  aed:{cat:'cardiac',n:'جهاز AED',where:'الحقيبة الصفراء المعلقة في الزاوية الخلفية اليمنى فوق المقعد الجانبي',has:'AED بوسادات بالغ وأطفال، مقص، شفرة حلاقة',tip:'خذه معك في أي بلاغ «فاقد وعي» إذا لم تأخذ المونيتور.'},
  ppe:{cat:'gen',n:'معدات الوقاية PPE',where:'موزعات القفازات (S/M/L) ومعقم اليدين على الجدار الأيسر فوق سطح العمل',has:'قفازات بكل المقاسات، أقنعة N95 وجراحية، نظارات واقية، أثواب عزل',tip:'البس القفازات قبل النزول من الإسعاف.'},
  bench:{cat:'gen',n:'المقعد الجانبي',where:'على الجدار الأيمن، من منتصف الكابينة حتى الباب الخلفي',has:'مقعد بأحزمة لمسعف ثانٍ أو مرافق',tip:'يمكن نقل مريض ثانٍ جالس عليه عند الحاجة وحسب السياسة.'},
  vacuum:{cat:'trauma',n:'Vacuum mattress',where:'الأدراج تحت المقعد الجانبي',has:'مرتبة تفريغ مع مضخة يدوية',tip:'أفضل من اللوح الطويل للنقل الطويل وكبار السن.'},
  lifebag:{cat:'bags',n:'Life Bag (حقيبة BLS)',where:'الرف المفتوح تحت سطح العمل — الحقيبة الحمراء العلوية',has:'BVM بالغ وأطفال، OPA/NPA، شفاط يدوي، ضمادات، Tourniquet، Chest seal، جهاز ضغط',tip:'هذه أول حقيبة تُحمل في أي بلاغ.'},
  probag:{cat:'bags',n:'Pro Bag (حقيبة ALS)',where:'الرف المفتوح تحت سطح العمل — الحقيبة الكحلية السفلية بالشريط العاكس',has:'IV و IO، محاليل، جيب الأدوية الإسعافية، i-gel، إبرة تفريغ 14G',tip:'تحتوي نسخة من أدوية الطوارئ لتستخدمها عند المريض قبل الوصول للإسعاف.'},
  collars:{cat:'trauma',n:'خزانة الـ C-collars و Head blocks',where:'الخزائن الزجاجية العلوية في الجدار الأيمن — الجزء الأمامي',has:'C-collars للبالغين قابلة للتعديل وللأطفال، Head blocks، أحزمة',tip:'قِس المقاس على المريض قبل التركيب.'},
  splints:{cat:'trauma',n:'خزانة الجبائر',where:'الخزائن الزجاجية العلوية في الجدار الأيمن — الجزء الخلفي',has:'جبائر SAM، جبيرة الشد للفخذ، جبائر تفريغ، رباط الحوض (Pelvic binder)',tip:'الرباط الحوضي موجود هنا مع الجبائر.'},
  blankets:{cat:'gen',n:'البطانيات والحقائب الخاصة',where:'الخزانة الطويلة في الطرف الخلفي لسطح العمل بجانب الباب الخلفي',has:'بطانيات، بطانية حرارية، حقيبة الولادة، حقيبة الحروق',tip:'البطانية جزء من علاج الإصابات — امنع انخفاض الحرارة.'},
  spine:{cat:'trauma',n:'حجيرة اللوح الطويل والـ Scoop',where:'تجويف طولي في الجدار الأيمن فوق ظهر المقعد الجانبي',has:'Long spine board، Scoop stretcher، أحزمة',tip:'الـ Scoop يرفع المريض بأقل تحريك — مهم مع كسر الحوض.'},
  ivhook:{cat:'med',n:'عمود المحاليل ومضخات التسريب',where:'على الحاجز الأمامي بجانب نافذة السائق',has:'عمود لتعليق المحاليل ومضختا تسريب (infusion pumps)',tip:'استخدم المضخة للأدوية التي تحتاج معدلاً دقيقاً مثل Epinephrine infusion.'},
  dress:{cat:'gen',n:'خزانة الضمادات والمستلزمات',where:'الخزانة الزجاجية الطويلة في الجدار الأيمن خلف الكرسي الكحلي',has:'شاش، أربطة، ضمادات ضاغطة، ضمادات حروق، أكياس قيء، مناديل، أغطية مخدة',tip:'أعد تعبئتها بعد كل حالة إصابات.'}
};
const A3QUIZ=[
  ['Adenosine 6 mg',['meds','probag']],['Fentanyl',['narc']],['BVM للبالغين',['lifebag','airway']],['i-gel مقاس 4',['airway','probag']],['Laryngoscope',['airway']],
  ['كانيولا 18G',['iv','probag']],['Normal saline 500 mL',['iv','probag']],['C-collar',['collars']],['Scoop stretcher',['spine']],['جبيرة الشد للفخذ',['splints']],
  ['Pelvic binder',['splints']],['Glucometer',['diag']],['جهاز الشفط',['suction']],['Vacuum mattress',['vacuum']],['أقنعة N95',['ppe']],
  ['التخلص من إبرة مستعملة',['sharps']],['وسادات الصدمات',['monitor','aed']],['أسطوانة أكسجين تنزل بها للمريض',['o2port']],['Tourniquet',['lifebag']],['Needle decompression 14G',['probag','airway']],
  ['بطانية حرارية',['blankets']],['حقيبة الولادة',['blankets']],['كرسي الدرج',['stairchair']],['Aspirin 300 mg',['meds']],['Chest seal',['lifebag']],
  ['كفة ضغط للأطفال',['diag']],['عداد تدفق الأكسجين أثناء النقل',['o2panel']],['Epinephrine 1 mg/mL',['meds','probag']],['أدوات IO',['iv','probag']],['تعليق المحلول أثناء النقل',['ivhook']],['ضماد ضاغط وشاش',['dress','lifebag']],['مضخة تسريب',['ivhook']],['أكياس القيء',['dress']]
];
const A3FIXED={o2main:'ثابتة في الإسعاف — خذ الأسطوانة المحمولة.',o2panel:'ثابتة في الإسعاف — خذ الأسطوانة المحمولة.',seat:'ثابت في الإسعاف.',bench:'ثابت في الإسعاف.',sharps:'تبقى في الإسعاف — في الحقائب حاوية صغيرة للأدوات الحادة.',waste:'تبقى في الإسعاف.',ivhook:'ثابتة في السقف.',meds:'لا تحمل الخزانة — الأدوية الإسعافية موجودة في Pro Bag.',iv:'لا تحمل الخزانة — المحاليل وأدوات IV موجودة في Pro Bag.',airway:'لا تحمل الخزانة — أدوات المجرى الأساسية في Life Bag و Pro Bag.',narc:'الخزنة ثابتة — تُسحب الجرعة حسب البروتوكول عند الحاجة.',suction:'الجهاز ثابت — استخدم الشفاط اليدوي في Life Bag.'};
const A3WHY={ppe:'البس معدات الوقاية قبل النزول — سلامتك أولاً.',lifebag:'الحقيبة الأساسية في كل بلاغ.',probag:'الأدوات والأدوية المتقدمة.',monitor:'المراقبة، 12-lead والصدمات.',stretcher:'لنقل المريض إلى الإسعاف.',o2port:'أكسجين محمول للمريض.'};
const A3CALLS=[
  {t:'ألم صدر ضاغط — رجل 58 سنة في شقة بالطابق الثاني بدون مصعد',need:['ppe','lifebag','probag','monitor','o2port','stairchair'],why:{stairchair:'مريض الاحتشاء لا يمشي — كرسي الدرج للنزول.'}},
  {t:'فاقد وعي في مسجد — رجل مسن',need:['ppe','lifebag','probag','monitor','o2port','diag','stretcher'],why:{diag:'جهاز السكر — قِس السكر في كل فقدان وعي.'}},
  {t:'انقلاب سيارة على طريق سريع — السائق يشكو ألم الرقبة',need:['ppe','lifebag','probag','monitor','o2port','collars','spine','stretcher'],why:{collars:'C-collar و Head blocks لتثبيت الرقبة.',spine:'Scoop أو لوح طويل للإخراج والنقل.'}},
  {t:'ولادة في المنزل — رأس المولود ظاهر',need:['ppe','lifebag','probag','o2port','blankets','stretcher'],why:{blankets:'حقيبة الولادة والبطانيات لتدفئة المولود.'}},
  {t:'إصابة عمل — نزيف شديد من الفخذ',need:['ppe','lifebag','probag','monitor','splints','blankets','stretcher'],why:{lifebag:'فيها الـ Tourniquet — أول ما تحتاجه.',splints:'جبيرة الشد بعد السيطرة على النزيف.',blankets:'منع انخفاض الحرارة.'}},
  {t:'سقوط مسنة على الدرج — ألم شديد في الحوض',need:['ppe','lifebag','probag','monitor','o2port','splints','spine'],why:{splints:'الرباط الحوضي موجود في خزانة الجبائر.',spine:'الـ Scoop يرفعها بأقل تحريك.'}},
  {t:'حريق في مطبخ — سيدة بحروق في الوجه والذراعين',need:['ppe','lifebag','probag','monitor','o2port','blankets','stretcher'],why:{blankets:'حقيبة الحروق والبطانية الحرارية.',o2port:'O₂ 100% لاشتباه التسمم بأول أكسيد الكربون.'}},
  {t:'نوبة ربو شديدة في مدرسة',need:['ppe','lifebag','probag','monitor','o2port','stretcher'],why:{o2port:'البخار يحتاج مصدر أكسجين.'}}
];
const A3={ready:false,sel:null,mode:'explore',names:false,walls:true,quiz:null,prep:null,inside:false,doors:{},open:null,photo:true};
const A3PHOTO={sharps:[12.4,38.7],ppe:[18,25.8],o2panel:[25.5,24.5],suction:[28.6,37.5],monitor:[38.7,32.2],airway:[26,8.5],meds:[39.7,15.7],lifebag:[25.9,56.6],probag:[25.9,78],diag:[33.6,46.5],narc:[37.4,51.5],iv:[35.2,61],blankets:[13.8,71.8],waste:[41.6,46],o2main:[47.3,37],ivhook:[54.6,24.9],seat:[73.5,38.7],stretcher:[54.6,57],bench:[87.7,56],vacuum:[87.7,70],dress:[86,30.4],collars:[89,8.3],splints:[80.8,16.6],aed:[94.3,27.6]};
const A3HIDDEN=['o2port','stairchair','spine'];
function a3RenderPhoto(){const l=$('#a3PPins');if(!l)return;const ids=Object.keys(A3ITEMS);l.innerHTML=Object.entries(A3PHOTO).map(([id,[x,y]])=>`<button class="a3pin${A3.sel===id?' on':''}" data-a3="${id}" style="left:${x}%;top:${y}%;--c:${A3CATS[A3ITEMS[id].cat][1]}"><b>${ids.indexOf(id)+1}</b><span>${A3ITEMS[id].n}</span></button>`).join('');}
function a3SetPhoto(on){A3.photo=on;const ph=$('#a3Photo');if(ph)ph.hidden=!on;const st=$('#a3Canvas');if(st)st.classList.toggle('photo',on);const b=$('#a3PhotoBtn');if(b){b.textContent=on?'نموذج 3D':'صورة حقيقية';}
  $$('[data-a3v],#a3Enter,[data-a3t="walls"]').forEach(x=>x.hidden=on);const h=$('#a3Hint');if(h)h.hidden=on||A3.inside;if(!on&&!A3.ready)initAmb3D();renderA3Panel();}
function a3Tex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;}
function initAmb3D(){
  if(A3.ready)return;A3.ready=true;
  renderA3Panel();
  const host=$('#a3Canvas');
  if(!window.THREE||!THREE.OrbitControls){host.insertAdjacentHTML('beforeend','<p class="a3fail">تعذر تحميل مكتبة العرض ثلاثي الأبعاد. تحقق من الاتصال بالإنترنت وأعد تحميل الصفحة.</p>');return;}
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){host.insertAdjacentHTML('beforeend','<p class="a3fail">المتصفح لا يدعم العرض ثلاثي الأبعاد (WebGL).</p>');return;}
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));host.prepend(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xdfe6ec);scene.fog=new THREE.Fog(0xdfe6ec,18,40);
  const cam=new THREE.PerspectiveCamera(45,1,0.05,120);
  const ctl=new THREE.OrbitControls(cam,renderer.domElement);ctl.enableDamping=true;ctl.maxDistance=16;ctl.minDistance=0.4;ctl.maxPolarAngle=Math.PI*0.53;
  scene.add(new THREE.HemisphereLight(0xffffff,0x6f7c88,0.85));
  const sun=new THREE.DirectionalLight(0xffffff,0.6);sun.position.set(5,9,6);scene.add(sun);
  const fill=new THREE.DirectionalLight(0xffffff,0.25);fill.position.set(-6,4,-3);scene.add(fill);
  const cabinLight=new THREE.PointLight(0xffffff,0,6);cabinLight.position.set(0,1.75,0);scene.add(cabinLight);
  const G=new THREE.Group(),EXT=new THREE.Group(),INT=new THREE.Group();scene.add(G,EXT);G.add(INT);
  const pick=[],shells=[],byId={},lights=[];
  const edge=(m,geo)=>m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x4b5660,transparent:true,opacity:.22})));
  const mk=(geo,c,x,y,z,id,o={},parent=INT)=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:.05},o)));m.position.set(x,y,z);parent.add(m);
    if(!o.transparent&&!o.noEdge)edge(m,geo);if(id){m.userData.id=id;pick.push(m);(byId[id]=byId[id]||[]).push(m);}return m;};
  const box=(w,h,d,c,x,y,z,id,o,parent)=>mk(new THREE.BoxGeometry(w,h,d),c,x,y,z,id,o,parent);
  const cyl=(r,h,c,x,y,z,id,o,parent)=>mk(new THREE.CylinderGeometry(r,r,h,28),c,x,y,z,id,o,parent);
  const glass={transparent:true,opacity:.14,depthWrite:false};
  /* ---------- ground ---------- */
  const groundTex=a3Tex(256,256,(g,w,h)=>{g.fillStyle='#9aa3ab';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${60+Math.random()*60|0},${60+Math.random()*60|0},${60+Math.random()*60|0},.18)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}});
  groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(12,12);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({map:groundTex,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-0.98;scene.add(ground);
  const lane=new THREE.Mesh(new THREE.PlaneGeometry(60,0.15),new THREE.MeshBasicMaterial({color:0xf5f5f5}));lane.rotation.x=-Math.PI/2;lane.position.set(0,-0.975,3.2);scene.add(lane);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(6.2,2.6),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(-0.8,-0.97,0);scene.add(shadow);
  /* ---------- interior (modeled on a modern box ambulance: counter left, bench right, powered stretcher on tracks) ---------- */
  const WALL=0xeef1f4,CAB=0xf3f5f7,NAVY=0x1f2f57,STEEL={metalness:.65,roughness:.3},YEL=0xf5c400;
  const floorTex=a3Tex(128,128,(g,w,h)=>{g.fillStyle='#3a3f45';g.fillRect(0,0,w,h);g.strokeStyle='#5a6067';g.lineWidth=3;for(let y=8;y<h;y+=16)for(let x=(y/16%2)*8;x<w;x+=16){g.beginPath();g.moveTo(x-4,y+3);g.lineTo(x+4,y-3);g.stroke();}});
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(9,5);
  box(3.7,0.05,2.08,0xffffff,0,-0.025,0,null,{map:floorTex,roughness:.85});
  const wallTex=a3Tex(256,128,(g,w,h)=>{g.fillStyle='#eef1f4';g.fillRect(0,0,w,h);g.strokeStyle='#d5dbe1';g.lineWidth=2;for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}});
  wallTex.wrapS=THREE.RepeatWrapping;wallTex.repeat.set(4,1);
  box(3.7,1.92,0.04,0xffffff,0,0.96,1.04,null,{map:wallTex});
  box(0.04,1.92,2.08,WALL,-1.85,0.96,0);
  shells.push(box(3.7,0.04,2.08,0xd5dde3,0,1.94,0,null,glass),box(3.7,1.92,0.04,0xd5dde3,0,0.96,-1.04,null,glass),box(0.04,1.92,2.08,0xd5dde3,1.85,0.96,0,null,glass));
  /* ceiling: LED panels, vent, yellow grab rails */
  [[-1.0,0.55],[-1.0,-0.45],[0.55,0.55],[0.55,-0.45],[1.45,0.05]].forEach(([x,z])=>lights.push(box(0.5,0.02,0.24,0xffffff,x,1.91,z,null,{emissive:0xffffff,emissiveIntensity:1,noEdge:true})));
  box(0.55,0.05,0.42,0xe5e7eb,-0.25,1.9,0.05);cyl(0.15,0.052,0x9ca3af,-0.25,1.89,0.05,null,{metalness:.4});
  [0.42,-0.32].forEach(z=>{const r=cyl(0.02,2.7,YEL,0.15,1.8,z,null,{roughness:.4});r.rotation.z=Math.PI/2;[-1.1,0.15,1.4].forEach(x=>cyl(0.012,0.12,0x9ca3af,x,1.86,z,null,STEEL));});
  [0.96,-0.96].forEach(z=>{cyl(0.022,0.8,YEL,1.76,1.0,z,null,{roughness:.4});[0.62,1.38].forEach(y=>{const s=cyl(0.012,0.08,0x9ca3af,1.79,y,z,null,STEEL);s.rotation.z=Math.PI/2;});});
  const thr=a3Tex(128,16,(g,w,h)=>{for(let i=0;i<16;i++){g.fillStyle=i%2?'#111':'#f5c400';g.beginPath();g.moveTo(i*8,0);g.lineTo(i*8+8,0);g.lineTo(i*8,h);g.lineTo(i*8-8,h);g.fill();}});
  box(0.08,0.012,2.0,0xffffff,1.81,0.006,0,null,{map:thr,noEdge:true});
  /* stretcher tracks + powered stretcher */
  [0.0,0.34].forEach(z=>box(2.1,0.02,0.05,0xb8bec4,0.8,0.01,z,null,STEEL));box(0.12,0.05,0.42,0x6b7280,-0.35,0.03,0.17,null,STEEL);
  const SX=-0.25,SZ=0.17;
  box(1.8,0.06,0.5,0x2a2d31,SX,0.12,SZ,'stretcher');
  [[-1.0,-0.2],[-1.0,0.2],[0.75,-0.2],[0.75,0.2]].forEach(([x,z])=>{const w=cyl(0.07,0.05,0x111111,SX+x,0.08,SZ+z,'stretcher');w.rotation.x=Math.PI/2;});
  [[-0.55,1],[0.35,-1]].forEach(([x,s])=>{const leg=box(0.06,0.55,0.06,YEL,SX+x,0.42,SZ-0.22,'stretcher');leg.rotation.z=s*0.5;const leg2=box(0.06,0.55,0.06,YEL,SX+x,0.42,SZ+0.22,'stretcher');leg2.rotation.z=s*0.5;});
  box(1.9,0.06,0.56,YEL,SX,0.66,SZ,'stretcher');box(0.5,0.16,0.3,YEL,SX+0.95,0.55,SZ,'stretcher');
  box(1.95,0.1,0.58,0x2f3338,SX,0.74,SZ,'stretcher',{roughness:.6});
  const bk=box(0.6,0.1,0.58,0x2f3338,SX-1.12,0.88,SZ,'stretcher',{roughness:.6});bk.rotation.z=-0.42;
  box(0.34,0.1,0.48,0xffffff,SX-1.25,1.0,SZ,'stretcher',{noEdge:true}).rotation.z=-0.42;
  [-0.6,0.0,0.55].forEach(x=>{box(0.07,0.012,0.6,0x111111,SX+x,0.795,SZ,'stretcher',{noEdge:true});box(0.06,0.03,0.07,0xdc2626,SX+x,0.805,SZ,'stretcher',{noEdge:true});});
  [-0.27,0.27].forEach(dz=>box(1.5,0.03,0.03,YEL,SX+0.1,0.83,SZ+dz+(dz>0?0.04:-0.04),'stretcher'));
  const handle=cyl(0.02,0.5,YEL,SX+1.02,0.86,SZ,'stretcher');handle.rotation.x=Math.PI/2;
  const lbl=a3Tex(128,48,(g,w,h)=>{g.fillStyle='#f5c400';g.fillRect(0,0,w,h);g.fillStyle='#111';g.font='bold 22px Arial';g.textAlign='center';g.fillText('POWER-LOAD',64,31);});
  const lm=new THREE.Mesh(new THREE.PlaneGeometry(0.28,0.1),new THREE.MeshBasicMaterial({map:lbl}));lm.position.set(SX+1.201,0.56,SZ);lm.rotation.y=Math.PI/2;INT.add(lm);
  /* glass-door cabinets with contents */
  const items=(id,x,y,z,w,dz,pal)=>{const n=Math.max(4,Math.round(w/0.12));for(let i=0;i<n;i++){const c=pal[i%pal.length],xx=x-w/2+0.08+i*((w-0.16)/(n-1)),k=i%4,hh=k===0?0.12:k===1?0.09:0.14;
      if(k===3)cyl(0.03,hh,c,xx,y+hh/2,z,id,{noEdge:true});else box(0.08,hh,dz,c,xx,y+hh/2,z,id,{noEdge:true});}};
  const glassCab=(id,x,y,w,h,side,tag,pal,shelves=1)=>{const dir=side==='L'?-1:1,wall=side==='L'?1.02:-1.02,dep=0.36,zf=wall+dir*dep,zc=wall+dir*dep/2;
    box(w,h,0.02,CAB,x,y,wall+dir*0.01,id,{noEdge:true});box(w,0.025,dep,0xdfe3e7,x,y+h/2,zc,id);box(w,0.025,dep,0xdfe3e7,x,y-h/2,zc,id);box(0.025,h,dep,0xdfe3e7,x-w/2,y,zc,id);box(0.025,h,dep,0xdfe3e7,x+w/2,y,zc,id);
    for(let s=0;s<=shelves;s++){const yy=y-h/2+0.02+s*(h-0.04)/(shelves+1);if(s>0)box(w-0.05,0.012,dep-0.06,0xd1d5db,x,yy,zc,id,{noEdge:true});items(id,x,yy+0.006,zc,w-0.05,0.18,pal);}
    box(w,0.012,0.02,0xb8bec4,x,y+h/2-0.006,zf,id,STEEL);box(w,0.012,0.02,0xb8bec4,x,y-h/2+0.006,zf,id,STEEL);
    const pw=w/2+0.02,pA=new THREE.Group(),pB=new THREE.Group();pA.position.set(x-w/4,y,zf-dir*0.004);pB.position.set(x+w/4,y,zf-dir*0.018);INT.add(pA,pB);
    [pA,pB].forEach(p=>{box(pw,h-0.03,0.008,0xdbeafe,0,0,0,id,{transparent:true,opacity:.22,depthWrite:false},p);box(0.015,h-0.03,0.012,0xb8bec4,-pw/2,0,0,id,Object.assign({noEdge:true},STEEL),p);box(0.015,h-0.03,0.012,0xb8bec4,pw/2,0,0,id,Object.assign({noEdge:true},STEEL),p);});
    box(0.03,0.08,0.015,0x6b7280,pw/2-0.06,0,dir*0.012,id,{noEdge:true},pA);
    if(tag)box(0.16,0.035,0.004,tag,x,y+h/2-0.04,zf+dir*0.012,id,{noEdge:true});
    A3.doors[id]={open:0,target:0,parts:[{o:pA,ax:'x',b:x-w/4,d:w/2-0.03}]};};
  /* LEFT wall (z+): front tall O2 cabinet, waste door, drawer bank, open bag shelf, linen tower, stainless counter */
  box(0.8,1.45,0.02,CAB,-1.45,0.725,1.01,'o2main',{noEdge:true});box(0.02,1.45,0.4,0xdfe3e7,-1.05,0.725,0.82,'o2main');box(0.8,0.02,0.4,0xdfe3e7,-1.45,1.45,0.82,'o2main');box(0.8,0.02,0.4,0xdfe3e7,-1.45,0.98,0.82,'o2main');
  cyl(0.12,0.9,0x2e8b57,-1.6,0.47,0.84,'o2main',{metalness:.3,roughness:.4});cyl(0.12,0.12,0xf5f5f5,-1.6,0.96,0.84,'o2main');
  box(0.78,0.95,0.01,0xdbeafe,-1.45,0.49,0.62,'o2main',{transparent:true,opacity:.25,depthWrite:false});
  box(0.36,0.26,0.24,0xf8fafc,-1.4,1.13,0.84,null);box(0.18,0.13,0.005,0x0f172a,-1.4,1.15,0.718,null,{emissive:0x0e7490,emissiveIntensity:.5,noEdge:true});
  box(0.8,0.3,0.4,0xe5e7eb,-1.45,1.73,0.82,null);[-1.65,-1.45,-1.25].forEach(x=>cyl(0.04,0.01,0x6b7280,x,1.72,0.618,null).rotation.x=Math.PI/2);
  box(0.43,0.88,0.4,CAB,-0.83,0.44,0.82,'waste');box(0.4,0.84,0.012,0xf8fafc,-0.83,0.44,0.615,'waste');box(0.02,0.18,0.02,0x9ca3af,-0.67,0.55,0.605,'waste',Object.assign({noEdge:true},STEEL));box(0.09,0.09,0.004,YEL,-0.83,0.7,0.607,'waste',{noEdge:true});
  box(1.0,0.9,0.4,CAB,-0.12,0.45,0.83,null);
  const dw=0.32,dh=0.2,cols=3,rows=4,d0x=-0.12-dw,d0y=0.82;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const id=r===0?'diag':(r===1&&c===2)?'narc':'iv';const g=new THREE.Group(),bx=d0x+c*dw,by=d0y-r*(dh+0.01),bz=0.625;g.position.set(bx,by,bz);INT.add(g);
    box(dw-0.012,dh-0.01,0.02,id==='narc'?0x9aa3ab:0xf8fafc,0,0,0,id,id==='narc'?STEEL:{},g);box(0.12,0.02,0.02,0xb8bec4,0,0.03,-0.015,id,Object.assign({noEdge:true},STEEL),g);
    if(id==='narc')cyl(0.015,0.02,0x374151,0.11,0.05,-0.012,id,STEEL,g).rotation.x=Math.PI/2;
    box(dw-0.04,0.012,0.3,0xe5e7eb,0,-dh/2+0.02,0.16,id,{noEdge:true},g);
    const pal=id==='diag'?[0x1d4ed8,0x30363b,0xe5e7eb]:id==='narc'?[0xfef3c7,0xfca5a5]:[0xe0f2fe,0xfef9c3,0xbae6fd];
    for(let i=0;i<3;i++)box(0.07,0.05,0.09,pal[i%pal.length],-0.09+i*0.09,-dh/2+0.05,0.16,id,{noEdge:true},g);
    const k=id+'_'+r+c;A3.doors[id]=A3.doors[id]||{open:0,target:0,parts:[]};if(id!=='iv'||c===1)A3.doors[id].parts.push({o:g,ax:'z',b:bz,d:-0.26});}
  box(0.02,0.9,0.4,0xdfe3e7,0.36,0.45,0.82,null);box(0.62,0.9,0.02,CAB,0.67,0.45,1.01,null,{noEdge:true});box(0.62,0.02,0.4,0xdfe3e7,0.67,0.47,0.82,null);box(0.62,0.02,0.4,0xdfe3e7,0.67,0.02,0.82,null);
  const bag=(id,y,c,stripe,h)=>{box(0.52,h,0.3,c,0.67,y,0.84,id,{roughness:.85});box(0.52,0.025,0.31,stripe,0.67,y-h*0.15,0.84,id,{noEdge:true,emissive:stripe,emissiveIntensity:.15});box(0.3,0.03,0.05,0x111111,0.67,y+h/2+0.012,0.84,id,{noEdge:true});box(0.48,0.012,0.31,0x111111,0.67,y+h/2-0.02,0.84,id,{noEdge:true});};
  bag('lifebag',0.66,0xd62828,0xe5e7eb,0.3);bag('probag',0.22,0x101935,0xd9f99d,0.36);
  box(0.4,0.9,0.4,CAB,1.18,0.45,0.82,'blankets');box(0.38,0.86,0.012,0xf8fafc,1.18,0.45,0.615,'blankets');box(0.02,0.2,0.02,0xb8bec4,1.03,0.55,0.605,'blankets',Object.assign({noEdge:true},STEEL));
  box(2.45,0.04,0.44,0xc9ced3,0.15,0.92,0.81,null,STEEL);box(2.45,0.02,0.02,0xb8bec4,0.15,0.9,0.59,null,STEEL);
  box(0.17,0.22,0.17,YEL,1.22,1.05,0.82,'sharps');box(0.17,0.035,0.17,0xef4444,1.22,1.17,0.82,'sharps');box(0.1,0.06,0.004,0xffffff,1.22,1.05,0.734,'sharps',{noEdge:true});
  [1.12,1.25,1.38].forEach((y,i)=>{box(0.24,0.12,0.1,0xf8fafc,0.82,y,0.96,'ppe');box(0.12,0.06,0.004,0x2563eb,0.82,y-0.01,0.909,'ppe',{noEdge:true});});
  cyl(0.035,0.15,0xf8fafc,1.05,1.27,0.97,'ppe');cyl(0.012,0.05,0x2563eb,1.05,1.37,0.97,'ppe');box(0.1,0.03,0.08,0x9ca3af,1.05,1.19,0.98,'ppe',{noEdge:true});
  [0.48,0.36].forEach(x=>{box(0.05,0.03,0.04,0x9ca3af,x,1.34,0.99,'o2panel',STEEL);cyl(0.018,0.14,0xd1fae5,x,1.25,0.975,'o2panel',{transparent:true,opacity:.8});cyl(0.02,0.03,0x16a34a,x,1.16,0.975,'o2panel');});
  const gauge=cyl(0.04,0.02,0xf8fafc,0.24,1.3,0.99,'o2panel');gauge.rotation.x=Math.PI/2;
  box(0.08,0.12,0.05,0xe5e7eb,0.1,1.28,0.99,'suction');cyl(0.07,0.2,0xdbeafe,0.1,1.04,0.86,'suction',{transparent:true,opacity:.55});cyl(0.075,0.025,0x1d4ed8,0.1,1.15,0.86,'suction');
  const tube=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.006,8,24,Math.PI*1.4),new THREE.MeshStandardMaterial({color:0xe0f2fe,transparent:true,opacity:.7}));tube.position.set(0.0,1.15,0.86);tube.rotation.y=Math.PI/2;INT.add(tube);
  box(0.42,0.3,0.2,0x1f2329,-0.32,1.1,0.82,'monitor',{roughness:.5});box(0.03,0.28,0.2,0xd62828,-0.545,1.1,0.82,'monitor');box(0.03,0.28,0.2,0xd62828,-0.095,1.1,0.82,'monitor');
  box(0.3,0.03,0.04,0x111111,-0.32,1.27,0.82,'monitor',{noEdge:true});box(0.3,0.03,0.15,0x9ca3af,-0.32,0.95,0.84,'monitor',STEEL);
  const scrCanvas=document.createElement('canvas');scrCanvas.width=320;scrCanvas.height=200;const scrTex=new THREE.CanvasTexture(scrCanvas);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.19),new THREE.MeshBasicMaterial({map:scrTex}));scr.position.set(-0.32,1.12,0.719);scr.rotation.y=Math.PI;INT.add(scr);
  A3.scr={c:scrCanvas,g:scrCanvas.getContext('2d'),t:scrTex,x:0,last:null,ph:0};
  glassCab('meds',-0.38,1.66,1.34,0.42,'L',0xd23b3b,[0xfde68a,0xfca5a5,0xffffff,0xbfdbfe,0xef4444,0x60a5fa]);
  glassCab('airway',0.97,1.66,1.26,0.42,'L',0x2f6fd6,[0x60a5fa,0xffffff,0x22c55e,0x93c5fd,0xf59e0b]);
  /* FRONT bulkhead: cab window, climate panel, IV pole with pumps, head seat, captain chair */
  box(0.02,0.42,0.7,0x0f172a,-1.835,1.12,-0.05,null,{transparent:true,opacity:.6,metalness:.5,roughness:.15});box(0.03,0.48,0.76,0x9ca3af,-1.84,1.12,-0.05,null,{transparent:true,opacity:.3,depthWrite:false});
  box(0.06,0.22,1.2,0xf1f5f9,-1.82,1.62,0.0,null);[-0.4,-0.25,0.25,0.4].forEach(z=>{const v=cyl(0.045,0.02,0x374151,-1.785,1.62,z,null);v.rotation.z=Math.PI/2;});box(0.01,0.07,0.22,0x0f172a,-1.785,1.62,0,null,{emissive:0x38bdf8,emissiveIntensity:.4,noEdge:true});
  cyl(0.018,1.05,0xb8bec4,-1.7,1.35,0.55,'ivhook',STEEL);[1.25,1.47].forEach(y=>{box(0.12,0.12,0.24,0xf8fafc,-1.66,y,0.55,'ivhook');box(0.005,0.06,0.14,0x0284c7,-1.597,y+0.02,0.55,'ivhook',{emissive:0x0284c7,emissiveIntensity:.5,noEdge:true});});box(0.06,0.14,0.04,0xdbeafe,-1.68,1.82,0.62,'ivhook',{transparent:true,opacity:.85});
  box(0.42,0.08,0.46,NAVY,-1.55,0.5,0.17,'seat',{roughness:.7});box(0.09,0.5,0.46,NAVY,-1.79,0.82,0.17,'seat',{roughness:.7});box(0.2,0.42,0.3,0xd1d5db,-1.6,0.23,0.17,'seat');
  box(0.12,0.92,0.52,NAVY,-1.66,1.0,-0.62,'seat',{roughness:.7});box(0.12,0.2,0.38,NAVY,-1.66,1.55,-0.62,'seat',{roughness:.7});box(0.46,0.12,0.52,NAVY,-1.42,0.5,-0.62,'seat',{roughness:.7});box(0.3,0.44,0.36,0xd1d5db,-1.45,0.22,-0.62,'seat');
  [-0.72,-0.52].forEach(z=>box(0.012,0.62,0.05,0x111111,-1.595,1.08,z,'seat',{noEdge:true}));box(0.014,0.06,0.08,0xdc2626,-1.59,0.86,-0.62,'seat',{noEdge:true});box(0.4,0.012,0.05,0x111111,-1.4,0.565,-0.62,'seat',{noEdge:true});
  /* RIGHT wall (z-): tall glass supply cabinet, bench with storage, long-board slot, upper glass cabinets, AED, portable O2, stair chair */
  box(0.6,0.55,0.36,CAB,-0.85,0.275,-0.84,'dress');[0.16,0.4].forEach(y=>{box(0.56,0.2,0.012,0xf8fafc,-0.85,y,-0.655,'dress');box(0.12,0.02,0.02,0xb8bec4,-0.85,y+0.04,-0.645,'dress',Object.assign({noEdge:true},STEEL));});
  glassCab('dress',-0.85,1.0,0.6,0.86,'R',null,[0xffffff,0xf1f5f9,0xe0f2fe,0xfde68a],2);
  box(1.9,0.42,0.42,CAB,0.6,0.21,-0.81,'vacuum');[0.0,0.6,1.2].forEach(x=>{box(0.5,0.3,0.012,0xf8fafc,x,0.22,-0.595,'vacuum');box(0.12,0.02,0.02,0xb8bec4,x,0.3,-0.585,'vacuum',Object.assign({noEdge:true},STEEL));});
  box(1.9,0.1,0.44,NAVY,0.6,0.47,-0.8,'bench',{roughness:.7});box(1.9,0.5,0.06,NAVY,0.6,0.85,-0.99,'bench',{roughness:.7});[0.2,0.9].forEach(x=>box(0.05,0.012,0.44,0x111111,x,0.525,-0.8,'bench',{noEdge:true}));
  box(1.85,0.26,0.06,0xe5e7eb,0.6,1.29,-1.0,'spine');box(1.8,0.22,0.03,YEL,0.6,1.29,-0.965,'spine');box(1.75,0.18,0.02,0xf97316,0.6,1.29,-0.94,'spine');[0.1,1.1].forEach(x=>box(0.05,0.28,0.012,0x111111,x,1.29,-0.925,'spine',{noEdge:true}));
  glassCab('collars',-0.55,1.66,1.2,0.42,'R',0xe67e22,[0xfdba74,0xffffff,0xfb923c,0x60a5fa]);
  glassCab('splints',0.95,1.66,1.3,0.42,'R',0xe67e22,[0x2563eb,0xf97316,0xfacc15,0x111827]);
  box(0.22,0.3,0.14,YEL,1.72,1.45,-0.9,'aed',{roughness:.6});box(0.22,0.04,0.15,0x111111,1.72,1.47,-0.9,'aed',{noEdge:true});box(0.1,0.1,0.004,0x16a34a,1.72,1.4,-0.828,'aed',{noEdge:true});
  cyl(0.06,0.55,0x2e8b57,1.72,0.3,-0.86,'o2port',{metalness:.3,roughness:.4});cyl(0.06,0.08,0xf5f5f5,1.72,0.61,-0.86,'o2port');box(0.16,0.05,0.16,0x7b848c,1.72,0.45,-0.86,'o2port');
  box(0.1,0.9,0.4,0xf2a900,1.72,0.47,-0.5,'stairchair');[-0.15,0.15].forEach(z=>box(0.02,0.8,0.05,0x111827,1.775,0.45,-0.5+z,'stairchair',{noEdge:true}));
  /* ---------- exterior ---------- */
  const W=0xf7f8fa,RED=0xc4122f,GL={color:0x1e3a5f,transparent:true,opacity:.55,metalness:.6,roughness:.15};
  const ex=(w,h,d,c,x,y,z,o,par)=>box(w,h,d,c,x,y,z,null,Object.assign({noEdge:false},o||{}),par||EXT);
  ex(3.8,2.15,0.04,W,0,0.925,1.12);const roof=ex(3.84,0.06,2.28,W,0,2.02,0),sideR=ex(3.8,2.15,0.04,W,0,0.925,-1.12);ex(0.04,2.15,2.24,W,-1.9,0.925,0);
  ex(3.8,0.2,0.01,RED,0,0.98,1.145,{noEdge:true});const stripeR=ex(3.8,0.2,0.01,RED,0,0.98,-1.145,{noEdge:true});
  const decal=a3Tex(512,256,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#1d4ed8';const cx=110,cy=128;for(let i=0;i<3;i++){g.save();g.translate(cx,cy);g.rotate(i*Math.PI/3);g.fillRect(-18,-80,36,160);g.restore();}
    g.fillStyle='#fff';g.fillRect(cx-4,cy-52,8,104);g.fillStyle='#c4122f';g.font='bold 64px Tahoma,Arial';g.textAlign='left';g.direction='rtl';g.fillText('إسعاف',230,110);g.direction='ltr';g.font='bold 46px Arial';g.fillText('AMBULANCE',220,180);});
  const decalMat=new THREE.MeshBasicMaterial({map:decal,transparent:true});
  const dL=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.8),decalMat);dL.position.set(0.55,1.5,1.146);EXT.add(dL);
  const dR=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.8),decalMat);dR.position.set(0.55,1.5,-1.146);dR.rotation.y=Math.PI;EXT.add(dR);
  ex(3.9,0.32,2.0,0x2b2f33,-0.8,-0.32,0);ex(0.3,0.09,1.7,0x4b5563,2.05,-0.22,0,{metalness:.5});
  const sideDoor=new THREE.Group();sideDoor.position.set(-0.85,0.85,-1.145);sideDoor.rotation.y=Math.PI;EXT.add(sideDoor);
  box(0.8,1.85,0.02,W,0,0,0,null,{},sideDoor);box(0.5,0.45,0.01,0x1e3a5f,0,0.45,0.012,null,{transparent:true,opacity:.6,metalness:.5,roughness:.2,noEdge:true},sideDoor);box(0.15,0.03,0.03,0x9ca3af,0.3,0,0.02,null,{metalness:.7,noEdge:true},sideDoor);
  const rearDoor=s=>{const piv=new THREE.Group();piv.position.set(1.9,0.93,s*1.1);EXT.add(piv);
    box(0.04,1.95,1.08,W,0.02,0,-s*0.54,null,{},piv);box(0.01,0.55,0.75,0x1e3a5f,0.045,0.42,-s*0.54,null,{transparent:true,opacity:.6,metalness:.5,roughness:.2,noEdge:true},piv);
    box(0.012,0.2,1.08,RED,0.045,0.05,-s*0.54,null,{noEdge:true},piv);box(0.03,0.04,0.18,0x9ca3af,0.06,-0.05,-s*0.95,null,{metalness:.7,noEdge:true},piv);return piv;};
  const rdL=rearDoor(-1),rdR=rearDoor(1);
  const cab=new THREE.Group();EXT.add(cab);
  ex(1.6,2.1,2.12,W,-2.7,0.3,0,{},cab);ex(0.06,0.8,1.9,0x1e3a5f,-3.5,0.86,0,GL,cab).rotation.z=-0.22;
  [-1,1].forEach(s=>{ex(0.85,0.6,0.02,0x1e3a5f,-2.55,0.88,s*1.07,GL,cab);ex(1.6,0.2,0.01,RED,-2.7,0.1,s*1.065,{noEdge:true},cab);ex(0.06,0.18,0.25,0x111827,-3.0,0.95,s*1.2,{},cab);
    ex(0.03,0.16,0.32,0xfff7d6,-3.51,-0.05,s*0.72,{emissive:0xfff2b3,emissiveIntensity:.6,noEdge:true},cab);});
  ex(0.03,0.38,1.1,0x1f2937,-3.51,-0.2,0,{},cab);ex(0.18,0.22,2.18,0x374151,-3.56,-0.58,0,{metalness:.3},cab);
  const bar=(x,y,len)=>{const segs=[];for(let i=0;i<6;i++){const red=i%2===0;segs.push(ex(0.24,0.1,len/6-0.02,red?0xb91c1c:0x1d4ed8,x,y,-len/2+len/12+i*len/6,{emissive:red?0xff1f1f:0x2563eb,emissiveIntensity:.2,noEdge:true}));}return segs;};
  const bars=[...bar(-2.6,1.4,1.5),...bar(-1.75,2.1,1.7)];
  ex(0.08,0.14,0.14,0xb91c1c,1.88,1.95,1.0,{emissive:0xff1f1f,emissiveIntensity:.3,noEdge:true});ex(0.08,0.14,0.14,0xb91c1c,1.88,1.95,-1.0,{emissive:0xff1f1f,emissiveIntensity:.3,noEdge:true});
  [[-2.9,1],[-2.9,-1],[1.0,1],[1.0,-1]].forEach(([x,s])=>{const t=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.28,32),new THREE.MeshStandardMaterial({color:0x111111,roughness:.9}));t.rotation.x=Math.PI/2;t.position.set(x,-0.6,s*0.98);EXT.add(t);
    const h=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.29,24),new THREE.MeshStandardMaterial({color:0x9ca3af,metalness:.7,roughness:.3}));h.rotation.x=Math.PI/2;h.position.copy(t.position);EXT.add(h);});
  const chk=a3Tex(64,32,(g,w,h)=>{for(let r=0;r<2;r++)for(let c=0;c<4;c++){g.fillStyle=(r+c)%2?'#f5c400':'#d01c2a';g.fillRect(c*16,r*16,16,16);}});
  EXT.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&o.material.color.getHex()===RED&&o.geometry.parameters){const gp=o.geometry.parameters,len=Math.max(gp.width,gp.depth);const t=chk.clone();t.needsUpdate=true;t.wrapS=THREE.RepeatWrapping;t.repeat.set(Math.max(2,Math.round(len*5)),1);o.material=o.material.clone();o.material.color.setHex(0xffffff);o.material.map=t;}});
  /* ---------- pins ---------- */
  scene.updateMatrixWorld(true);const layer=$('#a3Pins');const ids=Object.keys(A3ITEMS);const centers={};
  ids.forEach(id=>{const bb=new THREE.Box3();(byId[id]||[]).forEach(m=>bb.expandByObject(m));centers[id]=bb.getCenter(new THREE.Vector3());});
  layer.innerHTML=ids.map((id,i)=>`<button class="a3pin" data-a3="${id}" style="--c:${A3CATS[A3ITEMS[id].cat][1]}"><b>${i+1}</b><span>${A3ITEMS[id].n}</span></button>`).join('');
  Object.assign(A3,{renderer,scene,cam,ctl,pick,shells,byId,centers,host,ids,ext:{sideR,roof,stripeR,dR,sideDoor,rdL,rdR},bars,lights,cabinLight});
  const views={out:[[-6.2,2.6,6.4],[-0.6,0.4,0]],all:[[1.0,5.6,-2.4],[0,0.4,0.35]],rear:[[3.9,1.45,0.08],[-1.2,0.95,0.08]],head:[[-1.5,1.4,0.15],[1.2,0.85,0.0]],left:[[0.15,1.35,-0.8],[0.15,1.05,0.9]],right:[[0.3,1.4,0.75],[0.3,0.95,-0.9]]};
  A3.views=views;cam.position.set(...views.out[0]);ctl.target.set(...views.out[1]);ctl.update();a3SetInside(false,true);
  const ro=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();});ro.observe(host);
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const hit=e=>{if(!A3.inside)return null;const r=renderer.domElement.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);const h=ray.intersectObjects(pick,false)[0];return h?h.object.userData.id:null;};
  let down=null;const tip=$('#a3Tip');
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved>6)return;if(!A3.inside){a3SetInside(true);return;}const id=hit(e);if(id)a3Choose(id);});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const id=hit(e);renderer.domElement.style.cursor=id||!A3.inside?'pointer':'grab';
    if(id&&A3.mode==='explore'){const r=host.getBoundingClientRect();tip.hidden=false;tip.textContent=A3ITEMS[id].n;tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';}else tip.hidden=true;a3Hover(id);});
  renderer.domElement.addEventListener('pointerleave',()=>{tip.hidden=true;a3Hover(null);});
  const v=new THREE.Vector3();
  const loop=now=>{requestAnimationFrame(loop);if(APP.view!=='amb3d'||!host.clientWidth)return;
    if(A3.fly){const f=A3.fly,k=Math.min(1,(now-f.t0)/(f.dur||650)),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;cam.position.lerpVectors(f.p0,f.p1,e);ctl.target.lerpVectors(f.q0,f.q1,e);if(k>=1){A3.fly=null;f.done&&f.done();}}
    const dk=A3.inside?1:0;A3.doorOpen=(A3.doorOpen||0)+((A3.doorTarget??dk)-(A3.doorOpen||0))*0.12;rdL.rotation.y=A3.doorOpen*1.9;rdR.rotation.y=-A3.doorOpen*1.9;
    for(const id in A3.doors){const d=A3.doors[id];d.open+=(d.target-d.open)*0.15;(d.parts||[]).forEach(q=>{q.o.position[q.ax]=q.b+d.open*q.d;});}
    const blink=Math.floor(now/260)%2;bars.forEach((b,i)=>{b.material.emissiveIntensity=A3.inside?.15:((i+blink)%2?1.4:.1);});
    if(A3.inside)a3Screen(now);
    ctl.update();renderer.render(scene,cam);
    const w=host.clientWidth,h=host.clientHeight;
    $$('.a3pin',layer).forEach(p=>{if(!A3.inside){p.hidden=true;return;}const c=centers[p.dataset.a3];v.copy(c).project(cam);const vis=v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05;p.hidden=!vis;if(vis)p.style.transform=`translate(${((v.x+1)/2*w).toFixed(1)}px,${((1-v.y)/2*h).toFixed(1)}px)`;});
  };
  requestAnimationFrame(loop);
}
function a3Screen(now){const S=A3.scr;if(!S)return;const g=S.g,W=320,H=200;if(S.last==null){g.fillStyle='#02080a';g.fillRect(0,0,W,H);S.last=now;}
  const dt=Math.min(.1,(now-S.last)/1000);S.last=now;const px=dt*90;
  g.fillStyle='#02080a';g.fillRect(S.x,0,px+10,140);
  g.strokeStyle='#3df07b';g.lineWidth=2;g.beginPath();
  for(let i=0;i<=Math.ceil(px);i++){S.ph+=dt/Math.max(1,Math.ceil(px))*1.25;const p=S.ph%1;const yv=g0(p,.12,.025,.1)+g0(p,.2,.008,-.12)+g0(p,.22,.01,1)+g0(p,.24,.01,-.25)+g0(p,.45,.05,.28);const x=S.x+i,y=80-yv*55;i?g.lineTo(x,y):g.moveTo(x,y);}
  g.stroke();S.x+=px;if(S.x>230){S.x=0;}
  g.fillStyle='#02080a';g.fillRect(232,0,88,H);g.fillRect(0,140,232,60);
  g.font='bold 30px monospace';g.fillStyle='#3df07b';g.fillText('78',245,50);g.fillStyle='#45d5ff';g.fillText('98',245,105);g.font='12px monospace';g.fillText('SpO2',245,70);g.fillStyle='#3df07b';g.fillText('HR',245,18);
  g.fillStyle='#ff7676';g.font='bold 22px monospace';g.fillText('124/78',8,180);S.t.needsUpdate=true;}
function g0(x,m,s,a){return a*Math.exp(-((x-m)*(x-m))/(2*s*s));}
function a3SetInside(on,instant){A3.inside=on;const e=A3.ext;if(!e)return;
  [e.sideR,e.roof,e.stripeR,e.dR,e.sideDoor].forEach(o=>o.visible=!on);A3.shells.forEach(s=>s.visible=on&&A3.walls);A3.lights.forEach(l=>l.visible=on);A3.cabinLight.intensity=on?0.5:0;
  if(!on){a3Select(null,false);for(const id in A3.doors)A3.doors[id].target=0;}
  if(!instant)a3View(on?'all':'out',on?1100:900);
  $$('[data-a3v]').forEach(b=>b.classList.toggle('on',false));const eb=$('#a3Enter');if(eb){eb.textContent=on?'الخروج من الإسعاف':'ادخل الإسعاف';}
  const hint=$('#a3Hint');if(hint)hint.hidden=on||A3.photo;renderA3Panel();}
function a3SetEmissive(id,hex,int){if(!A3.byId)return;(A3.byId[id]||[]).forEach(m=>{const mt=m.material;if(!mt.emissive)return;if(mt.userData.e0===undefined){mt.userData.e0=mt.emissive.getHex();mt.userData.i0=mt.emissiveIntensity;}if(hex==null){mt.emissive.setHex(mt.userData.e0);mt.emissiveIntensity=mt.userData.i0;}else{mt.emissive.setHex(hex);mt.emissiveIntensity=int;}});}
function a3Hover(id){if(A3.hover===id)return;if(A3.hover&&A3.hover!==A3.sel&&!(A3.prep&&A3.prep.picked.has(A3.hover)))a3SetEmissive(A3.hover,null);A3.hover=id;if(id&&id!==A3.sel&&!(A3.prep&&A3.prep.picked.has(id)))a3SetEmissive(id,0x3b82f6,.22);}
function a3OpenDoor(id){for(const k in A3.doors)A3.doors[k].target=k===id?1:0;}
function a3Select(id,fly=true){if(!A3.byId){A3.sel=id;$$('.a3pin').forEach(p=>p.classList.toggle('on',p.dataset.a3===id));renderA3Panel();return;}if(A3.sel&&!(A3.prep&&A3.prep.picked.has(A3.sel)))a3SetEmissive(A3.sel,null);A3.sel=id;if(id){a3SetEmissive(id,0x3b82f6,.5);if(fly)a3FlyTo(id);}
  a3OpenDoor(id);$$('.a3pin').forEach(p=>p.classList.toggle('on',p.dataset.a3===id));renderA3Panel();}
function a3FlyTo(id){const c=A3.centers[id];if(!c)return;const cam=A3.cam,ctl=A3.ctl;const side=c.z<-0.3?1:c.z>0.3?-1:0;let px,pz;
  if(c.x<-1.6){px=c.x+1.7;pz=c.z*0.4;}else if(c.x>1.4){px=c.x-1.8;pz=c.z*0.3+(c.z>0?-0.35:0.35);}else if(side){px=c.x+0.25;pz=side*0.85;}else{px=Math.min(1.6,c.x+1.3);pz=0.8;}
  const py=Math.max(1.2,Math.min(1.62,c.y+0.45));
  A3.fly={t0:performance.now(),p0:cam.position.clone(),p1:new THREE.Vector3(px,py,pz),q0:ctl.target.clone(),q1:c.clone()};}
function a3View(k,dur){if(!A3.views)return;if(k!=='out'&&!A3.inside){a3SetInside(true);return;}if(k==='out'&&A3.inside){a3SetInside(false);return;}
  const[p,t]=A3.views[k];A3.fly={t0:performance.now(),dur:dur||650,p0:A3.cam.position.clone(),p1:new THREE.Vector3(...p),q0:A3.ctl.target.clone(),q1:new THREE.Vector3(...t)};}
function a3Choose(id){
  if(A3.mode==='quiz'&&A3.quiz&&!A3.quiz.done){const q=A3.quiz,cur=q.items[q.i];if(cur.ans)return;cur.ans=id;cur.sec=(performance.now()-q.t0)/1000;const ok=cur.a.includes(id);
    if(ok){q.score++;SFX.ok();a3Select(id,false);a3SetEmissive(id,0x16a34a,.6);}else{SFX.bad();a3Select(cur.a[0]);a3SetEmissive(cur.a[0],0x16a34a,.6);a3SetEmissive(id,0xdc2626,.5);setTimeout(()=>a3SetEmissive(id,null),1400);}renderA3Panel();return;}
  if(A3.mode==='prep'&&A3.prep&&!A3.prep.done){const P=A3.prep;if(A3FIXED[id]){SFX.bad();toast(A3ITEMS[id].n+': '+A3FIXED[id],'warn');P.fixedTries.add(id);a3SetEmissive(id,0xdc2626,.45);setTimeout(()=>{if(!P.picked.has(id))a3SetEmissive(id,null);},900);return;}
    if(P.picked.has(id)){P.picked.delete(id);a3SetEmissive(id,null);SFX.tick();}else{P.picked.add(id);a3SetEmissive(id,0xf59e0b,.55);SFX.tick();}renderA3Panel();return;}
  a3Select(A3.sel===id?null:id);}
function a3QuizStart(){const pool=A3QUIZ.filter(q=>!A3.photo||q[1].some(id=>A3PHOTO[id])).map(q=>[q[0],A3.photo?q[1].filter(id=>A3PHOTO[id]):q[1]]).sort(()=>Math.random()-.5).slice(0,10).map(([q,a])=>({q,a,ans:null}));A3.quiz={items:pool,i:0,score:0,done:false,t0:performance.now()};a3Clear();if(!A3.photo){if(!A3.inside)a3SetInside(true);else a3View('all');}renderA3Panel();}
function a3PrepStart(){const c=A3CALLS[Math.floor(Math.random()*A3CALLS.length)];A3.prep={c,picked:new Set(),fixedTries:new Set(),done:false,t0:performance.now()};a3Clear();if(!A3.photo){if(!A3.inside)a3SetInside(true);else a3View('all');}renderA3Panel();}
function a3Clear(){if(A3.byId)Object.keys(A3.byId).forEach(id=>a3SetEmissive(id,null));A3.sel=null;for(const k in A3.doors)A3.doors[k].target=0;$$('.a3pin').forEach(p=>p.classList.remove('on'));}
function renderA3Panel(){
  const el=$('#a3Panel');if(!el)return;const m=A3.mode;let body='';
  const nm=id=>A3ITEMS[id].n;
  if(m==='explore'){
    const s=A3.sel&&A3ITEMS[A3.sel];
    body=(s?`<div class="a3card" style="--c:${A3CATS[s.cat][1]}"><span class="pill" style="color:${A3CATS[s.cat][1]}">${A3CATS[s.cat][0]}</span><h3>${s.n}</h3>
      <dl><dt>المكان</dt><dd>${s.where}</dd><dt>المحتويات</dt><dd>${s.has}</dd></dl><div class="pearl" style="margin-top:8px"><b>نصيحة: </b>${s.tip}</div>${A3.photo&&!A3PHOTO[A3.sel]?'<p class="muted small" style="margin-top:8px">هذا الصنف غير ظاهر في الصورة — شاهده في «نموذج 3D».</p>':''}</div>`
      :`<div class="a3card empty"><h3>${A3.photo?'اضغط على أي رقم في الصورة':A3.inside?'اضغط على أي قطعة داخل الإسعاف':'ابدأ من خارج الإسعاف'}</h3><p class="muted small">${A3.photo?'الصورة لكابينة إسعاف حقيقية من الباب الخلفي. كل رقم يعرّفك بالجهاز أو الخزانة ومحتوياتها. للتجول بزاوية حرة اضغط «نموذج 3D».':A3.inside?'الخزائن تُفتح عند اختيارها لترى ما بداخلها. اسحب للدوران، والعجلة أو إصبعين للتكبير، وزر الفأرة الأيمن للتحريك.':'اضغط «ادخل الإسعاف» أو اضغط على السيارة — يُفتح الباب الخلفي وتدخل كابينة المريض.'}</p></div>`)+
      `<div class="a3list">${Object.entries(A3CATS).map(([c,[l,col]])=>`<div><span style="color:${col}">${l}</span><div class="a3btns">${Object.keys(A3ITEMS).filter(id=>A3ITEMS[id].cat===c).map(id=>`<button data-a3="${id}" class="${A3.sel===id?'on':''}"><b>${Object.keys(A3ITEMS).indexOf(id)+1}</b>${A3ITEMS[id].n}</button>`).join('')}</div></div>`).join('')}</div>`;
  }else if(m==='quiz'){
    const q=A3.quiz;
    if(!q)body=`<div class="a3card empty"><h3>اختبار مواقع الأدوات</h3><p class="muted small">ستظهر لك 10 أدوات أو أدوية. اضغط على مكانها داخل الإسعاف ثلاثي الأبعاد. الأسماء مخفية أثناء الاختبار، والوقت محسوب.</p><button class="btn primary" data-a3act="qstart" style="margin-top:10px">ابدأ الاختبار</button></div>`;
    else if(q.done){const avg=q.items.reduce((a,b)=>a+(b.sec||0),0)/10;body=`<div class="a3card"><div class="score"><div class="big">${q.score}/10</div><div><div class="grade">${q.score>=9?'ممتاز':q.score>=7?'جيد جداً':q.score>=5?'جيد':'يحتاج مراجعة'}</div><p class="muted small">متوسط الوقت لكل سؤال: <span class="mono">${avg.toFixed(1)}</span> ث</p></div></div>
      <ul class="chk" style="margin-top:10px">${q.items.map(it=>`<li class="${it.a.includes(it.ans)?'ok':'no'}"><span><b>${it.q}</b>: ${nm(it.a[0])}${it.a.length>1?' أو '+nm(it.a[1]):''}</span></li>`).join('')}</ul>
      <button class="btn primary" data-a3act="qstart" style="margin-top:10px">اختبار جديد</button></div>`;}
    else{const it=q.items[q.i];const ok=it.ans&&it.a.includes(it.ans);
      body=`<div class="a3card"><p class="muted small">السؤال ${q.i+1} من 10 · الدرجة ${q.score}</p><div class="prog" style="margin:6px 0 12px"><i style="width:${q.i*10}%"></i></div>
      <h3>أين تجد: <span class="ltr">${it.q}</span>؟</h3>
      ${it.ans?`<div class="fb ${ok?'ok':'no'}">${ok?'صحيح! ':'غير صحيح. '}المكان: <b>${nm(it.a[0])}</b>${it.a.length>1?' أو <b>'+nm(it.a[1])+'</b>':''} — ${A3ITEMS[it.a[0]].where}.</div><button class="btn primary" data-a3act="qnext" style="margin-top:10px">${q.i<9?'السؤال التالي':'عرض النتيجة'}</button>`:'<p class="muted small" style="margin-top:6px">اضغط على المكان الصحيح داخل الإسعاف.</p>'}</div>`;}
  }else{
    const P=A3.prep;
    if(!P)body=`<div class="a3card empty"><h3>تجهيز للبلاغ</h3><p class="muted small">يصلك بلاغ وعليك أن تختار من داخل الإسعاف كل ما ستحمله معك للمريض — بأسرع وقت. اضغط على الأدوات والحقائب لتضيفها، ثم اضغط «انطلق».</p><button class="btn primary" data-a3act="pstart" style="margin-top:10px">استقبل بلاغاً</button></div>`;
    else if(!P.done)body=`<div class="a3card" style="--c:var(--accent)"><span class="pill bad">بلاغ وارد</span><h3>${P.c.t}</h3><p class="muted small">اختر ما ستحمله معك من داخل الإسعاف. الأشياء الثابتة لا تُحمل.</p>
      <div class="a3btns" style="margin-top:8px">${[...P.picked].map(id=>`<button data-a3="${id}" class="on">${nm(id)} ✕</button>`).join('')||'<span class="muted small">لم تختر شيئاً بعد.</span>'}</div>
      ${A3.photo?`<p class="muted small" style="margin-top:10px">أصناف غير ظاهرة في الصورة:</p><div class="a3btns">${A3HIDDEN.map(id=>`<button data-a3="${id}" class="${P.picked.has(id)?'on':''}">${nm(id)}</button>`).join('')}</div>`:''}<button class="btn primary" data-a3act="pgo" style="margin-top:12px">انطلق إلى المريض</button></div>`;
    else{const need=P.c.need,got=need.filter(x=>P.picked.has(x)),miss=need.filter(x=>!P.picked.has(x)),extra=[...P.picked].filter(x=>!need.includes(x));
      const pct=Math.max(0,Math.round(got.length/need.length*100-extra.length*4-P.fixedTries.size*3));const why=id=>P.c.why[id]||A3WHY[id]||A3ITEMS[id].tip;
      body=`<div class="a3card"><div class="score"><div class="big">${pct}%</div><div><div class="grade">${miss.length?'نسيت أشياء مهمة':'تجهيز كامل'}</div><p class="muted small">الوقت: <span class="mono">${P.sec.toFixed(0)}</span> ث · ${P.c.t}</p></div></div>
      ${got.length?`<h3 style="margin-top:10px">أخذتها بشكل صحيح</h3><ul class="chk">${got.map(x=>`<li class="ok"><span><b>${nm(x)}</b> — ${why(x)}</span></li>`).join('')}</ul>`:''}
      ${miss.length?`<h3 style="margin-top:10px">نسيت</h3><ul class="chk">${miss.map(x=>`<li class="no"><span><b>${nm(x)}</b> — ${why(x)}</span></li>`).join('')}</ul>`:''}
      ${extra.length?`<h3 style="margin-top:10px">إضافي (يزيد الحمل)</h3><ul class="chk">${extra.map(x=>`<li><span>${nm(x)}</span></li>`).join('')}</ul>`:''}
      ${P.fixedTries.size?`<p class="small muted" style="margin-top:8px">حاولت حمل أشياء ثابتة: ${[...P.fixedTries].map(nm).join('، ')}</p>`:''}
      <button class="btn primary" data-a3act="pstart" style="margin-top:10px">بلاغ جديد</button></div>`;}
  }
  el.innerHTML=`<div class="seg a3mode" role="group"><button data-a3mode="explore" aria-pressed="${m==='explore'}">استكشاف</button><button data-a3mode="prep" aria-pressed="${m==='prep'}">تجهيز للبلاغ</button><button data-a3mode="quiz" aria-pressed="${m==='quiz'}">اختبار المواقع</button></div>`+body;
  a3RenderPhoto();$$('.a3pins').forEach(layer=>{layer.classList.toggle('names',A3.names&&m==='explore');layer.classList.toggle('quiz',m!=='explore');});
}
function renderA3View(){
  $('#a3Wrap').innerHTML=`<div class="hero" style="margin-bottom:12px"><div><h1>محاكي سيارة الإسعاف</h1><p>ادخل سيارة الإسعاف وتعرّف على مكان كل جهاز وحقيبة وصنف. افتح الخزائن لترى محتوياتها، وجهّز نفسك للبلاغ، ثم اختبر سرعتك في معرفة المواقع.</p></div>
  <p class="muted small" style="align-self:end">الكابينة مبنية على تصميم إسعاف حديث: نقالة كهربائية على سكة، سطح عمل وأدراج على اليسار، مقعد جانبي على اليمين، وخزائن زجاجية علوية. قد يختلف الترتيب حسب الطراز والجهة.</p></div>
  <div class="a3grid"><div class="a3stage" id="a3Canvas"><div class="a3pins" id="a3Pins"></div><div class="a3tip" id="a3Tip" hidden></div>
    <div class="a3bar"><button class="btn dark" data-a3t="photo" id="a3PhotoBtn" aria-pressed="true">نموذج 3D</button><button class="btn dark" id="a3Enter" data-a3act="enter">ادخل الإسعاف</button><button class="btn" data-a3v="all">منظر عام</button><button class="btn" data-a3v="rear">من الباب الخلفي</button><button class="btn" data-a3v="head">من كرسي المسعف</button><button class="btn" data-a3v="left">الجدار الأيسر</button><button class="btn" data-a3v="right">الجدار الأيمن</button>
    <button class="btn" data-a3t="walls" aria-pressed="true">الجدران الشفافة</button><button class="btn" data-a3t="names" aria-pressed="false">إظهار الأسماء</button></div>
    <div class="a3hint" id="a3Hint">اضغط على السيارة للدخول</div>
    <div class="a3photo" id="a3Photo"><div class="frame"><img src="assets/amb-interior.webp" alt="صورة كابينة إسعاف حديثة من الباب الخلفي" draggable="false"><div class="a3pins" id="a3PPins"></div><span class="cap">صورة حقيقية — اضغط على الأرقام</span></div></div></div>
  <div class="card pad a3panel" id="a3Panel"></div></div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.a3&&b.closest('#a3Panel,#a3Pins,#a3PPins')){if(!A3.photo&&!A3.inside&&A3.views)a3SetInside(true);a3Choose(b.dataset.a3);return;}
  if(b.dataset.a3v){a3View(b.dataset.a3v);return;}
  if(b.dataset.a3act==='enter'){a3SetInside(!A3.inside);return;}
  if(b.dataset.a3t==='photo'){a3SetPhoto(!A3.photo);return;}
  if(b.dataset.a3t==='walls'){A3.walls=!A3.walls;b.setAttribute('aria-pressed',A3.walls);(A3.shells||[]).forEach(s=>s.visible=A3.walls&&A3.inside);return;}
  if(b.dataset.a3t==='names'){A3.names=!A3.names;b.setAttribute('aria-pressed',A3.names);renderA3Panel();return;}
  if(b.dataset.a3mode){A3.mode=b.dataset.a3mode;a3Clear();A3.quiz=null;A3.prep=null;renderA3Panel();return;}
  if(b.dataset.a3act==='qstart'){a3QuizStart();return;}
  if(b.dataset.a3act==='pstart'){a3PrepStart();return;}
  if(b.dataset.a3act==='pgo'){const P=A3.prep;P.done=true;P.sec=(performance.now()-P.t0)/1000;const miss=P.c.need.filter(x=>!P.picked.has(x));(miss.length?SFX.bad:SFX.ok)();renderA3Panel();return;}
  if(b.dataset.a3act==='qnext'){const q=A3.quiz;a3Clear();if(q.i<9){q.i++;q.t0=performance.now();}else q.done=true;renderA3Panel();return;}
});
renderA3View();

/* ---------- language (display-layer translation) ---------- */
const I18N_MAP=new Map(I18N);
const I18N_RE=new RegExp(I18N.map(p=>p[0]).filter(Boolean).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
const AR_RE=/[؀-ۿ]/,TR_ATTRS=['title','aria-label','placeholder','alt'];
let LANG='ar';const TRN=new Set(),TRA=[];
const trText=s=>s.replace(I18N_RE,m=>I18N_MAP.get(m)??m);
function skipEl(el){return !el||el.closest('[data-noi18n]')||/^(SCRIPT|STYLE|TEXTAREA)$/.test(el.nodeName);}
function trText1(n){if(!AR_RE.test(n.data)||skipEl(n.parentElement))return;const t=trText(n.data);if(t!==n.data){n.__ar=n.data;n.data=t;TRN.add(n);}}
function trAttrs(el){if(!el||el.closest('[data-noi18n]'))return;for(const a of TR_ATTRS){const v=el.getAttribute(a);if(v&&AR_RE.test(v)){const t=trText(v);if(t!==v){TRA.push([el,a,v]);el.setAttribute(a,t);}}}}
function trTree(root){if(root.nodeType===3){trText1(root);return;}if(root.nodeType!==1)return;trAttrs(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while((n=w.nextNode()))n.nodeType===3?trText1(n):trAttrs(n);}
new MutationObserver(ms=>{if(LANG!=='en')return;for(const m of ms){if(m.type==='childList')m.addedNodes.forEach(trTree);else if(m.type==='characterData')trText1(m.target);else trAttrs(m.target);}})
  .observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:TR_ATTRS});
function setLang(l){LANG=l;const app=$('.app');app.dir=l==='en'?'ltr':'rtl';app.lang=l;document.documentElement.lang=l;
  if(l==='en'){trTree(document.body);document.title='Ambulance Simulator';}
  else{TRN.forEach(n=>{if(n.isConnected&&n.__ar!=null)n.data=n.__ar;});TRN.clear();TRA.splice(0).forEach(([el,a,v])=>{if(el.isConnected)el.setAttribute(a,v);});document.title='محاكي سيارة الإسعاف';}
  const b=$('#langBtn');b.textContent=l==='en'?'العربية':'English';b.lang=l==='en'?'ar':'en';
  try{localStorage.setItem('amb-lang',l);}catch(_){}}
$('#langBtn').onclick=()=>setLang(LANG==='en'?'ar':'en');
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.mon.big [data-mact="zoom"]').forEach(b=>b.click());});
/* ---------- init ---------- */
monSim=new Monitor($('#monSim'),()=>SIM&&{hideRhythm:SIM.mode==='exam',connected:SIM.connected,rhythm:SIM.rhythm,v:SIM.v,capno:SIM.capno,cpr:{on:SIM.cprOn,rate:110},clock:fmtT(SIM.t)});
monMc=new Monitor($('#monMc'),mcSrc);
renderPicker();renderMcPick();ckNew();
try{if(localStorage.getItem('amb-lang')==='en')setLang('en');}catch(_){}
try{const v=localStorage.getItem('amb-view');if(v&&['sim','mega','check','amb3d'].includes(v))setView(v);}catch(_){}
