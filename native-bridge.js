
(function(){
  function isAndroid(){ return !!window.AndroidBridge; }
  function isiOS(){ return !!(window.webkit && window.webkit.messageHandlers); }

  async function callIOS(name, payload){
    return new Promise(function(resolve){
      try {
        var cbName = "__ios_cb_" + Date.now() + "_" + Math.random().toString(16).slice(2);
        window[cbName] = function(result){
          try { resolve(result); } finally { try{ delete window[cbName]; }catch(e){} }
        };
        window.webkit.messageHandlers[name].postMessage({ callback: cbName, payload: payload || {} });
      } catch (e) {
        resolve(null);
      }
    });
  }

  window.NativeBridge = {
    platform: isAndroid() ? "android" : (isiOS() ? "ios" : "web"),

    async getLiveSignal(){
      if (isAndroid() && window.AndroidBridge.getLiveSignal) {
        try { window.AndroidBridge.getLiveSignal(); return true; } catch(e){}
      }
      if (isiOS()) return callIOS("getLiveSignal");
      return null;
    },

    async ocrText(src){
      if (isAndroid() && window.AndroidBridge.ocrText) {
        try { return window.AndroidBridge.ocrText(src) || ""; } catch(e){}
      }
      if (isiOS()) return callIOS("ocrText", { src: src });
      return "";
    },

    async pickPhoto(){
      if (isiOS()) return callIOS("pickPhoto");
      return null;
    },

    async exportFile(name, mimeType, dataUrl){
      if (isAndroid() && window.AndroidBridge.exportFile) {
        try { return window.AndroidBridge.exportFile(name, mimeType, dataUrl); } catch(e){}
      }
      if (isiOS()) return callIOS("exportFile", { name:name, mimeType:mimeType, dataUrl:dataUrl });
      return null;
    }
  };
})();
