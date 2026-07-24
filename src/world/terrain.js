/* =========================================================================
   TERRAIN — combined height/biome/color sampler for Earth and the alien
   worlds. sample() branches on the active world (World.name).
   ========================================================================= */
import { THREE } from '../core/three.js';
import { WATER_Y } from '../core/constants.js';
import { smoothstep, lerp } from '../core/math.js';
import { nElev, nHill, nMtn, nRiver, nTemp, nMoist, nCanyon, fbm } from './noise.js';
import { World } from './world-config.js';

const _c=new THREE.Color();
export function sampleEarth(x,z){
  // Smooth, broad rolling base — lower frequencies so the land reads as gentle
  // hills and valleys, not busy lumps. Biased upward so most of the map is dry
  // land, with water reserved for real basins.
  const continent=fbm(nElev,x*0.0024,z*0.0024,4);
  const hills=fbm(nHill,x*0.012,z*0.012,3);
  let h=continent*15+hills*3.2+7;

  // Tall, steep mountain ranges from a broad ridged mask (much higher than before).
  const mtnMask=fbm(nMtn,x*0.0042+30,z*0.0042-30,4);
  const mm=Math.max(0,mtnMask-0.12);
  h+=mm*mm*300;

  // Broad LAKES in the lowlands — replaces the old thin river channels that
  // scattered the map with little holes. Only genuine deep dips in already-low
  // land flood, so the water reads as proper lakes, not gaps.
  const lakeF=fbm(nRiver,x*0.0030,z*0.0030,3);
  const lakeAmt=smoothstep(-0.08,-0.30,lakeF)*(1-smoothstep(14,34,h));
  if(lakeAmt>0)h=lerp(h,Math.min(h,WATER_Y-7),lakeAmt);        // deep lake bed

  // Deliberate DEEP, DRY canyons: thin ridged gorges cut into the land (kept out
  // of the lakes and the high peaks). Carved to just above the water line so they
  // read as deep dry chasms, not more water.
  const cr=1-Math.abs(fbm(nCanyon,x*0.0052,z*0.0052,3))*7.0;
  const canyon=smoothstep(0.55,0.9,cr)*(1-smoothstep(24,40,h))*(1-lakeAmt);
  const isCanyon=canyon>0.5 && h>WATER_Y+3;
  if(canyon>0 && h>WATER_Y+3)h=lerp(h,WATER_Y+1.2,canyon);     // deep dry canyon floor

  // biome
  let biome;
  if(h<WATER_Y+0.15) biome='water';
  else if(isCanyon) biome='canyon';                            // dry rocky gorge
  else if(h>30||mtnMask>0.5) biome='mountain';
  else{
    const temp=nTemp(x*0.004+200,z*0.004+200);
    const moist=nMoist(x*0.004-200,z*0.004-200);
    if(temp>0.16&&moist<0.0) biome='desert';
    else if(moist>0.12) biome='forest';                        // wet, tree-dense
    else biome='plains';
  }
  // color
  let r,g,b;
  const tint=fbm(nHill,x*0.05+9,z*0.05-9,2)*0.04;
  if(biome==='water'){ r=0.02;g=0.05;b=0.08; }
  else if(h<WATER_Y+1.4){ r=0.26;g=0.23;b=0.17; }              // muddy shore
  else if(biome==='desert'){ r=0.50+tint;g=0.40+tint*0.6;b=0.24; }
  else if(biome==='canyon'){ const rk=0.24+tint; r=rk+0.06;g=rk;b=rk-0.02; }   // reddish rock
  else if(biome==='mountain'){
    if(h>40){ r=0.74;g=0.80;b=0.90; }                          // dim snow cap
    else{ const rock=0.19+tint; r=rock;g=rock+0.01;b=rock+0.04; }
  } else if(biome==='forest'){ r=0.06+tint;g=0.20+tint*1.3;b=0.08+tint; }       // deep green
  else { r=0.10+tint;g=0.31+tint*1.6;b=0.11+tint; }            // plains grass
  return {h,biome,r,g,b};
}
export function sampleAlien(x,z){
  let h=fbm(nElev,x*0.008,z*0.008,3)*10+fbm(nHill,x*0.03,z*0.03,2)*2;
  const c=fbm(nMtn,x*0.012+50,z*0.012-50,2);
  h+=smoothstep(0.16,0.28,c)*4;         // crater rims
  h-=smoothstep(0.24,0.52,c)*10;        // crater bowls
  const tint=fbm(nHill,x*0.05+9,z*0.05-9,2)*0.05;
  let r,g,b,biomeId;
  if(World.name==='mars'){
    h+=Math.max(0,fbm(nRiver,x*0.004,z*0.004,3)-0.25)*46;  // mesas
    r=0.48+tint*1.6;g=0.19+tint*0.6;b=0.11+tint*0.3;biomeId=1;
  }else{
    const l=0.30+tint-smoothstep(0.24,0.52,c)*0.12;        // darker crater floors
    r=l;g=l+0.01;b=l+0.03;biomeId=2;
  }
  return {h,biome:World.name,r,g,b,biomeId};
}
export function sample(x,z){return World.name==='earth'?sampleEarth(x,z):sampleAlien(x,z);}
export const heightAt=(x,z)=>sample(x,z).h;
