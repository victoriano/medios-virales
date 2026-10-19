import json, os, sys
OUT = sys.argv[1]; IDX = sys.argv[2]
W, H = 1920, 1080

def comp(cid, dur, body, css, js):
    return f'''<template id="{cid}-template">
  <div data-composition-id="{cid}" data-width="{W}" data-height="{H}" data-duration="{dur}" class="sc">
{body}
    <style>
{css}
    </style>
    <script>
      (function(){{
      const tl = gsap.timeline({{ paused: true }}); const D={dur};
{js}
      window.__timelines = window.__timelines || {{}};
      window.__timelines["{cid}"] = tl;
      }})();
    </script>
  </div>
</template>
'''

FMT = 'function fmt(n){n=Math.round(n);return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,".");}'

import subprocess
VO=[float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{OUT}/audio/vo{i}.wav"])) for i in range(1,9)]
DUR=[round(v+1.0,2) for v in VO]; DUR[-1]=round(VO[-1]+2.0,2)
scenes = []

# ---- S1 hook
scenes.append(("hook", DUR[0], '''
    <div class="h-dot"><span class="l"></span><span class="r"></span></div>
    <div class="content">
      <p class="kick" id="h-k">Un análisis de datos · 2018–2026</p>
      <h1 class="h-title"><span class="ln">¿A qué partido</span><span class="ln"><span class="mark" id="h-mark">beneficia</span> cada medio?</span></h1>
      <p class="lede" id="h-sub">Lo medimos tuit a tuit en las cuentas de X de los medios generalistas españoles.</p>
    </div>''', '''
.h-title{font:800 140px/1.02 var(--f-display);letter-spacing:-.02em;max-width:1300px}
.h-title .ln{display:block}
.mark{background-image:linear-gradient(var(--hl),var(--hl));background-repeat:no-repeat;background-size:0% 42%;background-position:0 88%;padding:0 6px;margin:0 -6px}
.h-dot{position:absolute;right:110px;top:330px;width:340px;height:340px;border-radius:50%;border:4px solid var(--ink);overflow:hidden;box-shadow:12px 12px 0 var(--ink)}
.h-dot span{position:absolute;top:0;bottom:0;width:50%}
.h-dot .l{left:0;background:var(--izq)} .h-dot .r{right:0;background:var(--der)}
''', '''
      tl.from("#h-k",{y:24,opacity:0,duration:.5,ease:"power3.out"},.2);
      tl.from(".h-title .ln",{y:90,opacity:0,duration:.7,stagger:.18,ease:"expo.out"},.35);
      tl.to("#h-mark",{backgroundSize:"100% 42%",duration:.6,ease:"power2.inOut"},1.3);
      tl.from("#h-sub",{y:30,opacity:0,duration:.5,ease:"power2.out"},1.5);
      tl.from(".h-dot",{scale:.6,rotation:-40,opacity:0,duration:.9,ease:"back.out(1.6)"},.5);
      tl.to(".h-dot",{rotation:18,duration:4,ease:"sine.inOut"},1.4);
      tl.to(".content",{y:-50,opacity:0,duration:.4,ease:"power2.in"},D-.45);
      tl.to(".h-dot",{x:200,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S2 data
scenes.append(("datos", DUR[1], '''
    <div class="content">
      <p class="kick" id="d-k">Los datos</p>
      <h2 class="h2" id="d-t">Las cuentas de X de los medios, una a una</h2>
      <div class="stats">
        <div class="stat"><div class="num" data-to="66">0</div><div class="lab">cuentas de medios y programas en seguimiento</div></div>
        <div class="stat"><div class="num" data-to="607571">0</div><div class="lab">tuits en la serie histórica 2018–2026<br><small>muestra de hasta 100 por medio y mes</small></div></div>
        <div class="stat hl"><div class="num" data-to="21489">0</div><div class="lab">tuits virales del último año<br><small>todos los que pasaron de 100 retuits</small></div></div>
      </div>
    </div>''', '''
.stats{display:flex;gap:40px;margin-top:40px}
.stat{flex:1;background:var(--panel);border:3px solid var(--ink);border-radius:6px;box-shadow:8px 8px 0 var(--ink);padding:44px 40px;display:flex;flex-direction:column;gap:18px}
.stat.hl{background:var(--hl)}
.num{font:800 112px/1 var(--f-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.lab{font:500 30px/1.3 var(--f-sans)}
.lab small{display:block;margin-top:8px;font:500 22px/1.3 var(--f-mono);color:var(--muted)}
.stat.hl .lab small{color:var(--ink)}
''', FMT + '''
      tl.from("#d-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#d-t",{y:50,opacity:0,duration:.6,ease:"expo.out"},.25);
      tl.from(".stat",{y:80,opacity:0,duration:.6,stagger:.25,ease:"power3.out"},.6);
      document.querySelectorAll('[data-composition-id="datos"] .num').forEach(function(el,i){
        const o={v:0}, to=+el.dataset.to;
        tl.to(o,{v:to,duration:1.6,ease:"power2.out",onUpdate:function(){el.textContent=fmt(o.v)}},.8+i*.25);
      });
      tl.to(".content",{x:-140,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S3 method steps
scenes.append(("metodo", DUR[2], '''
    <div class="content">
      <p class="kick" id="m-k">El método</p>
      <h2 class="h2" id="m-t">Cada tuit pasa por tres preguntas</h2>
      <div class="steps">
        <div class="step"><div class="n">1</div><div class="q">¿Habla de política española?</div><div class="how">Filtro de sí o no con TypeSafe. Fuera deportes, sucesos y política extranjera.</div></div>
        <div class="arrow">→</div>
        <div class="step"><div class="n">2</div><div class="q">¿Quién es quién?</div><div class="how">Gemini busca en Google a las personas y casos que aparecen y a qué partido están ligados.</div></div>
        <div class="arrow">→</div>
        <div class="step"><div class="n">3</div><div class="q">¿A qué partido señala, y para bien o para mal?</div><div class="how">Con esa ficha delante, Gemini decide el partido y la dirección.</div></div>
      </div>
    </div>''', '''
.steps{display:flex;align-items:stretch;gap:24px;margin-top:40px}
.step{flex:1;background:var(--panel);border:3px solid var(--ink);border-radius:6px;box-shadow:8px 8px 0 var(--ink);padding:40px 36px;display:flex;flex-direction:column;gap:20px}
.step .n{width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--bg);font:700 34px/64px var(--f-mono);text-align:center}
.step .q{font:700 48px/1.1 var(--f-display)}
.step .how{font:400 28px/1.4 var(--f-serif);color:var(--lede)}
.arrow{align-self:center;font:700 60px/1 var(--f-sans)}
''', '''
      tl.from("#m-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#m-t",{y:50,opacity:0,duration:.6,ease:"expo.out"},.25);
      const steps=document.querySelectorAll('[data-composition-id="metodo"] .step');
      const arrows=document.querySelectorAll('[data-composition-id="metodo"] .arrow');
      steps.forEach(function(s,i){
        tl.from(s,{y:90,opacity:0,duration:.6,ease:"power3.out"},[1.9,4.3,8.4][i]);
        if(arrows[i]) tl.from(arrows[i],{x:-30,opacity:0,duration:.35,ease:"power2.out"},[4.0,8.1][i]);
      });
      tl.to(".content",{y:-60,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S3b example
scenes.append(("ejemplo", DUR[3], '''
    <div class="content ej">
      <p class="kick" id="e-k">Un ejemplo real</p>
      <div class="row">
        <div class="tweet" id="e-tw">
          <div class="who"><img src="logos/abc_es.webp"><div><b>ABC.es</b><span>@abc_es · 23 ene 2026</span></div></div>
          <p class="txt">Adif compró piedra no homologada para el AVE a la cantera que empleaba a la mujer de Koldo</p>
          <div class="met">3.682 retuits · 7.950 me gusta</div>
        </div>
        <div class="verdict">
          <div class="chip psoe" id="e-c1">PSOE</div>
          <div class="chip perj" id="e-c2">perjudica</div>
          <p class="why" id="e-why">Critica una decisión del Gobierno, así que cuenta como PSOE.<br><b>Suma a la derecha.</b></p>
        </div>
      </div>
    </div>''', '''
.row{display:flex;gap:80px;align-items:center;margin-top:30px}
.tweet{width:980px;background:var(--panel);border:3px solid var(--ink);border-radius:10px;box-shadow:10px 10px 0 var(--ink);padding:44px 48px;display:flex;flex-direction:column;gap:26px}
.who{display:flex;gap:20px;align-items:center}
.who img{width:84px;height:84px;border-radius:50%;border:2px solid var(--ink)}
.who b{display:block;font:700 34px/1.2 var(--f-sans)} .who span{font:500 24px/1.2 var(--f-mono);color:var(--muted)}
.txt{font:500 46px/1.3 var(--f-serif)}
.met{font:500 24px/1 var(--f-mono);color:var(--muted)}
.verdict{display:flex;flex-direction:column;gap:24px;align-items:flex-start}
.chip{font:700 52px/1 var(--f-mono);padding:20px 30px;border:3px solid var(--ink);border-radius:6px;box-shadow:6px 6px 0 var(--ink)}
.chip.psoe{background:var(--chip-psoe);color:var(--izq)} .chip.perj{background:var(--chip-perj);color:var(--perj)}
.why{font:400 32px/1.4 var(--f-serif);max-width:560px;margin-top:10px}
.why b{font-family:var(--f-sans);color:var(--der)}
''', '''
      tl.from("#e-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#e-tw",{x:-120,opacity:0,duration:.7,ease:"expo.out"},.3);
      tl.from("#e-c1",{scale:1.8,rotation:-8,opacity:0,duration:.45,ease:"back.out(2)"},8.2);
      tl.from("#e-c2",{scale:1.8,rotation:6,opacity:0,duration:.45,ease:"back.out(2)"},9.6);
      tl.from("#e-why",{y:30,opacity:0,duration:.5,ease:"power2.out"},6.4);
      tl.to(".content",{x:-140,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S4 index
scenes.append(("indice", DUR[4], '''
    <div class="content">
      <p class="kick" id="i-k">El índice</p>
      <h2 class="h2" id="i-t">Cada tuit con lado claro suma a un lado</h2>
      <div class="sides">
        <div class="side izq" id="i-l"><div class="sh">Izquierda</div><p>beneficia a PSOE o Sumar</p><p>perjudica a PP o Vox</p></div>
        <div class="side der" id="i-r"><div class="sh">Derecha</div><p>beneficia a PP o Vox</p><p>perjudica a PSOE o Sumar</p></div>
      </div>
      <div class="scale" id="i-s">
        <div class="bar"><div class="knob" id="i-knob"></div></div>
        <div class="ticks"><span>−1 · todo a la izquierda</span><span>0</span><span>todo a la derecha · +1</span></div>
      </div>
      <p class="foot" id="i-f">Índice = (derecha − izquierda) ÷ total con lado claro. Es una decisión de modelado, no una verdad.</p>
    </div>''', '''
.sides{display:flex;gap:40px;margin-top:20px}
.side{flex:1;border:3px solid var(--ink);border-radius:6px;box-shadow:8px 8px 0 var(--ink);padding:30px 40px}
.side.izq{background:var(--chip-psoe)} .side.der{background:var(--chip-pp)}
.sh{font:800 60px/1 var(--f-display);margin-bottom:16px}
.izq .sh{color:var(--izq)} .der .sh{color:var(--der)}
.side p{font:500 34px/1.45 var(--f-sans)}
.scale{margin-top:36px}
.bar{position:relative;height:36px;border:3px solid var(--ink);border-radius:20px;background:linear-gradient(90deg,var(--izq),#e9e2d4 50%,var(--der))}
.knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:var(--panel);border:4px solid var(--ink)}
.ticks{display:flex;justify-content:space-between;margin-top:14px;font:500 24px/1 var(--f-mono);color:var(--muted)}
.foot{font:italic 400 28px/1.4 var(--f-serif);color:var(--muted);margin-top:10px}
''', '''
      tl.from("#i-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#i-t",{y:50,opacity:0,duration:.6,ease:"expo.out"},.25);
      tl.from("#i-l",{x:-80,opacity:0,duration:.55,ease:"power3.out"},2.4);
      tl.from("#i-r",{x:80,opacity:0,duration:.55,ease:"power3.out"},6.6);
      tl.from("#i-s",{scaleX:.2,opacity:0,duration:.6,ease:"expo.out"},8.0);
      tl.to("#i-knob",{x:-672,duration:.8,ease:"power2.inOut"},9.0);
      tl.to("#i-knob",{x:672,duration:1.1,ease:"power2.inOut"},10.6);
      tl.to("#i-knob",{x:0,duration:.7,ease:"power2.inOut"},12.0);
      tl.from("#i-f",{opacity:0,y:20,duration:.5,ease:"power2.out"},9.0);
      tl.to(".content",{y:-60,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S5 spectrum
idx = json.load(open(IDX))
pick = {"@El_Plural":"el_plural","@DiarioSabemos":"diariosabemos","@eldiarioes":"eldiarioes","@publico_es":"publico_es","@_infoLibre":"_infolibre",
 "@el_pais":"el_pais","@La_SER":"la_ser","@laSextaTV":"lasextatv","@rtvenoticias":"rtvenoticias","@europapress":"europapress",
 "@elperiodico":"elperiodico","@A3Noticias":"a3noticias","@elmundoes":"elmundoes","@elespanolcom":"elespanolcom","@COPE":"cope",
 "@abc_es":"abc_es","@larazon_es":"larazon_es","@libertaddigital":"libertaddigital","@okdiario":"okdiario","@eltorotv":"eltorotv",
 "@TRECE_es":"trece_es","@esRadio":"esradio","@ESdiario_com":"esdiario_com","@periodistadigit":"periodistadigit",
 "@MalasLenguas_Tv":"malaslenguas_tv","@laSextaColumna":"lasextacolumna","@HoyPorHoy":"hoyporhoy","@Hora25":"hora25","@ctxt_es":"ctxt_es","@MananerosTVE":"mananerostve","@DebatAlRojoVivo":"debatalrojovivo","@laventana":"laventana"}
ms = sorted([m for m in idx["medios"] if m["handle"] in pick], key=lambda m: m["indice"])
assert len(ms)==len(pick), [h for h in pick if h not in {m['handle'] for m in ms}]
X0, X1 = 200, 1720; AXY = 870; LOGO = 56
lanes = []; dots = []
for m in ms:
    x = X0 + (m["indice"]+1)/2*(X1-X0)
    for li, last in enumerate(lanes):
        if x - last >= LOGO + 6: lanes[li] = x; break
    else:
        lanes.append(x); li = len(lanes)-1
    col = "var(--izq)" if m["indice"] < -0.1 else ("var(--der)" if m["indice"] > 0.1 else "var(--neu)")
    dots.append((m, x, li, col))
print("lanes", len(lanes), file=sys.stderr)
dh = []
for i,(m,x,li,col) in enumerate(dots):
    y = AXY - 50 - li*(LOGO+8)
    v = f'{m["indice"]:+.2f}'.replace(".",",").replace("-","−")
    dh.append(f'<div class="md" style="left:{x-LOGO/2:.0f}px;top:{y-LOGO/2:.0f}px;border-color:{col}" data-i="{i}"><img src="logos/{pick[m["handle"]]}.webp"></div>'
              f'<div class="stem" style="left:{x-1.5:.0f}px;top:{y+LOGO/2:.0f}px;height:{AXY-(y+LOGO/2):.0f}px;background:{col}"></div>')
def lab(h, side):
    for m,x,li,col in dots:
        if m["handle"]==h:
            y = AXY - 50 - li*(LOGO+8)
            v = f'{m["indice"]:+.2f}'.replace(".",",").replace("-","−")
            return f'<div class="lbl {side}" style="left:{x:.0f}px;top:{AXY+125}px;color:{col}"><b>{m["nombre"]}</b> {v}</div>'
labels = lab("@MalasLenguas_Tv","l") + lab("@rtvenoticias","c") + lab("@periodistadigit","r")
scenes.append(("espectro", DUR[5], f'''
    <div class="content top">
      <p class="kick" id="s-k">El mapa</p>
      <h2 class="h2" id="s-t">Dónde cae cada medio</h2>
      <p class="lede" id="s-sub">32 medios y programas · índice de la serie 2018–2026</p>
    </div>
    <div class="zone zl"></div><div class="zone zr"></div>
    <div class="axis" id="s-ax"></div>
    <div class="tk" style="left:{X0}px">−1</div><div class="tk" style="left:{(X0+X1)/2:.0f}px">0</div><div class="tk" style="left:{X1}px">+1</div>
    <div class="side-lbl l">← izquierda</div><div class="side-lbl r">derecha →</div>
    {''.join(dh)}
    {labels}''', f'''
.content.top{{justify-content:flex-start;padding-top:130px;gap:14px}}
.zone{{position:absolute;top:{AXY-430}px;height:430px;width:{(X1-X0)/2:.0f}px;opacity:.55}}
.zl{{left:{X0}px;background:linear-gradient(90deg,var(--zona-miz),transparent)}}
.zr{{left:{(X0+X1)/2:.0f}px;background:linear-gradient(90deg,transparent,var(--zona-mdr))}}
.axis{{position:absolute;left:{X0-20}px;width:{X1-X0+40}px;top:{AXY}px;height:4px;background:var(--ink)}}
.tk{{position:absolute;top:{AXY+18}px;transform:translateX(-50%);font:600 28px/1 var(--f-mono)}}
.side-lbl{{position:absolute;top:{AXY+70}px;font:600 30px/1 var(--f-mono)}}
.side-lbl.l{{left:{X0}px;color:var(--izq)}} .side-lbl.r{{right:{W-X1}px;color:var(--der)}}
.md{{position:absolute;width:{LOGO}px;height:{LOGO}px;border-radius:50%;border:5px solid;background:var(--panel);overflow:hidden;box-shadow:3px 3px 0 var(--ink);z-index:2}}
.md img{{width:100%;height:100%;display:block}}
.stem{{position:absolute;width:3px;opacity:.5}}
.lbl{{position:absolute;transform:translateX(-50%);white-space:nowrap;font:600 28px/1 var(--f-mono);background:var(--panel);border:2.5px solid var(--ink);padding:10px 14px;border-radius:4px;box-shadow:4px 4px 0 var(--ink);z-index:3}}
.lbl.l{{transform:translateX(-20%)}} .lbl.r{{transform:translateX(-80%)}}
.lbl b{{font-family:var(--f-sans);color:var(--ink)}}
''', '''
      tl.from("#s-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#s-t",{y:50,opacity:0,duration:.6,ease:"expo.out"},.25);
      tl.from("#s-sub",{y:30,opacity:0,duration:.5,ease:"power2.out"},.55);
      tl.from("#s-ax",{scaleX:0,transformOrigin:"center",duration:.8,ease:"expo.out"},.8);
      tl.from('[data-composition-id="espectro"] .tk, [data-composition-id="espectro"] .side-lbl',{opacity:0,y:16,duration:.4,stagger:.06},1.2);
      tl.from('[data-composition-id="espectro"] .zone',{opacity:0,duration:1},1.2);
      tl.from('[data-composition-id="espectro"] .stem',{scaleY:0,transformOrigin:"bottom",duration:.35,stagger:.13,ease:"power2.out"},1.7);
      tl.from('[data-composition-id="espectro"] .md',{scale:0,y:40,duration:.45,stagger:.13,ease:"back.out(2)"},1.75);
      document.querySelectorAll('[data-composition-id="espectro"] .lbl').forEach(function(el,i){tl.from(el,{opacity:0,y:20,scale:.9,duration:.45,ease:"back.out(1.8)"},[6.0,10.4,13.0][i]);});
      tl.to('[data-composition-id="espectro"] > div:not(style):not(script)',{opacity:0,duration:.45,ease:"power2.in"},D-.45);
'''))

# ---- S6 findings
bars = [("PSOE",6729,50,"var(--psoe)"),("PP",3903,29,"var(--pp)"),("Vox",572,4,"var(--vox)"),("Sumar",285,2,"var(--sumar)")]
bh = ''.join(f'<div class="br"><div class="bn">{n}</div><div class="bt"><div class="bf" style="width:{p*1.7:.0f}%;background:{c}"></div></div><div class="bv">{p} %<small>{str(v)[:-3]+"."+str(v)[-3:] if v>=1000 else v} tuits</small></div></div>' for n,v,p,c in bars)
scenes.append(("hallazgos", DUR[6], f'''
    <div class="content">
      <p class="kick" id="f-k">Lo más viral del último año</p>
      <h2 class="h2" id="f-t">El PSOE protagoniza la mitad de los tuits políticos</h2>
      <div class="frow">
        <div class="bars">{bh}</div>
        <div class="big" id="f-big"><div class="bnum">70 %</div><p>de esos tuits son críticos con el partido al que señalan</p></div>
      </div>
      <p class="foot" id="f-f">Censo de 21.489 tuits con más de 100 retuits, sep 2025 – sep 2026. 13.412 con lectura política.</p>
    </div>''', '''
.frow{display:flex;gap:80px;align-items:center;margin-top:30px}
.bars{flex:1;display:flex;flex-direction:column;gap:30px}
.br{display:flex;align-items:center;gap:28px}
.bn{width:150px;font:700 40px/1 var(--f-sans)}
.bt{flex:1;height:58px;border-bottom:3px solid var(--line)}
.bf{height:100%;border:3px solid var(--ink);box-shadow:5px 5px 0 var(--ink)}
.bv{width:190px;font:800 46px/1 var(--f-display)}
.bv small{display:block;font:500 20px/1.4 var(--f-mono);color:var(--muted)}
.big{width:520px;background:var(--hl);border:3px solid var(--ink);border-radius:6px;box-shadow:10px 10px 0 var(--ink);padding:44px}
.bnum{font:900 150px/1 var(--f-display);color:var(--perj);-webkit-text-stroke:0}
.big p{font:500 34px/1.3 var(--f-sans);margin-top:14px}
.foot{font:500 22px/1.4 var(--f-mono);color:var(--muted);margin-top:24px}
''', '''
      tl.from("#f-k",{y:20,opacity:0,duration:.4,ease:"power3.out"},.15);
      tl.from("#f-t",{y:50,opacity:0,duration:.6,ease:"expo.out"},.25);
      tl.from('[data-composition-id="hallazgos"] .br',{opacity:0,x:-40,duration:.4,stagger:.15,ease:"power2.out"},.8);
      tl.from('[data-composition-id="hallazgos"] .bf',{scaleX:0,transformOrigin:"left",duration:.8,stagger:.15,ease:"expo.out"},1.0);
      tl.from("#f-big",{scale:.7,rotation:-4,opacity:0,duration:.6,ease:"back.out(1.8)"},7.4);
      tl.from("#f-f",{opacity:0,duration:.5},4.0);
      tl.to(".content",{y:-60,opacity:0,duration:.4,ease:"power2.in"},D-.45);
'''))

# ---- S7 outro
scenes.append(("cierre", DUR[7], '''
    <div class="content cierre">
      <h2 class="o-t" id="o-t">Explóralo medio a medio,<br>tuit a tuit</h2>
      <div class="url" id="o-u"><span class="dot"></span>medios.victoriano.me</div>
      <p class="o-s" id="o-s">Datos y método abiertos en github.com/victoriano/medios-virales</p>
    </div>''', '''
.cierre{align-items:center;text-align:center;justify-content:center}
.o-t{font:800 110px/1.05 var(--f-display);letter-spacing:-.02em}
.url{display:inline-flex;align-items:center;gap:26px;margin-top:40px;font:600 64px/1 var(--f-mono);background:var(--panel);border:4px solid var(--ink);border-radius:8px;box-shadow:12px 12px 0 var(--ink);padding:34px 50px}
.dot{width:52px;height:52px;border-radius:50%;border:3px solid var(--ink);background:linear-gradient(90deg,var(--izq) 0 50%,var(--der) 50% 100%)}
.o-s{font:500 28px/1.4 var(--f-mono);color:var(--muted);margin-top:36px}
''', '''
      tl.from("#o-t",{y:70,opacity:0,duration:.7,ease:"expo.out"},.2);
      tl.from("#o-u",{scale:.8,opacity:0,duration:.6,ease:"back.out(1.8)"},.8);
      tl.from('[data-composition-id="cierre"] .dot',{rotation:-180,duration:1,ease:"power3.out"},.8);
      tl.from("#o-s",{opacity:0,y:20,duration:.5,ease:"power2.out"},1.4);
'''))

os.makedirs(f"{OUT}/compositions", exist_ok=True)
t = 0; mounts = []
for i,(cid,dur,body,css,js) in enumerate(scenes):
    open(f"{OUT}/compositions/{cid}.html","w").write(comp(cid,dur,body,css,js))
    mounts.append(f'    <audio id="vo-{cid}" src="audio/vo{i+1}.wav" data-start="{t+0.3:g}" data-duration="{VO[i]:.2f}" data-track-index="2" data-volume="1"></audio>')
    mounts.append(f'    <div id="sc-{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" data-start="{t:g}" data-duration="{dur}" data-track-index="1" data-width="{W}" data-height="{H}" style="position:absolute;inset:0;z-index:1"></div>')
    t += dur
TOTAL = t
fonts = open(f"{OUT}/fonts.css").read() if os.path.exists(f"{OUT}/fonts.css") else ""
root = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width={W}, height={H}" />
<title>Medios virales</title>
<script src="assets/gsap.min.js"></script>
<style>
{fonts}
:root{{--f-display:"Fraunces",Georgia,serif;--f-serif:"Source Serif 4",Georgia,serif;--f-sans:"Inter Tight",sans-serif;--f-mono:"IBM Plex Mono",monospace;
--bg:#f5efe3;--panel:#fffcf5;--ink:#161514;--muted:#6c655a;--line:#d8cfbf;--lede:#2c2924;--hl:#ffd23f;
--izq:#d93a3a;--der:#1f5fc9;--neu:#8e887d;--ben:#14937a;--perj:#e2702a;
--pp:#1f5fc9;--psoe:#d93a3a;--vox:#3c9a45;--sumar:#c8336f;--chip-pp:#dfe8f8;--chip-psoe:#f9e0dd;--chip-perj:#fbe5d4;
--zona-miz:#f6dcd6;--zona-mdr:#d6e1f2}}
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:{W}px;height:{H}px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--f-sans);-webkit-font-smoothing:antialiased}}
.sc{{position:absolute;inset:0}}
.content{{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;width:100%;height:100%;padding:150px 160px 110px;gap:22px}}
.kick{{font:600 26px/1.3 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}}
.h2{{font:800 84px/1.05 var(--f-display);letter-spacing:-.015em;max-width:1500px}}
.lede{{font:400 36px/1.4 var(--f-serif);color:var(--lede);max-width:1100px}}
.mast{{position:absolute;left:0;right:0;top:0;height:92px;border-bottom:3px solid var(--ink);display:flex;align-items:center;justify-content:space-between;padding:0 160px;z-index:5;background:var(--bg)}}
.marca{{display:flex;align-items:center;gap:16px;font:600 24px/1 var(--f-mono);letter-spacing:.06em}}
.marca i{{width:24px;height:24px;border-radius:50%;border:2.5px solid var(--ink);background:linear-gradient(90deg,var(--izq) 0 50%,var(--der) 50% 100%)}}
.mast .r{{font:500 22px/1 var(--f-mono);color:var(--muted);letter-spacing:.06em}}
.prog{{position:absolute;left:0;bottom:0;height:10px;width:100%;background:var(--ink);transform-origin:left;transform:scaleX(0);z-index:5}}
</style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:g}" data-width="{W}" data-height="{H}">
    <div class="mast" id="mast"><div class="marca"><i></i>MEDIOS VIRALES</div><div class="r">QUÉ PARTIDO BENEFICIA CADA MEDIO</div></div>
    <div class="prog" id="prog"></div>
{chr(10).join(mounts)}
  </div>
  <script>
    window.__timelines = window.__timelines || {{}};
    const tl = gsap.timeline({{ paused: true }});
    tl.from("#mast",{{y:-100,duration:.6,ease:"power3.out"}},0);
    tl.to("#prog",{{scaleX:1,duration:{TOTAL:g},ease:"none"}},0);
    window.__timelines["main"] = tl;
  </script>
</body>
</html>
'''
open(f"{OUT}/index.html","w").write(root)
print("total", TOTAL, file=sys.stderr)
