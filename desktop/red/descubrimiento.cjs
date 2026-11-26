const dgram = require('node:dgram');
const { createHmac, timingSafeEqual, randomBytes } = require('node:crypto');
const { networkInterfaces } = require('node:os');
const GROUP = '239.255.43.21';
const PORT = 43421;
function sign(body, key) { return createHmac('sha256', key).update(JSON.stringify(body)).digest('hex'); }
function encode(body, key) { return Buffer.from(JSON.stringify({ body, signature: sign(body, key) })); }
function decode(buffer, key) {
  try {
    if (buffer.length > 2048 || !/^[a-f0-9]{64}$/i.test(key)) return null;
    const {body, signature} = JSON.parse(buffer.toString());
    if (!body || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return null;
    if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(sign(body,key), 'hex'))) return null;
    if (body.service !== 'club-systems-v1') return null;
    return body;
  } catch { return null; }
}
function interfaces() {
  return Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i=>i.address);
}
function configure(socket) {
  socket.setMulticastTTL(1);
  for (const address of interfaces()) { try { socket.addMembership(GROUP, address); } catch {} }
}
function advertise({key,id,name,port,address}, onError=()=>{}) {
  if (!/^[a-f0-9]{64}$/i.test(key) || !id || !Number.isInteger(port) || port<1 || port>65535) throw Error('Configuración de red inválida');
  const socket=dgram.createSocket({type:'udp4',reuseAddr:true});
  socket.on('error',onError);
  socket.on('message',(buffer,remote)=>{
    const nic=Object.values(networkInterfaces()).flat().find(i=>i?.address===address);
    const integer=ip=>ip.split('.').reduce((a,n)=>(a<<8)|Number(n),0);
    if(!nic || (integer(remote.address)&integer(nic.netmask))!==(integer(address)&integer(nic.netmask)))return;
    const query=decode(buffer,key);
    if (!query || query.type!=='discover' || !/^[a-f0-9]{32}$/.test(query.nonce||'')) return;
    const body={service:'club-systems-v1',type:'server',nonce:query.nonce,id,name:String(name).slice(0,80),port};
    socket.send(encode(body,key),remote.port,remote.address,()=>{});
  });
  socket.bind(PORT,'0.0.0.0',()=>{socket.setMulticastTTL(1);try{socket.addMembership(GROUP,address);socket.setMulticastInterface(address);}catch(error){onError(error);}});
  return ()=>{try{socket.close();}catch{}};
}
function discover(key, timeout=3500) {
  return new Promise((resolve,reject)=>{
    if (!/^[a-f0-9]{64}$/i.test(key)) return reject(Error('Clave de vinculación inválida'));
    const socket=dgram.createSocket('udp4'); const nonce=randomBytes(16).toString('hex'); const found=new Map();
    let interval,done=false;
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);clearInterval(interval);try{socket.close();}catch{};error?reject(error):resolve([...found.values()]);};
    const timer=setTimeout(()=>finish(),timeout);
    socket.on('error',finish);
    socket.on('message',(buffer,remote)=>{
      const body=decode(buffer,key);
      if (!body || body.type!=='server' || body.nonce!==nonce || typeof body.id!=='string' || !/^[a-f0-9-]{36}$/i.test(body.id) || !Number.isInteger(body.port) || body.port<1 || body.port>65535) return;
      found.set(body.id,{id:body.id,name:String(body.name).slice(0,80),url:`http://${remote.address}:${body.port}/`});
    });
    socket.bind(0,'0.0.0.0',()=>{
      socket.setMulticastTTL(1);
      const send=()=>{for(const address of interfaces()){try{socket.setMulticastInterface(address);socket.send(encode({service:'club-systems-v1',type:'discover',nonce},key),PORT,GROUP,()=>{});}catch{}}};
      send();interval=setInterval(send,700);
    });
  });
}
module.exports={advertise,discover,encode,decode};
