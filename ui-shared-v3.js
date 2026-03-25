"use strict";
const defaultData = () => ({
  garde: { ot:"", cdp:"", raisonSociale:"", adresse:"", contact:"", telephone:"", email:"", technicien:"", date:new Date().toLocaleDateString("fr-FR"), photoPrincipale:null },
  outils: { notes:"" },
  // plan: image + markers
  plans: [{ id:'plan_0', label:'RDC', photo:null, markers:[] }], // marker: { id, type:"pm"|"pico", label:"PM01"|"PICO1", x:0.5, y:0.5 }
  // pmData: keyed by label, holds 4G/5G/speedtest
  pmData: {},   // { "PM01": { g4:"", g5:"", speedtest:"", notes:"" } }
  // picoData: keyed by label
  picoData: {}, // { "PICO1": { photo:null, hauteur:"", cablage:"", notes:"" } }
  local: { notes:"", photos:[] },
  reportingPhotos: { notes:"", photos:[] },
  oeuvre: {
    // Câblage
    margePercent: 10,
    // Équipements
    nacelle: false, nacelleHauteur: "",
    pirl: false,
    echafaudage: false,
    escabeau: false, escabeauHauteur: "",
    epi: false,
    perforateur: false,
    visseuse: false,
    cheminCable: false,
    bandeauPrises: false,
    // Moyens humains
    nbTechniciens: "2",
    nbJours: "1",
    niveauQualif: "N2",
    hauteurTravailMax: "",
    // Fournitures
    fournituresAuto: true,
    fournituresExtras: "",
    fournitures: { poe:true, chevilles:true, colliers:true, goulotte:false, pieceFixation:true },
    // Prérequis
    vlan: "NON", vlanPort: "", validePar: "",
    // Notes
    notes: "",
  },
  acces: { notes:"" },
  conclusion: { notes:"", longueurCoax:"", margePercent:"10", nbTechniciens:"2", nbJours:"1" },
});

const SECTIONS = [
  { id:"garde",   label:"Page de garde",  icon:"🏠" },
  { id:"preambule",label:"Préambule",     icon:"📋" },
  { id:"outils",  label:"Outils",         icon:"📡" },
  { id:"plan",    label:"Plan & Mesures", icon:"🗺️" },
  { id:"pico",    label:"PICO BTS",       icon:"📶" },
  { id:"local",   label:"Local Tech.",    icon:"🔧" },
  { id:"photos",  label:"Photos",         icon:"📸" },
  { id:"oeuvre",  label:"Mise en œuvre",  icon:"⚙️" },
  { id:"acces",   label:"Accès site",     icon:"🚪" },
];

// ─── Atoms ────────────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, multiline, placeholder }) => (
  React.createElement('div', { style: {marginBottom:16}}
    , React.createElement('label', { style: {display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}, label)
    , multiline
      ? React.createElement('textarea', { value: value, onChange: e=>onChange(e.target.value), placeholder: placeholder, rows: 3,
          style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:14,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}} )
      : React.createElement('input', { value: value, onChange: e=>onChange(e.target.value), placeholder: placeholder,
          style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none"}} )
  )
);

const Card = ({ children, title }) => (
  React.createElement('div', { style: {background:"#0f2040",borderRadius:16,padding:"18px 16px",marginBottom:16,border:"1px solid #1e3a5f"}}
    , title && React.createElement('h3', { style: {margin:"0 0 14px",fontSize:12,fontWeight:700,color:"#93c5fd",borderBottom:"1px solid #1e3a5f",paddingBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}, title)
    , children
  )
);

// ─── Photo picker helper ──────────────────────────────────────────────────────
// ── Compression d'image avant stockage ───────────────────────────────────────
async function compressImage(base64Str, maxWidth, quality) {
  maxWidth = maxWidth || 1200;
  quality  = quality  || 0.75;
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((maxWidth / w) * h); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { resolve(base64Str); }; // fallback sans compression
    img.src = base64Str;
  });
}

// Référence globale pour éviter le garbage collection sur Android WebView
window._pickPhotoInput = null;

function pickPhoto(cb, capture) {
  // Nettoyer l'ancien input si existant
  if (window._pickPhotoInput) {
    try { document.body.removeChild(window._pickPhotoInput); } catch(e) {}
    window._pickPhotoInput = null;
  }

  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  // Sur Android: capture='environment' force la caméra, sans argument = galerie + caméra
  if (capture) inp.setAttribute('capture', 'environment');
  // Garder dans le DOM TOUTE la durée (évite GC Android WebView)
  inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;pointer-events:none;';
  document.body.appendChild(inp);
  window._pickPhotoInput = inp;

  inp.addEventListener('change', function(e) {
    var f = e.target && e.target.files && e.target.files[0];
    if (!f) {
      // Pas de fichier sélectionné
      setTimeout(function() {
        if (window._pickPhotoInput === inp) {
          try { document.body.removeChild(inp); } catch(x) {}
          window._pickPhotoInput = null;
        }
      }, 500);
      return;
    }

    // Lire le fichier via FileReader (compatible content:// URI Android)
    var reader = new FileReader();
    reader.onload = function(ev) {
      var b64 = ev.target.result;
      // Cleanup après lecture réussie
      setTimeout(function() {
        try { document.body.removeChild(inp); } catch(x) {}
        window._pickPhotoInput = null;
      }, 500);
      // Compression en arrière-plan
      compressImage(b64, 1200, 0.78)
        .then(function(compressed) { cb(compressed); })
        .catch(function() { cb(b64); });
    };
    reader.onerror = function() {
      // Fallback: essayer avec URL.createObjectURL
      try {
        var url = URL.createObjectURL(f);
        var img2 = new Image();
        img2.onload = function() {
          var canvas = document.createElement('canvas');
          var maxW = 1200;
          var w = img2.width, h = img2.height;
          if (w > maxW) { h = Math.round((maxW/w)*h); w = maxW; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img2, 0, 0, w, h);
          URL.revokeObjectURL(url);
          setTimeout(function() {
            try { document.body.removeChild(inp); } catch(x) {}
            window._pickPhotoInput = null;
          }, 500);
          cb(canvas.toDataURL('image/jpeg', 0.78));
        };
        img2.onerror = function() {
          URL.revokeObjectURL(url);
          try { document.body.removeChild(inp); } catch(x) {}
          window._pickPhotoInput = null;
        };
        img2.src = url;
      } catch(x) {
        try { document.body.removeChild(inp); } catch(e2) {}
        window._pickPhotoInput = null;
      }
    };
    reader.readAsDataURL(f);
  });

  // Clic différé pour laisser le DOM se stabiliser (Android WebView)
  setTimeout(function() { inp.click(); }, 100);

  // Sécurité : cleanup après 60s si rien n'est sélectionné
  setTimeout(function() {
    if (window._pickPhotoInput === inp) {
      try { document.body.removeChild(inp); } catch(x) {}
      window._pickPhotoInput = null;
    }
  }, 60000);
}

// ─── Photo Annotator ──────────────────────────────────────────────────────────
function PhotoAnnotator({ photo, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const imgRef     = useRef(null);
  const [tool, setTool] = useState("arrow");
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPos, setTextPos] = useState(null);
  const [color, setColor] = useState("#ef4444");

  const getPos = (e) => {
    const c = canvasRef.current, rect = c.getBoundingClientRect();
    const sx = c.width/rect.width, sy = c.height/rect.height;
    var t = (e.changedTouches&&e.changedTouches.length>0)?e.changedTouches[0]:(e.touches&&e.touches.length>0)?e.touches[0]:e;
    if(!t||t.clientX===undefined) return null;
    return {x:(t.clientX-rect.left)*sx, y:(t.clientY-rect.top)*sy};
  };

  const redraw = useCallback((annots) => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);
    if (_optionalChain([imgRef, 'access', _2 => _2.current, 'optionalAccess', _3 => _3.complete])) ctx.drawImage(imgRef.current,0,0,c.width,c.height);
    annots.forEach(a => {
      ctx.strokeStyle=a.color; ctx.fillStyle=a.color; ctx.lineWidth=3;
      if (a.type==="arrow") {
        const hl=18, ang=Math.atan2(a.y2-a.y1,a.x2-a.x1);
        ctx.beginPath(); ctx.moveTo(a.x1,a.y1); ctx.lineTo(a.x2,a.y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x2,a.y2);
        ctx.lineTo(a.x2-hl*Math.cos(ang-Math.PI/6), a.y2-hl*Math.sin(ang-Math.PI/6));
        ctx.lineTo(a.x2-hl*Math.cos(ang+Math.PI/6), a.y2-hl*Math.sin(ang+Math.PI/6));
        ctx.closePath(); ctx.fill();
      } else if (a.type==="circle") {
        ctx.beginPath(); ctx.arc(a.cx,a.cy,a.r,0,Math.PI*2); ctx.stroke();
      } else if (a.type==="text") {
        ctx.font="bold 18px sans-serif"; ctx.fillText(a.text,a.x,a.y);
      }
    });
  }, []);

  const onDown=(e)=>{e.preventDefault(); const pos=getPos(e); if(tool==="text"){setTextPos(pos);setShowTextInput(true);return;} setDrawing(true);setStartPos(pos);};
  const onUp=(e)=>{
    if(!drawing) return; e.preventDefault();
    const pos=getPos(e); let a=null;
    if(tool==="arrow") a={type:"arrow",x1:startPos.x,y1:startPos.y,x2:pos.x,y2:pos.y,color};
    else if(tool==="circle"){const dx=pos.x-startPos.x,dy=pos.y-startPos.y; a={type:"circle",cx:startPos.x,cy:startPos.y,r:Math.sqrt(dx*dx+dy*dy),color};}
    if(a){const u=[...annotations,a];setAnnotations(u);redraw(u);}
    setDrawing(false);setStartPos(null);
  };
  const addText=()=>{
    if(!textInput.trim()){setShowTextInput(false);return;}
    const u=[...annotations,{type:"text",x:textPos.x,y:textPos.y,text:textInput,color}];
    setAnnotations(u);redraw(u);setTextInput("");setShowTextInput(false);
  };
  const undo=()=>{const u=annotations.slice(0,-1);setAnnotations(u);redraw(u);};

  return (
    React.createElement('div', { style: {position:"fixed",inset:0,background:"#020817",zIndex:2000,display:"flex",flexDirection:"column"}}
      , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:6,padding:"10px 12px",background:"#0f2040",borderBottom:"1px solid #1e3a5f",flexWrap:"wrap"}}
        , [{id:"arrow",label:"➜ Flèche"},{id:"circle",label:"◯ Cercle"},{id:"text",label:"T Texte"}].map(t=>(
          React.createElement('button', { key: t.id, onClick: ()=>setTool(t.id), style: {padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:tool===t.id?"#3b82f6":"#1e3a5f",color:"#fff"}}, t.label)
        ))
        , React.createElement('div', { style: {display:"flex",gap:5,marginLeft:4}}
          , ["#ef4444","#22c55e","#f59e0b","#3b82f6","#ffffff"].map(c=>(
            React.createElement('div', { key: c, onClick: ()=>setColor(c), style: {width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"3px solid #fff":"2px solid #334155"}} )
          ))
        )
        , React.createElement('div', { style: {marginLeft:"auto",display:"flex",gap:6}}
          , React.createElement('button', { onClick: undo, style: {padding:"6px 10px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:12}}, "↩")
          , React.createElement('button', { onClick: onCancel, style: {padding:"6px 10px",borderRadius:8,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:12}}, "✕")
          , React.createElement('button', { onClick: ()=>onSave(canvasRef.current.toDataURL("image/jpeg",0.85)), style: {padding:"6px 14px",borderRadius:8,border:"none",background:"#22c55e",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:12}}, "✓ Valider" )
        )
      )
      , React.createElement('div', { style: {flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}
        , React.createElement('img', { ref: imgRef, src: photo, alt: "", style: {display:"none"}, onLoad: ()=>{
          const c=canvasRef.current,img=imgRef.current;
          c.width=Math.min(img.naturalWidth,900); c.height=(img.naturalHeight/img.naturalWidth)*c.width;
          const ctx=c.getContext("2d"); ctx.drawImage(img,0,0,c.width,c.height);
        }} )
        , React.createElement('canvas', { ref: canvasRef, onMouseDown: onDown, onMouseUp: onUp, onTouchStart: onDown, onTouchEnd: onUp,
          style: {maxWidth:"100%",maxHeight:"100%",cursor:tool==="text"?"text":"crosshair",touchAction:"none"}} )
      )
      , showTextInput && (
        React.createElement('div', { style: {position:"absolute",bottom:0,left:0,right:0,background:"#0f2040",padding:14,borderTop:"1px solid #1e3a5f",display:"flex",gap:8}}
          , React.createElement('input', { autoFocus: true, value: textInput, onChange: e=>setTextInput(e.target.value), onKeyDown: e=>e.key==="Enter"&&addText(),
            placeholder: "Texte d'annotation..." , style: {flex:1,padding:"10px 14px",borderRadius:8,border:"1px solid #1e3a5f",background:"#020817",color:"#f1f5f9",fontSize:15}} )
          , React.createElement('button', { onClick: addText, style: {padding:"10px 16px",borderRadius:8,background:"#3b82f6",color:"#fff",border:"none",cursor:"pointer",fontWeight:700}}, "OK")
        )
      )
    )
  );
}

// ─── Interactive Plan Editor ──────────────────────────────────────────────────
function PlanEditor({ plan, pmData, picoData, onChange, onPmDataChange, onPicoDataChange, isAntenne }) {
  const [mode, setMode] = useState("view"); // "view"|"pm"|"pico"
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const pmMarkers  = (plan.markers||[]).filter(m=>m.type==="pm");
  const picoMarkers= (plan.markers||[]).filter(m=>m.type==="pico");

  const handleTap = (e) => {
    if (mode==="view") return;
    if (!containerRef.current) return;
    // Ignorer si le changement de mode vient d'avoir lieu (bouton PM/PICO vient d'être cliqué)
    if (window._lastModeChange && (Date.now() - window._lastModeChange) < 500) return;
    // Android touchend: touches[] est vide, utiliser changedTouches[0]
    var t = null;
    if (e.changedTouches && e.changedTouches.length > 0) { t = e.changedTouches[0]; }
    else if (e.touches && e.touches.length > 0)           { t = e.touches[0]; }
    else                                                   { t = e; }
    if (!t || t.clientX === undefined || t.clientX === null) return;

    // Utiliser les dimensions de l'IMAGE (pas du container) pour le % position
    var imgEl = imgRef.current;
    var rect;
    if (imgEl) {
      rect = imgEl.getBoundingClientRect();
      // Fallback si rect vide (Android WebView lag)
      if (!rect.width || rect.width === 0) {
        rect = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
      }
    } else if (containerRef.current) {
      rect = containerRef.current.getBoundingClientRect();
    }
    // Sécurité division par zéro
    if (!rect || !rect.width || rect.width === 0) { console.warn("[PlanEditor] Image non dimensionnée"); return; }

    // naturalWidth/Height fallback (Android WebView peut avoir 0 au premier rendu)
    var nw = (imgEl && imgEl.naturalWidth)  || rect.width;
    var nh = (imgEl && imgEl.naturalHeight) || rect.height;

    const xPct = Math.max(0, Math.min(1, (t.clientX - rect.left) / rect.width));
    const yPct = Math.max(0, Math.min(1, (t.clientY - rect.top)  / rect.height));

    if (mode==="pm") {
      const n = pmMarkers.length + 1;
      const label = `PM${String(n).padStart(2,"0")}`;
      const newMarker = { id:`m_${Date.now()}`, type:"pm", label, x:xPct, y:yPct };
      const newPmData = { ...pmData, [label]: { g4:"", g5:"", speedtest:"", notes:"" } };
      onChange({ ...plan, markers:[...plan.markers, newMarker] });
      onPmDataChange(newPmData);
    } else if (mode==="pico") {
      const n = picoMarkers.length + 1;
      const label = `PICO${n}`;
      const newMarker = { id:`m_${Date.now()}`, type:"pico", label, x:xPct, y:yPct };
      const newPicoData = { ...picoData, [label]: { photo:null, hauteur:"", cablage:"", notes:"", imei:"", sn:"", mac:"", statut:"OK", pci:"", emplacement:"" } };
      onChange({ ...plan, markers:[...plan.markers, newMarker] });
      onPicoDataChange(newPicoData);
    }

  };

  const deleteMarker = (marker, e) => {
    e.stopPropagation();
    const label = marker.label;
    if (!confirm(`Supprimer ${label} et toutes ses données ?`)) return;
    const newMarkers = (plan.markers||[]).filter(m=>m.id!==marker.id);
    // re-number remaining of same type
    let pmCount=0, picoCount=0;
    const renumbered = newMarkers.map(m => {
      if (m.type==="pm") { pmCount++; return {...m, label:`PM${String(pmCount).padStart(2,"0")}`}; }
      else { picoCount++; return {...m, label:`PICO${picoCount}`}; }
    });
    onChange({ ...plan, markers: renumbered });
    if (marker.type==="pm") {
      const np = {...pmData}; delete np[label];
      // renumber keys
      const renp = {}; let c=0;
      Object.values(np).forEach(v => { c++; renp[`PM${String(c).padStart(2,"0")}`]=v; });
      onPmDataChange(renp);
    } else {
      const np = {...picoData}; delete np[label];
      const renp = {}; let c=0;
      Object.values(np).forEach(v => { c++; renp[`PICO${c}`]=v; });
      onPicoDataChange(renp);
    }
  };

  const replacePhoto = () => {
    pickPhoto(src => onChange({ ...plan, photo:src }));
  };

  if (!plan.photo) return (
    React.createElement('div', {}
      , React.createElement('div', { style: {display:"flex",gap:8}}
        , React.createElement('button', { onClick: ()=>pickPhoto(src=>onChange({...plan,photo:src})), style: {flex:1,padding:"14px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontSize:13}}
          , React.createElement('span', { style: {fontSize:24}}, "📁"), React.createElement('span', {}, "Importer le plan"  )
        )
        , React.createElement('button', { onClick: ()=>pickPhoto(src=>onChange({...plan,photo:src}),true), style: {flex:1,padding:"14px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontSize:13}}
          , React.createElement('span', { style: {fontSize:24}}, "📷"), React.createElement('span', {}, "Prendre en photo"  )
        )
      )
    )
  );

  return (
    React.createElement('div', {}
      /* Mode toolbar */
      , React.createElement('div', { style: {display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}
        , React.createElement('button', { onClick: ()=>{ window._lastModeChange = Date.now(); setMode(mode==="pm"?"view":"pm"); },
          style: {flex:1,padding:"10px 8px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
            background:mode==="pm"?"#3b82f6":"#1e3a5f",color:mode==="pm"?"#fff":"#93c5fd",
            boxShadow:mode==="pm"?"0 0 0 2px #3b82f6":"none"}}
          , mode==="pm"?"👆 Tapez pour placer PM":"+ Point de mesure PM"
        )
        , !isAntenne && React.createElement('button', { onClick: ()=>{ window._lastModeChange = Date.now(); setMode(mode==="pico"?"view":"pico"); },
          style: {flex:1,padding:"10px 8px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
            background:mode==="pico"?"#f97316":"#1e3a5f",color:mode==="pico"?"#fff":"#fb923c",
            boxShadow:mode==="pico"?"0 0 0 2px #f97316":"none"}}
          , mode==="pico"?"👆 Tapez pour placer PICO":"+ Emplacement PICO"
        )
      )

      , mode!=="view" && (
        React.createElement('div', { style: {background:mode==="pm"?"#1e3a5f":"#431407",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:13,color:mode==="pm"?"#93c5fd":"#fb923c",textAlign:"center"}}, "Tapez sur le plan pour placer "
                , mode==="pm"?`PM${String(pmMarkers.length+1).padStart(2,"0")}`:`PICO${picoMarkers.length+1}`
        )
      )

      /* Plan image with markers overlay */
      , React.createElement('div', { ref: containerRef, style: {position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #1e3a5f",cursor:mode==="view"?"default":"crosshair"},
        onTouchEnd: (e)=>{e.preventDefault();handleTap(e);}, onClick: (e)=>{if(e._fromTouch)return;handleTap(e);}}
        , React.createElement('img', {
          ref: imgRef,
          src: plan.photo,
          alt: "Plan du site",
          onLoad: function() { if(imgRef.current) imgRef.current._loaded = true; },
          style: {width:"100%",display:"block"}
        })

        /* Render markers */
        , (plan.markers||[]).map(m => (
          React.createElement('div', { key: m.id, style: {
            position:"absolute", left:`${m.x*100}%`, top:`${m.y*100}%`,
            transform:"translate(-50%,-50%)",
            background:m.type==="pm"?"#3b82f6":"#f97316",
            color:"#fff", borderRadius:20, padding:"4px 9px",
            fontSize:11, fontWeight:800, whiteSpace:"nowrap",
            boxShadow:"0 2px 8px #0008",
            display:"flex", alignItems:"center", gap:4,
            border:"2px solid #fff"
          },
            onClick: e=>e.stopPropagation()}
            , m.label
            , React.createElement('span', { onClick: e=>deleteMarker(m,e), style: {cursor:"pointer",fontSize:13,lineHeight:1,marginLeft:2,opacity:0.8}}, "×")
          )
        ))
      )

      /* Legend */
      , React.createElement('div', { style: {display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}
        , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748b"}}
          , React.createElement('div', { style: {background:"#3b82f6",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700,color:"#fff"}}, "PM01"), "Points de mesure ("
             , pmMarkers.length, ")"
        )
        , !isAntenne && React.createElement('div', { style: {display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#64748b"}}
          , React.createElement('div', { style: {background:"#f97316",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700,color:"#fff"}}, "PICO1"), "Emplacements PICO ("
            , picoMarkers.length, ")"
        )
      )

      /* Replace photo */
      , React.createElement('button', { onClick: replacePhoto, style: {marginTop:12,width:"100%",padding:"10px",borderRadius:10,border:"1px solid #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13}}, "🔄 Changer le plan"

      )
    )
  );
}

// ─── PM Table ─────────────────────────────────────────────────────────────────
// ── Couleur de fond selon qualité RSRP ───────────────────────────────────────
function rsrpBg(rsrp) {
  if (!rsrp && rsrp !== 0) return null; // pas de valeur = pas de couleur
  var v = parseInt(rsrp);
  if (isNaN(v)) return null;
  if (v >= -97)  return { bg:'#052010', border:'#22c55e40', text:'#4ade80' }; // Bonne
  if (v >= -107) return { bg:'#1a1000', border:'#f59e0b40', text:'#fbbf24' }; // Moyenne
  if (v >= -117) return { bg:'#1a0800', border:'#f9731640', text:'#fb923c' }; // Médiocre
  return           { bg:'#1a0000', border:'#ef444440', text:'#f87171' };       // Mauvaise
}

function PMTable({ plan, pmData, onChange }) {
  var pmMarkers = (plan.markers||[]).filter(function(m){return m.type==="pm";});
  if (pmMarkers.length===0) return (
    React.createElement('div', {style:{background:"#0a1628",borderRadius:10,padding:16,textAlign:"center",color:"#334155",fontSize:13}},
      "Ajoutez des points de mesure sur le plan pour les voir apparaitre ici."
    )
  );

  var upd = function(label,k,v){
    onChange(Object.assign({},pmData,{[label]:Object.assign({},(pmData[label]||{}),{[k]:v})}));
  };

  var fillSignalRow = function(label) {
    window._manualFillLabel = label;
    extractSignalAsync(function(sig) {
      if (!sig || !Object.values(sig).some(function(v){return v!=='';})) return;

      // ── 4G : rsrp4g/rsrq4g/band4g + fallback 4g_rsrp ──
      var g4rsrp = sig.rsrp4g || sig['4g_rsrp'] || '';
      var g4rsrq = sig.rsrq4g || sig['4g_rsrq'] || '';
      var g4band = sig.band4g || sig['4g_band']  || '';
      if (!g4rsrp && sig.type && sig.type.indexOf('4G') !== -1) {
        g4rsrp = sig.rsrp || ''; g4rsrq = sig.rsrq || ''; g4band = sig.band || '';
      }
      var g4str = [g4rsrp, g4rsrq, g4band].filter(function(v){return v !== '';}).join(' / ');
      if (!g4str) g4str = 'N/A';

      // ── 5G : rsrp5g/rsrq5g/band5g/snr5g ──────────────────────────────
      var g5rsrp = sig.rsrp5g || sig['5g_rsrp'] || '';
      var g5rsrq = sig.rsrq5g || sig['5g_rsrq'] || '';
      var g5band = sig.band5g || sig['5g_band']  || '';
      var g5snr  = sig.snr5g  || sig['5g_snr']  || ''; // pas sig.snr (c'est le SNR 4G!)
      // Si RSRP 5G dispo → afficher RSRP/RSRQ/Band
      // Sinon si type est 5G NSA → utiliser rsrp maitre comme valeur 5G
      // Sinon → SNR comme indicateur
      var g5str = [g5rsrp, g5rsrq, g5band].filter(function(v){return v!=='';}).join(' / ');
      if (!g5str && (sig.type === '5G (NSA)' || sig.type === '5G (NR)')) {
        g5str = [sig.rsrp, sig.rsrq, sig.band].filter(function(v){return v!=='';}).join(' / ');
      }
      if (!g5str && g5snr && g5snr !== '0') g5str = 'SNR:' + g5snr;
      if (!g5str) g5str = 'N/A';

      var dlPart = sig.dl ? sig.dl + ' Mb' : '';
      var ulPart = sig.ul ? sig.ul + ' Mb' : '';
      var dlul = [dlPart, ulPart].filter(function(v){return v!=='';}).join(' / ');
      var filled = {};
      filled.g4 = g4str;
      filled.g5 = g5str; // toujours remplir (N/A si absent)
      if (dlul)  filled.speedtest = dlul;
      filled.operateur = sig.operator || sig.operateur || '';
      // S'assurer que tous les champs sont présents (remplacement complet)
      if (!filled.g4)       filled.g4       = 'N/A';
      if (!filled.g5)       filled.g5       = 'N/A';
      if (!filled.speedtest) filled.speedtest = '';
      if (!filled.operateur) filled.operateur = '';

      if (Object.keys(filled).length > 0) {
        // Remplacer complètement (pas merger) les valeurs de mesure
        onChange(Object.assign({}, pmData, {[label]: filled}));
      }
      setTimeout(function(){ window._manualFillLabel = null; }, 2000);
    });
  };

  // Colonnesnes du tableau
  var COLS = [
    {k:'g4',       hdr:'4G (RSRP/RSRQ/Band)', na:true},
    {k:'g5',       hdr:'5G (RSRP/RSRQ/Band)', na:true},
    {k:'speedtest',hdr:'Speedtest DL/UL Mb',  na:false},
    {k:'operateur',hdr:'Operateur',            na:false},
  ];

  var INP = {
    width:'100%', padding:'6px 4px', border:'1px solid #1e3a5f',
    background:'transparent', color:'#e2e8f0', fontSize:11,
    boxSizing:'border-box', textAlign:'center', fontFamily:'inherit',
    borderRadius:4, outline:'none'
  };
  var HDR_CELL = {
    padding:'8px 4px', fontSize:10, fontWeight:700, color:'#fff',
    textAlign:'center', background:'#002060', borderRight:'1px solid #1e3a5f',
    lineHeight:1.3
  };
  var PM_CELL = {
    padding:'6px 8px', fontSize:11, fontWeight:700, color:'#fff',
    background:'transparent', borderRight:'1px solid #1e3a5f',
    borderBottom:'1px solid #1e3a5f', whiteSpace:'nowrap', minWidth:52
  };

  return React.createElement('div', {style:{overflowX:'auto'}}
    , React.createElement('table', {
        style:{borderCollapse:'collapse', width:'100%', minWidth:420,
               border:'1px solid #1e3a5f', borderRadius:8, overflow:'hidden',
               fontSize:11}
      }
      /* En-tête */
      , React.createElement('thead', {}
        , React.createElement('tr', {}
          /* Colonne PM label */
          , React.createElement('th', {style:Object.assign({},HDR_CELL,{minWidth:52,borderRadius:'8px 0 0 0'})}, 'Point')
          /* Colonnes data */
          , COLS.map(function(col){
              return React.createElement('th', {key:col.k, style:HDR_CELL}, col.hdr);
            })
          /* Colonne Pre-remplir */
          , React.createElement('th', {style:Object.assign({},HDR_CELL,{minWidth:90,borderRadius:'0 8px 0 0',borderRight:'none'})}, 'Pre-remplir')
        )
      )
      /* Corps */
      , React.createElement('tbody', {}
        , pmMarkers.map(function(m, i) {
            var d = pmData[m.label] || {};
            // Couleur de fond exacte du tableau de qualité du template officiel
            // Bonne > -97 | Moyenne -98/-107 | Médiocre -108/-117 | Mauvaise < -118 | Inexistante
            var rsrpVal = parseInt((d.g4||'').split('/')[0]);
            var rowBg, rowBorder;
            if (isNaN(rsrpVal) || rsrpVal === 0) {
              rowBg = '#0a1628'; rowBorder = '#1e3a5f';           // pas de mesure
            } else if (rsrpVal >= -97) {
              rowBg = 'rgba(146,208,80,0.20)'; rowBorder = 'rgba(146,208,80,0.6)';  // Bonne  #92D050
            } else if (rsrpVal >= -107) {
              rowBg = 'rgba(255,192,0,0.20)';  rowBorder = 'rgba(255,192,0,0.6)';   // Moyenne #FFC000
            } else if (rsrpVal >= -117) {
              rowBg = 'rgba(255,128,0,0.20)';  rowBorder = 'rgba(255,128,0,0.6)';   // Médiocre #FF8000
            } else if (rsrpVal > -999) {
              rowBg = 'rgba(255,0,0,0.18)';    rowBorder = 'rgba(255,0,0,0.5)';     // Mauvaise #FF0000
            } else {
              rowBg = 'rgba(217,217,217,0.15)'; rowBorder = 'rgba(217,217,217,0.4)'; // Inexistante #D9D9D9
            }
            return React.createElement('tr', {
                key: m.id,
                style:{background:rowBg, outline:'1px solid '+rowBorder,
                       borderBottom:'1px solid #1e3a5f'}
              }
              /* Label PM */
              , React.createElement('td', {style:PM_CELL}
                , React.createElement('span', {
                    style:{background:'#3b82f6',borderRadius:8,padding:'2px 8px',
                           fontSize:11,fontWeight:800,color:'#fff'}
                  }, m.label)
              )
              /* Cellules data */
              , COLS.map(function(col){
                  return React.createElement('td', {
                      key: col.k,
                      style:{padding:'4px 4px',borderRight:'1px solid #1e3a5f',
                             borderBottom:'1px solid #1e3a5f'}
                    }
                    , React.createElement('input', {
                        value: d[col.k]||'',
                        onChange: function(e){ upd(m.label, col.k, e.target.value); },
                        placeholder: col.na ? 'N/A' : '-',
                        style: Object.assign({}, INP, {
                          color: (!d[col.k] && col.na) ? '#475569' : '#e2e8f0',
                          fontStyle: (!d[col.k] && col.na) ? 'italic' : 'normal'
                        })
                      })
                  );
                })
              /* Bouton Pre-remplir */
              , React.createElement('td', {
                  style:{padding:'4px 6px',textAlign:'center',
                         borderBottom:'1px solid #1e3a5f'}
                }
                , React.createElement('button', {
                    onClick: function(){ fillSignalRow(m.label); },
                    style:{background:'#16a34a',border:'none',borderRadius:6,
                           color:'#fff',padding:'5px 8px',cursor:'pointer',
                           fontSize:10,fontWeight:700,whiteSpace:'nowrap'}
                  }, 'Pre-remplir')
              )
            );
          })
      )
    )
  );
}

// ─── PICO Section ─────────────────────────────────────────────────────────────
function PicoSection({ plan, picoData, onChange, setAnnotating }) {
  const picoMarkers = (plan.markers||[]).filter(m=>m.type==="pico");

  if (picoMarkers.length===0) return (
    React.createElement('div', { style: {background:"#0f2040",borderRadius:16,padding:24,textAlign:"center",border:"1px solid #1e3a5f"}}
      , React.createElement('div', { style: {fontSize:40,marginBottom:12}}, "📶")
      , React.createElement('div', { style: {fontSize:14,color:"#475569",marginBottom:6}}, "Aucune PICO positionnée"  )
      , React.createElement('div', { style: {fontSize:12,color:"#334155"}}, "Ajoutez des emplacements PICO sur le plan pour les voir apparaître ici."           )
    )
  );

  const upd = (label,k,v) => onChange({...picoData, [label]:{...picoData[label],[k]:v}});

  return (
    React.createElement('div', {}
      , picoMarkers.map(m => {
        const d = picoData[m.label] || { photo:null, hauteur:"", cablage:"", notes:"" };
        return (
          React.createElement('div', { key: m.id, style: {background:"#0f2040",borderRadius:16,padding:"18px 16px",marginBottom:16,border:"1px solid #f9731630"}}
            /* Header */
            , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:10,marginBottom:14}}
              , React.createElement('div', { style: {background:"#f97316",borderRadius:12,padding:"4px 14px",fontSize:14,fontWeight:800,color:"#fff"}}, m.label)
              , React.createElement('div', { style: {fontSize:12,color:"#64748b"}}, "Emplacement sur le plan"   )
            )

            /* Photo */
            , React.createElement('div', { style: {marginBottom:14}}
              , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Photo d'emplacement" )
              , d.photo ? (
                React.createElement('div', { style: {position:"relative",borderRadius:10,overflow:"hidden"}}
                  , React.createElement('img', { src: d.photo, alt: m.label, style: {width:"100%",maxHeight:200,objectFit:"cover",display:"block"}} )
                  /* PICO badge overlay */
                  , React.createElement('div', { style: {position:"absolute",top:10,left:10,background:"#f97316",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:800,boxShadow:"0 2px 8px #0008"}}, "📶 "
                     , m.label
                  )
                  , React.createElement('div', { style: {display:"flex",gap:6,position:"absolute",bottom:8,right:8}}
                    , React.createElement('button', { onClick: ()=>setAnnotating({type:"pico",label:m.label}),
                      style: {padding:"6px 10px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}, "✏️ Annoter" )
                    , React.createElement('button', { onClick: ()=>pickPhoto(src=>upd(m.label,"photo",src)),
                      style: {padding:"6px 10px",borderRadius:8,border:"none",background:"#0f2040cc",color:"#93c5fd",cursor:"pointer",fontSize:12}}, "🔄")
                    , React.createElement('button', { onClick: ()=>upd(m.label,"photo",null),
                      style: {padding:"6px 10px",borderRadius:8,border:"none",background:"#ef444480",color:"#fff",cursor:"pointer",fontSize:12}}, "🗑️")
                  )
                )
              ) : (
                React.createElement('div', { style: {display:"flex",gap:8}}
                  , React.createElement('button', { onClick: ()=>pickPhoto(src=>upd(m.label,"photo",src)),
                    style: {flex:1,padding:"12px",borderRadius:10,border:"2px dashed #f9731640",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
                    , React.createElement('span', { style: {fontSize:22}}, "📁"), React.createElement('span', {}, "Galerie")
                  )
                  , React.createElement('button', { onClick: ()=>pickPhoto(src=>upd(m.label,"photo",src),true),
                    style: {flex:1,padding:"12px",borderRadius:10,border:"2px dashed #f9731640",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
                    , React.createElement('span', { style: {fontSize:22}}, "📷"), React.createElement('span', {}, "Caméra")
                  )
                )
              )
            )

            /* Fields */
            , React.createElement('div', { style: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}
              , [["hauteur","Hauteur (m)"],["cablage","Câblage Ethernet"]].map(([k,lbl])=>(
                React.createElement('div', { key: k}
                  , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}, lbl)
                  , React.createElement('input', { value: d[k]||"", onChange: e=>upd(m.label,k,e.target.value), placeholder: "Ex: 2.7m" ,
                    style: {width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}} )
                )
              ))
            )
            , React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}
              , React.createElement(Field, {label:'IMEI',         value:d.imei||'',         onChange:v=>upd(m.label,'imei',v),        placeholder:'Ex: 123456789012345'})
              , React.createElement(Field, {label:'S/N',          value:d.sn||'',           onChange:v=>upd(m.label,'sn',v),          placeholder:'Numéro de série'})
              , React.createElement(Field, {label:"Adresse MAC",  value:d.mac||'',          onChange:v=>upd(m.label,'mac',v),         placeholder:'AA:BB:CC:DD:EE:FF'})
              , React.createElement(Field, {label:'PCI',          value:d.pci||'',          onChange:v=>upd(m.label,'pci',v),         placeholder:'Ex: 42'})
              , React.createElement(Field, {label:'Emplacement',  value:d.emplacement||'',  onChange:v=>upd(m.label,'emplacement',v), placeholder:'Ex: Couloir RDC'})
              , React.createElement('div', {}
                , React.createElement('div', {style:{fontSize:10,color:'#475569',marginBottom:4,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}, 'Statut')
                , React.createElement('select', {value:d.statut||'OK', onChange:e=>upd(m.label,'statut',e.target.value),
                    style:{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #1e3a5f',background:'#020817',color:d.statut==='KO'?'#ef4444':d.statut==='En cours'?'#f59e0b':'#22c55e',fontSize:13,fontFamily:'inherit'}}
                  , React.createElement('option', {value:'OK'}, '✓ OK — Installé')
                  , React.createElement('option', {value:'KO'}, '✗ KO — Non installé')
                  , React.createElement('option', {value:'En cours'}, '⏳ En cours')
                )
              )
            )
            , React.createElement('div', {}
              , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}, "Notes")
              , React.createElement('textarea', { value: d.notes||"", onChange: e=>upd(m.label,"notes",e.target.value), placeholder: "Observations, prérequis spécifiques..."  , rows: 2,
                style: {width:"100%",padding:"9px 10px",borderRadius:8,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:13,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}} )
            )
          )
        );
      })
    )
  );
}

// ─── Generic photo gallery ────────────────────────────────────────────────────
function PhotoGallery({ photos, onAdd, onAnnotate, onDelete, onReplace }) {
  return (
    React.createElement('div', {}
      , React.createElement('div', { style: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}
        , photos.map((p,i) => (
          React.createElement('div', { key: i, style: {background:"#0a1628",borderRadius:12,overflow:"hidden",border:"1px solid #1e3a5f"}}
            , React.createElement('div', { style: {position:"relative"}}
              , React.createElement('img', { src: (typeof p==='string')?p:(p.annotated||p.src), alt: "", style: {width:"100%",height:120,objectFit:"cover",display:"block"}} )
              , React.createElement('div', { style: {position:"absolute",top:6,left:6,background:"#3b82f6",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:700}}, String(i+1).padStart(2,"0"))
              , p.annotated && React.createElement('div', { style: {position:"absolute",top:6,right:6,background:"#22c55e",color:"#fff",borderRadius:12,padding:"2px 7px",fontSize:10,fontWeight:700}}, "✓")
            )
            , React.createElement('div', { style: {display:"flex",gap:4,padding:"8px"}}
              , React.createElement('button', { onClick: ()=>onAnnotate(i), style: {flex:1,padding:"6px",borderRadius:7,border:"none",background:"#1e3a5f",color:"#93c5fd",cursor:"pointer",fontSize:11,fontWeight:600}}, "✏️")
              , React.createElement('button', { onClick: ()=>onReplace(i), style: {flex:1,padding:"6px",borderRadius:7,border:"none",background:"#1e3a5f",color:"#93c5fd",cursor:"pointer",fontSize:11,fontWeight:600}}, "🔄")
              , React.createElement('button', { onClick: ()=>onDelete(i), style: {flex:1,padding:"6px",borderRadius:7,border:"none",background:"#450a0a",color:"#fca5a5",cursor:"pointer",fontSize:11}}, "🗑️")
            )
          )
        ))
      )
      , React.createElement('div', { style: {display:"flex",gap:8}}
        , React.createElement('button', { onClick: ()=>{ const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.multiple=true;inp.onchange=e=>{Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=ev=>onAdd({src:ev.target.result,annotated:null});r.readAsDataURL(f);})};inp.click(); },
          style: {flex:1,padding:"12px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
          , React.createElement('span', { style: {fontSize:22}}, "📁"), React.createElement('span', {}, "Galerie")
        )
        , React.createElement('button', { onClick: ()=>pickPhoto(src=>onAdd({src,annotated:null}),true),
          style: {flex:1,padding:"12px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
          , React.createElement('span', { style: {fontSize:22}}, "📷"), React.createElement('span', {}, "Caméra")
        )
      )
    )
  );
}

// ─── PDF Preview ──────────────────────────────────────────────────────────────
function PDFPreview({ data, onClose, auditType }) {
  const pmMarkers  = (data.plan&&data.plan.markers||[]).filter(m=>m.type==="pm");
  const picoMarkers= (data.plan&&data.plan.markers||[]).filter(m=>m.type==="pico");
  return (
    React.createElement('div', { style: {position:"fixed",inset:0,background:"#000c",zIndex:3000,overflowY:"auto",padding:"20px 12px"}}
      , React.createElement('div', { style: {maxWidth:800,margin:"0 auto",background:"#fff",borderRadius:16,overflow:"hidden"}}
        , React.createElement('div', { style: {background:"#0f2040",color:"#fff",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}
          , React.createElement('div', {}, React.createElement('div', { style: {fontSize:18,fontWeight:800}}, auditType==='doe'?'DOE PICO BTS':'Audit de couverture mobile'   ), React.createElement('div', { style: {fontSize:12,opacity:0.7,marginTop:3}}, auditType==='doe'?'DOE PICO BTS':'AUDIT PICO BTS'  ))
          , React.createElement('button', { onClick: onClose, style: {background:"#ffffff20",border:"none",color:"#fff",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700}}, "✕ Fermer" )
        )
        , React.createElement('div', { style: {padding:24,color:"#1e293b"}}
          /* Infos */
          , React.createElement('div', { style: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}
            , [["N° OT",data.garde.ot],["CDP Bytel",data.garde.cdp],["Raison sociale",data.garde.raisonSociale],["Adresse",data.garde.adresse],["Contact",data.garde.contact],["Technicien",data.garde.technicien]].map(([l,v])=>(
              React.createElement('div', { key: l, style: {background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}
                , React.createElement('div', { style: {fontSize:10,color:"#64748b",fontWeight:700,textTransform:"uppercase"}}, l)
                , React.createElement('div', { style: {fontSize:13,fontWeight:600,marginTop:3}}, v||"—")
              )
            ))
          )
          , data.garde.photoPrincipale && React.createElement('img', { src: data.garde.photoPrincipale, alt: "", style: {width:"100%",borderRadius:10,maxHeight:240,objectFit:"cover",marginBottom:20}} )

          /* Plan */
          , data.plan.photo && (
            React.createElement('div', { style: {marginBottom:20}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:10}}, "Plan du site"  )
              , React.createElement('div', { style: {position:"relative",borderRadius:10,overflow:"hidden"}}
                , React.createElement('img', { src: data.plan.photo, alt: "Plan", style: {width:"100%"}} )
                , (data.plan&&data.plan.markers||[]).map(m=>(
                  React.createElement('div', { key: m.id, style: {position:"absolute",left:`${m.x*100}%`,top:`${m.y*100}%`,transform:"translate(-50%,-50%)",background:m.type==="pm"?"#3b82f6":"#f97316",color:"#fff",borderRadius:20,padding:"3px 8px",fontSize:10,fontWeight:800,boxShadow:"0 2px 6px #0008",border:"2px solid #fff"}}
                    , m.label
                  )
                ))
              )
            )
          )

          /* PM Table */
          , pmMarkers.length>0 && (
            React.createElement('div', { style: {marginBottom:20}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:10}}, "Points de mesures"  )
              , React.createElement('table', { style: {width:"100%",borderCollapse:"collapse",fontSize:12}}
                , React.createElement('thead', {}, React.createElement('tr', { style: {background:"#0f2040",color:"#fff"}}, ["Point","Notes","4G","5G","Speedtest"].map(h=>React.createElement('th', { key: h, style: {padding:"7px 10px",textAlign:"left"}}, h))))
                , React.createElement('tbody', {}, pmMarkers.map((m,i)=>{const d=data.pmData[m.label]||{}; return (
                  React.createElement('tr', { key: m.id, style: {background:i%2===0?"#f8fafc":"#fff"}}
                    , React.createElement('td', { style: {padding:"6px 10px",fontWeight:700,color:"#3b82f6"}}, m.label)
                    , React.createElement('td', { style: {padding:"6px 10px"}}, d.notes||"—")
                    , React.createElement('td', { style: {padding:"6px 10px"}}, d.g4||"—")
                    , React.createElement('td', { style: {padding:"6px 10px"}}, d.g5||"—")
                    , React.createElement('td', { style: {padding:"6px 10px"}}, d.speedtest||"—")
                  )
                )}))
              )
            )
          )

          /* PICOs */
          , picoMarkers.length>0 && (
            React.createElement('div', { style: {marginBottom:20}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:10}}, "Emplacements PICO BTS ("   , picoMarkers.length, ")")
              , React.createElement('div', { style: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}
                , picoMarkers.map(m=>{const d=data.picoData[m.label]||{}; return (
                  React.createElement('div', { key: m.id, style: {border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}
                    , d.photo && React.createElement('div', { style: {position:"relative"}}, React.createElement('img', { src: d.photo, alt: "", style: {width:"100%",height:120,objectFit:"cover"}}), React.createElement('div', { style: {position:"absolute",top:6,left:6,background:"#f97316",color:"#fff",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:800}}, "📶 " , m.label))
                    , React.createElement('div', { style: {padding:"10px 12px",background:"#f8fafc",fontSize:12}}
                      , React.createElement('div', { style: {fontWeight:700,color:"#f97316",marginBottom:6}}, m.label)
                      , d.hauteur && React.createElement('div', {}, React.createElement('strong', {}, "Hauteur :" ), " " , d.hauteur)
                      , d.cablage && React.createElement('div', {}, React.createElement('strong', {}, "Câblage :" ), " " , d.cablage)
                      , d.notes && React.createElement('div', { style: {marginTop:4,color:"#64748b"}}, d.notes)
                    )
                  )
                )})
              )
            )
          )

          /* Photos */
          , [...(data.local&&data.local.photos||[]),...(data.reportingPhotos&&data.reportingPhotos.photos||[])].length>0 && (
            React.createElement('div', { style: {marginBottom:20}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:10}}, "Reporting photos" )
              , React.createElement('div', { style: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}
                , [...(data.local&&data.local.photos||[]).map(p=>({...p,s:"Local"})),...data.reportingPhotos.photos.map(p=>({...p,s:"Reporting"}))].map((p,i)=>(
                  React.createElement('div', { key: i}, React.createElement('img', { src: (typeof p==='string')?p:(p.annotated||p.src), alt: "", style: {width:"100%",borderRadius:8,objectFit:"cover",height:120}}), React.createElement('div', { style: {fontSize:10,color:"#64748b",marginTop:4}}, String(i+1).padStart(2,"0"), " — "  , p.s))
                ))
              )
            )
          )

          , (data.oeuvre.nbTechniciens || data.oeuvre.nacelle !== undefined) && (
            React.createElement('div', { style: {marginBottom:20}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:10}}, "Mise en œuvre"  )
              /* Cable total */
              , (data.plan&&data.plan.markers||[]).filter(m=>m.type==="pico").length>0 && (()=>{
                const pics = (data.plan&&data.plan.markers||[]).filter(m=>m.type==="pico");
                const raw = pics.reduce((s,m)=>{const pd=data.picoData[m.label]||{}; return s+(parseFloat(pd.cablage)||0)+(parseFloat(pd.hauteur)||0);},0);
                const total = Math.ceil(raw*(1+(parseFloat(data.oeuvre.margePercent)||10)/100));
                return (
                  React.createElement('div', { style: {background:"#f0fdf4",borderRadius:8,padding:"10px 14px",marginBottom:10,display:"flex",justifyContent:"space-between"}}
                    , React.createElement('span', { style: {fontWeight:700,color:"#16a34a"}}, "Total câble Ethernet"  )
                    , React.createElement('span', { style: {fontWeight:800,color:"#16a34a",fontSize:16}}, total, " m" )
                  )
                );
              })()
              , React.createElement('div', { style: {background:"#f8fafc",borderRadius:8,padding:14,fontSize:13,lineHeight:1.9}}
                , (data.plan&&data.plan.markers||[]).filter(m=>m.type==="pico").map(m=>{const pd=data.picoData[m.label]||{};return pd.cablage?React.createElement('div', { key: m.label}, React.createElement('strong', {}, m.label, " :" ), " " , pd.cablage, "m câble "  , pd.hauteur?`+ ${pd.hauteur}m hauteur`:""):null;})
                , React.createElement('div', { style: {marginTop:8,borderTop:"1px solid #e2e8f0",paddingTop:8}}
                  , React.createElement('strong', {}, "Techniciens :" ), " " , data.oeuvre.nbTechniciens||1, " — "  , React.createElement('strong', {}, "Durée :" ), " " , data.oeuvre.nbJours||1, " jour(s) — "   , React.createElement('strong', {}, "Qualification :" ), " " , data.oeuvre.niveauQualif||"N2"
                )
                , data.oeuvre.hauteurTravailMax && React.createElement('div', {}, React.createElement('strong', {}, "Hauteur max :"  ), " " , data.oeuvre.hauteurTravailMax)
                , [["nacelle","Nacelle",data.oeuvre.nacelleHauteur],["pirl","PIRL"],["echafaudage","Échafaudage"],["perforateur","Perforateur"],["cheminCable","Chemin de câble"],["bandeauPrises","Bandeau prises"]].filter(([k])=>data.oeuvre[k]).map(([k,l,extra])=>(
                  React.createElement('div', { key: k}, "✓ " , l, extra?` (${extra})`:"")
                ))
                , Object.entries(data.oeuvre.fournitures||{}).filter(([,v])=>v).map(([k])=>{
                  const nb=(data.plan&&data.plan.markers||[]).filter(m=>m.type==="pico").length;
                  const map={poe:`${nb} x Injecteur POE`,chevilles:`${nb*4} x Kit chevilles`,colliers:`${nb*6} x Colliers`,pieceFixation:`${nb} x Pièce fixation`,goulotte:`Goulotte`};
                  return map[k]?React.createElement('div', { key: k}, "• " , map[k]):null;
                })
                , data.oeuvre.fournituresExtras && React.createElement('div', { style: {marginTop:4}}, data.oeuvre.fournituresExtras)
                , data.oeuvre.vlan==="OUI" && React.createElement('div', { style: {marginTop:4}}, React.createElement('strong', {}, "VLAN :" ), " OUI "  , data.oeuvre.vlanPort?`— Port : ${data.oeuvre.vlanPort}`:"")
                , data.oeuvre.validePar && React.createElement('div', {}, React.createElement('strong', {}, "Validé par :"  ), " " , data.oeuvre.validePar)
              )
            )
          )
          , !(auditType==='doe'&&data.doe&&data.doe.finalise) && data.acces.notes && React.createElement('div', {}, React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:"#0f2040",marginBottom:8}}, "Acces site" ), React.createElement('p', { style: {fontSize:13}}, data.acces.notes))
          
          , auditType==='doe' && data.doe && (
            React.createElement('div', { style: {marginTop:20,background:'#0f2040',borderRadius:12,padding:16,border:'1px solid #1e3a5f'}}
              , React.createElement('h3', { style: {fontSize:15,fontWeight:800,color:'#f1f5f9',marginBottom:12}}, 'DOE - Reste a faire')
              , React.createElement('div', { style: {background:data.doe.finalise?'#052010':'#200505',border:'2px solid '+(data.doe.finalise?'#22c55e40':'#ef444440'),borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}
                , React.createElement('span', { style: {fontSize:16}}, data.doe.finalise?'[OK]':'[!]')
                , React.createElement('span', { style: {fontWeight:700,color:data.doe.finalise?'#22c55e':'#ef4444'}}, data.doe.finalise?'DOE FINALISE':'DOE NON FINALISE')
              )
              , data.doe.raf && (function(){
                  var raf=data.doe.raf;
                  var rows=[['Cablage restant',raf.cablageRestant],['Equipements restants',raf.equipementsRestants],['Ressources',raf.ressources],['Besoins client',raf.besoinsClient],['Notes',raf.notes]];
                  return rows.filter(function(r){return r[1]&&String(r[1]).trim();}).map(function(r){
                    return React.createElement('div',{key:r[0],style:{marginBottom:8}}
                      ,React.createElement('div',{style:{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase'}},r[0])
                      ,React.createElement('div',{style:{fontSize:13,color:'#e2e8f0',marginTop:2}},r[1])
                    );
                  });
                })()
              , data.doe.raf&&(data.doe.raf.picoNonInstalle||[]).length>0&&React.createElement('div',{style:{marginTop:8}}
                ,React.createElement('div',{style:{fontSize:10,fontWeight:700,color:'#f59e0b',textTransform:'uppercase'}},'PICO non installes')
                ,React.createElement('div',{style:{color:'#f59e0b',fontSize:13,marginTop:2}},(data.doe.raf.picoNonInstalle||[]).join(', '))
              )
            )
          )
          , React.createElement('div', { style: {marginTop:20,padding:14,background:auditType==='doe'?'#0a1628':'#f0fdf4',borderRadius:10,textAlign:'center',color:auditType==='doe'?'#3b82f6':'#16a34a',fontWeight:700,fontSize:13}}, auditType==='doe'?'Apercu DOE PICO BTS':'Apercu fidele du rapport PDF')
        )
      )
    )
  );
}

// ─── Audit List Screen ─────────────────────────────────────────────────────────

// ─── Types de documents disponibles ──────────────────────────────────────────
// ── Antenne Déportée ──────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
//  MESURES COMPARATIVES BOUYGUES vs ORANGE (Starlink / Cradlepoint)
// ════════════════════════════════════════════════════════════════════════════
function StarlinkComparativeSection({ starlink, onChange }) {
  if (!starlink) return null;
  var mesures = starlink.mesuresComparatives || [];
  var updM = function(i,k,v){ var m=[...mesures]; m[i]={...m[i],[k]:v}; onChange({...starlink,mesuresComparatives:m}); };
  var INP = {padding:'4px 2px',borderRadius:5,border:'1px solid #1e3a5f',background:'#020817',
             color:'#e2e8f0',fontSize:9,width:'100%',boxSizing:'border-box',textAlign:'center',fontFamily:'inherit'};

  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '📊 Mesures comparatives opérateurs'),
    React.createElement('div', {style:{background:'#0a1628',border:'1px solid #005bbb40',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#64748b'}},
      'Relevez les mesures sur les mêmes points avec Bouygues Telecom ET Orange pour comparer les niveaux de couverture.'
    ),
    mesures.map(function(m,i){
      return React.createElement('div', {key:i,
        style:{background:'#0a1628',borderRadius:12,padding:12,marginBottom:10,border:'1px solid #1e3a5f'}},
        React.createElement('div', {style:{fontWeight:700,color:'#60a5fa',fontSize:13,marginBottom:10}}, m.point),
        // Bouygues
        React.createElement('div', {style:{marginBottom:8}},
          React.createElement('div', {style:{fontSize:10,fontWeight:700,color:'#005bbb',marginBottom:4,
            background:'#001a3a',borderRadius:6,padding:'4px 8px',display:'inline-block'}}, '🔵 Bouygues Telecom'),
          React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginTop:4}},
            ['RSRP','RSRQ','SNR','↓DL','↑UL'].map(function(h){
              return React.createElement('div',{key:h,style:{textAlign:'center',fontSize:8,color:'#475569',marginBottom:2}},h);
            }),
            ['op_bytel_rsrp','op_bytel_rsrq','op_bytel_snr','op_bytel_dl','op_bytel_ul'].map(function(col){
              return React.createElement('input',{key:col,value:m[col]||'',
                onChange:function(e){updM(i,col,e.target.value);},style:INP,placeholder:'—'});
            })
          )
        ),
        // Orange
        React.createElement('div', {},
          React.createElement('div', {style:{fontSize:10,fontWeight:700,color:'#ea580c',marginBottom:4,
            background:'#1a0800',borderRadius:6,padding:'4px 8px',display:'inline-block'}}, '🟠 Orange'),
          React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:4,marginTop:4}},
            ['RSRP','RSRQ','SNR','↓DL','↑UL'].map(function(h){
              return React.createElement('div',{key:h,style:{textAlign:'center',fontSize:8,color:'#475569',marginBottom:2}},h);
            }),
            ['op_orange_rsrp','op_orange_rsrq','op_orange_snr','op_orange_dl','op_orange_ul'].map(function(col){
              return React.createElement('input',{key:col,value:m[col]||'',
                onChange:function(e){updM(i,col,e.target.value);},style:INP,placeholder:'—'});
            })
          )
        )
      );
    })
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPOSANTS CEL-FI QUATRA
// ════════════════════════════════════════════════════════════════════════════
function CelfiUnitsSection({ celfi, onChange }) {
  if (!celfi) return null;
  var nu = celfi.nu || {};
  var cus = celfi.cus || [];
  var updNu = function(k,v){ onChange({...celfi, nu:{...celfi.nu,[k]:v}}); };
  var updCu = function(i,k,v){ var newCus=cus.map(function(c,idx){return idx===i?{...c,[k]:v}:c;}); onChange({...celfi,cus:newCus}); };
  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '📶 Network Unit (NU) — Coverage Units (CU)'),
    // NU
    React.createElement(Card, {title:'📡 Network Unit (NU)'},
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field, {label:'IMEI',        value:nu.imei||'',        onChange:v=>updNu('imei',v),        placeholder:'IMEI du NU'}),
        React.createElement(Field, {label:'S/N',         value:nu.sn||'',          onChange:v=>updNu('sn',v),          placeholder:'Numéro de série'}),
        React.createElement(Field, {label:'Adresse MAC', value:nu.mac||'',         onChange:v=>updNu('mac',v),         placeholder:'AA:BB:CC:DD:EE:FF'}),
        React.createElement(Field, {label:'Hauteur (m)', value:nu.hauteur||'',     onChange:v=>updNu('hauteur',v),     placeholder:'Ex: 2.5'}),
        React.createElement(Field, {label:'Emplacement', value:nu.emplacement||'', onChange:v=>updNu('emplacement',v), placeholder:'Ex: Hall entrée'})
      ),
      React.createElement('div', {style:{marginTop:10}},
        React.createElement('div', {style:{fontSize:10,color:'#475569',marginBottom:6,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}, 'Type de supervision'),
        React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
          ['LAN Client','Routeur 4G'].map(function(t){
            var sel = (nu.supervision||'LAN Client') === t;
            return React.createElement('button', {key:t, onClick:function(){updNu('supervision',t);},
              style:{padding:'10px',borderRadius:8,border:'1px solid '+(sel?'#a855f7':'#1e3a5f'),
                     background:sel?'#2d0a45':'transparent',color:sel?'#c084fc':'#64748b',
                     fontWeight:sel?700:400,cursor:'pointer',fontSize:12}
            }, sel?'✓ '+t:t);
          })
        )
      )
    ),
    // CUs
    React.createElement(Card, {title:'📶 Coverage Units (CU)'},
      cus.map(function(cu, i) {
        return React.createElement('div', {key:i, style:{background:'#0a1628',borderRadius:10,padding:12,marginBottom:10,border:'1px solid #a855f730'}},
          React.createElement('div', {style:{fontWeight:700,color:'#c084fc',fontSize:13,marginBottom:8}}, cu.id),
          React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}},
            React.createElement(Field, {label:'S/N',         value:cu.sn||'',          onChange:v=>updCu(i,'sn',v),          placeholder:'Numéro de série'}),
            React.createElement(Field, {label:'Adresse MAC', value:cu.mac||'',         onChange:v=>updCu(i,'mac',v),         placeholder:'AA:BB:CC:DD:EE:FF'}),
            React.createElement(Field, {label:'Hauteur (m)', value:cu.hauteur||'',     onChange:v=>updCu(i,'hauteur',v),     placeholder:'Ex: 2.5'}),
            React.createElement(Field, {label:'Emplacement', value:cu.emplacement||'', onChange:v=>updCu(i,'emplacement',v), placeholder:'Ex: Bureau 2'})
          )
        );
      })
    )
  );
}

function CelfiMesuresSection({ celfi, onChange }) {
  if (!celfi) return null;
  var mes3g = celfi.mesures3g || [];
  var mes4g = celfi.mesures4g || [];
  var upd3g = function(i,k,v){ var m=[...mes3g]; m[i]={...m[i],[k]:v}; onChange({...celfi,mesures3g:m}); };
  var upd4g = function(i,k,v){ var m=[...mes4g]; m[i]={...m[i],[k]:v}; onChange({...celfi,mesures4g:m}); };
  var INP = {padding:'5px 3px',borderRadius:6,border:'1px solid #1e3a5f',background:'#020817',color:'#e2e8f0',fontSize:10,width:'100%',boxSizing:'border-box',textAlign:'center'};
  var HDR3G = ['Opérateur','Band','RNC','LCID','RSCP','EC/IO','↑UL','↓DL','Ping'];
  var COL3G = ['operateur','band','rnc','lcid','rscp','ecio','ul','dl','ping'];
  var HDR4G = ['Opérateur','Band','eNB','LCID','RSRP','RSRQ','SNR','↑UL','↓DL','Ping'];
  var COL4G = ['operateur','band','enb','lcid','rsrp','rsrq','snr','ul','dl','ping'];

  function MesureTable(title, mesures, hdrs, cols, updFn, accentColor) {
    return React.createElement(Card, {title:title},
      React.createElement('div', {style:{overflowX:'auto'}},
        React.createElement('div', {style:{display:'grid',gridTemplateColumns:'120px repeat('+cols.length+',1fr)',gap:2,marginBottom:3}},
          React.createElement('div',{style:{fontSize:8,color:'#64748b',fontWeight:700}},'Mesure'),
          hdrs.map(function(h){return React.createElement('div',{key:h,style:{fontSize:8,color:'#64748b',textAlign:'center',fontWeight:700}},h);})
        ),
        mesures.map(function(m,i){
          var c=rsrpBg&&rsrpBg(m.rsrp||m.rscp);
          return React.createElement('div', {key:i, style:{display:'grid',gridTemplateColumns:'120px repeat('+cols.length+',1fr)',gap:2,marginBottom:3,background:c?c.bg:'#0a1628',borderRadius:6,padding:'4px'}},
            React.createElement('div',{style:{fontSize:9,color:accentColor,fontWeight:600,display:'flex',alignItems:'center',paddingLeft:4}},m.label),
            cols.map(function(col){return React.createElement('input',{key:col,value:m[col]||'',onChange:function(e){updFn(i,col,e.target.value);},style:INP,placeholder:'—'});})
          );
        })
      )
    );
  }

  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '📊 Mesures radio CEL-FI'),
    MesureTable('📻 Mesures 3G (RSCP / EC/IO)', mes3g, HDR3G, COL3G, upd3g, '#c084fc'),
    MesureTable('📡 Mesures 4G/5G (RSRP / RSRQ)', mes4g, HDR4G, COL4G, upd4g, '#a855f7')
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPOSANTS WIFI
// ════════════════════════════════════════════════════════════════════════════
function WifiBornesSection({ wifi, onChange }) {
  if (!wifi) return null;
  var bornes = wifi.bornes || [];
  var updB = function(i,k,v){ var b=[...bornes]; b[i]={...b[i],[k]:v}; onChange({...wifi,bornes:b}); };
  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '🌐 Bornes WIFI'),
    bornes.map(function(b, i) {
      return React.createElement(Card, {key:i, title:'📶 '+b.id},
        React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
          React.createElement(Field, {label:'SSID',        value:b.ssid||'',        onChange:v=>updB(i,'ssid',v),        placeholder:'Nom réseau'}),
          React.createElement(Field, {label:'S/N',         value:b.sn||'',          onChange:v=>updB(i,'sn',v),          placeholder:'Numéro de série'}),
          React.createElement(Field, {label:'Adresse MAC', value:b.mac||'',         onChange:v=>updB(i,'mac',v),         placeholder:'AA:BB:CC:DD:EE:FF'}),
          React.createElement(Field, {label:'Hauteur (m)', value:b.hauteur||'',     onChange:v=>updB(i,'hauteur',v),     placeholder:'Ex: 2.8'}),
          React.createElement(Field, {label:'Longueur câble (m)', value:b.cablage||'', onChange:v=>updB(i,'cablage',v), placeholder:'Ex: 15'}),
          React.createElement(Field, {label:'N° prise RJ45',value:b.prise||'',     onChange:v=>updB(i,'prise',v),       placeholder:'Ex: P1'}),
          React.createElement(Field, {label:'Emplacement', value:b.emplacement||'', onChange:v=>updB(i,'emplacement',v),placeholder:'Ex: Salle réunion'})
        )
      );
    }),
    // Total câblage
    (function(){
      var total = bornes.reduce(function(sum,b){return sum+(parseFloat(b.cablage)||0);},0);
      return total > 0 ? React.createElement('div', {style:{background:'#0a1628',borderRadius:10,padding:'12px 16px',marginTop:8,border:'1px solid #06b6d440',display:'flex',justifyContent:'space-between',alignItems:'center'}},
        React.createElement('span', {style:{color:'#64748b',fontSize:13}}, 'Total câblage cumulé :'),
        React.createElement('span', {style:{color:'#06b6d4',fontSize:16,fontWeight:800}}, total.toFixed(1)+' m')
      ) : null;
    })()
  );
}

function WifiMesuresSection({ wifi, onChange }) {
  if (!wifi) return null;
  var mesures = wifi.mesures || [];
  var updM = function(i,k,v){ var m=[...mesures]; m[i]={...m[i],[k]:v}; onChange({...wifi,mesures:m}); };
  var INP = {padding:'5px 3px',borderRadius:6,border:'1px solid #1e3a5f',background:'#020817',color:'#e2e8f0',fontSize:10,width:'100%',boxSizing:'border-box',textAlign:'center'};
  var HDRS = ['Borne','SSID','RSSI (dBm)','Canal','↑UL Mbps','↓DL Mbps','Ping'];
  var COLS = ['borne','ssid','rssi','channel','ul','dl','ping'];
  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '📊 Mesures signal WIFI'),
    React.createElement(Card, {},
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'120px repeat(7,1fr)',gap:2,marginBottom:4}},
        React.createElement('div',{style:{fontSize:8,color:'#64748b',fontWeight:700}},'Point'),
        HDRS.map(function(h){return React.createElement('div',{key:h,style:{fontSize:8,color:'#64748b',textAlign:'center',fontWeight:700}},h);})
      ),
      mesures.map(function(m,i){
        return React.createElement('div', {key:i, style:{display:'grid',gridTemplateColumns:'120px repeat(7,1fr)',gap:2,marginBottom:3,background:i%2===0?'#0d1f3c':'#0f2040',borderRadius:6,padding:'4px'}},
          React.createElement('div',{style:{fontSize:9,color:'#06b6d4',fontWeight:600,display:'flex',alignItems:'center',paddingLeft:4}},m.label),
          COLS.map(function(col){return React.createElement('input',{key:col,value:m[col]||'',onChange:function(e){updM(i,col,e.target.value);},style:INP,placeholder:'—'});})
        );
      })
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  COMPOSANTS STARLINK
// ════════════════════════════════════════════════════════════════════════════
function StarlinkPrereqsSection({ starlink, onChange }) {
  if (!starlink) return null;
  var prereqs   = starlink.prereqs || [];
  var fournitures = starlink.fournitures || [];
  var updPr     = function(i,v){ var p=[...prereqs]; p[i]={...p[i],ok:v}; onChange({...starlink,prereqs:p}); };
  var updSl     = function(k,v){ onChange({...starlink,[k]:v}); };
  var updFou    = function(i,k,v){ var f=[...fournitures]; f[i]={...f[i],[k]:v}; onChange({...starlink,fournitures:f}); };

  var TYPE_AUDIT   = [{v:'STARLINK',label:'🛰️ Starlink'},{v:'CRADLEPOINT',label:'📡 Cradlepoint'},{v:'AERIEN',label:'🏗️ Aérien'}];
  var TYPE_PROJET  = [{v:'aerien',label:'🛰️ Aérien'},{v:'u_tech',label:'🏢 V2 U-TECH'},{v:'schiever_crea',label:'🏪 Schiever/CREA'}];

  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '✅ Prérequis & Configuration'),

    // Type d'équipement
    React.createElement(Card, {title:"Type d'équipement"},
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}},
        TYPE_AUDIT.map(function(t){
          var sel=starlink.typeAudit===t.v;
          return React.createElement('button', {key:t.v, onClick:function(){updSl('typeAudit',t.v);},
            style:{padding:'10px 6px',borderRadius:8,border:'1px solid '+(sel?'#eab308':'#1e3a5f'),
                   background:sel?'#1a1200':'transparent',color:sel?'#fbbf24':'#64748b',
                   fontWeight:sel?700:400,cursor:'pointer',fontSize:12,textAlign:'center'}
          }, t.label);
        })
      )
    ),

    // Type de projet (INFO U)
    React.createElement(Card, {title:"Type de projet INFO U"},
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}},
        TYPE_PROJET.map(function(t){
          var sel=starlink.typeProjet===t.v;
          return React.createElement('button', {key:t.v, onClick:function(){updSl('typeProjet',t.v);},
            style:{padding:'10px 6px',borderRadius:8,border:'1px solid '+(sel?'#005bbb':'#1e3a5f'),
                   background:sel?'#001a3a':'transparent',color:sel?'#60a5fa':'#64748b',
                   fontWeight:sel?700:400,cursor:'pointer',fontSize:11,textAlign:'center'}
          }, t.label);
        })
      ),
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field, {label:"Distance câble (m)",        value:starlink.distanceCable||'25',    onChange:v=>updSl('distanceCable',v),    placeholder:'25 ou 50'}),
        React.createElement(Field, {label:"Type de pose",             value:starlink.typePose||'',           onChange:v=>updSl('typePose',v),          placeholder:'Ex: façade, toiture'}),
        React.createElement(Field, {label:"Diamètre gaine (mm)",      value:starlink.gaineDiametre||'35',    onChange:v=>updSl('gaineDiametre',v),     placeholder:'35'}),
        React.createElement(Field, {label:"Hauteur mât (m)",          value:starlink.hauteurMat||'',         onChange:v=>updSl('hauteurMat',v),         placeholder:'Ex: 3'}),
        React.createElement(Field, {label:"Score obstruction (app)",  value:starlink.obstructionScore||'',  onChange:v=>updSl('obstructionScore',v),   placeholder:'Ex: 2.3'}),
        React.createElement(Field, {label:"S/N terminal",             value:starlink.sn||'',                onChange:v=>updSl('sn',v),                 placeholder:'Numéro de série'}),
        React.createElement(Field, {label:'Adresse MAC',              value:starlink.mac||'',               onChange:v=>updSl('mac',v),                placeholder:'AA:BB:CC:DD:EE:FF'}),
        React.createElement('div', {style:{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}},
          React.createElement('input', {type:'checkbox', checked:!!starlink.percement, onChange:e=>updSl('percement',e.target.checked),
            style:{width:18,height:18,cursor:'pointer'}}),
          React.createElement('span', {style:{color:'#94a3b8',fontSize:13}}, "Percement façade requis")
        )
      )
    ),

    // Checklist prérequis
    React.createElement(Card, {title:"Checklist prérequis obligatoire"},
      prereqs.map(function(pr,i){
        return React.createElement('div', {key:i, onClick:function(){updPr(i,!pr.ok);},
          style:{display:'flex',alignItems:'center',justifyContent:'space-between',
                 padding:'11px 14px',marginBottom:4,borderRadius:8,cursor:'pointer',
                 background:pr.ok?'#052010':'#0d1f3c',
                 border:'1px solid '+(pr.ok?'#22c55e40':'#1e3a5f')}},
          React.createElement('span', {style:{fontSize:12,color:pr.ok?'#e2e8f0':'#94a3b8',flex:1}}, pr.label),
          React.createElement('div', {style:{padding:'4px 12px',borderRadius:20,flexShrink:0,
                 background:pr.ok?'#052010':'#200505',
                 border:'1px solid '+(pr.ok?'#22c55e60':'#ef444440'),
                 fontSize:11,fontWeight:700,color:pr.ok?'#22c55e':'#ef4444'}},
            pr.ok?'✓ OK':'✗ NOK')
        );
      })
    ),

    // Fournitures
    fournitures.length > 0 && React.createElement(Card, {title:"Fournitures estimées"},
      fournitures.map(function(f,i){
        return React.createElement('div', {key:i,
          style:{display:'grid',gridTemplateColumns:'1fr 80px 60px',gap:8,marginBottom:6,alignItems:'center'}},
          React.createElement('div', {style:{fontSize:13,color:'#94a3b8'}}, f.label),
          React.createElement('input', {value:f.qty||'',onChange:e=>updFou(i,'qty',e.target.value),
            placeholder:'Qté',
            style:{padding:'6px 8px',borderRadius:6,border:'1px solid #1e3a5f',background:'#020817',
                   color:'#e2e8f0',fontSize:12,textAlign:'center',fontFamily:'inherit'}}),
          React.createElement('div', {style:{fontSize:11,color:'#475569',textAlign:'center'}}, f.unite)
        );
      })
    )
  );
}

function StarlinkInstallSection({ starlink, onChange }) {
  if (!starlink) return null;
  var mesures = starlink.mesures || [];
  var updM = function(i,k,v){ var m=[...mesures]; m[i]={...m[i],[k]:v}; onChange({...starlink,mesures:m}); };
  var INP = {padding:'5px 3px',borderRadius:6,border:'1px solid #1e3a5f',background:'#020817',color:'#e2e8f0',fontSize:10,width:'100%',boxSizing:'border-box',textAlign:'center'};
  var HDRS = ['Band','RSSI','Latence','↑UL Mbps','↓DL Mbps','Ping'];
  var COLS = ['band','rsrp','latence','ul','dl','ping'];
  return React.createElement('div', {},
    React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:16}}, '🛰️ Mesures Starlink'),
    React.createElement(Card, {},
      React.createElement('div', {style:{display:'grid',gridTemplateColumns:'130px repeat(6,1fr)',gap:2,marginBottom:4}},
        React.createElement('div',{style:{fontSize:8,color:'#64748b',fontWeight:700}},'Test'),
        HDRS.map(function(h){return React.createElement('div',{key:h,style:{fontSize:8,color:'#64748b',textAlign:'center',fontWeight:700}},h);})
      ),
      mesures.map(function(m,i){
        return React.createElement('div', {key:i, style:{display:'grid',gridTemplateColumns:'130px repeat(6,1fr)',gap:2,marginBottom:3,background:i%2===0?'#100e00':'#0f0d00',borderRadius:6,padding:'4px'}},
          React.createElement('div',{style:{fontSize:9,color:'#eab308',fontWeight:600,display:'flex',alignItems:'center',paddingLeft:4}},m.label),
          COLS.map(function(col){return React.createElement('input',{key:col,value:m[col]||'',onChange:function(e){updM(i,col,e.target.value);},style:INP,placeholder:'—'});})
        );
      })
    )
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MULTI-PLAN EDITOR — Gestion de plusieurs étages / plans
// ════════════════════════════════════════════════════════════════════════════
function MultiPlanEditor({ plans, pmData, picoData, onPlansChange, onPmDataChange, onPicoDataChange, isAntenne }) {
  var [activePlanIdx, setActivePlanIdx] = React.useState(0);
  var [renamingIdx,   setRenamingIdx]   = React.useState(null);
  var [renameVal,     setRenameVal]     = React.useState('');

  var safePlans = plans && plans.length > 0
    ? plans
    : [{id:'plan_0', label:'RDC', photo:null, markers:[]}];

  var activeIdx  = Math.min(activePlanIdx, safePlans.length-1);
  var activePlan = safePlans[activeIdx];

  var updatePlan = function(idx, newPlan) {
    onPlansChange(safePlans.map(function(p,i){ return i===idx ? newPlan : p; }));
  };

  var addPlan = function() {
    var suggestions = ['RDC','R+1','R+2','R+3','Sous-sol','Toiture','Zone A','Zone B'];
    var used = safePlans.map(function(p){ return p.label; });
    var lbl  = suggestions.find(function(l){ return !used.includes(l); }) || ('Etage '+safePlans.length);
    var next = safePlans.concat([{id:'plan_'+Date.now(), label:lbl, photo:null, markers:[]}]);
    onPlansChange(next);
    setActivePlanIdx(next.length-1);
  };

  var deletePlan = function(idx) {
    if (safePlans.length <= 1) return;
    if (!confirm('Supprimer le plan "'+safePlans[idx].label+'" et ses marqueurs ?')) return;
    var next = safePlans.filter(function(_,i){ return i!==idx; });
    onPlansChange(next);
    setActivePlanIdx(Math.min(activeIdx, next.length-1));
  };

  var startRename = function(idx, e) {
    e.stopPropagation();
    setRenamingIdx(idx);
    setRenameVal(safePlans[idx].label);
  };

  var commitRename = function() {
    if (renamingIdx !== null && renameVal.trim()) {
      updatePlan(renamingIdx, Object.assign({}, safePlans[renamingIdx], {label: renameVal.trim()}));
    }
    setRenamingIdx(null);
    setRenameVal('');
  };

  var totalPM   = safePlans.reduce(function(s,p){ return s+(p.markers||[]).filter(function(m){return m.type==='pm';}).length; }, 0);

  return React.createElement('div', {}
    , React.createElement('h2', {style:{fontSize:18,fontWeight:700,color:'#e2e8f0',marginBottom:12}}, 'Plans du site')

    /* ── Barre onglets ───────────────────────────────────────────────────── */
    , React.createElement('div', {style:{display:'flex',alignItems:'flex-end',gap:4,overflowX:'auto',paddingBottom:0}}
      , safePlans.map(function(plan, idx) {
          var isActive = idx === activeIdx;
          var markerCount = (plan.markers||[]).length;
          return React.createElement('div', {
              key: plan.id,
              onClick: function(){ setActivePlanIdx(idx); },
              style:{
                padding:'8px 14px 10px', borderRadius:'10px 10px 0 0',
                border:'none', cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', gap:6,
                background: isActive ? '#1e3a5f' : '#0a1628',
                color:       isActive ? '#e2e8f0' : '#475569',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                fontSize:12, fontWeight: isActive ? 700 : 400,
              }
            }
            , React.createElement('span', {}, plan.label)
            , markerCount > 0 && React.createElement('span', {
                style:{background:isActive?'#3b82f6':'#334155',color:'#fff',
                       borderRadius:10,padding:'1px 6px',fontSize:9,fontWeight:800}
              }, markerCount)
            , safePlans.length > 1 && React.createElement('span', {
                onClick: function(e){ e.stopPropagation(); deletePlan(idx); },
                style:{color:'#475569',fontSize:15,lineHeight:1,cursor:'pointer',marginLeft:2}
              }, '×')
          );
        })
      , React.createElement('div', {
          onClick: addPlan,
          style:{padding:'8px 14px 10px',borderRadius:'10px 10px 0 0',cursor:'pointer',
                 background:'#052010',color:'#22c55e',fontSize:12,fontWeight:700,
                 border:'1px dashed #22c55e40',borderBottom:'2px solid transparent',flexShrink:0}
        }, '+ Plan')
    )

    /* ── Contenu plan actif ─────────────────────────────────────────────── */
    , React.createElement('div', {
        style:{background:'#0f2040',borderRadius:'0 12px 12px 12px',
               border:'1px solid #1e3a5f',borderTop:'none',padding:16}
      }

      /* ── Barre nom + bouton renommer ────────────────────────────────── */
      , renamingIdx === activeIdx
        ? React.createElement('div', {style:{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}
          , React.createElement('input', {
              autoFocus: true,
              value: renameVal,
              onChange: function(e){ setRenameVal(e.target.value); },
              onKeyDown: function(e){
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenamingIdx(null); setRenameVal(''); }
              },
              style:{flex:1,padding:'9px 12px',borderRadius:8,border:'2px solid #3b82f6',
                     background:'#020817',color:'#e2e8f0',fontSize:14,fontFamily:'inherit',outline:'none'}
            })
          , React.createElement('button', {
              onClick: commitRename,
              style:{padding:'9px 16px',borderRadius:8,border:'none',
                     background:'#3b82f6',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}
            }, 'OK')
          , React.createElement('button', {
              onClick: function(){ setRenamingIdx(null); setRenameVal(''); },
              style:{padding:'9px 12px',borderRadius:8,border:'1px solid #334155',
                     background:'transparent',color:'#64748b',cursor:'pointer',fontSize:13}
            }, 'Annuler')
          )
        : React.createElement('div', {style:{display:'flex',alignItems:'center',gap:10,marginBottom:12}}
          , React.createElement('div', {style:{flex:1,fontSize:15,fontWeight:700,color:'#e2e8f0'}}, activePlan.label)
          , React.createElement('button', {
              onClick: function(e){ startRename(activeIdx, e); },
              style:{padding:'6px 14px',borderRadius:8,border:'1px solid #1e3a5f',
                     background:'#0a1628',color:'#64748b',cursor:'pointer',fontSize:12,fontWeight:600}
            }, 'Renommer')
          )

      /* PlanEditor */
      , React.createElement(PlanEditor, {
          plan:             activePlan,
          pmData:           pmData,
          picoData:         picoData,
          onChange:         function(p){ updatePlan(activeIdx, p); },
          onPmDataChange:   onPmDataChange,
          onPicoDataChange: onPicoDataChange,
          isAntenne:        isAntenne
        })
    )

    /* ── Tableau qualité couverture ─────────────────────────────────────── */
    , React.createElement(Card, {title:'Tableau de couverture radio'}
      , React.createElement('div', {style:{background:'#0a1628',borderRadius:10,overflow:'hidden'}}
        , [{label:'Bonne',value:'> -97dBm',color:'#22c55e'},
           {label:'Moyenne',value:'-98 < X < -107dBm',color:'#f59e0b'},
           {label:'Mediocre',value:'-108 < X < -117dBm',color:'#f97316'},
           {label:'Mauvaise',value:'> -118 dBm',color:'#ef4444'},
           {label:'Inexistante',value:'Pas de couverture',color:'#64748b'}
          ].map(function(q){
            return React.createElement('div', {key:q.label,
              style:{display:'flex',justifyContent:'space-between',
                     padding:'8px 14px',borderBottom:'1px solid #1e3a5f'}}
              , React.createElement('span', {style:{fontWeight:700,color:q.color,fontSize:13}}, q.label)
              , React.createElement('span', {style:{fontSize:12,color:'#475569'}}, q.value)
            );
          })
      )
    )

    /* ── Tableau PM tous plans ───────────────────────────────────────────── */
    , React.createElement(Card, {title:'Tableau de mesures — tous plans ('+totalPM+' PM)'}
      , React.createElement(PMTable, {
          plan:    {photo:null, markers: safePlans.flatMap(function(p){
            return (p.markers||[]).filter(function(m){return m.type==='pm';})
              .map(function(m){ return Object.assign({},m,{_plan:p.label}); });
          })},
          pmData:  pmData,
          onChange: onPmDataChange
        })
    )
  );
}


