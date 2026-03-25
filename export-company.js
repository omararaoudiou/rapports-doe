
(function(){
  function loadCompanies(){
    return fetch("./adm5671/companies.json", { cache: "no-store" })
      .then(function(r){ return r.json(); })
      .then(function(d){ return d.companies || []; })
      .catch(function(){ return []; });
  }

  function getAssignedCompanies(user){
    var all = window.__companiesCache || [];
    var ids = (user && user.assignedCompanies) || [];
    return all.filter(function(c){ return ids.indexOf(c.id) >= 0 && c.enabled !== false; });
  }

  window.ExportCompany = {
    loadCompanies: async function(){
      window.__companiesCache = await loadCompanies();
      return window.__companiesCache;
    },
    getAssignedCompanies: getAssignedCompanies,
    chooseDefaultCompany: function(user){
      var companies = getAssignedCompanies(user);
      return companies.length === 1 ? companies[0].id : "";
    }
  };
})();
