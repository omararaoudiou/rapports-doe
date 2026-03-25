
(function(){
  function clean(s){ return String(s || "").replace(/[ \t]+/g, " ").trim(); }
  function grab(re, txt){ var m = txt.match(re); return m ? clean(m[1] || m[0]) : ""; }

  function parseCommon(txt){
    var out = {};
    out.email = grab(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, txt);
    out.telephone = grab(/(?:\+33\s?\(?0\)?|0)\s?[1-9](?:[ .-]?\d{2}){4}/, txt).replace(/^\+33\s?\(?0\)?/, "0");
    var d = grab(/\b(\d{2}\/\d{2}\/\d{2,4})\b/, txt);
    out.date = d || new Date().toLocaleDateString("fr-FR");
    return out;
  }

  function parseSogetrel(txt){
    var out = parseCommon(txt);
    out.ot = grab(/(?:Intervention|Commande|OT|Référence)\s*(?:#|:)?\s*([A-Z0-9\/-]{4,})/i, txt);
    out.raisonSociale = grab(/Site de la prestation\s+([A-Z0-9 .\-']+)/i, txt) ||
                        grab(/Client\s*:?\s*([A-Z0-9 .\-']+)/i, txt);
    out.contact = grab(/(?:Contact sur site|Contact|Nom du contact)\s*:?\s*([A-ZÀ-ÿ .\-']+)/i, txt);
    var lines = txt.split(/\n+/).map(clean).filter(Boolean);
    var addrLines = [];
    for (var i=0;i<lines.length;i++){
      if (/\d{5}\s+[A-ZÀ-ÿ\- ]+/.test(lines[i]) || /^\d+\s+/.test(lines[i])) {
        addrLines = [lines[i]];
        if (lines[i+1] && !/^(Contact|Email|Tél|Téléphone)/i.test(lines[i+1])) addrLines.push(lines[i+1]);
        if (lines[i+2] && /\d{5}\s+/.test(lines[i+2])) addrLines.push(lines[i+2]);
        break;
      }
    }
    out.adresse = clean(addrLines.join(" "));
    return out;
  }

  function parseBugbusters(txt){
    var out = parseCommon(txt);
    out.ot = grab(/(?:CPE\s*)?(\d{6,}(?:\/\d+)*)/i, txt);
    out.raisonSociale = grab(/(?:Site|Client|Prestation)\s*:?\s*([A-Z0-9 .\-']+)/i, txt) ||
                        grab(/\n([A-Z][A-Z0-9 .\-']{3,})\n/, txt);
    out.contact = grab(/(?:Contact|Nom du contact)\s*:?\s*([A-ZÀ-ÿ .\-']+)/i, txt);
    var addr = grab(/(\d+\s+[A-ZÀ-ÿ0-9 .\-']+\s+\d{5}\s+[A-ZÀ-ÿ\- ]+)/i, txt);
    out.adresse = clean(addr);
    return out;
  }

  window.CompanyOCR = {
    parse: function(companyId, text){
      if (!text) return {};
      if (companyId === "bugbusters") return parseBugbusters(text);
      return parseSogetrel(text);
    }
  };
})();
