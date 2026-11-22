// Browser-side stand-in for CEP's Node integration: sync XHR -> tiny local fs server.
(function(){
  var BASE = window.__FSBASE__;
  function call(op, args){
    var x = new XMLHttpRequest(); x.open('POST', BASE + '/fs', false);
    x.send(JSON.stringify({op: op, args: args}));
    var r = JSON.parse(x.responseText);
    if (r.err) { var e = new Error(r.err); e.code = r.code; throw e; }
    return r.r;
  }
  function norm(p){ var abs=p.charAt(0)==='/', out=[]; p.split('/').forEach(function(s){ if(!s||s==='.')return; if(s==='..')out.pop(); else out.push(s); }); return (abs?'/':'')+out.join('/'); }
  var path = {
    sep:'/', join:function(){ return norm([].slice.call(arguments).filter(Boolean).join('/')); },
    resolve:function(){ var a=[].slice.call(arguments).filter(Boolean); return norm(a.join('/')); },
    dirname:function(p){ var i=p.lastIndexOf('/'); return i<=0?'/':p.slice(0,i); },
    basename:function(p){ return p.slice(p.lastIndexOf('/')+1); }
  };
  var stat=function(op){ return function(p){ var s=call(op,[p]); return {isDirectory:function(){return s.dir}, isSymbolicLink:function(){return false}, size:s.size, mtimeMs:s.mtimeMs}; }; };
  var fs = {
    existsSync:function(p){return call('existsSync',[p])},
    readdirSync:function(p,o){ var l=call('readdirSync',[p]); return (o&&o.withFileTypes)? l.map(function(e){return {name:e.name,isDirectory:function(){return e.dir}}}) : l.map(function(e){return e.name}); },
    statSync:stat('statSync'), lstatSync:stat('statSync'),
    mkdirSync:function(p,o){return call('mkdirSync',[p,o||{}])}, renameSync:function(a,b){return call('renameSync',[a,b])},
    rmdirSync:function(p){return call('rmdirSync',[p])}, unlinkSync:function(p){return call('unlinkSync',[p])},
    copyFileSync:function(a,b){return call('copyFileSync',[a,b])},
    readFileSync:function(p){return call('readFileSync',[p])},
    writeFileSync:function(p,d){ return call('writeFileSync',[p, d && d.__b64 ? {b64:d.__b64} : d]); }
  };
  window.Buffer = { from:function(b,enc){ return {__b64:b}; } };
  var mods = { fs:fs, path:path, os:{homedir:function(){return window.__HOME__}}, child_process:{spawn:function(){ window.__spawned=(window.__spawned||[]).concat([[].slice.call(arguments)]); return {unref:function(){}} }} };
  window.require = function(n){ return mods[n]; };
})();
