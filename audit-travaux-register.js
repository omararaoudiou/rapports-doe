
(function(){
  function register(){
    try {
      if (window.DOC_TYPES && !window.DOC_TYPES.find(d => d.id === 'audit_travaux')) {
        window.DOC_TYPES.push({
          id:'audit_travaux',
          label:'Audit Travaux Chantier',
          icon:'🏗️',
          color:'#f59e0b',
          border:'#92400e',
          bg:'linear-gradient(135deg,#2b1800,#0a1628)',
          desc:'Câblage, terrassement, baie, WIFI, chemin télécom'
        });
      }
    } catch(e){}
  }
  register();
  window.addEventListener("load", register);
})();
