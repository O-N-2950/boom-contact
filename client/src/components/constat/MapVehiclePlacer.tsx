// client/src/components/constat/MapVehiclePlacer.tsx
// Conducteur positionne son véhicule sur la vraie carte
// Géocodage Nominatim si lat/lng absent
// Toggle satellite (ESRI) / plan (OSM)

import { useState, useRef, useEffect, useCallback } from 'react';

interface VehiclePosition {
  x: number; y: number; angle: number; lat: number; lng: number;
}
interface Props {
  role: 'A' | 'B' | 'C' | 'D';
  accidentLat?: number;
  accidentLng?: number;
  accidentAddress?: string;
  accidentCity?: string;
  vehicleColor?: string;
  vehicleType?: string;
  brand?: string;
  existingVehicles?: { role: string; pos: VehiclePosition }[];
  onComplete: (position: VehiclePosition, mapImageBase64: string) => void;
  onSkip: () => void;
}

const ZOOM = 19;
const TILE_SIZE = 256;
const CANVAS_W = 380;
const CANVAS_H = 380;

function latlngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}
function pixelToLatlng(px: number, py: number, originLat: number, originLng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const latRad = originLat * Math.PI / 180;
  const owx = (originLng + 180) / 360 * n * TILE_SIZE;
  const owy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * TILE_SIZE;
  const wx = owx + (px - CANVAS_W / 2);
  const wy = owy + (py - CANVAS_H / 2);
  const lng = wx / (n * TILE_SIZE) * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * wy / (n * TILE_SIZE)))) * 180 / Math.PI;
  return { lat, lng };
}

function drawVehicle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number,
  color: string, label: string, roleColor: string, length = 32, width = 16, selected = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * Math.PI / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#FFD700' : 'rgba(0,0,0,0.7)';
  ctx.lineWidth = selected ? 2.5 : 1.2;
  ctx.beginPath();
  const r = 4;
  ctx.moveTo(-length/2+r, -width/2); ctx.lineTo(length/2-r, -width/2);
  ctx.arcTo(length/2,-width/2,length/2,-width/2+r,r); ctx.lineTo(length/2,width/2-r);
  ctx.arcTo(length/2,width/2,length/2-r,width/2,r); ctx.lineTo(-length/2+r,width/2);
  ctx.arcTo(-length/2,width/2,-length/2,width/2-r,r); ctx.lineTo(-length/2,-width/2+r);
  ctx.arcTo(-length/2,-width/2,-length/2+r,-width/2,r);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur=0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0; ctx.stroke();
  const tr=parseInt(color.slice(1,3),16), tg=parseInt(color.slice(3,5),16), tb=parseInt(color.slice(5,7),16);
  ctx.fillStyle=`rgb(${Math.max(0,tr-35)},${Math.max(0,tg-35)},${Math.max(0,tb-35)})`;
  ctx.fillRect(-length/3,-width/2.8,length*2/3,width/1.4);
  ctx.fillStyle='rgba(140,195,225,0.75)';
  ctx.beginPath(); ctx.moveTo(length/2-5,-width/3); ctx.lineTo(length/2-5,width/3);
  ctx.lineTo(length/3+2,width/3.5); ctx.lineTo(length/3+2,-width/3.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(100,155,180,0.6)';
  ctx.beginPath(); ctx.moveTo(-length/2+4,-width/3); ctx.lineTo(-length/2+4,width/3);
  ctx.lineTo(-length/3-2,width/3.5); ctx.lineTo(-length/3-2,-width/3.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#FFE88A';
  ctx.beginPath(); ctx.ellipse(length/2-3,-width/2+3,3.5,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(length/2-3,width/2-3,3.5,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#DD2222';
  ctx.beginPath(); ctx.ellipse(-length/2+3,-width/2+3,3,2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-length/2+3,width/2-3,3,2,0,0,Math.PI*2); ctx.fill();
  [[-length/3,-width/2-2],[length/3,-width/2-2],[-length/3,width/2+2],[length/3,width/2+2]].forEach(([wx,wy])=>{
    ctx.fillStyle='#111118'; ctx.beginPath(); ctx.ellipse(wx,wy,5,3,0,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle=roleColor; ctx.strokeStyle='white'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='white'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(label,0,0);
  ctx.fillStyle='rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.moveTo(length/2+8,0); ctx.lineTo(length/2+18,-5); ctx.lineTo(length/2+18,5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

type MapStyle = 'satellite' | 'plan';

const TILE_URLS: Record<MapStyle, (z:number,x:number,y:number)=>string> = {
  satellite: (z,x,y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  plan: (z,x,y) => `https://${'abc'[Math.abs(x+y)%3]}.tile.openstreetmap.org/${z}/${x}/${y}.png`,
};

export function MapVehiclePlacer({
  role, accidentLat, accidentLng, accidentAddress, accidentCity,
  vehicleColor, vehicleType, brand, existingVehicles=[],
  onComplete, onSkip,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilesRef = useRef<Map<string,HTMLImageElement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const [centerLat, setCenterLat] = useState<number>(0);
  const [centerLng, setCenterLng] = useState<number>(0);
  const [tilesLoaded, setTilesLoaded] = useState(0);
  const [mapStyle, setMapStyle] = useState<MapStyle>('satellite');
  const [position, setPosition] = useState({x:CANVAS_W/2, y:CANVAS_H/2});
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'place'|'rotate'|'confirm'>('place');
  const [confirmed, setConfirmed] = useState(false);
  const dragStart = useRef<{x:number;y:number;posX:number;posY:number}|null>(null);

  const roleColor = {A:'#1a44cc',B:'#cc3300',C:'#228833',D:'#9933cc'}[role]||'#444';
  const bodyColor = !vehicleColor||vehicleColor==='—' ? '#4466aa' :
    /^#/.test(vehicleColor) ? vehicleColor :
    ({noir:'#1c1c2a',black:'#1c1c2a',blanc:'#e0e0d8',white:'#e0e0d8',
      rouge:'#b82020',red:'#b82020',bleu:'#1a44aa',blue:'#1a44aa',
      gris:'#7a7a8c',grey:'#7a7a8c',gray:'#7a7a8c',silber:'#aab0bb',
      vert:'#1a6622',green:'#1a6622',jaune:'#cc9900',orange:'#cc5500'}
      [vehicleColor.toLowerCase()] || '#4466aa');

  // ── 1. Résoudre les coordonnées ────────────────────────────
  useEffect(() => {
    if (accidentLat && accidentLng && accidentLat !== 0 && accidentLng !== 0) {
      setCenterLat(accidentLat);
      setCenterLng(accidentLng);
      return;
    }
    // Pas de GPS → géocoder l'adresse via Nominatim
    const query = [accidentAddress, accidentCity].filter(Boolean).join(', ');
    if (!query) {
      // Fallback Courgenay (siège PEP's Swiss SA)
      setCenterLat(47.4088); setCenterLng(7.1124); return;
    }
    setGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {headers:{'User-Agent':'boom.contact/1.0'}})
      .then(r=>r.json())
      .then(results => {
        if (results.length > 0) {
          setCenterLat(parseFloat(results[0].lat));
          setCenterLng(parseFloat(results[0].lon));
        } else {
          setCenterLat(47.4088); setCenterLng(7.1124);
        }
        setGeocoding(false);
      })
      .catch(() => { setCenterLat(47.4088); setCenterLng(7.1124); setGeocoding(false); });
  }, [accidentLat, accidentLng, accidentAddress, accidentCity]);

  // ── 2. Charger les tiles quand coordonnées + style prêts ──
  useEffect(() => {
    if (!centerLat || !centerLng) return;
    setLoading(true);
    setTilesLoaded(0);
    const { x: cx, y: cy } = latlngToTile(centerLat, centerLng, ZOOM);
    const pad = 2; const total = (pad*2+1)*(pad*2+1); let loaded = 0;
    for (let dy=-pad;dy<=pad;dy++) for (let dx=-pad;dx<=pad;dx++) {
      const tx=cx+dx, ty=cy+dy;
      const key=`${mapStyle}/${ZOOM}/${tx}/${ty}`;
      if (tilesRef.current.has(key)) { loaded++; if(loaded===total) setLoading(false); continue; }
      const img = new Image(); img.crossOrigin='anonymous';
      img.src = TILE_URLS[mapStyle](ZOOM,tx,ty);
      img.onload = () => { tilesRef.current.set(key,img); loaded++; setTilesLoaded(loaded); if(loaded===total)setLoading(false); };
      img.onerror= () => { loaded++; setTilesLoaded(loaded); if(loaded===total)setLoading(false); };
    }
  }, [centerLat, centerLng, mapStyle]);

  // ── 3. Rendu canvas ───────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas||!centerLat||!centerLng) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    const {x:cx,y:cy} = latlngToTile(centerLat,centerLng,ZOOM);
    const pad=2;
    const latRad=centerLat*Math.PI/180;
    const owx=(centerLng+180)/360*Math.pow(2,ZOOM)*TILE_SIZE;
    const owy=(1-Math.log(Math.tan(latRad)+1/Math.cos(latRad))/Math.PI)/2*Math.pow(2,ZOOM)*TILE_SIZE;
    for(let dy=-pad;dy<=pad;dy++) for(let dx=-pad;dx<=pad;dx++) {
      const tx=cx+dx, ty=cy+dy;
      const img=tilesRef.current.get(`${mapStyle}/${ZOOM}/${tx}/${ty}`);
      if(img) { const drawX=tx*TILE_SIZE-owx+CANVAS_W/2; const drawY=ty*TILE_SIZE-owy+CANVAS_H/2; ctx.drawImage(img,drawX,drawY,TILE_SIZE,TILE_SIZE); }
    }
    existingVehicles.forEach(ev=>{
      const oc={A:'#1a44cc',B:'#cc3300',C:'#228833',D:'#9933cc'}[ev.role]||'#444';
      drawVehicle(ctx,ev.pos.x,ev.pos.y,ev.pos.angle,'#888888',ev.role,oc,28,13,false);
    });
    drawVehicle(ctx,position.x,position.y,angle,bodyColor,role,roleColor,34,16,true);
    // Croix GPS centre
    const [ix,iy]=[CANVAS_W/2,CANVAS_H/2];
    ctx.strokeStyle='rgba(255,50,0,0.7)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(ix-14,iy); ctx.lineTo(ix+14,iy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix,iy-14); ctx.lineTo(ix,iy+14); ctx.stroke();
    ctx.strokeStyle='rgba(255,50,0,0.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ix,iy,22,0,Math.PI*2); ctx.stroke();
    // Légende bas
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,CANVAS_H-28,CANVAS_W,28);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='12px sans-serif'; ctx.textAlign='center';
    const instr=step==='place'?'✋ Faites glisser votre véhicule':step==='rotate'?'↻ Orientez le véhicule':'✓ Position confirmée';
    ctx.fillText(instr,CANVAS_W/2,CANVAS_H-10);
  }, [position,angle,bodyColor,role,roleColor,existingVehicles,step,tilesLoaded,centerLat,centerLng,mapStyle]);

  useEffect(()=>{render();},[render]);

  const getPos=(e:React.TouchEvent|React.MouseEvent)=>{
    const canvas=canvasRef.current!; const rect=canvas.getBoundingClientRect();
    const sx=CANVAS_W/rect.width, sy=CANVAS_H/rect.height;
    if('touches' in e && e.touches.length>0) return {x:(e.touches[0].clientX-rect.left)*sx,y:(e.touches[0].clientY-rect.top)*sy};
    return {x:((e as React.MouseEvent).clientX-rect.left)*sx,y:((e as React.MouseEvent).clientY-rect.top)*sy};
  };
  const onStart=(e:React.TouchEvent|React.MouseEvent)=>{
    e.preventDefault(); if(confirmed) return;
    const pos=getPos(e);
    const dx=pos.x-position.x, dy=pos.y-position.y;
    if(Math.sqrt(dx*dx+dy*dy)<40) { setDragging(true); dragStart.current={x:pos.x,y:pos.y,posX:position.x,posY:position.y}; setStep('place'); }
  };
  const onMove=(e:React.TouchEvent|React.MouseEvent)=>{
    e.preventDefault(); if(!dragging||!dragStart.current||confirmed) return;
    const pos=getPos(e);
    setPosition({x:Math.max(20,Math.min(CANVAS_W-20,dragStart.current.posX+(pos.x-dragStart.current.x))),y:Math.max(20,Math.min(CANVAS_H-20,dragStart.current.posY+(pos.y-dragStart.current.y)))});
  };
  const onEnd=()=>{ if(dragging){setDragging(false);dragStart.current=null;setStep('rotate');} };

  const confirm=()=>{
    const canvas=canvasRef.current!;
    const gps=pixelToLatlng(position.x,position.y,centerLat,centerLng,ZOOM);
    const b64=canvas.toDataURL('image/jpeg',0.92).split(',')[1];
    setConfirmed(true); setStep('confirm');
    onComplete({x:position.x,y:position.y,angle,lat:gps.lat,lng:gps.lng},b64);
  };

  if (geocoding||(!centerLat&&!centerLng)) return (
    <div style={{padding:40,textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:12}}>📍</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Localisation de l'accident…</div>
      <div style={{fontSize:12,opacity:0.5}}>Géocodage de l'adresse via OpenStreetMap</div>
    </div>
  );
  if (loading) return (
    <div style={{padding:40,textAlign:'center'}}>
      <div style={{fontSize:36,marginBottom:12,display:'inline-block',animation:'spin 1s linear infinite'}}>🛰️</div>
      <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Chargement de la carte…</div>
      <div style={{fontSize:12,opacity:0.5}}>{tilesLoaded}/25 tiles · {mapStyle==='satellite'?'© Esri World Imagery':'© OpenStreetMap'}</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const rch = {A:'#1a44cc',B:'#cc3300',C:'#228833',D:'#9933cc'}[role]||'#444';

  return (
    <div style={{padding:'14px 18px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:`${rch}22`,border:`2px solid ${rch}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,color:rch}}>{role}</div>
        <div>
          <div style={{fontWeight:700,fontSize:14}}>Conducteur {role} — Positionner mon véhicule</div>
          <div style={{fontSize:11,opacity:0.5}}>{brand?`${brand} · `:''}Carte: {accidentAddress||accidentCity||'Lieu de l\'accident'}</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {([['place','✋','1. Placer'],['rotate','↻','2. Orienter'],['confirm','✓','3. Valider']] as const).map(([s,ic,lb])=>(
          <div key={s} style={{flex:1,padding:'5px 3px',borderRadius:8,textAlign:'center',fontSize:11,
            background:step===s?`${rch}20`:'rgba(255,255,255,0.03)',
            border:`1px solid ${step===s?rch:'rgba(255,255,255,0.07)'}`,
            color:step===s?rch:'rgba(255,255,255,0.35)',fontWeight:step===s?700:400}}>
            {ic} {lb}
          </div>
        ))}
      </div>

      {/* Toggle satellite / plan */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {([['satellite','🛰️ Satellite'],['plan','🗺️ Plan']] as const).map(([s,lb])=>(
          <button key={s} onClick={()=>setMapStyle(s)}
            style={{flex:1,padding:'7px',borderRadius:8,cursor:'pointer',fontSize:12,border:'none',
              background:mapStyle===s?rch:'rgba(255,255,255,0.07)',
              color:mapStyle===s?'#fff':'rgba(255,255,255,0.6)',
              fontWeight:mapStyle===s?700:400,touchAction:'manipulation'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{borderRadius:10,overflow:'hidden',border:`2px solid ${rch}44`,marginBottom:12,boxShadow:`0 0 16px ${rch}22`}}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{width:'100%',display:'block',cursor:dragging?'grabbing':'grab',touchAction:'none'}}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
      </div>

      {/* Rotation */}
      {step==='rotate'&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,opacity:0.6,marginBottom:6,textAlign:'center'}}>
            Direction : {angle}° &nbsp;
            {angle<23?'→ Est':angle<68?'↘':angle<113?'↓ Sud':angle<158?'↙':angle<203?'← Ouest':angle<248?'↖':angle<293?'↑ Nord':angle<338?'↗':'→ Est'}
          </div>
          <input type="range" min={0} max={359} value={angle} onChange={e=>setAngle(Number(e.target.value))}
            style={{width:'100%',accentColor:rch}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,opacity:0.4,marginTop:2}}>
            <span>↑ N</span><span>→ E</span><span>↓ S</span><span>← O</span>
          </div>
        </div>
      )}

      {/* Boutons */}
      {!confirmed?(
        <div style={{display:'flex',gap:8}}>
          <button onClick={onSkip} style={{flex:1,padding:'11px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',background:'transparent',cursor:'pointer',fontSize:13,color:'rgba(255,255,255,0.35)',touchAction:'manipulation'}}>Passer</button>
          <button onClick={step==='place'?()=>setStep('rotate'):confirm}
            style={{flex:2,padding:'13px',borderRadius:9,border:'none',background:rch,color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700,touchAction:'manipulation'}}>
            {step==='place'?'Orienter →':'✓ Valider la position'}
          </button>
        </div>
      ):(
        <div style={{padding:'13px',borderRadius:9,background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',textAlign:'center',fontSize:14,color:'#22c55e',fontWeight:700}}>
          ✅ Position enregistrée
        </div>
      )}
    </div>
  );
}
