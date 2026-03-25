
// ── Compression image locale (fallback si word.js non chargé) ─────────────
if (typeof compressForWord === 'undefined') {
  window.compressForWord = async function(src, maxPx, quality) {
    if (!src) return null;
    maxPx = maxPx||800; quality = quality||0.55;
    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() {
        var w=img.width, h=img.height;
        if(w>maxPx){h=Math.round(maxPx/w*h);w=maxPx;}
        if(h>maxPx){w=Math.round(maxPx/h*w);h=maxPx;}
        var c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        var d=c.toDataURL('image/jpeg',quality);
        resolve({b64:d.split(',')[1],w:w,h:h});
      };
      img.onerror=function(){resolve(null);};
      img.src=src;
    });
  };
}

"use strict";
// infou_form.js — Formulaire de saisie pour les audits INFO U / Cradlepoint / Starlink
// Intégration dans l'app existante: nouvelles sections pour auditType = 'audit_cradlepoint'

// ─── Sections navigation pour INFO U ─────────────────────────────────────────
var INFOU_SECTIONS = [
  {id:'infou_garde',    label:'Page de garde', icon:'🏠'},
  {id:'infou_plans',    label:'Plans & PM',    icon:'🗺️'},
  {id:'infou_baie',     label:'Mesures Baie',  icon:'📡'},
  {id:'infou_ext',      label:'Mesures Ext.',  icon:'🌤️'},
  {id:'infou_travaux',  label:'Travaux',       icon:'🔧'},
  {id:'infou_mise',     label:'Mise en place', icon:'🏗️'},
  {id:'infou_generate', label:'Générer',       icon:'📄'},
];

// ─── Données par défaut INFO U ───────────────────────────────────────────────
function defaultInfoUData() {
  return {
    garde: {
      ot:'', cdp:'', raisonSociale:'', adresse:'', contact:'',
      telephone:'0 806 804 000', email:'',
      technicien:'', technicienPhone:'', fonction:'Technicien Réseaux & Télécoms.',
      direction:'Direction des Opérations Ile De France & Systèmes Numériques',
      date: (function(){ var d=new Date(); return d.getDate().toString().padStart(2,'0')+'/'+(d.getMonth()+1).toString().padStart(2,'0')+'/'+d.getFullYear(); })(),
      photoPrincipale: null,
    },
    plans: [{id:'p0',label:'Plan site',photo:null,markers:[]}],
    planMasse: null,
    mesures: {
      baie5g_bytel:  {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie4g_bytel:  {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie5g_orange: {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie4g_orange: {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie2_5g_bytel: {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie2_4g_bytel: {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie2_5g_orange:{enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      baie2_4g_orange:{enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      ext5g_bytel:   {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      ext4g_bytel:   {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      ext5g_orange:  {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
      ext4g_orange:  {enb:'',celid:'',band:'',rsrp:'',rsrq:'',snr:'',uplink:'',downlink:'',ping:''},
    },
    travaux: 'sogetrel',
    forceSolution: '',
    mise: {},
  };
}

// ─── Utilitaires UI ──────────────────────────────────────────────────────────
var INP_STYLE = {
  width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #1e3a5f',
  background:'#0a1628', color:'#e2e8f0', fontSize:14, boxSizing:'border-box',
  outline:'none', fontFamily:'inherit', marginBottom:6,
};
var LBL_STYLE = {
  fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
  letterSpacing:'0.06em', display:'block', marginBottom:4,
};
var CARD_STYLE = {
  background:'#0f2040', borderRadius:12, padding:16, marginBottom:12,
  border:'1px solid #1e3a5f',
};
var SECTION_HDR = {
  fontSize:12, fontWeight:800, color:'#93c5fd', textTransform:'uppercase',
  letterSpacing:'0.08em', marginBottom:10, paddingBottom:6,
  borderBottom:'1px solid #1e3a5f',
};

// Évalue la qualité RSRP et retourne une couleur
function rsrpColor(rsrp) {
  var v = parseInt(String(rsrp||'').replace(/[^-\d]/g,''));
  if (isNaN(v)) return '#475569';
  if (v >= -97)  return '#22c55e'; // Bonne
  if (v >= -107) return '#00B0F0'; // Moyenne
  if (v >= -117) return '#FFC000'; // Médiocre
  return '#ef4444';                // Mauvaise
}

function rsrpLabel(rsrp) {
  var v = parseInt(String(rsrp||'').replace(/[^-\d]/g,''));
  if (isNaN(v)) return '';
  if (v >= -97)  return 'Bonne ✓';
  if (v >= -107) return 'Moyenne';
  if (v >= -117) return 'Médiocre';
  return 'Mauvaise ✗';
}

// Décision auto basée sur les mesures
function getAutoSolution(mesures) {
  function isGood(rsrp) {
    var v = parseInt(String(rsrp||'').replace(/[^-\d]/g,''));
    return !isNaN(v) && v >= -105;
  }
  var m = mesures;
  var bytelBaie  = isGood((m.baie5g_bytel||{}).rsrp) || isGood((m.baie4g_bytel||{}).rsrp);
  var orangeBaie = isGood((m.baie5g_orange||{}).rsrp) || isGood((m.baie4g_orange||{}).rsrp);
  if (bytelBaie && orangeBaie) return '1850';
  var bytelExt   = isGood((m.ext5g_bytel||{}).rsrp)  || isGood((m.ext4g_bytel||{}).rsrp);
  var orangeExt  = isGood((m.ext5g_orange||{}).rsrp)  || isGood((m.ext4g_orange||{}).rsrp);
  if (bytelExt && orangeExt) return '1855';
  return 'starlink';
}

// ─── Composant: Row de mesure signal ─────────────────────────────────────────
function SignalRow(props) {
  var label = props.label, d = props.d, onChange = props.onChange, onFill = props.onFill;
  var FIELDS = ['enb','celid','band','rsrp','rsrq','snr','uplink','downlink','ping'];
  var LABELS  = ['EnB','CELID','BAND','RSRP','RSRQ','SNR>10','UPLINK','DL','PING'];
  var color = rsrpColor(d.rsrp);
  var qual  = rsrpLabel(d.rsrp);

  return React.createElement('div', {style:{marginBottom:8,border:'1px solid #1e3a5f',borderRadius:8,overflow:'hidden'}},
    // En-tête de ligne avec label + indicateur qualité + bouton Pre-remplir
    React.createElement('div', {style:{
      display:'flex', alignItems:'center', gap:8,
      padding:'6px 10px', background:'#0a1628',
      borderBottom:'1px solid #1e3a5f',
    }},
      React.createElement('div', {style:{
        width:8, height:8, borderRadius:'50%', background:color, flexShrink:0,
        boxShadow:'0 0 5px '+color,
      }}),
      React.createElement('span', {style:{fontSize:12,fontWeight:700,color:color,flex:1}}, label),
      qual && React.createElement('span', {style:{
        fontSize:10, color:color, fontWeight:700,
        background:color+'22', padding:'1px 6px', borderRadius:4,
      }}, qual),
      // Bouton Pre-remplir par ligne
      React.createElement('button', {
        onClick: onFill || function(){},
        style:{
          padding:'4px 10px', borderRadius:6, border:'none',
          background: onFill ? '#16a34a' : '#1e3a5f',
          color: onFill ? '#fff' : '#475569',
          cursor: onFill ? 'pointer' : 'not-allowed',
          fontSize:10, fontWeight:700, whiteSpace:'nowrap', flexShrink:0,
        }
      }, '🔄 Pre-remplir')
    ),
    // Champs en grille 3 colonnes
    React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:3,padding:6}},
      FIELDS.map(function(f,i){
        return React.createElement('div', {key:f},
          React.createElement('div', {style:{fontSize:8,color:'#475569',marginBottom:2,textTransform:'uppercase',letterSpacing:'0.05em'}}, LABELS[i]),
          React.createElement('input', {
            value: d[f]||'',
            onChange: function(e){ var v={}; v[f]=e.target.value; onChange(Object.assign({},d,v)); },
            placeholder: f==='rsrp'?'ex: -87': f==='band'?'ex: 20': f==='ping'?'ms':f==='snr'?'>10':'',
            style: Object.assign({},INP_STYLE,{
              marginBottom:0, padding:'5px 6px', fontSize:12,
              borderColor: (f==='rsrp'&&d.rsrp) ? color : '#1e3a5f',
            })
          })
        );
      })
    )
  );
}

// ─── Section Page de Garde ────────────────────────────────────────────────────
function InfoUGardeSection(props) {
  var data = props.data, onChange = props.onChange;
  var g = data.garde || {};
  function upd(k,v){ onChange(Object.assign({},data,{garde:(function(){var _p={};_p[k]=v;return Object.assign({},g,_p);})()})); }

  return React.createElement('div', null,
    React.createElement('div', {style:SECTION_HDR}, 'Page de garde — Informations client'),

    React.createElement('div', {style:CARD_STYLE},
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"N° OT"),
          React.createElement('input',{value:g.ot||'',onChange:function(e){upd('ot',e.target.value);},placeholder:"OT-2025-SCHIEVER-001",style:INP_STYLE})
        ),
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"CDP Bytel"),
          React.createElement('input',{value:g.cdp||'',onChange:function(e){upd('cdp',e.target.value);},placeholder:"Jean-Paul MARTIN",style:INP_STYLE})
        )
      ),
      React.createElement('label',{style:LBL_STYLE},"Raison sociale"),
      React.createElement('input',{value:g.raisonSociale||'',onChange:function(e){upd('raisonSociale',e.target.value);},placeholder:"SCHIEVER / U Express...",style:INP_STYLE}),
      React.createElement('label',{style:LBL_STYLE},"Adresse"),
      React.createElement('input',{value:g.adresse||'',onChange:function(e){upd('adresse',e.target.value);},placeholder:"2 Rue de la Liberté, 44980...",style:INP_STYLE}),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Nom du contact"),
          React.createElement('input',{value:g.contact||'',onChange:function(e){upd('contact',e.target.value);},placeholder:"Responsable Info",style:INP_STYLE})
        ),
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Téléphone client"),
          React.createElement('input',{value:g.telephone||'',onChange:function(e){upd('telephone',e.target.value);},placeholder:"0 806 804 000",style:INP_STYLE})
        )
      ),
      React.createElement('label',{style:LBL_STYLE},"Email"),
      React.createElement('input',{value:g.email||'',onChange:function(e){upd('email',e.target.value);},placeholder:"contact@client.fr",style:INP_STYLE})
    ),

    React.createElement('div', {style:SECTION_HDR}, 'Technicien'),
    React.createElement('div', {style:CARD_STYLE},
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Nom technicien"),
          React.createElement('input',{value:g.technicien||'',onChange:function(e){upd('technicien',e.target.value);},placeholder:"Emmanuel MAUDET",style:INP_STYLE})
        ),
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Téléphone technicien"),
          React.createElement('input',{value:g.technicienPhone||'',onChange:function(e){upd('technicienPhone',e.target.value);},placeholder:"06 12 34 56 78",style:INP_STYLE})
        )
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Date d'intervention"),
          React.createElement('input',{value:g.date||'',onChange:function(e){upd('date',e.target.value);},placeholder:"18/02/2025",style:INP_STYLE})
        ),
        React.createElement('div',null,
          React.createElement('label',{style:LBL_STYLE},"Fonction"),
          React.createElement('input',{value:g.fonction||'',onChange:function(e){upd('fonction',e.target.value);},placeholder:"Technicien Réseaux...",style:INP_STYLE})
        )
      )
    ),

    React.createElement('div', {style:SECTION_HDR}, 'Photo du site'),
    React.createElement('div', {style:CARD_STYLE},
      g.photoPrincipale
        ? React.createElement('div',{style:{position:'relative',textAlign:'center'}},
            React.createElement('img',{src:g.photoPrincipale,style:{maxWidth:'100%',maxHeight:200,borderRadius:8,objectFit:'cover'}}),
            React.createElement('button',{
              onClick:function(){upd('photoPrincipale',null);},
              style:{position:'absolute',top:4,right:4,background:'#ef4444',border:'none',borderRadius:6,color:'#fff',padding:'4px 8px',cursor:'pointer',fontSize:11}
            },'✕')
          )
        : React.createElement('button',{
            onClick:function(){pickPhoto(function(src){upd('photoPrincipale',src);});},
            style:{width:'100%',padding:'16px',borderRadius:8,border:'2px dashed #1e3a5f',background:'transparent',color:'#475569',cursor:'pointer',fontSize:13}
          },'📸 Ajouter photo du site')
    )
  );
}

// ─── Section Mesures Signal ────────────────────────────────────────────────────
function InfoUMesuresSection(props) {
  var data = props.data, onChange = props.onChange, type = props.type; // 'baie' ou 'ext'
  var m = data.mesures || {};

  function updMesure(key, val) {
    onChange(Object.assign({},data,{mesures:(function(){var _p={};_p[key]=val;return Object.assign({},m,_p);})()}));
  }

  // Pré-remplir depuis l'Android bridge
  function fillSignal(key, label) {
    extractSignalAsync(function(sig){
      if (!sig) return;
      var rsrp4g = sig.rsrp4g || sig.rsrp || '';
      var row = {
        enb:   sig.enb||sig['4g_enb']||'',
        celid: sig.lcid||'',
        band:  sig.band4g||sig.band||'',
        rsrp:  rsrp4g,
        rsrq:  sig.rsrq4g||sig.rsrq||'',
        snr:   sig.snr||'',
        uplink:   sig.ul||'',
        downlink: sig.dl||'',
        ping:     sig.ping||'',
      };
      updMesure(key, row);
    });
  }

  var isBaie = type === 'baie';
  var prefix = isBaie ? 'baie' : 'ext';

  return React.createElement('div', null,
    React.createElement('div', {style:SECTION_HDR},
      isBaie ? 'Mesures au niveau de la Baie info' : 'Mesures à l\'Extérieur'
    ),

    // Bytel
    React.createElement('div', {style:Object.assign({},CARD_STYLE,{borderColor:'#1e4080'})},
      React.createElement('div',{style:{fontSize:13,fontWeight:800,color:'#60a5fa',marginBottom:6}},
        '📶 BYTEL — Signal 5G'+(isBaie?' (Baie)':' (Ext)')
      ),
      React.createElement(SignalRow, {label:'BYTEL 5G', d:m[prefix+'5g_bytel']||{}, onChange:function(v){updMesure(prefix+'5g_bytel',v);}}),
      React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#60a5fa',marginTop:6,marginBottom:4}},'📶 BYTEL — Signal 4G'+(isBaie?' (Baie)':' (Ext)')),
      React.createElement(SignalRow, {label:'BYTEL 4G', d:m[prefix+'4g_bytel']||{}, onChange:function(v){updMesure(prefix+'4g_bytel',v);}})
    ),

    // Orange
    React.createElement('div', {style:Object.assign({},CARD_STYLE,{borderColor:'#7c3030'})},
      React.createElement('div',{style:{fontSize:13,fontWeight:800,color:'#fb923c',marginBottom:6}},
        '🟠 ORANGE — Signal 5G'+(isBaie?' (Baie)':' (Ext)')
      ),
      React.createElement(SignalRow, {label:'ORANGE 5G', d:m[prefix+'5g_orange']||{}, onChange:function(v){updMesure(prefix+'5g_orange',v);}}),
      React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#fb923c',marginTop:6,marginBottom:4}},'🟠 ORANGE — Signal 4G'+(isBaie?' (Baie)':' (Ext)')),
      React.createElement(SignalRow, {label:'ORANGE 4G', d:m[prefix+'4g_orange']||{}, onChange:function(v){updMesure(prefix+'4g_orange',v);}})
    ),

    // 2ème point intérieur (baie uniquement)
    isBaie && React.createElement('div', null,
      React.createElement('div',{style:Object.assign({},SECTION_HDR,{marginTop:12})},'Mesures au 2ème point intérieur (optionnel)'),
      React.createElement('div', {style:Object.assign({},CARD_STYLE,{borderColor:'#1e4040'})},
        React.createElement(SignalRow, {label:'BYTEL 5G (PM2)', d:m['baie2_5g_bytel']||{}, onChange:function(v){updMesure('baie2_5g_bytel',v);}, onFill:function(){fillSignal('baie2_5g_bytel','baie2_5g_bytel');}}),
        React.createElement(SignalRow, {label:'BYTEL 4G (PM2)', d:m['baie2_4g_bytel']||{}, onChange:function(v){updMesure('baie2_4g_bytel',v);}, onFill:function(){fillSignal('baie2_4g_bytel','baie2_4g_bytel');}})
      ),
      React.createElement('div', {style:Object.assign({},CARD_STYLE,{borderColor:'#402020'})},
        React.createElement(SignalRow, {label:'ORANGE 5G (PM2)', d:m['baie2_5g_orange']||{}, onChange:function(v){updMesure('baie2_5g_orange',v);}, onFill:function(){fillSignal('baie2_5g_orange','baie2_5g_orange');}}),
        React.createElement(SignalRow, {label:'ORANGE 4G (PM2)', d:m['baie2_4g_orange']||{}, onChange:function(v){updMesure('baie2_4g_orange',v);}, onFill:function(){fillSignal('baie2_4g_orange','baie2_4g_orange');}})
      )
    )
  );
}

// ─── Section Travaux ──────────────────────────────────────────────────────────
function InfoUTravauxSection(props) {
  var data = props.data, onChange = props.onChange;

  return React.createElement('div', null,
    React.createElement('div', {style:SECTION_HDR}, 'Responsabilité des travaux'),
    React.createElement('div', {style:CARD_STYLE},
      React.createElement('div',{style:{fontSize:13,color:'#94a3b8',marginBottom:12}},
        'Choisissez qui réalise les travaux de déploiement (câblage, gaine, fixation) :'
      ),
      ['sogetrel','aerien'].map(function(val){
        var selected = (data.travaux||'sogetrel') === val;
        return React.createElement('div',{
          key:val, onClick:function(){onChange(Object.assign({},data,{travaux:val}));},
          style:{
            padding:'14px 16px', borderRadius:10, marginBottom:8, cursor:'pointer',
            border:'2px solid '+(selected?'#3b82f6':'#1e3a5f'),
            background:selected?'#1e3a5f40':'transparent',
          }
        },
          React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10}},
            React.createElement('div',{style:{
              width:18,height:18,borderRadius:'50%',border:'2px solid '+(selected?'#3b82f6':'#475569'),
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            }}, selected&&React.createElement('div',{style:{width:10,height:10,borderRadius:'50%',background:'#3b82f6'}})),
            React.createElement('div',null,
              React.createElement('div',{style:{fontSize:14,fontWeight:700,color:selected?'#93c5fd':'#e2e8f0'}},
                val==='sogetrel'?'100% Sogetrel':'Magasin U (Aérien)'
              ),
              React.createElement('div',{style:{fontSize:11,color:'#475569',marginTop:2}},
                val==='sogetrel'
                  ? 'Gaine fendue 25mm/40mm + mousse polyuréthane + perçage'
                  : 'Mât autostable + gaine par le client, câblage par Sogetrel'
              )
            )
          )
        );
      })
    ),

    React.createElement('div', {style:SECTION_HDR}, 'Forcer la solution (optionnel)'),
    React.createElement('div', {style:CARD_STYLE},
      React.createElement('div',{style:{fontSize:12,color:'#475569',marginBottom:8}},
        'Par défaut la solution est déterminée automatiquement selon les mesures. Vous pouvez la forcer ici.'
      ),
      React.createElement('select',{
        value:data.forceSolution||'',
        onChange:function(e){onChange(Object.assign({},data,{forceSolution:e.target.value}));},
        style:Object.assign({},INP_STYLE,{cursor:'pointer'})
      },
        React.createElement('option',{value:''},'🔀 Automatique (selon mesures)'),
        React.createElement('option',{value:'1850'},'Cradlepoint W1850 (Intérieur)'),
        React.createElement('option',{value:'1855'},'Cradlepoint W1855 (Extérieur)'),
        React.createElement('option',{value:'starlink'},'STARLINK Entreprise')
      )
    )
  );
}

// ─── Section Génération ────────────────────────────────────────────────────────
function InfoUGenerateSection(props) {
  var data = props.data;
  var _sg = React.useState(false); var generating=_sg[0]; var setGenerating=_sg[1];
  var _sm = React.useState('');    var msg=_sm[0];          var setMsg=_sm[1];

  var autoSolution = getAutoSolution(data.mesures||{});
  var finalSolution = data.forceSolution || autoSolution;

  var COLORS = {
    '1850':    {bg:'#052e16',border:'#22c55e',text:'#22c55e',label:'Cradlepoint W1850 (Intérieur)'},
    '1855':    {bg:'#172554',border:'#3b82f6',text:'#60a5fa',label:'Cradlepoint W1855 (Extérieur)'},
    'starlink':{bg:'#2d1657',border:'#a855f7',text:'#c084fc',label:'STARLINK Entreprise'},
  };
  var c = COLORS[finalSolution] || COLORS['starlink'];

  function handleGenerate() {
    if (generating) return;
    // Vérifications prérequis
    if (!window.JSZip) { setMsg('❌ JSZip non chargé — rechargez la page'); return; }
    if (typeof window.generateLogicReport === 'undefined') { setMsg('❌ generateLogicReport non disponible'); return; }
    setGenerating(true);
    setMsg('⏳ Génération en cours...');
    setTimeout(function(){
      try {
        var payload = Object.assign({}, data);
        // Inject profile phone if available
        if (window._currentProfile && window._currentProfile.phone) {
          payload.garde = Object.assign({}, payload.garde, {technicienPhone: window._currentProfile.phone});
        }
        window.generateLogicReport(payload).then(function(result){
          setMsg('✅ Rapport '+result.solution.toUpperCase()+' généré et téléchargé !');
          setGenerating(false);
        }).catch(function(e){
          setMsg('❌ Erreur: '+e.message);
          setGenerating(false);
        });
      } catch(e){
        setMsg('❌ '+e.message);
        setGenerating(false);
      }
    }, 100);
  }

  // Check completeness
  var m = data.mesures || {};
  var hasBaie = (m.baie5g_bytel||{}).rsrp || (m.baie4g_bytel||{}).rsrp;
  var hasOrange = (m.baie5g_orange||{}).rsrp || (m.baie4g_orange||{}).rsrp;
  var hasGarde = (data.garde||{}).ot && (data.garde||{}).raisonSociale;

  return React.createElement('div', null,

    // Résumé arbre de décision
    React.createElement('div', {style:SECTION_HDR}, 'Arbre de décision — Solution retenue'),
    React.createElement('div', {style:CARD_STYLE},
      // Phase A
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'8px 12px',borderRadius:8,background:'#0a1628'}},
        React.createElement('div',{style:{fontSize:16}},'🏢'),
        React.createElement('div',{style:{flex:1}},
          React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#94a3b8'}},'PHASE A — Signal intérieur (Baie)'),
          React.createElement('div',{style:{fontSize:11,color:(m.baie5g_bytel||{}).rsrp?rsrpColor((m.baie5g_bytel||{}).rsrp):'#475569'}},
            'Bytel: '+((m.baie5g_bytel||{}).rsrp||'—')+' / '+((m.baie4g_bytel||{}).rsrp||'—'),
            ' | Orange: '+((m.baie5g_orange||{}).rsrp||'—')+' / '+((m.baie4g_orange||{}).rsrp||'—')
          )
        ),
        finalSolution==='1850' && React.createElement('span',{style:{color:'#22c55e',fontWeight:800,fontSize:14}},'✔ 1850')
      ),
      // Phase B
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'8px 12px',borderRadius:8,background:'#0a1628'}},
        React.createElement('div',{style:{fontSize:16}},'🌤️'),
        React.createElement('div',{style:{flex:1}},
          React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#94a3b8'}},'PHASE B — Signal extérieur'),
          React.createElement('div',{style:{fontSize:11,color:(m.ext5g_bytel||{}).rsrp?rsrpColor((m.ext5g_bytel||{}).rsrp):'#475569'}},
            'Bytel: '+((m.ext5g_bytel||{}).rsrp||'—')+' / '+((m.ext4g_bytel||{}).rsrp||'—'),
            ' | Orange: '+((m.ext5g_orange||{}).rsrp||'—')+' / '+((m.ext4g_orange||{}).rsrp||'—')
          )
        ),
        finalSolution==='1855' && React.createElement('span',{style:{color:'#60a5fa',fontWeight:800,fontSize:14}},'✔ 1855')
      ),
      // Phase C
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:8,background:'#0a1628'}},
        React.createElement('div',{style:{fontSize:16}},'🛰️'),
        React.createElement('div',{style:{flex:1}},
          React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#94a3b8'}},'PHASE C — Solution de secours'),
          React.createElement('div',{style:{fontSize:11,color:'#6366f1'}},'Couverture insuffisante → STARLINK Entreprise')
        ),
        finalSolution==='starlink' && React.createElement('span',{style:{color:'#a855f7',fontWeight:800,fontSize:14}},'✔ STK')
      )
    ),

    // Solution retenue
    React.createElement('div', {style:{
      padding:'16px',borderRadius:12,border:'2px solid '+c.border,
      background:c.bg,marginBottom:16,textAlign:'center',
    }},
      React.createElement('div',{style:{fontSize:11,color:c.text,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}},'Solution retenue'),
      React.createElement('div',{style:{fontSize:18,fontWeight:800,color:c.text}},
        finalSolution==='1850'?'📦 ':finalSolution==='1855'?'📡 ':'🛰️ ',
        c.label
      ),
      data.forceSolution&&React.createElement('div',{style:{fontSize:10,color:'#f59e0b',marginTop:4}},'⚠️ Solution forcée manuellement'),
      React.createElement('div',{style:{fontSize:11,color:'#475569',marginTop:4}},
        'Travaux: '+(data.travaux==='aerien'?'Magasin U (Aérien)':'100% Sogetrel')
      )
    ),

    // Vérifications
    React.createElement('div',{style:CARD_STYLE},
      React.createElement('div',{style:{fontSize:12,fontWeight:700,color:'#64748b',marginBottom:8}},'Checklist avant génération'),
      [
        {ok:hasGarde, label:'N° OT + Raison sociale'},
        {ok:(data.garde||{}).technicien, label:'Nom du technicien'},
        {ok:hasBaie,   label:'Mesures Bytel (baie) renseignées'},
        {ok:hasOrange, label:'Mesures Orange (baie) renseignées'},
        {ok:(data.garde||{}).photoPrincipale, label:'Photo du site'},
      ].map(function(item,i){
        return React.createElement('div',{key:i,style:{display:'flex',gap:8,alignItems:'center',marginBottom:4}},
          React.createElement('span',{style:{color:item.ok?'#22c55e':'#ef4444',fontSize:14}},item.ok?'✅':'○'),
          React.createElement('span',{style:{fontSize:12,color:item.ok?'#e2e8f0':'#64748b'}},item.label)
        );
      })
    ),

    // Bouton génération
    React.createElement('button',{
      onClick:handleGenerate,
      disabled:generating||!hasGarde,
      style:{
        width:'100%',padding:'16px',borderRadius:12,border:'none',
        background:generating?'#1e3a5f':hasGarde?c.border:'#1e3a5f',
        color:'#fff',fontWeight:800,fontSize:16,cursor:generating||!hasGarde?'not-allowed':'pointer',
        marginBottom:8, opacity:!hasGarde?0.5:1,
      }
    },generating?'⏳ Génération en cours...':'📝 Générer le Rapport Word'),

    React.createElement('button',{
      onClick:function(){
        if (!hasGarde) return;
        var email = window.prompt('Adresse email du destinataire :');
        if (!email||!email.includes('@')) return;
        setGenerating(true); setMsg('⏳ Génération + envoi...');
        setTimeout(function(){
          try {
            var payload = Object.assign({},data);
            if(window._currentProfile&&window._currentProfile.phone)
              payload.garde=Object.assign({},payload.garde,{technicienPhone:window._currentProfile.phone});
            window.generateLogicReport(payload, true).then(function(result){
              if (!result||!result.blob) throw new Error('Pas de blob Word');
              return envoyerRapportEmail(
                (payload.garde&&payload.garde.ot)||'rapport',
                result.blob, email,
                'Audit INFO U — '+(result.solution||'').toUpperCase()
              );
            }).then(function(){
              setMsg('✅ Rapport généré et envoyé à '+email+' !');
              setGenerating(false);
            }).catch(function(e){
              setMsg('❌ Erreur: '+e.message);
              setGenerating(false);
            });
          } catch(e){ setMsg('❌ '+e.message); setGenerating(false); }
        },100);
      },
      disabled:!hasGarde,
      style:{
        width:'100%',padding:'14px',borderRadius:12,border:'none',
        background:hasGarde?'#0369a1':'#1e3a5f',
        color:'#fff',fontWeight:700,fontSize:14,
        cursor:hasGarde?'pointer':'not-allowed',
        marginBottom:8, opacity:!hasGarde?0.5:1,
      }
    },'📧 Générer + Envoyer par Mail'),

    msg&&React.createElement('div',{style:{
      padding:'12px',borderRadius:8,marginTop:8,fontSize:13,textAlign:'center',
      background:msg.startsWith('✅')?'#052e16':msg.startsWith('❌')?'#450a0a':'#172554',
      color:msg.startsWith('✅')?'#22c55e':msg.startsWith('❌')?'#ef4444':'#93c5fd',
    }},msg)
  );
}

// ─── Section Plans & PM ────────────────────────────────────────────────────────
function InfoUPlansSection(props) {
  var data = props.data, onChange = props.onChange;
  var _sm = React.useState('view');
  var mode = _sm[0]; var setMode = _sm[1];
  var _ann = React.useState(false);
  var annotating = _ann[0]; var setAnnotating = _ann[1];
  var imgRef = React.useRef(null);
  var canvRef = React.useRef(null);

  var plans = data.plans && data.plans.length ? data.plans
              : [{id:'p0',label:'Plan site',photo:null,markers:[]}];
  var plan0   = plans[0];
  var markers = plan0.markers || [];

  var MARKER_TYPES = [
    {id:'pm_baie',  label:'PM01 Baie',    color:'#3b82f6', icon:'B'},
    {id:'pm2',      label:'PM02 2ème pt', color:'#8b5cf6', icon:'2'},
    {id:'pmext',    label:'PMext Ext.',   color:'#22c55e', icon:'E'},
    {id:'cradle',   label:'Cradlepoint',  color:'#f59e0b', icon:'C'},
    {id:'starlink', label:'Starlink',     color:'#a855f7', icon:'★'},
    {id:'path',     label:'Chemin câble', color:'#06b6d4', icon:'→'},
  ];

  function getMeta(type) {
    return MARKER_TYPES.find(function(t){return t.id===type;})
           || {color:'#64748b',label:type,icon:'?'};
  }

  function updPlans(newPlan) {
    onChange(Object.assign({},data,{plans:plans.map(function(p,i){return i===0?newPlan:p;})}));
  }

  function handleTap(e) {
    if (mode==='view') return;
    e.preventDefault();
    var imgEl = imgRef.current;
    if (!imgEl) return;
    var rect = imgEl.getBoundingClientRect();
    var t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    var x = Math.max(0,Math.min(1,(t.clientX-rect.left)/rect.width));
    var y = Math.max(0,Math.min(1,(t.clientY-rect.top)/rect.height));
    var cnt = markers.filter(function(m){return m.type===mode;}).length;
    var lbl = getMeta(mode).label + (cnt>0?' '+(cnt+1):'');
    var nm  = {id:'m_'+Date.now(),type:mode,label:lbl,x:x,y:y};
    updPlans(Object.assign({},plan0,{markers:markers.concat([nm])}));
    setMode('view');
  }

  function removeMarker(id) {
    updPlans(Object.assign({},plan0,{markers:markers.filter(function(m){return m.id!==id;})}));
  }

  var planPhoto = plan0.photo;

  // Si annotateur ouvert
  if (annotating && planPhoto) {
    if (typeof window.PhotoAnnotator === 'undefined') {
      return React.createElement('div',{style:{color:'#ef4444',padding:20}},
        'PhotoAnnotator non chargé. Assurez-vous que photo_annotator.js est inclus dans index.html.'
      );
    }
    return React.createElement(window.PhotoAnnotator, {
      src: planPhoto,
      onSave: function(annotatedSrc) {
        updPlans(Object.assign({},plan0,{photo:annotatedSrc}));
        setAnnotating(false);
      },
      onCancel: function() { setAnnotating(false); },
    });
  }

  return React.createElement('div', null,

    // ── Plan de masse ────────────────────────────────────────────────────────
    React.createElement('div',{style:SECTION_HDR},'Plan de masse'),
    React.createElement('div',{style:CARD_STYLE},
      data.planMasse
        ? React.createElement('div',{style:{position:'relative',textAlign:'center'}},
            React.createElement('img',{src:data.planMasse,
              style:{maxWidth:'100%',maxHeight:160,borderRadius:8,objectFit:'contain'}}),
            React.createElement('button',{
              onClick:function(){onChange(Object.assign({},data,{planMasse:null}));},
              style:{position:'absolute',top:4,right:4,background:'#ef4444',border:'none',
                borderRadius:6,color:'#fff',padding:'4px 8px',cursor:'pointer',fontSize:11}
            },'✕')
          )
        : React.createElement('button',{
            onClick:function(){pickPhoto(function(s){onChange(Object.assign({},data,{planMasse:s}));});},
            style:{width:'100%',padding:'14px',borderRadius:8,border:'2px dashed #1e3a5f',
              background:'transparent',color:'#475569',cursor:'pointer',fontSize:13}
          },'🗺️ Ajouter plan de masse')
    ),

    // ── Plan site interactif ─────────────────────────────────────────────────
    React.createElement('div',{style:SECTION_HDR},'Plan du site — Points de mesure & cheminement'),
    React.createElement('div',{style:CARD_STYLE},

      !planPhoto
        // Pas encore de photo
        ? React.createElement('button',{
            onClick:function(){pickPhoto(function(s){updPlans(Object.assign({},plan0,{photo:s}));});},
            style:{width:'100%',padding:'20px',borderRadius:8,border:'2px dashed #1e3a5f',
              background:'transparent',color:'#475569',cursor:'pointer',fontSize:13}
          },'📐 Importer le plan du site')

        // Photo chargée
        : React.createElement('div',null,

            // Toolbar : modes marqueurs + boutons actions
            React.createElement('div',{style:{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}},
              MARKER_TYPES.map(function(mt){
                var active = mode===mt.id;
                return React.createElement('button',{key:mt.id,
                  onClick:function(){
                    window._lastModeTs=Date.now();
                    setMode(active?'view':mt.id);
                  },
                  style:{padding:'5px 8px',borderRadius:7,border:'none',
                    background:active?mt.color:mt.color+'28',color:active?'#fff':mt.color,
                    cursor:'pointer',fontSize:11,fontWeight:700,
                    boxShadow:active?'0 0 0 2px '+mt.color:'none'}
                },mt.icon+' '+mt.label);
              }),
              // Bouton annoter
              React.createElement('button',{
                onClick:function(){setAnnotating(true);},
                style:{padding:'5px 10px',borderRadius:7,border:'none',
                  background:'#7c3aed28',color:'#a78bfa',cursor:'pointer',fontSize:11,fontWeight:700}
              },'✏️ Annoter'),
              React.createElement('button',{
                onClick:function(){updPlans(Object.assign({},plan0,{photo:null,markers:[]}));},
                style:{padding:'5px 8px',borderRadius:7,border:'none',
                  background:'#450a0a',color:'#ef4444',cursor:'pointer',fontSize:11}
              },'🗑️')
            ),

            // Instruction mode actif
            mode!=='view' && React.createElement('div',{style:{
              fontSize:12,fontWeight:700,color:getMeta(mode).color,
              background:getMeta(mode).color+'18',padding:'6px 10px',
              borderRadius:6,marginBottom:6,textAlign:'center'
            }},
              '👆 Tapez sur le plan pour placer "'+getMeta(mode).label+'"'
            ),

            // Plan + overlay marqueurs
            React.createElement('div',{
              style:{position:'relative',display:'inline-block',width:'100%',
                cursor:mode==='view'?'default':'crosshair',
                userSelect:'none',borderRadius:8,overflow:'hidden'},
              onTouchEnd:function(e){
                if(window._lastModeTs&&Date.now()-window._lastModeTs<400)return;
                handleTap(e);
              },
              onClick:function(e){
                if(window._lastModeTs&&Date.now()-window._lastModeTs<400)return;
                handleTap(e);
              },
            },
              React.createElement('img',{ref:imgRef,src:planPhoto,
                style:{width:'100%',display:'block',borderRadius:8},draggable:false}),
              markers.map(function(m){
                var meta=getMeta(m.type);
                return React.createElement('div',{key:m.id,
                  style:{position:'absolute',left:(m.x*100)+'%',top:(m.y*100)+'%',
                    transform:'translate(-50%,-50%)',zIndex:10},
                  onClick:function(e){e.stopPropagation();}
                },
                  React.createElement('div',{style:{
                    width:26,height:26,borderRadius:'50%',
                    background:meta.color,border:'2px solid #fff',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:10,fontWeight:900,color:'#fff',
                    boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
                  }},meta.icon),
                  React.createElement('div',{style:{
                    position:'absolute',top:'100%',left:'50%',marginTop:2,
                    transform:'translateX(-50%)',
                    background:meta.color+'ee',color:'#fff',
                    fontSize:9,fontWeight:700,padding:'1px 4px',
                    borderRadius:4,whiteSpace:'nowrap',
                  }},m.label),
                  React.createElement('div',{
                    onClick:function(e){e.stopPropagation();removeMarker(m.id);},
                    style:{
                      position:'absolute',top:-5,right:-5,width:13,height:13,
                      borderRadius:'50%',background:'#ef4444',color:'#fff',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:8,cursor:'pointer',fontWeight:900,border:'1px solid #fff',
                    }
                  },'×')
                );
              })
            ),

            // Légende
            markers.length>0&&React.createElement('div',{
              style:{marginTop:6,display:'flex',flexWrap:'wrap',gap:3}
            },
              markers.map(function(m){
                var meta=getMeta(m.type);
                return React.createElement('span',{key:m.id,style:{
                  fontSize:9,padding:'2px 5px',borderRadius:4,
                  background:meta.color+'25',color:meta.color,
                  border:'1px solid '+meta.color+'40',fontWeight:600,
                }},meta.icon+' '+m.label);
              })
            )
          )
    ),

    React.createElement('div',{style:{fontSize:11,color:'#475569',marginTop:4}},
      'PM01=Baie, PM02=2ème point, PMext=Extérieur, C=Cradlepoint, ★=Starlink, →=Câble | ✏️ Annoter pour flèches/formes/texte'
    )
  );
}



// ─── Rendereur principal INFO U ────────────────────────────────────────────────
function renderInfoUSection(activeSection, data, setData) {
  function onChange(newData) { setData(newData); }

  switch(activeSection) {
    case 'infou_garde':
      return React.createElement(InfoUGardeSection, {data:data, onChange:onChange});
    case 'infou_plans':
      return React.createElement(InfoUPlansSection, {data:data, onChange:onChange});
    case 'infou_baie':
      return React.createElement(InfoUMesuresSection, {data:data, onChange:onChange, type:'baie'});
    case 'infou_ext':
      return React.createElement(InfoUMesuresSection, {data:data, onChange:onChange, type:'ext'});
    case 'infou_travaux':
      return React.createElement(InfoUTravauxSection, {data:data, onChange:onChange});
    case 'infou_mise':
      if (typeof InfoUMiseEnPlaceSection !== 'undefined')
        return React.createElement(InfoUMiseEnPlaceSection, {data:data, onChange:onChange});
      return React.createElement('div',{style:{padding:20,color:'#ef4444'}},'infou_mise_en_place.js non chargé');
    case 'infou_generate':
      return React.createElement(InfoUGenerateSection, {data:data, onChange:onChange});
    default:
      return React.createElement(InfoUGardeSection, {data:data, onChange:onChange});
  }
}

// Exposer globalement
window.INFOU_SECTIONS       = INFOU_SECTIONS;
window.defaultInfoUData     = defaultInfoUData;
window.renderInfoUSection   = renderInfoUSection;
window.getAutoSolution      = getAutoSolution;
