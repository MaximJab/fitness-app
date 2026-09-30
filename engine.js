// 3D-Modell und Posen-Engine (three.js r128)
function KBEngine(THREE, scene){
const D=Math.PI/180,UA=.3,FA=.24,HA=.08,LEG=.45;
const ARM0={sh:0,inw:0,el:0,fin:0,wr:0,rot:0};
const P0={hx:0,hy:.93,hz:0,hinge:0,tw:0,lb:0,kbw:0,kbwL:0,kbx:0,kbz:0,kbfL:0,kbfR:0};
const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.7});
const skin=M(0xdcb192),shirt=M(0x3f5a73),pants=M(0x2f343b),shoe=M(0x202020);
const kbm=new THREE.MeshStandardMaterial({color:0xe0591a,roughness:.45,metalness:.25});
const bodyMeshes=[];
function mesh(g,mat){const m=new THREE.Mesh(g,mat);bodyMeshes.push(m);return m;}
function limb(len,r,mat){const g=new THREE.Group(),m=mesh(new THREE.CylinderGeometry(r,r*.85,len,16),mat);m.position.y=-len/2;g.add(m);g.add(mesh(new THREE.SphereGeometry(r,16,12),mat));return g;}
const legs=[1,-1].map(side=>{const th=limb(LEG,.07,pants),sh=limb(LEG,.055,pants);sh.position.y=-LEG;th.add(sh);
 const kn=mesh(new THREE.SphereGeometry(.06,12,10),pants);kn.position.y=-LEG;th.add(kn);
 const ft=mesh(new THREE.BoxGeometry(.22,.06,.1),shoe);ft.geometry.translate(.06,-.02,0);ft.position.y=-LEG;sh.add(ft);scene.add(th);return{side,th,sh,ft};});
const T=new THREE.Group(),Tw=new THREE.Group(),Tl=new THREE.Group();scene.add(T);T.add(Tw);Tw.add(Tl);
const pel=mesh(new THREE.SphereGeometry(.13,20,14),pants);pel.scale.set(.8,.7,1.3);Tl.add(pel);
const tor=mesh(new THREE.CylinderGeometry(.17,.13,.5,20),shirt);tor.position.y=.3;tor.scale.x=.7;Tl.add(tor);
const nk=mesh(new THREE.CylinderGeometry(.045,.05,.1,12),skin);nk.position.y=.6;Tl.add(nk);
const hd=mesh(new THREE.SphereGeometry(.11,20,16),skin);hd.position.y=.73;hd.scale.set(1,1.1,.95);Tl.add(hd);
const rig=new THREE.Group();rig.position.y=.5;Tl.add(rig);
function makeArm(side){const ua=limb(UA,.05,shirt);ua.position.z=.19*side;const fa=limb(FA,.042,skin);fa.position.y=-UA;ua.add(fa);
 const el=mesh(new THREE.SphereGeometry(.047,14,10),skin);el.position.y=-UA;ua.add(el);
 const hand=new THREE.Group();hand.position.y=-FA;fa.add(hand);hand.add(mesh(new THREE.SphereGeometry(.036,12,10),skin));
 const palm=mesh(new THREE.BoxGeometry(.05,HA,.075),skin);palm.geometry.translate(0,-HA/2,0);hand.add(palm);
 const tip=new THREE.Object3D();tip.position.y=-HA;hand.add(tip);rig.add(ua);return{side,ua,fa,hand,tip};}
const arms={R:makeArm(1),L:makeArm(-1)};arms.R.ua.rotation.order='ZXY';arms.L.ua.rotation.order='ZXY';
function makeKB(){const g=new THREE.Group();scene.add(g);const h=new THREE.Mesh(new THREE.TorusGeometry(.07,.017,8,24),kbm);h.rotation.y=Math.PI/2;g.add(h);const b=new THREE.Mesh(new THREE.SphereGeometry(.11,20,16),kbm);g.add(b);return{g,b};}
const K1=makeKB(),K2=makeKB();const kb=K1.g,bell=K1.b;
const V=()=>new THREE.Vector3(),DOWN=new THREE.Vector3(0,-1,0);
const a1=V(),a2=V(),b1=V(),b2=V(),e1=V(),dir=V();
function lerpObj(a,b,u){const o={};for(const k in a){const x=a[k],y=b[k];o[k]=(typeof x==='object'&&x)?lerpObj(x,y,u):(typeof x==='number'?x+(y-x)*u:x);}return o;}
function prep(ex){if(ex._keys)return;const st=ex.stance||.1,b=ex.base||{};
 const mk=p=>{p=p||{};const r=Object.assign({},P0,b,p);
  r.R=Object.assign({},ARM0,b.R,p.R);r.L=Object.assign({},ARM0,b.L,p.L);
  r.RF=Object.assign({fx:0,fy:.05,fz:st,fa:0,th:0,kn:0},b.RF,p.RF);r.LF=Object.assign({fx:0,fy:.05,fz:-st,fa:0,th:0,kn:0},b.LF,p.LF);return r;};
 ex._keys=ex.keys.map(k=>({t:k.t,txt:k.txt,p:mk(k.p)}));}
function poseAt(ex,t){prep(ex);const K=ex._keys;let i=K.length-1;for(let j=0;j<K.length;j++)if(K[j].t<=t)i=j;
 const a=K[i],b=K[(i+1)%K.length],t1=(i+1<K.length)?b.t:1+K[0].t;let u=(t-a.t)/Math.max(1e-6,t1-a.t);u=u*u*(3-2*u);
 return{p:lerpObj(a.p,b.p,u),txt:a.txt};}
function setArm(a,q,rel,p){a.ua.rotation.x=a.side*q.inw*D-(rel?0:p.lb*D);a.ua.rotation.z=(rel?q.sh:q.sh+p.hinge)*D;
 a.ua.rotation.y=a.side*(q.rot||0)*D;a.fa.rotation.z=q.el*D;a.fa.rotation.x=-a.side*q.fin*D;a.hand.rotation.z=q.wr*D;}
let curP=null;function kbPose(mode,out){if(mode==='floor'){out.pos.set(curP.kbx,.27,curP.kbz);[['R',curP.kbfR],['L',curP.kbfL]].forEach(([s,w])=>{if(w>0){arms[s].tip.getWorldPosition(a2);out.pos.x+=(a2.x-out.pos.x)*w;out.pos.z+=(a2.z-out.pos.z)*w;}});out.bp.set(0,-.15,0);out.q.identity();return out;}let A=arms.R,B=arms.L;if(mode.endsWith('L')&&mode!=='twoDown'){mode=mode.slice(0,-1);A=arms.L;B=arms.R;}
 A.tip.getWorldPosition(a1);A.hand.getWorldPosition(b1);out.bp.set(0,-.15,0);
 if(mode==='two'||mode==='twoDown'){B.tip.getWorldPosition(a2);B.hand.getWorldPosition(b2);out.pos.copy(a1).add(a2).multiplyScalar(.5);
  if(mode==='two')dir.copy(a1).sub(b1).add(a2).sub(b2).normalize();else dir.copy(DOWN);}
 else if(mode==='oneHang'){out.pos.copy(a1);dir.copy(a1).sub(b1).normalize();}
 else if(mode==='oneDown'){out.pos.copy(a1);dir.copy(DOWN);}
 else if(mode==='hip'){const f=V().set(1,0,0).applyQuaternion(T.quaternion);out.pos.copy(T.position).addScaledVector(f,.33);dir.copy(f).negate();}
 else{A.fa.getWorldPosition(e1);out.pos.copy(a1);dir.copy(e1).sub(a1).normalize();out.bp.set(0,-.1,.08*A.side);}
 out.q.setFromUnitVectors(DOWN,dir);return out;}
const kA={pos:V(),q:new THREE.Quaternion(),bp:V()},kB={pos:V(),q:new THREE.Quaternion(),bp:V()};
const propMat=new THREE.MeshStandardMaterial({color:0x8a7560,roughness:.85});const props=new THREE.Group();scene.add(props);
function setProps(ex){while(props.children.length){const c=props.children.pop();c.geometry.dispose();}
 (ex.props||[]).forEach(b=>{const m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,b.d),propMat);m.position.set(b.x,b.h/2,b.z||0);props.add(m);});}
function placeKB(K,mode,mode2,w){kbPose(mode,kA);if(mode2&&w>0){kbPose(mode2,kB);kA.pos.lerp(kB.pos,w);kA.q.slerp(kB.q,w);kA.bp.lerp(kB.bp,w);}
 K.g.position.copy(kA.pos);K.g.quaternion.copy(kA.q);K.b.position.copy(kA.bp);}
function applyPose(ex,p){curP=p;const rel=ex.rel||{},lm=ex.legs||{};
 T.position.set(p.hx,p.hy,p.hz);T.rotation.set(0,0,-p.hinge*D);Tw.rotation.y=p.tw*D;Tl.rotation.x=p.lb*D;
 setArm(arms.R,p.R,!!rel.R,p);setArm(arms.L,p.L,!!rel.L,p);
 legs.forEach(l=>{const f=l.side>0?p.RF:p.LF,mode=(l.side>0?lm.R:lm.L)||'ik',hz=p.hz+.1*l.side;l.th.position.set(p.hx,p.hy,hz);
  if(mode==='fk'){l.th.rotation.set(0,0,f.th*D);l.sh.rotation.z=f.kn*D;l.ft.rotation.z=(f.fa-f.th-f.kn)*D;return;}
  const dx=f.fx-p.hx,dy=f.fy-p.hy,dz=f.fz-hz,Lp=Math.hypot(dy,dz),al=Math.atan2(-dz,-dy),dist=Math.hypot(dx,Lp),c=Math.acos(Math.min(1,dist/(2*LEG))),b=Math.atan2(dx,Lp);
  l.th.rotation.set(al,0,b+c);l.sh.rotation.z=-2*c;l.ft.rotation.z=f.fa*D-(b-c);});
 scene.updateMatrixWorld(true);
 placeKB(K1,ex.kb,ex.kb2,p.kbw);
 K2.g.visible=!!ex.kbL;if(ex.kbL)placeKB(K2,ex.kbL,ex.kbL2,p.kbwL||0);
 scene.updateMatrixWorld(true);}
function apply(ex,t){const r=poseAt(ex,t);applyPose(ex,r.p);return r.txt;}
return{apply,applyPose,poseAt,prep,arms,kb,bell,bodyMeshes,T,legs,K2,setProps,props};}

