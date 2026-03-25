
(function(){
  const KEY = "audit_travaux_current_v1";
  const DOE_KEY = "audit_travaux_doe_v1";
  const state = {
    works: [],
    photos: [],
    signature: null,
    estimate: null,
    planning: null
  };

  function $(id){ return document.getElementById(id); }
  function val(id){ return $(id) ? $(id).value : ""; }
  function setVal(id, v){ if($(id)) $(id).value = v || ""; }

  function defaultWork(){
    return { zone:"", travail:"", quantite:"", unite:"m", difficulte:"Moyenne", commentaire:"" };
  }

  function renderWorks(){
    const tb = $("worksTable").querySelector("tbody");
    tb.innerHTML = "";
    state.works.forEach((w, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input value="${escapeHtml(w.zone)}" data-k="zone" data-i="${i}"></td>
        <td><input value="${escapeHtml(w.travail)}" data-k="travail" data-i="${i}"></td>
        <td><input value="${escapeHtml(w.quantite)}" data-k="quantite" data-i="${i}"></td>
        <td><input value="${escapeHtml(w.unite)}" data-k="unite" data-i="${i}"></td>
        <td><input value="${escapeHtml(w.difficulte)}" data-k="difficulte" data-i="${i}"></td>
        <td><input value="${escapeHtml(w.commentaire)}" data-k="commentaire" data-i="${i}"></td>
        <td class="row-actions"><button class="ghost" data-del="${i}">Suppr.</button></td>
      `;
      tb.appendChild(tr);
    });
    tb.querySelectorAll("input").forEach(inp => {
      inp.oninput = function(){
        const i = parseInt(this.getAttribute("data-i"), 10);
        const k = this.getAttribute("data-k");
        state.works[i][k] = this.value;
      };
    });
    tb.querySelectorAll("button[data-del]").forEach(btn => {
      btn.onclick = function(){
        state.works.splice(parseInt(this.getAttribute("data-del"), 10), 1);
        renderWorks();
      };
    });
  }

  function renderPhotos(){
    const box = $("photos");
    box.innerHTML = "";
    state.photos.forEach((p, i) => {
      const wrap = document.createElement("div");
      wrap.className = "card";
      wrap.style.marginBottom = "10px";
      wrap.innerHTML = `
        <div class="grid">
          <div><img src="${p.src}" style="width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid #1e3a5f"></div>
          <div>
            <label>Légende</label><input value="${escapeHtml(p.legend||"")}" data-leg="${i}">
            <div class="toolbar" style="margin-top:10px">
              <button class="ghost" data-replace="${i}">Remplacer</button>
              <button class="warn" data-remove="${i}">Supprimer</button>
            </div>
          </div>
        </div>`;
      box.appendChild(wrap);
    });
    box.querySelectorAll("input[data-leg]").forEach(inp => {
      inp.oninput = function(){ state.photos[parseInt(this.getAttribute("data-leg"),10)].legend = this.value; };
    });
    box.querySelectorAll("button[data-remove]").forEach(btn => btn.onclick = function(){
      state.photos.splice(parseInt(this.getAttribute("data-remove"),10),1); renderPhotos();
    });
    box.querySelectorAll("button[data-replace]").forEach(btn => btn.onclick = function(){
      const i = parseInt(this.getAttribute("data-replace"),10);
      pickFile(function(src){ state.photos[i].src = src; renderPhotos(); });
    });
  }

  function pickFile(cb){
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = e => {
      const f = e.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = ev => cb(ev.target.result);
      r.readAsDataURL(f);
    };
    inp.click();
  }

  function collect(){
    return {
      docType: "audit_travaux",
      garde: {
        ot: val("g_ot"), date: val("g_date"), client: val("g_client"), adresse: val("g_adresse"),
        contact: val("g_contact"), telephone: val("g_tel"), email: val("g_mail"),
        technicien: val("g_technicien"), societe: val("g_societe"), typeChantier: val("g_type")
      },
      description: { nature: val("d_nature"), description: val("d_description") },
      site: {
        type: val("s_type"), surface: val("s_surface"), etages: val("s_etages"),
        environnement: val("s_environnement"), infrastructure: val("s_infra"), contraintes: val("s_contraintes")
      },
      acces: {
        acces: val("a_acces"), horaires: val("a_horaires"), stationnement: val("a_stationnement"), risques: val("a_risques")
      },
      works: state.works,
      cheminement: {
        passage: val("c_passage"), distance: val("c_distance"), complexite: val("c_complexite"), contraintes: val("c_contraintes")
      },
      terrassement: {
        sol: val("t_sol"), longueur: val("t_longueur"), profondeur: val("t_profondeur"), pose: val("t_pose")
      },
      equipements: val("e_equipements"),
      moyens: { moyens: val("m_moyens"), nbTech: val("m_nbTech"), duree: val("m_duree"), hauteur: val("m_hauteur") },
      contraintesTech: val("ct_tech"),
      securite: { risques: val("sec_risques"), mesures: val("sec_mesures") },
      photos: state.photos,
      conclusion: {
        faisabilite: val("co_faisabilite"), conditions: val("co_conditions"), recommandations: val("co_reco"), validation: val("co_validation")
      },
      estimate: state.estimate,
      planning: state.planning,
      signature: state.signature
    };
  }

  function hydrate(data){
    data = data || {};
    const g = data.garde || {};
    setVal("g_ot", g.ot); setVal("g_date", g.date || new Date().toLocaleDateString("fr-FR"));
    setVal("g_client", g.client); setVal("g_adresse", g.adresse); setVal("g_contact", g.contact);
    setVal("g_tel", g.telephone); setVal("g_mail", g.email); setVal("g_technicien", g.technicien);
    setVal("g_societe", g.societe); setVal("g_type", g.typeChantier || "cablage_reseau");
    setVal("d_nature", data.description && data.description.nature); setVal("d_description", data.description && data.description.description);
    setVal("s_type", data.site && data.site.type); setVal("s_surface", data.site && data.site.surface);
    setVal("s_etages", data.site && data.site.etages); setVal("s_environnement", data.site && data.site.environnement);
    setVal("s_infra", data.site && data.site.infrastructure); setVal("s_contraintes", data.site && data.site.contraintes);
    setVal("a_acces", data.acces && data.acces.acces); setVal("a_horaires", data.acces && data.acces.horaires);
    setVal("a_stationnement", data.acces && data.acces.stationnement); setVal("a_risques", data.acces && data.acces.risques);
    setVal("c_passage", data.cheminement && data.cheminement.passage); setVal("c_distance", data.cheminement && data.cheminement.distance);
    setVal("c_complexite", data.cheminement && data.cheminement.complexite); setVal("c_contraintes", data.cheminement && data.cheminement.contraintes);
    setVal("t_sol", data.terrassement && data.terrassement.sol); setVal("t_longueur", data.terrassement && data.terrassement.longueur);
    setVal("t_profondeur", data.terrassement && data.terrassement.profondeur); setVal("t_pose", data.terrassement && data.terrassement.pose);
    setVal("e_equipements", data.equipements); setVal("m_moyens", data.moyens && data.moyens.moyens);
    setVal("m_nbTech", data.moyens && data.moyens.nbTech); setVal("m_duree", data.moyens && data.moyens.duree);
    setVal("m_hauteur", data.moyens && data.moyens.hauteur); setVal("ct_tech", data.contraintesTech);
    setVal("sec_risques", data.securite && data.securite.risques); setVal("sec_mesures", data.securite && data.securite.mesures);
    setVal("co_faisabilite", data.conclusion && data.conclusion.faisabilite || "OK");
    setVal("co_conditions", data.conclusion && data.conclusion.conditions); setVal("co_reco", data.conclusion && data.conclusion.recommandations);
    setVal("co_validation", data.conclusion && data.conclusion.validation);
    state.works = Array.isArray(data.works) ? data.works : [defaultWork()];
    state.photos = Array.isArray(data.photos) ? data.photos : [];
    state.signature = data.signature || null;
    state.estimate = data.estimate || null;
    state.planning = data.planning || null;
    renderWorks(); renderPhotos(); renderEstimate(); renderPlanning(); renderSignatureStatus();
  }

  function renderEstimate(){
    const box = $("estimateBox");
    if(!state.estimate){ box.innerHTML = "<small>Aucune estimation générée.</small>"; return; }
    box.innerHTML = `<pre>${escapeHtml(JSON.stringify(state.estimate, null, 2))}</pre>`;
  }

  function renderPlanning(){
    const box = $("planningBox");
    if(!state.planning){ box.innerHTML = "<small>Aucun planning généré.</small>"; return; }
    box.innerHTML = `<pre>${escapeHtml(JSON.stringify(state.planning, null, 2))}</pre>`;
  }

  function renderSignatureStatus(){
    $("signatureStatus").innerHTML = state.signature ? "<small>Signature enregistrée.</small>" : "<small>Pas encore enregistrée.</small>";
  }

  function download(name, content, mime){
    const blob = new Blob([content], {type:mime||"text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function generateEstimate(){
    const lines = state.works.map(w => {
      const q = parseFloat(String(w.quantite||"0").replace(",", ".")) || 0;
      let unitPrice = 0;
      const t = (w.travail||"").toLowerCase();
      if (t.includes("rj45") || t.includes("câble") || t.includes("cable")) unitPrice = 4.5;
      else if (t.includes("borne")) unitPrice = 180;
      else if (t.includes("baie")) unitPrice = 950;
      else if (t.includes("tranch")) unitPrice = 65;
      else if (t.includes("fourreau") || t.includes("gaine")) unitPrice = 12;
      else unitPrice = 50;
      return { zone:w.zone, travail:w.travail, quantite:q, unite:w.unite, prixUnitaire:unitPrice, total: Math.round(q*unitPrice*100)/100 };
    });
    const total = lines.reduce((s,l)=>s+(l.total||0),0);
    state.estimate = { generatedAt:new Date().toISOString(), currency:"EUR", lines:lines, totalHT: Math.round(total*100)/100 };
    renderEstimate();
  }

  function generatePlanning(){
    const tasks = state.works.map((w,idx)=>{
      let days = 0.5;
      const t = (w.travail||"").toLowerCase();
      if (t.includes("tranch")) days = 1.5;
      else if (t.includes("baie")) days = 1;
      else if (t.includes("borne")) days = 0.5;
      else if (t.includes("câble") || t.includes("cable")) days = 0.5;
      return { ordre: idx+1, zone:w.zone, travail:w.travail, chargeJours:days };
    });
    state.planning = { generatedAt:new Date().toISOString(), tasks:tasks, chargeTotaleJours: tasks.reduce((s,t)=>s+t.chargeJours,0) };
    renderPlanning();
  }

  function convertToDoe(){
    const report = collect();
    const doe = JSON.parse(JSON.stringify(report));
    doe.docType = "doe_travaux";
    doe.convertedFrom = "audit_travaux";
    doe.convertedAt = new Date().toISOString();
    localStorage.setItem(DOE_KEY, JSON.stringify(doe));
    alert("DOE Travaux généré en local.");
  }

  function exportWord(){
    const report = collect();
    const lines = [];
    lines.push("AUDIT TRAVAUX CHANTIER");
    lines.push("");
    lines.push("Numéro OT : " + (report.garde.ot||""));
    lines.push("Date : " + (report.garde.date||""));
    lines.push("Client : " + (report.garde.client||""));
    lines.push("Adresse : " + (report.garde.adresse||""));
    lines.push("");
    lines.push("Description : " + (report.description.description||""));
    lines.push("");
    lines.push("TRAVAUX");
    report.works.forEach(w => lines.push("- " + [w.zone, w.travail, w.quantite, w.unite, w.difficulte, w.commentaire].filter(Boolean).join(" | ")));
    lines.push("");
    lines.push("Conclusion : " + (report.conclusion.faisabilite||""));
    download("audit_travaux.doc", lines.join("\n"), "application/msword");
  }

  function exportPdf(){
    window.print();
  }

  function syncNow(){
    const report = collect();
    if (window.OfflineSyncQueue && window.syncRapport) {
      window.OfflineSyncQueue.enqueue({ kind:"rapport", auditId:"audit_travaux_" + Date.now(), docType:"audit_travaux", data:report, statut:"En cours" });
      if (navigator.onLine) {
        window.OfflineSyncQueue.flush(async item => {
          return !!(await window.syncRapport(item.auditId, item.docType, item.data, item.statut));
        }).then(()=>alert("Synchronisation tentée."));
      } else {
        alert("Rapport mis en file d'attente offline.");
      }
    } else {
      alert("Module de synchro indisponible dans cette page.");
    }
  }

  function save(){
    localStorage.setItem(KEY, JSON.stringify(collect()));
    alert("Audit travaux sauvegardé localement.");
  }

  function load(){
    const data = JSON.parse(localStorage.getItem(KEY) || "null") || {
      garde:{ date:new Date().toLocaleDateString("fr-FR") },
      works:[defaultWork()]
    };
    hydrate(data);
  }

  function addWork(){ state.works.push(defaultWork()); renderWorks(); }
  function addPhoto(){ pickFile(src => { state.photos.push({src:src, legend:""}); renderPhotos(); }); }

  function escapeHtml(s){
    return String(s||"").replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  }

  // Signature
  const canvas = document.getElementById("signature");
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2; ctx.strokeStyle = "#111";
  let drawing = false;
  function pos(e){
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x:(t.clientX-r.left)*(canvas.width/r.width), y:(t.clientY-r.top)*(canvas.height/r.height) };
  }
  function start(e){ drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); }
  function move(e){ if(!drawing) return; const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault(); }
  function end(){ drawing=false; }
  canvas.addEventListener("mousedown", start); canvas.addEventListener("mousemove", move); window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, {passive:false}); canvas.addEventListener("touchmove", move, {passive:false}); window.addEventListener("touchend", end);

  function clearSignature(){ ctx.clearRect(0,0,canvas.width,canvas.height); state.signature = null; renderSignatureStatus(); }
  function saveSignature(){ state.signature = canvas.toDataURL("image/png"); renderSignatureStatus(); }

  window.AuditTravauxApp = {
    save, load, addWork, addPhoto, generateEstimate, generatePlanning, convertToDoe,
    exportWord, exportPdf, syncNow, clearSignature, saveSignature
  };

  load();
})();
