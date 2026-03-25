
(function(){
  var KEY = "sync_queue_v1";

  function readQueue(){
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch(e){ return []; }
  }
  function writeQueue(q){ localStorage.setItem(KEY, JSON.stringify(q || [])); }
  function enqueue(item){
    var q = readQueue();
    q.push(Object.assign({ ts: Date.now() }, item));
    writeQueue(q);
    return q.length;
  }
  async function flush(processFn){
    var q = readQueue();
    if (!q.length || !navigator.onLine) return { ok:true, count:0 };
    var keep = [];
    for (var i=0;i<q.length;i++){
      try {
        var ok = await processFn(q[i]);
        if (!ok) keep.push(q[i]);
      } catch(e){ keep.push(q[i]); }
    }
    writeQueue(keep);
    return { ok:true, count:q.length - keep.length, remaining:keep.length };
  }

  window.OfflineSyncQueue = {
    readQueue: readQueue,
    enqueue: enqueue,
    flush: flush
  };

  window.addEventListener("online", function(){
    if (window.syncRapport && window.OfflineSyncQueue) {
      window.OfflineSyncQueue.flush(async function(item){
        if (item.kind === "rapport") {
          return !!(await window.syncRapport(item.auditId, item.docType, item.data, item.statut));
        }
        return true;
      });
    }
  });
})();
