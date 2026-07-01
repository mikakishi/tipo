
// ══════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════
const UPM=1000, ASC=800, DESC=-200, FH=1000;

// ══════════════════════════════════════════════════════
// ESTADO
// ══════════════════════════════════════════════════════
const S={glyphs:{},kerning:{},sz:90,tr:0,lh:120,bg:"#ffffff"};

// ══════════════════════════════════════════════════════
// DOM
// ══════════════════════════════════════════════════════
const $=id=>document.getElementById(id);
const PAIRS=["AV","VA","TA","To","Yo","Wa","Ly","Te","PA","LY","AT","FA","LT","RY","av","va","ta","to","yo"];
PAIRS.forEach(p=>{const o=document.createElement("option");o.value=p;o.textContent=p;$("ksel").appendChild(o)});

// ══════════════════════════════════════════════════════
// UTILIDADES
// ══════════════════════════════════════════════════════
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function uid(){return Math.random().toString(36).slice(2,8)}

function scopeIds(s){
  const ns=uid(),ids=[];
  s.replace(/\bid="([^"]+)"/g,(_,id)=>ids.push(id));
  ids.forEach(id=>{
    const safe=ns+"_"+id;
    s=s.replaceAll(`id="${id}"`,`id="${safe}"`);
    s=s.replaceAll(`url(#${id})`,`url(#${safe})`);
    s=s.replaceAll(`href="#${id}"`,`href="#${safe}"`);
    s=s.replaceAll(`xlink:href="#${id}"`,`xlink:href="#${safe}"`);
  });
  return s;
}

function dlBlob(name,data,type){
  const b=new Blob([data],{type}),a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);
}

let _tt;
function toast(msg,d=3000){const t=$("toast");t.textContent=msg;t.classList.add("on");clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove("on"),d)}
function status(msg){$("status").textContent=msg}
function prog(p){const bar=$("prog"),fill=$("progf");if(p===null){bar.classList.remove("on");fill.style.width="0%"}else{bar.classList.add("on");fill.style.width=p+"%"}}

// ══════════════════════════════════════════════════════
// SVG HELPERS
// ══════════════════════════════════════════════════════
function glyphBox(ch){
  const lower = ch && ch.toLowerCase()===ch && ch.toUpperCase()!==ch;
  const desc = "gjpqyç".includes(ch);
  const asc = "bdfhklt".includes(ch);
  const accent = "ÁÉÍÓÚÜÑáéíóúüñ".includes(ch);
  if(desc) return {x:80,y:300,w:840,h:650,kind:"descender"};
  if(lower && !asc && !accent) return {x:120,y:300,w:760,h:500,kind:"lower"};
  if(lower && asc) return {x:100,y:100,w:800,h:700,kind:"ascender"};
  return {x:80,y:80,w:840,h:720,kind:"upper"};
}

function cleanSvgForFont(raw){
  let s=(raw||"").trim();
  s=s.replace(/<\?xml[\s\S]*?\?>/gi,"")
     .replace(/<!DOCTYPE[\s\S]*?>/gi,"")
     .replace(/<!--([\s\S]*?)-->/g,"")
     .replace(/\s(width|height)=["'][^"']*["']/gi,"");
  return s.trim();
}


function inlineSvgStylesForFont(svgStr){
  // Convierte <style>.clase{fill:#...}</style> en atributos directos.
  // Las tablas SVG de fuentes suelen fallar si dependen de CSS interno.
  try{
    const doc=new DOMParser().parseFromString(svgStr,"image/svg+xml");
    if(doc.querySelector("parsererror")) return svgStr;
    const root=doc.querySelector("svg") || doc.documentElement;
    const rules={};
    doc.querySelectorAll("style").forEach(st=>{
      const css=st.textContent||"";
      const re=/\.([\w-]+)\s*\{([^}]*)\}/g; let m;
      while((m=re.exec(css))){
        const props={};
        m[2].split(";").forEach(part=>{
          const idx=part.indexOf(":");
          if(idx>0){props[part.slice(0,idx).trim()]=part.slice(idx+1).trim()}
        });
        rules[m[1]]=Object.assign(rules[m[1]]||{},props);
      }
    });
    root.querySelectorAll("[class]").forEach(el=>{
      const classes=(el.getAttribute("class")||"").trim().split(/\s+/).filter(Boolean);
      classes.forEach(c=>{
        const r=rules[c]; if(!r) return;
        ["fill","stroke","stroke-width","opacity","fill-opacity","stroke-opacity","stroke-linecap","stroke-linejoin","stroke-miterlimit","fill-rule","clip-rule"].forEach(k=>{
          if(r[k]!==undefined && !el.hasAttribute(k)) el.setAttribute(k,r[k]);
        });
      });
      el.removeAttribute("class");
    });
    doc.querySelectorAll("style,title,desc,metadata").forEach(n=>n.remove());
    if(root){root.removeAttribute("width");root.removeAttribute("height");}
    const ser=new XMLSerializer();
    if(root && root.tagName && root.tagName.toLowerCase().endsWith("svg")){
      return Array.from(root.childNodes).map(n=>ser.serializeToString(n)).join("");
    }
    return ser.serializeToString(doc);
  }catch(e){
    console.warn("No se pudo incrustar CSS SVG:",e);
    return svgStr;
  }
}

function normSvg(raw,w,h,sc,ch){
  raw=cleanSvgForFont(raw); if(!raw)return"";
  let vb=parseVB(raw);
  if(!/viewBox=/i.test(raw)) vb=[0,0,+w||600,+h||750];
  const [vx,vy,vw,vh]=vb;
  const box=glyphBox(ch||"A");
  const userScale=Math.max(+sc||1,0.01);
  const scale=Math.min(box.w/vw,box.h/vh)*userScale;
  const usedW=vw*scale, usedH=vh*scale;
  const tx=box.x+(box.w-usedW)/2-vx*scale;
  const ty=box.y+(box.h-usedH)-vy*scale;
  let inner;
  if(/^<svg[\s>]/i.test(raw)){
    inner=raw.replace(/<svg[^>]*>/i,"").replace(/<\/svg\s*>/i,"").trim();
  }else{
    inner=raw;
  }
  const safe=`<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" data-kind="${box.kind}" data-baseline="800" data-advance="1000"><g transform="translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${scale.toFixed(6)})">${inner}</g></svg>`;
  return scopeIds(safe);
}

function demoSvg(ch,i){
  const pals=[["#ff3b30","#ffd60a","#1d4ed8"],["#00c2a8","#7c3aed","#f97316"],["#ef4444","#22c55e","#3b82f6"],["#111827","#facc15","#fb7185"]];
  const c=pals[i%4],gid=uid();
  return `<svg viewBox="0 0 600 700" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${gid}" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="${c[0]}"/><stop offset="55%" stop-color="${c[1]}"/><stop offset="100%" stop-color="${c[2]}"/></linearGradient></defs><text x="300" y="470" text-anchor="middle" font-family="Arial" font-weight="900" font-size="430" fill="url(#${gid})">${esc(ch)}</text><text x="312" y="484" text-anchor="middle" font-family="Arial" font-weight="900" font-size="430" fill="none" stroke="${c[2]}" stroke-width="8" opacity=".4">${esc(ch)}</text></svg>`;
}

function parseVB(svg){
  const m=(svg||"").match(/viewBox=["\']([^"\']+)["\']/i);
  if(m){const p=m[1].trim().split(/[\s,]+/).map(Number);if(p.length===4&&p.every(n=>Number.isFinite(n)))return p}
  const wm=(svg||"").match(/\swidth=["\']([0-9.]+)[^"\']*["\']/i);
  const hm=(svg||"").match(/\sheight=["\']([0-9.]+)[^"\']*["\']/i);
  return[0,0,wm?+wm[1]:600,hm?+hm[1]:750];
}

// ══════════════════════════════════════════════════════
// PLANTILLA DE LETRAS — definición de grupos
// ══════════════════════════════════════════════════════
const TEMPLATE_GROUPS=[
  {label:"Mayúsculas",chars:"ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("")},
  {label:"Minúsculas",chars:"abcdefghijklmnñopqrstuvwxyz".split("")},
  {label:"Vocales acentuadas",chars:["Á","É","Í","Ó","Ú","Ü","á","é","í","ó","ú","ü"]},
  {label:"Números",chars:"0123456789".split("")},
  {label:"Signos y puntuación",chars:[".",",",":",";","!","¡","?","¿","-","_","'","\"","(",")","/","%","&","@","€","$","#","*","+","="]},
];

const CHAR_DESC={
  "Ñ":"Eñe mayúscula","ñ":"Eñe minúscula",
  "Á":"A con tilde mayúscula","É":"E con tilde mayúscula","Í":"I con tilde mayúscula","Ó":"O con tilde mayúscula","Ú":"U con tilde mayúscula","Ü":"U con diéresis mayúscula",
  "á":"a con tilde","é":"e con tilde","í":"i con tilde","ó":"o con tilde","ú":"u con tilde","ü":"u con diéresis",
  "¿":"Apertura de pregunta","¡":"Apertura de exclamación","?":"Cierre de pregunta","!":"Cierre de exclamación",
  ".":"Punto",",":"Coma",":":"Dos puntos",";":"Punto y coma","-":"Guion","_":"Guion bajo",
  "'":"Comilla simple","\"":"Comilla doble","(":"Paréntesis abierto",")":"Paréntesis cerrado",
  "/":"Barra","%":"Por ciento","&":"Ampersand","@":"Arroba","€":"Euro","$":"Dólar","#":"Almohadilla","*":"Asterisco","+":"Más","=":"Igual",
};
function charDesc(ch){
  if(CHAR_DESC[ch])return CHAR_DESC[ch];
  if(/[A-Z]/.test(ch))return"Letra "+ch+" mayúscula";
  if(/[a-z]/.test(ch))return"Letra "+ch+" minúscula";
  if(/[0-9]/.test(ch))return"Número "+ch;
  return"Signo "+ch;
}

let currentModalChar=null;

function renderTemplate(){
  const root=$("tplGroups");root.innerHTML="";
  TEMPLATE_GROUPS.forEach(group=>{
    const gDiv=document.createElement("div");gDiv.className="tpl-group";
    const lbl=document.createElement("div");lbl.className="tpl-label";lbl.textContent=group.label;
    const grid=document.createElement("div");grid.className="tpl-grid";
    group.chars.forEach(ch=>{
      const cell=document.createElement("div");
      cell.className="tpl-cell"+(S.glyphs[ch]?" filled":"");
      if(S.glyphs[ch]){
        cell.innerHTML=S.glyphs[ch].svg+`<span class="del-x" title="Borrar">✕</span>`;
        cell.querySelector(".del-x").onclick=(e)=>{e.stopPropagation();delete S.glyphs[ch];render()};
      }else{
        cell.innerHTML=`<span class="ch-label">${esc(ch)}</span>`;
      }
      cell.onclick=()=>openGlyphModal(ch);
      grid.appendChild(cell);
    });
    gDiv.appendChild(lbl);gDiv.appendChild(grid);
    root.appendChild(gDiv);
  });
}

function openGlyphModal(ch){
  currentModalChar=ch;
  $("modalChar").textContent=ch;
  $("modalSub").textContent=charDesc(ch);
  const existing=S.glyphs[ch];
  $("mGw").value=600;
  $("mGh").value=750;
  $("mGs").value=1;
  $("mSp").value="";
  $("mPreviewWrap").innerHTML=existing?existing.svg:"<span class=\'hint\' style=\'font-size:12px\'>Sin SVG todavía</span>";
  $("mDelete").style.display=existing?"inline-flex":"none";
  $("glyphModal").style.display="flex";
}
function closeModal(){$("glyphModal").style.display="none";currentModalChar=null}

$("modalClose").onclick=closeModal;
$("mCancel").onclick=closeModal;
$("glyphModal").onclick=(e)=>{if(e.target.id==="glyphModal")closeModal()};

$("mSp").oninput=()=>{
  const raw=$("mSp").value.trim();
  if(!raw){$("mPreviewWrap").innerHTML=S.glyphs[currentModalChar]?S.glyphs[currentModalChar].svg:"";return}
  const svg=normSvg(raw,+$("mGw").value,+$("mGh").value,+$("mGs").value,currentModalChar);
  $("mPreviewWrap").innerHTML=svg;
};

$("mSave").onclick=()=>{
  const raw=$("mSp").value.trim();
  if(!raw&&!S.glyphs[currentModalChar]){alert("Pega un SVG primero.");return}
  if(raw){
    const svg=normSvg(raw,+$("mGw").value,+$("mGh").value,+$("mGs").value,currentModalChar);
    S.glyphs[currentModalChar]={svg,w:1000,h:1000,advance:1000};
  }else if(S.glyphs[currentModalChar]){
    // Solo cambiaron ancho/alto/escala sin pegar SVG nuevo: re-normalizar el existente si hace falta
    S.glyphs[currentModalChar].w=+$("mGw").value;
    S.glyphs[currentModalChar].h=+$("mGh").value;
  }
  closeModal();render();
};

$("mDelete").onclick=()=>{
  if(currentModalChar&&S.glyphs[currentModalChar]){delete S.glyphs[currentModalChar]}
  closeModal();render();
};

// ══════════════════════════════════════════════════════
// CONTROLES
// ══════════════════════════════════════════════════════
$("btnDemo").onclick=()=>{
  let i=0;
  TEMPLATE_GROUPS.forEach(g=>g.chars.forEach(c=>{S.glyphs[c]={svg:normSvg(demoSvg(c,i),600,700,1,c),w:1000,h:1000,advance:1000}; i++}));
  render();
};
$("btnClear").onclick=()=>{if(confirm("¿Borrar todas las letras guardadas?")){S.glyphs={};S.kerning={};render()}};
$("txt").oninput=renderText;
$("fs").oninput=()=>{S.sz=+$("fs").value;$("fv").textContent=S.sz;renderText()};
$("tr").oninput=()=>{S.tr=+$("tr").value;$("tv").textContent=S.tr;renderText()};
$("lh").oninput=()=>{S.lh=+$("lh").value;$("lv").textContent=S.lh;renderText()};
$("bg").oninput=()=>{S.bg=$("bg").value;renderText()};
$("ksel").onchange=()=>{$("kval").value=S.kerning[$("ksel").value]||0;renderKern()};
$("btnKern").onclick=()=>{S.kerning[$("ksel").value]=+$("kval").value||0;renderText();renderKern()};

function kern(pair){
  if(S.kerning[pair]!==undefined)return S.kerning[pair];
  if(S.kerning[pair.toUpperCase()]!==undefined)return S.kerning[pair.toUpperCase()];
  return 0;
}
function gw(ch){const g=S.glyphs[ch];return g?(S.sz*((g.advance||g.w||1000)/(g.h||1000))):S.sz*.65}

// ══════════════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════════════
function renderMap(){renderTemplate()}

function drawStr(text,el){
  let prev=null;
  for(const ch of text){
    if(ch===" "){const sp=document.createElement("span");sp.className="sp";sp.style.width=S.sz*.45+"px";el.appendChild(sp);prev=null;continue}
    const span=document.createElement("span");span.className="glyph";
    span.style.setProperty("--track",S.tr+"px");
    const w=gw(ch);span.style.width=w+"px";span.style.height=S.sz+"px";
    if(prev){const k=kern(prev+ch);if(k)span.style.marginLeft=k+"px"}
    if(S.glyphs[ch]){
      span.innerHTML=S.glyphs[ch].svg;
      const sv=span.querySelector("svg");
      if(sv){sv.style.width=w+"px";sv.style.height=S.sz+"px"}
    }else{
      const ms=document.createElement("span");ms.className="miss";
      ms.style.cssText=`width:${w}px;height:${S.sz}px`;ms.textContent=ch;span.appendChild(ms);
    }
    el.appendChild(span);prev=ch;
  }
}

function renderText(){
  const p=$("prev");p.style.background=S.bg;p.innerHTML="";
  $("txt").value.split("\n").forEach(lt=>{
    const l=document.createElement("div");l.className="line";l.style.height=S.lh+"px";
    drawStr(lt,l);p.appendChild(l);
  });
}

function renderKern(){const p=$("kprev");p.innerHTML="";drawStr($("ksel").value,p)}
function render(){renderMap();renderText();renderKern()}

// ══════════════════════════════════════════════════════
// EXPORT JSON / SVG
// ══════════════════════════════════════════════════════
$("btnJson").onclick=()=>dlBlob("tipografia.json",JSON.stringify(S,null,2),"application/json");

$("impJson").addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  const d=JSON.parse(await f.text());
  Object.assign(S,{glyphs:d.glyphs||{},kerning:d.kerning||{},sz:d.sz||d.fontSize||90,tr:d.tr||d.tracking||0,lh:d.lh||d.lineHeight||120,bg:d.bg||d.bgColor||"#ffffff"});
  $("fs").value=S.sz;$("fv").textContent=S.sz;
  $("tr").value=S.tr;$("tv").textContent=S.tr;
  $("lh").value=S.lh;$("lv").textContent=S.lh;
  $("bg").value=S.bg;render();
});

$("btnSvgExp").onclick=()=>{
  const lines=$("txt").value.split("\n");
  const fh=S.sz,lht=S.lh,spW=fh*.45;
  const used=new Set([...$("txt").value].filter(c=>c!==" "&&c!=="\n"));
  let defs="<defs>\n";
  used.forEach(ch=>{
    if(!S.glyphs[ch])return;
    const g=S.glyphs[ch],rw=gw(ch);
    const inner=g.svg.replace(/<svg[^>]*>/i,"").replace(/<\/svg>/i,"");
    defs+=`  <symbol id="s_${encodeURIComponent(ch)}" viewBox="0 0 1000 1000" overflow="visible">${inner}</symbol>\n`;
  });
  defs+="</defs>\n";
  let maxW=0;
  lines.forEach(lt=>{let x=0,pv=null;for(const ch of lt){if(ch===" "){x+=spW;pv=null;continue}if(pv)x+=kern(pv+ch);x+=gw(ch)+S.tr;pv=ch}if(x>maxW)maxW=x});
  const tH=lht*lines.length+40,tW=maxW+40;
  let body="";
  lines.forEach((lt,li)=>{
    let x=20,y=20+li*lht,pv=null;
    for(const ch of lt){
      if(ch===" "){x+=spW;pv=null;continue}
      if(pv)x+=kern(pv+ch);
      const rw=gw(ch);
      if(S.glyphs[ch])body+=`  <use href="#s_${encodeURIComponent(ch)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${fh.toFixed(1)}"/>\n`;
      x+=rw+S.tr;pv=ch;
    }
  });
  dlBlob("texto.svg",`<svg xmlns="http://www.w3.org/2000/svg" width="${tW}" height="${tH}" viewBox="0 0 ${tW} ${tH}">\n${defs}<rect width="${tW}" height="${tH}" fill="${S.bg}"/>\n${body}</svg>`,"image/svg+xml");
};

// ══════════════════════════════════════════════════════
// PARSER SVG PATH → opentype.Path
// ══════════════════════════════════════════════════════
function svgDToPath(dStr,vx,vy,vw,vh){
  if(!dStr||!dStr.trim())return new opentype.Path();
  const scale=FH/vh;
  const X=x=>(x-vx)*scale;
  const Y=y=>ASC-(y-vy)*scale;
  const path=new opentype.Path();
  const re=/([MmLlHhVvCcSsQqTtAaZz])|(-?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?)/g;
  const toks=[];let t;
  while((t=re.exec(dStr)))toks.push(t[0]);
  let i=0,cx=0,cy=0,sx=0,sy=0,lCmd="",lCtrlX=0,lCtrlY=0;
  function ns(n){const r=[];for(let k=0;k<n&&i<toks.length;k++){const v=parseFloat(toks[i++]);r.push(isNaN(v)?0:v)}return r}
  function hasNum(){return i<toks.length&&toks[i]&&/^-?[0-9.]/.test(toks[i])}
  let _guard=0;
  while(i<toks.length){
    if(++_guard>20000)break; // salvaguarda anti-bucle-infinito
    const cmd=toks[i++];
    if(!/^[MmLlHhVvCcSsQqTtAaZz]$/.test(cmd))continue;
    const rel=cmd===cmd.toLowerCase()&&cmd.toLowerCase()!=="z";
    const bc=cmd.toUpperCase();
    if(bc==="Z"){path.closePath();cx=sx;cy=sy;lCmd=bc;continue}
    let first=true;
    let _innerGuard=0;
    while(first||hasNum()){
      if(++_innerGuard>5000)break;
      first=false;
      if(bc==="M"){
        const[dx,dy]=ns(2);cx=rel?cx+dx:dx;cy=rel?cy+dy:dy;
        path.moveTo(X(cx),Y(cy));sx=cx;sy=cy;lCmd="M";
        // implicit L after M
        while(hasNum()){const[lx,ly]=ns(2);cx=rel?cx+lx:lx;cy=rel?cy+ly:ly;path.lineTo(X(cx),Y(cy))}
        break;
      }
      else if(bc==="L"){const[dx,dy]=ns(2);cx=rel?cx+dx:dx;cy=rel?cy+dy:dy;path.lineTo(X(cx),Y(cy))}
      else if(bc==="H"){const[dx]=ns(1);cx=rel?cx+dx:dx;path.lineTo(X(cx),Y(cy))}
      else if(bc==="V"){const[dy]=ns(1);cy=rel?cy+dy:dy;path.lineTo(X(cx),Y(cy))}
      else if(bc==="C"){
        const[x1,y1,x2,y2,x3,y3]=ns(6);
        const ax1=rel?cx+x1:x1,ay1=rel?cy+y1:y1;
        const ax2=rel?cx+x2:x2,ay2=rel?cy+y2:y2;
        const ax3=rel?cx+x3:x3,ay3=rel?cy+y3:y3;
        lCtrlX=ax2;lCtrlY=ay2;
        path.curveTo(X(ax1),Y(ay1),X(ax2),Y(ay2),X(ax3),Y(ay3));
        cx=ax3;cy=ay3;
      }
      else if(bc==="S"){
        const[x2,y2,x3,y3]=ns(4);
        const ax2=rel?cx+x2:x2,ay2=rel?cy+y2:y2;
        const ax3=rel?cx+x3:x3,ay3=rel?cy+y3:y3;
        const ax1=(lCmd==="C"||lCmd==="S")?2*cx-lCtrlX:cx;
        const ay1=(lCmd==="C"||lCmd==="S")?2*cy-lCtrlY:cy;
        lCtrlX=ax2;lCtrlY=ay2;
        path.curveTo(X(ax1),Y(ay1),X(ax2),Y(ay2),X(ax3),Y(ay3));
        cx=ax3;cy=ay3;
      }
      else if(bc==="Q"){
        const[x1,y1,x2,y2]=ns(4);
        const ax1=rel?cx+x1:x1,ay1=rel?cy+y1:y1;
        const ax2=rel?cx+x2:x2,ay2=rel?cy+y2:y2;
        lCtrlX=ax1;lCtrlY=ay1;
        const c1x=cx+(2/3)*(ax1-cx),c1y=cy+(2/3)*(ay1-cy);
        const c2x=ax2+(2/3)*(ax1-ax2),c2y=ay2+(2/3)*(ay1-ay2);
        path.curveTo(X(c1x),Y(c1y),X(c2x),Y(c2y),X(ax2),Y(ay2));
        cx=ax2;cy=ay2;
      }
      else if(bc==="T"){
        const[x2,y2]=ns(2);
        const ax2=rel?cx+x2:x2,ay2=rel?cy+y2:y2;
        const ax1=(lCmd==="Q"||lCmd==="T")?2*cx-lCtrlX:cx;
        const ay1=(lCmd==="Q"||lCmd==="T")?2*cy-lCtrlY:cy;
        lCtrlX=ax1;lCtrlY=ay1;
        const c1x=cx+(2/3)*(ax1-cx),c1y=cy+(2/3)*(ay1-cy);
        const c2x=ax2+(2/3)*(ax1-ax2),c2y=ay2+(2/3)*(ay1-ay2);
        path.curveTo(X(c1x),Y(c1y),X(c2x),Y(c2y),X(ax2),Y(ay2));
        cx=ax2;cy=ay2;
      }
      else if(bc==="A"){
        // Aproximar arco con lineTo al punto final
        ns(5);const[dx,dy]=ns(2);cx=rel?cx+dx:dx;cy=rel?cy+dy:dy;path.lineTo(X(cx),Y(cy));
      }
      lCmd=bc;
      if(!hasNum())break;
    }
  }
  return path;
}

// ══════════════════════════════════════════════════════
// EXTRACTOR DE CAPAS SVG (paths + colores)
// ══════════════════════════════════════════════════════
function extractLayers(svgStr){
  const layers=[];
  const clean=svgStr.replace(/ xmlns(?::\w+)?="[^"]*"/g,"");
  const doc=new DOMParser().parseFromString(clean,"image/svg+xml");
  if(doc.querySelector("parsererror"))return layers;

  const NAMED={black:[0,0,0],white:[255,255,255],red:[255,0,0],green:[0,128,0],blue:[0,0,255],
    yellow:[255,255,0],cyan:[0,255,255],magenta:[255,0,255],gray:[128,128,128],grey:[128,128,128],
    orange:[255,165,0],purple:[128,0,128],pink:[255,192,203],brown:[165,42,42],
    navy:[0,0,128],teal:[0,128,128],maroon:[128,0,0],lime:[0,255,0],silver:[192,192,192]};

  // Parsear reglas CSS de cualquier <style> en el documento (común en Illustrator: .cls-1{fill:#xxx})
  const cssRules={}; // {className: {fill, stroke, 'stroke-width', opacity, ...}}
  const styleMatches=[...svgStr.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)];
  styleMatches.forEach(sm=>{
    const css=sm[1];
    const ruleRe=/\.([\w-]+)\s*\{([^}]*)\}/g;
    let rm;
    while((rm=ruleRe.exec(css))){
      const cls=rm[1], body=rm[2];
      const props={};
      body.split(";").forEach(p=>{const[k,v]=p.split(":");if(k&&v!==undefined)props[k.trim()]=v.trim()});
      cssRules[cls]=props;
    }
  });

  function parseRgba(v){
    if(!v||v==="none"||v==="transparent")return null;
    v=v.trim();
    if(v.startsWith("url("))return[0,0,0,255]; // url() → negro como fallback COLRv0
    if(v.startsWith("#")){
      let h=v.slice(1);
      if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      if(h.length===6)return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),255];
      if(h.length===8)return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),parseInt(h.slice(6,8),16)];
    }
    if(v.startsWith("rgb")){const n=v.match(/[\d.]+/g)||[];if(n.length>=3)return[+n[0],+n[1],+n[2],n[3]!==undefined?Math.round(+n[3]*255):255]}
    return NAMED[v.toLowerCase()]?[...NAMED[v.toLowerCase()],255]:null;
  }

  // Resuelve fill/stroke combinando: style inline > atributo > clase CSS > heredado
  function resolveStyle(el,inh){
    const st=el.getAttribute("style")||"";
    const sm={};st.split(";").forEach(r=>{const[k,v]=r.split(":");if(k&&v!==undefined)sm[k.trim()]=v.trim()});
    const clsAttr=el.getAttribute("class")||"";
    const clsNames=clsAttr.trim().split(/\s+/).filter(Boolean);
    let clsFill=null,clsStroke=null;
    clsNames.forEach(cn=>{
      const rule=cssRules[cn];
      if(rule){
        if(rule.fill!==undefined)clsFill=rule.fill;
        if(rule.stroke!==undefined)clsStroke=rule.stroke;
      }
    });
    const fillV=sm["fill"]||el.getAttribute("fill")||clsFill||inh;
    const strokeV=sm["stroke"]||el.getAttribute("stroke")||clsStroke;
    return{fillV,strokeV};
  }

  function shapeD(el){
    const g=a=>el.getAttribute(a)||"";
    const tag=el.tagName.split(":").pop().toLowerCase();
    if(tag==="path")return g("d");
    if(tag==="rect"){
      const[x,y,w,h,rx_,ry_]=[+g("x")||0,+g("y")||0,+g("width")||0,+g("height")||0,+g("rx")||0,+g("ry")||0];
      const rx=Math.min(rx_||ry_,w/2),ry=Math.min(ry_||rx_,h/2);
      if(!w||!h)return"";
      if(!rx&&!ry)return`M${x},${y}H${x+w}V${y+h}H${x}Z`;
      return`M${x+rx},${y}H${x+w-rx}Q${x+w},${y} ${x+w},${y+ry}V${y+h-ry}Q${x+w},${y+h} ${x+w-rx},${y+h}H${x+rx}Q${x},${y+h} ${x},${y+h-ry}V${y+ry}Q${x},${y} ${x+rx},${y}Z`;
    }
    if(tag==="circle"){
      const[cx,cy,r]=[+g("cx")||0,+g("cy")||0,+g("r")||0];if(!r)return"";
      const k=0.5523;
      return`M${cx},${cy-r}C${cx+r*k},${cy-r} ${cx+r},${cy-r*k} ${cx+r},${cy}C${cx+r},${cy+r*k} ${cx+r*k},${cy+r} ${cx},${cy+r}C${cx-r*k},${cy+r} ${cx-r},${cy+r*k} ${cx-r},${cy}C${cx-r},${cy-r*k} ${cx-r*k},${cy-r} ${cx},${cy-r}Z`;
    }
    if(tag==="ellipse"){
      const[cx,cy,rx,ry]=[+g("cx")||0,+g("cy")||0,+g("rx")||0,+g("ry")||0];if(!rx||!ry)return"";
      const k=0.5523;
      return`M${cx},${cy-ry}C${cx+rx*k},${cy-ry} ${cx+rx},${cy-ry*k} ${cx+rx},${cy}C${cx+rx},${cy+ry*k} ${cx+rx*k},${cy+ry} ${cx},${cy+ry}C${cx-rx*k},${cy+ry} ${cx-rx},${cy+ry*k} ${cx-rx},${cy}C${cx-rx},${cy-ry*k} ${cx-rx*k},${cy-ry} ${cx},${cy-ry}Z`;
    }
    if(tag==="polygon"||tag==="polyline"){
      const pts=(g("points").match(/-?[0-9.]+/g)||[]).map(Number);if(pts.length<4)return"";
      let d=`M${pts[0]},${pts[1]}`;for(let i=2;i<pts.length;i+=2)d+=`L${pts[i]},${pts[i+1]}`;
      return tag==="polygon"?d+"Z":d;
    }
    return"";
  }

  function walk(el,inh){
    const tag=el.tagName?el.tagName.split(":").pop().toLowerCase():"";
    if(["defs","style","title","desc","metadata","clippath","mask","filter"].includes(tag))return;
    const{fillV,strokeV}=resolveStyle(el,inh);
    const shapes=["path","rect","circle","ellipse","polygon","polyline"];
    if(shapes.includes(tag)){
      const d=shapeD(el);
      if(d){
        const fill=parseRgba(fillV);
        const stroke=parseRgba(strokeV);
        if(fill||stroke)layers.push({d,fill,stroke});
        else layers.push({d,fill:[0,0,0,255],stroke:null}); // fallback: sin color resuelto → negro, nunca vacío
      }
    }
    for(const child of el.children)walk(child,fillV||inh);
  }
  const root=doc.querySelector("svg");
  if(root)for(const c of root.children)walk(c,"black");
  return layers;
}

// ══════════════════════════════════════════════════════
// BUILD FUENTE BASE (negro) con opentype.js
// ══════════════════════════════════════════════════════
const GNAMES={32:"space",33:"exclam",34:"quotedbl",35:"numbersign",36:"dollar",37:"percent",38:"ampersand",39:"quotesingle",40:"parenleft",41:"parenright",42:"asterisk",43:"plus",44:"comma",45:"hyphen",46:"period",47:"slash",58:"colon",59:"semicolon",60:"less",61:"equal",62:"greater",63:"question",64:"at",91:"bracketleft",93:"bracketright",95:"underscore",160:"nbspace",161:"exclamdown",191:"questiondown",
  209:"Ntilde",241:"ntilde",
  193:"Aacute",201:"Eacute",205:"Iacute",211:"Oacute",218:"Uacute",220:"Udieresis",
  225:"aacute",233:"eacute",237:"iacute",243:"oacute",250:"uacute",252:"udieresis",
  8364:"Euro"};
function gname(ch){
  const cp=ch.charCodeAt(0);
  if(GNAMES[cp])return GNAMES[cp];
  if(cp>=65&&cp<=90)return ch;
  if(cp>=97&&cp<=122)return ch;
  if(cp>=48&&cp<=57)return["zero","one","two","three","four","five","six","seven","eight","nine"][cp-48];
  return"uni"+cp.toString(16).toUpperCase().padStart(4,"0");
}

function makeNotdef(){
  const p=new opentype.Path();
  p.moveTo(50,DESC);p.lineTo(450,DESC);p.lineTo(450,ASC);p.lineTo(50,ASC);p.closePath();
  p.moveTo(80,DESC+30);p.lineTo(80,ASC-30);p.lineTo(420,ASC-30);p.lineTo(420,DESC+30);p.closePath();
  return new opentype.Glyph({name:".notdef",unicode:0,advanceWidth:500,path:p});
}

function advanceFor(svgStr){return 1000}

function buildBaseFont(family,style){
  const used=new Set([".notdef","space"]);
  const glyphs=[makeNotdef(),new opentype.Glyph({name:"space",unicode:32,advanceWidth:250,path:new opentype.Path()})];

  for(const[ch,info]of Object.entries(S.glyphs)){
    const cp=ch.charCodeAt(0);
    const[vx,vy,vw,vh]=parseVB(info.svg);
    const adv=advanceFor(info.svg);
    const layers=extractLayers(info.svg);
    const path=new opentype.Path();
    layers.forEach(l=>{
      const lp=svgDToPath(l.d,vx,vy,vw,vh);
      lp.commands.forEach(c=>path.commands.push(c));
    });
    let name=gname(ch);
    if(used.has(name))name="uni"+cp.toString(16).toUpperCase().padStart(4,"0");
    used.add(name);
    glyphs.push(new opentype.Glyph({name,unicode:cp,advanceWidth:adv,path}));
  }
  return new opentype.Font({familyName:family,styleName:style||"Regular",unitsPerEm:UPM,ascender:ASC,descender:DESC,glyphs});
}

// ══════════════════════════════════════════════════════
// INYECTOR DE TABLAS BINARIAS EN TTF/OTF
// ══════════════════════════════════════════════════════
function calcCksum(u8){
  const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  let s=0;
  for(let i=0;i+3<u8.length;i+=4)s=(s+dv.getUint32(i,false))>>>0;
  const rem=u8.length%4;
  if(rem){let v=0;for(let i=0;i<rem;i++)v|=u8[u8.length-rem+i]<<((3-i)*8);s=(s+(v>>>0))>>>0}
  return s;
}

function injectTables(fontOrBuf,tables){
  // Aceptar font opentype o ArrayBuffer/Uint8Array
  let orig;
  if(fontOrBuf instanceof Uint8Array)orig=fontOrBuf;
  else if(fontOrBuf instanceof ArrayBuffer)orig=new Uint8Array(fontOrBuf);
  else orig=new Uint8Array(fontOrBuf.toArrayBuffer());

  const dv=new DataView(orig.buffer,orig.byteOffset,orig.byteLength);
  const nOrig=dv.getUint16(4,false);
  const existing=[];
  for(let i=0;i<nOrig;i++){
    const o=12+i*16;
    const tag=String.fromCharCode(orig[o],orig[o+1],orig[o+2],orig[o+3]);
    const offset=dv.getUint32(o+8,false);
    const length=dv.getUint32(o+12,false);
    existing.push({tag,checksum:dv.getUint32(o+4,false),offset,length,data:new Uint8Array(orig.buffer,orig.byteOffset+offset,length)});
  }
  // Reemplazar o añadir
  tables.forEach(({tag,data})=>{
    const idx=existing.findIndex(t=>t.tag===tag);
    const entry={tag,checksum:calcCksum(data),offset:0,length:data.length,data};
    if(idx>=0)existing[idx]=entry;else existing.push(entry);
  });
  // Ordenar por tag
  existing.sort((a,b)=>a.tag<b.tag?-1:a.tag>b.tag?1:0);
  const n=existing.length;
  const headerSz=12+n*16;
  let curOff=headerSz;
  existing.forEach(t=>{t.offset=curOff;curOff+=Math.ceil(t.length/4)*4});
  const out=new Uint8Array(curOff);
  const odv=new DataView(out.buffer);
  // sfVersion
  odv.setUint32(0,dv.getUint32(0,false),false);
  odv.setUint16(4,n,false);
  const sr=Math.pow(2,Math.floor(Math.log2(n)))*16;
  odv.setUint16(6,sr,false);
  odv.setUint16(8,Math.floor(Math.log2(n)),false);
  odv.setUint16(10,n*16-sr,false);
  existing.forEach((t,i)=>{
    const o=12+i*16;
    for(let j=0;j<4;j++)out[o+j]=t.tag.charCodeAt(j);
    odv.setUint32(o+4,t.checksum,false);
    odv.setUint32(o+8,t.offset,false);
    odv.setUint32(o+12,t.length,false);
    out.set(t.data,t.offset);
  });
  // Fix head checkSumAdjustment
  const head=existing.find(t=>t.tag==="head");
  if(head){
    const hdv=new DataView(out.buffer,head.offset);
    hdv.setUint32(8,0,false);
    let whole=0;
    const wdv=new DataView(out.buffer);
    for(let i=0;i+3<out.length;i+=4)whole=(whole+wdv.getUint32(i,false))>>>0;
    hdv.setUint32(8,(0xB1B0AFBA-whole)>>>0,false);
  }
  return out;
}

// ══════════════════════════════════════════════════════
// BUILD COLRv0 + CPAL
// ══════════════════════════════════════════════════════
function buildCOLR(family){
  // Construir fuente base con glifos de capa adicionales
  const used=new Set([".notdef","space"]);
  const glyphs=[makeNotdef(),new opentype.Glyph({name:"space",unicode:32,advanceWidth:250,path:new opentype.Path()})];
  const colorInfo=[]; // {baseGlyphIdx, layers:[{glyphIdx, rgba}]}

  const entries=Object.entries(S.glyphs);
  entries.forEach(([ch,info])=>{
    const cp=ch.charCodeAt(0);
    const[vx,vy,vw,vh]=parseVB(info.svg);
    const adv=advanceFor(info.svg);
    const layers=extractLayers(info.svg);

    let bname=gname(ch);
    if(used.has(bname))bname="uni"+cp.toString(16).toUpperCase().padStart(4,"0");
    used.add(bname);

    // Glifo base (todos los paths juntos, negro)
    const bp=new opentype.Path();
    layers.forEach(l=>svgDToPath(l.d,vx,vy,vw,vh).commands.forEach(c=>bp.commands.push(c)));
    glyphs.push(new opentype.Glyph({name:bname,unicode:cp,advanceWidth:adv,path:bp}));
    const baseIdx=glyphs.length-1;

    const layerGlyphs=[];
    layers.forEach((l,i)=>{
      const lp=svgDToPath(l.d,vx,vy,vw,vh);
      const lname=bname+".c"+i;
      used.add(lname);
      glyphs.push(new opentype.Glyph({name:lname,advanceWidth:adv,path:lp}));
      layerGlyphs.push({glyphIdx:glyphs.length-1,rgba:l.fill||[0,0,0,255]});
    });
    if(layerGlyphs.length)colorInfo.push({baseIdx,layers:layerGlyphs});
  });

  const font=new opentype.Font({familyName:family,styleName:"COLRColor",unitsPerEm:UPM,ascender:ASC,descender:DESC,glyphs});

  if(!colorInfo.length)return new Uint8Array(font.toArrayBuffer());

  // Paleta de colores (dedup)
  const palMap=new Map(),palette=[];
  function cidx(rgba){
    const k=rgba.join(",");if(palMap.has(k))return palMap.get(k);
    const i=palette.length;palette.push(rgba);palMap.set(k,i);return i;
  }

  // COLR header: 14 bytes + BaseGlyphRecord*6 + LayerRecord*4
  const baseEntries=[],layerEntries=[];
  colorInfo.forEach(({baseIdx,layers})=>{
    const first=layerEntries.length;
    layers.forEach(l=>{layerEntries.push({gid:l.glyphIdx,ci:cidx(l.rgba)})});
    baseEntries.push({gid:baseIdx,first,num:layers.length});
  });
  baseEntries.sort((a,b)=>a.gid-b.gid);

  const nb=baseEntries.length,nl=layerEntries.length;
  const colrBuf=new ArrayBuffer(14+nb*6+nl*4);
  const cv=new DataView(colrBuf);let o=0;
  cv.setUint16(o,0,false);o+=2; // version
  cv.setUint16(o,nb,false);o+=2;
  cv.setUint32(o,14,false);o+=4;
  cv.setUint32(o,14+nb*6,false);o+=4;
  cv.setUint16(o,nl,false);o+=2;
  baseEntries.forEach(e=>{cv.setUint16(o,e.gid,false);o+=2;cv.setUint16(o,e.first,false);o+=2;cv.setUint16(o,e.num,false);o+=2});
  layerEntries.forEach(e=>{cv.setUint16(o,e.gid,false);o+=2;cv.setUint16(o,e.ci,false);o+=2});

  // CPAL: 14 bytes header + 4 per color (BGRA)
  const nc=palette.length;
  const cpalBuf=new ArrayBuffer(14+nc*4);
  const cpv=new DataView(cpalBuf);o=0;
  cpv.setUint16(o,0,false);o+=2;  // version
  cpv.setUint16(o,nc,false);o+=2; // numPaletteEntries
  cpv.setUint16(o,1,false);o+=2;  // numPalettes
  cpv.setUint16(o,nc,false);o+=2; // numColorRecords
  cpv.setUint32(o,14,false);o+=4; // offsetFirstColorRecord
  cpv.setUint16(o,0,false);o+=2;  // colorRecordIndex[0]
  palette.forEach(([r,g,b,a])=>{
    const dv2=new DataView(cpalBuf,o);
    dv2.setUint8(0,b);dv2.setUint8(1,g);dv2.setUint8(2,r);dv2.setUint8(3,a===undefined?255:a);o+=4;
  });

  return injectTables(font,[
    {tag:"COLR",data:new Uint8Array(colrBuf)},
    {tag:"CPAL",data:new Uint8Array(cpalBuf)},
  ]);
}

// ══════════════════════════════════════════════════════
// BUILD SVG COLOR FONT — la tabla que Illustrator/InDesign/Photoshop
// SÍ usan para mostrar color en pantalla (a diferencia de COLR, que
// en Adobe a veces solo afecta a impresión/PDF, no a la vista previa)
// ══════════════════════════════════════════════════════
function buildSVGColor(family){
  const base=buildBaseFont(family,"SVGColor");
  const baseBuf=new Uint8Array(base.toArrayBuffer());
  const go=[];
  for(let i=0;i<base.glyphs.length;i++) go.push(base.glyphs.get(i));

  const docs=[];
  Object.entries(S.glyphs).forEach(([ch,info])=>{
    const cp=ch.charCodeAt(0);
    let gIdx=-1;
    for(let i=0;i<go.length;i++){if(go[i].unicode===cp){gIdx=i;break}}
    if(gIdx<0)return;
    const inner=inlineSvgStylesForFont(String(info.svg||"").replace(/<\?xml[^?]*\?>/g,"").replace(/<!DOCTYPE[^>]*>/g,""));
    const docStr=`<svg id="glyph${gIdx}" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" overflow="visible"><rect width="0" height="0" fill="none"/>${inner}</svg>`;
    docs.push({data:new TextEncoder().encode(docStr),sid:gIdx,eid:gIdx});
  });

  if(!docs.length)return baseBuf;
  docs.sort((a,b)=>a.sid-b.sid);

  const nd=docs.length;
  const idxSz=nd*12;
  let doff=2+idxSz;
  const doffsets=[];
  docs.forEach(d=>{doffsets.push(doff);doff+=d.data.length});
  const svgSz=10+2+idxSz+docs.reduce((a,d)=>a+d.data.length,0);
  const svgBuf=new ArrayBuffer(svgSz);
  const sv=new DataView(svgBuf);const sb=new Uint8Array(svgBuf);
  let o=0;
  sv.setUint16(o,0,false);o+=2;
  sv.setUint32(o,10,false);o+=4;
  sv.setUint32(o,0,false);o+=4;
  sv.setUint16(o,nd,false);o+=2;
  docs.forEach((d,i)=>{
    sv.setUint16(o,d.sid,false);o+=2;
    sv.setUint16(o,d.eid,false);o+=2;
    sv.setUint32(o,doffsets[i],false);o+=4;
    sv.setUint32(o,d.data.length,false);o+=4;
  });
  docs.forEach(d=>{sb.set(d.data,o);o+=d.data.length});

  return injectTables(baseBuf,[{tag:"SVG ",data:new Uint8Array(svgBuf)}]);
}

// ══════════════════════════════════════════════════════
// BOTONES DE EXPORTAR FUENTE
// ══════════════════════════════════════════════════════
function setBusy(busy){
  ["eBw","eOtf","eColr","eSvg"].forEach(id=>$(id).disabled=busy);
}

async function doFont(mode){
  if(!Object.keys(S.glyphs).length){toast("Añade letras primero.");return}
  const family=($("fname").value||"MiFuente").trim();
  setBusy(true);prog(10);status("Generando…");
  await new Promise(r=>setTimeout(r,40));
  try{
    let buf,suffix,ext="otf"; // opentype.js genera sfnt OTTO/CFF: usar .otf para que el sistema lo reconozca
    prog(30);
    if(mode==="bw"){
      buf=new Uint8Array(buildBaseFont(family,"Regular").toArrayBuffer());
      suffix="regular";ext="otf";
    } else if(mode==="otf"){
      // opentype.js genera OTF/CFF automáticamente (OTTO signature)
      buf=new Uint8Array(buildBaseFont(family,"Regular").toArrayBuffer());
      suffix="regular";ext="otf";
    } else if(mode==="colr"){
      buf=buildCOLR(family);suffix="colr-experimental";ext="otf";
    } else if(mode==="svg"){
      buf=buildSVGColor(family);suffix="svg-color";ext="otf";
    }
    prog(90);
    // Verificar firma
    const sig=String.fromCharCode(buf[0],buf[1],buf[2],buf[3]);
    console.log("Font signature:", sig, "size:", buf.length);
    const fname2=`${family.replace(/\s+/g,"_")}_${suffix}.${ext}`;
    dlBlob(fname2,buf,"font/"+ext);
    prog(100);setTimeout(()=>prog(null),600);
    status(`✅ ${fname2} — ${Math.round(buf.length/1024)} KB`);
    toast(`✅ ${fname2} descargado`);
  }catch(e){
    console.error(e);status("❌ "+e.message);toast("❌ "+e.message,5000);prog(null);
  }
  setBusy(false);
}

$("eBw")  .onclick=()=>doFont("bw");
$("eOtf") .onclick=()=>doFont("otf");
$("eColr").onclick=()=>doFont("colr");
$("eSvg") .onclick=()=>doFont("svg");

// ══════════════════════════════════════════════════════
// ARRANQUE
// ══════════════════════════════════════════════════════
render();
