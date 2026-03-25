"use strict";
// photo_annotator.js — Annotateur photo avec zoom et export annotations intégrées
// Usage: window.PhotoAnnotator = composant React

(function() {
var e = React.createElement;

function PhotoAnnotator({ src, onSave, onCancel }) {
  var _tool  = React.useState('arrow');   var tool=_tool[0];   var setTool=_tool[1];
  var _color = React.useState('#ef4444'); var color=_color[0]; var setColor=_color[1];
  var _sz    = React.useState(3);         var sz=_sz[0];       var setSz=_sz[1];
  var _txt   = React.useState('');        var txt=_txt[0];     var setTxt=_txt[1];
  var _sh    = React.useState([]);        var shapes=_sh[0];   var setShapes=_sh[1];
  var _zoom  = React.useState(1);         var zoom=_zoom[0];   var setZoom=_zoom[1];
  var _pan   = React.useState({x:0,y:0}); var pan=_pan[0];    var setPan=_pan[1];
  var _panning= React.useState(false);    var panning=_panning[0]; var setPanning=_panning[1];

  var canvasRef     = React.useRef(null); // affichage (zoomé)
  var exportRef     = React.useRef(null); // export pleine résolution
  var imgRef        = React.useRef(null);
  var drawing       = React.useRef(false);
  var startPt       = React.useRef(null);
  var currentPen    = React.useRef(null);
  var panStart      = React.useRef(null);
  var panOrigin     = React.useRef(null);
  var wrapRef       = React.useRef(null);

  // Dimensions image réelles
  var imgW = React.useRef(0);
  var imgH = React.useRef(0);

  // ── Charger l'image ───────────────────────────────────────────────────────
  React.useEffect(function() {
    var img = new Image();
    img.onload = function() {
      imgRef.current = img;
      imgW.current = img.naturalWidth;
      imgH.current = img.naturalHeight;
      fitToScreen();
    };
    img.src = src;
  }, [src]);

  function fitToScreen() {
    var wrap = wrapRef.current;
    if (!wrap) return;
    var maxW = wrap.clientWidth  - 20;
    var maxH = wrap.clientHeight - 20;
    var scaleW = maxW / imgW.current;
    var scaleH = maxH / imgH.current;
    var fit = Math.min(1, scaleW, scaleH);
    setZoom(fit);
    setPan({x:0,y:0});
  }

  // ── Redessiner le canvas d'affichage ─────────────────────────────────────
  React.useEffect(function() {
    redrawDisplay();
  }, [shapes, zoom, pan]);

  function redrawDisplay(extraShape) {
    var c   = canvasRef.current;
    var img = imgRef.current;
    if (!c || !img) return;
    var dw = Math.round(imgW.current * zoom);
    var dh = Math.round(imgH.current * zoom);
    c.width  = dw;
    c.height = dh;
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, dw, dh);
    ctx.drawImage(img, 0, 0, dw, dh);
    shapes.forEach(function(s) { drawShape(ctx, s, zoom); });
    if (extraShape) drawShape(ctx, extraShape, zoom);
  }

  // ── Dessiner une forme (avec facteur d'échelle) ───────────────────────────
  function drawShape(ctx, s, scale) {
    if (!scale) scale = 1;
    ctx.save();
    ctx.strokeStyle = s.c;
    ctx.fillStyle   = s.c;
    ctx.lineWidth   = s.sz * scale;
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    var sc = function(v) { return v * scale; };
    if (s.t === 'arrow') {
      arrow(ctx, sc(s.x1), sc(s.y1), sc(s.x2), sc(s.y2), s.sz * scale);
    } else if (s.t === 'rect') {
      ctx.strokeRect(sc(s.x1), sc(s.y1), sc(s.x2-s.x1), sc(s.y2-s.y1));
    } else if (s.t === 'circle') {
      var rx = sc(s.x2-s.x1)/2, ry = sc(s.y2-s.y1)/2;
      ctx.beginPath();
      ctx.ellipse(sc(s.x1)+rx, sc(s.y1)+ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (s.t === 'pen') {
      if (!s.pts || s.pts.length < 2) { ctx.restore(); return; }
      ctx.beginPath();
      ctx.moveTo(sc(s.pts[0].x), sc(s.pts[0].y));
      s.pts.slice(1).forEach(function(p) { ctx.lineTo(sc(p.x), sc(p.y)); });
      ctx.stroke();
    } else if (s.t === 'text') {
      var fsize = Math.max(14, s.sz * 5) * scale;
      ctx.font = 'bold ' + fsize + 'px Arial';
      ctx.lineWidth   = 2 * scale;
      ctx.strokeStyle = '#000';
      ctx.strokeText(s.text, sc(s.x1), sc(s.y1));
      ctx.fillStyle = s.c;
      ctx.fillText(s.text, sc(s.x1), sc(s.y1));
    }
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, lw) {
    var hl  = Math.max(lw * 4, 12);
    var ang = Math.atan2(y2-y1, x2-x1);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hl*Math.cos(ang-0.5), y2 - hl*Math.sin(ang-0.5));
    ctx.lineTo(x2 - hl*Math.cos(ang+0.5), y2 - hl*Math.sin(ang+0.5));
    ctx.closePath(); ctx.fill();
  }

  // ── Coordonnées canvas → coordonnées IMAGE réelles ────────────────────────
  function getXY(ev) {
    var c    = canvasRef.current;
    var rect = c.getBoundingClientRect();
    var kx   = imgW.current / rect.width;
    var ky   = imgH.current / rect.height;
    var src  = ev.changedTouches ? ev.changedTouches[0] : (ev.touches ? ev.touches[0] : ev);
    return {
      x: (src.clientX - rect.left) * kx,
      y: (src.clientY - rect.top)  * ky,
    };
  }

  // ── Zoom molette ──────────────────────────────────────────────────────────
  function onWheel(ev) {
    ev.preventDefault();
    var delta = ev.deltaY > 0 ? -0.1 : 0.1;
    setZoom(function(z) { return Math.max(0.2, Math.min(5, z + delta)); });
  }

  // ── Handlers dessin ───────────────────────────────────────────────────────
  function onDown(ev) {
    if (tool === 'text') return;
    // Outil pan = déplacement
    if (tool === 'pan') {
      setPanning(true);
      var src = ev.touches ? ev.touches[0] : ev;
      panStart.current  = { x: src.clientX, y: src.clientY };
      panOrigin.current = { ...pan };
      return;
    }
    ev.preventDefault(); ev.stopPropagation();
    drawing.current = true;
    var p = getXY(ev);
    startPt.current = p;
    if (tool === 'pen') {
      currentPen.current = { t:'pen', c:color, sz:sz, pts:[p] };
    }
  }

  function onMove(ev) {
    if (tool === 'pan' && panning) {
      var src = ev.touches ? ev.touches[0] : ev;
      var dx = src.clientX - panStart.current.x;
      var dy = src.clientY - panStart.current.y;
      setPan({ x: panOrigin.current.x + dx, y: panOrigin.current.y + dy });
      return;
    }
    if (!drawing.current) return;
    ev.preventDefault(); ev.stopPropagation();
    var p = getXY(ev);
    if (tool === 'pen') {
      if (!currentPen.current) return;
      currentPen.current.pts.push(p);
      redrawDisplay(currentPen.current);
    } else {
      var preview = { t:tool, c:color, sz:sz,
        x1:startPt.current.x, y1:startPt.current.y, x2:p.x, y2:p.y };
      redrawDisplay(preview);
    }
  }

  function onUp(ev) {
    if (tool === 'pan') { setPanning(false); return; }
    if (!drawing.current) return;
    ev.preventDefault(); ev.stopPropagation();
    drawing.current = false;
    var p = getXY(ev);
    if (tool === 'pen') {
      if (currentPen.current) {
        var pen = currentPen.current;
        currentPen.current = null;
        setShapes(function(prev) { return prev.concat([pen]); });
      }
    } else {
      var s = { t:tool, c:color, sz:sz,
        x1:startPt.current.x, y1:startPt.current.y, x2:p.x, y2:p.y };
      setShapes(function(prev) { return prev.concat([s]); });
    }
  }

  // ── Texte ─────────────────────────────────────────────────────────────────
  function placeText() {
    if (!txt.trim()) return;
    var s = { t:'text', c:color, sz:sz, text:txt,
      x1: imgW.current/2, y1: imgH.current/2 };
    setShapes(function(prev) { return prev.concat([s]); });
    setTxt('');
  }

  function undo()     { setShapes(function(p) { return p.slice(0,-1); }); }
  function clearAll() { setShapes([]); }

  // ── Export : image pleine résolution avec annotations intégrées ───────────
  function save() {
    var img = imgRef.current;
    if (!img) return;
    // Créer un canvas à la résolution NATIVE de l'image
    var exportCanvas = document.createElement('canvas');
    exportCanvas.width  = imgW.current;
    exportCanvas.height = imgH.current;
    var ctx = exportCanvas.getContext('2d');
    // Dessiner l'image en pleine résolution
    ctx.drawImage(img, 0, 0, imgW.current, imgH.current);
    // Dessiner les annotations en coordonnées réelles (scale=1)
    shapes.forEach(function(s) { drawShape(ctx, s, 1); });
    // Exporter en JPEG haute qualité
    onSave(exportCanvas.toDataURL('image/jpeg', 0.92));
  }

  // ── Zoom buttons ──────────────────────────────────────────────────────────
  var zoomPct = Math.round(zoom * 100);

  var TOOLS = [
    { id:'arrow',  lbl:'→' , title:'Flèche'  },
    { id:'rect',   lbl:'□' , title:'Rectangle'},
    { id:'circle', lbl:'○' , title:'Cercle'   },
    { id:'pen',    lbl:'✏' , title:'Stylo'    },
    { id:'text',   lbl:'T' , title:'Texte'    },
    { id:'pan',    lbl:'✋', title:'Déplacer' },
  ];
  var COLORS = ['#ef4444','#f97316','#facc15','#22c55e','#3b82f6','#c084fc','#ffffff','#000000'];
  var SIZES  = [1, 3, 5, 8];

  var S = {
    wrap:   { position:'fixed', inset:0, background:'rgba(0,0,0,.92)', zIndex:9999,
              display:'flex', flexDirection:'column', fontFamily:'inherit', userSelect:'none' },
    hdr:    { background:'#0b1b35', padding:'8px 10px', display:'flex', alignItems:'center',
              gap:6, borderBottom:'1px solid #1e3a5f', flexShrink:0, flexWrap:'wrap' },
    tbar:   { background:'#070f20', padding:'5px 8px', display:'flex', alignItems:'center',
              gap:4, flexWrap:'wrap', flexShrink:0, borderBottom:'1px solid #1e3a5f' },
    canvas: { flex:1, overflow:'hidden', position:'relative', background:'#040d1a',
              display:'flex', alignItems:'center', justifyContent:'center' },
    btn: function(active, bg) {
      return { padding:'6px 10px', borderRadius:7, border:'none',
        background: active ? '#3b82f6' : (bg||'#1e3a5f'),
        color: active ? '#fff' : '#94a3b8', cursor:'pointer',
        fontSize:12, fontWeight: active?700:400 };
    },
  };

  return e('div', { style:S.wrap },

    // ── Header ───────────────────────────────────────────────────────────────
    e('div', { style:S.hdr },
      e('span', { style:{flex:1,fontSize:13,fontWeight:700,color:'#e2e8f0'} }, '✏️ Annoter la photo'),
      e('button', { onClick:undo,    style:S.btn(false,'#1e3a5f'), title:'Annuler dernière' }, '↩'),
      e('button', { onClick:clearAll,style:S.btn(false,'#450a0a'), title:'Tout effacer'     }, '🗑'),
      // Zoom controls
      e('div', { style:{display:'flex',alignItems:'center',gap:4,margin:'0 4px'} },
        e('button', { onClick:function(){ setZoom(function(z){ return Math.max(0.2,z-0.2); }); }, style:S.btn(false) }, '−'),
        e('span',   { style:{fontSize:11,color:'#64748b',minWidth:38,textAlign:'center'} }, zoomPct+'%'),
        e('button', { onClick:function(){ setZoom(function(z){ return Math.min(5,z+0.2); }); }, style:S.btn(false) }, '+'),
        e('button', { onClick:fitToScreen, style:S.btn(false), title:'Ajuster' }, '⊡'),
      ),
      e('button', { onClick:onCancel, style:S.btn(false,'#334155') }, '✕ Annuler'),
      e('button', { onClick:save,     style:Object.assign({},S.btn(false,'#166534'),{color:'#4ade80',fontWeight:700}) }, '✅ Valider')
    ),

    // ── Barre outils ─────────────────────────────────────────────────────────
    e('div', { style:S.tbar },
      TOOLS.map(function(t) {
        return e('button', { key:t.id, onClick:function(){ setTool(t.id); },
          style:S.btn(tool===t.id), title:t.title }, t.lbl+' '+t.title);
      }),
      e('div', { style:{width:1,height:20,background:'#1e3a5f',margin:'0 4px'} }),
      SIZES.map(function(s) {
        return e('div', { key:s, onClick:function(){ setSz(s); },
          style:{ width:22,height:22,borderRadius:'50%',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            border: sz===s ? '2px solid #3b82f6' : '2px solid #1e3a5f' }
        }, e('div',{style:{width:s*2+2,height:s*2+2,borderRadius:'50%',background:'#e2e8f0'}}));
      }),
      e('div', { style:{width:1,height:20,background:'#1e3a5f',margin:'0 4px'} }),
      COLORS.map(function(c) {
        return e('div', { key:c, onClick:function(){ setColor(c); },
          style:{ width:22,height:22,borderRadius:'50%',background:c,cursor:'pointer',flexShrink:0,
            border: color===c ? '3px solid #fff' : '2px solid #ffffff30' }
        });
      })
    ),

    // ── Champ texte ──────────────────────────────────────────────────────────
    tool==='text' && e('div', { style:{background:'#0a1628',padding:'6px 8px',display:'flex',gap:6,flexShrink:0} },
      e('input', {
        value:txt, onChange:function(ev){ setTxt(ev.target.value); },
        onKeyDown:function(ev){ if(ev.key==='Enter') placeText(); },
        placeholder:'Texte à placer (Entrée = confirmer)…',
        style:{ flex:1,padding:'7px 10px',borderRadius:6,border:'1px solid #1e3a5f',
          background:'#0f2040',color:'#e2e8f0',fontSize:13,outline:'none' }
      }),
      e('button', { onClick:placeText, style:S.btn(true) }, '+ Ajouter')
    ),

    // ── Zone canvas avec zoom + pan ──────────────────────────────────────────
    e('div', {
      ref:      wrapRef,
      style:    S.canvas,
      onWheel:  onWheel,
    },
      e('div', {
        style:{
          transform: 'translate('+pan.x+'px,'+pan.y+'px)',
          transformOrigin: 'center center',
          transition: panning ? 'none' : 'none',
          cursor: tool==='pan' ? (panning?'grabbing':'grab') : 'crosshair',
          lineHeight: 0,
        }
      },
        e('canvas', {
          ref:          canvasRef,
          style:        { display:'block', borderRadius:6, maxWidth:'none',
                          touchAction: tool==='pan' ? 'none' : 'none' },
          onMouseDown:  onDown,
          onMouseMove:  onMove,
          onMouseUp:    onUp,
          onTouchStart: onDown,
          onTouchMove:  onMove,
          onTouchEnd:   onUp,
        })
      )
    ),

    // Indication zoom/pan
    e('div', { style:{background:'#040d1a',padding:'3px 10px',fontSize:10,color:'#334155',
      textAlign:'center',flexShrink:0} },
      '🖱 Molette = zoom  ·  ✋ = déplacer  ·  Les annotations seront intégrées à l\'image exportée'
    )
  );
}

window.PhotoAnnotator = PhotoAnnotator;

})();
