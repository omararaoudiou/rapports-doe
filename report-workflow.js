
(function(){
  function deepClone(obj){ return JSON.parse(JSON.stringify(obj || {})); }

  window.ReportWorkflow = {
    convertAuditToDoe: function(audit){
      var doe = deepClone(audit);
      doe.docType = (audit.docType || "").replace("audit", "doe") || "doe";
      doe.sourceAuditId = audit.id || "";
      doe.status = "draft";
      doe.photosEditable = true;
      doe.convertedAt = new Date().toISOString();
      return doe;
    },

    computeCradlepointSections: function(audit){
      var force = audit && audit.forceSolution || "";
      if (force === "w1850") return { showW1850:true, showW1855:false, showStarlink:false };
      if (force === "w1855") return { showW1850:false, showW1855:true, showStarlink:false };
      if (force === "starlink") return { showW1850:false, showW1855:false, showStarlink:true };

      var m = (audit && audit.mesures) || {};
      function isGood(v){
        var n = parseInt(String(v || "").replace(/[^-\d]/g, ""), 10);
        return !isNaN(n) && n >= -105;
      }
      var indoor = isGood(m.baie5g_bytel?.rsrp) || isGood(m.baie4g_bytel?.rsrp);
      var outdoor = isGood(m.ext5g_bytel?.rsrp) || isGood(m.ext4g_bytel?.rsrp);
      return {
        showW1850: !!indoor,
        showW1855: !indoor && !!outdoor,
        showStarlink: !indoor && !outdoor
      };
    }
  };
})();
