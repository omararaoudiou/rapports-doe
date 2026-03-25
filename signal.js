"use strict";
// ─── Sync serveur ───────────────────────────────────────────────
var API_URL = (function() {
  var p = window.location.pathname;
  var d = p.lastIndexOf('/');
  return window.location.origin + (d > 0 ? p.substring(0, d) : '') + '/api.php';
})();

// ── Pont natif Android → JS ──────────────────────────────────────────────────
window.onSignalReceived = function(json) {
  try {
    var signal = JSON.parse(typeof json === 'string' ? json : JSON.stringify(json));
    window.dispatchEvent(new CustomEvent('pico_signal_auto',        { detail: signal }));
    window.dispatchEvent(new CustomEvent('android_signal_received', { detail: signal }));
    if (typeof window.updateDisplay === 'function') {
      window.updateDisplay(JSON.stringify(signal));
    }
  } catch(e) { console.error('Erreur parsing signal:', e); }
};
window.updateDisplay = null;

function extractPhysicalSignal() {
  var result = { type:'', band:'', enb:'', lcid:'', rsrp:'', rsrq:'', snr:'', ul:'', dl:'', ping:'' };
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    if (conn.effectiveType) result.band = conn.effectiveType.toUpperCase();
    if (conn.downlink)      result.dl   = String(conn.downlink);
    if (conn.rtt)           result.ping = String(conn.rtt);
    if (result.dl || result.band) return result;
  }
  return null;
}

function extractSignalAsync(cb) {
  var bridge = window.AndroidBridge || window.Android;
  if (bridge) {
    var done = false;
    // Installer les listeners EN PREMIER avant d'appeler le bridge
    var handler = function(e) {
      if (done) return;
      done = true;
      window.removeEventListener('pico_signal_auto', handler);
      window.removeEventListener('android_signal_received', handler);
      clearTimeout(timer);
      var info = e.detail || {};
      // Passer TOUS les champs du JSON Android (4G, 5G, opérateur...)
      var base = {};
      Object.keys(info).forEach(function(k){ base[k] = String(info[k]||''); });
      // Champs garantis avec fallbacks
      base.type = info.type  || '';
      base.band = info.band  || '';
      base.rsrp = info.rsrp  ? String(info.rsrp)  : '';
      base.rsrq = info.rsrq  ? String(info.rsrq)  : '';
      base.snr  = info.snr   ? String(info.snr)   : (info.rssnr ? String(info.rssnr) : '');
      base.dl   = info.dl    ? String(info.dl)    : (info.speed_down || '');
      base.ul   = info.ul    ? String(info.ul)    : (info.speed_up   || '');
      base.ping = info.ping  ? String(info.ping)  : (info.pingMs     ? String(info.pingMs) : '');
      cb(base);
    };
    window.addEventListener('pico_signal_auto', handler);
    window.addEventListener('android_signal_received', handler);
    // Timeout 6s (startFullScan prend 3-5s pour le speedtest)
    var timer = setTimeout(function() {
      if (!done) {
        done = true;
        window.removeEventListener('pico_signal_auto', handler);
        window.removeEventListener('android_signal_received', handler);
        cb(extractPhysicalSignal() || {});
      }
    }, 6000);
    // Appeler le bridge — essayer chaque méthode dans l'ordre
    var called = false;
    try { bridge.getLiveSignal(); called = true; } catch(e1) {}
    if (!called) { try { bridge.startScan(); called = true; } catch(e2) {} }
    if (!called) { try { bridge.startFullScan(); called = true; } catch(e3) {} }
    if (!called) {
      // Aucun bridge disponible — annuler et fallback
      clearTimeout(timer);
      window.removeEventListener('pico_signal_auto', handler);
      window.removeEventListener('android_signal_received', handler);
      cb(extractPhysicalSignal() || {});
    }
    return;
  }
  // Pas de bridge du tout — fallback Chrome
  cb(extractPhysicalSignal() || {});
}

function parseNetworkCellInfoText(txt) {
  if (!txt||!txt.trim()) return null;
  var r={operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''};
  var t=txt;
  function grab(patterns){ for(var i=0;i<patterns.length;i++){var re=new RegExp(patterns[i],'i');var m=t.match(re);if(m&&m[1]!==undefined)return m[1].trim().replace(/[,;]/g,'');} return ''; }
  r.rsrp=grab(['RSRP\s*[=:]\s*(-?\d+)']);
  r.rsrq=grab(['RSRQ\s*[=:]\s*(-?\d+)']);
  r.snr=grab(['SNR\s*[=:]\s*(-?\d+(?:\.\d+)?)','RSSNR\s*[=:]\s*(-?\d+(?:\.\d+)?)','SINR\s*[=:]\s*(-?\d+(?:\.\d+)?)']);
  var bandM=t.match(/Band\s*[=:]\s*([A-Za-z0-9]+)/i)||t.match(/\bB(\d+)\b/)||t.match(/LTE\s+B(\d+)/i)||t.match(/NR\s+n(\d+)/i);
  if(bandM) r.band=bandM[0].replace(/Band\s*[=:]\s*/i,'').replace(/\s+/g,'').substring(0,10);
  r.enb=grab(['eNB(?:ID)?\s*[=:]\s*(\d+)','gNB(?:ID)?\s*[=:]\s*(\d+)','ENB\s*[=:]\s*(\d+)']);
  r.lcid=grab(['LCID\s*[=:]\s*(\d+)','PCI\s*[=:]\s*(\d+)','CI\s*[=:]\s*(\d+)']);
  r.dl=grab(['DL\s*[=:]\s*(\d+(?:\.\d+)?)','Down(?:link|load)?\s*[=:]\s*(\d+(?:\.\d+)?)']);
  r.ul=grab(['UL\s*[=:]\s*(\d+(?:\.\d+)?)','Up(?:link|load)?\s*[=:]\s*(\d+(?:\.\d+)?)']);
  r.ping=grab(['Ping\s*[=:]\s*(\d+)','RTT\s*[=:]\s*(\d+)']);
  var hasData=Object.values(r).some(function(v){return v!=='';});
  return hasData?r:null;
}


var _API_KEY = null;
async function getApiKey() {
  if (_API_KEY) return _API_KEY;
  try { var r = await (window._storage||window.storage||{get:async()=>null}).get('app_config'); if (r) { var cf = JSON.parse(r.value||'{}'); _API_KEY = cf.apiKey||null; } } catch(e) {}
  return _API_KEY;
}
async function syncRapport(auditId, docType, data, statut) {
  try {
    var k = (await getApiKey()) || '';
    var resp = await fetch(API_URL + '?action=save_rapport&k=' + encodeURIComponent(k), {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({id:auditId, docType:docType, statut:statut, data:data})
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return true;
  } catch(e) { console.warn('Sync ignoré:', e.message); return false; }
}
async function prefillFromOT(ot) {
  try {
    var k = (await getApiKey()) || '';
    var resp = await fetch(API_URL + '?action=get_by_ot&k=' + encodeURIComponent(k) + '&ot=' + encodeURIComponent(ot));
    if (!resp.ok) return null;
    var j = await resp.json();
    return j.ok ? j.data : null;
  } catch(e) { return null; }
}