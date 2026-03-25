"use strict";
// ════════════════════════════════════════════════════════════════════════════
//  templates.js — Charge et expose les templates JSON
//  Chargé AVANT pdf.js dans index.html
//  
//  Pour modifier un rapport : éditez uniquement le fichier JSON correspondant
//  Ne pas modifier pdf.js pour changer textes/couleurs/colonnes
// ════════════════════════════════════════════════════════════════════════════

window.PDF_TEMPLATES = {};

(function() {

  // ── Templates inline (chargés depuis JSON embarqué) ──────────────────────
  // Chaque template est accessible via window.PDF_TEMPLATES['id']
  
  var _templates = [
    'template-audit-pico',
    'template-doe-pico',
    'template-antenne',
    'template-doe-antenne',
    'template-celfi',
    'template-wifi',
    'template-starlink',
  ];

  // Chargement asynchrone de chaque JSON
  var _loaded = 0;
  var _total  = _templates.length;

  _templates.forEach(function(name) {
    fetch('./templates/' + name + '.json')
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        // Indexer par id du meta ET par nom de fichier
        window.PDF_TEMPLATES[data.meta.id] = data;
        window.PDF_TEMPLATES[name]         = data;
        _loaded++;
        if (_loaded === _total) {
          console.log('[templates.js] ' + _total + ' templates charges');
          window.dispatchEvent(new CustomEvent('pdf_templates_ready'));
        }
      })
      .catch(function(err) {
        console.warn('[templates.js] Erreur chargement ' + name + ':', err.message);
        _loaded++;
        if (_loaded === _total) {
          window.dispatchEvent(new CustomEvent('pdf_templates_ready'));
        }
      });
  });

  // ── Helper : récupère un template par docType ────────────────────────────
  window.getTemplate = function(docType) {
    return window.PDF_TEMPLATES[docType] || null;
  };

  // ── Helper : récupère une couleur rgb() depuis un template ───────────────
  window.templateColor = function(docType, colorKey) {
    var t = window.getTemplate(docType);
    if (!t || !t.colors || !t.colors[colorKey]) return null;
    var hex = t.colors[colorKey].replace('#','');
    var r = parseInt(hex.substr(0,2),16)/255;
    var g = parseInt(hex.substr(2,2),16)/255;
    var b = parseInt(hex.substr(4,2),16)/255;
    return { r:r, g:g, b:b }; // utilisable dans PDFLib.rgb()
  };

})();
