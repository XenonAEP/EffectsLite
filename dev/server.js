const http=require('http'),fs=require('fs'),path=require('path');
module.exports=function(){ return new Promise(res=>{
 const s=http.createServer((q,r)=>{
  r.setHeader('Access-Control-Allow-Origin','*'); r.setHeader('Access-Control-Allow-Headers','*');
  if(q.method==='OPTIONS'){r.end();return}
  let b='';q.on('data',d=>b+=d);q.on('end',()=>{
   try{const {op,args}=JSON.parse(b);let out;
    if(op==='existsSync')out=fs.existsSync(args[0]);
    else if(op==='readdirSync')out=fs.readdirSync(args[0],{withFileTypes:true}).map(d=>({name:d.name,dir:d.isDirectory()}));
    else if(op==='statSync'){const st=fs.statSync(args[0]);out={dir:st.isDirectory(),size:st.size,mtimeMs:st.mtimeMs}}
    else if(op==='mkdirSync')out=fs.mkdirSync(args[0],args[1])||null;
    else if(op==='readFileSync')out=fs.readFileSync(args[0],'utf8');
    else if(op==='writeFileSync')out=fs.writeFileSync(args[0],args[1]&&args[1].b64?Buffer.from(args[1].b64,'base64'):args[1])||null;
    else out=fs[op](...args)||null;
    r.end(JSON.stringify({r:out===undefined?null:out}));
   }catch(e){r.end(JSON.stringify({err:e.message,code:e.code}))}
  });
 });
 s.listen(0,()=>res(s));
});};
