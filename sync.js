"use strict";
// sync.js — Persistance locale (localStorage) + synchronisation DB (api.php)
// Les plans de mesure sont AUSSI stockés en base pour le DOE PICO

var _storage = window._storage || {
  get:    async function(k) { try { var v=localStorage.getItem(k); return v!==null?{value:v}:null; } catch(e){return null;} },
  set:    async function(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  delete: async function(k)  { try { localStorage.removeItem(k); } catch(e){} }
};

const STORAGE_INDEX_KEY = "audits-index-v2";

// ── Fonctions stockage local ───────────────────────────────────────────────────
async function loadAuditList()       { try { const r=await _storage.get(STORAGE_INDEX_KEY); return r?JSON.parse(r.value):[]; } catch(e){return[];} }
async function saveAuditList(l)      { try { await _storage.set(STORAGE_INDEX_KEY, JSON.stringify(l)); } catch(e){} }
async function loadAudit(id)         { try { const r=await _storage.get(`audit2:${id}`); return r?JSON.parse(r.value):null; } catch(e){return null;} }
async function saveAudit(id, data)   { try { await _storage.set(`audit2:${id}`, JSON.stringify(data)); } catch(e){} }
async function deleteAuditStorage(id){ try { await _storage.delete(`audit2:${id}`); } catch(e){} }

// ── Constantes API ────────────────────────────────────────────────────────────
var _API_URL  = './api.php';
var _API_KEY  = (typeof API_KEY !== 'undefined' && API_KEY) ? API_KEY : (localStorage.getItem('__api_key__') || null);

function _apiHeaders() {
  return { 'Content-Type': 'application/json', 'X-Api-Key': _API_KEY || '' };
}

// ── Synchronisation vers la base de données ───────────────────────────────────
// Appelée à chaque sauvegarde manuelle (bouton "Sauvegarder")
// - Envoie tout le rapport sauf les photos (trop volumineuses)
// - EXCEPTION : les photos des plans de masse sont envoyées (nécessaires pour DOE)
async function syncRapportToDb(id, docType, data, statut) {
  try {
    if (!_API_KEY) return { ok: false, reason: 'no_api_key' };
    var ot = (data.garde && data.garde.ot) ? data.garde.ot.trim() : '';
    if (!ot) return { ok: false, reason: 'no_ot' };

    // Copie allégée : on exclut les photos binaires lourdes sauf plans
    var dataForDb = stripPhotosExceptPlans(data);

    var res = await fetch(_API_URL + '?action=save_rapport', {
      method:  'POST',
      headers: _apiHeaders(),
      body:    JSON.stringify({ id: id, docType: docType, statut: statut || 'En cours', data: dataForDb })
    });
    var json;
    try { json = await res.json(); } catch(e) { return { ok:false, reason:'invalid_json' }; }
    return json.ok ? { ok: true, ot: json.numero_ot } : { ok: false, reason: json.error || 'api_error' };
  } catch(e) {
    return { ok: false, reason: e.message };
  }
}

// ── Strip photos sauf plans de mesure ─────────────────────────────────────────
// Garde : plans[].photo (photo du plan de masse)
// Retire : photoPrincipale, photos PICO, photos sections, photos reporting
function stripPhotosExceptPlans(data) {
  var d = JSON.parse(JSON.stringify(data)); // deep clone

  // Supprimer photo principale page de garde
  if (d.garde) d.garde.photoPrincipale = null;

  // Supprimer photos des sections (local, reportingPhotos, outils)
  if (d.local && d.local.photos)
    d.local.photos = (d.local.photos || []).map(function(p){ return { src: null, annotated: null }; });
  if (d.reportingPhotos && d.reportingPhotos.photos)
    d.reportingPhotos.photos = [];
  if (d.outils) { d.outils.photoGauche = null; d.outils.photoDroit = null; }

  // Supprimer photos PICO (on garde IMEI/SN/MAC/emplacement mais pas les photos)
  if (d.picoData) {
    Object.keys(d.picoData).forEach(function(k) {
      if (d.picoData[k]) d.picoData[k].photo = null;
    });
  }

  // Supprimer photos CEL-FI
  if (d.celfi) {
    if (d.celfi.nu) d.celfi.nu.photo = null;
    if (d.celfi.cus) d.celfi.cus.forEach(function(cu){ cu.photo = null; });
  }

  // Supprimer photos Starlink
  if (d.starlink) d.starlink.obstructionPhoto = null;

  // ✅ CONSERVER plans[].photo (photo du plan de masse → nécessaire pour DOE)
  // plans[].markers → conservés intégralement
  // Les photos sont déjà en base64 raisonnable (plan de masse compressé)

  return d;
}

// ── Récupérer les plans depuis la DB pour pré-remplir le DOE ─────────────────
async function fetchPlansFromDb(ot) {
  try {
    if (!_API_KEY || !ot) return null;
    var res  = await fetch(_API_URL + '?action=get_plans&ot=' + encodeURIComponent(ot), {
      headers: _apiHeaders()
    });
    var json; try { json = await res.json(); } catch(e) { return null; }
    return json.ok && json.plans && json.plans.length > 0 ? json.plans : null;
  } catch(e) {
    return null;
  }
}

// ── Récupérer les données d'un rapport Audit par OT (pour créer un DOE) ──────
async function fetchAuditByOt(ot) {
  try {
    if (!_API_KEY || !ot) return null;
    var res  = await fetch(_API_URL + '?action=get_by_ot&ot=' + encodeURIComponent(ot), {
      headers: _apiHeaders()
    });
    var json; try { json = await res.json(); } catch(e) { return null; }
    return json.ok ? json : null;
  } catch(e) {
    return null;
  }
}


// ── Envoi rapport Word par email ─────────────────────────────────────────────
async function envoyerRapportEmail(ot, blob, email, type) {
  if (!blob) throw new Error('Blob Word manquant');
  if (!email || !email.includes('@')) throw new Error('Email invalide');
  var nomFichier = 'Rapport_' + String(ot||'rapport').replace(/[^a-zA-Z0-9_\-]/g,'_') + '.docx';
  var formData = new FormData();
  formData.append('pdf', new File([blob], nomFichier,
    {type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
  formData.append('email', email);
  formData.append('ot',    ot || 'rapport');
  formData.append('type',  type || 'Rapport');
  var apiKey = (typeof API_KEY !== 'undefined') ? API_KEY : (_API_KEY || '');
  var res = await fetch(
    _API_URL + '?action=send_report_mail&k=' + encodeURIComponent(apiKey),
    { method: 'POST', body: formData }
  );
  var rawText = await res.text();
  var result;
  try {
    result = JSON.parse(rawText);
  } catch(jsonErr) {
    // Le serveur a retourné du HTML (erreur PHP)
    var htmlErr = rawText.replace(/<[^>]+>/g,'').trim().substring(0,200);
    throw new Error('Erreur serveur PHP: ' + (htmlErr||res.status));
  }
  if (!res.ok || !result.ok) throw new Error(result.error || ('HTTP '+res.status));
  return result;
}
window.envoyerRapportEmail = envoyerRapportEmail;

