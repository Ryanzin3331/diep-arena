const fs=require('fs'),vm=require('vm'),{performance}=require('perf_hooks');
function load(path){const s=fs.readFileSync(path,'utf8').split('<script id="core">')[1].split('</script>')[0];const c=vm.createContext({console,TextEncoder});vm.runInContext(s+';globalThis.Arena=Arena',c);return c.Arena;}
const A=load(process.argv[2]||'/tmp/2a-base.html'),B=load('index.html'),out={};
for(const map of ['open','maze']){out[map]={base:[],novo:[]};for(let i=0;i<5;i++){const seed=7101+i;for(const name of i%2?['novo','base']:['base','novo']){const Cls=name==='base'?A:B;const w=new Cls(seed,36,null,'both',true,map,'off');for(let n=0;n<120;n++)w.step(null);const start=performance.now();for(let n=0;n<240;n++)w.step(null);out[map][name].push((performance.now()-start)/240);}}}
console.log(JSON.stringify(out));
