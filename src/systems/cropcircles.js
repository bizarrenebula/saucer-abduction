/* =========================================================================
   CROP CIRCLES — "Little Green Thumb". Hold the tractor beam steady over a
   grassy field for a few seconds and the saucer scorches a crop-circle pattern
   into the ground, paying a bonus. A cheeky roadside-mystery interaction that
   rewards slowing down and hovering, not just strafing past.
   ========================================================================= */
import { THREE } from '../core/three.js';
import { WATER_Y } from '../core/constants.js';
import { scene } from '../core/engine.js';
import { S } from '../core/state.js';
import { sample, heightAt } from '../world/terrain.js';
import { roadDist, ROAD_HW } from '../world/roads.js';
import { saucer } from './saucer.js';
import { Upgrades } from './upgrades.js';
import { spawnPop } from '../ui/pop.js';
import { banner } from '../ui/banner.js';
import { scoreV } from '../ui/dom.js';
import { beep } from '../audio/music.js';
import { t } from '../i18n.js';

const DRAW_TIME=3.4;     // seconds of steady hovering to complete a circle
const BONUS=15;          // points + upgrade points awarded
const MAX=16;            // keep at most this many circles alive

/* A flattened-crop pattern drawn once to a canvas: concentric rings, radial
   spokes and satellite dots — the classic look. Dark, semi-transparent, so it
   reads as flattened/darkened grass laid over the terrain. */
const cropTex=(function(){
  const N=256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');
  x.translate(N/2,N/2);
  const ink='rgba(14,18,8,0.6)';
  x.strokeStyle=ink;
  x.lineWidth=9;x.beginPath();x.arc(0,0,N*0.45,0,7);x.stroke();
  x.lineWidth=4;x.beginPath();x.arc(0,0,N*0.39,0,7);x.stroke();
  for(const r of [0.12,0.22,0.30]){x.lineWidth=3;x.beginPath();x.arc(0,0,N*r,0,7);x.stroke();}
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;x.save();x.rotate(a);x.fillStyle=ink;x.fillRect(-2,-N*0.39,4,N*0.27);x.restore();}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2,rr=N*0.42;x.fillStyle=ink;x.beginPath();x.arc(Math.cos(a)*rr,Math.sin(a)*rr,N*0.045,0,7);x.fill();}
  x.fillStyle='rgba(120,150,80,0.35)';x.beginPath();x.arc(0,0,N*0.08,0,7);x.fill();
  const tx=new THREE.CanvasTexture(c);return tx;
})();
const cropMat=new THREE.MeshBasicMaterial({map:cropTex,transparent:true,depthWrite:false,opacity:0.92});

export const CropCircles={
  list:[], dwell:0, lastX:0, lastZ:0,
  update(dt, active){
    const x=saucer.position.x, z=saucer.position.z;
    this.lastX=x; this.lastZ=z;
    const speed=Math.hypot(S.vel.x,S.vel.z);
    if(!active || speed>7){ this.dwell=Math.max(0,this.dwell-dt*2); return; }
    const s=sample(x,z);
    const ok=(s.biome==='plains'||s.biome==='forest') && s.h>WATER_Y+1.6 && roadDist(x,z)>ROAD_HW+2;
    if(!ok){ this.dwell=Math.max(0,this.dwell-dt*2); return; }
    this.dwell+=dt;
    if(this.dwell>=DRAW_TIME){ this.dwell=0; this.place(x,z); }
  },
  place(x,z){
    const gy=heightAt(x,z);
    const size=17+Math.random()*8;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),cropMat);
    m.rotation.x=-Math.PI/2; m.rotation.z=Math.random()*6.28;
    m.position.set(x,gy+0.14,z);
    scene.add(m); this.list.push(m);
    if(this.list.length>MAX){ const old=this.list.shift(); scene.remove(old); old.geometry.dispose(); }
    // reward + fanfare
    S.score+=BONUS; if(scoreV)scoreV.textContent=S.score;
    Upgrades.gain(BONUS);
    spawnPop(m.position,'+'+BONUS,t('crop.done'));
    banner(t('crop.banner',{n:BONUS}));
    beep(523,0.14,0.08);setTimeout(()=>beep(784,0.16,0.08),90);setTimeout(()=>beep(1046,0.22,0.07),190);
  },
  reset(){ for(const m of this.list){scene.remove(m);m.geometry.dispose();} this.list.length=0; this.dwell=0; }
};
