localStorage.setItem("diep-arena:player-color","#d12488");
playerTankColor="#d12488";
let measurement=null;
function sampleRoomAudit(now){
  if(measurement&&room?.phase==="playing"){
    if(measurement.lastFrame!==null)measurement.frames.push(now-measurement.lastFrame);
    measurement.lastFrame=now;
    const received=room.received;
    if(received!==null&&received!==undefined&&received!==measurement.lastSnapshot){
      if(measurement.lastSnapshot!==null)measurement.snapshots.push(received-measurement.lastSnapshot);
      measurement.lastSnapshot=received;
    }
    measurement.maxShots=Math.max(measurement.maxShots,(room.scene?.shots.length??0)/ROOM_SHOT_STRIDE);
  }
  requestAnimationFrame(sampleRoomAudit);
}
requestAnimationFrame(sampleRoomAudit);
window.auditRoom={
  get room(){return room;},get world(){return world;},get measurement(){return measurement;},
  host(size,bots,reset){
    showRoomDialog();el("roomName").value="Anfitrião";el("roomSize").value=size;el("roomBots").value=bots;
    el("roomRestartOnDeath").value=reset?"on":"off";el("roomHostForm").requestSubmit();
  },
  join(code,name){showRoomDialog();el("roomName").value=name;el("roomCode").value=code;el("roomJoinForm").requestSubmit();},
  leave(){if(room)closeRoom();},
  key(key,down){canvas.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{key,bubbles:true}));},
  measure(){measurement={frames:[],snapshots:[],lastFrame:null,lastSnapshot:null,maxShots:0};},
  killOnNextStep(slot){
    const step=world.step;
    world.step=function(...args){
      step.apply(this,args);this.step=step;
      this.kill(this.tanks.find(t=>t.human&&t.slot===slot),this.human,"teste");
    };
  }
};
