/* =========================================================================
   PROPS — beam-fodder scenery (cacti, rocks, trees, monoliths, spires). No
   reward; non-human props vanish when pulled up, humans-in-props drop back.
   ========================================================================= */
import { THREE } from '../core/three.js';
import { env } from '../core/env.js';
import { OBJ_SCALE, ASSETS } from '../core/constants.js';
import { mat, part, measureSolid } from '../core/mesh.js';
import { scene } from '../core/engine.js';

/* =========================================================================
   TWISTED DARK-CARTOON GEOMETRY — procedural gnarled shapes for the Tim-Burton
   world. A trunk built from short tapered segments whose direction bends each
   step (the gnarl), sprouting bare crooked branches + twigs, topped with a
   sparse lopsided near-black canopy, and leaning as a whole. Deliberately
   spindly and exaggerated. Used everywhere so the look is consistent (desktop
   too — we override the realistic tree.glb with this).
   ========================================================================= */
const _up=new THREE.Vector3(0,1,0);
function limb(rTop,rBot,h,m){ const s=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBot,h,env.LOW_END?4:6),m);
  s.castShadow=!env.LOW_END; return s; }
function orient(mesh,from,dir,len){ mesh.position.copy(from).addScaledVector(dir,len/2);
  mesh.quaternion.setFromUnitVectors(_up,dir); }

export function twistedTree(){
  const g=new THREE.Group();
  const bark=new THREE.MeshStandardMaterial({color:0x161009,roughness:0.95,metalness:0.02});   // near-black bark
  const leaf=new THREE.MeshStandardMaterial({color:0x14241c,roughness:0.92,metalness:0});       // dark lopsided foliage
  const segs=(env.LOW_END?3:4)+((Math.random()*2)|0);
  let r=0.22+Math.random()*0.09;
  const pos=new THREE.Vector3(0,0,0);
  const dir=new THREE.Vector3((Math.random()-0.5)*0.25,1,(Math.random()-0.5)*0.25).normalize();
  for(let i=0;i<segs;i++){
    const h=0.55+Math.random()*0.5, topR=r*0.82;
    const seg=limb(topR,r,h,bark); orient(seg,pos,dir,h); g.add(seg);
    pos.addScaledVector(dir,h);
    dir.x+=(Math.random()-0.5)*0.6; dir.z+=(Math.random()-0.5)*0.6; dir.y-=Math.random()*0.12; dir.normalize();
    r=topR;
    // a bare crooked branch (skip the very base)
    if(i>=1 && Math.random()<(env.LOW_END?0.5:0.85)){
      const bl=0.7+Math.random()*1.0, br=Math.max(0.05,r*0.55);
      const bdir=new THREE.Vector3((Math.random()-0.5)*2.2,0.45+Math.random()*0.9,(Math.random()-0.5)*2.2).normalize();
      const br0=pos.clone();
      const branch=limb(br*0.35,br,bl,bark); orient(branch,br0,bdir,bl); g.add(branch);
      if(!env.LOW_END && Math.random()<0.7){                                   // a twig off the branch, bent again
        const tl=0.35+Math.random()*0.6;
        const tip=br0.clone().addScaledVector(bdir,bl);
        const tdir=new THREE.Vector3((Math.random()-0.5)*2.4,0.5+Math.random(),(Math.random()-0.5)*2.4).normalize();
        const twig=limb(0.02,br*0.35,tl,bark); orient(twig,tip,tdir,tl); g.add(twig);
      }
    }
  }
  // sparse, lopsided dark canopy near the crown (or fully bare for the spookiest ones)
  if(Math.random()<0.62){
    const n=(env.LOW_END?1:1)+((Math.random()*2)|0);
    for(let i=0;i<n;i++){
      const cl=new THREE.Mesh(new THREE.IcosahedronGeometry(0.5+Math.random()*0.45,0),leaf);
      cl.position.copy(pos).add(new THREE.Vector3((Math.random()-0.5)*0.9,Math.random()*0.35,(Math.random()-0.5)*0.9));
      cl.scale.set(1,0.66,1); cl.castShadow=!env.LOW_END; g.add(cl);
    }
  }
  g.rotation.set(0,Math.random()*6.28,(Math.random()-0.5)*0.34);   // overall lean
  return g;
}

export function twistedRock(hex){
  const g=new THREE.Group();
  const m=mat(hex,0.96);
  const shards=2+((Math.random()*2)|0);
  for(let i=0;i<shards;i++){
    const r=part(new THREE.TetrahedronGeometry(0.7+Math.random()*0.9,0),m,
      (Math.random()-0.5)*0.7,0.2+Math.random()*0.5,(Math.random()-0.5)*0.7);
    r.scale.set(0.8+Math.random()*0.6,1.2+Math.random()*0.9,0.8+Math.random()*0.6);   // spiky, upthrust
    r.rotation.set(Math.random()*0.6,Math.random()*6.28,(Math.random()-0.5)*0.7);
    g.add(r);
  }
  return g;
}
import { World } from '../world/world-config.js';
import { LOADED, spawnModel } from '../assets.js';
import { props } from './registry.js';
import { chunks } from '../world/chunks.js';
import { saucer } from '../systems/saucer.js';
import { effBeamR } from '../systems/beam.js';
import { beep } from '../audio/music.js';

export function buildProp(biome){
  const g=new THREE.Group();const u=g.userData;
  if(World.name==='earth'){
    if(biome==='desert'){
      const gr=mat(0x3a5636,0.9);
      g.add(part(new THREE.CylinderGeometry(0.3,0.35,2.4,8),gr,0,1.2,0));
      const a1=part(new THREE.CylinderGeometry(0.18,0.2,1.1,8),gr,-0.62,1.6,0);a1.rotation.z=0.5;g.add(a1);
      const a2=part(new THREE.CylinderGeometry(0.16,0.18,0.9,8),gr,0.58,1.2,0);a2.rotation.z=-0.5;g.add(a2);
    }else if(biome==='mountain'){
      g.add(twistedRock(0x54565e));               // jagged, upthrust dark shards
    }else{
      // twisted dark-cartoon tree — solid: the ship crashes into it (slim =
      // collide with the trunk). Procedural everywhere, so the gnarled look is
      // consistent (we intentionally skip the realistic tree.glb here).
      u.solid=true;u.slim=true;
      const tt=twistedTree();tt.scale.setScalar(1.5+Math.random()*0.7);g.add(tt);
    }
  }else if(World.name==='moon'){
    if(Math.random()<0.35){
      const mo=part(new THREE.BoxGeometry(0.6,3.2,0.25),mat(0x14161c,0.3),0,1.6,0);
      mo.rotation.y=Math.random()*3;g.add(mo);
    }else{
      const r=part(new THREE.DodecahedronGeometry(1,0),mat(0x4c5054,0.95),0,0.6,0);
      r.scale.setScalar(0.6+Math.random()*0.9);r.rotation.set(Math.random(),Math.random(),Math.random());g.add(r);
    }
  }else{
    if(Math.random()<0.4){
      const sp=part(new THREE.ConeGeometry(0.5,3.4+Math.random()*2,7),mat(0x50221a,0.9),0,1.8,0);g.add(sp);
    }else{
      const r=part(new THREE.DodecahedronGeometry(1,0),mat(0x5a2c1e,0.95),0,0.6,0);
      r.scale.setScalar(0.5+Math.random()*0.9);r.rotation.set(Math.random(),Math.random(),Math.random());g.add(r);
    }
  }
  u.lift=0;u.spin=Math.random()*2-1;g.scale.multiplyScalar(OBJ_SCALE);
  if(u.solid)measureSolid(g);
  return g;
}
export function updateProps(dt,beamActive){
  const R=effBeamR();
  for(let i=props.length-1;i>=0;i--){
    const p=props[i],u=p.userData;
    if(u.gone!=null){
      u.gone-=dt;
      p.scale.multiplyScalar(Math.max(0.0001,1-dt*4));
      p.position.y+=dt*10;p.rotation.y+=dt*9;
      if(u.gone<=0){scene.remove(p);props.splice(i,1);
        for(const [k,c] of chunks){const j=c.props.indexOf(p);if(j>=0){c.props.splice(j,1);break;}}}
      continue;
    }
    const dx=p.position.x-saucer.position.x,dz=p.position.z-saucer.position.z;
    const inBeam=beamActive&&(dx*dx+dz*dz)<R*R;
    if(inBeam){
      u.lift=Math.min(1,u.lift+dt*0.55);
      p.rotation.y+=dt*4*u.spin;
      if(!u.human&&u.lift>0.8){u.gone=0.5;beep(180+Math.random()*120,0.15,0.05);continue;}
    }else if(u.lift>0){
      u.lift=Math.max(0,u.lift-dt*1.9);   // dropped
      if(u.lift===0&&u.human)beep(90,0.12,0.06);
    }
    p.position.y=u.baseY+u.lift*(saucer.position.y-u.baseY-4);
  }
}
