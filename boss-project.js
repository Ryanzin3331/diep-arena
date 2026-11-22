// Runtime format for JSON exported by the Montador de Chefes (versions 1–8).
const BossProject=(()=>{
  const TAU=Math.PI*2,RAD=Math.PI/180;
  const FILE_LIMIT=5_000_000;
  const PHASE_LIMIT=8;
  const BODIES={circle:"Círculo",triangle:"Triângulo",square:"Quadrado",pentagon:"Pentágono",hex:"Hexágono",oct:"Octógono"};
  const SIDES={circle:0,triangle:3,square:4,pentagon:5,hex:6,oct:8};
  const KINDS={barrel:"Canhão",plate:"Blindagem",core:"Núcleo",poly:"Polígono"};
  const TYPES={
    square:{label:"Quadrado",sides:4,weight:1,radius:15,color:"#ebc452",damage:8,speed:250,extra:0},
    triangle:{label:"Triângulo",sides:3,weight:1,radius:19,color:"#ec856a",damage:11,speed:420,extra:0},
    pentagon:{label:"Pentágono azul",sides:5,weight:2,radius:28,color:"#8884e1",damage:17,speed:300,extra:.18},
    alpha:{label:"Pentágono alfa",sides:5,weight:5,radius:46,color:"#7776d9",damage:28,speed:205,extra:.45}
  };
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const n=(value,fallback,min,max)=>{
    if(typeof value!=="number"&&(typeof value!=="string"||!value.trim()))return fallback;
    const number=Number(value);return Number.isFinite(number)?clamp(number,min,max):fallback;
  };
  const label=(value,fallback)=>typeof value==="string"?value.trim().slice(0,45)||fallback:fallback;
  const color=(value,fallback)=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
  const values=list=>new Set(Object.keys(list));
  const bodyKinds=values(BODIES),partKinds=values(KINDS);
  let partSerial=0;
  function nextPartId(){return "p-"+Date.now().toString(36)+"-"+(++partSerial);}
  const makePart=(kind,x=85,y=0)=>({id:nextPartId(),name:KINDS[kind],kind,x,y,origin:null,w:kind==="barrel"?92:52,h:kind==="barrel"?27:45,
    angle:0,shape:kind==="poly"?"triangle":"hex",fill:kind==="core"?"#eac771":"#929e9c",line:"#444957",stroke:5,opacity:100});
  function stagePreset(i){
    const s={
      title:["Coleta","Escudo carregado","Sobrecarga"][i],hp:[100,70,35][i],orbitEnabled:true,orbitShape:"circle",orbitPoints:null,
      body:"hex",radius:[58,62,66][i],angle:30,fill:["#747787","#7c748f","#8d655d"][i],line:"#3f4351",stroke:6,
      capacity:[6,9,12][i],radiusOrbit:[135,158,184][i],speedOrbit:[39,48,58][i], clockwise:true,showRing:true,
      aim:0,warning:.75,cooldown:3,parts:[],orbits:{},behaviors:[]
    };
    s.parts.push(
      {...makePart("barrel",43,-22),name:"Canhão superior",angle:-13,w:94,h:26},
      {...makePart("barrel",43,22),name:"Canhão inferior",angle:13,w:94,h:26},
      {...makePart("plate",-33,0),name:"Placa traseira",w:37,h:79,fill:["#646879","#9b8562","#ac815f"][i]},
      {...makePart("core",-4,0),name:"Núcleo",w:65,h:65,fill:["#b2bcac","#e1ba72","#f19163"][i]}
    );
    if(i>=1)s.parts.splice(3,0,{...makePart("poly",-39,0),name:"Marca de fase",shape:"triangle",angle:180,w:32,h:32,fill:"#e2bf79",stroke:3});
    if(i===2)s.parts.push({...makePart("core",-4,0),name:"Miolo quente",w:28,h:28,fill:"#f7d49a",stroke:3});
    const requested=[[3,3,0,0],[3,2,2,0],[2,3,1,1]][i];
    Object.entries(TYPES).forEach(([key,type],j)=>{
      s.orbits[key]={qty:requested[j],limit:[6,6,i===0?0:3,i===2?1:0][j],
        damage:type.damage,speed:type.speed,extra:type.extra,fill:type.color,scale:100};
    });
    return s;
  }
  function blankStage(i){
    const base=stagePreset(0);
    base.title="Fase "+(i+1);base.hp=i?Math.max(1,100-25*i):100;
    base.fill="#789ab0";base.line="#354c5b";base.parts=[];base.capacity=0;base.showRing=false;base.orbitEnabled=false;
    for(const item of Object.values(base.orbits)){item.qty=0;item.limit=0;}
    return base;
  }
  const defaults=()=>({version:8,template:"scrapper",name:"Sucateiro",stages:[0,1,2].map(stagePreset)});
  const blankProject=()=>({version:8,template:"blank",name:"Novo chefe",stages:[blankStage(0)]});
  function orderThresholds(stages){
    stages[0].hp=100;
    for(let i=1;i<stages.length;i++){
      stages[i].hp=Math.round(clamp(stages[i].hp,stages.length-i,stages[i-1].hp-1));
    }
  }
  const shotTriggers={interval:"A cada intervalo",enter:"Ao entrar na fase",near:"Quando o tanque está no alcance"};
  const shotModes={alternate:"Alternar emissores",together:"Disparar juntos"};
  const shotAims={track:"Acompanhar continuamente",target:"Mirar só ao disparar",spin:"Girar continuamente",fixed:"Seguir ângulo da peça"};
  const mechanicsTypes={fire:"Disparo",drones:"Invocar drones",move:"Mover chefe",launch:"Lançar peça orbital"};
  const droneModes={orbit:"Orbitar o chefe",chase:"Perseguir o tanque"};
  const moveModes={patrol:"Patrulhar em círculo",distance:"Manter distância do tanque",dash:"Investir em direção ao tanque"};
  const fitsEmitter=p=>p.kind==="barrel"||p.origin!==null;
  const droneShapeNames={triangle:"Triângulo",circle:"Elipse",rect:"Retângulo",pentagon:"Pentágono",hex:"Hexágono",path:"Polígono"};
  const droneLayerLimit=18,dronePointLimit=48,droneCoordLimit=36;
  function makeDroneLayer(shape,fill){
    return {name:droneShapeNames[shape],shape,x:0,y:0,w:22,h:22,angle:0,scale:100,scaleY:100,fill,line:"#5d5940",stroke:2.6,points:[]};
  }
  function normalizeDroneModel(raw,fill){
    if(!Array.isArray(raw))return null;
    const layers=[];
    for(const layer of raw.slice(0,droneLayerLimit)){
      if(!layer||!Object.hasOwn(droneShapeNames,layer.shape))continue;
      const base=makeDroneLayer(layer.shape,fill),limit=droneCoordLimit;
      const points=Array.isArray(layer.points)?layer.points.slice(0,dronePointLimit)
        .filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))
        .map(p=>({x:clamp(p.x,-limit,limit),y:clamp(p.y,-limit,limit)})):[];
      if(layer.shape==="path"&&(points.length<3||!dronePathArea(points)))continue;
      layers.push({...base,name:label(layer.name,base.name),x:n(layer.x,0,-limit,limit),y:n(layer.y,0,-limit,limit),
        w:n(layer.w,base.w,2,60),h:n(layer.h,base.h,2,60),angle:n(layer.angle,0,-360,360),
        scale:n(layer.scale,100,25,200),scaleY:n(layer.scaleY,n(layer.scale,100,25,200),25,200),fill:color(layer.fill,fill),line:color(layer.line,base.line),
        stroke:n(layer.stroke,base.stroke,0,6),points:layer.shape==="path"?points:[]});
    }
    return layers.length?layers:null;
  }
  function dronePathArea(points){
    return Math.abs(points.reduce((area,p,i)=>{
      const next=points[(i+1)%points.length];
      return area+p.x*next.y-next.x*p.y;
    },0))*.5>=.25;
  }
  function droneLayerOutline(layer){
    if(layer.shape==="path")return layer.points;
    if(layer.shape==="rect")return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:x*layer.w/2,y:y*layer.h/2}));
    return Array.from({length:SIDES[layer.shape]},(_,i)=>{
      const angle=i*TAU/SIDES[layer.shape];
      return {x:Math.cos(angle)*layer.w/2,y:Math.sin(angle)*layer.h/2};
    });
  }
  function defaultMechanic(type,parts){
    const base={type,name:mechanicsTypes[type],enabled:true,trigger:"interval",interval:.8,range:280};
    if(type==="fire")return {...base,mode:"alternate",aim:"track",turnSpeed:145,damage:12,speed:420,
      barrels:parts.filter(fitsEmitter).map(p=>p.id)};
    if(type==="drones")return {...base,interval:2,mode:"chase",count:2,limit:6,speed:155,
      damage:7,life:10,orbitRadius:115,source:"body",fill:"#ddbc62",model:null};
    if(type==="move")return {...base,trigger:"enter",interval:3,mode:"patrol",speed:100,duration:10,distance:190};
    return {...base,interval:3,aim:"target"};
  }
  function normalizeMechanic(item,parts){
    const base=defaultMechanic(item.type,parts);
    const allowed=(options,key)=>Object.hasOwn(options,item[key])?item[key]:base[key];
    const numeric=(key,min,max)=>n(item[key],base[key],min,max);
    const rule={...base,name:label(item.name,base.name),enabled:item.enabled!==false,
      trigger:allowed(shotTriggers,"trigger"),interval:numeric("interval",.15,12),range:numeric("range",60,420)};
    if(rule.type==="fire"){
      const sources=new Set(base.barrels);
      return {...rule,mode:allowed(shotModes,"mode"),aim:allowed(shotAims,"aim"),
        turnSpeed:numeric("turnSpeed",-360,360),damage:numeric("damage",1,100),speed:numeric("speed",80,900),
        barrels:Array.isArray(item.barrels)?[...new Set(item.barrels.filter(id=>sources.has(id)))]:base.barrels};
    }
    if(rule.type==="drones")return {...rule,mode:allowed(droneModes,"mode"),
      count:Math.round(numeric("count",1,12)),limit:Math.round(numeric("limit",1,24)),
      speed:numeric("speed",40,500),damage:numeric("damage",1,75),life:numeric("life",1,30),
      orbitRadius:numeric("orbitRadius",35,230),source:parts.some(p=>p.id===item.source)?item.source:"body",
      fill:color(item.fill,base.fill),model:normalizeDroneModel(item.model,color(item.fill,base.fill))};
    if(rule.type==="move")return {...rule,mode:allowed(moveModes,"mode"),speed:numeric("speed",25,350),
      duration:numeric("duration",.25,30),distance:numeric("distance",40,260)};
    return {...rule,aim:item.aim==="fixed"?"fixed":"target"};
  }
  const orbitShapes={circle:"Circular",triangle:"Triangular",custom:"Personalizado"};
  const ORBIT_VERTEX_LIMIT=24,ORBIT_MIN_SEGMENT=.018;
  const orbitTriangle=()=>Array.from({length:3},(_,i)=>{
    const angle=-Math.PI/2+i*TAU/3;
    return {x:Math.cos(angle),y:Math.sin(angle)};
  });
  function limitOrbitPoint(x,y){
    const factor=Math.max(1,Math.hypot(x,y));
    return {x:x/factor,y:y/factor};
  }
  function normalizeOrbitPoints(raw){
    if(!Array.isArray(raw))return null;
    const points=[];
    for(const value of raw.slice(0,ORBIT_VERTEX_LIMIT)){
      if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y))continue;
      const p=limitOrbitPoint(value.x,value.y),last=points.at(-1);
      if(!last||Math.hypot(last.x-p.x,last.y-p.y)>=ORBIT_MIN_SEGMENT)points.push(p);
    }
    if(points.length>2&&Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<ORBIT_MIN_SEGMENT)points.pop();
    if(points.length<3)return null;
    const [a,b,...rest]=points;
    return rest.some(c=>Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>=.002)?points:null;
  }
  function makeOrbitTrack(points){
    let length=0;
    const edges=points.map((a,i)=>{
      const b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y;
      const size=Math.hypot(dx,dy),offset=length;
      length+=size;
      return {x:a.x,y:a.y,dx,dy,offset,size};
    });
    return {points,edges,length};
  }
  function trackForOrbit(s){
    if(s.orbitShape==="circle")return null;
    return makeOrbitTrack(s.orbitShape==="triangle"?orbitTriangle():s.orbitPoints??orbitTriangle());
  }
  function pointOnOrbit(track,turn){
    const distance=(turn-Math.floor(turn))*track.length;
    const edge=track.edges.find(e=>distance<e.offset+e.size)??track.edges.at(-1);
    const progress=(distance-edge.offset)/edge.size;
    return {x:edge.x+edge.dx*progress,y:edge.y+edge.dy*progress};
  }
  function normalizeCombat(raw){
    return {hp:Math.round(n(raw?.hp,1400,50,20000)),
      bodyDamage:n(raw?.bodyDamage,22,0,250),hitRadius:n(raw?.hitRadius,0,0,180)};
  }
  function normalize(raw){
    if(![1,2,3,4,5,6,7,8].includes(raw?.version)||!Array.isArray(raw.stages)||raw.stages.length<1||raw.stages.length>PHASE_LIMIT){
      throw Error("Use um JSON do montador com 1 a 8 fases.");
    }
    const project=raw.template==="blank"?blankProject():defaults();
    project.combat=normalizeCombat(raw.combat);
    project.name=label(raw.name,project.name);
    project.stages=raw.stages.map((value,i)=>{
      const base=project.template==="scrapper"&&i<3?stagePreset(i):blankStage(i),v=value??{};
      const s={...base,title:label(v.title,base.title),hp:i===0?100:n(v.hp,base.hp,1,99),body:bodyKinds.has(v.body)?v.body:base.body,
        radius:n(v.radius,base.radius,20,125),angle:n(v.angle,base.angle,-360,360),fill:color(v.fill,base.fill),
        line:color(v.line,base.line),stroke:n(v.stroke,base.stroke,0,16),
        capacity:Math.round(n(v.capacity,base.capacity,0,24)),radiusOrbit:n(v.radiusOrbit,base.radiusOrbit,80,230),
        speedOrbit:n(v.speedOrbit,base.speedOrbit,0,200),clockwise:v.clockwise!==false,showRing:v.showRing!==false,
        aim:n(v.aim,base.aim,-360,360),warning:n(v.warning,base.warning,.15,3),cooldown:n(v.cooldown,base.cooldown,0,20)};
      s.orbitEnabled=typeof v.orbitEnabled==="boolean"?v.orbitEnabled:base.orbitEnabled||s.capacity>0;
      s.orbitPoints=normalizeOrbitPoints(v.orbitPoints);
      s.orbitShape=Object.hasOwn(orbitShapes,v.orbitShape)?v.orbitShape:"circle";
      if(s.orbitShape==="custom"&&!s.orbitPoints)s.orbitPoints=orbitTriangle();
      const ids=new Set();
      if(Array.isArray(v.parts))s.parts=v.parts.slice(0,32).map(p=>{
        const b=makePart(partKinds.has(p?.kind)?p.kind:"plate");
        const id=typeof p?.id==="string"&&/^[-a-zA-Z0-9]{1,60}$/.test(p.id)&&!ids.has(p.id)?p.id:b.id;
        ids.add(id);
        const origin=p?.origin&&typeof p.origin==="object"
          ?{x:n(p.origin.x,b.kind==="barrel"?n(p.w,b.w,10,220)/2:0,-250,250),y:n(p.origin.y,0,-250,250)}:null;
        return {...b,id,origin,name:label(p?.name,b.name),
          x:n(p?.x,b.x,-250,250),y:n(p?.y,b.y,-220,220),w:n(p?.w,b.w,10,220),h:n(p?.h,b.h,10,195),
          angle:n(p?.angle,b.angle,-360,360),opacity:n(p?.opacity,b.opacity,15,100),stroke:n(p?.stroke,b.stroke,0,16),
          shape:bodyKinds.has(p?.shape)?p.shape:b.shape,fill:color(p?.fill,b.fill),line:color(p?.line,b.line)};
      });
      s.orbits=Object.fromEntries(Object.entries(base.orbits).map(([key,b])=>{
        const o=v.orbits?.[key]??{};
        return [key,{qty:Math.round(n(o.qty,b.qty,0,16)),limit:Math.round(n(o.limit,b.limit,0,16)),
          damage:n(o.damage,b.damage,0,300),speed:n(o.speed,b.speed,60,950),extra:n(o.extra,b.extra,0,2),
          fill:color(o.fill,b.fill),scale:n(o.scale,b.scale,50,145)}];
      }));
      s.behaviors=Array.isArray(v.behaviors)?v.behaviors.filter(rule=>Object.hasOwn(mechanicsTypes,rule?.type)).slice(0,12)
        .map(rule=>normalizeMechanic(rule,s.parts)):[];
      return s;
    });
    orderThresholds(project.stages);
    return project;
  }
  function pieceOrigin(p){
    return p.origin??{x:p.kind==="barrel"?p.w/2:0,y:0};
  }
  function barrelPose(p,angle){
    const rest=p.angle*RAD,half=p.kind==="barrel"?p.w/2:0;
    const rootX=p.x-Math.cos(rest)*half,rootY=p.y-Math.sin(rest)*half;
    const current=angle??rest,c=Math.cos(current),s=Math.sin(current);
    const x=rootX+c*half,y=rootY+s*half,origin=pieceOrigin(p);
    return {x,y,angle:current/RAD,muzzleX:x+c*origin.x-s*origin.y,muzzleY:y+s*origin.x+c*origin.y,rootX,rootY};
  }
  function stockFor(s){
    if(!s.orbitEnabled)return [];
    const stock=[];let room=s.capacity;
    // Reserve the allowed heavy pieces first, then fill empty space with the lighter forms.
    for(const key of ["alpha","pentagon","triangle","square"]){
      const o=s.orbits[key],weight=TYPES[key].weight;
      const take=Math.min(o.qty,o.limit,Math.floor(room/weight));
      for(let i=0;i<take;i++)stock.push({key,active:true});
      room-=take*weight;
    }
    return stock.map((entry,i)=>({...entry,id:i,angle:TAU*i/stock.length+Math.PI/7}));
  }

  function read(text){
    if(text.length>FILE_LIMIT)throw Error("O arquivo precisa ter até 5 MB.");
    let raw;
    try{raw=JSON.parse(text.replace(/^\uFEFF/,""));}catch{throw Error("JSON inválido. Exporte o arquivo novamente no Montador de Chefes.");}
    if(!Array.isArray(raw?.stages)||raw.stages.some(stage=>!stage||typeof stage!=="object"||Array.isArray(stage))){
      throw Error("O arquivo precisa conter as fases exportadas pelo Montador de Chefes.");
    }
    return normalize(raw);
  }
  function spec(project){
    const {name,combat,stages}=project;
    return {name,hp:combat.hp,body:combat.bodyDamage,r:combat.hitRadius||stages[0].radius,
      color:stages[0].fill,ammo:stages[0].fill,reward:0,guns:[],range:900,importedProject:project};
  }
  function clearStock(b){
    for(const form of b.authored?.stock??[])form.alive=false;
  }
  function clear(w,b){
    clearStock(b);
    if(b.authored)b.authored.warning=null;
    for(const p of w.shots)if(p.owner===b)w.removeShot(p);
  }
  function enter(w,b,index){
    clearStock(b);
    const project=b.spec.importedProject,phase=project.stages[index];
    const state=b.authored={index,phase,start:w.time,aims:Object.create(null),motion:null,
      homeX:b.authored?.homeX??b.x,homeY:b.authored?.homeY??b.y,
      track:trackForOrbit(phase),warning:null,coolUntil:w.time,
      rules:phase.behaviors.map(rule=>({rule,slot:0,next:w.time})),stock:[]};
    b.r=project.combat.hitRadius||phase.radius;
    b.aim=0;
    for(const entry of stockFor(phase)){
      w.addShape(entry.key,b.x,b.y,false);
      const form=w.shapes.at(-1),item=phase.orbits[entry.key];
      form.r=TYPES[entry.key].radius*item.scale/100;
      form.f={...form.f,color:item.fill,xp:0};
      form.authoredOrbit=entry.angle;
      state.stock.push(form);
    }
    positionStock(w,b,true);
    if(index){
      const message=b.name+" · "+phase.title;
      w.note(message);w.record("chefes",message,[b],b);
    }
  }
  function positionStock(w,b,entered=false){
    const {phase,start,track,stock}=b.authored;
    const rotation=(w.time-start)*phase.speedOrbit*RAD*(phase.clockwise?1:-1);
    for(const form of stock){
      if(!form.alive)continue;
      const angle=form.authoredOrbit+rotation;
      const offset=track?pointOnOrbit(track,angle/TAU):{x:Math.cos(angle),y:Math.sin(angle)};
      form.px=form.x;form.py=form.y;
      form.x=clamp(b.x+offset.x*phase.radiusOrbit,form.r,w.size-form.r);
      form.y=clamp(b.y+offset.y*phase.radiusOrbit,form.r,w.size-form.r);
      form.angle=angle+Math.PI/4;
      if(entered){form.px=form.x;form.py=form.y;}
    }
  }
  function nearest(w,b,range,x=b.x,y=b.y){
    let target=null,best=range*range;
    for(const t of w.tanks){
      if(!w.bossCanTarget(b,t))continue;
      const gap=(x-t.x)**2+(y-t.y)**2;
      if(gap<best){target=t;best=gap;}
    }
    return target;
  }
  function targetAim(b,p,target){
    const mount=barrelPose(p),dx=target.x-b.x-mount.rootX,dy=target.y-b.y-mount.rootY;
    return Math.atan2(dy,dx)-Math.asin(clamp(pieceOrigin(p).y/Math.max(1,Math.hypot(dx,dy)),-1,1));
  }
  function stepMotion(w,b,target,dt){
    b.px=b.x;b.py=b.y;b.vx=0;b.vy=0;
    const {motion,homeX,homeY}=b.authored;
    if(!motion||w.time>=motion.end)return;
    const {rule,heading,start}=motion;
    let x=b.x,y=b.y;
    if(rule.mode==="patrol"){
      const angle=heading+(w.time-start)*rule.speed/rule.distance;
      x=homeX+Math.cos(angle)*rule.distance;y=homeY+Math.sin(angle)*rule.distance;
    }else if(rule.mode==="distance"){
      if(!target)return;
      const distance=Math.hypot(b.x-target.x,b.y-target.y);
      if(Math.abs(distance-rule.distance)<12)return;
      const a=Math.atan2(b.y-target.y,b.x-target.x);
      x=target.x+Math.cos(a)*rule.distance;y=target.y+Math.sin(a)*rule.distance;
    }else{
      x+=Math.cos(heading)*rule.speed*dt;y+=Math.sin(heading)*rule.speed*dt;
    }
    const margin=Math.max(b.authored.phase.radius,b.r);
    const dx=clamp(x,margin,w.size-margin)-b.x,dy=clamp(y,margin,w.size-margin)-b.y;
    const fraction=Math.min(1,rule.speed*dt/Math.max(1e-9,Math.hypot(dx,dy)));
    b.vx=dx*fraction/dt;b.vy=dy*fraction/dt;
    b.x+=b.vx*dt;b.y+=b.vy*dt;
  }
  function spawn(w,b,{x,y,aim,speed,damage,r,fill,kind="bullet",life=4,visual=null,drone=null}){
    if(w.shots.length>=3000||x-r<0||y-r<0||x+r>w.size||y+r>w.size)return false;
    w.shots.push({type:"shot",id:++w.serial,owner:b,sourceClass:b.cls,kind,alive:true,life,age:0,
      x,y,px:x,py:y,vx:Math.cos(aim)*speed,vy:Math.sin(aim)*speed,r,angle:aim,damage,
      dur:Math.max(8,damage*.8),bornTick:w.tick,authoredShot:true,authoredFill:fill,authoredVisual:visual,authoredDrone:drone});
    if(drone)b.drones++;
    return true;
  }
  function fire(w,b,timer,pieces,target,controlled){
    if(!pieces.length)return false;
    const {rule}=timer,state=b.authored,group=rule.mode==="together"?pieces:[pieces[timer.slot%pieces.length]];
    let fired=false;
    for(const p of group){
      const aim=controlled.has(p.id)?state.aims[p.id]:rule.aim==="target"?targetAim(b,p,target):p.angle*RAD;
      const origin=barrelPose(p,aim);
      state.aims[p.id]=aim;
      fired=spawn(w,b,{x:b.x+origin.muzzleX,y:b.y+origin.muzzleY,aim,speed:rule.speed,damage:rule.damage,
        r:clamp(p.h*.21,4,10),fill:state.phase.fill})||fired;
    }
    return fired;
  }
  function drones(w,b,timer,target){
    const {rule}=timer,state=b.authored;
    const active=w.shots.reduce((sum,p)=>sum+Number(p.alive&&p.owner===b&&p.authoredDrone?.rule===rule),0);
    const count=Math.min(rule.count,rule.limit-active,64-b.drones);
    const source=state.phase.parts.find(p=>p.id===rule.source);
    const origin=source?barrelPose(source,state.aims[source.id]):{muzzleX:0,muzzleY:0};
    const x=b.x+origin.muzzleX,y=b.y+origin.muzzleY;
    const aim=target?Math.atan2(target.y-y,target.x-x):0;
    let fired=false;
    for(let i=0;i<count;i++){
      fired=spawn(w,b,{x,y,aim,speed:0,damage:rule.damage,r:11,fill:rule.fill,kind:"drone",life:rule.life,
        visual:rule.model?{model:rule.model}:null,
        drone:{rule,bearing:w.time*2+i*TAU/count,spread:(i-(count-1)/2)*26}})||fired;
    }
    return fired;
  }
  function advanceDrone(w,p,dt){
    const {rule,bearing,spread}=p.authoredDrone,b=p.owner;
    const target=rule.mode==="chase"?nearest(w,b,b.spec.range,p.x,p.y):null;
    const a=bearing+p.age*rule.speed/(rule.orbitRadius*1.5);
    let x=b.x+Math.cos(a)*rule.orbitRadius,y=b.y+Math.sin(a)*rule.orbitRadius;
    if(target){
      const dx=target.x-p.x,dy=target.y-p.y,distance=Math.hypot(dx,dy);
      const offset=clamp(spread,-distance*.28,distance*.28)/Math.max(1,distance);
      x=target.x-dy*offset;y=target.y+dx*offset;
    }
    const dx=clamp(x,p.r,w.size-p.r)-p.x,dy=clamp(y,p.r,w.size-p.r)-p.y;
    const factor=Math.min(rule.speed/Math.max(1e-9,Math.hypot(dx,dy)),1/dt);
    p.vx=dx*factor;p.vy=dy*factor;
    if(Math.hypot(dx,dy)>1)p.angle=Math.atan2(dy,dx);
  }
  function stepLaunch(w,b,target){
    const state=b.authored,warn=state.warning;
    if(!warn)return;
    const {form,rule}=warn;
    if(!form.alive){state.warning=null;return;}
    if(rule.aim==="target"&&target)warn.aim=Math.atan2(target.y-form.y,target.x-form.x);
    if(w.time<warn.at)return;
    state.warning=null;
    const item=state.phase.orbits[form.name],aim=warn.aim;
    if(spawn(w,b,{x:form.x,y:form.y,aim,speed:item.speed,damage:item.damage,r:form.r,
      fill:item.fill,visual:{sides:TYPES[form.name].sides,angleOffset:Math.PI/4},life:7})){
      form.alive=false;state.coolUntil=w.time+state.phase.cooldown;
    }
  }
  function advance(w,b,dt){
    const phases=b.spec.importedProject.stages,percent=b.hp/b.spec.hp*100;
    let index=b.authored.index;
    while(index+1<phases.length&&percent<=phases[index+1].hp+1e-8)index++;
    if(index!==b.authored.index)enter(w,b,index);
    const state=b.authored;
    const target=nearest(w,b,b.spec.range);
    stepMotion(w,b,target,dt);positionStock(w,b);stepLaunch(w,b,target);
    const controlled=new Set();
    for(const {rule} of state.rules){
      if(!rule.enabled||rule.type!=="fire"||!["track","spin"].includes(rule.aim))continue;
      for(const p of state.phase.parts){
        if(!rule.barrels.includes(p.id)||controlled.has(p.id))continue;
        const previous=state.aims[p.id]??p.angle*RAD;
        if(rule.aim==="spin")state.aims[p.id]=p.angle*RAD+(w.time-state.start)*rule.turnSpeed*RAD;
        else if(target){
          const desired=targetAim(b,p,target)-previous;
          const limit=Math.max(30,Math.abs(rule.turnSpeed))*RAD*dt;
          state.aims[p.id]=previous+clamp(Math.atan2(Math.sin(desired),Math.cos(desired)),-limit,limit);
        }else state.aims[p.id]=previous;
        controlled.add(p.id);
      }
    }
    for(const timer of state.rules){
      const {rule}=timer;
      if(!rule.enabled||w.time+1e-8<timer.next)continue;
      const foe=rule.trigger==="near"?nearest(w,b,rule.range):target;
      if(rule.trigger==="near"&&!foe)continue;
      let triggered=false;
      if(rule.type==="fire"){
        if(!foe&&["target","track"].includes(rule.aim))continue;
        triggered=fire(w,b,timer,state.phase.parts.filter(p=>rule.barrels.includes(p.id)),foe,controlled);
      }else if(rule.type==="drones"){
        triggered=drones(w,b,timer,foe);
      }else if(rule.type==="move"){
        const patrol=rule.mode==="patrol";
        if(!foe&&!patrol||state.motion&&w.time<state.motion.end)continue;
        const heading=patrol?Math.atan2(b.y-state.homeY,b.x-state.homeX):Math.atan2(foe.y-b.y,foe.x-b.x);
        state.motion={rule,heading,start:w.time,end:w.time+rule.duration};
        triggered=true;
      }else if(!state.warning&&w.time>=state.coolUntil){
        const form=state.stock.find(f=>f.alive);
        if(!form||rule.aim==="target"&&!foe)continue;
        const aim=rule.aim==="target"?Math.atan2(foe.y-form.y,foe.x-form.x):state.phase.aim*RAD;
        state.warning={form,rule,at:w.time+state.phase.warning+state.phase.orbits[form.name].extra,aim};
        triggered=true;
      }
      if(triggered){
        timer.slot++;timer.next=rule.trigger==="enter"?Infinity:w.time+rule.interval;
      }
    }
  }

  function snapshot(w){
    if(!w.boss?.spec.importedProject)return undefined;
    return w.shots.filter(p=>p.alive&&p.authoredVisual)
      .map(({x,y,r,angle,authoredVisual,authoredFill})=>({x,y,r,angle,authoredVisual,authoredFill}));
  }
  function snapshotBoss(b){
    const {index,aims,warning,stock,track}=b.authored;
    return {index,track,aims:Object.assign(Object.create(null),aims),warning:warning?.form.alive?{id:warning.form.id,aim:warning.aim}:null,
      stock:stock.filter(f=>f.alive).map(({id,x,y,r,angle,hp,damaged,f})=>({id,x,y,r,angle,hp,damaged,f,alive:true}))};
  }
  return {FILE_LIMIT,read,spec,enter,advance,advanceDrone,clear,snapshot,snapshotBoss,barrelPose,droneLayerOutline};
})();
