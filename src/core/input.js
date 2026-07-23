/* =========================================================================
   INPUT — keyboard + two on-screen joysticks (touch), self-contained (no lib).

   DESKTOP
     · ↑ / ↓   move forward / backward (relative to heading)
     · ← / →   turn the ship left / right
     · W / S   ascend / descend
     · A / D   strafe left / right
     · space   beam   ·   Q  pull   ·   C  cloak

   TOUCH — two dynamic joysticks, one per screen half:
     · LEFT  half  (WASD stick):  x = strafe,  y = ascend/descend
     · RIGHT half  (arrow stick): y = forward/back,  x = turn
     Two fingers in the SAME half = pinch-to-zoom the camera (that half's stick
     is suspended for the pinch, so it never fights the twin-stick).
     On-screen BEAM (hold), CLOAK (tap) and PULL buttons cover the actions.

   The module only produces intents on `input.*`; the main loop integrates them
   with momentum, so nothing here ever writes a position.
   ========================================================================= */
import { clamp } from './math.js';
import { renderer } from './engine.js';
import { S } from './state.js';
import { toggleCloak } from '../systems/cloak.js';

export const keys={};
export const input={
  tFwd:0, tStrafe:0, tTurn:0, tClimb:0,   // touch joystick axes, each -1..1
  beamHold:false, spHeld:false,
  zoom:1,                                  // user camera-zoom multiplier (pinch)
};

export const CLOAK_KEY='c';
const R=68;                    // joystick radius (px) for full deflection
const ZOOM_MIN=0.55, ZOOM_MAX=2.6;

addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;
  if(k===CLOAK_KEY&&!e.repeat&&S.state==='playing')toggleCloak();
  if(k===' '||k.startsWith('arrow'))e.preventDefault();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});

/* ---- twin joysticks ---- */
const joyEl={L:null,R:null};
function joy(h){ if(joyEl[h]===null)joyEl[h]=document.getElementById(h==='L'?'joyL':'joyR'); return joyEl[h]; }
function showJoy(h,ox,oy){ const el=joy(h); if(!el)return; el.style.left=ox+'px';el.style.top=oy+'px';el.classList.add('on'); moveKnob(h,0,0); }
function moveKnob(h,dx,dy){ const el=joy(h); if(!el)return; const k=el.querySelector('.joy-knob'); if(k)k.style.transform='translate('+dx+'px,'+dy+'px)'; }
function hideJoy(h){ const el=joy(h); if(el)el.classList.remove('on'); }
function setBeaming(on){ const el=joy('R'); if(el)el.classList.toggle('beaming',on); }   // hides the "double-tap" hint while beaming

// RIGHT stick = move the ship in the plane (forward/back + strafe); LEFT stick =
// rotate the nose + altitude. So the right thumb flies the saucer around and the
// left steers its facing and height — reads as piloting the craft, not a dot.
function setAxes(h,vx,vy){
  if(h==='L'){input.tTurn=dz(vx);input.tClimb=dz(-vy);}    // x = rotate, up = climb
  else{input.tStrafe=dz(vx);input.tFwd=dz(-vy);}           // x = strafe, up = forward
}
function clearAxes(h){ if(h==='L'){input.tTurn=0;input.tClimb=0;} else {input.tStrafe=0;input.tFwd=0;} }
// centre deadzone + rescale so a resting thumb reads as neutral and the usable
// travel still spans the full -1..1 — key to a stick that feels natural.
function dz(v){ const d=0.12, a=Math.abs(v); return a<d?0:Math.sign(v)*((a-d)/(1-d)); }

// per-half state; `ids` holds the active pointer ids that started in that half.
// The right half also tracks a double-tap so it can open the beam (see below).
const half={
  L:{ids:[],ox:0,oy:0,pinchD:0,downT:0,moved:0},
  R:{ids:[],ox:0,oy:0,pinchD:0,downT:0,moved:0,beamPtr:null,lastWasTap:false,lastTapT:0,lastTapX:0,lastTapY:0},
};
const ptrHalf=new Map();   // pointerId -> 'L' | 'R'
const pos=new Map();       // pointerId -> {x,y}
const TAP_MS=260, TAP_MOVE=18, DTAP_MS=320, DTAP_DIST=48;   // tap / double-tap thresholds

function pinchDist(H){
  if(H.ids.length<2)return 0;
  const a=pos.get(H.ids[0]), b=pos.get(H.ids[1]);
  return (a&&b)?Math.hypot(a.x-b.x,a.y-b.y):0;
}

renderer.domElement.addEventListener('pointerdown',e=>{
  if(S.state!=='playing'||e.pointerType==='mouse')return;   // desktop flies by keyboard
  const h=e.clientX<innerWidth/2?'L':'R', H=half[h], now=performance.now();
  pos.set(e.pointerId,{x:e.clientX,y:e.clientY});
  ptrHalf.set(e.pointerId,h);
  H.ids.push(e.pointerId);
  if(H.ids.length===1){
    H.ox=e.clientX;H.oy=e.clientY;H.downT=now;H.moved=0;
    showJoy(h,e.clientX,e.clientY);
    // Right stick: a double-tap (this press soon after a quick tap nearby) opens
    // the beam. It stays on while this finger is held, and the stick still steers,
    // so you can beam and manoeuvre with the same thumb. Releasing stops the beam.
    if(h==='R'&&H.lastWasTap&&now-H.lastTapT<DTAP_MS&&Math.hypot(e.clientX-H.lastTapX,e.clientY-H.lastTapY)<DTAP_DIST){
      H.beamPtr=e.pointerId;input.beamHold=true;setBeaming(true);H.lastWasTap=false;
    }
  }
  else if(H.ids.length===2){ clearAxes(h); hideJoy(h); H.pinchD=pinchDist(H); }   // enter pinch
});

addEventListener('pointermove',e=>{
  if(!ptrHalf.has(e.pointerId))return;
  const p=pos.get(e.pointerId); if(p){p.x=e.clientX;p.y=e.clientY;}
  const h=ptrHalf.get(e.pointerId), H=half[h];
  if(H.ids.length>=2){                                   // pinch-zoom in this half
    const d=pinchDist(H);
    if(H.pinchD>0&&d>0)input.zoom=clamp(input.zoom*(H.pinchD/d),ZOOM_MIN,ZOOM_MAX);
    H.pinchD=d;
    return;
  }
  if(e.pointerId!==H.ids[0])return;                      // only the anchor finger drives the stick
  const dx=e.clientX-H.ox, dy=e.clientY-H.oy;
  H.moved=Math.max(H.moved,Math.hypot(dx,dy));           // track travel to tell a tap from a drag
  const len=Math.hypot(dx,dy)||1, cl=Math.min(len,R);
  const kx=dx/len*cl, ky=dy/len*cl;
  moveKnob(h,kx,ky);
  setAxes(h,kx/R,ky/R);
},{passive:true});

function endPtr(e){
  if(!ptrHalf.has(e.pointerId))return;
  const h=ptrHalf.get(e.pointerId), H=half[h], now=performance.now();
  const wasAnchor=(H.ids[0]===e.pointerId);
  ptrHalf.delete(e.pointerId); pos.delete(e.pointerId);
  const i=H.ids.indexOf(e.pointerId); if(i>=0)H.ids.splice(i,1);
  if(h==='R'&&e.pointerId===H.beamPtr){ input.beamHold=false;H.beamPtr=null;setBeaming(false); }
  if(h==='R'&&wasAnchor){                                 // remember whether this press was a quick tap
    H.lastWasTap=(now-H.downT<TAP_MS&&H.moved<TAP_MOVE);
    H.lastTapT=now;H.lastTapX=H.ox;H.lastTapY=H.oy;
  }
  if(H.ids.length===0){ clearAxes(h); hideJoy(h); }
  else if(H.ids.length===1){                             // pinch broke back to a single stick
    const p=pos.get(H.ids[0]); if(p){ H.ox=p.x;H.oy=p.y; showJoy(h,p.x,p.y); }
  }
}
addEventListener('pointerup',endPtr);
addEventListener('pointercancel',endPtr);

/* ---- on-screen action buttons (touch) ---- */
function bindBtn(id,on,off){
  const el=document.getElementById(id); if(!el)return;
  el.addEventListener('pointerdown',e=>{e.preventDefault();on();});
  el.addEventListener('contextmenu',e=>e.preventDefault());
  if(off){
    ['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,e=>{off();}));
  }
}
bindBtn('cloakBtn',()=>{ if(S.state==='playing')toggleCloak(); },null);

/* Reset all touch intents (called by startGame / respawn). */
export function resetInputTouch(){
  input.tFwd=input.tStrafe=input.tTurn=input.tClimb=0;
  input.beamHold=false;input.zoom=1;
  half.L.ids.length=0;half.R.ids.length=0;half.R.beamPtr=null;half.R.lastWasTap=false;
  ptrHalf.clear();pos.clear();
  hideJoy('L');hideJoy('R');setBeaming(false);
}
