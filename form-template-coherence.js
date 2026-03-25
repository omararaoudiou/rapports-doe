
(function(){
  function getSignalQuality4G5G(rsrp){
    var v = parseInt(String(rsrp || '').replace(/[^-\d]/g,''), 10);
    if (isNaN(v)) return { label:'Inexistante', color:'#d1d5db' };
    if (v >= -97) return { label:'Bonne', color:'#22c55e' };
    if (v >= -107) return { label:'Moyenne', color:'#00B0F0' };
    if (v >= -117) return { label:'Médiocre', color:'#FFC000' };
    return { label:'Mauvaise', color:'#ef4444' };
  }

  function makeInstantTRow(values){
    var q = getSignalQuality4G5G(values && values.rsrp);
    return Object.assign({ label:'Instant T', quality:q.label, rowColor:q.color }, values || {});
  }

  window.FormTemplateCoherence = {
    getSignalQuality4G5G: getSignalQuality4G5G,
    makeInstantTRow: makeInstantTRow
  };
})();
