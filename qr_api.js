(function(global) {
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  GF_EXP[0] = 1;
  for (var _i = 1; _i < 256; _i++) {
    GF_EXP[_i] = GF_EXP[_i-1] * 2;
    if (GF_EXP[_i] >= 256) GF_EXP[_i] ^= 285;
  }
  for (var _i = 0; _i < 255; _i++) GF_LOG[GF_EXP[_i]] = _i;
  for (var _i = 255; _i < 512; _i++) GF_EXP[_i] = GF_EXP[_i - 255];
  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }
  function genPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var a = GF_EXP[i];
      var r = new Array(p.length + 1).fill(0);
      for (var j = 0; j < p.length; j++) {
        r[j] ^= p[j];
        r[j+1] ^= gfMul(p[j], a);
      }
      p = r;
    }
    return p;
  }
  function rsEncode(data, ecLen) {
    var gen = genPoly(ecLen);
    var msg = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var c = msg[i];
      if (!c) continue;
      for (var j = 1; j < gen.length; j++)
        msg[i+j] ^= gfMul(gen[j], c);
    }
    return msg.slice(data.length);
  }
  var VER_DATA = [null,
    [26,7,1],[44,10,1],[70,15,1],[100,20,2],[134,26,2],
    [172,18,4],[196,20,4],[242,24,4],[292,30,5],[346,18,6]
  ];
  var CAPS = [0,17,32,53,78,106,134,154,192,230,271];
  var ALG = [null,[],[],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,28,46],[6,26,46]];
  var FMT = [1,1,1,0,1,1,1,1,1,0,0,0,1,0,0];
  global.generateQRMatrix = function(text) {
    try {
      var bytes = [];
      for (var i = 0; i < text.length; i++) {
        var c = text.charCodeAt(i);
        if (c < 128) { bytes.push(c); }
        else if (c < 2048) { bytes.push(192|(c>>6)); bytes.push(128|(c&63)); }
        else { bytes.push(224|(c>>12)); bytes.push(128|((c>>6)&63)); bytes.push(128|(c&63)); }
      }
      var ver = 0;
      for (var v = 1; v <= 10; v++) { if (CAPS[v] >= bytes.length) { ver = v; break; } }
      if (!ver) return null;
      var vd = VER_DATA[ver];
      var totalCW = vd[0], ecCW = vd[1], ecBlocks = vd[2];
      var dataCW = totalCW - ecCW * ecBlocks;
      var blockSize = Math.floor(dataCW / ecBlocks);
      var bits = [];
      function addB(v,n){ for(var i=n-1;i>=0;i--) bits.push((v>>i)&1); }
      addB(4,4); addB(bytes.length, 8);
      for (var i = 0; i < bytes.length; i++) addB(bytes[i], 8);
      while (bits.length < dataCW*8 && bits.length%8 !== 0) bits.push(0);
      for (var pad=[236,17],pi=0; bits.length < dataCW*8; pi++) addB(pad[pi%2],8);
      var cw = [];
      for (var i=0; i<bits.length; i+=8) {
        var b=0; for(var j=0;j<8;j++) b=(b<<1)|bits[i+j]; cw.push(b);
      }
      var dBlocks=[], eBlocks=[];
      for (var b=0,pos=0; b<ecBlocks; b++) {
        var db = cw.slice(pos, pos+blockSize); pos += blockSize;
        dBlocks.push(db); eBlocks.push(rsEncode(db, ecCW));
      }
      var allCW = [];
      for (var i=0; i<blockSize; i++) dBlocks.forEach(function(b){if(b[i]!==undefined)allCW.push(b[i]);});
      for (var i=0; i<ecCW; i++) eBlocks.forEach(function(b){allCW.push(b[i]);});
      var rem = [0,0,7,7,7,0,0,0,0,0,0][ver];
      var allBits = [];
      allCW.forEach(function(c){ for(var i=7;i>=0;i--) allBits.push((c>>i)&1); });
      for (var i=0; i<rem; i++) allBits.push(0);
      var sz = ver*4+17;
      var mat = [], used = [];
      for (var i=0;i<sz;i++) { mat.push(new Uint8Array(sz)); used.push(new Uint8Array(sz)); }
      function setM(r,c,v){ if(r>=0&&r<sz&&c>=0&&c<sz){mat[r][c]=v?1:0;used[r][c]=1;} }
      function finder(tr,tc) {
        for (var r=-1;r<=7;r++) for (var c=-1;c<=7;c++) {
          if (r>=0&&r<7&&c>=0&&c<7) {
            var dark=(r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));
            setM(tr+r,tc+c,dark);
          } else {
            if(tr+r>=0&&tr+r<sz&&tc+c>=0&&tc+c<sz) setM(tr+r,tc+c,0);
          }
        }
      }
      finder(0,0); finder(0,sz-7); finder(sz-7,0);
      for (var i=8;i<sz-8;i++) { setM(6,i,i%2===0); setM(i,6,i%2===0); }
      var ap = ALG[ver]||[];
      for (var ai=0;ai<ap.length;ai++) for (var aj=0;aj<ap.length;aj++) {
        var ar=ap[ai],ac=ap[aj];
        if (used[ar][ac]) continue;
        for (var dr=-2;dr<=2;dr++) for (var dc=-2;dc<=2;dc++)
          setM(ar+dr,ac+dc,(Math.abs(dr)===2||Math.abs(dc)===2||(dr===0&&dc===0)));
      }
      [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
       [sz-1,8],[sz-2,8],[sz-3,8],[sz-4,8],[sz-5,8],[sz-6,8],[sz-7,8],
       [8,sz-8],[8,sz-7],[8,sz-6],[8,sz-5],[8,sz-4],[8,sz-3],[8,sz-2],[8,sz-1]
      ].forEach(function(p){if(p[0]>=0&&p[0]<sz&&p[1]>=0&&p[1]<sz)used[p[0]][p[1]]=1;});
      if (ver>=7) {
        for(var i=0;i<6;i++) for(var j=0;j<3;j++) { used[sz-11+j][i]=1; used[i][sz-11+j]=1; }
      }
      var bi = 0;
      for (var right=sz-1; right>=1; right-=2) {
        if (right===6) right--;
        for (var vert=0; vert<sz; vert++) {
          for (var j=0; j<2; j++) {
            var r = ((right&2)===0) ? sz-1-vert : vert;
            var c = right - j;
            if (c>=0&&c<sz && !used[r][c] && bi<allBits.length) {
              mat[r][c] = allBits[bi++];
            }
          }
        }
      }
      for (var r=0;r<sz;r++) for (var c=0;c<sz;c++)
        if (!used[r][c] && (r+c)%2===0) mat[r][c]^=1;
      var fp1=[[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
      var fp2=[[sz-1,8],[sz-2,8],[sz-3,8],[sz-4,8],[sz-5,8],[sz-6,8],[sz-7,8],[8,sz-8],[8,sz-7],[8,sz-6],[8,sz-5],[8,sz-4],[8,sz-3],[8,sz-2],[8,sz-1]];
      for(var i=0;i<15;i++){mat[fp1[i][0]][fp1[i][1]]=FMT[i];mat[fp2[i][0]][fp2[i][1]]=FMT[i];}
      mat[sz-8][8]=1;
      return mat;
    } catch(e) {
      console.error('QR error:', e.message);
      return null;
    }
  };
  global.renderQRCode = function(canvas, text) {
    try {
      var mat = global.generateQRMatrix(text);
      if (!mat) { console.error('QR: matrix null for', text.slice(0,40)); return; }
      var sz = mat.length;
      var padding = 3;
      var total = sz + padding*2;
      var moduleSize = Math.max(1, Math.floor(canvas.width / total));
      var offset = Math.floor((canvas.width - sz*moduleSize) / 2);
      var ctx = canvas.getContext('2d');
      canvas.width = canvas.width;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      for (var r=0; r<sz; r++) {
        for (var c=0; c<sz; c++) {
          if (mat[r][c]) {
            ctx.fillRect(offset+c*moduleSize, offset+r*moduleSize, moduleSize, moduleSize);
          }
        }
      }
    } catch(e) {
      console.error('QR render error:', e.message);
    }
  };
})(typeof window !== 'undefined' ? window : global);