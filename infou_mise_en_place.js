"use strict";
// infou_mise_en_place.js v2 — Style identique à la section "Mise en oeuvre" PICO BTS
// Utilise Card, Field (depuis ui-shared-v3.js) + Toggle et Stepper locaux

// ── Composants visuels identiques au PICO ────────────────────────────────────
function MoeToggle(props) {
  var label=props.label, val=props.val, onToggle=props.onToggle,
      accent=props.accent||'#3b82f6', sub=props.sub;
  return React.createElement('div',{style:{marginBottom:8}},
    React.createElement('div',{
      onClick:onToggle,
      style:{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'12px 14px',background:'#0a1628',borderRadius:10,cursor:'pointer',
        border:'1px solid '+(val?accent+'60':'#1e3a5f')}
    },
      React.createElement('span',{style:{fontSize:14,color:val?'#e2e8f0':'#64748b',fontWeight:val?600:400}},label),
      React.createElement('div',{style:{width:44,height:24,borderRadius:12,
        background:val?accent:'#1e3a5f',position:'relative',flexShrink:0}},
        React.createElement('div',{style:{position:'absolute',top:3,left:val?23:3,
          width:18,height:18,borderRadius:'50%',background:'#fff'}})
      )
    ),
    val&&sub&&React.createElement('div',{style:{paddingLeft:8,marginTop:4}},sub)
  );
}

function MoeStepper(props) {
  var label=props.label, val=props.val, onChange=props.onChange,
      step=props.step||1, min=props.min||0, unit=props.unit||'';
  var num = parseFloat(val)||min;
  return React.createElement('div',{style:{marginBottom:12}},
    React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#64748b',
      marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}},label),
    React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,
      background:'#0a1628',borderRadius:10,padding:'8px 12px',border:'1px solid #1e3a5f'}},
      React.createElement('button',{
        onClick:function(){onChange(String(Math.max(min, Math.round((num-step)*10)/10)));},
        style:{width:36,height:36,borderRadius:8,border:'none',background:'#1e3a5f',
          color:'#93c5fd',cursor:'pointer',fontSize:20,fontWeight:700}
      },'−'),
      React.createElement('span',{style:{flex:1,textAlign:'center',fontSize:20,
        fontWeight:800,color:'#f1f5f9'}},num,unit&&React.createElement('span',{style:{fontSize:12,color:'#64748b',marginLeft:4}},unit)),
      React.createElement('button',{
        onClick:function(){onChange(String(Math.round((num+step)*10)/10));},
        style:{width:36,height:36,borderRadius:8,border:'none',background:'#1e3a5f',
          color:'#93c5fd',cursor:'pointer',fontSize:20,fontWeight:700}
      },'+')
    )
  );
}

function MoeSelectBtn(props) {
  var label=props.label, options=props.options, val=props.val, onChange=props.onChange;
  return React.createElement('div',{style:{marginBottom:12}},
    React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#64748b',
      marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'}},label),
    React.createElement('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
      options.map(function(opt){
        var isSelected = val===opt.v;
        return React.createElement('button',{key:opt.v, onClick:function(){onChange(opt.v);},
          style:{flex:'1 0 auto',padding:'10px 8px',borderRadius:8,border:'none',
            cursor:'pointer',fontWeight:700,fontSize:13,
            background:isSelected?(opt.color||'#3b82f6'):'#1e3a5f',
            color:isSelected?'#fff':'#64748b'}
        },opt.l);
      })
    )
  );
}

// ── Bloc étiquette + S/N + MAC ────────────────────────────────────────────────
function EtiquetteBlock(props) {
  var mise=props.mise, updMise=props.updMise, setAnnotTarget=props.setAnnotTarget;
  var photos = Array.isArray(mise.photoEtiquette)?mise.photoEtiquette:(mise.photoEtiquette?[mise.photoEtiquette]:[]);

  function extractFromPhoto(src) {
    if (window.AndroidBridge && typeof window.AndroidBridge.ocrText==='function') {
      try {
        var result = window.AndroidBridge.ocrText(src);
        if (result) {
          var snMatch = result.match(/(?:S\/?N|Serial(?:\s*No)?)[:\s#]*([A-Z0-9\-]{6,20})/i);
          var macMatch = result.match(/([0-9A-F]{2}[:\-]){5}[0-9A-F]{2}/i);
          if (snMatch) updMise({serialNumber:snMatch[1]});
          if (macMatch) updMise({macAddress:macMatch[0].toUpperCase()});
          if (!snMatch&&!macMatch) alert('S/N et MAC non détectés. Saisir manuellement.');
        }
        return;
      } catch(e) {}
    }
    alert('OCR non disponible. Saisissez manuellement le S/N et l\'adresse MAC.');
  }

  return React.createElement(Card,{title:'📋 Étiquette Cradlepoint'},
    React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}},
      photos.map(function(src,i){
        return React.createElement('div',{key:i,style:{position:'relative',flexShrink:0}},
          React.createElement('img',{src:src,style:{width:120,height:85,objectFit:'cover',
            borderRadius:8,border:'1px solid #1e3a5f',display:'block'}}),
          React.createElement('div',{style:{position:'absolute',inset:0,display:'flex',
            flexDirection:'column',justifyContent:'space-between',padding:3}},
            React.createElement('button',{
              onClick:(function(idx){return function(){
                var arr=photos.filter(function(_,j){return j!==idx;});
                updMise({photoEtiquette:arr});
              };})(i),
              style:{alignSelf:'flex-end',background:'#ef4444',border:'none',
                borderRadius:4,color:'#fff',padding:'2px 6px',cursor:'pointer',fontSize:10}
            },'×'),
            React.createElement('button',{
              onClick:(function(idx){return function(){setAnnotTarget({key:'photoEtiquette',idx:idx});};})(i),
              style:{background:'#7c3aed',border:'none',borderRadius:4,
                color:'#fff',padding:'3px 7px',cursor:'pointer',fontSize:9,fontWeight:700}
            },'✏️'),
            React.createElement('button',{
              onClick:(function(s){return function(){extractFromPhoto(s);};})(src),
              style:{background:'#0369a1',border:'none',borderRadius:4,
                color:'#fff',padding:'3px 7px',cursor:'pointer',fontSize:9,fontWeight:700}
            },'🔍 S/N')
          )
        );
      }),
      React.createElement('button',{
        onClick:function(){pickPhoto(function(src){updMise({photoEtiquette:photos.concat([src])});});},
        style:{width:120,height:85,borderRadius:8,border:'2px dashed #1e3a5f',
          background:'transparent',color:'#475569',cursor:'pointer',fontSize:11,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3}
      },React.createElement('span',{style:{fontSize:20}},'📸'),React.createElement('span',{style:{fontSize:9}},'Photo étiquette'))
    ),
    React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
      React.createElement(Field,{label:'Numéro de série (S/N)',value:mise.serialNumber||'',
        onChange:function(v){updMise({serialNumber:v});},placeholder:'ex: CP-W1855-XXXXXXXX'}),
      React.createElement(Field,{label:'Adresse MAC',value:mise.macAddress||'',
        onChange:function(v){updMise({macAddress:v.toUpperCase()});},placeholder:'ex: AA:BB:CC:DD:EE:FF'})
    )
  );
}

// ── Bloc photos multi ─────────────────────────────────────────────────────────
function PhotoBlock(props) {
  var title=props.title, keyName=props.keyName, mise=props.mise,
      updMise=props.updMise, setAnnotTarget=props.setAnnotTarget;
  var photos = Array.isArray(mise[keyName])?mise[keyName]:(mise[keyName]?[mise[keyName]]:[]);

  return React.createElement(Card,{title:title},
    React.createElement('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
      photos.map(function(src,i){
        return React.createElement('div',{key:i,style:{position:'relative',flexShrink:0}},
          React.createElement('img',{src:src,style:{width:100,height:75,objectFit:'cover',
            borderRadius:6,border:'1px solid #1e3a5f',display:'block'}}),
          React.createElement('div',{style:{position:'absolute',inset:0,display:'flex',
            flexDirection:'column',justifyContent:'space-between',padding:2}},
            React.createElement('button',{
              onClick:(function(idx){return function(){
                var arr=photos.filter(function(_,j){return j!==idx;});
                var p={}; p[keyName]=arr; updMise(p);
              };})(i),
              style:{alignSelf:'flex-end',background:'#ef4444',border:'none',
                borderRadius:4,color:'#fff',padding:'1px 5px',cursor:'pointer',fontSize:10}
            },'×'),
            React.createElement('button',{
              onClick:(function(idx){return function(){
                var t={}; t.key=keyName; t.idx=idx; setAnnotTarget(t);
              };})(i),
              style:{background:'#7c3aed',border:'none',borderRadius:4,
                color:'#fff',padding:'2px 5px',cursor:'pointer',fontSize:9,fontWeight:700}
            },'✏️')
          )
        );
      }),
      React.createElement('button',{
        onClick:function(){pickPhoto(function(src){
          var arr=photos.concat([src]); var p={}; p[keyName]=arr; updMise(p);
        });},
        style:{width:100,height:75,borderRadius:6,border:'2px dashed #1e3a5f',
          background:'transparent',color:'#475569',cursor:'pointer',fontSize:11,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3}
      },React.createElement('span',{style:{fontSize:18}},'📸'),React.createElement('span',{style:{fontSize:9}},'Ajouter'))
    )
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
function InfoUMiseEnPlaceSection(props) {
  var data=props.data, onChange=props.onChange;
  var _ann=React.useState(null); var annotTarget=_ann[0]; var setAnnotTarget=_ann[1];

  var solution = data.forceSolution || getAutoSolution(data.mesures||{});
  var travaux   = data.travaux||'sogetrel';
  var mise       = data.mise||{};

  function updMise(patch) {
    var newMise = Object.assign({},mise,patch);
    onChange(Object.assign({},data,{mise:newMise}));
  }

  // Annotateur overlay
  if (annotTarget && typeof window.PhotoAnnotator!=='undefined') {
    var photos = Array.isArray(mise[annotTarget.key])?mise[annotTarget.key]:(mise[annotTarget.key]?[mise[annotTarget.key]]:[]);
    var srcAnn = annotTarget.idx!==undefined ? photos[annotTarget.idx] : mise[annotTarget.key];
    return React.createElement(window.PhotoAnnotator,{
      src:srcAnn,
      onSave:function(s){
        var arr=photos.slice();
        if(annotTarget.idx!==undefined) arr[annotTarget.idx]=s;
        else arr=[s];
        var p={}; p[annotTarget.key]=arr; updMise(p);
        setAnnotTarget(null);
      },
      onCancel:function(){setAnnotTarget(null);}
    });
  }

  var SOL_COLORS = {
    '1850':    {border:'#22c55e',text:'#22c55e',label:'Cradlepoint W1850 — Intérieur'},
    '1855':    {border:'#3b82f6',text:'#60a5fa',label:'Cradlepoint W1855 — Extérieur'},
    'starlink':{border:'#a855f7',text:'#c084fc',label:'STARLINK Entreprise'},
  };
  var sc = SOL_COLORS[solution]||SOL_COLORS['starlink'];

  // Badge solution
  var badge = React.createElement('div',{style:{
    padding:'10px 14px',borderRadius:10,border:'2px solid '+sc.border,
    background:sc.border+'15',marginBottom:16,display:'flex',alignItems:'center',gap:10
  }},
    React.createElement('div',{style:{flex:1}},
      React.createElement('div',{style:{fontSize:10,color:sc.text,textTransform:'uppercase',letterSpacing:'0.08em'}},'Solution retenue'),
      React.createElement('div',{style:{fontSize:15,fontWeight:800,color:sc.text}},sc.label)
    ),
    React.createElement('div',{style:{fontSize:11,color:'#475569'}},
      travaux==='aerien'?'Magasin U':'100% Sogetrel')
  );

  // ─── W1850 ────────────────────────────────────────────────────────────────
  if (solution==='1850') return React.createElement('div',null, badge,

    React.createElement(Card,{title:'1. Local Technique'},
      React.createElement(Field,{label:'Description du local',value:mise.localDesc||'',
        onChange:function(v){updMise({localDesc:v});},multiline:true,
        placeholder:'Ex: Baie informatique RDC, 3U libres, 2 prises élec...'}),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field,{label:'U disponibles',value:mise.uDispo||'',
          onChange:function(v){updMise({uDispo:v});},placeholder:'ex: 3U'}),
        React.createElement(Field,{label:'Prises élec dispo',value:mise.prisesElec||'',
          onChange:function(v){updMise({prisesElec:v});},placeholder:'ex: 2'})
      ),
      React.createElement(Field,{label:'Lien Bytel (MSISDN)',value:mise.msisdn||'',
        onChange:function(v){updMise({msisdn:v});},placeholder:'0842XXXXXX — si lien Bytel présent'})
    ),

    React.createElement(PhotoBlock,{title:'📷 Photos local technique',keyName:'photoLocal',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    EtiquetteBlock({mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(PhotoBlock,{title:'📷 Photos cartes SIM',keyName:'photoSIM',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(PhotoBlock,{title:'📷 Photos W1850 installé',keyName:'photoW1850',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(Card,{title:'3. Mesures de débits après installation'},
      React.createElement('div',{style:{fontSize:12,color:'#64748b',marginBottom:10}},
        '📌 Réalisez 2 speedtests après installation du W1850.'),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}},
        React.createElement(Field,{label:'DL test 1 (Mbps)',value:mise.dl1||'',onChange:function(v){updMise({dl1:v});},placeholder:'ex: 45.2'}),
        React.createElement(Field,{label:'UL test 1 (Mbps)',value:mise.ul1||'',onChange:function(v){updMise({ul1:v});},placeholder:'ex: 12.8'}),
        React.createElement(Field,{label:'Ping test 1 (ms)',value:mise.ping1||'',onChange:function(v){updMise({ping1:v});},placeholder:'ex: 28'})
      ),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}},
        React.createElement(Field,{label:'DL test 2 (Mbps)',value:mise.dl2||'',onChange:function(v){updMise({dl2:v});},placeholder:'ex: 52.1'}),
        React.createElement(Field,{label:'UL test 2 (Mbps)',value:mise.ul2||'',onChange:function(v){updMise({ul2:v});},placeholder:'ex: 14.3'}),
        React.createElement(Field,{label:'Ping test 2 (ms)',value:mise.ping2||'',onChange:function(v){updMise({ping2:v});},placeholder:'ex: 31'})
      )
    ),
    React.createElement(PhotoBlock,{title:'📷 Captures speedtest',keyName:'photoDebit',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget})
  );

  // ─── W1855 ────────────────────────────────────────────────────────────────
  if (solution==='1855') return React.createElement('div',null, badge,

    React.createElement(Card,{title:'1. Local Technique'},
      React.createElement(Field,{label:'Description',value:mise.localDesc||'',
        onChange:function(v){updMise({localDesc:v});},multiline:true,
        placeholder:'Baie réseau, localisation routeur actuel...'}),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field,{label:'U disponibles',value:mise.uDispo||'',
          onChange:function(v){updMise({uDispo:v});},placeholder:'ex: 2U'}),
        React.createElement(Field,{label:'Prises élec dispo',value:mise.prisesElec||'',
          onChange:function(v){updMise({prisesElec:v});},placeholder:'ex: 1'})
      ),
      React.createElement(Field,{label:'Lien Bytel (MSISDN)',value:mise.msisdn||'',
        onChange:function(v){updMise({msisdn:v});},placeholder:'0842XXXXXX'})
    ),

    React.createElement(PhotoBlock,{title:'📷 Photos local technique',keyName:'photoLocal',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    EtiquetteBlock({mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(PhotoBlock,{title:'📷 Photos cartes SIM',keyName:'photoSIM',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(Card,{title:'2. Cheminement des câbles'},
      React.createElement('div',{style:{fontSize:12,color:'#64748b',marginBottom:8}},
        '📌 Tracez le cheminement du câble depuis le routeur jusqu\'à l\'emplacement W1855.'),
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field,{label:'Longueur câble RJ45 (m)',value:mise.cableM||'',
          onChange:function(v){updMise({cableM:v});},placeholder:'ex: 25'}),
        travaux==='sogetrel'
          ? React.createElement(Field,{label:'Longueur gaine fendue (m)',value:mise.gaineM||'',
              onChange:function(v){updMise({gaineM:v});},placeholder:'ex: 12'})
          : React.createElement(Field,{label:'Mât autostable (hauteur)',value:mise.matH||'',
              onChange:function(v){updMise({matH:v});},placeholder:'ex: 50cm ou 1m'})
      ),
      travaux==='sogetrel'&&React.createElement(
        MoeSelectBtn,{label:'Diamètre gaine',val:mise.gaineDiam,
          onChange:function(v){updMise({gaineDiam:v});},
          options:[{v:'25mm',l:'25mm (< 10m)'},{v:'40mm',l:'40mm (≥ 10m)'}]}
      )
    ),
    React.createElement(PhotoBlock,{title:'📷 Photos cheminement câble',keyName:'photoChemin',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(Card,{title:'3. Équipements & outils'},
      React.createElement(MoeToggle,{label:'Nacelle',val:!!mise.nacelle,
        onToggle:function(){updMise({nacelle:!mise.nacelle});},accent:'#f97316',
        sub:React.createElement(Field,{label:'',value:mise.nacelleH||'',
          onChange:function(v){updMise({nacelleH:v});},placeholder:'Hauteur requise (ex: 6m)'})}),
      React.createElement(MoeToggle,{label:'PIRL',val:!!mise.pirl,
        onToggle:function(){updMise({pirl:!mise.pirl});},accent:'#a855f7'}),
      React.createElement(MoeToggle,{label:'Escabeau',val:!!mise.escabeau,
        onToggle:function(){updMise({escabeau:!mise.escabeau});},accent:'#06b6d4',
        sub:React.createElement(Field,{label:'',value:mise.escabeauH||'',
          onChange:function(v){updMise({escabeauH:v});},placeholder:'Hauteur (ex: 3m)'})}),
      React.createElement(MoeToggle,{label:'Perforateur + mèches',val:!!mise.perfo,
        onToggle:function(){updMise({perfo:!mise.perfo});}})
    ),

    React.createElement(Card,{title:'4. Ressources humaines & durée'},
      React.createElement(MoeStepper,{label:'Nombre de techniciens',val:mise.nbTech,
        onChange:function(v){updMise({nbTech:v});},min:1,step:1}),
      React.createElement(MoeStepper,{label:'Jours de travail',val:mise.nbJours,
        onChange:function(v){updMise({nbJours:v});},min:0.5,step:0.5,unit:'j'}),
      React.createElement(Field,{label:'Hauteur de travail max',value:mise.hauteurMax||'',
        onChange:function(v){updMise({hauteurMax:v});},placeholder:'ex: 4m'}),
      React.createElement(MoeSelectBtn,{label:'Percement',val:mise.percement,
        onChange:function(v){updMise({percement:v});},
        options:[{v:'OUI',l:'OUI',color:'#ef4444'},{v:'NON',l:'NON',color:'#22c55e'}]}),
      mise.percement==='OUI'&&React.createElement(Field,{label:'Nombre de percements',
        value:mise.nbPercements||'',onChange:function(v){updMise({nbPercements:v});},placeholder:'ex: 2'}),
      React.createElement(Field,{label:"Conditions d'accès",value:mise.accesConditions||'',
        onChange:function(v){updMise({accesConditions:v});},multiline:true,
        placeholder:'ex: Accès toiture par skydome...'}),
      React.createElement(Field,{label:'Commentaire client (HO/HNO, fermeture...)',
        value:mise.commentaireClient||'',onChange:function(v){updMise({commentaireClient:v});},
        multiline:true,placeholder:'ex: Fermeture dimanche, intervention HNO requise...'})
    ),

    React.createElement(PhotoBlock,{title:'📷 Photos travaux / mise en place',
      keyName:'photoMiseEnOeuvre',mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget})
  );

  // ─── STARLINK ─────────────────────────────────────────────────────────────
  return React.createElement('div',null, badge,

    React.createElement(Card,{title:'1. Test obstruction — Application Starlink'},
      React.createElement('div',{style:{fontSize:12,color:'#64748b',marginBottom:8}},
        '📌 Utiliser l\'app Starlink (Play Store) pour tester l\'obstruction. Choisir le type "Enterprise".'),
      React.createElement(PhotoBlock,{title:'',keyName:'photoTestObstruction',
        mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget})
    ),

    React.createElement(Card,{title:'2. Prérequis'},
      [
        {k:'prereq_distance',   l:'Distance antenne → POE < 50m'},
        {k:'prereq_position',   l:'Positionnement antenne validé avec le client'},
        {k:'prereq_autorisations', l:'Autorisations administratives obtenues'},
      ].map(function(item){
        return React.createElement('div',{key:item.k,style:{marginBottom:8}},
          React.createElement(MoeSelectBtn,{label:item.l,val:mise[item.k],
            onChange:function(v){var p={}; p[item.k]=v; updMise(p);},
            options:[{v:'OK',l:'✅ OK',color:'#22c55e'},{v:'NOK',l:'❌ NOK',color:'#ef4444'},{v:'NA',l:'N/A',color:'#475569'}]})
        );
      }),
      React.createElement(Field,{label:'Précisions / constats',value:mise.prereqNotes||'',
        onChange:function(v){updMise({prereqNotes:v});},multiline:true,
        placeholder:'Détails sur les prérequis...'})
    ),

    React.createElement(Card,{title:'3. Checklist cheminement / travaux'},
      [
        'Mât : diamètre et longueur','Localisation mât / acrotère et mode de fixation',
        "Mode d'accès à la toiture",'Cheminement toiture/façade (gaine ICT 25mm min)',
        "Entrée bâtiment étanche (crosse)",'Percements nécessaires',
        'Cheminement câble intérieur','Descente murale',
        "Localisation boîtier POE (h=50cm min)",'Jonction baie info / switch',
        "Prise électrique 220V disponible"
      ].map(function(item,i){
        var k='check_'+i;
        return React.createElement('div',{key:i,style:{
          display:'flex',alignItems:'center',gap:8,
          padding:'8px 12px',marginBottom:4,
          background:'#0a1628',borderRadius:8,
          border:'1px solid '+(mise[k]&&mise[k]!=='NA'?(mise[k]==='OK'?'#22c55e40':'#ef444440'):'#1e3a5f')
        }},
          React.createElement('div',{style:{fontSize:12,color:'#94a3b8',flex:1}},item),
          ['OK','NOK','NA'].map(function(opt){
            var sel = mise[k]===opt;
            return React.createElement('button',{key:opt,
              onClick:function(){var p={}; p[k]=opt; updMise(p);},
              style:{padding:'3px 8px',borderRadius:5,border:'none',cursor:'pointer',
                fontSize:10,fontWeight:700,
                background:sel?(opt==='OK'?'#22c55e':opt==='NOK'?'#ef4444':'#475569'):'#1e3a5f',
                color:sel?'#fff':'#64748b'}
            },opt);
          })
        );
      })
    ),
    React.createElement(PhotoBlock,{title:'📷 Photos cheminement',keyName:'photoChemin',
      mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),

    React.createElement(Card,{title:'4. Mise en œuvre — Fournitures & travaux'},
      React.createElement('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}},
        React.createElement(Field,{label:'Longueur câble Starlink (m)',value:mise.cableStarM||'',
          onChange:function(v){updMise({cableStarM:v});},placeholder:'ex: 30'}),
        React.createElement(Field,{label:'Longueur gaine (m)',value:mise.gaineM||'',
          onChange:function(v){updMise({gaineM:v});},placeholder:'ex: 15'})
      ),
      React.createElement(MoeSelectBtn,{label:'Diamètre gaine',val:mise.gaineDiam,
        onChange:function(v){updMise({gaineDiam:v});},
        options:[{v:'25mm',l:'25mm (< 10m)'},{v:'40mm',l:'40mm (≥ 10m)'}]}),
      React.createElement(MoeSelectBtn,{label:'Type de fixation antenne',val:mise.fixationType,
        onChange:function(v){updMise({fixationType:v});},
        options:[{v:'mat_facade',l:'Mât façade'},{v:'fixation_murale',l:'Fixation murale'},{v:'toiture',l:'Support toiture'}]}),
      React.createElement(MoeSelectBtn,{label:'Responsabilité fixation',val:mise.fixationResp,
        onChange:function(v){updMise({fixationResp:v});},
        options:[{v:'sogetrel',l:'Sogetrel'},{v:'client',l:'Client (Magasin U)',color:'#f59e0b'}]}),
      React.createElement(MoeToggle,{label:'Nacelle',val:!!mise.nacelle,
        onToggle:function(){updMise({nacelle:!mise.nacelle});},accent:'#f97316'}),
      React.createElement(MoeToggle,{label:'PIRL',val:!!mise.pirl,
        onToggle:function(){updMise({pirl:!mise.pirl});},accent:'#a855f7'}),
      React.createElement(MoeStepper,{label:'Nombre de techniciens',val:mise.nbTech,
        onChange:function(v){updMise({nbTech:v});},min:1,step:1}),
      React.createElement(MoeStepper,{label:'Jours de travail',val:mise.nbJours,
        onChange:function(v){updMise({nbJours:v});},min:0.5,step:0.5,unit:'j'}),
      React.createElement(Field,{label:'Hauteur travail max',value:mise.hauteurMax||'',
        onChange:function(v){updMise({hauteurMax:v});},placeholder:'ex: 4m'}),
      React.createElement(MoeSelectBtn,{label:'Percement',val:mise.percement,
        onChange:function(v){updMise({percement:v});},
        options:[{v:'OUI',l:'OUI',color:'#ef4444'},{v:'NON',l:'NON',color:'#22c55e'}]}),
      mise.percement==='OUI'&&React.createElement(Field,{label:'Nombre de percements',
        value:mise.nbPercements||'',onChange:function(v){updMise({nbPercements:v});},placeholder:'ex: 1'}),
      React.createElement(Field,{label:"Conditions d'accès toiture",value:mise.accesConditions||'',
        onChange:function(v){updMise({accesConditions:v});},multiline:true,
        placeholder:'ex: Escalier de service, accès skydome...'}),
      React.createElement(Field,{label:'Options à privilégier',value:mise.options||'',
        onChange:function(v){updMise({options:v});},multiline:true,
        placeholder:'Passage câbles extérieur sous gaine, base solide pour antenne...'}),
      React.createElement(Field,{label:'Commentaire client (HO/HNO, fermeture...)',
        value:mise.commentaireClient||'',onChange:function(v){updMise({commentaireClient:v});},
        multiline:true,placeholder:'ex: Fermeture dimanche, intervention HNO...'})
    ),
    React.createElement(PhotoBlock,{title:'📷 Photos mise en oeuvre / travaux',
      keyName:'photoMiseEnOeuvre',mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget}),
    React.createElement(PhotoBlock,{title:'📷 Photo du SWITCH (sans modifier)',
      keyName:'photoSwitch',mise:mise,updMise:updMise,setAnnotTarget:setAnnotTarget})
  );
}

window.InfoUMiseEnPlaceSection = InfoUMiseEnPlaceSection;
