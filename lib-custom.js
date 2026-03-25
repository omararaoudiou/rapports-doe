/* ── localStorage storage ── */

/* ── Profile-aware storage ── */
window._activeProfile = null; // set at login

function _pfx(k){ return 'p_'+(window._activeProfile||'default')+'_'+k; }

window.storage = {
  get: function(k) {
    return new Promise(function(res) {
      try { var v = localStorage.getItem(_pfx(k)); res(v !== null ? {value:v} : null); }
      catch(e) { res(null); }
    });
  },
  set: function(k, v) {
    return new Promise(function(res) {
      try { localStorage.setItem(_pfx(k), v); res({key:k, value:v}); }
      catch(e) { res(null); }
    });
  },
  delete: function(k) {
    return new Promise(function(res) {
      try { localStorage.removeItem(_pfx(k)); res({deleted:true}); }
      catch(e) { res(null); }
    });
  }
};

// _storage : wrapper robuste utilisé par sync.js (sans préfixe profil)
// Résout : resolve(null) au lieu de reject() pour éviter les crashes
window._storage = {
  get: async function(k) {
    try { var v = localStorage.getItem(k); return v !== null ? {value:v} : null; }
    catch(e) { return null; }
  },
  set: async function(k, v) {
    try { localStorage.setItem(k, v); }
    catch(e) {}
  },
  delete: async function(k) {
    try { localStorage.removeItem(k); }
    catch(e) {}
  }
};

/* Profiles management */
/* ── Auth helpers ─────────────────────────────────────────── */
var ADMIN_NAME = 'Omar Araudinho';
var ADMIN_ID   = 'admin_omar';

/* ── Recovery code (hash of "PICO-2025-RESET") ── */
var RECOVERY_HASH = '323d469e3f123ca6';
function checkRecoveryCode(code){
  // Simple hash check
  var c = code.trim().toUpperCase();
  var h = 0;
  for(var i=0;i<c.length;i++){
    h = ((h<<5)-h) + c.charCodeAt(i);
    h = h & h;
  }
  // Also accept direct match (stored as simple hash of the code chars)
  var expected = 0;
  var target = (localStorage.getItem('__recovery_code__')||'PICO-2026-RESET').toUpperCase();
  for(var j=0;j<target.length;j++){
    expected = ((expected<<5)-expected) + target.charCodeAt(j);
    expected = expected & expected;
  }
  return h === expected;
}


/* ── Device fingerprint ────────────────────────────────────────────── */
function getDeviceId() {
  // Get or create a persistent device ID stored locally on this device
  var key = '__device_id__';
  var id = localStorage.getItem(key);
  if (!id) {
    // Generate a unique ID for this device based on entropy
    var arr = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (var i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    id = Array.from(arr).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
    localStorage.setItem(key, id);
  }
  return id;
}

function getDeviceInfo() {
  // Collect readable device info for admin display
  var ua = navigator.userAgent || '';
  var platform = navigator.platform || '';
  // Detect device type
  var isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  var isIPhone = /iPhone/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var model = '';
  if (isIPhone) model = 'iPhone';
  else if (isAndroid) {
    var m = ua.match(/Android [^;]+;\s*([^)]+)\)/);
    model = m ? m[1].trim() : 'Android';
  } else if (/iPad/i.test(ua)) model = 'iPad';
  else model = platform || 'Inconnu';
  var browser = '';
  if (/CriOS/i.test(ua)) browser = 'Chrome iOS';
  else if (/FxiOS/i.test(ua)) browser = 'Firefox iOS';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else browser = 'Navigateur';
  return { model: model, browser: browser, isMobile: isMobile };
}

function formatDeviceLabel(deviceId) {
  if (!deviceId) return null;
  var short = deviceId.slice(0, 8).toUpperCase();
  return short;
}

function hashPwd(pwd){
  // Simple but consistent hash (not cryptographic - offline app)
  var h = 5381;
  for(var i=0;i<pwd.length;i++) h = ((h<<5)+h)^pwd.charCodeAt(i);
  return (h>>>0).toString(36);
}

function getProfiles(){
  try{
    var list = JSON.parse(localStorage.getItem('__profiles__')||'[]');
    // Toujours forcer isAdmin sur admin_omar/5671, peu importe la source
    list = list.map(function(p){
      if(p.id===ADMIN_ID || p.username==='5671'){
        p.isAdmin = true;
        p.role    = 'admin';
        if(!p.pwdHash) p.pwdHash = localStorage.getItem('__omar_pwd__')||hashPwd('5671');
      }
      return p;
    });
    if(!list.find(function(p){return p.id===ADMIN_ID;})){
      var omarPwd = localStorage.getItem('__omar_pwd__')||hashPwd('5671');
      list.unshift({
        id:ADMIN_ID, name:ADMIN_NAME, phone:'', isAdmin:true, username:'5671',
        active:true, pwdHash:omarPwd, needSetup:false, role:'admin'
      });
    }
    return list;
  }catch(e){ return []; }
}

function saveProfiles(list){
  // Sync to server (async, non-blocking)
  if (typeof saveProfilesToServer === 'function') {
    saveProfilesToServer(list).catch(function(){});
  }
  // Keep Omar's pwdHash in separate key so it can't be accidentally cleared
  var omar = list.find(function(p){return p.id===ADMIN_ID;});
  if(omar && omar.pwdHash) localStorage.setItem('__omar_pwd__', omar.pwdHash);
  localStorage.setItem('__profiles__', JSON.stringify(list));
}

function checkPwd(prof, pwd){
  if(!prof.pwdHash) return false;
  return prof.pwdHash === hashPwd(pwd);
}

/* ══════════════════════════════════════════════════════════════
   SUPABASE SYNC — profils synchronisés en ligne
   ══════════════════════════════════════════════════════════════ */
var SB_URL = 'https://ymrnodpabtolwssyxrln.supabase.co';
var SB_KEY = (window.APP_SUPABASE_KEY || localStorage.getItem('__sb_key__') || '');
var SB_TABLE = '/rest/v1/profiles';
var SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

/* Convert app profile object ↔ Supabase row */
function profileToRow(p) {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone||'',
    is_admin: p.isAdmin||false,
    active: p.active!==false,
    pwd_hash: p.pwdHash||null,
    need_setup: p.needSetup||false,
    device_id: p.deviceId||null,
    device_info: p.deviceInfo||null,
    expiry_date: p.expiryDate||null,
    temp_pwd_hash: p.tempPwdHash||null,
    temp_expiry: p.tempExpiry||null
  };
}

function rowToProfile(r) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone||'',
    isAdmin: r.is_admin||false,
    active: r.active!==false,
    pwdHash: r.pwd_hash||null,
    needSetup: r.need_setup||false,
    deviceId: r.device_id||null,
    deviceInfo: r.device_info||null,
    expiryDate: r.expiry_date||null,
    tempPwdHash: r.temp_pwd_hash||null,
    tempExpiry: r.temp_expiry||null
  };
}

/* Fetch all profiles from Supabase */
async function fetchProfilesRemote() {
  try {
    var resp = await fetch(SB_URL + SB_TABLE + '?order=created_at.asc', {
      headers: SB_HEADERS
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    var rows = await resp.json();
    return rows.map(rowToProfile);
  } catch(e) {
    console.warn('Supabase fetch error:', e.message);
    return null; // null = offline/error
  }
}

/* Upsert one profile to Supabase */
async function upsertProfileRemote(prof) {
  try {
    var row = profileToRow(prof);
    var resp = await fetch(SB_URL + SB_TABLE, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row)
    });
    if (!resp.ok) {
      var err = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + err.slice(0,100));
    }
    return true;
  } catch(e) {
    console.warn('Supabase upsert error:', e.message);
    return false;
  }
}

/* Delete one profile from Supabase */
async function deleteProfileRemote(id) {
  try {
    var resp = await fetch(SB_URL + SB_TABLE + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: SB_HEADERS
    });
    return resp.ok;
  } catch(e) {
    console.warn('Supabase delete error:', e.message);
    return false;
  }
}

/* ── Sync state ── */
var _sbSynced = false;
var _sbSyncListeners = [];

function onSbSync(fn) { _sbSyncListeners.push(fn); }
function _triggerSync() { _sbSynced=true; _sbSyncListeners.forEach(function(fn){try{fn();}catch(e){}}); }

/* ── Initial sync on load ── */
window._sbInitSync = async function() {
  var remote = await fetchProfilesRemote();
  if (remote && remote.length > 0) {
    // Remote has data → use it as source of truth
    // Keep Omar's local pwd if remote Omar has no pwd
    var localProfs = [];
    try { localProfs = JSON.parse(localStorage.getItem('__profiles__')||'[]'); } catch(e) {}
    var omarPwdLocal = localStorage.getItem('__omar_pwd__');

    // Merge: remote wins, but keep local Omar pwd if remote has none
    remote.forEach(function(rp) {
      if (rp.id === ADMIN_ID && !rp.pwdHash && omarPwdLocal) {
        rp.pwdHash = omarPwdLocal;
      }
    });

    localStorage.setItem('__profiles__', JSON.stringify(remote));
    // Sync Omar pwd
    var omarRemote = remote.find(function(p){return p.id===ADMIN_ID;});
    if (omarRemote && omarRemote.pwdHash) {
      localStorage.setItem('__omar_pwd__', omarRemote.pwdHash);
    }
    _triggerSync();
  } else if (remote && remote.length === 0) {
    // Remote is empty → push local profiles up
    var localProfs = getProfiles();
    for (var i=0; i<localProfs.length; i++) {
      await upsertProfileRemote(localProfs[i]);
    }
    _triggerSync();
  } else {
    // Offline → use local cache
    _triggerSync();
  }
};

/* ── Override saveProfiles to also sync to Supabase ── */
var _origSaveProfiles = saveProfiles;
saveProfiles = function(list) {
  // Save locally first (instant)
  _origSaveProfiles(list);
  // Then sync to Supabase async (don't block UI)
  list.forEach(function(prof) {
    upsertProfileRemote(prof).catch(function(){});
  });
};

/* ── Add deleteProfileRemote to handleDelete ── */
window._sbDeleteProfile = deleteProfileRemote;

/* ══════════════════════════════════════════════════════════
   SYNCHRONISATION PROFILS — API OVH c-it.fr
   ══════════════════════════════════════════════════════════ */
var API_BASE = 'https://c-it.fr/api.php';
var API_KEY  = (window.APP_API_KEY || localStorage.getItem('__api_key__') || '');

/* Indique si la synchro en ligne est disponible */
var _apiOnline = null; // null=inconnu, true=en ligne, false=hors ligne

async function apiCall(action, method, body) {
  try {
    var url = API_BASE + '?action=' + action + '&k=' + API_KEY;
    var opts = { method: method || 'GET',
      headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    _apiOnline = true;
    return data;
  } catch(e) {
    _apiOnline = false;
    console.warn('API hors ligne:', e.message);
    return null;
  }
}

/* Charger les profils depuis le serveur (priorité sur localStorage) */
async function loadProfilesFromServer() {
  var result = await apiCall('get_profiles', 'GET');
  if (result && result.ok && Array.isArray(result.profiles) && result.profiles.length > 0) {
    // Merge: conserver les profils locaux si serveur vide ou hors ligne
    localStorage.setItem('__profiles__', JSON.stringify(result.profiles));
    // Sync Omar pwd séparément
    var omar = result.profiles.find(function(p){ return p.id === 'admin_omar'; });
    if (omar && omar.pwdHash) localStorage.setItem('__omar_pwd__', omar.pwdHash);
    return result.profiles;
  }
  return null;
}

/* Sauvegarder les profils sur le serveur */
async function saveProfilesToServer(profiles) {
  return await apiCall('save_profiles', 'POST', { profiles: profiles });
}

/* Sauvegarder URL app sur le serveur */
async function saveAppUrlToServer(url) {
  return await apiCall('set_config', 'POST', { key: 'app_url', value: url });
}

/* Charger URL app depuis le serveur */
async function loadAppUrlFromServer() {
  var result = await apiCall('get_config', 'GET');
  if (result && result.ok && result.config && result.config.app_url) {
    localStorage.setItem('__app_url__', result.config.app_url);
    return result.config.app_url;
  }
  return null;
}

/* ── App ── */


/* ══════════════════════════════════════════════════════════
   QR CODE GENERATOR — pure JS, no deps
   Supports byte mode, versions 1-10, error correction L
   ══════════════════════════════════════════════════════════ */