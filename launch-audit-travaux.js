
(function(){
  function ensureBtn(){
    if (document.getElementById("open-audit-travaux-btn")) return;
    var root = document.getElementById("root");
    if (!root) return;
    var btn = document.createElement("button");
    btn.id = "open-audit-travaux-btn";
    btn.innerHTML = "🏗️ Audit Travaux";
    btn.style.cssText = "position:fixed;right:14px;bottom:82px;z-index:9999;background:#f59e0b;border:0;color:#111827;padding:12px 14px;border-radius:12px;font-weight:800;box-shadow:0 8px 24px #0008;cursor:pointer";
    btn.onclick = function(){ window.location.href = "audit_travaux.html"; };
    document.body.appendChild(btn);
  }
  new MutationObserver(ensureBtn).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("load", ensureBtn);
})();
