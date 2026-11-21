'use strict';
const {readFileSync}=require('node:fs');
const {webcrypto}=require('node:crypto');
const {resolve}=require('node:path');
const {EventEmitter}=require('node:events');
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const html=readFileSync(resolve(__dirname,'../index.html'),'utf8');
const core=html.split('<script id="core">')[1].split('</script>')[0];
const app=html.split('<script id="app">')[1].split('</script>')[0];
const roomCode=app.slice(app.indexOf('const ROOM_VERSION='),app.indexOf('el("multi").onclick='));

function network(){
  const peers=new Map(),traffic=[];
  let next=0;
  class Connection extends EventEmitter{
    constructor(){
      super();
      this.open=false;
      this.dataChannel={bufferedAmount:0};
    }
    send(data){
      const copy=structuredClone(data);
      traffic.push({conn:this,data:copy});
      setImmediate(()=>{if(this.other.open)this.other.emit('data',copy);});
    }
    close(){
      const other=this.other;
      this.open=other.open=false;
      setImmediate(()=>{this.emit('close');other.emit('close');});
    }
  }
  class Peer extends EventEmitter{
    constructor(id){
      super();
      this.id=typeof id==='string'?id:'guest-'+ ++next;
      this.connections=[];
      peers.set(this.id,this);
      setImmediate(()=>this.emit('open'));
    }
    connect(id){
      const host=peers.get(id),guest=new Connection(),incoming=new Connection();
      guest.other=incoming;
      incoming.other=guest;
      this.connections.push(guest);
      host.connections.push(incoming);
      setImmediate(()=>{
        host.emit('connection',incoming);
        guest.open=incoming.open=true;
        incoming.emit('open');
        guest.emit('open');
      });
      return guest;
    }
    destroy(){
      peers.delete(this.id);
      for(const conn of this.connections)if(conn.open)conn.close();
    }
  }
  return {Peer,traffic};
}
function client(net,name){
  const nodes=new Map(),noOp=()=>{};
  const el=id=>{
    if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',close:noOp,showModal:noOp});
    return nodes.get(id);
  };
  el('roomName').value=name;
  let now=0;
  const context=vm.createContext({
    console,TextEncoder,ArrayBuffer,Float32Array,performance:{now:()=>now},
    window:{Peer:net.Peer},Peer:net.Peer,crypto:webcrypto,
    document:{hidden:false},el,clearTimeout:noOp,setTimeout:()=>1,
    closeReplay:noOp,saveBotMemory:noOp,setSidePanel:noOp,cleanseInputs:noOp,
    updateInterface:noOp,resize:noOp,enterGuestFullscreen:noOp,restart:noOp,randomSeed:()=>7101,syncPhoneControls:noOp,dockStats:noOp,updateClassEvolution:noOp
  });
  const state='let playerName="Player", autoFullRoom=null, world, mode, pending, paused, acc, follow, focusId, optStats, humanAuto, freeSelection, renderedTarget, highlightView, arenaTransition=0, transitionPending=false;const camera={},pointer={};';
  vm.runInContext(core+'\n'+state+'\n'+roomCode+
    ';globalThis.api={get room(){return room},get world(){return world},openRoom,closeRoom,stepRoomHost,sendRoomSnapshot,roomBlend,roomGuestAction,roomShotStarts,tickRoom};',context);
  context.humanCommand=()=>({x:0,y:0,aim:0,fire:false,alt:false});
  return {api:context.api,el,clock:value=>{now=value;}};
}
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);};
async function makeRoom(count,restartOnDeath=false){
  const net=network(),host=client(net,'Host'),guests=[];
  host.el('roomSize').value=String(count);
  host.el('roomBots').value='8';
  host.el('roomRestartOnDeath').value=restartOnDeath?'on':'off';
  await host.api.openRoom('host');
  await flush();
  async function join(name){
    const guest=client(net,name);
    guest.el('roomCode').value=host.api.room.code;
    await guest.api.openRoom('guest');
    await flush();
    return guest;
  }
  for(let slot=1;slot<count;slot++){
    guests.push(await join('Guest '+slot));
    if(slot<count-1)assert.equal(guests.at(-1).api.room.phase,'lobby');
  }
  return {host,guests,join,net};
}
function next(host,now){
  host.clock(now);
  host.api.stepRoomHost(host.api.room,host.api.world.human.alive);
  host.api.sendRoomSnapshot(host.api.room,now);
}

test('quatro jogadores recebem arenas e controles independentes; o quinto é recusado',async()=>{
  const {host,guests,join}=await makeRoom(4);
  assert.equal(host.api.world.tanks.filter(t=>t.human).length,4);
  assert.equal(host.api.world.tanks.length,12);
  assert.deepEqual(guests.map(g=>g.api.world.human.slot),[1,2,3]);
  assert.equal((await join('Extra')).api.room,null);
  const [a,b]=guests;
  a.api.roomGuestAction('input',{x:1,y:0,aim:0});
  b.api.roomGuestAction('input',{x:0,y:1,aim:0});
  await flush();
  next(host,15);
  const tanks=host.api.world.tanks.filter(t=>t.human);
  assert.deepEqual(Array.from(tanks,t=>[t.intent.x,t.intent.y]),[[0,0],[1,0],[0,1],[0,0]]);
});

test('duelo de dois jogadores começa com um convidado; trio reinicia ao morrer',async()=>{
  const two=await makeRoom(2,true);
  assert.equal(two.guests[0].api.room.phase,'playing');
  const {host,guests}=await makeRoom(3,true);
  const w=host.api.world,step=w.step,player=w.tanks.find(t=>t.human&&t.slot===1);
  w.step=function(...args){step.apply(this,args);this.step=step;this.kill(player,this.human,'teste');};
  next(host,50);
  await flush();
  assert.equal(host.api.room.restartAt,4050);
  assert.ok(guests.every(g=>g.api.world.duelEnded));
  assert.equal(host.api.world.winner,null);
  host.clock(4050);
  host.api.tickRoom(4050);
  await flush();
  assert.ok(guests.every(g=>g.api.room.round===2&&g.api.world.human.alive));
});

test('placar e renascimento respeitam o jogador; a saída de um preserva a sala',async()=>{
  const {host,guests}=await makeRoom(4);
  const w=host.api.world,step=w.step,humans=w.tanks.filter(t=>t.human);
  w.step=function(...args){step.apply(this,args);this.step=step;this.kill(humans[2],humans[3],'teste');};
  next(host,100);
  await flush();
  assert.equal(guests[2].api.room.points[3],1);
  assert.equal(guests[1].api.world.human.alive,false);
  guests[1].api.roomGuestAction('respawn');
  await flush();
  next(host,175);
  await flush();
  assert.ok(guests[1].api.world.human.alive);
  assert.notEqual(guests[1].api.world.human.id,humans[2].id);
  guests[2].api.closeRoom();
  await flush();
  next(host,250);
  await flush();
  assert.equal(host.api.room.phase,'playing');
  assert.equal(guests[0].api.world.tanks.filter(t=>t.human).length,3);
});

test('formas usam frequência menor e uma conexão congestionada não bloqueia as demais',async()=>{
  const {host,guests,net}=await makeRoom(3);
  const [member]=host.api.room.guests.values();
  const forms=guests[0].api.room.scene.forms;
  member.conn.dataChannel.bufferedAmount=100000;
  next(host,67);
  await flush();
  assert.equal(guests[0].api.world.tick,0);
  assert.equal(guests[1].api.world.tick,1);
  member.conn.dataChannel.bufferedAmount=0;
  next(host,134);
  await flush();
  assert.equal(guests[0].api.world.tick,2);
  assert.equal(guests[0].api.room.scene.forms,forms);
  next(host,201);
  await flush();
  assert.notEqual(guests[0].api.room.scene.forms,forms);
  const frames=net.traffic.filter(x=>x.conn===member.conn&&x.data.type==='state');
  assert.deepEqual(frames.map(x=>!!x.data.forms),[true,false,true]);
});

test('um novo quadro de projéteis continua da posição visual atual',async()=>{
  const {host}=await makeRoom(2);
  const old={shots:Float32Array.of(40,90,3,0,0,0,73),shotStarts:Float32Array.of(20,50)};
  const next=Float32Array.of(65,100,3,0,0,0,73,7,9,3,0,0,0,74);
  assert.deepEqual(Array.from(host.api.roomShotStarts(next,old,.5)),[30,70,7,9]);
});
