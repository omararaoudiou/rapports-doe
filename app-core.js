// ── Shim de sécurité : fonctions de lib-custom.js ──────────────────────────
// Au cas où lib-custom.js n'est pas encore chargé (cache service worker)
if (typeof getProfiles === 'undefined') {
  function getProfiles() {
    try { return JSON.parse(localStorage.getItem('__profiles__')||'[]'); } catch(e) { return []; }
  }
}
if (typeof hashPwd === 'undefined') {
  function hashPwd(pwd) {
    var h=5381; for(var i=0;i<pwd.length;i++) h=((h<<5)+h)^pwd.charCodeAt(i); return (h>>>0).toString(36);
  }
}
if (typeof saveProfiles === 'undefined') {
  function saveProfiles(list) { localStorage.setItem('__profiles__', JSON.stringify(list)); }
}
if (typeof checkPwd === 'undefined') {
  function checkPwd(prof, pwd) { return prof.pwdHash && prof.pwdHash === hashPwd(pwd); }
}
if (typeof formatDeviceLabel === 'undefined') {
  function formatDeviceLabel(id) { return id ? id.slice(0,8).toUpperCase() : null; }
}
if (typeof getDeviceId === 'undefined') {
  function getDeviceId() {
    var key='__device_id__', id=localStorage.getItem(key);
    if(!id){ var a=new Uint8Array(16); crypto.getRandomValues(a); id=Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join(''); localStorage.setItem(key,id); }
    return id;
  }
  // Returns 'mobile' or 'desktop'
  function getDeviceType() {
    var ua = navigator.userAgent||'';
    var isMob = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || window.innerWidth < 768;
    return isMob ? 'mobile' : 'desktop';
  }
}
// getDeviceType: toujours disponible (pas dans un shim conditionnel)
if (typeof getDeviceType === 'undefined') {
  window.getDeviceType = function() {
    var ua = navigator.userAgent||'';
    var isMob = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || window.innerWidth < 768;
    return isMob ? 'mobile' : 'desktop';
  };
}
function getDeviceType() {
  var ua = navigator.userAgent||'';
  var isMob = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || window.innerWidth < 768;
  return isMob ? 'mobile' : 'desktop';
}

if (typeof checkRecoveryCode === 'undefined') {
  function checkRecoveryCode(code) {
    var h=0,t='1234'; for(var i=0;i<t.length;i++){h=((h<<5)-h)+t.charCodeAt(i);h=h&h;}
    var h2=0,c=code.trim().toUpperCase(); for(var i=0;i<c.length;i++){h2=((h2<<5)-h2)+c.charCodeAt(i);h2=h2&h2;}
    return h===h2;
  }
}
// ────────────────────────────────────────────────────────────────────────────
// Shims pour les nouveaux types (définis dans ui-shared.js ou antenne.js)
if (typeof defaultCelfiData    === 'undefined') window.defaultCelfiData    = function(){ return defaultData(); };
if (typeof defaultWifiData     === 'undefined') window.defaultWifiData     = function(){ return defaultData(); };
if (typeof defaultStarlinkData === 'undefined') window.defaultStarlinkData = function(){ return defaultData(); };
if (typeof CELFI_SECTIONS      === 'undefined') window.CELFI_SECTIONS      = window.SECTIONS || [];
if (typeof WIFI_SECTIONS       === 'undefined') window.WIFI_SECTIONS       = window.SECTIONS || [];
if (typeof STARLINK_SECTIONS   === 'undefined') window.STARLINK_SECTIONS   = window.SECTIONS || [];

"use strict";
var DOC_TYPES = [
  // ── PICO BTS ──────────────────────────────────────────────────────────────
  { id:'audit',           label:'Audit PICO BTS',         icon:'📡', color:'#3b82f6', border:'#1e3a5f',  bg:'linear-gradient(135deg,#0f2040,#0a1628)', desc:'Audit de couverture mobile 4G/5G', famille:'pico' },
  { id:'doe',             label:'DOE PICO BTS',           icon:'📋', color:'#22c55e', border:'#22c55e40', bg:'linear-gradient(135deg,#052010,#0a1628)', desc:'Document des ouvrages exécutés',    famille:'pico' },
  // ── ANTENNE DÉPORTÉE ──────────────────────────────────────────────────────
  { id:'antenne',         label:'Audit Antenne Déportée', icon:'📶', color:'#f97316', border:'#7c2d1280', bg:'linear-gradient(135deg,#1f0a00,#0a1628)', desc:'Audit antenne 4G/5G déportée',      famille:'antenne' },
  { id:'doe_antenne',     label:'DOE Antenne Déportée',  icon:'📝', color:'#fb923c', border:'#92400e80', bg:'linear-gradient(135deg,#1a0800,#0a1628)', desc:'DOE antenne déportée finalisé',     famille:'antenne' },
  // ── CEL-FI QUATRA ─────────────────────────────────────────────────────────
  { id:'audit_celfi',     label:'Audit CEL-FI QUATRA',   icon:'📶', color:'#a855f7', border:'#6b21a880', bg:'linear-gradient(135deg,#150520,#0a1628)', desc:'Audit amplificateur CEL-FI QUATRA', famille:'celfi' },
  { id:'doe_celfi',       label:'DOE CEL-FI QUATRA',     icon:'🔧', color:'#c084fc', border:'#7e22ce80', bg:'linear-gradient(135deg,#1a0a25,#0a1628)', desc:'DOE amplificateur CEL-FI finalisé', famille:'celfi' },
  // ── WIFI ──────────────────────────────────────────────────────────────────
  { id:'audit_wifi',      label:'Audit WIFI',            icon:'🌐', color:'#06b6d4', border:'#0e748080', bg:'linear-gradient(135deg,#001520,#0a1628)', desc:'Audit déploiement bornes WIFI',     famille:'wifi' },
  // ── STARLINK / SOLUTIONS AÉRIENNES ────────────────────────────────────────
  { id:'audit_starlink',  label:'Audit Starlink',        icon:'🛰️', color:'#eab308', border:'#71460080', bg:'linear-gradient(135deg,#151000,#0a1628)', desc:'Audit installation Starlink',       famille:'starlink' },
  { id:'audit_cradlepoint',label:'Audit Cradlepoint',   icon:'📡', color:'#f59e0b', border:'#78350f80', bg:'linear-gradient(135deg,#181000,#0a1628)', desc:'Audit solution Cradlepoint 4G/5G',  famille:'starlink' },
];

function DocTypeSelector({ onCreate }) {
  var _us = React.useState(false); var showMenu = _us[0]; var setShowMenu = _us[1];

  // Groupes de types de rapport
  var GROUPS = [
    {
      label: 'PICO BTS',
      color: '#3b82f6',
      icon: '📡',
      types: DOC_TYPES.filter(function(d){ return d.famille==='pico'; })
    },
    {
      label: 'Antenne Déportée',
      color: '#f97316',
      icon: '📶',
      types: DOC_TYPES.filter(function(d){ return d.famille==='antenne'; })
    },
    {
      label: 'Cradlepoint / Starlink (INFO U)',
      color: '#f59e0b',
      icon: '🛰️',
      types: DOC_TYPES.filter(function(d){ return d.famille==='starlink'||d.famille==='celfi'||d.famille==='wifi'; })
    },
  ];

  return React.createElement('div', { style: {marginBottom:28} },
    React.createElement('div', { style: {display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12} },
      React.createElement('div', { style: {fontSize:12,fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'0.08em'} }, 'Nouveau rapport'),
      React.createElement('button', {
        onClick: function(){ setShowMenu(!showMenu); },
        style: {background:'#3b82f6',border:'none',borderRadius:10,padding:'9px 18px',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:6}
      }, React.createElement('span',{style:{fontSize:16}},showMenu?'×':'+'), showMenu?' Fermer':' Créer')
    ),
    showMenu && React.createElement('div', {
      style: {background:'#070f20',borderRadius:16,border:'1px solid #1e3a5f',overflow:'hidden',boxShadow:'0 8px 40px #000c'}
    },
      GROUPS.map(function(grp, gi) {
        return React.createElement('div', { key:gi },
          // En-tête groupe
          React.createElement('div', {
            style: {
              padding:'10px 16px',
              background:'linear-gradient(90deg,'+grp.color+'18,transparent)',
              borderBottom:'1px solid #1e3a5f',
              display:'flex', alignItems:'center', gap:8,
            }
          },
            React.createElement('span',{style:{fontSize:14}},grp.icon),
            React.createElement('span',{style:{fontSize:11,fontWeight:800,color:grp.color,textTransform:'uppercase',letterSpacing:'0.08em'}}),
            grp.label && React.createElement('span',{style:{fontSize:12,fontWeight:700,color:grp.color+'cc',letterSpacing:'0.06em'}},grp.label)
          ),
          // Types dans ce groupe
          grp.types.map(function(dt, ti) {
            var isLast = ti === grp.types.length-1 && gi === GROUPS.length-1;
            return React.createElement('button', {
              key: dt.id,
              onClick: function(){ setShowMenu(false); onCreate(dt.id); },
              style: {
                width:'100%', padding:'13px 20px 13px 28px',
                border:'none',
                borderBottom: isLast ? 'none' : '1px solid #1e3a5f10',
                background: 'transparent',
                cursor:'pointer', textAlign:'left',
                display:'flex', alignItems:'center', gap:14,
              }
            },
              React.createElement('div', {
                style: {
                  width:40, height:40, borderRadius:10,
                  background:dt.color+'15', border:'1px solid '+dt.color+'40',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, flexShrink:0,
                }
              }, dt.icon),
              React.createElement('div', { style:{flex:1,minWidth:0} },
                React.createElement('div', { style:{fontWeight:700,fontSize:14,color:dt.color} }, dt.label),
                React.createElement('div', { style:{fontSize:11,color:'#475569',marginTop:2} }, dt.desc)
              ),
              React.createElement('span', { style:{color:'#334155',fontSize:16} }, '›')
            );
          })
        );
      })
    )
  );
}


// ── ProfileScreen — Édition profil technicien ────────────────────────────────
function ProfileScreen(props) {
  var profile = props.profile;
  var onSave  = props.onSave;
  var onClose = props.onClose;

  var _n  = React.useState(profile.name||'');        var name=_n[0];    var setName=_n[1];
  var _p  = React.useState(profile.phone||'');       var phone=_p[0];   var setPhone=_p[1];
  var _e  = React.useState(profile.defaultEmail||'');var email=_e[0];   var setEmail=_e[1];
  var _f  = React.useState(profile.fonction||'');    var fct=_f[0];     var setFct=_f[1];
  var _d  = React.useState(profile.direction||'');   var dir=_d[0];     var setDir=_d[1];
  var _pw = React.useState('');                      var pwOld=_pw[0];  var setPwOld=_pw[1];
  var _pw2= React.useState('');                      var pwNew=_pw2[0]; var setPwNew=_pw2[1];
  var _pw3= React.useState('');                      var pwConf=_pw3[0];var setPwConf=_pw3[1];
  var _msg= React.useState('');                      var msg=_msg[0];   var setMsg=_msg[1];
  var _showPw = React.useState(false);               var showPw=_showPw[0]; var setShowPw=_showPw[1];

  var deviceType = getDeviceType();
  var currentDevice = getDeviceId();

  // Device label
  var deviceLabel = deviceType === 'mobile' ? '📱 Mobile' : '🖥️ Ordinateur';
  var mobileAssoc  = profile.deviceId_mobile  || '';
  var desktopAssoc = profile.deviceId_desktop || '';
  var isCurrentMobile  = mobileAssoc  === currentDevice;
  var isCurrentDesktop = desktopAssoc === currentDevice;

  function handleSave() {
    // Password change validation
    if (showPw) {
      if (!pwOld || hashPwd(pwOld) !== (profile.pwdHash||hashPwd(''))) {
        setMsg('❌ Mot de passe actuel incorrect'); return;
      }
      if (pwNew.length < 4) { setMsg('❌ Nouveau mot de passe trop court (4 car. min)'); return; }
      if (pwNew !== pwConf)  { setMsg('❌ Les mots de passe ne correspondent pas'); return; }
    }

    var updated = Object.assign({}, profile, {
      name:    name,
      phone:   phone,
      defaultEmail: email,
      fonction: fct,
      direction: dir,
    });
    if (showPw && pwNew) {
      updated.pwdHash = hashPwd(pwNew);
    }
    var profiles = getProfiles();
    saveProfiles(profiles.map(function(p){ return p.id===profile.id ? updated : p; }));
    setMsg('✅ Profil sauvegardé');
    if (typeof window._activeProfile !== 'undefined') window._activeProfile = updated;
    setTimeout(function(){ onSave(updated); onClose(); }, 1000);
  }

  function disconnectDevice(type) {
    if (!confirm('Déconnecter cet appareil ?')) return;
    var updated = Object.assign({}, profile);
    if (type==='mobile')  { updated.deviceId_mobile=null;  updated.deviceInfo_mobile=null; }
    if (type==='desktop') { updated.deviceId_desktop=null; updated.deviceInfo_desktop=null; }
    // Legacy single deviceId
    if (updated.deviceId===currentDevice) updated.deviceId=null;
    var profiles = getProfiles();
    saveProfiles(profiles.map(function(p){ return p.id===profile.id ? updated : p; }));
    setMsg('✅ Appareil déconnecté');
    setTimeout(function(){ onSave(updated); onClose(); }, 800);
  }

  var F = { // Field style
    width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid #1e3a5f',
    background:'#0a1628', color:'#e2e8f0', fontSize:14, boxSizing:'border-box',
    outline:'none', fontFamily:'inherit', marginBottom:4,
  };
  var Fg = Object.assign({}, F, { color:'#475569', background:'#070f20', cursor:'not-allowed' });
  var L  = { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase',
             letterSpacing:'0.06em', display:'block', marginBottom:4, marginTop:12 };
  var Cd = { background:'#0f2040', borderRadius:12, padding:'16px', marginBottom:12,
             border:'1px solid #1e3a5f' };
  var CdT = { fontSize:12, fontWeight:700, color:'#93c5fd', textTransform:'uppercase',
              letterSpacing:'0.06em', marginBottom:12, paddingBottom:8,
              borderBottom:'1px solid #1e3a5f' };

  return React.createElement('div', {style:{
    position:'fixed', inset:0, background:'#020817', zIndex:9999,
    overflowY:'auto', fontFamily:'inherit',
    display:'flex', flexDirection:'column',
  }},
    // Header
    React.createElement('div', {style:{
      background:'#0f2040', padding:'14px 16px',
      display:'flex', alignItems:'center', gap:12,
      borderBottom:'1px solid #1e3a5f', flexShrink:0,
    }},
      React.createElement('button', {onClick:onClose, style:{
        background:'transparent', border:'none', color:'#64748b',
        cursor:'pointer', fontSize:20, padding:'0 4px',
      }}, '←'),
      React.createElement('div', {style:{flex:1}},
        React.createElement('div', {style:{fontSize:16,fontWeight:700,color:'#e2e8f0'}}, 'Mon Profil'),
        React.createElement('div', {style:{fontSize:11,color:'#475569'}}, profile.username)
      ),
      React.createElement('button', {onClick:handleSave, style:{
        padding:'8px 16px', borderRadius:8, border:'none',
        background:'#22c55e', color:'#fff', cursor:'pointer',
        fontWeight:700, fontSize:13,
      }}, '💾 Sauvegarder')
    ),

    // Content
    React.createElement('div', {style:{padding:'16px', maxWidth:600, margin:'0 auto', width:'100%'}},

      // Infos grises (lecture seule)
      React.createElement('div', {style:Cd},
        React.createElement('div', {style:CdT}, '🔒 Identifiant (non modifiable)'),
        React.createElement('label', {style:L}, 'Identifiant / Username'),
        React.createElement('input', {value:profile.username||'', readOnly:true, style:Fg}),
        React.createElement('label', {style:L}, 'Rôle'),
        React.createElement('input', {value:profile.isAdmin?'Administrateur':'Technicien',
          readOnly:true, style:Fg}),
      ),

      // Infos personnelles
      React.createElement('div', {style:Cd},
        React.createElement('div', {style:CdT}, '👤 Informations personnelles'),
        React.createElement('label', {style:L}, 'Nom complet'),
        React.createElement('input', {value:name, onChange:function(e){setName(e.target.value);},
          placeholder:'ex: Emmanuel MAUDET', style:F}),
        React.createElement('label', {style:L}, 'Téléphone'),
        React.createElement('input', {value:phone, onChange:function(e){setPhone(e.target.value);},
          placeholder:'ex: 06 12 34 56 78', style:F, type:'tel'}),
        React.createElement('label', {style:L}, 'Email par défaut (pour envoi des rapports)'),
        React.createElement('input', {value:email, onChange:function(e){setEmail(e.target.value);},
          placeholder:'ex: technicien@sogetrel.fr', style:F, type:'email'}),
        React.createElement('label', {style:L}, 'Fonction'),
        React.createElement('input', {value:fct, onChange:function(e){setFct(e.target.value);},
          placeholder:'ex: Technicien Réseaux & Télécoms.', style:F}),
        React.createElement('label', {style:L}, 'Direction'),
        React.createElement('input', {value:dir, onChange:function(e){setDir(e.target.value);},
          placeholder:'ex: Direction des Opérations Ile De France', style:F}),
      ),

      // Appareils associés
      React.createElement('div', {style:Cd},
        React.createElement('div', {style:CdT}, '📱 Appareils associés (max 1 mobile + 1 ordinateur)'),
        // Mobile
        React.createElement('div', {style:{
          padding:'10px 12px', borderRadius:8, marginBottom:8,
          background: mobileAssoc ? '#052e16' : '#0a1628',
          border:'1px solid '+(mobileAssoc?'#22c55e40':'#1e3a5f'),
          display:'flex', alignItems:'center', gap:10,
        }},
          React.createElement('span', {style:{fontSize:18}},'📱'),
          React.createElement('div', {style:{flex:1}},
            React.createElement('div', {style:{fontSize:13,fontWeight:700,
              color:mobileAssoc?'#22c55e':'#475569'}},
              mobileAssoc ? (isCurrentMobile?'✓ Cet appareil (mobile actuel)':'Mobile associé') : 'Aucun mobile associé'),
            mobileAssoc && React.createElement('div', {style:{fontSize:11,color:'#475569'}},
              profile.deviceInfo_mobile||profile.deviceInfo||mobileAssoc.substring(0,16)+'...')
          ),
          mobileAssoc && !isCurrentMobile && React.createElement('button', {
            onClick:function(){disconnectDevice('mobile');},
            style:{padding:'5px 10px',borderRadius:6,border:'none',background:'#450a0a',
              color:'#ef4444',cursor:'pointer',fontSize:11}
          },'Déconnecter')
        ),
        // Desktop
        React.createElement('div', {style:{
          padding:'10px 12px', borderRadius:8, marginBottom:4,
          background: desktopAssoc ? '#052e16' : '#0a1628',
          border:'1px solid '+(desktopAssoc?'#22c55e40':'#1e3a5f'),
          display:'flex', alignItems:'center', gap:10,
        }},
          React.createElement('span', {style:{fontSize:18}},'🖥️'),
          React.createElement('div', {style:{flex:1}},
            React.createElement('div', {style:{fontSize:13,fontWeight:700,
              color:desktopAssoc?'#22c55e':'#475569'}},
              desktopAssoc ? (isCurrentDesktop?'✓ Cet appareil (ordinateur actuel)':'Ordinateur associé') : 'Aucun ordinateur associé'),
            desktopAssoc && React.createElement('div', {style:{fontSize:11,color:'#475569'}},
              profile.deviceInfo_desktop||desktopAssoc.substring(0,16)+'...')
          ),
          desktopAssoc && !isCurrentDesktop && React.createElement('button', {
            onClick:function(){disconnectDevice('desktop');},
            style:{padding:'5px 10px',borderRadius:6,border:'none',background:'#450a0a',
              color:'#ef4444',cursor:'pointer',fontSize:11}
          },'Déconnecter')
        ),
        React.createElement('div', {style:{fontSize:11,color:'#475569',marginTop:6}},
          "📌 Un compte peut être connecté sur 1 mobile ET 1 ordinateur. Pour changer d'appareil, déconnectez d'abord l'ancien.")
      ),

      // Changement de mot de passe
      React.createElement('div', {style:Cd},
        React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:showPw?12:0}},
          React.createElement('div', {style:CdT}, '🔑 Mot de passe'),
          React.createElement('button', {
            onClick:function(){setShowPw(!showPw); setMsg('');},
            style:{padding:'6px 12px',borderRadius:8,border:'1px solid #1e3a5f',
              background:showPw?'#1e3a5f':'transparent',color:'#93c5fd',cursor:'pointer',fontSize:12}
          }, showPw?'Annuler':'Changer le mot de passe')
        ),
        !showPw && React.createElement('div', {style:{fontSize:12,color:'#475569'}},
          profile.pwdHash ? '••••••••' : "Aucun mot de passe défini"),
        showPw && React.createElement('div', null,
          React.createElement('label', {style:L}, 'Mot de passe actuel'),
          React.createElement('input', {value:pwOld, onChange:function(e){setPwOld(e.target.value);},
            type:'password', placeholder:'Mot de passe actuel', style:F}),
          React.createElement('label', {style:L}, 'Nouveau mot de passe'),
          React.createElement('input', {value:pwNew, onChange:function(e){setPwNew(e.target.value);},
            type:'password', placeholder:'Minimum 4 caractères', style:F}),
          React.createElement('label', {style:L}, 'Confirmer'),
          React.createElement('input', {value:pwConf, onChange:function(e){setPwConf(e.target.value);},
            type:'password', placeholder:'Confirmer le nouveau mot de passe', style:F})
        )
      ),

      // Expiration (grisée)
      profile.expiryDate && React.createElement('div', {style:Cd},
        React.createElement('div', {style:CdT}, '⏳ Expiration du compte'),
        React.createElement('input', {value:profile.expiryDate||'',readOnly:true,style:Fg}),
        React.createElement('div', {style:{fontSize:11,color:'#f59e0b',marginTop:4}},
          "Date d'expiration définie par l'administrateur")
      ),

      // Message
      msg && React.createElement('div', {style:{
        padding:'12px 16px', borderRadius:10, textAlign:'center',
        background:msg.startsWith('✅')?'#052e16':'#450a0a',
        color:msg.startsWith('✅')?'#22c55e':'#ef4444',
        fontSize:14, fontWeight:600, marginBottom:12,
      }}, msg)
    )
  );
}


// ── ResponsableScreen — Vue responsable techniciens ───────────────────────────
function ResponsableScreen(props) {
  var profile = props.profile;   // profil du responsable
  var onClose = props.onClose;

  var allProfiles = getProfiles().filter(function(p){ return !p.isAdmin; });
  // Techniciens affectés à ce responsable
  var myTechs = allProfiles.filter(function(p){
    return (p.responsableId === profile.id) || (p.responsableUsername === profile.username);
  });

  var _selTech = React.useState(null); var selTech=_selTech[0]; var setSelTech=_selTech[1];
  var _audits  = React.useState(null); var audits=_audits[0];   var setAudits=_audits[1];
  var _loading = React.useState(false);var loading=_loading[0]; var setLoading=_loading[1];

  // Load audits for selected technician
  React.useEffect(function(){
    if (!selTech) { setAudits(null); return; }
    setLoading(true);
    loadAuditList().then(function(list){
      // Filter by technician name or phone
      var techAudits = (list||[]).filter(function(a){
        var g = a.garde || {};
        return g.technicien && (
          g.technicien.toLowerCase().includes(selTech.name.toLowerCase()) ||
          (selTech.username && g.technicien.toLowerCase().includes(selTech.username.toLowerCase()))
        );
      });
      setAudits(techAudits);
      setLoading(false);
    });
  }, [selTech]);

  var Cd = {background:'#0f2040',borderRadius:12,padding:14,marginBottom:10,border:'1px solid #1e3a5f'};
  var TECH_COLORS = ['#3b82f6','#22c55e','#f97316','#a855f7','#ef4444','#06b6d4'];

  return React.createElement('div', {style:{
    position:'fixed', inset:0, background:'#020817', zIndex:9999,
    display:'flex', flexDirection:'column', fontFamily:'inherit',
  }},
    // Header
    React.createElement('div', {style:{
      background:'linear-gradient(135deg,#0c2040,#1a3a60)',
      padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
      borderBottom:'1px solid #1e3a5f', flexShrink:0,
    }},
      React.createElement('button', {onClick:onClose,
        style:{background:'transparent',border:'none',color:'#64748b',cursor:'pointer',fontSize:20}
      }, '←'),
      React.createElement('div', {style:{flex:1}},
        React.createElement('div', {style:{fontSize:15,fontWeight:700,color:'#e2e8f0'}}, '👥 Mes Techniciens'),
        React.createElement('div', {style:{fontSize:11,color:'#64748b'}},
          myTechs.length+' technicien'+(myTechs.length>1?'s':'')+" sous ta responsabilité")
      )
    ),

    React.createElement('div', {style:{flex:1,overflowY:'auto',padding:16}},

      // Liste des techniciens
      React.createElement('div', {style:{fontSize:11,fontWeight:700,color:'#64748b',
        textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}},
        'Sélectionne un technicien pour voir ses rapports'
      ),

      myTechs.length===0 && React.createElement('div', {style:{
        textAlign:'center',padding:'32px 0',color:'#334155',fontSize:13,
      }},
        React.createElement('div', {style:{fontSize:32,marginBottom:8}}, '👤'),
        'Aucun technicien affecté.', React.createElement('br',null),
        "Demande à l'administrateur de t'en affecter."
      ),

      myTechs.map(function(tech, i){
        var col = TECH_COLORS[i % TECH_COLORS.length];
        var isSelected = selTech && selTech.id===tech.id;
        return React.createElement('div', {key:tech.id,
          onClick:function(){ setSelTech(isSelected?null:tech); },
          style:{
            background:isSelected?'#0f2040':'#070f20',
            borderRadius:10, padding:'12px 14px', marginBottom:8,
            border:'1px solid '+(isSelected?col+'60':'#1e3a5f'),
            cursor:'pointer',
          }
        },
          // Tech header
          React.createElement('div', {style:{display:'flex',alignItems:'center',gap:10,marginBottom:isSelected?10:0}},
            React.createElement('div', {style:{
              width:36,height:36,borderRadius:'50%',background:col,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:12,fontWeight:800,color:'#fff',flexShrink:0,
            }},
              tech.name ? tech.name.split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase() : '?'
            ),
            React.createElement('div', {style:{flex:1}},
              React.createElement('div', {style:{fontSize:14,fontWeight:700,color:isSelected?'#e2e8f0':'#94a3b8'}}, tech.name),
              React.createElement('div', {style:{fontSize:11,color:'#475569'}},
                (tech.phone?'📞 '+tech.phone+' ':'')+(tech.defaultEmail?'✉ '+tech.defaultEmail:''))
            ),
            React.createElement('div', {style:{fontSize:10,color:col,fontWeight:700,
              background:col+'20',padding:'2px 8px',borderRadius:6}},
              isSelected?'▼ Masquer':'▶ Rapports')
          ),
          // Infos technicien (lecture seule)
          isSelected && React.createElement('div', {style:{
            background:'#0a1628',borderRadius:8,padding:'10px 12px',
            fontSize:12,color:'#94a3b8',marginBottom:10,
          }},
            React.createElement('div', {style:{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px'}},
              ...[
                ['Identifiant', tech.username||'—'],
                ['Téléphone',   tech.phone||'—'],
                ['Email',       tech.defaultEmail||'—'],
                ['Fonction',    tech.fonction||'—'],
                ['Statut',      tech.active?'✅ Actif':'❌ Désactivé'],
                ['Expiration',  tech.expiryDate||'Aucune'],
                ['Mobile',      tech.deviceId_mobile?'📱 Associé':'📱 Non associé'],
                ['PC',          tech.deviceId_desktop?'🖥️ Associé':'🖥️ Non associé'],
              ].map(function(row,j){
                return [
                  React.createElement('div',{key:'l'+j,style:{fontWeight:600,color:'#64748b',whiteSpace:'nowrap'}}, row[0]+' :'),
                  React.createElement('div',{key:'v'+j,style:{color:'#e2e8f0'}}, row[1])
                ];
              }).flat()
            )
          ),
          // Liste rapports
          isSelected && React.createElement('div', null,
            React.createElement('div', {style:{fontSize:11,fontWeight:700,color:'#64748b',
              marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}},
              loading?'Chargement...':(audits?audits.length+' rapport(s)':'')
            ),
            loading && React.createElement('div', {style:{textAlign:'center',padding:16,color:'#334155'}},
              '⏳ Chargement des rapports...'),
            audits && audits.length===0 && React.createElement('div', {style:{
              textAlign:'center',padding:12,color:'#334155',fontSize:12}},
              'Aucun rapport trouvé pour ce technicien.'),
            audits && audits.slice(0,20).map(function(a, ai){
              var g=a.garde||{};
              var meta={
                'audit':     {icon:'📡',color:'#3b82f6',label:'Audit PICO'},
                'doe':       {icon:'📋',color:'#22c55e',label:'DOE PICO'},
                'antenne':   {icon:'📶',color:'#f97316',label:'Antenne'},
                'audit_cradlepoint':{icon:'🛰️',color:'#f59e0b',label:'Cradlepoint'},
              }[a.type]||{icon:'📄',color:'#475569',label:a.type||'Rapport'};
              return React.createElement('div', {key:a.id,style:{
                display:'flex',alignItems:'center',gap:8,padding:'8px 10px',
                background:'#0a1628',borderRadius:8,marginBottom:4,
                border:'1px solid #1e3a5f',
              }},
                React.createElement('span', {style:{fontSize:14}}, meta.icon),
                React.createElement('div', {style:{flex:1,minWidth:0}},
                  React.createElement('div', {style:{fontSize:12,fontWeight:700,color:meta.color,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},
                    g.raisonSociale||g.ot||a.id),
                  React.createElement('div', {style:{fontSize:10,color:'#475569'}},
                    (g.date||'')+(g.ot?' — OT '+g.ot:''))
                ),
                React.createElement('div', {style:{fontSize:10,fontWeight:700,
                  color:a.status==='Terminé'?'#22c55e':'#f59e0b',flexShrink:0}},
                  a.status||'En cours')
              );
            })
          )
        );
      })
    )
  );
}


// ── AdminMiniModal — Accès admin depuis la page de liste ─────────────────────
function AdminMiniModal(props) {
  var onClose = props.onClose;
  var onSuccess = props.onSuccess;

  var _pwd = React.useState(''); var pwd=_pwd[0]; var setPwd=_pwd[1];
  var _err = React.useState(''); var err=_err[0]; var setErr=_err[1];
  var _sr  = React.useState(false); var showReset=_sr[0]; var setShowReset=_sr[1];
  var _rc  = React.useState('');    var resetCode=_rc[0]; var setResetCode=_rc[1];
  var _re  = React.useState('');    var resetErr=_re[0];  var setResetErr=_re[1];

  function handleReset() {
    if (!checkRecoveryCode(resetCode)) {
      setResetErr('Code incorrect'); return;
    }
    // Reset admin password to '2222' + appareil associé du compte "2222" (premier technicien non-admin)
    var newHash = hashPwd('2222');
    localStorage.setItem('__omar_pwd__', newHash);
    var profiles = getProfiles();
    var updated = profiles.map(function(p){
      if (p.isAdmin) return Object.assign({}, p, {pwdHash: newHash, needSetup: false});
      // Reset device pour le compte username='2222'
      if (p.username === '2222' || p.id === '2222') {
        return Object.assign({}, p, {
          deviceId: null, deviceInfo: null,
          deviceId_mobile: null, deviceInfo_mobile: null,
          deviceId_desktop: null, deviceInfo_desktop: null,
        });
      }
      return p;
    });
    saveProfiles(updated);
    setShowReset(false);
    setErr('');
    setPwd('');
    alert('✅ Mot de passe admin réinitialisé à "2222" et appareil du compte 2222 réinitialisé.');
  }

  function handleLogin() {
    var adminProf = getProfiles().find(function(p){ return p.isAdmin; });
    if (!adminProf) { setErr('Profil admin introuvable'); return; }
    // Check username = '2222' or 'admin_omar' (legacy)
    var inputPwd = pwd.trim();
    if (!inputPwd) { setErr('Mot de passe requis'); return; }
    var hash = hashPwd(inputPwd);
    if (hash !== adminProf.pwdHash) {
      setErr('Mot de passe incorrect');
      return;
    }
    onSuccess(adminProf);
  }

  return React.createElement('div', {
    style:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',
      zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'inherit'},
    onClick:function(e){ if(e.target===e.currentTarget) onClose(); }
  },
    React.createElement('div', {style:{
      background:'#0f2040',borderRadius:16,padding:24,width:280,
      border:'1px solid #4c1d95',boxShadow:'0 8px 40px rgba(0,0,0,0.8)',
    }},
      React.createElement('div',{style:{display:'flex',alignItems:'center',gap:10,marginBottom:20}},
        React.createElement('div',{style:{fontSize:24}},'🔐'),
        React.createElement('div',null,
          React.createElement('div',{style:{fontSize:15,fontWeight:700,color:'#e2e8f0'}},'Accès Administrateur'),
          React.createElement('div',{style:{fontSize:11,color:'#7c3aed'}},'Zone sécurisée')
        )
      ),
      React.createElement('input',{
        type:'password',
        value:pwd,
        onChange:function(e){setPwd(e.target.value); setErr('');},
        onKeyDown:function(e){if(e.key==='Enter') handleLogin();},
        placeholder:'Mot de passe admin',
        autoFocus:true,
        style:{
          width:'100%',padding:'11px 14px',borderRadius:10,
          border:'1px solid '+(err?'#ef4444':'#4c1d95'),
          background:'#0a1628',color:'#e2e8f0',fontSize:14,
          boxSizing:'border-box',outline:'none',fontFamily:'inherit',marginBottom:8,
        }
      }),
      err && React.createElement('div',{style:{
        fontSize:12,color:'#ef4444',marginBottom:10,textAlign:'center'
      }},err),
      React.createElement('div',{style:{display:'flex',gap:8}},
        React.createElement('button',{
          onClick:onClose,
          style:{flex:1,padding:'10px',borderRadius:10,border:'1px solid #334155',
            background:'transparent',color:'#64748b',cursor:'pointer',fontSize:13}
        },'Annuler'),
        React.createElement('button',{
          onClick:handleLogin,
          style:{flex:1,padding:'10px',borderRadius:10,border:'none',
            background:'#ef4444',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}
        },'Connexion')
      ),
      // Reset link
      !showReset
        ? React.createElement('div',{
            onClick:function(){setShowReset(true); setResetCode(''); setResetErr('');},
            style:{textAlign:'center',marginTop:12,fontSize:11,color:'#475569',
              cursor:'pointer',textDecoration:'underline'}
          },'Mot de passe oublié ?')
        : React.createElement('div',{style:{marginTop:14,borderTop:'1px solid #1e3a5f',paddingTop:12}},
            React.createElement('div',{style:{fontSize:11,color:'#94a3b8',marginBottom:8,textAlign:'center'}},
              'Entrez le code de récupération (défaut: 1234)'),
            React.createElement('input',{
              type:'text',
              value:resetCode,
              onChange:function(e){setResetCode(e.target.value); setResetErr('');},
              onKeyDown:function(e){if(e.key==='Enter') handleReset();},
              placeholder:'Code de récupération',
              style:{
                width:'100%',padding:'9px 12px',borderRadius:8,marginBottom:6,
                border:'1px solid '+(resetErr?'#ef4444':'#334155'),
                background:'#0a1628',color:'#e2e8f0',fontSize:13,
                boxSizing:'border-box',outline:'none',fontFamily:'inherit',
              }
            }),
            resetErr && React.createElement('div',{style:{fontSize:11,color:'#ef4444',marginBottom:6,textAlign:'center'}},resetErr),
            React.createElement('div',{style:{display:'flex',gap:6}},
              React.createElement('button',{
                onClick:function(){setShowReset(false);},
                style:{flex:1,padding:'8px',borderRadius:8,border:'1px solid #334155',
                  background:'transparent',color:'#64748b',cursor:'pointer',fontSize:12}
              },'Retour'),
              React.createElement('button',{
                onClick:handleReset,
                style:{flex:1,padding:'8px',borderRadius:8,border:'none',
                  background:'#22c55e',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:12}
              },'Réinitialiser')
            )
          )
    )
  );
}

function AuditListScreen({ onOpen, onCreate, profile, onSwitchProfile }) {
  const [audits,    setAudits]    = useState(null);
  const [search,    setSearch]    = useState('');
  const [filterType,setFilterType]= useState('all');
  const [showProfile, setShowProfile] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [showResponsable, setShowResponsable] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  var isResponsable = profile && profile.isResponsable && !profile.isAdmin; // 'all' | type id

  useEffect(() => { loadAuditList().then(setAudits); }, []);
  // Update currentProfile when profile prop changes
  React.useEffect(function(){ setCurrentProfile(profile); }, [profile]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Supprimer cet audit ?")) return;
    await deleteAuditStorage(id);
    const updated = audits.filter(a=>a.id!==id);
    await saveAuditList(updated);
    setAudits(updated);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const TYPE_META = {
    audit:            { icon:'📡', color:'#3b82f6', border:'#1e3a5f',  label:'Audit PICO' },
    doe:              { icon:'📋', color:'#22c55e', border:'#14532d60', label:'DOE PICO' },
    antenne:          { icon:'📶', color:'#f97316', border:'#7c2d1260', label:'Antenne Dép.' },
    doe_antenne:      { icon:'📝', color:'#fb923c', border:'#92400e60', label:'DOE Antenne' },
    audit_celfi:      { icon:'📶', color:'#a855f7', border:'#6b21a860', label:'CEL-FI' },
    doe_celfi:        { icon:'🔧', color:'#c084fc', border:'#7e22ce60', label:'DOE CEL-FI' },
    audit_wifi:       { icon:'🌐', color:'#06b6d4', border:'#0e748060', label:'WIFI' },
    audit_starlink:   { icon:'🛰️', color:'#eab308', border:'#71460060', label:'Starlink' },
    audit_cradlepoint:{ icon:'📡', color:'#f59e0b', border:'#78350f60', label:'Cradlepoint' },
  };
  const getMeta = t => TYPE_META[t] || { icon:'📄', color:'#475569', border:'#1e3a5f', label: t||'Rapport' };
  const statusColor = s => ({ 'En cours':'#f59e0b','Terminé':'#22c55e','Brouillon':'#64748b' }[s]||'#64748b');

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (!audits) return [];
    var list = audits.slice().reverse();
    // Filtre type
    if (filterType !== 'all') list = list.filter(a => (a.type||'audit') === filterType);
    // Recherche texte : date, OT, raison sociale
    var q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        (a.raisonSociale||'').toLowerCase().includes(q) ||
        (a.ot||'').toLowerCase().includes(q) ||
        (a.date||'').toLowerCase().includes(q)
      );
    }
    return list;
  }, [audits, search, filterType]);

  // Types présents dans la liste pour les filtres rapides
  const presentTypes = React.useMemo(() => {
    if (!audits) return [];
    var seen = {};
    audits.forEach(a => { seen[a.type||'audit'] = true; });
    return Object.keys(seen);
  }, [audits]);

  // ── AdminMiniModal overlay ───────────────────────────────────────────────
  if (showAdminModal) {
    return React.createElement(AdminMiniModal, {
      onClose: function(){ setShowAdminModal(false); },
      onSuccess: function(adminProf){
        setShowAdminModal(false);
        // Stocker le profil admin et déclencher l'ouverture du panneau
        window.__pendingAdminLogin = adminProf;
        onSwitchProfile(); // retour à ProfileSelectorScreen qui lira __pendingAdminLogin
      },
    });
  }

  // ── ResponsableScreen overlay ────────────────────────────────────────────
  if (showResponsable && isResponsable) {
    return React.createElement(ResponsableScreen, {
      profile: profile,
      onClose: function(){ setShowResponsable(false); },
    });
  }
  // ── ProfileScreen overlay ──────────────────────────────────────────────
  if (showProfile && currentProfile) {
    return React.createElement(ProfileScreen, {
      profile:  currentProfile,
      onSave:   function(updated){ setCurrentProfile(updated); if(typeof window._activeProfile!=='undefined') window._activeProfile=updated; },
      onClose:  function(){ setShowProfile(false); },
    });
  }

  return (
    React.createElement('div', { className:"audit-root", style:{width:"100%",background:"#020817",minHeight:"100dvh",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#f1f5f9"}}

      /* ── Header ─────────────────────────────────────────────────── */
      , React.createElement('div', { style: {background:"linear-gradient(135deg,#0f2040 0%,#1e3a5f 100%)",padding:"28px 20px 16px",borderBottom:"1px solid #1e3a5f"}}
        , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:12,marginBottom:16}}
          , React.createElement('div', { style: {background:"#3b82f6",borderRadius:14,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}, "📡")
          , React.createElement('div', { style:{flex:1,minWidth:0}}
            , React.createElement('div', { style: {fontSize:20,fontWeight:800,color:"#f1f5f9"}}, "Générateur de Rapport")
            , React.createElement('div', { style: {fontSize:11,color:"#475569",marginTop:2}}, profile ? profile.name + " — Bouygues" : "Bouygues")
          )
          , isResponsable && React.createElement('button', {
              onClick:function(){ setShowResponsable(true); },
              style:{background:'#0c2040',border:'1px solid #1e4080',borderRadius:10,
                padding:'6px 10px',cursor:'pointer',color:'#60a5fa',fontSize:14,
                display:'flex',flexDirection:'column',alignItems:'center',gap:2,marginRight:4}
            }, '👥', React.createElement('div',{style:{fontSize:8,color:'#64748b'}},'Équipe')),
            profile && React.createElement('div', {style:{display:'flex',gap:6,alignItems:'center'}},
              React.createElement('button', {
                onClick: function(){ setShowAdminModal(true); },
                style:{background:"#450a0a",border:"1px solid #ef4444",borderRadius:10,
                  padding:"6px 10px",cursor:"pointer",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:2,flexShrink:0}
              },
                React.createElement('div',{style:{fontSize:16}},'🔐'),
                React.createElement('div',{style:{fontSize:8,color:"#fca5a5"}},'Admin')
              ),
              React.createElement('button', {
                onClick: function(){ setShowProfile(true); },
                style:{background:"#1e3a5f",border:"1px solid #1e3a5f",borderRadius:10,
                  padding:"6px 10px",cursor:"pointer",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:2,flexShrink:0}
              },
                React.createElement('div',{style:{fontSize:16}},'⚙️'),
                React.createElement('div',{style:{fontSize:8,color:"#93c5fd"}},'Profil')
              ),
              React.createElement('button', {
                onClick: onSwitchProfile,
                style:{background:"#0f2040",border:"1px solid #1e3a5f",borderRadius:10,
                  padding:"6px 10px",cursor:"pointer",display:"flex",flexDirection:"column",
                  alignItems:"center",gap:2,flexShrink:0}
              },
                React.createElement('div',{style:{
                  width:32,height:32,borderRadius:"50%",
                  background:typeof getAvatarColor!=="undefined"?getAvatarColor(profile.name||'?'):"#3b82f6",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:800,color:"#fff"
                }},(profile.name||'?').charAt(0).toUpperCase()),
                React.createElement('div',{style:{fontSize:8,color:"#475569"}},'Quitter')
              )
            )
        )

        /* ── Barre de recherche ────────────────────────────────────── */
        , React.createElement('div', {style:{position:'relative',marginBottom:10}}
          , React.createElement('span', {style:{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#475569',pointerEvents:'none'}}, '🔍')
          , React.createElement('input', {
              type:'text', placeholder:'Rechercher par client, OT, date…',
              value:search, onChange:e=>setSearch(e.target.value),
              style:{width:'100%',padding:'10px 12px 10px 36px',borderRadius:10,
                     border:'1px solid #1e3a5f',background:'#0a1628',color:'#f1f5f9',
                     fontSize:13,boxSizing:'border-box',fontFamily:'inherit',outline:'none'}
            })
          , search && React.createElement('button', {
              onClick:()=>setSearch(''),
              style:{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                     background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:16,lineHeight:1}
            }, '×')
        )

        /* ── Filtres type (chips) ──────────────────────────────────── */
        , presentTypes.length > 1 && React.createElement('div', {style:{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}
          , React.createElement('button', {
              onClick:()=>setFilterType('all'),
              style:{flexShrink:0,padding:'4px 12px',borderRadius:20,border:'1px solid #1e3a5f',
                     background:filterType==='all'?'#3b82f6':'transparent',
                     color:filterType==='all'?'#fff':'#64748b',fontSize:11,fontWeight:700,cursor:'pointer'}
            }, 'Tous ('+audits.length+')')
          , presentTypes.map(t => {
              var m = getMeta(t);
              var sel = filterType === t;
              var cnt = audits.filter(a=>(a.type||'audit')===t).length;
              return React.createElement('button', {key:t,
                onClick:()=>setFilterType(sel?'all':t),
                style:{flexShrink:0,padding:'4px 10px',borderRadius:20,
                       border:'1px solid '+(sel?m.color:m.border),
                       background:sel?m.color+'30':'transparent',
                       color:sel?m.color:'#64748b',fontSize:11,fontWeight:700,cursor:'pointer',
                       display:'flex',alignItems:'center',gap:4}
              }, m.icon+' '+m.label+' ('+cnt+')');
            })
        )
      )

      /* ── Sélecteur type rapport ────────────────────────────────────── */
      , React.createElement('div', { style: {padding:"0 16px 8px"}}
        , React.createElement(DocTypeSelector, { onCreate: onCreate })
      )
      

      /* ── Liste ─────────────────────────────────────────────────────── */
      , React.createElement('div', { className:"audit-list-body", style: {padding:"4px 16px 32px"}}
        , !audits ? (
          React.createElement('div', {style:{textAlign:'center',padding:'40px 0',color:'#334155'}}, "Chargement…")
        ) : filtered.length === 0 ? (
          React.createElement('div', {style:{textAlign:'center',padding:'40px 0'}}
            , React.createElement('div', {style:{fontSize:36,marginBottom:10}}, search||filterType!=='all'?'🔍':'📋')
            , React.createElement('div', {style:{color:'#475569',fontSize:13}}, search||filterType!=='all'?'Aucun rapport trouvé':'Créez votre premier rapport ci-dessus')
          )
        ) : (
          filtered.map(a => {
            var meta = getMeta(a.type||'audit');
            return (
              React.createElement('div', { key: a.id,
                onClick: ()=>onOpen(a.id, a.type||'audit'),
                style:{background:"#0f2040",borderRadius:14,padding:"14px",marginBottom:10,
                       border:"1px solid "+meta.border,cursor:"pointer",
                       display:"flex",alignItems:"center",gap:12}}
                /* Icône type */
                , React.createElement('div', { style:{background:meta.color+'25',borderRadius:10,width:44,height:44,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}, meta.icon)
                /* Infos */
                , React.createElement('div', { style:{flex:1,minWidth:0}}
                  /* Client */
                  , React.createElement('div', { style:{fontWeight:700,fontSize:14,color:"#e2e8f0",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
                    a.raisonSociale||"Sans titre"
                  )
                  /* OT + date */
                  , React.createElement('div', { style:{fontSize:12,color:"#475569",marginTop:2}},
                    (a.ot ? 'OT '+a.ot+' · ' : '') + (a.date||'')
                  )
                  /* Type + compteurs */
                  , React.createElement('div', {style:{display:'flex',alignItems:'center',gap:6,marginTop:4,flexWrap:'wrap'}}
                    , React.createElement('span', {style:{background:meta.color+'20',color:meta.color,
                        borderRadius:6,padding:'1px 8px',fontSize:10,fontWeight:700}},
                      meta.label)
                    , a.pmCount>0 && React.createElement('span', {style:{color:'#475569',fontSize:10}}, a.pmCount+' PM')
                    , a.picoCount>0 && React.createElement('span', {style:{color:'#475569',fontSize:10}}, '· '+a.picoCount+' PICO')
                  )
                )
                /* Droite: statut + supprimer */
                , React.createElement('div', { style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}
                  , React.createElement('div', { style:{background:statusColor(a.status)+"25",color:statusColor(a.status),
                      borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}},
                    a.status||"Brouillon")
                  , React.createElement('button', { onClick: e=>handleDelete(a.id,e),
                      style:{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:16,padding:0}},
                    "🗑️")
                )
              )
            );
          })
        )
      )
    )
  );
}


function AuditEditor({ auditId, onBack, profile, onSwitchProfile, auditType, onCreateDOE }) {
  var isDOE      = auditType === 'doe';
  var isAntenne  = auditType === 'antenne' || auditType === 'doe_antenne';
  var isCelfi    = auditType === 'audit_celfi' || auditType === 'doe_celfi';
  var isWifi     = auditType === 'audit_wifi';
  var isStarlink = auditType === 'audit_starlink';
  var isInfoU    = auditType === 'audit_cradlepoint' || auditType === 'audit_infou';
  var activeSections = isAntenne  ? ANTENNE_SECTIONS
                     : isCelfi   ? CELFI_SECTIONS
                     : isWifi    ? WIFI_SECTIONS
                     : isInfoU   ? (typeof INFOU_SECTIONS!=='undefined'?INFOU_SECTIONS:STARLINK_SECTIONS)
                     : isStarlink? STARLINK_SECTIONS
                     : SECTIONS;
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState(isInfoU?"infou_garde":"garde");
  const [showNav, setShowNav] = useState(false);
  const [annotating, setAnnotating] = useState(null); // {type:"gallery"|"pico", key, index} or {type:"pico",label}
  const [showPreview, setShowPreview] = useState(false);
  const [showImportPDF, setShowImportPDF] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [saveLabel, setSaveLabel] = useState("💾 Sauvegarder");
  const [status, setStatus] = useState("En cours");

  useEffect(() => {
    loadAudit(auditId).then(saved => {
      if (saved) { setData(saved.data); setStatus(saved.status||"En cours"); }
      else {
        var d = isAntenne  ? defaultAntenneData()
                  : isCelfi   ? defaultCelfiData()
                  : isWifi    ? defaultWifiData()
                  : isStarlink? defaultStarlinkData()
                  : defaultData();
        // Date du jour par défaut
        var _n = new Date();
        var _today = ('0'+_n.getDate()).slice(-2)+'/'
                    +('0'+(_n.getMonth()+1)).slice(-2)+'/'+_n.getFullYear();
        if (!d.garde.date) d.garde.date = _today;
        if (profile) {
          d.garde.technicien = profile.name || '';
          d.garde.telephone  = profile.phone || '';
        }
        setData(d);
        // Auto-enregistrement initial pour que le rapport apparaisse dans la liste
        (async function() {
          var meta = { id:auditId, type:auditType, raisonSociale:'', ot:'', date:d.garde.date, status:'En cours', pmCount:0, picoCount:0 };
          await saveAudit(auditId, { data:d, status:'En cours' });
          var list = await loadAuditList();
          if (!list.find(function(a){ return a.id===auditId; })) {
            await saveAuditList([...list, meta]);
          }
        })();
      }
    });
  }, [auditId]);

  // ── Auto-remplissage mesures via signal Android ─────────────────────────────
  useEffect(() => {
    var handler = function(e) {
      var sig = e.detail;
      if (!sig || !sig.rsrp) return;
      setData(function(d) {
        if (!d) return d;
        if (d.antenne && d.antenne.mesures) {
          var mesures = d.antenne.mesures;
          var targetIdx = mesures.findIndex(function(m){ return !m.rsrp; });
          if (targetIdx === -1) targetIdx = 0;
          var newMesures = mesures.map(function(m, i) {
            if (i !== targetIdx) return m;
            return Object.assign({}, m, {
              operateur: sig.type   || m.operateur || '',
              band:      sig.band   || m.band  || '',
              enb:       sig.enb    || m.enb   || '',
              lcid:      sig.lcid   ? String(sig.lcid)  : (m.lcid  || ''),
              rsrp:      sig.rsrp   ? String(sig.rsrp)  : (m.rsrp  || ''),
              rsrq:      sig.rsrq   ? String(sig.rsrq)  : (m.rsrq  || ''),
              snr:       sig.snr    ? String(sig.snr)   : (m.snr   || ''),
              ul:        sig.ul     || m.ul   || '',
              dl:        sig.dl     || m.dl   || '',
              ping:      sig.ping   ? String(sig.ping)  : (m.ping  || ''),
            });
          });
          return Object.assign({}, d, { antenne: Object.assign({}, d.antenne, { mesures: newMesures }) });
        }
        if (d.pmData) {
          // Si un Pre-remplir manuel est en cours, ne pas interférer
          if (window._manualFillLabel) return d;
          var labels = Object.keys(d.pmData);
          var target = labels.find(function(lbl){ return !d.pmData[lbl].rsrp && !d.pmData[lbl].g4; });
          if (!target && labels.length > 0) target = labels[0];
          if (target) {
            // 4G: valeurs brutes RSRP / RSRQ / Band
            // 4G: utiliser g4_rsrp si dispo (mesure simultanée), sinon rsrp général
            var g4rsrp = sig.rsrp4g || sig['4g_rsrp'] || sig.rsrp || '';
            var g4rsrq = sig.rsrq4g || sig['4g_rsrq'] || sig.rsrq || '';
            var g4band = sig.band4g || sig['4g_band'] || sig.band || '';
            var g4str  = [g4rsrp, g4rsrq, g4band].filter(function(v){return v!=='';}).join(' / ');
            var g4parts = g4str ? [g4str] : [];
            var spparts = [sig.dl, sig.ul].filter(function(v){return v!==undefined&&v!==null&&v!=='';});
            var cur = d.pmData[target];
            var newPm = Object.assign({}, cur, {
              g4:        g4parts.length ? g4parts.join(' / ') : (cur.g4 || ''),
              g5:        (function(){
                // 5G: utiliser g5_rsrp si dispo (mesure simultanée 4G+5G)
                var r = sig.g5_rsrp || '';
                var q = sig.g5_rsrq || '';
                var b = sig.g5_band || '';
                if (!r && sig.type && sig.type.indexOf('5G') !== -1) {
                  r = sig.rsrp || ''; q = sig.rsrq || ''; b = sig.band || '';
                }
                var str = [r, q, b].filter(function(v){return v!==undefined&&v!==null&&v!=='';}).join(' / ');
                return str || (cur.g5 || '');
              })(),
              speedtest: spparts.length ? spparts.join(' / ') : (cur.speedtest || ''),
              operateur: sig.operator || sig.operateur || (cur.operateur || ''),
            });
            var newPmData = Object.assign({}, d.pmData);
            newPmData[target] = newPm;
            return Object.assign({}, d, { pmData: newPmData });
          }
        }
        return d;
      });
    };
    // N'écouter que pico_signal_auto (auto-fill)
    // PAS android_signal_received — sinon conflit avec le Pre-remplir manuel
    window.addEventListener('pico_signal_auto', handler);
    return function() {
      window.removeEventListener('pico_signal_auto', handler);
    };
  }, []);

  const set = useCallback((section, key, val) => setData(d=>({...d,[section]:{...d[section],[key]:val}})), []);
  const addPhoto = (sk, p) => { var photoObj = (typeof p === 'string') ? {src:p, annotated:null} : p; setData(d=>({...d,[sk]:{...d[sk],photos:[...(d[sk]&&d[sk].photos||[]),photoObj]}})); };
  const deletePhoto = (sk, i) => setData(d=>({...d,[sk]:{...d[sk],photos:(d[sk]&&d[sk].photos||[]).filter((_,idx)=>idx!==i)}}));
  const replacePhoto = (sk, i, src) => { var srcObj = (typeof src === 'string') ? {src:src, annotated:null} : src; setData(d=>({...d,[sk]:{...d[sk],photos:(d[sk]&&d[sk].photos||[]).map((p,idx)=>idx===i?srcObj:p)}})); };
  const saveAnnotGallery = (sk, i, annotated) => {
    setData(d=>({...d,[sk]:{...d[sk],photos:d[sk].photos.map((p,idx)=>idx===i?{...p,annotated}:p)}}));
    setAnnotating(null);
  };

  const handleSave = async (st=status) => {
    setSaveLabel("...");
    const pm = ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pm").length;
    const pico = ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pico").length;
    const meta = { id:auditId, type:auditType, raisonSociale:data.garde.raisonSociale, ot:data.garde.ot, date:data.garde.date, status:st, pmCount:pm, picoCount:pico };
    await saveAudit(auditId, { data, status:st });
    // Sync DB — plans photos incluses, autres photos exclues
    if (typeof syncRapportToDb === 'function') {
      syncRapportToDb(auditId, auditType, data, st).then(function(res){
        if (res && res.ok) console.log('[sync] DB OK — OT:', res.ot);
        else console.warn('[sync] DB skipped:', res && res.reason);
      }).catch(function(e){ console.warn('[sync] DB error:', e.message); });
    } else if (typeof syncRapport === 'function') {
      syncRapport(auditId, auditType, data, st); // fallback ancienne version
    }
    const list = await loadAuditList();
    const updated = list.find(a=>a.id===auditId) ? list.map(a=>a.id===auditId?meta:a) : [...list, meta];
    await saveAuditList(updated);
    setSaveLabel("✓ Sauvegardé !");
    setTimeout(()=>setSaveLabel("💾 Sauvegarder"), 2500);
  };

  if (!data) return React.createElement('div', { className:"audit-root", style:{width:"100%",background:"#020817",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontFamily:"system-ui"}}, "Chargement...");

  // Annotator overlay
  let annotatorPhoto = null;
  if (annotating) {
    if (annotating.type==="gallery") {
      const p = data[annotating.key].photos[annotating.index];
      annotatorPhoto = p.annotated||p.src;
    } else if (annotating.type==="pico") {
      annotatorPhoto = _optionalChain([data, 'access', _4 => _4.picoData, 'access', _5 => _5[annotating.label], 'optionalAccess', _6 => _6.photo]);
    }
  }

  const T = { title:{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:18,marginTop:0} };

  const picoCount = ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pico").length;

  const renderSection = () => {
    // ── INFO U / Cradlepoint routing ──────────────────────────────────────
    if (isInfoU && typeof renderInfoUSection !== 'undefined') {
      return renderInfoUSection(activeSection, data, setData);
    }
    switch (activeSection) {
      case "garde": {
        if (!data.garde) { setData(d=>({...d, garde: isAntenne ? defaultAntenneData().garde : defaultData().garde})); return null; }
        return (
        React.createElement('div', {}
          , React.createElement('h2', { style: T.title}, "🏠 Page de garde"   )
          , React.createElement(Card, { title: "Informations chantier" }
            , React.createElement(Field, { label: "Numéro d'OT" , value: data.garde.ot, onChange: v=>set("garde","ot",v), placeholder: "Ex: OT-2025-001" } )
            , React.createElement(Field, { label: "CDP Bytel" , value: data.garde.cdp, onChange: v=>set("garde","cdp",v), placeholder: "Identifiant CDP" } )
            , React.createElement(Field, { label: "Raison sociale" , value: data.garde.raisonSociale, onChange: v=>set("garde","raisonSociale",v), placeholder: "Nom de l'entreprise"  } )
            , React.createElement(Field, { label: "Adresse", value: data.garde.adresse, onChange: v=>set("garde","adresse",v), placeholder: "Adresse complète" , multiline: true} )
          )
          , React.createElement(Card, { title: "Contact client" }
            , React.createElement(Field, { label: "Nom du contact"  , value: data.garde.contact, onChange: v=>set("garde","contact",v), placeholder: "Prénom NOM" } )
            , React.createElement(Field, { label: "Téléphone", value: data.garde.telephone, onChange: v=>set("garde","telephone",v), placeholder: "01 02 03 04 05"    } )
            , React.createElement(Field, { label: "Email", value: data.garde.email, onChange: v=>set("garde","email",v), placeholder: "contact@client.fr"} )
          )
          , React.createElement(Card, { title: "Technicien"}
            , React.createElement(Field, { label: "Nom du technicien"  , value: data.garde.technicien, onChange: v=>set("garde","technicien",v), placeholder: "Prénom NOM" } )
            , React.createElement(Field, { label: "Date de l'audit"  , value: data.garde.date, onChange: v=>set("garde","date",v), placeholder: "JJ/MM/AAAA"} )
          )
          , React.createElement(Card, { title: "Photo principale du site"   }
            , data.garde.photoPrincipale ? (
              React.createElement('div', { style: {position:"relative",borderRadius:10,overflow:"hidden"}}
                , React.createElement('img', { src: data.garde.photoPrincipale, alt: "", style: {width:"100%",maxHeight:220,objectFit:"cover",display:"block"}} )
                , React.createElement('div', { style: {position:"absolute",bottom:8,right:8,display:"flex",gap:6}}
                  , React.createElement('button', { onClick: ()=>pickPhoto(src=>set("garde","photoPrincipale",src)), style: {padding:"6px 10px",borderRadius:8,border:"none",background:"#0f2040cc",color:"#93c5fd",cursor:"pointer",fontSize:12}}, "🔄 Changer" )
                  , React.createElement('button', { onClick: ()=>set("garde","photoPrincipale",null), style: {padding:"6px 10px",borderRadius:8,border:"none",background:"#ef444480",color:"#fff",cursor:"pointer",fontSize:12}}, "🗑️")
                )
              )
            ) : (
              React.createElement('div', { style: {display:"flex",gap:8}}
                , React.createElement('button', { onClick: ()=>pickPhoto(src=>set("garde","photoPrincipale",src)), style: {flex:1,padding:"14px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
                  , React.createElement('span', { style: {fontSize:24}}, "📁"), React.createElement('span', {}, "Galerie")
                )
                , React.createElement('button', { onClick: ()=>pickPhoto(src=>set("garde","photoPrincipale",src),true), style: {flex:1,padding:"14px",borderRadius:10,border:"2px dashed #1e3a5f",background:"transparent",color:"#64748b",cursor:"pointer",fontSize:13,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}
                  , React.createElement('span', { style: {fontSize:24}}, "📷"), React.createElement('span', {}, "Caméra")
                )
              )
            )
          )
        )
      );
      }

      case "preambule": {
        if (!data.preambule) { setData(d=>({...d, preambule:{notes:''}})); return null; }
        return (
        React.createElement('div', {}
          , React.createElement('h2', { style: T.title}, "📋 Préambule" )
          , React.createElement(Card, {}
            , React.createElement('div', { style: {background:"#0a1628",borderRadius:10,padding:16,fontSize:13,color:"#64748b",lineHeight:1.8,borderLeft:"3px solid #3b82f6"}}, "L'audit de couverture mobile permet de déterminer le nombre d'antennes et leurs emplacements afin de garantir une qualité du réseau 4G optimal au sein de l'entreprise."
                                       , React.createElement('br', {}), React.createElement('br', {}), "Elle survient à la suite d'une sollicitation du client qui rencontre des difficultés de connexion au réseau mobile."

            )
          )
          , React.createElement(Card, { title: "⚠️ Important" }
            , React.createElement('div', { style: {background:"#2d1505",borderRadius:10,padding:14,fontSize:13,color:"#fbbf24",lineHeight:1.7}}, "Les antennes Picos émettent exclusivement du réseau mobile "
                      , React.createElement('strong', {}, "4G"), ". Les terminaux doivent être compatibles "      , React.createElement('strong', {}, "VoLTE"), ", avec le service activé sur la ligne mobile ainsi que le service Data."
            )
          )
        )
      );
      }

      case "outils": {
        var setOutils = (k,v) => setData(d=>({...d,outils:{...d.outils,[k]:v}}));
        var _antenneData = isAntenne ? (data.antenne || {}) : {};
        var _mesures = _antenneData.mesures || [];
        var _HDRS = ['Opérateur','Band','eNB','LCID','RSRP','RSRQ','SNR>10','UPLINK','DOWNLINK','PING'];
        var _COLS = ['operateur','band','enb','lcid','rsrp','rsrq','snr','ul','dl','ping'];
        var _INP_C = {padding:'5px 3px',borderRadius:6,border:'1px solid #1e3a5f',background:'#020817',color:'#e2e8f0',fontSize:10,width:'100%',boxSizing:'border-box',textAlign:'center',fontFamily:'inherit'};
        var _updM = (i,k,v) => {
          var newM = _mesures.map((m,idx)=>idx===i?{...m,[k]:v}:m);
          setData(d=>({...d, antenne:{...d.antenne, mesures:newM}}));
        };
        var _fillSignal = (rowIdx) => {
          extractSignalAsync(function(sig) {
            if (!sig || !Object.values(sig).some(v=>v!=='')) return;
            var cur = _mesures[rowIdx]||{};
            var merged = {band:sig.band||cur.band||'',enb:sig.enb||cur.enb||'',lcid:sig.lcid||cur.lcid||'',rsrp:sig.rsrp||cur.rsrp||'',rsrq:sig.rsrq||cur.rsrq||'',snr:sig.snr||cur.snr||'',ul:sig.ul||cur.ul||'',dl:sig.dl||cur.dl||'',ping:sig.ping||cur.ping||''};
            var newM = _mesures.map((m,idx)=>idx!==rowIdx?m:{...m,...merged});
            setData(d=>({...d, antenne:{...d.antenne, mesures:newM}}));
          });
        };
        return React.createElement('div', {},
          React.createElement('h2', {style:T.title}, '📡 Outils de mesures'),
          React.createElement(Card, {},
            React.createElement('div', {style:{background:'#0a1628',borderRadius:10,padding:14,fontSize:13,color:'#64748b',lineHeight:1.7,borderLeft:'3px solid #3b82f6',marginBottom:16}},
              React.createElement('strong', {style:{color:'#93c5fd'}}, 'NETWORK CELL INFO LITE'),
              React.createElement('br', {}),
              'Logiciels : Network Cell Info Lite (Jauge) / Speedtest (Debit)'
            ),
            React.createElement(Field, {label:'Notes complémentaires', value:(data.outils||{}).notes||'', onChange:v=>set('outils','notes',v), placeholder:'Observations sur les outils utilisés...', multiline:true})
          ),
          isAntenne && React.createElement(Card, {title:'📊 Mesures radio sur site'},
            React.createElement('div', {style:{background:'#0a1628',border:'1px solid #3b82f640',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#64748b'}},
              '📶 Appuyez sur "Pré-remplir" pour capturer le signal à l\'instant T sur chaque ligne'
            ),
            _mesures.map((m,i)=> {
              var isAnt = i<3;
              return React.createElement('div', {key:i, style:(function(){ var c=rsrpBg(m.rsrp); return {marginBottom:12,background:c?c.bg:(isAnt?'#0a1800':'#000a18'),borderRadius:12,padding:12,border:'1px solid '+(c?c.border:(isAnt?'#22c55e30':'#3b82f630'))}; })()},
                React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,marginBottom:8,flexWrap:'wrap'}},
                  React.createElement('div', {style:{fontSize:11,fontWeight:700,color:isAnt?'#22c55e':'#3b82f6',flex:1}}, m.label),
                  React.createElement('button', {
                    onClick:()=>_fillSignal(i),
                    style:{background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'none',borderRadius:8,color:'#fff',padding:'7px 14px',cursor:'pointer',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:5}
                  }, '📶 Pré-remplir')
                ),
                React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3,marginBottom:3}},
                  _HDRS.map(h=>React.createElement('div',{key:h,style:{fontSize:8,color:'#475569',textAlign:'center',fontWeight:700}},h))
                ),
                React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:3}},
                  _COLS.map(col=>React.createElement('input',{key:col,value:m[col]||'',onChange:e=>_updM(i,col,e.target.value),style:_INP_C,placeholder:'—'}))
                )
              );
            })
          )
        );
      }

      case "plan": return (
        React.createElement(MultiPlanEditor, {
          plans:         data.plans || [{id:'plan_0',label:'RDC',photo:null,markers:[]}],
          pmData:        data.pmData,
          picoData:      data.picoData,
          onPlansChange: ps => setData(d=>({...d, plans:ps})),
          onPmDataChange:    pd => setData(d=>({...d,pmData:pd})),
          onPicoDataChange:  pd => setData(d=>({...d,picoData:pd})),
          isAntenne:     isAntenne
        })
      );

      case "pico": return (
        React.createElement('div', {}
          , React.createElement('h2', { style: T.title}, "📶 PICO BTS"  )
          , picoCount>0 && (
            React.createElement('div', { style: {background:"#0f2040",borderRadius:12,padding:"12px 16px",marginBottom:16,border:"1px solid #f9731630",display:"flex",alignItems:"center",gap:10}}
              , React.createElement('div', { style: {background:"#f97316",borderRadius:10,padding:"4px 12px",fontSize:14,fontWeight:800,color:"#fff"}}, picoCount)
              , React.createElement('div', { style: {fontSize:13,color:"#fb923c"}}, "PICO", picoCount>1?"s":"", " positionnée" , picoCount>1?"s":"", " sur le plan"   )
            )
          )
          , React.createElement(PicoSection, {
            plan: (data.plans&&data.plans[0]) || {photo:null,markers:[]},
            picoData: data.picoData,
            onChange: pd=>setData(d=>({...d,picoData:pd})),
            setAnnotating: ({type,label})=>setAnnotating({type,label})}
          )
        )
      );

      case "local": return (
        React.createElement('div', {}
          , React.createElement('h2', { style: T.title}, "🔧 Local Technique"  )
          , React.createElement(Card, {}
            , React.createElement('div', { style: {background:"#2d1505",borderRadius:10,padding:14,fontSize:13,color:"#fbbf24",lineHeight:1.7,marginBottom:16}}, "Précisez le nombre de U disponibles, nombre de prises électriques. Relevez le MSISDN du lien Bytel si existant (0842XXXXXX)."

            )
            , React.createElement(Field, { label: "Notes local technique"  , value: (data.local||{}).notes||'', onChange: v=>set("local","notes",v), placeholder: "U disponibles, prises, MSISDN Bytel..."    , multiline: true} )
          )
          , React.createElement(Card, { title: "Photos local technique"  }
            , React.createElement(PhotoGallery, {
              photos: (data.local&&data.local.photos)||[],
              onAdd: p=>addPhoto("local",p),
              onAnnotate: i=>setAnnotating({type:"gallery",key:"local",index:i}),
              onDelete: i=>deletePhoto("local",i),
              onReplace: i=>pickPhoto(src=>replacePhoto("local",i,src))}
            )
          )
        )
      );

      case "photos": {
        // Pour antenne: data.photos.photos / Pour audit+doe: data.reportingPhotos.photos
        var _photoKey    = isAntenne ? "photos" : "reportingPhotos";
        var _photoData   = (data[_photoKey] && data[_photoKey].photos) ? data[_photoKey].photos : [];
        var _photoTitle  = isAntenne ? "📸 Photos" : "📸 Reporting Photos";
        var _photoDesc   = isAntenne
          ? "Photos du site : antenne externe, cheminement câble, routeur, environnement."
          : "Prendre des photos sur un plan suffisamment large pour permettre aux intervenants de retrouver aisément l\'emplacement des picos.";
        return (
          React.createElement('div', {}
            , React.createElement('h2', { style: T.title}, _photoTitle)
            , React.createElement(Card, {}
              , React.createElement('div', { style: {background:"#0a1628",borderRadius:10,padding:14,fontSize:13,color:"#64748b",lineHeight:1.7,marginBottom:16,borderLeft:"3px solid #3b82f6"}}, _photoDesc)
              , React.createElement(PhotoGallery, {
                  photos: _photoData,
                  onAdd: p=>addPhoto(_photoKey, p),
                  onAnnotate: i=>setAnnotating({type:"gallery", key:_photoKey, index:i}),
                  onDelete: i=>deletePhoto(_photoKey, i),
                  onReplace: i=>pickPhoto(src=>replacePhoto(_photoKey, i, src))}
              )
            )
          )
        );
      }

      case "oeuvre": {
        const o = data.oeuvre;
        const upd = (k,v) => set("oeuvre", k, v);
        const picoMarkers = ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pico");

        // ── Cable calc ──────────────────────────────────────────────────────
        const cableDetails = picoMarkers.map(m => {
          const pd = data.picoData[m.label] || {};
          const meters = parseFloat(pd.cablage) || 0;
          const height = parseFloat(pd.hauteur) || 0;
          return { label: m.label, meters, height, total: meters + height };
        });
        const rawTotal = cableDetails.reduce((s,c)=>s+c.total, 0);
        const marge = parseFloat(o.margePercent)||0;
        const totalAvecMarge = Math.ceil(rawTotal * (1 + marge/100));

        // ── Auto height from picoData ───────────────────────────────────────
        const maxHauteurAuto = picoMarkers.reduce((max, m) => {
          const h = parseFloat((data.picoData[m.label]||{}).hauteur) || 0;
          return h > max ? h : max;
        }, 0);

        // ── Fournitures auto ────────────────────────────────────────────────
        const nb = picoMarkers.length;
        const fournituresAuto = [
          { key:"poe",          label:"Injecteur POE",        qty: nb,               unit:"u" },
          { key:"chevilles",    label:"Kit chevilles/vis",    qty: nb*4,             unit:"u" },
          { key:"colliers",     label:"Colliers de fixation", qty: nb*6,             unit:"u" },
          { key:"pieceFixation",label:"Pièce de fixation",    qty: nb,               unit:"u" },
          { key:"goulotte",     label:"Goulotte (ml)",        qty: totalAvecMarge,   unit:"ml" },
          { key:"bandeau",      label:"Bandeau prises élec.", qty: o.bandeauPrises?1:0, unit:"u" },
        ];

        // ── Toggle helper ───────────────────────────────────────────────────
        const Toggle = ({ label, val, onToggle, accent="#3b82f6", sub }) => (
          React.createElement('div', { style: {marginBottom:8}}
            , React.createElement('div', { onClick: onToggle, style: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#0a1628",borderRadius:10,cursor:"pointer",border:`1px solid ${val?accent+"60":"#1e3a5f"}`}}
              , React.createElement('span', { style: {fontSize:14,color:val?"#e2e8f0":"#64748b",fontWeight:val?600:400}}, label)
              , React.createElement('div', { style: {width:44,height:24,borderRadius:12,background:val?accent:"#1e3a5f",position:"relative",transition:"background 0.2s",flexShrink:0}}
                , React.createElement('div', { style: {position:"absolute",top:3,left:val?23:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}} )
              )
            )
            , val && sub && React.createElement('div', { style: {paddingLeft:8,marginTop:4}}, sub)
          )
        );

        // ── Recap summary ───────────────────────────────────────────────────
        const equipActifs = [
          o.nacelle && `Nacelle${o.nacelleHauteur?` ${o.nacelleHauteur}`:""}`,
          o.pirl && "PIRL",
          o.echafaudage && "Échafaudage",
          o.escabeau && `Escabeau${o.escabeauHauteur?` ${o.escabeauHauteur}`:""}`,
          o.perforateur && "Perforateur",
          o.visseuse && "Visseuse",
          o.cheminCable && "Chemin de câble",
          o.bandeauPrises && "Bandeau prises",
          o.epi && "EPI hauteur",
        ].filter(Boolean);

        return (
          React.createElement('div', {}
            , React.createElement('h2', { style: T.title}, "⚙️ Mise en œuvre"   )

            /* ── CÂBLAGE ── */
            , React.createElement(Card, { title: "📐 Calcul du câblage Ethernet"    }
              , picoMarkers.length === 0 ? (
                React.createElement('div', { style: {background:"#0a1628",borderRadius:10,padding:16,textAlign:"center",color:"#334155",fontSize:13}}, "Positionnez des PICOs sur le plan et renseignez leur câblage dans la section PICO BTS."

                )
              ) : (
                React.createElement(React.Fragment, null
                  , cableDetails.map(c=>(
                    React.createElement('div', { key: c.label, style: {background:"#0a1628",borderRadius:10,padding:"10px 14px",marginBottom:6,border:"1px solid #1e3a5f"}}
                      , React.createElement('div', { style: {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}
                        , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:8}}
                          , React.createElement('div', { style: {background:"#f97316",color:"#fff",borderRadius:8,padding:"2px 10px",fontSize:11,fontWeight:800}}, c.label)
                        )
                        , React.createElement('div', { style: {fontSize:15,fontWeight:800,color:c.total>0?"#f1f5f9":"#475569"}}, c.total>0?`${c.total} m`:"—")
                      )
                      , React.createElement('div', { style: {display:"flex",gap:16,fontSize:11,color:"#475569"}}
                        , React.createElement('span', {}, "🔌 Câble horizontal : "    , React.createElement('strong', { style: {color:"#93c5fd"}}, c.meters>0?`${c.meters}m`:"non renseigné"))
                        , React.createElement('span', {}, "📏 Hauteur montée : "    , React.createElement('strong', { style: {color:"#93c5fd"}}, c.height>0?`${c.height}m`:"non renseigné"))
                      )
                    )
                  ))
                  , React.createElement('div', { style: {background:"#1e3a5f",borderRadius:10,padding:"12px 14px",marginTop:4,display:"flex",flexDirection:"column",gap:8}}
                    , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      , React.createElement('span', { style: {fontSize:13,color:"#93c5fd"}}, "Sous-total brut" )
                      , React.createElement('span', { style: {fontSize:15,fontWeight:700,color:"#f1f5f9"}}, rawTotal, " m" )
                    )
                    , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:8}}
                        , React.createElement('span', { style: {fontSize:13,color:"#93c5fd"}}, "Marge")
                        , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:4}}
                          , [5,10,15,20].map(p=>(
                            React.createElement('button', { key: p, onClick: ()=>upd("margePercent",p), style: {padding:"3px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:o.margePercent===p?"#3b82f6":"#0a1628",color:o.margePercent===p?"#fff":"#64748b"}}, p, "%")
                          ))
                          , React.createElement('input', { type: "number", value: o.margePercent, onChange: e=>upd("margePercent",Number(e.target.value)),
                            style: {width:44,padding:"3px 6px",borderRadius:6,border:"1px solid #334155",background:"#0a1628",color:"#e2e8f0",fontSize:11,textAlign:"center"}} )
                          , React.createElement('span', { style: {fontSize:11,color:"#475569"}}, "%")
                        )
                      )
                      , React.createElement('span', { style: {fontSize:13,color:"#f59e0b",fontWeight:600}}, "+", Math.ceil(rawTotal*marge/100), " m" )
                    )
                    , React.createElement('div', { style: {borderTop:"1px solid #334155",paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      , React.createElement('span', { style: {fontSize:14,fontWeight:700,color:"#22c55e"}}, "TOTAL CÂBLE" )
                      , React.createElement('span', { style: {fontSize:22,fontWeight:800,color:"#22c55e"}}, totalAvecMarge, " m" )
                    )
                  )
                )
              )
            )

            /* ── ÉQUIPEMENTS / OUTILS ── */
            , React.createElement(Card, { title: "🔧 Équipements & outils nécessaires"    }
              , React.createElement(Toggle, { label: "Nacelle", val: o.nacelle, onToggle: ()=>upd("nacelle",!o.nacelle), accent: "#f97316",
                sub: React.createElement('input', { value: o.nacelleHauteur||"", onChange: e=>upd("nacelleHauteur",e.target.value), placeholder: "Hauteur requise (ex: 6m)"   ,
                  style: {width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #f9731640",background:"#0a1628",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}} )} )
              , React.createElement(Toggle, { label: "PIRL (Plateforme Individuelle Roulante Légère)"    , val: o.pirl, onToggle: ()=>upd("pirl",!o.pirl), accent: "#a855f7"} )
              , React.createElement(Toggle, { label: "Échafaudage", val: o.echafaudage, onToggle: ()=>upd("echafaudage",!o.echafaudage), accent: "#f59e0b"} )
              , React.createElement(Toggle, { label: "Escabeau", val: o.escabeau, onToggle: ()=>upd("escabeau",!o.escabeau), accent: "#06b6d4",
                sub: React.createElement('input', { value: o.escabeauHauteur||"", onChange: e=>upd("escabeauHauteur",e.target.value), placeholder: "Hauteur requise (ex: 3m)"   ,
                  style: {width:"100%",padding:"9px 12px",borderRadius:8,border:"1px solid #06b6d440",background:"#0a1628",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}} )} )
              , React.createElement(Toggle, { label: "EPI travaux en hauteur"   , val: o.epi, onToggle: ()=>upd("epi",!o.epi), accent: "#ef4444"} )
              , React.createElement(Toggle, { label: "Perforateur + mèches béton/métal"   , val: o.perforateur, onToggle: ()=>upd("perforateur",!o.perforateur)} )
              , React.createElement(Toggle, { label: "Visseuse électrique" , val: o.visseuse, onToggle: ()=>upd("visseuse",!o.visseuse)} )
              , React.createElement(Toggle, { label: "Chemin de câble"  , val: o.cheminCable, onToggle: ()=>upd("cheminCable",!o.cheminCable)} )
              , React.createElement(Toggle, { label: "Bandeau de prises électriques"   , val: o.bandeauPrises, onToggle: ()=>upd("bandeauPrises",!o.bandeauPrises)} )
         
            )

            /* ── MOYENS HUMAINS ── */
            , React.createElement(Card, { title: "👷 Moyens humains"  }
              /* Stepper helper */
              , [
                ["nbTechniciens","👷 Techniciens",1,1],
                ["nbJours","📅 Jours de travail",0.5,1],
              ].map(([key,lbl,step,min])=>(
                React.createElement('div', { key: key, style: {marginBottom:12}}
                  , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}, lbl)
                  , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:8,background:"#0a1628",borderRadius:10,padding:"8px 12px",border:"1px solid #1e3a5f"}}
                    , React.createElement('button', { onClick: ()=>upd(key,String(Math.max(min,(parseFloat(o[key])||min)-step))),
                      style: {width:36,height:36,borderRadius:8,border:"none",background:"#1e3a5f",color:"#93c5fd",cursor:"pointer",fontSize:20,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}, "−")
                    , React.createElement('span', { style: {flex:1,textAlign:"center",fontSize:22,fontWeight:800,color:"#f1f5f9"}}, o[key]||min)
                    , React.createElement('button', { onClick: ()=>upd(key,String((parseFloat(o[key])||min)+step)),
                      style: {width:36,height:36,borderRadius:8,border:"none",background:"#1e3a5f",color:"#93c5fd",cursor:"pointer",fontSize:20,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}, "+")
                  )
                )
              ))
              /* Total homme-jour */
              , React.createElement('div', { style: {background:"linear-gradient(135deg,#1e3a5f,#0f2040)",borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #3b82f640"}}
                , React.createElement('div', {}
                  , React.createElement('div', { style: {fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}, "Temps total chantier"  )
                  , React.createElement('div', { style: {fontSize:22,fontWeight:800,color:"#22c55e",marginTop:2}}
                    , ((parseFloat(o.nbTechniciens)||1)*(parseFloat(o.nbJours)||1)).toFixed(1), " HJ"
                  )
                )
                , React.createElement('div', { style: {textAlign:"right"}}
                  , React.createElement('div', { style: {fontSize:11,color:"#64748b"}}, "soit")
                  , React.createElement('div', { style: {fontSize:14,fontWeight:700,color:"#93c5fd"}}, o.nbTechniciens||1, " tech. × "   , o.nbJours||1, " jour" , parseFloat(o.nbJours||1)>1?"s":"")
                )
              )
              /* Qualification */
              , React.createElement('div', { style: {marginBottom:12}}
                , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Niveau de qualification requis"   )
                , React.createElement('div', { style: {display:"flex",gap:8}}
                  , ["N1","N2","N3"].map(n=>(
                    React.createElement('button', { key: n, onClick: ()=>upd("niveauQualif",n), style: {flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,background:o.niveauQualif===n?"#3b82f6":"#1e3a5f",color:o.niveauQualif===n?"#fff":"#64748b"}}, n)
                  ))
                )
              )
              /* Hauteur max — auto ou manuelle */
              , React.createElement('div', {}
                , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Hauteur de travail max"

                  , maxHauteurAuto>0 && React.createElement('span', { style: {marginLeft:8,background:"#3b82f620",color:"#93c5fd",borderRadius:6,padding:"1px 7px",fontSize:10,fontWeight:700}}, "auto : "  , maxHauteurAuto, "m depuis PICO"  )
                )
                , React.createElement('input', { value: o.hauteurTravailMax||"", onChange: e=>upd("hauteurTravailMax",e.target.value),
                  placeholder: maxHauteurAuto>0?`Proposé : ${maxHauteurAuto}m`:"Ex: 2.7m",
                  style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none"}} )
                , maxHauteurAuto>0 && !o.hauteurTravailMax && (
                  React.createElement('button', { onClick: ()=>upd("hauteurTravailMax",`${maxHauteurAuto}m`),
                    style: {marginTop:6,padding:"6px 14px",borderRadius:8,border:"none",background:"#1e3a5f",color:"#93c5fd",cursor:"pointer",fontSize:12,fontWeight:600}}, "✓ Utiliser "
                      , maxHauteurAuto, "m (depuis données PICO)"
                  )
                )
              )
            )

            /* ── FOURNITURES ── */
            , React.createElement(Card, { title: `📦 Fournitures${nb>0?` (base ${nb} PICO${nb>1?"s":""})`:"" }`}
              , fournituresAuto.map(f=>(
                React.createElement('div', { key: f.key, style: {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#0a1628",borderRadius:10,marginBottom:6,border:`1px solid ${(o.fournitures||{})[f.key]?"#3b82f660":"#1e3a5f"}`},
                  onClick: ()=>upd("fournitures",{...(o.fournitures||{}),[f.key]:!(o.fournitures||{})[f.key]})}
                  , React.createElement('div', { style: {display:"flex",alignItems:"center",gap:10}}
                    , React.createElement('div', { style: {width:20,height:20,borderRadius:5,border:`2px solid ${(o.fournitures||{})[f.key]?"#3b82f6":"#475569"}`,background:(o.fournitures||{})[f.key]?"#3b82f6":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}
                      , (o.fournitures||{})[f.key] && React.createElement('span', { style: {color:"#fff",fontSize:13,fontWeight:700}}, "✓")
                    )
                    , React.createElement('span', { style: {fontSize:13,color:(o.fournitures||{})[f.key]?"#e2e8f0":"#64748b"}}, f.label)
                  )
                  , nb>0 && React.createElement('span', { style: {fontSize:13,fontWeight:700,color:"#f59e0b",flexShrink:0}}, f.qty, " " , f.unit)
                )
              ))
              , React.createElement('div', { style: {marginTop:10}}
                , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Fournitures supplémentaires" )
                , React.createElement('textarea', { value: o.fournituresExtras||"", onChange: e=>upd("fournituresExtras",e.target.value), placeholder: "Autres fournitures spécifiques au chantier..."    , rows: 2,
                  style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:13,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}} )
              )
            )

            /* ── RÉCAP CHANTIER ── */
            , (equipActifs.length>0 || totalAvecMarge>0 || nb>0) && (
              React.createElement(Card, { title: "📋 Récapitulatif chantier"  }
                , React.createElement('div', { style: {background:"#0a1628",borderRadius:12,padding:16,border:"1px solid #22c55e30"}}
                  , nb>0 && (
                    React.createElement('div', { style: {display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #1e3a5f"}}
                      , React.createElement('span', { style: {fontSize:13,color:"#64748b"}}, "Installation")
                      , React.createElement('span', { style: {fontSize:13,fontWeight:700,color:"#f1f5f9"}}
                        , nb, " PICO BTS · "    , totalAvecMarge > 0 ? `${totalAvecMarge}m câble` : "câblage non renseigné"
                      )
                    )
                  )
                  , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",paddingBottom:10,marginBottom:10,borderBottom:"1px solid #1e3a5f"}}
                    , React.createElement('span', { style: {fontSize:13,color:"#64748b"}}, "Moyens humains" )
                    , React.createElement('span', { style: {fontSize:13,fontWeight:700,color:"#f1f5f9"}}
                      , o.nbTechniciens||1, " tech. · "   , o.nbJours||1, "j · "  , o.niveauQualif||"N2", o.hauteurTravailMax?` · max ${o.hauteurTravailMax}`:""
                    )
                  )
                  , equipActifs.length>0 && (
                    React.createElement('div', { style: {paddingBottom:10,marginBottom:10,borderBottom:"1px solid #1e3a5f"}}
                      , React.createElement('div', { style: {fontSize:13,color:"#64748b",marginBottom:6}}, "Équipements")
                      , React.createElement('div', { style: {display:"flex",flexWrap:"wrap",gap:6}}
                        , equipActifs.map(e=>(
                          React.createElement('div', { key: e, style: {background:"#1e3a5f",borderRadius:8,padding:"3px 10px",fontSize:12,fontWeight:600,color:"#93c5fd"}}, e)
                        ))
                      )
                    )
                  )
                  , React.createElement('div', { style: {display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    , React.createElement('span', { style: {fontSize:13,color:"#64748b"}}, "Durée totale estimée"  )
                    , React.createElement('span', { style: {fontSize:15,fontWeight:800,color:"#22c55e"}}
                      , ((parseFloat(o.nbTechniciens)||1)*(parseFloat(o.nbJours)||1)).toFixed(1), " HJ"
                    )
                  )
                )
              )
            )

            /* ── PRÉREQUIS CLIENT ── */
            , React.createElement(Card, { title: "✅ Prérequis client"  }
              , React.createElement('div', { style: {marginBottom:14}}
                , React.createElement('label', { style: {fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:8}}, "Besoin de VLAN ?"   )
                , React.createElement('div', { style: {display:"flex",gap:8}}
                  , ["NON","OUI"].map(v=>(
                    React.createElement('button', { key: v, onClick: ()=>upd("vlan",v), style: {flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:14,background:o.vlan===v?(v==="OUI"?"#16a34a":"#dc2626"):"#1e3a5f",color:"#fff"}}, v)
                  ))
                )
                , o.vlan==="OUI" && (
                  React.createElement('input', { value: o.vlanPort||"", onChange: e=>upd("vlanPort",e.target.value), placeholder: "Sur quel port ?"   ,
                    style: {width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #16a34a40",background:"#0a1628",color:"#e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none",marginTop:8}} )
                )
              )
              , React.createElement('div', { style: {marginBottom:14}}
                , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Solution validée par"  )
                , React.createElement('input', { value: o.validePar||"", onChange: e=>upd("validePar",e.target.value), placeholder: "M. X" ,
                  style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:14,boxSizing:"border-box",outline:"none"}} )
              )
              , React.createElement('div', {}
                , React.createElement('div', { style: {fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}, "Notes complémentaires" )
                , React.createElement('textarea', { value: o.notes||"", onChange: e=>upd("notes",e.target.value), placeholder: "Observations, contraintes particulières..."  , rows: 3,
                  style: {width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a1628",color:"#e2e8f0",fontSize:13,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit"}} )
              )
            )
          )
        );
      }

      case "acces": {
        if (!data.acces) { setData(d=>({...d, acces:{notes:''}})); return null; }
        return (
          React.createElement('div', {}
            , React.createElement('h2', { style: T.title}, "🚪 Accès site")
            , React.createElement(Card, {}
              , React.createElement(Field, { label: "Informations d'accès", value: data.acces.notes||'', onChange: v=>set("acces","notes",v), placeholder: "Contraintes, horaires, badges, RAS...", multiline: true})
            )
          )
        );
      }

      case "doe_raf": {
        var picoM = (data.plan.markers||[]).filter(function(m){return m.type==='pico';});
        return React.createElement(DoeRafSection, {
          data: data,
          onChange: function(newData){ setData(newData); },
          picoMarkers: picoM,
        });
      }

      // ── ANTENNE DÉPORTÉE sections ──────────────────────────────────────
      case "ant_prereqs": {
        if (!data.antenne) { setData(d=>({...d, antenne: defaultAntenneData().antenne})); return null; }
        var prereqs = (data.antenne.prereqs || []).map(p=> p.ok===undefined ? {...p, ok:false} : p);
        var updPr = (i,v) => {
          var newPr = prereqs.map((p,idx)=> idx===i ? {...p,ok:v} : p);
          setData(d=>({...d, antenne:{...d.antenne, prereqs:newPr}}));
        };
        return React.createElement('div', {},
          React.createElement('h2', {style:T.title}, '✅ Prérequis techniques'),
          React.createElement(Card, {},
            React.createElement('div', {style:{overflowX:'auto'}},
              React.createElement('table', {style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
                React.createElement('thead', {},
                  React.createElement('tr', {},
                    React.createElement('th', {style:{textAlign:'left',padding:'10px 14px',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',borderBottom:'2px solid #1e3a5f',background:'#0a1628'}}, 'Prérequis'),
                    React.createElement('th', {style:{textAlign:'center',padding:'10px 14px',fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',borderBottom:'2px solid #1e3a5f',background:'#0a1628',width:90}}, 'Statut')
                  )
                ),
                React.createElement('tbody', {},
                  prereqs.map((pr,i)=> {
                    var isOk = pr.ok===true;
                    return React.createElement('tr', {key:i, onClick:()=>updPr(i,!isOk), style:{cursor:'pointer',background:i%2===0?'#0d1f3c':'#0f2040'}},
                      React.createElement('td', {style:{padding:'14px 16px',borderBottom:'1px solid #1e3a5f',fontSize:13,color:isOk?'#e2e8f0':'#94a3b8',fontWeight:isOk?600:400}}, pr.label),
                      React.createElement('td', {style:{padding:'10px 14px',borderBottom:'1px solid #1e3a5f',textAlign:'center'}},
                        React.createElement('div', {style:{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 14px',borderRadius:20,background:isOk?'#052010':'#200505',border:'1px solid '+(isOk?'#22c55e60':'#ef444440'),fontSize:12,fontWeight:700,color:isOk?'#22c55e':'#ef4444',minWidth:60}},
                          isOk?'✓ OK':'✗ NOK'
                        )
                      )
                    );
                  })
                )
              )
            )
          )
        );
      }

      case "ant_plans": {
        if (!data.antenne) { setData(d=>({...d, antenne: defaultAntenneData().antenne})); return null; }
        var updAnt = (k,v) => setData(d=>({...d, antenne:{...d.antenne,[k]:v}}));
        return React.createElement('div', {},
          React.createElement('h2', {style:T.title}, '🗺️ Plans & Travaux'),
          React.createElement(Card, {title:'Cheminement câble'},
            React.createElement(Field, {label:'Notes cheminement / câblage', value:data.antenne.cheminement||'', onChange:v=>updAnt('cheminement',v), multiline:true, placeholder:'Décrire le cheminement...'})
          )
        );
      }

      case "ant_conclusion": {
        if (!data.antenne) { setData(d=>({...d, antenne: defaultAntenneData().antenne})); return null; }
        var a = data.antenne;
        var updA = (k,v) => setData(d=>({...d, antenne:{...d.antenne,[k]:v}}));
        return React.createElement('div', {},
          React.createElement('h2', {style:T.title}, '📝 Conclusion'),
          React.createElement(Card, {title:'Câble coaxial'},
            React.createElement(Field, {label:'Longueur estimée (m)', value:a.longueurCoax||'', onChange:v=>updA('longueurCoax',v), placeholder:'Ex: 15'}),
            React.createElement(Field, {label:'Marge (%)', value:a.margePercent||'10', onChange:v=>updA('margePercent',v)})
          ),
          React.createElement(Card, {title:'Ressources'},
            React.createElement(Field, {label:'Nb techniciens', value:a.nbTechniciens||'2', onChange:v=>updA('nbTechniciens',v)}),
            React.createElement(Field, {label:'Nb jours', value:a.nbJours||'1', onChange:v=>updA('nbJours',v)})
          ),
          React.createElement(Card, {title:'Notes'},
            React.createElement(Field, {label:'Observations', value:a.finConclusion||'', onChange:v=>updA('finConclusion',v), multiline:true})
          )
        );
      }

      // ── CEL-FI QUATRA sections ─────────────────────────────────────────────
      case "celfi_units": {
        if (!data.celfi) { setData(function(d){return {...d,celfi:defaultCelfiData().celfi};}); return null; }
        return React.createElement(CelfiUnitsSection, {celfi:data.celfi, onChange:function(c){setData(function(d){return {...d,celfi:c};});}});
      }
      case "celfi_mesures": {
        if (!data.celfi) { setData(function(d){return {...d,celfi:defaultCelfiData().celfi};}); return null; }
        return React.createElement(CelfiMesuresSection, {celfi:data.celfi, onChange:function(c){setData(function(d){return {...d,celfi:c};});}});
      }

      // ── WIFI sections ──────────────────────────────────────────────────────
      case "wifi_bornes": {
        if (!data.wifi) { setData(function(d){return {...d,wifi:defaultWifiData().wifi};}); return null; }
        return React.createElement(WifiBornesSection, {wifi:data.wifi, onChange:function(w){setData(function(d){return {...d,wifi:w};});}});
      }
      case "wifi_mesures": {
        if (!data.wifi) { setData(function(d){return {...d,wifi:defaultWifiData().wifi};}); return null; }
        return React.createElement(WifiMesuresSection, {wifi:data.wifi, onChange:function(w){setData(function(d){return {...d,wifi:w};});}});
      }

      // ── STARLINK sections ──────────────────────────────────────────────────
      case "starlink_prereqs": {
        if (!data.starlink) { setData(function(d){return {...d,starlink:defaultStarlinkData().starlink};}); return null; }
        return React.createElement(StarlinkPrereqsSection, {starlink:data.starlink, onChange:function(s){setData(function(d){return {...d,starlink:s};});}});
      }
      case "starlink_install":
      case "ant_mesures": {
        if (!data.starlink) { setData(function(d){return {...d,starlink:defaultStarlinkData().starlink};}); return null; }
        return React.createElement('div', {},
          React.createElement(StarlinkInstallSection, {starlink:data.starlink, onChange:function(s){setData(function(d){return {...d,starlink:s};});}}),
          React.createElement(StarlinkComparativeSection, {starlink:data.starlink, onChange:function(s){setData(function(d){return {...d,starlink:s};});}})
        );
      }


      default: return null;
    }
  };

  return (
    React.createElement('div', { className:"audit-root", style:{width:"100%",background:"#020817",minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#f1f5f9",position:"relative"}}
      /* Import PDF modal */
      , showImportPDF && React.createElement('div', {style:{position:'fixed',inset:0,background:'#000c',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}},
        React.createElement('div', {style:{background:'#0f2040',borderRadius:16,padding:24,maxWidth:360,width:'100%',border:'1px solid #334155'}},
          React.createElement('div',{style:{fontSize:15,fontWeight:700,color:'#f1f5f9',marginBottom:6}}, '📥 Importer un rapport Audit PICO'),
          React.createElement('div',{style:{fontSize:12,color:'#64748b',marginBottom:16,lineHeight:1.6}},
            "Sélectionnez un PDF généré par l'app Audit PICO. Les champs seront pré-remplis automatiquement (OT, client, technicien, mesures PM, câblage…)"
          ),
          importStatus && React.createElement('div',{style:{fontSize:13,fontWeight:600,marginBottom:12,
            color:importStatus.startsWith('✅')?'#22c55e':importStatus.startsWith('❌')?'#ef4444':'#f59e0b'}}, importStatus),
          React.createElement('label',{style:{display:'block',width:'100%',padding:'14px',borderRadius:10,
            border:'2px dashed #1e3a5f',background:'transparent',color:'#3b82f6',
            cursor:'pointer',fontSize:14,fontWeight:600,textAlign:'center',boxSizing:'border-box'}},
            '📄 Choisir le fichier PDF',
            React.createElement('input',{type:'file',accept:'application/pdf',style:{display:'none'},
              onChange:async function(e){
                var f=e.target.files[0]; if(!f) return;
                setImportStatus('⏳ Analyse du PDF…');
                var parsed = await parsePicoPDF(f);
                if(!parsed){setImportStatus('❌ Impossible de lire ce PDF.');return;}
                setData(function(d){return{...parsed,doe:d.doe||defaultDoeData().doe};});
                setImportStatus('✅ Données importées !');
                setShowImportPDF(false);
                setTimeout(function(){setImportStatus('');},3000);
                e.target.value='';
              }})
          ),
          React.createElement('button',{onClick:function(){setShowImportPDF(false);setImportStatus('');},
            style:{marginTop:12,width:'100%',padding:'10px',borderRadius:10,border:'1px solid #334155',
              background:'transparent',color:'#64748b',cursor:'pointer',fontSize:14}}, 'Annuler')
        )
      )
      /* Annotator */
      , annotating && annotatorPhoto && (
        React.createElement(PhotoAnnotator, {
          photo: annotatorPhoto,
          onSave: (annotated)=>{
            if (annotating.type==="gallery") saveAnnotGallery(annotating.key, annotating.index, annotated);
            else if (annotating.type==="pico") {
              setData(d=>({...d, picoData:{...d.picoData, [annotating.label]:{...d.picoData[annotating.label], photo:annotated}}}));
              setAnnotating(null);
            }
          },
          onCancel: ()=>setAnnotating(null)}
        )
      )

      , showPreview && React.createElement(PDFPreview, { data: data, auditType: auditType, onClose: ()=>setShowPreview(false)} )

      /* Side nav */
      , showNav && (
        React.createElement('div', { style: {position:"fixed",inset:0,zIndex:1500,display:"flex"}}
          , React.createElement('div', { style: {width:280,background:"#0f2040",borderRight:"1px solid #1e3a5f",display:"flex",flexDirection:"column",overflowY:"auto"}}
            , React.createElement('div', { style: {padding:"20px 18px",borderBottom:"1px solid #1e3a5f"}}
              , React.createElement('div', { style: {fontSize:14,fontWeight:800,color:"#f1f5f9"}}, data.garde.raisonSociale||"Audit sans titre")
            , profile && React.createElement('div', { style:{display:"flex",alignItems:"center",gap:8,marginTop:10,paddingTop:8,borderTop:"1px solid #1e3a5f"}},
                React.createElement('div', { style:{width:26,height:26,borderRadius:"50%",
                  background:typeof getAvatarColor!=="undefined"?getAvatarColor(profile.name):"#3b82f6",
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}},
                  typeof initials!=="undefined"?initials(profile.name):profile.name.slice(0,2).toUpperCase()),
                React.createElement('div', { style:{flex:1,minWidth:0} },
                  React.createElement('div', {style:{fontSize:12,color:"#64748b"}}, profile.name),
                  profile.phone && React.createElement('div', {style:{fontSize:10,color:"#475569"}}, '📞 '+profile.phone),
                  profile.expiryDate && React.createElement('div', {style:{fontSize:10,color:(function(){
                    var t=new Date();t.setHours(0,0,0,0);
                    var e=new Date(profile.expiryDate);e.setHours(0,0,0,0);
                    return Math.round((e-t)/86400000)<=7?'#f59e0b':'#475569';
                  })()}},
                    (function(){
                      var t=new Date();t.setHours(0,0,0,0);
                      var e=new Date(profile.expiryDate);e.setHours(0,0,0,0);
                      var d=Math.round((e-t)/86400000);
                      if(d<0)return '⛔ Expiré';
                      if(d===0)return '⚠️ Expire aujourd\'hui';
                      if(d<=7)return '⚠️ '+d+'j restants';
                      return '📅 '+e.toLocaleDateString('fr-FR');
                    })()
                  )
                ),
                React.createElement('button', {onClick:onSwitchProfile,style:{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:11,padding:"2px 4px"}}, "Changer")
              )
              , React.createElement('div', { style: {fontSize:11,color:"#475569",marginTop:3}}, "OT : "  , data.garde.ot||"—")
              , React.createElement('div', { style: {fontSize:11,color:"#475569",marginTop:2}}
                , ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pm").length, " PM · "   , ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pico").length, " PICO"
              )
            )
            , (function(){var _isFin=isDOE&&data&&data.doe&&data.doe.finalise; return (isDOE ? DOE_SECTIONS : SECTIONS).map(sec=>{var _d=_isFin&&(sec.id==="oeuvre"||sec.id==="acces"); return React.createElement('button', { key: sec.id, onClick: _d?function(){}:()=>{setActiveSection(sec.id);setShowNav(false);},
                style: {padding:"14px 18px",border:"none",background:activeSection===sec.id?"#1e3a5f":"transparent",color:_d?"#1e3a5f30":activeSection===sec.id?"#93c5fd":"#64748b",cursor:_d?"not-allowed":"pointer",textAlign:"left",fontSize:14,fontWeight:activeSection===sec.id?700:400,display:"flex",alignItems:"center",gap:12,opacity:_d?0.3:1}}
                , React.createElement('span', {}, sec.icon)
                , React.createElement('span', {}, sec.label)
                , sec.id==="pico" && picoCount>0 && React.createElement('span', { style: {marginLeft:"auto",background:"#f97316",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700}}, picoCount)
                , sec.id==="plan" && ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pm").length>0 && React.createElement('span', { style: {marginLeft:"auto",background:"#3b82f6",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700}}, ((data.plans&&data.plans.flatMap(p=>p.markers||[]))||[]).filter(m=>m.type==="pm").length)
              ); }); })()
            , React.createElement('div', { style: {marginTop:"auto",padding:16,display:"flex",flexDirection:"column",gap:8,borderTop:"1px solid #1e3a5f"}}
              , React.createElement('div', {}
                , React.createElement('div', { style: {fontSize:11,color:"#475569",marginBottom:6,fontWeight:700,textTransform:"uppercase"}}, "Statut")
                , React.createElement('div', { style: {display:"flex",gap:6}}
                  , ["Brouillon","En cours","Terminé"].map(st=>(
                    React.createElement('button', { key: st, onClick: ()=>setStatus(st), style: {flex:1,padding:"7px 4px",borderRadius:7,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:status===st?"#3b82f6":"#1e3a5f",color:"#fff"}}, st)
                  ))
                )
              )
              , React.createElement('button', { onClick: ()=>{handleSave();setShowNav(false);}, style: {padding:"12px",borderRadius:10,border:"none",background:"#3b82f6",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}, saveLabel)
              
            , isDOE && React.createElement('button', { onClick: ()=>{setShowImportPDF(true);setShowNav(false);},
                style:{padding:"11px",borderRadius:10,border:"1px solid #22c55e40",background:"transparent",color:"#22c55e",cursor:"pointer",fontWeight:600,fontSize:13,width:"100%",marginTop:4}},
              "📥 Importer un PDF Audit PICO"  )
              
              , !isDOE && onCreateDOE && data && React.createElement('button', { id:'create-doe-btn', onClick: async function() { var b=document.getElementById('create-doe-btn'); if(b){b.textContent='⏳ Création...';b.disabled=true;} try{ await onCreateDOE(auditId,data); } catch(e){ alert('Erreur: '+e.message); if(b){b.textContent='📋 Créer DOE depuis cet audit';b.disabled=false;} } }, style:{padding:'11px',borderRadius:10,border:'2px solid #f59e0b60',background:'#78350f20',color:'#f59e0b',cursor:'pointer',fontWeight:700,fontSize:13,width:'100%',marginTop:4}}, '📋 Créer DOE depuis cet audit')
              , React.createElement('button', { id:"word-btn", onClick: async ()=>{ var btn=document.getElementById('word-btn'); if(btn){btn.textContent='⏳ Word...';btn.disabled=true;} try{ await window.generateWord(Object.assign({},data,{docType:auditType,garde:Object.assign({},data.garde,{technicienPhone:profile&&profile.phone?profile.phone:''})})); if(btn){btn.textContent='✅ Téléchargé!';setTimeout(function(){btn.textContent='📝 Générer Rapport Word';btn.disabled=false;},3000);} }catch(e){ alert('Erreur Word: '+e.message); if(btn){btn.textContent='📝 Générer Rapport Word';btn.disabled=false;} } setShowNav(false); }, style: {padding:"12px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,width:"100%"}}, "📝 Générer Rapport Word"  )
            , React.createElement('button', { id:"word-mail-btn", onClick: async function(){
                var btn=document.getElementById('word-mail-btn');
                var _defEmail = (profile&&profile.defaultEmail)||""; var email = window.prompt("Adresse email du destinataire :", _defEmail);
                if (!email || !email.includes('@')) return;
                if(btn){btn.textContent='⏳ Envoi...';btn.disabled=true;}
                try {
                  var payload = Object.assign({},data,{docType:auditType,garde:Object.assign({},data.garde,{technicienPhone:profile&&profile.phone?profile.phone:''})});
                  var blob = await window.generateWord(payload, true); // true = return blob
                  if (!blob) { alert('Erreur: rapport Word non généré.'); throw new Error('no blob'); }
                  await envoyerRapportEmail(data.garde&&data.garde.ot||'rapport', blob, email,
                    (isDOE?'DOE':'Audit')+' '+(auditType||'PICO'));
                  if(btn){btn.textContent='✅ Mail envoyé!';setTimeout(function(){btn.textContent='📧 Envoyer par Mail';btn.disabled=false;},3000);}
                } catch(e) {
                  alert('Erreur envoi: '+e.message);
                  if(btn){btn.textContent='📧 Envoyer par Mail';btn.disabled=false;}
                }
              }, style:{padding:"12px",borderRadius:10,border:"none",background:"#0369a1",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14,width:"100%",marginTop:6}}, "📧 Envoyer par Mail"  )
            , isDOE && React.createElement('button', { id:"doe-word-btn", onClick: async ()=>{
                var b=document.getElementById('doe-word-btn'); if(b){b.textContent='⏳ Word...';b.disabled=true;}
                try{await window.generateWord(Object.assign({},data,{docType:'doe',garde:Object.assign({},data.garde,{technicienPhone:profile&&profile.phone?profile.phone:''})}));if(b){b.textContent='✅ OK!';setTimeout(function(){b.textContent='📝 Générer DOE Word';b.disabled=false;},3000);}}
                catch(e){alert('Erreur: '+e.message);if(b){b.textContent='📝 Générer DOE Word';b.disabled=false;}}
                setShowNav(false);
              },style:{padding:"11px",borderRadius:10,border:"none",background:"#22c55e",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,width:"100%",marginTop:4}
            }, "📝 Générer DOE Word"  )
            , isDOE && React.createElement('div',{
                style:{padding:"9px 12px",borderRadius:10,border:"1px solid #22c55e30",
                  color:data.doe&&data.doe.finalise?"#22c55e":"#f59e0b",
                  fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:8,
                  cursor:"pointer",marginTop:4},
                onClick:()=>{setActiveSection('doe_raf');setShowNav(false);}},
              React.createElement('span',null,data.doe&&data.doe.finalise?'✅':'⏳'),
              React.createElement('span',null,'RAF : '+(data.doe&&data.doe.finalise?'Finalisé':'Non finalisé'))
            )
            )
          )
          , React.createElement('div', { style: {flex:1,background:"#00000080"}, onClick: ()=>setShowNav(false)} )
        )
      )

      /* Header */
      , React.createElement('div', { style: {background:"#0f2040",padding:"13px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #1e3a5f",position:"sticky",top:0,zIndex:100}}
        , React.createElement('button', { onClick: onBack, style: {background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:20,padding:2}}, "←")
        , React.createElement('div', { style: {flex:1,minWidth:0}}
          , React.createElement('div', { style: {fontSize:14,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, data.garde.raisonSociale||"Nouvel audit")
          , React.createElement('div', { style: {fontSize:10,color:"#475569"}}, _optionalChain([(isDOE ? DOE_SECTIONS : SECTIONS), 'access', _7 => _7.find, 'call', _8 => _8(s=>s.id===activeSection), 'optionalAccess', _9 => _9.label]))
        )
        , React.createElement('button', { onClick: ()=>handleSave(), style: {background:"#3b82f620",border:"1px solid #3b82f640",color:"#93c5fd",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}, saveLabel)
        , React.createElement('button', { onClick: ()=>setShowNav(true), style: {background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:22,padding:2}}, "☰")
        , profile && React.createElement('div', {
            onClick: onSwitchProfile,
            style:{width:32,height:32,borderRadius:"50%",flexShrink:0,cursor:"pointer",
              background:typeof getAvatarColor!=="undefined"?getAvatarColor(profile.name):"#3b82f6",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:800,color:"#fff",border:"2px solid #1e3a5f"},
            title:"Changer de profil"},
          typeof initials!=="undefined"?initials(profile.name):profile.name.slice(0,2).toUpperCase()
        )
      )

      /* Content */
      , React.createElement('div', { style: {padding:"20px 16px",paddingBottom:"calc(var(--tab-height, 56px) + 30px)"}}, renderSection())

      /* Bottom tab bar */
      , React.createElement('div', { style: {position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%"}, className:"audit-tab-bar-fixed", style:{width:"100%",background:"#0f2040",borderTop:"2px solid #1e3a5f",display:"flex",zIndex:100,overflowX:"auto",paddingBottom:"env(safe-area-inset-bottom, 0px)"}}
        , (isAntenne ? ANTENNE_SECTIONS : isCelfi ? CELFI_SECTIONS : isWifi ? WIFI_SECTIONS : isInfoU ? (typeof INFOU_SECTIONS!=='undefined'?INFOU_SECTIONS:STARLINK_SECTIONS) : isStarlink ? STARLINK_SECTIONS : isDOE ? DOE_SECTIONS : SECTIONS).map(sec=>(
          React.createElement('button', { key: sec.id, onClick: ()=>setActiveSection(sec.id),
            style: {
              flex:"0 0 auto", padding:"8px 12px 4px", border:"none", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:1,
              background: activeSection===sec.id ? "rgba(0,123,255,0.12)" : "transparent",
              borderBottom: activeSection===sec.id ? "3px solid #007bff" : "3px solid transparent",
              position:"relative", transition:"background 0.15s"
            }}
            , React.createElement('span', {
                style:{
                  fontSize: 22, // +30% vs 17
                  opacity: activeSection===sec.id ? 1 : 0.45,
                  filter: activeSection===sec.id ? "brightness(1.6)" : "none",
                  lineHeight: 1
                }
              }, sec.icon)
            , React.createElement('span', {
                style:{
                  fontSize:8, fontWeight:700, whiteSpace:"nowrap",
                  color: activeSection===sec.id ? "#007bff" : "#475569",
                  marginTop:2
                }
              }, sec.label.split(" ")[0])
            , sec.id==="pico" && picoCount>0 && React.createElement('span', {
                style:{position:"absolute",top:4,right:4,background:"#f97316",color:"#fff",
                  borderRadius:8,padding:"0 4px",fontSize:9,fontWeight:800,lineHeight:"14px"}
              }, picoCount)
          )
        ))
      )
    )
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

/* ── Profile selector screen ───────────────────────────────────────── */
var AVATAR_COLORS = ['#3b82f6','#f97316','#22c55e','#a855f7','#ef4444','#f59e0b','#06b6d4','#ec4899'];

function getAvatarColor(name) {
  var h = 0;
  for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name) {
  var parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}


// ── Login par identifiant ─────────────────────────────────────────────────────
var todayUsername = (function() {
  var d = new Date();
  var dd = String(d.getDate()).padStart(2,'0');
  var mm = String(d.getMonth()+1).padStart(2,'0');
  var yy = String(d.getFullYear()).slice(-2);
  return dd + mm + yy;
})();

function findProfileByUsername(username) {
  var profiles = getProfiles();
  if (!username) return null;
  var u = username.trim().toLowerCase();
  return profiles.find(function(p) {
    if (p.username && p.username.toLowerCase() === u) return true;
    var def = (function() {
      if (!p.createdAt) return todayUsername;
      var d = new Date(p.createdAt);
      var dd = String(d.getDate()).padStart(2,'0');
      var mm = String(d.getMonth()+1).padStart(2,'0');
      var yy = String(d.getFullYear()).slice(-2);
      return dd + mm + yy;
    })();
    return def === u;
  }) || null;
}

function UsernameLoginScreen({ onSelect }) {
  var _sui = React.useState(''); var usernameInput = _sui[0]; var setUsernameInput = _sui[1];
  var _spwd = React.useState(''); var pwdInput = _spwd[0]; var setPwdInput = _spwd[1];
  var _serr = React.useState(''); var loginError = _serr[0]; var setLoginError = _serr[1];

  var handleUsernameLogin = function() {
    var inputU = usernameInput || (document.querySelector('input[type=text]')||document.querySelector('input:not([type=password])')||{}).value || '';
var prof = findProfileByUsername(inputU);
if (!prof) { setLoginError('Identifiant inconnu — saisir manuellement'); return; }

    // ── Vérification expiration ──────────────────────────────────────────
    var now = Date.now();
    if (prof.expiryDate) {
      var exp = new Date(prof.expiryDate).getTime();
      if (!isNaN(exp) && now > exp) { setLoginError('Profil expiré — contactez votre administrateur'); return; }
    }

    // ── Vérification mot de passe ────────────────────────────────────────
    var hash = pwdInput ? hashPwd(pwdInput) : null;
    if (prof.pwdHash && hash !== prof.pwdHash) { setLoginError('Mot de passe incorrect'); return; }

    // ── Vérification association téléphone ───────────────────────────────
    if (!prof.isAdmin) {
      var currentDevice = getDeviceId();
      // Legacy single deviceId check (pour profils anciens)
      if (prof.deviceId && prof.deviceId !== '' && prof.deviceId !== currentDevice
          && !prof.deviceId_mobile && !prof.deviceId_desktop) {
        setLoginError('Ce compte est déjà associé à un autre appareil. Contactez admin_omar pour le réinitialiser.');
        return;
      }
      // Premier login sur cet appareil : associer selon le type (mobile ou desktop)
      var devType = getDeviceType();
      var mobileId  = prof.deviceId_mobile  || '';
      var desktopId = prof.deviceId_desktop || '';
      var currentOk = (devType==='mobile' && mobileId===currentDevice)
                   || (devType==='desktop' && desktopId===currentDevice)
                   || (prof.deviceId===currentDevice); // legacy

      if (!currentOk) {
        // Vérifier qu'il n'y a pas déjà un autre appareil du même type associé
        if (devType==='mobile'  && mobileId  && mobileId  !== currentDevice) {
          setLoginError('Un mobile est déjà associé à ce compte. Contactez admin_omar pour le réinitialiser.');
          return;
        }
        if (devType==='desktop' && desktopId && desktopId !== currentDevice) {
          setLoginError('Un ordinateur est déjà associé à ce compte. Contactez admin_omar pour le réinitialiser.');
          return;
        }
        // Associer le nouvel appareil
        var info = getDeviceInfo();
        var devInfo = (info.model||info.browser||devType)+' — '+new Date().toLocaleDateString('fr');
        var updPatch = {};
        if (devType==='mobile')  { updPatch.deviceId_mobile=currentDevice;  updPatch.deviceInfo_mobile=devInfo; }
        if (devType==='desktop') { updPatch.deviceId_desktop=currentDevice; updPatch.deviceInfo_desktop=devInfo; }
        // Legacy compat
        if (!prof.deviceId) updPatch.deviceId = currentDevice;
        var updatedProf = Object.assign({}, prof, updPatch);
        var profiles = getProfiles();
        saveProfiles(profiles.map(function(p){ return p.id===prof.id ? updatedProf : p; }));
        prof = updatedProf;
      }
    }

    setLoginError('');
    onSelect(prof);
  };

  var INP = { width:'100%', padding:'14px 16px', borderRadius:12, border:'1px solid #1e3a5f',
    background:'#0a1628', color:'#f1f5f9', fontSize:15, outline:'none',
    fontFamily:'inherit', boxSizing:'border-box' };

  return React.createElement('div', {style:{minHeight:'100dvh',background:'#020817',
    display:'flex',alignItems:'flex-start',justifyContent:'center',
    paddingTop:'12vh',paddingLeft:'24px',paddingRight:'24px',paddingBottom:'24px'}},
    React.createElement('div', {style:{width:'100%',maxWidth:400}},
      React.createElement('div', {style:{textAlign:'center',marginBottom:32}},
        React.createElement('div', {style:{fontSize:48,marginBottom:12}}, '📡'),
        React.createElement('div', {style:{fontSize:22,fontWeight:800,color:'#f1f5f9',marginBottom:4}},
          'Générateur de Rapport'),
        React.createElement('div', {style:{fontSize:13,color:'#64748b'}}, 'Bouygues — Connexion')
      ),
      React.createElement('div', {style:{background:'#0f2040',borderRadius:20,padding:24,
        border:'1px solid #1e3a5f'}},
        React.createElement('div', {style:{fontSize:11,fontWeight:700,color:'#64748b',
          textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}},
          'Identifiant de connexion'),
        React.createElement('input', {
          value: usernameInput,
          onChange: function(e){ setUsernameInput(e.target.value); setLoginError(''); },
          onKeyDown: function(e){ if(e.key==='Enter') handleUsernameLogin(); },
          placeholder: 'Ex: ' + todayUsername + ' (date du jour)',
          style: INP, autoComplete:'off'
        }),
        React.createElement('div', {style:{fontSize:11,fontWeight:700,color:'#64748b',
          textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,marginTop:16}},
          'Mot de passe'),
        React.createElement('input', {
          type: 'password',
          value: pwdInput,
          onChange: function(e){ setPwdInput(e.target.value); setLoginError(''); },
          onKeyDown: function(e){ if(e.key==='Enter') handleUsernameLogin(); },
          placeholder: '••••••••',
          style: INP
        }),
        loginError && React.createElement('div', {style:{color:'#ef4444',fontSize:13,
          marginTop:8,textAlign:'center'}}, loginError),
        React.createElement('button', {
          onClick: handleUsernameLogin,
          style:{width:'100%',marginTop:20,padding:'14px',borderRadius:12,border:'none',
            background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',
            fontWeight:800,fontSize:15,cursor:'pointer'}
        }, 'Continuer →')
      )
    )
  );
}

function ProfileSelectorScreen({ onSelect, initialAdminSession }) {
  var _s1 = useState(getProfiles());
  var profiles = _s1[0], setProfiles = _s1[1];

  // Supabase initial sync
  var _sbRef = React.useRef(false);
  React.useEffect(function() {
    if (_sbRef.current) return;
    _sbRef.current = true;
    if (window._sbInitSync) {
      window._sbInitSync().then(function() {
        // Refresh profiles from localStorage (now updated by sync)
        setProfiles(getProfiles());
      }).catch(function(e){ console.warn('sync error:', e); });
    }
    // Also refresh when sync completes
    if (window.onSbSync) {
      onSbSync(function() { setProfiles(getProfiles()); });
    }
  }, []);

  // Auto-login from QR scan (window._qrAutoLogin set at startup)
  var _qlRef = React.useRef(false);
  React.useEffect(function() {
    if (_qlRef.current || !window._qrAutoLogin) return;
    _qlRef.current = true;
    var qd = window._qrAutoLogin;
    window._qrAutoLogin = null;
    var prof = profiles.find(function(p){ return p.id===qd.id; });
    if (!prof || !prof.active) return;
    // Update temp pwd to match QR content
    var updP = profiles.map(function(p){
      return p.id===prof.id ? {...p, tempPwdHash:hashPwd(qd.p), tempPwdClear:null} : p;
    });
    saveProfiles(updP);
    setProfiles(updP);
    // Pre-fill login modal
    setLoginProf(prof);
    setPwdInput(qd.p);
  }, []);

  // Which profile card is in "login" mode
  var _s2 = useState(null);
  var loginProf = _s2[0], setLoginProf = _s2[1];
  var _s3 = useState('');
  var pwdInput = _s3[0], setPwdInput = _s3[1];
  var _s4 = useState('');
  var pwdError = _s4[0], setPwdError = _s4[1];
  // Admin panel state
  var _pendingAdmin = typeof window.__pendingAdminLogin !== 'undefined' ? window.__pendingAdminLogin : null;
  if (_pendingAdmin) { window.__pendingAdminLogin = undefined; }
  var _s5 = useState(!!(initialAdminSession||_pendingAdmin));
  var showAdmin = _s5[0], setShowAdmin = _s5[1];
  var _s6 = useState(initialAdminSession||_pendingAdmin||null);
  var adminSession = _s6[0], setAdminSession = _s6[1]; // the logged-in admin profile
  // New profile form (admin only)
  var _s7 = useState(false);
  var showAdd = _s7[0], setShowAdd = _s7[1];
  var _s8 = useState({ name:'', phone:'', username:'', pwd:'', pwd2:'', expiry:'' });
  var newProf = _s8[0], setNewProf = _s8[1];
  // Edit profile (admin)
  var _s9 = useState(null);
  var editTarget = _s9[0], setEditTarget = _s9[1];
  var _s10 = useState({ name:'', phone:'', username:'', pwd:'', pwd2:'' });
  var editForm = _s10[0], setEditForm = _s10[1];
  // Change own password
  var _s11 = useState(false);
  var showChangePwd = _s11[0], setShowChangePwd = _s11[1];
  var _s12 = useState({ old:'', new1:'', new2:'' });
  var changePwdForm = _s12[0], setChangePwdForm = _s12[1];
  var _s13 = useState('');
  var changePwdError = _s13[0], setChangePwdError = _s13[1];
  var _s14 = useState(false);
  var showRecovery = _s14[0], setShowRecovery = _s14[1];
  var _s15 = useState('');
  var recoveryCode = _s15[0], setRecoveryCode = _s15[1];
  var _s16 = useState('');
  var recoveryError = _s16[0], setRecoveryError = _s16[1];
  var _s17 = useState(false);
  var recoverySuccess = _s17[0], setRecoverySuccess = _s17[1];
  var _s18 = useState(null);
  var showQR = _s18[0], setShowQR = _s18[1]; // prof object being shown
  var _s19 = useState(localStorage.getItem('__app_url__')||'');
  var appUrl = _s19[0], setAppUrl = _s19[1];

  var reload = function(){ setProfiles(getProfiles()); };

  var generateTempPwd = function() {
    // Generate a readable 8-char temporary password
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var pwd = '';
    var arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    for (var i = 0; i < 8; i++) pwd += chars[arr[i] % chars.length];
    return pwd;
  };

  var handleGenerateQR = function(prof) {
    // Generate a temp password, save it hashed, set expiry 1 month
    var tempPwd = generateTempPwd();
    var expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 1);
    var expiryStr = expiry.toISOString().split('T')[0];
    var updated = profiles.map(function(p) {
      if (p.id !== prof.id) return p;
      return { ...p,
        tempPwdHash: hashPwd(tempPwd),
        tempPwdClear: tempPwd,       // kept temporarily for QR display only
        tempExpiry: expiryStr,
        expiryDate: expiryStr,       // also sets profile expiry
        active: true
      };
    });
    saveProfiles(updated);
    setProfiles(updated);
    // Show QR with the clear temp password
    var updatedProf = { ...prof, tempPwdClear: tempPwd, tempExpiry: expiryStr, expiryDate: expiryStr };
    setShowQR(updatedProf);
  };

  var handleRecovery = function() {
    if (!checkRecoveryCode(recoveryCode)) {
      setRecoveryError('Code de récupération incorrect.');
      return;
    }
    // Reset Omar's password hash
    localStorage.removeItem('__omar_pwd__');
    var updated = getProfiles().map(function(p){
      if(p.id !== ADMIN_ID) return p;
      return { ...p, pwdHash:null, needSetup:true };
    });
    saveProfiles(updated);
    setProfiles(getProfiles());
    setRecoverySuccess(true);
    setRecoveryCode('');
    setRecoveryError('');
  };

  // ── Login flow ──────────────────────────────────────────────────────────
  var handleCardClick = function(prof) {
    if (!prof.active) return; // disabled
    // Auto-check expiry date
    if (prof.expiryDate && !prof.isAdmin) {
      var today = new Date(); today.setHours(0,0,0,0);
      var expiry = new Date(prof.expiryDate); expiry.setHours(0,0,0,0);
      if (expiry < today) {
        // Auto-disable expired profile
        var updated = profiles.map(function(p){ return p.id===prof.id ? {...p,active:false} : p; });
        saveProfiles(updated); setProfiles(updated);
        return; // blocked - shows as disabled
      }
    }
    if (!prof.pwdHash) {
      if (prof.isAdmin) {
        // Omar sets his own password on first launch
        setLoginProf(prof);
        setPwdInput('');
        setPwdError('first_setup');
        return;
      }
      // Regular user — admin must set password first
      alert('Votre compte n\'a pas encore de mot de passe.\nContactez Omar Araudinho pour l\'activer.');
      return;
    }
    setLoginProf(prof);
    setPwdInput('');
    setPwdError('');
  };

  var handleLogin = function() {
    if (!loginProf) return;
    var deviceId = getDeviceId();

    // Admin first setup: define password
    if (pwdError === 'first_setup' && loginProf.isAdmin) {
      if (pwdInput.length < 4) { setPwdError('Minimum 4 caractères.'); return; }
      var info = getDeviceInfo();
      var updated = profiles.map(function(p){
        if(p.id !== loginProf.id) return p;
        return { ...p, pwdHash:hashPwd(pwdInput), needSetup:false,
          deviceId: deviceId, deviceInfo: info.model+' / '+info.browser };
      });
      saveProfiles(updated); setProfiles(updated);
      var fresh = updated.find(function(p){return p.id===loginProf.id;});
      setAdminSession(fresh); setShowAdmin(true); setLoginProf(null);
      return;
    }

    // Check temp password first, then regular password
    var isTempLogin = false;
    if (loginProf.tempPwdHash && loginProf.tempPwdHash === hashPwd(pwdInput)) {
      // Check temp password not expired
      if (loginProf.tempExpiry) {
        var tNow = new Date(); tNow.setHours(0,0,0,0);
        var tExp = new Date(loginProf.tempExpiry); tExp.setHours(0,0,0,0);
        if (tExp < tNow) {
          setPwdError('Mot de passe provisoire expiré. Contactez l\'administrateur.');
          return;
        }
      }
      isTempLogin = true;
    } else if (!checkPwd(loginProf, pwdInput)) {
      setPwdError('Mot de passe incorrect.');
      return;
    }

    // Password OK — check device binding
    if (loginProf.deviceId) {
      // Profile already bound to a device
      if (loginProf.deviceId !== deviceId) {
        // Wrong device
        setPwdError('device_mismatch');
        return;
      }
    } else {
      // First login on any device → bind this device to the profile
      var info2 = getDeviceInfo();
      var updated2 = profiles.map(function(p){
        if(p.id !== loginProf.id) return p;
        return { ...p, deviceId: deviceId, deviceInfo: info2.model+' / '+info2.browser };
      });
      saveProfiles(updated2); setProfiles(updated2);
    }

    if (loginProf.isAdmin) { setAdminSession(loginProf); setShowAdmin(true); setLoginProf(null); return; }
    // If temp login, clear temp pwd and force change on next session
    if (isTempLogin) {
      var upd2 = profiles.map(function(p){
        if(p.id!==loginProf.id) return p;
        return {...p, pwdHash: p.tempPwdHash, tempPwdHash:null, tempPwdClear:null, needSetup:false};
      });
      saveProfiles(upd2); setProfiles(upd2);
    }
    onSelect(loginProf);
    setLoginProf(null);
  };

  // ── Admin: add profile ──────────────────────────────────────────────────
  var handleAddProfile = function() {
    var name = newProf.name.trim();
    if (!name) { alert('Nom requis.'); return; }
    if (newProf.pwd.length < 4) { alert('Mot de passe minimum 4 caractères.'); return; }
    if (newProf.pwd !== newProf.pwd2) { alert('Les mots de passe ne correspondent pas.'); return; }
    var exists = profiles.find(function(p){ return p.name.toLowerCase()===name.toLowerCase(); });
    if (exists) { alert('Ce nom existe déjà.'); return; }
    var updated = [...profiles, {
      id:'u_'+Date.now(), name:name, phone:newProf.phone.trim(),
      isAdmin:false, active:true, pwdHash:hashPwd(newProf.pwd), needSetup:false,
      expiryDate: newProf.expiry.trim() || null
    }];
    saveProfiles(updated); setProfiles(updated);
    setNewProf({name:'',phone:'',pwd:'',pwd2:''}); setShowAdd(false);
  };

  // ── Admin: edit profile ─────────────────────────────────────────────────
  var handleSaveEdit = function(resetDevice) {
    var name = editForm.name.trim();
    if (!name) { alert('Nom requis.'); return; }
    if (editForm.pwd && editForm.pwd !== editForm.pwd2) { alert('Les mots de passe ne correspondent pas.'); return; }
    if (editForm.pwd && editForm.pwd.length < 4) { alert('Mot de passe minimum 4 caractères.'); return; }
    var updated = profiles.map(function(p){
      if(p.id !== editTarget.id) return p;
      var next = Object.assign({}, p, {
        name:     name,
        phone:    editForm.phone.trim(),
        username: editForm.username.trim() || null,
        expiryDate: editForm.expiry.trim() || null,
        isResponsable: (editForm.role||'technicien') === 'responsable',
        responsableId: editForm.responsableId||null,
      });
      if(editForm.pwd) next.pwdHash = hashPwd(editForm.pwd);
      if(resetDevice) { next.deviceId=null; next.deviceInfo=null;
        next.deviceId_mobile=null; next.deviceId_desktop=null; }
      // Re-activate if expiry was extended
      if (next.expiryDate) {
        var today2 = new Date(); today2.setHours(0,0,0,0);
        var exp2 = new Date(next.expiryDate); exp2.setHours(0,0,0,0);
        if (exp2 >= today2) next.active = true; // reactivate if not yet expired
      }
      return next;
    });
    saveProfiles(updated); setProfiles(updated); setEditTarget(null);
  };

  // ── Admin: toggle active ────────────────────────────────────────────────
  var toggleActive = function(pid) {
    var updated = profiles.map(function(p){
      if(p.id!==pid||p.isAdmin) return p;
      return { ...p, active:!p.active };
    });
    saveProfiles(updated); setProfiles(updated);
  };

  // ── Admin: delete profile ───────────────────────────────────────────────
  var handleDelete = function(pid) {
    if(!confirm('Supprimer ce profil et tous ses audits ?')) return;
    var prefix='p_'+pid+'_';
    Object.keys(localStorage).forEach(function(k){ if(k.startsWith(prefix)) localStorage.removeItem(k); });
    var updated = profiles.filter(function(p){return p.id!==pid;});
    saveProfiles(updated); setProfiles(updated); setEditTarget(null);
  };

  // ── Change own password ─────────────────────────────────────────────────
  var handleChangePwd = function(prof) {
    if (!checkPwd(prof, changePwdForm.old)) { setChangePwdError('Ancien mot de passe incorrect.'); return; }
    if (changePwdForm.new1.length < 4) { setChangePwdError('Minimum 4 caractères.'); return; }
    if (changePwdForm.new1 !== changePwdForm.new2) { setChangePwdError('Les mots de passe ne correspondent pas.'); return; }
    var updated = profiles.map(function(p){
      if(p.id!==prof.id) return p;
      return { ...p, pwdHash:hashPwd(changePwdForm.new1) };
    });
    saveProfiles(updated); setProfiles(updated);
    setShowChangePwd(false); setChangePwdForm({old:'',new1:'',new2:''}); setChangePwdError('');
    alert('Mot de passe modifié.');
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  var INP = { width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #1e3a5f',
    background:'#0a1628',color:'#e2e8f0',fontSize:15,boxSizing:'border-box',
    outline:'none',marginBottom:10,fontFamily:'inherit' };
  var BTN_P = { flex:1,padding:'11px',borderRadius:10,border:'none',
    background:'#3b82f6',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14 };
  var BTN_G = { flex:1,padding:'11px',borderRadius:10,border:'none',
    background:'#22c55e',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14 };
  var BTN_N = { flex:1,padding:'11px',borderRadius:10,border:'1px solid #334155',
    background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:14 };
  var BTN_R = { flex:1,padding:'11px',borderRadius:10,border:'none',
    background:'#ef4444',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14 };
  var OVERLAY = { position:'fixed',inset:0,background:'#000c',zIndex:9999,
    display:'flex',alignItems:'center',justifyContent:'center',padding:20 };
  var MODAL = { background:'#0f2040',borderRadius:16,padding:24,
    maxWidth:360,width:'100%',border:'1px solid #334155' };
  var LBL = { fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',
    letterSpacing:'0.06em',display:'block',marginBottom:6 };

  var visibleProfiles = adminSession
    ? profiles
    : profiles.filter(function(p){ return !p.isAdmin; });

  // ── Render ───────────────────────────────────────────────────────────────
  return React.createElement('div', { className:'audit-root', style:{width:'100%',minHeight:'100vh',
    background:'#020817',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif',
    color:'#f1f5f9',display:'flex',flexDirection:'column'} },

    /* Header */
    React.createElement('div', { style:{background:'linear-gradient(135deg,#0f2040,#1e3a5f)',
      padding:'36px 24px 28px',textAlign:'center',borderBottom:'1px solid #1e3a5f'} },
      React.createElement('div', { style:{fontSize:44,marginBottom:10} }, '📡'),
      React.createElement('div', { style:{fontSize:22,fontWeight:800,color:'#f1f5f9',marginBottom:3} }, 'Audit PICO BTS'),
      React.createElement('div', { style:{fontSize:12,color:'#64748b'} }, 'Bouygues — Sélectionnez votre profil'),
      /* Admin login button */
      React.createElement('button', {
        onClick:function(){ handleCardClick(profiles.find(function(p){return p.id===ADMIN_ID;})||profiles[0]); },
        style:{marginTop:14,background:'#1e3a5f40',border:'1px solid #1e3a5f',borderRadius:8,
          padding:'5px 14px',color:'#64748b',cursor:'pointer',fontSize:11}
      }, '🔐 Admin'),
      React.createElement('div', {
        onClick:function(){ setShowRecovery(true); setRecoveryCode(''); setRecoveryError(''); setRecoverySuccess(false); },
        style:{fontSize:10,color:'#1e3a5f',cursor:'pointer',marginTop:6,textDecoration:'underline'}
      }, 'Mot de passe admin oublié ?')
    ),

    /* Profile list */
    React.createElement('div', { style:{flex:1,padding:'24px 20px',overflowY:'auto'} },
      React.createElement('div', { style:{fontSize:11,fontWeight:700,color:'#475569',
        textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14} },
        'Sélectionnez votre profil'
      ),
      profiles.filter(function(p){return !p.isAdmin;}).map(function(prof){
        var color = getAvatarColor(prof.name);
        var disabled = !prof.active;
        return React.createElement('div', { key:prof.id,
          style:{display:'flex',alignItems:'center',gap:12,background:'#0f2040',
            borderRadius:14,padding:'14px 16px',marginBottom:10,
            border:'1px solid '+(disabled?'#334155':'#1e3a5f'),
            cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.55:1},
          onClick:function(){ if(!disabled) handleCardClick(prof); } },
          React.createElement('div', { style:{width:48,height:48,borderRadius:'50%',
            background:disabled?'#334155':color,display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:16,fontWeight:800,color:'#fff',flexShrink:0} },
            disabled ? '🔒' : initials(prof.name)
          ),
          React.createElement('div', { style:{flex:1,minWidth:0} },
            React.createElement('div', { style:{fontSize:15,fontWeight:700,
              color:disabled?'#475569':'#e2e8f0',overflow:'hidden',
              textOverflow:'ellipsis',whiteSpace:'nowrap'} }, prof.name),
            React.createElement('div', { style:{fontSize:11,color:'#475569',marginTop:2} },
              disabled ? '🚫 Compte désactivé' :
              (prof.phone ? '📞 '+prof.phone : '🔐 Connexion par mot de passe')
            ),
            prof.expiryDate && !disabled && React.createElement('div', {
              style:{fontSize:10,marginTop:2,color:(function(){
                var today=new Date();today.setHours(0,0,0,0);
                var exp=new Date(prof.expiryDate);exp.setHours(0,0,0,0);
                var diff=Math.round((exp-today)/(1000*60*60*24));
                return diff<=7?'#f59e0b':'#475569';
              })()}
            },
              (function(){
                var today=new Date();today.setHours(0,0,0,0);
                var exp=new Date(prof.expiryDate);exp.setHours(0,0,0,0);
                var diff=Math.round((exp-today)/(1000*60*60*24));
                if(diff<=0) return '';
                if(diff<=7) return '⚠️ Compte valide '+diff+' jour'+(diff>1?'s':'');
                return '📅 Valide jusqu\'au '+exp.toLocaleDateString('fr-FR');
              })()
            )
          )
        );
      })
    ),

    /* ── Login modal ──────────────────────────────────────────────────── */
    loginProf && React.createElement('div', { style:OVERLAY },
      React.createElement('div', { style:MODAL },
        /* Avatar + name */
        React.createElement('div', { style:{display:'flex',alignItems:'center',gap:12,marginBottom:20} },
          React.createElement('div', { style:{width:50,height:50,borderRadius:'50%',
            background:getAvatarColor(loginProf.name),display:'flex',alignItems:'center',
            justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',flexShrink:0} },
            initials(loginProf.name)
          ),
          React.createElement('div', null,
            React.createElement('div', { style:{fontSize:16,fontWeight:700,color:'#f1f5f9'} }, loginProf.name),
            React.createElement('div', { style:{fontSize:11,color:'#64748b',marginTop:2} },
              pwdError==='first_setup'
                ? '✨ Premier lancement — définissez le mot de passe admin'
                : '🔐 Entrez votre mot de passe'
            ),
            loginProf.expiryDate && React.createElement('div', {
              style:{fontSize:11,marginTop:4,color:(function(){
                var t=new Date();t.setHours(0,0,0,0);
                var e=new Date(loginProf.expiryDate);e.setHours(0,0,0,0);
                return Math.round((e-t)/86400000)<=7?'#f59e0b':'#475569';
              })()}
            },
              (function(){
                var t=new Date();t.setHours(0,0,0,0);
                var e=new Date(loginProf.expiryDate);e.setHours(0,0,0,0);
                var d=Math.round((e-t)/86400000);
                if(d<0) return '⛔ Compte expiré';
                if(d===0) return '⚠️ Expire aujourd\'hui';
                if(d<=7) return '⚠️ Expire dans '+d+' jour'+(d>1?'s':'');
                return '📅 Valide jusqu\'au '+e.toLocaleDateString('fr-FR');
              })()
            )
          )
        ),
        React.createElement('label', { style:LBL },
          pwdError==='first_setup' ? 'Définissez votre mot de passe administrateur (min. 4 car.)' : 'Mot de passe'
        ),
        React.createElement('input', {
          type:'password', autoFocus:true,
          value:pwdInput, onChange:function(e){setPwdInput(e.target.value);setPwdError('');},
          onKeyDown:function(e){if(e.key==='Enter')handleLogin();},
          placeholder:'••••••••', style:INP
        }),
        pwdError && pwdError!=='first_setup' && pwdError!=='device_mismatch' && React.createElement('div', {
          style:{color:'#ef4444',fontSize:12,marginTop:-6,marginBottom:10}
        }, pwdError),
        pwdError==='device_mismatch' && React.createElement('div', {
          style:{background:'#450a0a',border:'1px solid #ef4444',borderRadius:10,
            padding:'12px 14px',marginTop:-6,marginBottom:10}
        },
          React.createElement('div', {style:{color:'#fca5a5',fontSize:13,fontWeight:700,marginBottom:4}},
            '🔒 Appareil non autorisé'
          ),
          React.createElement('div', {style:{color:'#ef4444',fontSize:12,lineHeight:1.5}},
            'Ce profil est déjà lié à un autre appareil. Contactez Omar Araudinho pour réinitialiser l\'association.'
          )
        ),
        /* Change password link (existing users) */
        !loginProf.needSetup && pwdError!=='first_setup' && React.createElement('div', {
          style:{fontSize:11,color:'#64748b',textAlign:'right',marginBottom:12,marginTop:-4,cursor:'pointer'},
          onClick:function(){setShowChangePwd(true);}
        }, 'Changer mon mot de passe'),
        React.createElement('div', { style:{display:'flex',gap:10} },
          React.createElement('button', { onClick:handleLogin, style:BTN_P },
            pwdError==='first_setup' ? '✓ Définir et accéder' : '→ Connexion'
          ),
          React.createElement('button', { onClick:function(){setLoginProf(null);setPwdInput('');setPwdError('');}, style:BTN_N },
            'Annuler'
          )
        )
      )
    ),

    /* ── Change password modal ──────────────────────────────────────── */
    showChangePwd && loginProf && React.createElement('div', { style:OVERLAY },
      React.createElement('div', { style:MODAL },
        React.createElement('div', { style:{fontSize:15,fontWeight:700,color:'#f1f5f9',marginBottom:16} },
          '🔑 Changer mon mot de passe'
        ),
        React.createElement('label', { style:LBL }, 'Ancien mot de passe'),
        React.createElement('input', { type:'password', autoFocus:true, value:changePwdForm.old,
          onChange:function(e){setChangePwdForm({...changePwdForm,old:e.target.value});setChangePwdError('');},
          placeholder:'••••••••', style:INP }),
        React.createElement('label', { style:LBL }, 'Nouveau mot de passe'),
        React.createElement('input', { type:'password', value:changePwdForm.new1,
          onChange:function(e){setChangePwdForm({...changePwdForm,new1:e.target.value});setChangePwdError('');},
          placeholder:'••••••••', style:INP }),
        React.createElement('label', { style:LBL }, 'Confirmer le nouveau'),
        React.createElement('input', { type:'password', value:changePwdForm.new2,
          onChange:function(e){setChangePwdForm({...changePwdForm,new2:e.target.value});setChangePwdError('');},
          onKeyDown:function(e){if(e.key==='Enter')handleChangePwd(loginProf);},
          placeholder:'••••••••', style:INP }),
        changePwdError && React.createElement('div', {style:{color:'#ef4444',fontSize:12,marginBottom:10}}, changePwdError),
        React.createElement('div', { style:{display:'flex',gap:10} },
          React.createElement('button', { onClick:function(){handleChangePwd(loginProf);}, style:BTN_G }, '✓ Changer'),
          React.createElement('button', { onClick:function(){setShowChangePwd(false);setChangePwdForm({old:'',new1:'',new2:''});setChangePwdError('');}, style:BTN_N }, 'Annuler')
        )
      )
    ),

    /* ── Admin panel ────────────────────────────────────────────────── */
    showAdmin && adminSession && React.createElement('div', { style:{position:'fixed',inset:0,
      background:'#020817',zIndex:9998,display:'flex',flexDirection:'column',
      fontFamily:'inherit',color:'#f1f5f9'}, className:'audit-root' },

      /* Admin header */
      React.createElement('div', { style:{background:'linear-gradient(135deg,#1e0f40,#3a1e5f)',
        padding:'20px 20px 16px',borderBottom:'1px solid #3a1e5f',
        display:'flex',alignItems:'center',gap:12} },
        React.createElement('div', { style:{width:40,height:40,borderRadius:'50%',
          background:'#a855f7',display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:14,fontWeight:800,color:'#fff'} }, initials(adminSession.name)),
        React.createElement('div', { style:{flex:1} },
          React.createElement('div', { style:{fontSize:15,fontWeight:800,color:'#f1f5f9'} }, adminSession.name),
          React.createElement('div', { style:{fontSize:11,color:'#a78bfa'} }, '👑 Administrateur')
        ),
        React.createElement('button', { onClick:function(){setShowAdmin(false);setAdminSession(null);},
          style:{background:'#3a1e5f',border:'1px solid #4c1d95',borderRadius:8,
            padding:'6px 12px',color:'#c4b5fd',cursor:'pointer',fontSize:12} }, 'Déconnexion')
      ),

      /* Admin content */
      React.createElement('div', { style:{flex:1,overflowY:'auto',padding:'20px'} },
        React.createElement('div', { style:{display:'flex',justifyContent:'space-between',
          alignItems:'center',marginBottom:16} },
          React.createElement('div', { style:{fontSize:13,fontWeight:700,color:'#a78bfa',
            textTransform:'uppercase',letterSpacing:'0.06em'} }, 'Gestion des profils'),
          React.createElement('button', { onClick:function(){setShowAdd(true);},
            style:{background:'#3b82f6',border:'none',borderRadius:8,padding:'7px 14px',
              color:'#fff',cursor:'pointer',fontWeight:700,fontSize:12} }, '+ Nouveau profil')
        ),

        /* Add profile form */
        showAdd && React.createElement('div', { style:{background:'#1a1040',borderRadius:12,
          padding:16,marginBottom:16,border:'1px solid #4c1d95'} },
          React.createElement('div', { style:{fontSize:13,fontWeight:700,color:'#c4b5fd',marginBottom:14} }, 'Créer un profil'),
          React.createElement('label', { style:LBL }, 'Nom / Prénom'),
          React.createElement('input', { autoFocus:true, value:newProf.name,
            onChange:function(e){setNewProf({...newProf,name:e.target.value});},
            placeholder:'Ex : Jean DUPONT', style:INP }),
          React.createElement('label', { style:LBL }, 'Identifiant de connexion'),
          React.createElement('input', {
            value: newProf.username || '',
            onChange:function(e){setNewProf({...newProf,username:e.target.value});},
            placeholder:'Ex: 170326 (vide = date du jour JJMMAA automatique)',
            style:INP
          }),
          React.createElement('div', {style:{fontSize:11,color:'#64748b',marginTop:-8,marginBottom:10}},
            'Laisser vide = date du jour au format JJMMAA (ex: 170326)'
          ),
          React.createElement('label', { style:LBL }, 'Téléphone'),
          React.createElement('input', { type:'tel', value:newProf.phone,
            onChange:function(e){setNewProf({...newProf,phone:e.target.value});},
            placeholder:'06 12 34 56 78', style:INP }),
          React.createElement('label', { style:LBL }, 'Date d\'expiration du profil'),
          React.createElement('input', { type:'date', value:newProf.expiry,
            onChange:function(e){setNewProf({...newProf,expiry:e.target.value});},
            min: new Date().toISOString().split('T')[0],
            style:INP }),
          React.createElement('div', {style:{fontSize:11,color:'#64748b',marginTop:-6,marginBottom:10}},
            'Laisser vide = pas d\'expiration automatique'
          ),
          React.createElement('label', { style:LBL }, 'Mot de passe initial'),
          React.createElement('input', { type:'password', value:newProf.pwd,
            onChange:function(e){setNewProf({...newProf,pwd:e.target.value});},
            placeholder:'Min. 4 caractères', style:INP }),
          React.createElement('label', { style:LBL }, 'Confirmer le mot de passe'),
          React.createElement('input', { type:'password', value:newProf.pwd2,
            onChange:function(e){setNewProf({...newProf,pwd2:e.target.value});},
            onKeyDown:function(e){if(e.key==='Enter')handleAddProfile();},
            placeholder:'••••••••', style:INP }),
          React.createElement('div', { style:{display:'flex',gap:8} },
            React.createElement('button', { onClick:handleAddProfile, style:BTN_P }, '✓ Créer'),
            React.createElement('button', { onClick:function(){setShowAdd(false);setNewProf({name:'',phone:'',pwd:'',pwd2:''});}, style:BTN_N }, 'Annuler')
          )
        ),

        /* Profile cards (admin view) */
        profiles.filter(function(p){return !p.isAdmin;}).map(function(prof){
          var isEdit = editTarget && editTarget.id === prof.id;
          var color = getAvatarColor(prof.name);
          return React.createElement('div', { key:prof.id,
            style:{background:'#0f2040',borderRadius:12,marginBottom:10,
              border:'1px solid '+(prof.active?'#1e3a5f':'#ef444440'),overflow:'hidden'} },
            /* Card header */
            React.createElement('div', { style:{display:'flex',alignItems:'center',gap:10,padding:'12px 14px'} },
              React.createElement('div', { style:{width:40,height:40,borderRadius:'50%',
                background:prof.active?color:'#334155',display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:13,fontWeight:800,color:'#fff',flexShrink:0} },
                prof.active ? initials(prof.name) : '🔒'
              ),
              React.createElement('div', { style:{flex:1,minWidth:0} },
                React.createElement('div', { style:{fontSize:14,fontWeight:700,
                  color:prof.active?'#e2e8f0':'#64748b'} }, prof.name),
                React.createElement('div', { style:{fontSize:11,color:'#475569',marginTop:1} },
                  prof.phone ? '📞 '+prof.phone : 'Pas de téléphone'
                )
              ),
              /* Toggle active */
              React.createElement('div', {
                onClick:function(){toggleActive(prof.id);},
                style:{width:44,height:24,borderRadius:12,cursor:'pointer',position:'relative',
                  background:prof.active?'#22c55e':'#334155',transition:'background 0.2s',flexShrink:0} },
                React.createElement('div', { style:{position:'absolute',top:3,
                  left:prof.active?23:3,width:18,height:18,borderRadius:'50%',
                  background:'#fff',transition:'left 0.2s'} })
              ),
              /* Edit */
              React.createElement('button', {
                onClick:function(){ setEditTarget(prof); setEditForm({name:prof.name,phone:prof.phone||'',username:prof.username||'',pwd:'',pwd2:'',expiry:prof.expiryDate||'',role:prof.isResponsable?'responsable':'technicien',responsableId:prof.responsableId||''}); },
                style:{background:'#1e3a5f',border:'none',borderRadius:7,padding:'5px 8px',
                  color:'#93c5fd',cursor:'pointer',fontSize:11,marginLeft:6}
              }, '✏️'),
              /* Delete */
              React.createElement('button', {
                onClick:function(){ handleDelete(prof.id); },
                style:{background:'#450a0a',border:'none',borderRadius:7,padding:'5px 8px',
                  color:'#fca5a5',cursor:'pointer',fontSize:11,marginLeft:4}
              }, '🗑️'),
              /* QR Code */
              React.createElement('button', {
                onClick:function(){ handleGenerateQR(prof); },
                style:{background:'#0c4a3a',border:'none',borderRadius:7,padding:'5px 8px',
                  color:'#34d399',cursor:'pointer',fontSize:11,marginLeft:4}
              }, '📲')
            ),
            /* Status + device + expiry badges */
            React.createElement('div', { style:{padding:'0 14px 10px',display:'flex',
              alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:4} },
              React.createElement('div', {style:{fontSize:10,
                color:prof.active?'#22c55e':'#ef4444',fontWeight:700}},
                prof.active ? '✓ Actif' : '✗ Désactivé'
              ),
              prof.expiryDate && React.createElement('div', {style:{fontSize:10,fontWeight:700,
                color: (function(){
                  var today=new Date();today.setHours(0,0,0,0);
                  var exp=new Date(prof.expiryDate);exp.setHours(0,0,0,0);
                  var diff=Math.round((exp-today)/(1000*60*60*24));
                  return diff<0?'#ef4444':diff<=7?'#f59e0b':'#64748b';
                })()
              }},
                (function(){
                  var today=new Date();today.setHours(0,0,0,0);
                  var exp=new Date(prof.expiryDate);exp.setHours(0,0,0,0);
                  var diff=Math.round((exp-today)/(1000*60*60*24));
                  if(diff<0) return '⛔ Expiré';
                  if(diff===0) return '⚠️ Expire aujourd\'hui';
                  if(diff<=7) return '⚠️ Expire dans '+diff+'j';
                  return '📅 '+new Date(prof.expiryDate).toLocaleDateString('fr-FR');
                })()
              ),
              React.createElement('div', {style:{fontSize:10,color:prof.deviceId?'#3b82f6':'#334155',
                display:'flex',alignItems:'center',gap:4}},
                prof.deviceId ? '📱 '+formatDeviceLabel(prof.deviceId) : '📱 Non lié'
              ),
              prof.isResponsable && React.createElement('div', {style:{fontSize:10,fontWeight:700,
                color:'#a855f7',background:'#7c3aed20',padding:'2px 6px',borderRadius:4}},
                '👥 Responsable'),
              prof.responsableId && !prof.isResponsable && React.createElement('div', {style:{
                fontSize:10,color:'#60a5fa',background:'#1e40af20',padding:'2px 6px',borderRadius:4}},
                '⤴ '+((profiles.find(function(rp){return rp.id===prof.responsableId;})||{}).name||'Resp.'))
            ),
            /* Inline edit form */
            isEdit && React.createElement('div', { style:{background:'#0a1628',padding:'14px',
              borderTop:'1px solid #1e3a5f'} },
              React.createElement('label', { style:LBL }, 'Nom'),
              React.createElement('input', { autoFocus:true, value:editForm.name,
                onChange:function(e){setEditForm({...editForm,name:e.target.value});},
                style:INP }),
              React.createElement('label', { style:LBL }, 'Identifiant de connexion'),
              React.createElement('input', {
                value: editForm.username,
                onChange:function(e){setEditForm({...editForm,username:e.target.value});},
                placeholder: 'Ex: ' + todayUsername + ' (vide = date du jour auto)',
                style: INP
              }),
              React.createElement('div', {style:{fontSize:11,color:'#64748b',marginTop:-8,marginBottom:10}},
                'Actuel : ',
                React.createElement('span', {style:{color:'#93c5fd',fontWeight:700}},
                  editTarget && editTarget.username ? editTarget.username : ('(' + todayUsername + ' par defaut)')
                )
              ),
              React.createElement('label', { style:LBL }, 'Téléphone'),
              React.createElement('input', { type:'tel', value:editForm.phone,
                onChange:function(e){setEditForm({...editForm,phone:e.target.value});},
                style:INP }),
              React.createElement('label', { style:LBL }, 'Date d\'expiration du profil'),
              React.createElement('input', { type:'date', value:editForm.expiry||'',
                onChange:function(e){setEditForm({...editForm,expiry:e.target.value});},
                min: new Date().toISOString().split('T')[0],
                style:INP }),
              React.createElement('div', {style:{fontSize:11,color:'#64748b',marginTop:-6,marginBottom:10}},
                editForm.expiry ? '⚠️ Le profil sera désactivé automatiquement le '+new Date(editForm.expiry).toLocaleDateString('fr-FR') : 'Laisser vide = pas d\'expiration automatique'
              ),
              React.createElement('label', { style:LBL }, 'Nouveau mot de passe (laisser vide = inchangé)'),
              React.createElement('input', { type:'password', value:editForm.pwd,
                onChange:function(e){setEditForm({...editForm,pwd:e.target.value});},
                placeholder:'••••••••', style:INP }),
              editForm.pwd && React.createElement('input', { type:'password', value:editForm.pwd2,
                onChange:function(e){setEditForm({...editForm,pwd2:e.target.value});},
                placeholder:'Confirmer le mot de passe', style:INP }),
              /* Device info + reset */
              editTarget && editTarget.deviceId && React.createElement('div', {
                style:{background:'#0f2040',borderRadius:8,padding:'10px 12px',
                  marginBottom:10,border:'1px solid #1e3a5f'}
              },
                React.createElement('div', {style:{fontSize:10,fontWeight:700,color:'#64748b',
                  textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}},
                  '📱 Appareil lié'
                ),
                React.createElement('div', {style:{fontSize:12,color:'#93c5fd',marginBottom:6}},
                  editTarget.deviceInfo || formatDeviceLabel(editTarget.deviceId)
                ),
                React.createElement('div', {style:{fontSize:10,color:'#475569',marginBottom:8,fontFamily:'monospace'}},
                  'ID : '+formatDeviceLabel(editTarget.deviceId)
                ),
                React.createElement('button', {
                  onClick:function(){ if(confirm('Réinitialiser l\'association d\'appareil pour '+editTarget.name+' ?')) handleSaveEdit(true); },
                  style:{width:'100%',padding:'8px',borderRadius:8,border:'none',
                    background:'#f9731620',color:'#fb923c',cursor:'pointer',fontSize:12,fontWeight:700}
                }, '🔄 Réinitialiser l\'appareil lié')
              ),
              !editTarget.deviceId && React.createElement('div', {
                style:{background:'#0a1628',borderRadius:8,padding:'10px 12px',
                  marginBottom:10,border:'1px solid #1e3a5f',fontSize:12,color:'#475569'}
              }, '📱 Aucun appareil lié — sera associé à la prochaine connexion'),
              // ── Rôle responsable
              React.createElement('div', {style:{marginBottom:10}},
                React.createElement('label', {style:LBL}, 'Rôle'),
                React.createElement('div', {style:{display:'flex',gap:8}},
                  ['technicien','responsable'].map(function(role){
                    var isSel=(editForm.role||'technicien')===role;
                    return React.createElement('button', {key:role,
                      onClick:function(){setEditForm(Object.assign({},editForm,{role:role}));},
                      style:{flex:1,padding:'8px',borderRadius:8,border:'none',cursor:'pointer',
                        fontWeight:700,fontSize:12,
                        background:isSel?(role==='responsable'?'#7c3aed':'#0369a1'):'#1e3a5f',
                        color:isSel?'#fff':'#64748b'}
                    }, role==='responsable'?'👥 Responsable':'👷 Technicien');
                  })
                )
              ),
              // ── Affecter à un responsable (si technicien)
              (editForm.role||'technicien')==='technicien' && React.createElement('div', {style:{marginBottom:10}},
                React.createElement('label', {style:LBL}, 'Affecter à un responsable'),
                React.createElement('select', {
                  value: editForm.responsableId||'',
                  onChange:function(e){setEditForm(Object.assign({},editForm,{responsableId:e.target.value}));},
                  style:INP
                },
                  React.createElement('option',{value:''},'— Aucun responsable —'),
                  profiles.filter(function(p){return p.isResponsable&&!p.isAdmin;}).map(function(rp){
                    return React.createElement('option',{key:rp.id,value:rp.id},rp.name+' ('+rp.username+')');
                  })
                )
              ),
              React.createElement('div', { style:{display:'flex',gap:8} },
                React.createElement('button', { onClick:function(){handleSaveEdit(false);}, style:BTN_G }, '✓ Enregistrer'),
                React.createElement('button', { onClick:function(){setEditTarget(null);}, style:BTN_N }, 'Annuler')
              )
            )
          );
        }),

        /* Admin own password change */
        React.createElement('div', { style:{marginTop:24,paddingTop:16,borderTop:'1px solid #1e3a5f'} },
          React.createElement('button', {
            onClick:function(){setShowChangePwd(true); setLoginProf(adminSession);},
            style:{width:'100%',padding:'10px',borderRadius:10,border:'1px solid #4c1d95',
              background:'transparent',color:'#a78bfa',cursor:'pointer',fontSize:13}
          }, '🔑 Changer mon mot de passe administrateur')
        )
      )
    ),

    /* ── QR Code modal ── */
    showQR && React.createElement('div', { style:{position:'fixed',inset:0,background:'#000e',
      zIndex:9999,display:'flex',alignItems:'flex-start',justifyContent:'center',
      padding:'16px 16px 40px',overflowY:'auto'} },
      React.createElement('div', { style:{background:'#0f2040',borderRadius:18,padding:20,
        maxWidth:360,width:'100%',border:'1px solid #1e3a5f',marginTop:8} },

        /* ── Header ── */
        React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}},
          React.createElement('div',{style:{fontSize:14,fontWeight:800,color:'#f1f5f9'}},
            '📲 Accès technicien — '+showQR.name
          ),
          React.createElement('button',{onClick:function(){setShowQR(null);},
            style:{background:'none',border:'none',color:'#64748b',fontSize:24,cursor:'pointer',lineHeight:1,padding:'0 4px'}
          },'×')
        ),

        /* ── URL de l'app ── */
        React.createElement('div',{style:{marginBottom:14}},
          React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#64748b',
            textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}},'URL de l\'application publiée'),
          React.createElement('input',{
            value:appUrl,
            onChange:function(e){
              var v=e.target.value;
              setAppUrl(v);
              localStorage.setItem('__app_url__',v);
              // Re-render QR
              setTimeout(function(){
                var c=document.getElementById('qr-c');
                if(c&&v&&typeof renderQRCode==='function'){
                  var data={id:showQR.id,n:showQR.name,p:showQR.tempPwdClear,e:showQR.tempExpiry};
                  renderQRCode(c, v.replace(/\/+$/,'')+'#aqr='+btoa(JSON.stringify(data)));
                }
              },100);
            },
            placeholder:'https://votre-app.netlify.app',
            style:{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid '+(appUrl?'#1e3a5f':'#f59e0b'),
              background:'#0a1628',color:'#e2e8f0',fontSize:13,boxSizing:'border-box',outline:'none',fontFamily:'inherit'}
          }),
          !appUrl && React.createElement('div',{style:{fontSize:11,color:'#f59e0b',marginTop:5,fontWeight:600}},
            '⚠️ Saisissez l\'URL pour afficher le QR code'
          )
        ),

        /* ── QR Canvas ── */
        React.createElement('div',{style:{textAlign:'center',marginBottom:16}},
          React.createElement('div',{style:{display:'inline-block',background:'#fff',
            borderRadius:12,padding:10,boxShadow:'0 4px 20px #0006'}},
            React.createElement('canvas',{
              id:'qr-c', width:220, height:220,
              ref:function(canvas){
                if(!canvas||!appUrl||!showQR.tempPwdClear) return;
                var data={id:showQR.id,n:showQR.name,p:showQR.tempPwdClear,e:showQR.tempExpiry};
                var url=appUrl.replace(/\/+$/,'')+'#aqr='+btoa(JSON.stringify(data));
                setTimeout(function(){
                  if(typeof renderQRCode==='function') renderQRCode(canvas,url);
                  else console.error('renderQRCode not available');
                },50);
              }
            })
          ),
          !appUrl && React.createElement('div',{style:{width:220,height:220,margin:'0 auto',
            background:'#0a1628',borderRadius:12,display:'flex',alignItems:'center',
            justifyContent:'center',flexDirection:'column',gap:8,border:'2px dashed #1e3a5f'}},
            React.createElement('div',{style:{fontSize:32}},'📲'),
            React.createElement('div',{style:{fontSize:11,color:'#334155'}},
              'QR code s\'affichera ici'
            )
          )
        ),

        /* ── Infos provisoires ── */
        React.createElement('div',{style:{background:'#0a1628',borderRadius:10,
          padding:'12px 14px',marginBottom:14,border:'1px solid #1e3a5f'}},
          React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#64748b',
            marginBottom:10,textTransform:'uppercase',letterSpacing:'0.06em'}},
            'Identifiants provisoires'
          ),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:8}},
            React.createElement('span',{style:{fontSize:12,color:'#64748b'}},'Technicien :'),
            React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'#e2e8f0'}},showQR.name)
          ),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:8}},
            React.createElement('span',{style:{fontSize:12,color:'#64748b'}},'Mot de passe :'),
            React.createElement('span',{style:{fontSize:16,fontWeight:800,color:'#34d399',
              fontFamily:'monospace',letterSpacing:'0.15em'}},showQR.tempPwdClear||'—')
          ),
          React.createElement('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},
            React.createElement('span',{style:{fontSize:12,color:'#64748b'}},'Expire le :'),
            React.createElement('span',{style:{fontSize:12,fontWeight:700,color:'#f59e0b'}},
              showQR.tempExpiry ? new Date(showQR.tempExpiry).toLocaleDateString('fr-FR') : '—'
            )
          )
        ),

        /* ── Instructions iPhone (iOS) ── */
        React.createElement('div',{style:{background:'#001a12',borderRadius:10,
          padding:'12px 14px',marginBottom:10,border:'1px solid #065f46'}},
          React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#34d399',
            marginBottom:8,display:'flex',alignItems:'center',gap:6}},
            React.createElement('span',{style:{fontSize:16}},'🍎'),
            'Installation sur iPhone (iOS)'
          ),
          ['1. Scanner ce QR code avec l\'appareil photo iPhone',
           '2. Safari s\'ouvre sur l\'application',
           '3. Appuyer sur ⬆️ (partager) en bas de Safari',
           '4. Sélectionner "Sur l\'écran d\'accueil"',
           '5. Confirmer — l\'icône Audit PICO apparaît'
          ].map(function(step,i){
            return React.createElement('div',{key:i,
              style:{fontSize:11,color:'#6ee7b7',marginBottom:i<4?4:0,lineHeight:1.5}},step);
          })
        ),

        /* ── Instructions Android ── */
        React.createElement('div',{style:{background:'#00101a',borderRadius:10,
          padding:'12px 14px',marginBottom:14,border:'1px solid #1e40af'}},
          React.createElement('div',{style:{fontSize:11,fontWeight:700,color:'#60a5fa',
            marginBottom:8,display:'flex',alignItems:'center',gap:6}},
            React.createElement('span',{style:{fontSize:16}},'🤖'),
            'Installation sur Android'
          ),
          ['1. Scanner ce QR code avec l\'appareil photo ou Google Lens',
           '2. Chrome s\'ouvre sur l\'application',
           '3. Chrome propose automatiquement "Ajouter à l\'accueil"',
           '4. Ou appuyer sur ⋮ (menu) → "Ajouter à l\'écran d\'accueil"'
          ].map(function(step,i){
            return React.createElement('div',{key:i,
              style:{fontSize:11,color:'#93c5fd',marginBottom:i<3?4:0,lineHeight:1.5}},step);
          })
        ),

        /* ── Boutons ── */
        React.createElement('div',{style:{display:'flex',gap:8}},
          React.createElement('button',{
            onClick:function(){
              if(!appUrl){alert('Saisissez d\'abord l\'URL de l\'application.');return;}
              handleGenerateQR(showQR);
            },
            style:{flex:1,padding:'11px',borderRadius:9,border:'none',
              background:'#1e3a5f',color:'#93c5fd',cursor:'pointer',fontSize:12,fontWeight:700}
          },'🔄 Nouveau mot de passe'),
          React.createElement('button',{onClick:function(){setShowQR(null);},
            style:{flex:1,padding:'11px',borderRadius:9,border:'1px solid #1e3a5f',
              background:'transparent',color:'#64748b',cursor:'pointer',fontSize:12}
          },'Fermer')
        )
      )
    ),

    /* ── Recovery modal ── */    /* ── Recovery modal ── */
    showRecovery && React.createElement('div', { style:{position:'fixed',inset:0,background:'#000c',
      zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20} },
      React.createElement('div', { style:{background:'#0f2040',borderRadius:16,padding:24,
        maxWidth:340,width:'100%',border:'1px solid #334155'} },
        !recoverySuccess
          ? React.createElement('div', null,
              React.createElement('div', {style:{fontSize:15,fontWeight:700,color:'#f1f5f9',marginBottom:6}},
                '🔑 Récupération du compte admin'
              ),
              React.createElement('div', {style:{fontSize:12,color:'#64748b',marginBottom:16,lineHeight:1.6}},
                'Entrez le code de récupération d\'urgence.'
              ),
              React.createElement('input', {
                autoFocus:true, type:'password',
                value:recoveryCode,
                onChange:function(e){setRecoveryCode(e.target.value);setRecoveryError('');},
                onKeyDown:function(e){if(e.key==='Enter')handleRecovery();},
                placeholder:'••••',
                style:{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #1e3a5f',
                  background:'#0a1628',color:'#e2e8f0',fontSize:15,boxSizing:'border-box',
                  outline:'none',marginBottom:10,fontFamily:'inherit',letterSpacing:'0.1em'}
              }),
              recoveryError && React.createElement('div', {
                style:{color:'#ef4444',fontSize:12,marginBottom:10}
              }, recoveryError),
              React.createElement('div', {style:{display:'flex',gap:10}},
                React.createElement('button', {
                  onClick:handleRecovery,
                  style:{flex:1,padding:'11px',borderRadius:10,border:'none',
                    background:'#f97316',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14}
                }, '🔓 Réinitialiser'),
                React.createElement('button', {
                  onClick:function(){setShowRecovery(false);},
                  style:{flex:1,padding:'11px',borderRadius:10,border:'1px solid #334155',
                    background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:14}
                }, 'Annuler')
              )
            )
          : React.createElement('div', {style:{textAlign:'center'}},
              React.createElement('div', {style:{fontSize:40,marginBottom:12}}, '✅'),
              React.createElement('div', {style:{fontSize:15,fontWeight:700,color:'#22c55e',marginBottom:8}},
                'Compte admin réinitialisé'
              ),
              React.createElement('div', {style:{fontSize:12,color:'#64748b',marginBottom:20}},
                'Cliquez sur 🔐 Admin pour définir un nouveau mot de passe.'
              ),
              React.createElement('button', {
                onClick:function(){setShowRecovery(false);},
                style:{width:'100%',padding:'11px',borderRadius:10,border:'none',
                  background:'#3b82f6',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:14}
              }, 'Fermer')
            )
      )
    )
  );
}


/* ════════════════════════════════════════════════════════════════════
   DOE PICO MODULE
   ════════════════════════════════════════════════════════════════════ */

/* ── PDF extractor (async, DecompressionStream) ─────────────────────── */
async function decompressDeflate(buf) {
  try {
    var ds = new DecompressionStream('deflate');
    var w = ds.writable.getWriter();
    var r = ds.readable.getReader();
    var chunks = [];
    var reading = (async function(){ while(true){ var x=await r.read(); if(x.done)break; chunks.push(x.value); } })();
    await w.write(buf); await w.close(); await reading;
    var len=chunks.reduce(function(a,c){return a+c.length;},0);
    var out=new Uint8Array(len); var off=0;
    chunks.forEach(function(c){out.set(c,off);off+=c.length;});
    return out;
  } catch(e) { return null; }
}

async function parsePicoPDF(file) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = async function(e) {
      try {
        var pdfBytes = new Uint8Array(e.target.result);
        var raw = new TextDecoder('latin1').decode(pdfBytes);
        var allTexts = [];
        var pos = 0;
        while (true) {
          var si = raw.indexOf('stream\n', pos);
          if (si < 0) break;
          var ei = raw.indexOf('endstream', si + 7);
          if (ei < 0) break;
          var comp = pdfBytes.slice(si + 7, ei);
          try {
            var dec = await decompressDeflate(comp);
            if (dec) {
              var text = new TextDecoder('latin1').decode(dec);
              if (text.includes('BT')) {
                var lines = text.split('\n');
                var curY = 0;
                for (var i = 0; i < lines.length; i++) {
                  var l = lines[i];
                  var tm = l.match(/(-?\d+\.?\d*)\s+Tm$/);
                  if (tm) curY = parseFloat(tm[1]);
                  var hx = l.match(/<([0-9A-Fa-f]{2,})>/);
                  if (hx) {
                    var h = hx[1];
                    var t = '';
                    for (var j=0;j<h.length;j+=2) t+=String.fromCharCode(parseInt(h.slice(j,j+2),16));
                    if (t.trim()) allTexts.push({ y:curY, text:t.trim() });
                  }
                }
              }
            }
          } catch(e2) {}
          pos = si + 7;
        }
        resolve(mapTextsToAuditData(allTexts));
      } catch(err) { console.error('PDF parse error:', err); resolve(null); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function mapTextsToAuditData(texts) {
  var flat = texts.map(function(t){return t.text;});

  function extract(prefix) {
    for (var i=0;i<flat.length;i++) {
      if (flat[i].startsWith(prefix+' : ')||flat[i].startsWith(prefix+': '))
        return flat[i].replace(prefix+' : ','').replace(prefix+': ','').trim();
      if ((flat[i]===prefix+' :'||flat[i]===prefix+':') && flat[i+1])
        return flat[i+1].replace(/^:\s*/,'').trim();
    }
    return '';
  }

  // PM rows
  var pmData = {}, pmMarkers = [], pmC = 0;
  for (var i=0;i<flat.length;i++) {
    var pm = flat[i].match(/^(PM\d+)\s*:\s*(.*)$/);
    if (pm) {
      var lbl = pm[1], notes = pm[2];
      var g4=flat[i+1]||'', g5=flat[i+2]||'', sp=flat[i+3]||'';
      if (/^-?\d+\/-?\d+\/\d+$/.test(g4)||/^\d+\.?\d*\//.test(sp)) {
        pmData[lbl]={g4:g4,g5:g5,speedtest:sp,notes:notes};
        pmMarkers.push({id:'m_'+Date.now()+'_'+pmC,type:'pm',label:lbl,x:0.2+pmC*0.15,y:0.3+pmC*0.1});
        pmC++; i+=3;
      }
    }
  }

  // PICO cable
  var picoData = {}, picoMarkers = [], picoC = 0;
  for (var i=0;i<flat.length;i++) {
    var pc = flat[i].match(/C.blage Ethernet (PICO\d+)\s*:\s*(\d+(?:\.\d+)?)m.*hauteur.*?:\s*(\d+(?:\.\d+)?)m/i);
    if (pc) {
      picoData[pc[1]]={photo:null,cablage:pc[2],hauteur:pc[3],notes:''};
      picoMarkers.push({id:'m_p'+Date.now()+'_'+picoC,type:'pico',label:pc[1],x:0.5+picoC*0.2,y:0.5});
      picoC++;
    }
  }

  // Technicien
  var tech='', date='';
  for (var i=0;i<texts.length;i++) {
    if (texts[i].text==='Technicien'&&texts[i].y<250) {
      for (var j=i+1;j<texts.length;j++) {
        if (texts[j].y<texts[i].y-5&&texts[j].text!=='Action'&&texts[j].text!=='Date') {
          tech=texts[j].text; break;
        }
      }
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texts[i].text)&&texts[i].y<250) date=texts[i].text;
  }

  // Prérequis
  var vlan='NON',nbTech='2',nbJours='1',hauteur='2.7',validePar='M. X';
  for (var i=0;i<flat.length;i++) {
    if (flat[i]==="Besoin de VLAN ?"&&flat[i+1]) { var v=flat[i+1].replace(':','').trim(); if(v==='OUI'||v==='NON') vlan=v; }
    if (flat[i]==="Nombre d'intervenants"&&flat[i+1]&&flat[i+1].startsWith(':')) nbTech=flat[i+1].replace(':','').trim();
    if (flat[i]==='Hauteur de travail max'&&flat[i+1]&&flat[i+1].startsWith(':')) hauteur=flat[i+1].replace(':','').trim();
    if (flat[i]==='Temps de travaux'&&flat[i+1]&&flat[i+1].startsWith(':')) nbJours=flat[i+1].replace(':','').replace(' jour','').trim();
    if (flat[i]==='Solution valid\xe9e par ?'&&flat[i+1]&&flat[i+1].startsWith(':')) validePar=flat[i+1].replace(': ','').trim();
  }

  return {
    garde:{ot:extract("Num\xe9ro d'OT"),cdp:extract('CDP Bytel'),raisonSociale:extract('Raison sociale'),
      adresse:extract('Adresse'),contact:extract('Nom du contact')||extract('Contact'),
      telephone:extract('Tel.')||extract('T\xe9l\xe9phone'),email:extract('Email'),
      technicien:tech,date:date||new Date().toLocaleDateString('fr-FR'),photoPrincipale:null},
    plan:{photo:null,markers:[...pmMarkers,...picoMarkers]},
    pmData:pmData,picoData:picoData,
    outils:{photos:[]},local:{notes:'',photos:[]},reportingPhotos:{notes:'',photos:[]},
    oeuvre:{margePercent:10,perforateur:true,visseuse:true,nacelle:false,pirl:false,
      echafaudage:false,escabeau:false,epi:false,cheminCable:false,bandeauPrises:false,
      nbTechniciens:nbTech,nbJours:nbJours,hauteurTravailMax:hauteur,
      vlan:vlan,vlanPort:'N/A',validePar:validePar,niveauQualif:'N2',
      fournituresExtras:'',fournitures:{poe:true,chevilles:true,colliers:true,goulotte:false,pieceFixation:true}},
    acces:{notes:''}
  };
}

/* ── DOE default data ─────────────────────────────────────────────── */
function defaultDoeData() {
  var base = defaultData();
  base.doe = { finalise:false, raf:{cablageRestant:'',equipementsRestants:'',
    ressources:'',besoinsClient:'',notes:'',picoNonInstalle:[]} };
  return base;
}

/* ── DOE SECTIONS ─────────────────────────────────────────────────── */
var DOE_SECTIONS = [
  {id:'garde',label:'Page de garde',icon:'🏠'},
  {id:'preambule',label:'Préambule',icon:'📋'},
  {id:'outils',label:'Outils',icon:'📡'},
  {id:'plan',label:'Plan & Mesures',icon:'🗺️'},
  {id:'pico',label:'PICO BTS',icon:'📶'},
  {id:'local',label:'Local Tech.',icon:'🔧'},
  {id:'photos',label:'Photos',icon:'📸'},
  {id:'oeuvre',label:'Mise en \u0153uvre',icon:'⚙️'},
  {id:'acces',label:'Acc\xe8s site',icon:'🚪'},
  {id:'doe_raf',label:'Reste \xe0 faire',icon:'📌'},
];

/* ── DoeRafSection component ─────────────────────────────────────── */
function DoeRafSection({ data, onChange, picoMarkers }) {
  var raf = (data.doe&&data.doe.raf) ? data.doe.raf : {};
  var finalise = data.doe ? data.doe.finalise : false;
  var setRaf = function(k,v){ onChange({...data,doe:{...data.doe,raf:{...raf,[k]:v}}}); };
  var setFinalise = function(v){ onChange({...data,doe:{...data.doe,finalise:v}}); };

  var INP={width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #1e3a5f',
    background:'#0a1628',color:'#e2e8f0',fontSize:14,boxSizing:'border-box',outline:'none',
    fontFamily:'inherit',marginBottom:0};
  var TA={...INP,resize:'vertical'};
  var CARD={background:'#0f2040',borderRadius:16,padding:'18px 16px',marginBottom:16,border:'1px solid #1e3a5f'};
  var LBL={display:'block',fontSize:11,fontWeight:700,color:'#64748b',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.06em'};

  return React.createElement('div', null,
    React.createElement('h2',{style:{fontSize:20,fontWeight:800,color:'#f1f5f9',marginBottom:18,marginTop:0}},'📌 Reste \xe0 faire'),

    /* Toggle */
    React.createElement('div',{style:{...CARD,border:'2px solid '+(finalise?'#22c55e40':'#ef444440'),background:finalise?'#052010':'#200505'}},
      React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between'}},
        React.createElement('div',null,
          React.createElement('div',{style:{fontSize:15,fontWeight:700,color:finalise?'#22c55e':'#ef4444'}},
            finalise?'\u2705 Section finalis\xe9e':'\u23f3 Section non finalis\xe9e'),
          React.createElement('div',{style:{fontSize:12,color:'#64748b',marginTop:4}},
            finalise?'Cette section sera masqu\xe9e dans le PDF export\xe9.':'Cette section appara\xeatra dans le PDF export\xe9.')
        ),
        React.createElement('div',{onClick:function(){setFinalise(!finalise);},
          style:{width:56,height:30,borderRadius:15,cursor:'pointer',position:'relative',
            background:finalise?'#22c55e':'#334155',transition:'background 0.2s',flexShrink:0}},
          React.createElement('div',{style:{position:'absolute',top:3,left:finalise?29:3,width:24,height:24,
            borderRadius:'50%',background:'#fff',transition:'left 0.2s',boxShadow:'0 1px 4px #0004'}})
        )
      )
    ),

    !finalise && React.createElement('div', null,
      /* Câblage restant */
      React.createElement('div',{style:CARD},
        React.createElement('label',{style:LBL},'C\xe2blage restant \xe0 r\xe9aliser'),
        React.createElement('textarea',{rows:3,value:raf.cablageRestant||'',
          onChange:function(e){setRaf('cablageRestant',e.target.value);},
          placeholder:'Ex : PICO3 : 25m restant, PICO4 : 15m\u2026',style:TA})
      ),

      /* Équipements */
      React.createElement('div',{style:CARD},
        React.createElement('label',{style:LBL},'Équipements non encore install\xe9s'),
        picoMarkers.length>0 && React.createElement('div',{style:{marginBottom:12}},
          React.createElement('div',{style:{fontSize:11,color:'#64748b',marginBottom:8}},'PICOs non install\xe9es :'),
          picoMarkers.map(function(m){
            var checked=(raf.picoNonInstalle||[]).includes(m.label);
            return React.createElement('div',{key:m.label,
              style:{display:'flex',alignItems:'center',gap:10,marginBottom:8,cursor:'pointer'},
              onClick:function(){
                var cur=raf.picoNonInstalle||[];
                setRaf('picoNonInstalle',checked?cur.filter(function(l){return l!==m.label;}):[...cur,m.label]);
              }},
              React.createElement('div',{style:{width:20,height:20,borderRadius:5,
                border:'2px solid '+(checked?'#f97316':'#475569'),
                background:checked?'#f97316':'transparent',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}},
                checked&&React.createElement('span',{style:{color:'#fff',fontSize:13,fontWeight:700}},'✓')),
              React.createElement('div',{style:{fontSize:13,color:checked?'#fb923c':'#94a3b8',fontWeight:checked?600:400}},
                m.label+' \u2014 non install\xe9e')
            );
          })
        ),
        React.createElement('textarea',{rows:2,value:raf.equipementsRestants||'',
          onChange:function(e){setRaf('equipementsRestants',e.target.value);},
          placeholder:'Autres \xe9quipements \xe0 installer\u2026',style:TA})
      ),

      /* Ressources */
      React.createElement('div',{style:CARD},
        React.createElement('label',{style:LBL},'Ressources n\xe9cessaires'),
        React.createElement('textarea',{rows:3,value:raf.ressources||'',
          onChange:function(e){setRaf('ressources',e.target.value);},
          placeholder:'Ex : 1 technicien N2, 1 journ\xe9e, nacelle 6m\u2026',style:TA})
      ),

      /* Besoins client */
      React.createElement('div',{style:CARD},
        React.createElement('label',{style:LBL},'Besoins c\xf4t\xe9 client'),
        React.createElement('textarea',{rows:3,value:raf.besoinsClient||'',
          onChange:function(e){setRaf('besoinsClient',e.target.value);},
          placeholder:'Ex : Acc\xe8s baie info, VLAN \xe0 configurer\u2026',style:TA})
      ),

      /* Notes */
      React.createElement('div',{style:CARD},
        React.createElement('label',{style:LBL},'Notes compl\xe9mentaires'),
        React.createElement('textarea',{rows:3,value:raf.notes||'',
          onChange:function(e){setRaf('notes',e.target.value);},
          placeholder:'Observations diverses\u2026',style:TA})
      )
    ),

    finalise && React.createElement('div',{style:{...CARD,border:'1px solid #22c55e30',background:'#052010',textAlign:'center',padding:24}},
      React.createElement('div',{style:{fontSize:32,marginBottom:8}},'✅'),
      React.createElement('div',{style:{fontSize:13,color:'#22c55e',fontWeight:600}},'Section masqu\xe9e dans l\'export PDF'),
      React.createElement('div',{style:{fontSize:11,color:'#334155',marginTop:4}},'Activez "Non finalis\xe9" pour modifier le contenu.')
    )
  );
}

/* ── Main App with profile routing ─────────────────────────────────── */
function App() {
  var _useState = useState(null), profile = _useState[0], setProfile = _useState[1];
  var _usAdm = useState(null), adminSessionRoot = _usAdm[0], setAdminSessionRoot = _usAdm[1];
  var _useState2 = useState("list"), screen = _useState2[0], setScreen = _useState2[1];
  var _useState3 = useState(null), currentAuditId = _useState3[0], setCurrentAuditId = _useState3[1];
  var _usA = useState('audit'); var currentType = _usA[0], setCurrentType = _usA[1];

  var handleSelectProfile = function(prof) {
    if (prof.isAdmin) {
      // Admin: aller à l'écran de profils avec la session admin ouverte
      setAdminSessionRoot(prof);
      setScreen("profiles");
      return;
    }
    window._activeProfile = prof.id;
    setProfile(prof);
    setScreen("list");
  };

  var handleSwitchProfile = function() {
    window._activeProfile = null;
    setProfile(null);
    setCurrentAuditId(null);
    setScreen("list");
  };

  if (!profile) {
    return React.createElement(UsernameLoginScreen, { onSelect: handleSelectProfile });
  }

  var openAudit = function(id, type) { setCurrentAuditId(id); setCurrentType(type||'audit'); setScreen("editor"); };
  var createAudit = function(type) {
    setCurrentAuditId('audit_' + Date.now());
    setCurrentType(type || 'audit');
    setScreen("editor");
  };
  var createDoeFromAudit = async function(sourceId, sourceData) {
    // 1. Tenter de récupérer les plans depuis la DB (photo du plan de masse incluse)
    var ot = (sourceData.garde && sourceData.garde.ot) ? sourceData.garde.ot.trim() : '';
    var dbPlans = null;
    if (ot && typeof fetchPlansFromDb === 'function') {
      try { dbPlans = await fetchPlansFromDb(ot); } catch(e) {}
    }
    // 2. Utiliser les plans DB si dispo, sinon fallback sur les plans locaux
    var sourcePlans = dbPlans || sourceData.plans
      || (sourceData.plan ? [Object.assign({id:'plan_0',label:'RDC'}, sourceData.plan)] : []);

    var doeData = {
      garde:           { ...sourceData.garde, photoPrincipale: null },
      outils:          { notes: (sourceData.outils||{}).notes || '' },
      // Plans avec photos récupérées de la DB (prêts pour le DOE)
      plans:           sourcePlans.map(function(pl){ return { id:pl.id, label:pl.label, photo:pl.photo||null, markers:(pl.markers||[]).slice() }; }),
      pmData:          { ...sourceData.pmData },
      picoData:        { ...sourceData.picoData },
      local:           { notes: (sourceData.local||{}).notes || '', photos: [] },
      reportingPhotos: { notes: '', photos: [] },
      oeuvre:          { ...sourceData.oeuvre },
      acces:           { ...sourceData.acces },
      doe: { finalise: false, raf: { cablageRestant:'', equipementsRestants:'', ressources:'', besoinsClient:'', notes:'', picoNonInstalle:[] } }
    };
    var newId = 'audit_doe_' + Date.now();
    await saveAudit(newId, { data: doeData, status: 'En cours' });
    var allMarkers = sourcePlans.flatMap(function(p){ return p.markers||[]; });
    var pmC   = allMarkers.filter(function(m){ return m.type==='pm'; }).length;
    var picoC = allMarkers.filter(function(m){ return m.type==='pico'; }).length;
    var list  = await loadAuditList();
    await saveAuditList([...list, { id:newId, type:'doe', raisonSociale:doeData.garde.raisonSociale, ot:doeData.garde.ot, date:doeData.garde.date, status:'En cours', pmCount:pmC, picoCount:picoC }]);
    if (typeof syncRapportToDb === 'function') {
      syncRapportToDb(newId, 'doe', doeData, 'En cours').catch(function(){});
    } else if (typeof syncRapport === 'function') {
      syncRapport(newId, 'doe', doeData, 'En cours');
    }
    setCurrentAuditId(newId); setCurrentType('doe'); setScreen("editor");
  };
  var backToList = function() { setCurrentAuditId(null); setScreen("list"); };

  if (screen === "editor") return React.createElement(AuditEditor, { auditId: currentAuditId, onBack: backToList, profile: profile, onSwitchProfile: handleSwitchProfile, auditType: currentType, onCreateDOE: createDoeFromAudit });
  return React.createElement(AuditListScreen, { onOpen: openAudit, onCreate: createAudit, profile: profile, onSwitchProfile: handleSwitchProfile });
}


// Mount
/* Load profiles + config from server before mounting */
async function syncFromServer() {
  try {
    await Promise.all([
      loadProfilesFromServer(),
      loadAppUrlFromServer()
    ]);
  } catch(e) {}
}

function handleQRAutoLogin() {
  // Check if URL has #aqr= parameter (from QR code scan)
  try {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('#aqr=') < 0) return;
    var b64 = hash.split('#aqr=')[1];
    if (!b64) return;
    var data = JSON.parse(atob(b64));
    if (!data.id || !data.p) return;
    // Check expiry
    if (data.e) {
      var today = new Date(); today.setHours(0,0,0,0);
      var exp = new Date(data.e); exp.setHours(0,0,0,0);
      if (exp < today) {
        console.warn('QR code expiré');
        window.location.hash = '';
        return;
      }
    }
    // Store temp credentials for ProfileSelector to pick up
    window._qrAutoLogin = data;
    // Clean up hash from URL
    history.replaceState(null,'',window.location.pathname+window.location.search);
  } catch(e) {
    console.error('QR auto-login error:', e.message);
  }
}
handleQRAutoLogin();

function mountApp() {
  var rootEl = document.getElementById("root");
  if (!rootEl) { console.error("Root element not found!"); return; }
  var doMount = function() {
    try {
      ReactDOM.createRoot(rootEl).render(React.createElement(App, null));
    } catch(e) {
      rootEl.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace;background:#020817;min-height:100vh;word-break:break-all;font-size:12px"><b style="font-size:16px">⚠️ Erreur :</b><br><br><b>' + e.message + '</b><br><br><pre style="font-size:10px;color:#64748b;white-space:pre-wrap">' + (e.stack||'').split('\n').slice(0,8).join('\n') + '</pre><br><button onclick="location.reload()" style="background:#3b82f6;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px">Recharger</button></div>';
      throw e;
    }
  };
  if (typeof syncFromServer === 'function') {
    syncFromServer().finally(doMount);
  } else {
    doMount();
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}