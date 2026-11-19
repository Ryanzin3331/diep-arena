'use strict';
const fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks');const source=fs.readFileSync('index.html','utf8').split('<script id="core">')[1].split('</script>')[0];const c=vm.createContext({console,TextEncoder});vm.runInContext(source+';globalThis.api={Arena,changeClass,hull,C}',c);
for(const map of ['open','maze'])for(const initial of [0,32]){
 const samples=[];
 for(const seed of [7101,7102,7103]){
  const w=new c.api.Arena(seed,36,null,'both',true,map,'off');
  // Arrange a local encounter, respecting the existing Maze collision geometry.
  const anchor=w.tanks[0],cx=anchor.x,cy=anchor.y,spots=[];
  for(let r=0;r<=300&&spots.length<12;r+=45)for(let a=0;a<16&&spots.length<12;a++){
   const x=cx+r*Math.cos(a*Math.PI/8),y=cy+r*Math.sin(a*Math.PI/8);
   if(x<100||y<100||x>w.size-100||y>w.size-100||w.maze?.hit(x,y,x,y,22)!=null)continue;
   if(spots.some(p=>Math.hypot(p.x-x,p.y-y)<38))continue;spots.push({x,y});
  }
  if(spots.length<12)throw Error('não foi possível posicionar a cena');
  for(let i=0;i<12;i++)Object.assign(w.tanks[i],{x:spots[i].x,y:spots[i].y,px:spots[i].x,py:spots[i].y});
  for(let i=0;i<4;i++){const t=w.tanks[i];t.level=30;c.api.changeClass(t,'Overseer',true);t.hp=c.api.hull(t);if(initial)for(let j=0;j<8;j++)w.spawnShot(t,c.api.C.Overseer.guns[j%2]);}
  w.indexSense();let near=0,droneTotal=0,stepMs=0;
  for(let tick=0;tick<240;tick++){const start=performance.now();w.step(null);stepMs+=performance.now()-start;const drones=w.shots.filter(p=>p.alive&&p.kind==='drone');droneTotal+=drones.length;for(const p of drones)for(const t of w.tanks)if(t.alive&&!t.human&&p.owner!==t&&(t.x-p.x)**2+(t.y-p.y)**2<430**2)near++;}
  samples.push({seed,msPerTick:stepMs/240,averageDrones:droneTotal/240,nearPairsPerTick:near/240});
 }
 console.log(JSON.stringify({map,initialDrones:initial,samples}));
}
