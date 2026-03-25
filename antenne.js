"use strict";
var ANTENNE_SECTIONS = [
  {id:'garde',          label:'Page de garde',    icon:'🏠'},
  {id:'preambule',      label:'Préambule',        icon:'📋'},
  {id:'outils',         label:'Outils & Mesures', icon:'📡'},
  {id:'ant_prereqs',    label:'Prérequis',        icon:'✅'},
  {id:'ant_plans',      label:'Plans / Travaux',  icon:'🗺️'},
  {id:'ant_conclusion', label:'Conclusion',       icon:'📝'},
  {id:'photos',         label:'Photos',           icon:'📸'},
  {id:'acces',          label:'Accès site',       icon:'🚪'},
];

function defaultAntenneData() {
  return {
    garde: { ot:'', cdp:'', raisonSociale:'', adresse:'', contact:'', telephone:'', email:'',
      technicien:'', date:new Date().toLocaleDateString('fr-FR'), photoPrincipale:null },
    preambule: { notes:'' },
    outils: { notes:'', photoGauche:null, photoDroit:null },
    plan: { photo:null, markers:[] },
    antenne: {
      prereqs: [
        { label:'Qualite signal 4G (RSRQ > -14dBm)',           ok:false },
        { label:'Reception 4G outdoor > -105dBm',              ok:false },
        { label:'Ecart debit indoor/outdoor > 2Mbps',          ok:false },
        { label:'Distance routeur/antenne externe <= 30m',     ok:false },
        { label:'Positionnement antenne valide avec client',   ok:false },
        { label:'Autorisations administratives gerees client', ok:false },
      ],
      mesures: [
        {label:'Test 1 - emplacement antenne externe', operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
        {label:'Test 2 - emplacement antenne externe', operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
        {label:'Test 3 - emplacement antenne externe', operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
        {label:'Test 1 - emplacement routeur',         operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
        {label:'Test 2 - emplacement routeur',         operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
        {label:'Test 3 - emplacement routeur',         operateur:'',band:'',enb:'',lcid:'',rsrp:'',rsrq:'',snr:'',ul:'',dl:'',ping:''},
      ],
      planPhoto:null, cheminement:'',
      longueurCoax:'', margePercent:'10',
      nbTechniciens:'2', nbJours:'1',
      nacelle:false, nacelleHauteur:'', pirl:false, echafaudage:false,
      escabeau:false, escabeauHauteur:'', epi:false, perforateur:false, visseuse:false,
      fournitures:'', notes:'',
      finConclusion:'',
    },
    photos: { photos:[] },
    acces: { notes:'' },
  };
}
// ════════════════════════════════════════════════════════
//  DOE ANTENNE DÉPORTÉE
// ════════════════════════════════════════════════════════
// (uses ANTENNE_SECTIONS — same tabs, different docType)

// ════════════════════════════════════════════════════════
//  CEL-FI QUATRA — Sections + Data
// ════════════════════════════════════════════════════════
var CELFI_SECTIONS = [
  {id:'garde',        label:'Page de garde',   icon:'🏠'},
  {id:'preambule',    label:'Préambule',        icon:'📋'},
  {id:'outils',       label:'Outils & Mesures', icon:'📡'},
  {id:'celfi_units',  label:'NU / CU',          icon:'📶'},
  {id:'celfi_mesures',label:'Mesures radio',    icon:'📊'},
  {id:'ant_plans',    label:'Plans / Câblage',  icon:'🗺️'},
  {id:'ant_conclusion',label:'Conclusion',      icon:'📝'},
  {id:'photos',       label:'Photos',           icon:'📸'},
  {id:'acces',        label:'Accès site',        icon:'🚪'},
];

function defaultCelfiData() {
  return {
    garde:    { ot:'', cdp:'', raisonSociale:'', adresse:'', contact:'', telephone:'', email:'',
                technicien:'', date:new Date().toLocaleDateString('fr-FR'), photoPrincipale:null },
    preambule:{ notes:'' },
    outils:   { notes:'', photoGauche:null, photoDroit:null },
    plan:     { photo:null, markers:[] },
    celfi: {
      nu: { imei:'', sn:'', mac:'', hauteur:'', emplacement:'', photo:null, supervision:'LAN Client' },
      cus: [
        { id:'CU1', sn:'', mac:'', hauteur:'', emplacement:'', photo:null },
        { id:'CU2', sn:'', mac:'', hauteur:'', emplacement:'', photo:null },
        { id:'CU3', sn:'', mac:'', hauteur:'', emplacement:'', photo:null },
        { id:'CU4', sn:'', mac:'', hauteur:'', emplacement:'', photo:null },
      ],
      mesures3g: [
        {label:'Point 1', operateur:'', band:'', rnc:'', lcid:'', rscp:'', ecio:'', ul:'', dl:'', ping:''},
        {label:'Point 2', operateur:'', band:'', rnc:'', lcid:'', rscp:'', ecio:'', ul:'', dl:'', ping:''},
        {label:'Point 3', operateur:'', band:'', rnc:'', lcid:'', rscp:'', ecio:'', ul:'', dl:'', ping:''},
      ],
      mesures4g: [
        {label:'Point 1', operateur:'', band:'', enb:'', lcid:'', rsrp:'', rsrq:'', snr:'', ul:'', dl:'', ping:''},
        {label:'Point 2', operateur:'', band:'', enb:'', lcid:'', rsrp:'', rsrq:'', snr:'', ul:'', dl:'', ping:''},
        {label:'Point 3', operateur:'', band:'', enb:'', lcid:'', rsrp:'', rsrq:'', snr:'', ul:'', dl:'', ping:''},
      ],
      cheminement:'', longueurCoax:'', margePercent:'10',
      nbTechniciens:'2', nbJours:'1', finConclusion:'',
    },
    photos: { photos:[] },
    acces:  { notes:'' },
  };
}

// ════════════════════════════════════════════════════════
//  WIFI — Sections + Data
// ════════════════════════════════════════════════════════
var WIFI_SECTIONS = [
  {id:'garde',       label:'Page de garde',   icon:'🏠'},
  {id:'preambule',   label:'Préambule',        icon:'📋'},
  {id:'outils',      label:'Outils & Mesures', icon:'📡'},
  {id:'wifi_bornes', label:'Bornes WIFI',      icon:'🌐'},
  {id:'wifi_mesures',label:'Mesures signal',   icon:'📊'},
  {id:'ant_plans',   label:'Plan câblage',     icon:'🗺️'},
  {id:'ant_conclusion',label:'Conclusion',     icon:'📝'},
  {id:'photos',      label:'Photos',           icon:'📸'},
  {id:'acces',       label:'Accès site',        icon:'🚪'},
];

function defaultWifiData() {
  return {
    garde:    { ot:'', cdp:'', raisonSociale:'', adresse:'', contact:'', telephone:'', email:'',
                technicien:'', date:new Date().toLocaleDateString('fr-FR'), photoPrincipale:null },
    preambule:{ notes:'' },
    outils:   { notes:'', photoGauche:null, photoDroit:null },
    plan:     { photo:null, markers:[] },
    wifi: {
      bornes: [
        {id:'WIFI1', ssid:'', hauteur:'', cablage:'', prise:'', sn:'', mac:'', emplacement:'', photo:null},
        {id:'WIFI2', ssid:'', hauteur:'', cablage:'', prise:'', sn:'', mac:'', emplacement:'', photo:null},
        {id:'WIFI3', ssid:'', hauteur:'', cablage:'', prise:'', sn:'', mac:'', emplacement:'', photo:null},
        {id:'WIFI4', ssid:'', hauteur:'', cablage:'', prise:'', sn:'', mac:'', emplacement:'', photo:null},
      ],
      mesures: [
        {label:'Point 1', borne:'', ssid:'', rssi:'', channel:'', ul:'', dl:'', ping:''},
        {label:'Point 2', borne:'', ssid:'', rssi:'', channel:'', ul:'', dl:'', ping:''},
        {label:'Point 3', borne:'', ssid:'', rssi:'', channel:'', ul:'', dl:'', ping:''},
        {label:'Point 4', borne:'', ssid:'', rssi:'', channel:'', ul:'', dl:'', ping:''},
      ],
      cheminement:'', longueurTotal:'', nbPrises:'',
      nbTechniciens:'2', nbJours:'1', finConclusion:'',
    },
    photos: { photos:[] },
    acces:  { notes:'' },
  };
}

// ════════════════════════════════════════════════════════
//  STARLINK / CRADLEPOINT — Sections + Data
// ════════════════════════════════════════════════════════
var STARLINK_SECTIONS = [
  {id:'garde',            label:'Page de garde',    icon:'🏠'},
  {id:'preambule',        label:'Préambule',         icon:'📋'},
  {id:'outils',           label:'Outils & Mesures',  icon:'📡'},
  {id:'starlink_prereqs', label:'Prérequis',         icon:'✅'},
  {id:'starlink_install', label:'Installation',      icon:'🛰️'},
  {id:'ant_mesures',      label:'Mesures signal',    icon:'📊'},
  {id:'ant_plans',        label:'Plan & Câblage',    icon:'🗺️'},
  {id:'ant_conclusion',   label:'Conclusion',        icon:'📝'},
  {id:'photos',           label:'Photos',            icon:'📸'},
  {id:'acces',            label:'Accès site',         icon:'🚪'},
];

function defaultStarlinkData() {
  return {
    garde:    { ot:'', cdp:'', raisonSociale:'', adresse:'', contact:'', telephone:'', email:'',
                technicien:'', date:new Date().toLocaleDateString('fr-FR'), photoPrincipale:null },
    preambule:{ notes:'' },
    outils:   { notes:'', photoGauche:null, photoDroit:null },
    plan:     { photo:null, markers:[] },
    starlink: {
      // Type d'équipement et de projet
      typeAudit:   'STARLINK',    // STARLINK | CRADLEPOINT | AERIEN
      typeProjet:  'aerien',      // aerien | u_tech | schiever_crea
      modele:      'standard',    // standard | flat_high_performance

      // Prérequis
      prereqs: [
        {label:'Distance adaptateur < 50m',                      ok:false},
        {label:'Dalle béton lestée (min 25kg/m²)',               ok:false},
        {label:'Gaine fendue 35mm disponible ou percée',         ok:false},
        {label:'Percement façade validé client',                 ok:false},
        {label:'Alimentation 220V à proximité',                  ok:false},
        {label:'Test obstruction Starlink OK (score < 5)',       ok:false},
        {label:'Validation positionnement avec client',          ok:false},
        {label:'Autorisations administratives OK',               ok:false},
      ],

      // Installation
      obstructionScore: '',
      obstructionPhoto: null,
      hauteurMat:       '',
      orientationAzimut:'',
      distanceCable:    '25',  // 25 | 50
      typePose:         '',    // ex: toiture, façade, mât autostable
      percement:        false,
      gaineDiametre:    '35',  // mm
      sn: '', mac: '',

      // Fournitures
      fournitures: [
        {label:'Kit Starlink Standard / Flat HP', qty:'1',    unite:'u'},
        {label:'Mât autostable 2m',               qty:'1',    unite:'u'},
        {label:'Gaine fendue 35mm',               qty:'',     unite:'m'},
        {label:'Cheville + vis acier inox',       qty:'6',    unite:'u'},
        {label:'Manchon lest béton',              qty:'1',    unite:'u'},
        {label:'Chemin de câble / colliers',      qty:'',     unite:'lot'},
      ],

      // Mesures Starlink
      mesures: [
        {label:'Test 1 — Starlink actif', operateur:'Starlink', band:'Ka/Ku', rsrp:'', ul:'', dl:'', ping:'', latence:''},
        {label:'Test 2 — Starlink actif', operateur:'Starlink', band:'Ka/Ku', rsrp:'', ul:'', dl:'', ping:'', latence:''},
        {label:'Test 3 — Starlink actif', operateur:'Starlink', band:'Ka/Ku', rsrp:'', ul:'', dl:'', ping:'', latence:''},
      ],

      // Mesures comparatives opérateurs (Bouygues vs Orange)
      mesuresComparatives: [
        {point:'Point 1', op_bytel_rsrp:'', op_bytel_rsrq:'', op_bytel_snr:'', op_bytel_dl:'', op_bytel_ul:'',
                          op_orange_rsrp:'', op_orange_rsrq:'', op_orange_snr:'', op_orange_dl:'', op_orange_ul:''},
        {point:'Point 2', op_bytel_rsrp:'', op_bytel_rsrq:'', op_bytel_snr:'', op_bytel_dl:'', op_bytel_ul:'',
                          op_orange_rsrp:'', op_orange_rsrq:'', op_orange_snr:'', op_orange_dl:'', op_orange_ul:''},
        {point:'Point 3', op_bytel_rsrp:'', op_bytel_rsrq:'', op_bytel_snr:'', op_bytel_dl:'', op_bytel_ul:'',
                          op_orange_rsrp:'', op_orange_rsrq:'', op_orange_snr:'', op_orange_dl:'', op_orange_ul:''},
      ],

      cheminement:'', longueurCoax:'', margePercent:'10',
      nbTechniciens:'2', nbJours:'1', finConclusion:'',
    },
    photos: { photos:[] },
    acces:  { notes:'' },
  };
}
