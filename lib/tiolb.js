;var lbh = 0;(_=>{
	let hc = { '<': '&lt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }, he = x => x.replace(/[<&'"]/g, c => hc[c]) //html chars and escape fn
	// Glyph data, completion tables (tc/bqc) and insertGlyph now live in
	// lib/glyphs.js, loaded before this script. See PLAN.md -> Phase 0.
	let {tcs,lbs,bqk,bqv,tc,bqc,insertGlyph}=window.Glyphs
lbh='';for(let i=0;i<lbs.length;i++){
  let ks=[]
  for(let j=0;j<tcs.length;j+=3)if(lbs[i][0]===tcs[j+2])ks.push('\nTab: '+tcs[j]+' '+tcs[j+1]+' <tab>')
  for(let j=0;j<bqk.length;j++)if(lbs[i][0]===bqv[j])ks.push('\nPrefix: <prefix> '+bqk[j])
  lbh+='<b title="'+he(lbs[i].slice(1)+(ks.length?'\n'+ks.join(''):''))+'">'+lbs[i][0]+'</b>'
}
let d=document,el=d.createElement('div');el.innerHTML=`<div class=ngn_lb>${lbh}</div>`
d.getElementById("rightPane").appendChild(el)
let t,ts=[],lb=el.firstChild,bqm=0 //t:textarea or input, lb:language bar, bqm:backquote mode
let pd=x=>x.preventDefault()
let ev=(x,t,f,c)=>x.addEventListener(t,f,c)
ev(lb,'mousedown',x=>{
  //if(x.target.classList.contains('ngn_x')){hide();upd();pd(x);return}
  if(x.target.nodeName==='B'&&t){
    insertGlyph(t,x.target.textContent)
    pd(x);return
  }
})
let fk=x=>{
  let t=x.target
  if(bqm){let i=t.selectionStart,j=t.selectionEnd,v=t.value,c=bqc[x.key];if(x.which>31){bqm=0;d.body.classList.remove('ngn_bq');log("INS")}
          if(c){t.value=v.slice(0,i)+c+v.slice(j);t.selectionStart=t.selectionEnd=i+1;pd(x);return!1}}
  if (!x.ctrlKey && !x.shiftKey && !x.altKey && !x.metaKey) {
    if (window.Glyphs.getPrefixKeys().indexOf(x.key) > -1) {
      bqm=1;d.body.classList.add('ngn_bq');pd(x); // ` or other trigger symbol pressed, wait for next key
    } else if (x.key == "Tab") {
      let i=t.selectionStart,v=t.value,c=tc[v.slice(i-2,i)]
      if(c){t.value=v.slice(0,i-2)+c+v.slice(i);t.selectionStart=t.selectionEnd=i-1;pd(x)}
    } else if (bqm && x.key == "Backspace") {bqm=0;pd(x);d.body.classList.remove('ngn_bq') }
  }
}
let ff=x=>{
  let t0=x.target,nn=t0.nodeName.toLowerCase()
  if(nn!=='textarea'&&(nn!=='input'||t0.type!=='text'&&t0.type!=='search'))return
  t=t0;if(!t.ngn){t.ngn=1;ts.push(t);ev(t,'keydown',fk)}
}
let upd=_=>{
  d.body.style.marginTop=lb.clientHeight+'px';
  //session.style.height="calc(92vh - 8px - " + lb.clientHeight+'px)';
	rightPane.style.height="calc(100vh - " + lb.clientHeight+'px)';
  linkIcon.style.top="calc(0.5em + "+lb.clientHeight+'px)';
  $$(".content").forEach(fn=node=>{
    if ((node.id === "learn")&&(node.getAttribute("data-in_notebook") === "yes")) {
      node.style.height="calc(100vh - 2px - " + lb.clientHeight+'px)';
    } else {
      node.style.height="calc(100vh - 3em + -1px - " + lb.clientHeight+'px)';
    }
  });
  checkPaneWidth(leftPane.clientWidth);
  if(fs){splitPanes.setSizes([0,100])};
}
upd();ev(window,'resize',upd)
ev(d,'focus',ff,!0);let ae=d.activeElement;ae&&ff({type:'focus',target:ae})
})();
show=_=>{document.querySelector(".ngn_lb").style.display = ''
          session.style.height="calc(-58px + 100vh)"
          document.querySelector("body").style["margin-top"]="58px"
         }
hide=_=>{document.querySelector(".ngn_lb").style.display = 'none'
         session.style.height="100vh"
         document.querySelector("body").style["margin-top"]="0"
        }
