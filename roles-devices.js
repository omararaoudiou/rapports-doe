
(function(){
  function validateDevices(user){
    user = user || {};
    var d = user.devices || {};
    var ok = true, errors = [];
    var mobile = d.mobile && d.mobile.deviceId;
    var desktop = d.desktop && d.desktop.deviceId;
    if (d.mobile && d.mobile.type && d.mobile.type !== "mobile") { ok = false; errors.push("Le device mobile doit être de type mobile"); }
    if (d.desktop && d.desktop.type && d.desktop.type !== "desktop") { ok = false; errors.push("Le device desktop doit être de type desktop"); }
    if (d.mobile && !d.mobile.name) errors.push("Nom du téléphone manquant");
    if (d.desktop && !d.desktop.name) errors.push("Nom de l'ordinateur manquant");
    return { ok: ok, errors: errors };
  }

  window.RolesDevices = {
    canResetDevices: function(role){ return role === "admin"; },
    validateDevices: validateDevices
  };
})();
