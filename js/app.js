  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // formulario de contacto → webhook n8n → Airtable. Antispam: campo trampa "web" + tiempo mínimo
  (function () {
    const WEBHOOK_URL = 'https://n8n.n8nniaipartners.tech/webhook/landing-contacto';
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');
    if (!form) return;
    const msg = {
      es: { ok: 'Recibido. Te contestamos en menos de 24h.', err: 'No se pudo enviar. Escríbenos por WhatsApp o email, por favor.' },
      en: { ok: "Got it. We'll reply within 24h.", err: 'Something went wrong. Please reach us via WhatsApp or email instead.' }
    };
    const t0 = Date.now();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const lang = document.documentElement.lang === 'en' ? 'en' : 'es';
      const t = Date.now() - t0;
      if (form.web.value || t < 3000) {
        status.textContent = msg[lang].ok;
        status.className = 'form-status show ok';
        form.reset();
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': '9f3a7c2e-8b4d-41f6-a0c9-3e7d5f2b1a68' },
          body: JSON.stringify({
            nombre: form.nombre.value,
            contacto: form.contacto.value,
            empresa: form.empresa.value,
            problema: form.problema.value,
            web: form.web.value,
            t
          })
        });
        if (!res.ok) throw new Error('webhook error');
        if (window.posthog) posthog.capture('form_submitted');
        status.textContent = msg[lang].ok;
        status.className = 'form-status show ok';
        form.reset();
      } catch (err) {
        status.textContent = msg[lang].err;
        status.className = 'form-status show err';
        btn.disabled = false;
      }
    });
  })();

  // evento: clic en WhatsApp (para el embudo de PostHog)
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => a.addEventListener('click', () => {
    if (window.posthog) posthog.capture('whatsapp_click');
  }));

  // modo claro / oscuro
  document.querySelector('.theme-toggle').addEventListener('click', () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('niai-theme', t); } catch (e) {}
  });

  // idioma ES / EN
  (function () {
    function setLang(lang) {
      document.documentElement.lang = lang;
      document.querySelectorAll('[data-es][data-en]').forEach(el => { el.innerHTML = el.getAttribute('data-' + lang); });
      document.querySelectorAll('[data-ph-es][data-ph-en]').forEach(el => { el.placeholder = el.getAttribute('data-ph-' + lang); });
      document.querySelectorAll('.decode').forEach(el => { if (el._iv) { clearInterval(el._iv); el._iv = null; } delete el.dataset.final; });
      document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.toggle('active', b.dataset.setlang === lang));
    }
    document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.setlang)));
  })();

  // arranque de animaciones del hero (se repite al volver arriba)
  const heroLines = document.querySelectorAll('.hero h1 .line > span');
  function heroIn(on){
    heroLines.forEach((s, i) => {
      s.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1) ' + (0.15 + i*0.12) + 's, opacity .8s ease ' + (0.15 + i*0.12) + 's';
      s.style.transform = on ? 'translateY(0)' : 'translateY(110%)';
      s.style.opacity = on ? '1' : '0';
    });
    document.body.classList.toggle('ready', on);
  }
  requestAnimationFrame(() => heroIn(true));
  const heroObs = new IntersectionObserver((es) => es.forEach(e => heroIn(e.isIntersecting)), { threshold: 0.2 });
  heroObs.observe(document.querySelector('.hero'));

  // progreso de scroll
  const prog = document.getElementById('progress');
  const onScrollProg = () => { const h = document.documentElement; prog.style.width = (h.scrollTop/(h.scrollHeight-h.clientHeight)*100) + '%'; };
  window.addEventListener('scroll', onScrollProg, { passive: true }); onScrollProg();

  // header
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

  // overlay de contacto (abrir con cualquier botón que apunte a #contacto)
  (function () {
    const overlay = document.getElementById('contacto');
    const seq = overlay.querySelectorAll('.stamp, h2, .sub, .form-field, form .cta, .form-note');
    const open = () => {
      overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
      seq.forEach((el, i) => { el.classList.remove('in'); setTimeout(() => el.classList.add('in'), 150 + i * 70); });
    };
    const close = () => {
      overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll');
      seq.forEach(el => el.classList.remove('in'));
    };
    document.querySelectorAll('a[href="#contacto"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); open(); }));
    document.querySelectorAll('[data-close-contacto]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
    if (location.hash === '#contacto') open();
    window.addEventListener('hashchange', () => { if (location.hash === '#contacto') open(); });
  })();

  // overlays legales (aviso / privacidad / cookies)
  (function () {
    const ids = ['legal-aviso', 'legal-privacidad', 'legal-cookies'];
    const overlays = ids.map(id => document.getElementById(id)).filter(Boolean);
    let current = null;
    const open = (overlay) => { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); current = overlay; };
    const close = () => { if (!current) return; current.classList.remove('open'); current.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); current = null; };
    ids.forEach(id => {
      document.querySelectorAll(`a[href="#${id}"]`).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const overlay = document.getElementById(id);
        if (overlay) open(overlay);
      }));
    });
    document.querySelectorAll('[data-close-legal]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && current) close(); });
  })();

  // cursor personalizado
  if (!coarse && !reduce) {
    const dot = document.getElementById('curDot'), ring = document.getElementById('curRing');
    let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; });
    (function loop(){ rx += (mx-rx)*0.18; ry += (my-ry)*0.18; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
    document.querySelectorAll('[data-hot], a, button, input, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hot'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hot'));
    });
  }

  // efecto "descifrar"
  if (!reduce) {
    const glyphs = '█▓▒░#%&$@01<>/\\{}';
    function decode(el) {
      const final = el.dataset.final || el.textContent; el.dataset.final = final;
      if (el._iv) clearInterval(el._iv);
      let frame = 0; const total = final.length;
      el._iv = setInterval(() => {
        el.textContent = final.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < frame) return final[i];
          return glyphs[Math.floor(Math.random()*glyphs.length)];
        }).join('');
        frame += 0.6;
        if (frame >= total) { el.textContent = final; clearInterval(el._iv); el._iv = null; }
      }, 34);
    }
    const dio = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) decode(e.target); }), { threshold: 0.6 });
    document.querySelectorAll('.decode').forEach(el => dio.observe(el));
  }

  // canvas: red de partículas
  (function () {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas || reduce) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes = []; const mouse = { x:-9999, y:-9999 };
    function col(){ return document.documentElement.getAttribute('data-theme') === 'dark' ? [47,165,119] : [20,110,79]; }
    function resize(){
      dpr = Math.min(devicePixelRatio||1, 2); w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w*dpr; canvas.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      const n = Math.min(Math.floor(w*h/14000), 110);
      nodes = Array.from({length:n}, () => ({ x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3 }));
    }
    function draw(){
      ctx.clearRect(0,0,w,h); const c = col(), L = 140;
      for (const n of nodes){
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<0||n.x>w)n.vx*=-1; if(n.y<0||n.y>h)n.vy*=-1;
        const dx=n.x-mouse.x, dy=n.y-mouse.y, d=Math.hypot(dx,dy);
        if(d<160){ n.x+=dx/d*0.8; n.y+=dy/d*0.8; }
        ctx.beginPath(); ctx.arc(n.x,n.y,1.7,0,7); ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},.6)`; ctx.fill();
      }
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
        const a=nodes[i], b=nodes[j], d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<L){ ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${.18*(1-d/L)})`; ctx.lineWidth=1; ctx.stroke(); }
      }
      requestAnimationFrame(draw);
    }
    window.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; }, { passive:true });
    window.addEventListener('mouseout', () => { mouse.x=-9999; mouse.y=-9999; });
    window.addEventListener('resize', resize, { passive:true });
    resize(); draw();
  })();

  // ejemplos visuales
  (function () {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const tr = (es, en) => document.documentElement.lang === 'en' ? en : es;
  const players = {
    async docs(el, run) {
      const files = el.querySelectorAll('.file'), folds = el.querySelectorAll('.fold'), done = el.querySelector('.statusbar b'), pend = el.querySelector('.pend');
      const base = [4, 7, 2], names = ['García', 'López', 'Ruiz'];
      files.forEach(f => { f.classList.remove('active', 'gone'); const c = f.querySelector('.chip'); c.className = 'chip'; c.textContent = ''; });
      folds.forEach((f, i) => { f.classList.remove('flash'); f.querySelector('.cnt').textContent = base[i]; });
      done.classList.remove('on'); pend.textContent = 3;
      if (reduce) { files.forEach(f => f.classList.add('gone')); folds.forEach((f, i) => f.querySelector('.cnt').textContent = base[i] + 1); done.classList.add('on'); pend.textContent = 0; return; }
      await wait(600);
      for (let i = 0; i < files.length; i++) {
        if (run.stop) return;
        const f = files[i], chip = f.querySelector('.chip'), k = +f.dataset.f;
        f.classList.add('active'); chip.className = 'chip wait on'; chip.textContent = tr('Leyendo…', 'Reading…');
        await wait(900); if (run.stop) return;
        chip.className = 'chip go on'; chip.textContent = '→ ' + names[k];
        await wait(700); if (run.stop) return;
        f.classList.add('gone');
        folds[k].classList.add('flash'); folds[k].querySelector('.cnt').textContent = base[k] + 1; pend.textContent = 2 - i;
        setTimeout(() => folds[k].classList.remove('flash'), 900);
        await wait(500);
      }
      if (!run.stop) done.classList.add('on');
    },
    async mail(el, run) {
      const nw = el.querySelector('.msg.new'), empty = el.querySelector('.empty'), open = el.querySelector('.mail-open');
      const draft = el.querySelector('.draft'), txt = draft.querySelector('.txt'), btn = el.querySelector('.btn.pri');
      const toast = el.querySelector('.toast'), cur = el.querySelector('.cursor'), win = el.querySelector('.win');
      const reply = tr('Hola, Ana: tu expediente está en trámite. En cuanto tengamos respuesta te escribimos. Un saludo.', "Hi Ana, your case is in progress. We'll write to you as soon as we hear back. Best regards.");
      const steps = el.querySelectorAll('.pasos li');
      const step = n => steps.forEach((li, i) => { li.classList.toggle('on', i === n); li.classList.toggle('done', i < n); });
      nw.classList.remove('on', 'sel'); open.classList.remove('on'); empty.style.display = ''; draft.classList.remove('on', 'sent'); txt.textContent = ''; step(-1);
      draft.querySelector('.lbl').textContent = tr('✦ Respuesta preparada automáticamente', '✦ Reply prepared automatically');
      toast.classList.remove('on'); btn.classList.remove('glow'); cur.classList.remove('on');
      cur.style.transition = 'none'; cur.style.left = '62%'; cur.style.top = '92%'; void cur.offsetWidth; cur.style.transition = '';
      if (reduce) { nw.classList.add('on', 'sel'); empty.style.display = 'none'; open.classList.add('on'); draft.classList.add('on'); txt.textContent = reply; step(3); return; }
      await wait(600); if (run.stop) return;
      nw.classList.add('on'); step(0);
      await wait(1300); if (run.stop) return;
      nw.classList.add('sel'); empty.style.display = 'none'; open.classList.add('on');
      await wait(1200); if (run.stop) return;
      draft.classList.add('on'); step(1);
      for (let i = 1; i <= reply.length; i++) {
        if (run.stop) return;
        txt.innerHTML = reply.slice(0, i) + '<span class="caret"></span>';
        await wait(38);
      }
      txt.textContent = reply;
      await wait(700); if (run.stop) return;
      step(2);
      btn.classList.add('glow');
      await wait(900); if (run.stop) return;
      cur.classList.add('on');
      await wait(200);
      { const w = win.getBoundingClientRect(), r = btn.getBoundingClientRect(); cur.style.left = (r.left - w.left + r.width * .55) + 'px'; cur.style.top = (r.top - w.top + r.height * .45) + 'px'; }
      await wait(1300); if (run.stop) return;
      btn.classList.remove('glow');
      btn.classList.add('press'); await wait(160); btn.classList.remove('press');
      draft.classList.add('sent'); draft.querySelector('.lbl').textContent = tr('✓ Enviado · revisado por ti', '✓ Sent · reviewed by you');
      toast.classList.add('on'); step(3);
      await wait(900); cur.classList.remove('on');
      await wait(2500); toast.classList.remove('on');
    },
    async voz(el, run) {
      const chat = el.querySelector('.s-chat'), lock = el.querySelector('.s-lock'), body = el.querySelector('.chat-body');
      const bubs = el.querySelectorAll('.bub'), typing = el.querySelector('.typing'), notif = el.querySelector('.notif'), hh = el.querySelector('.hh'), est = el.querySelector('.estado');
      [chat, lock].forEach(x => x.classList.remove('on')); bubs.forEach(b => b.classList.remove('on')); typing.classList.remove('on'); notif.classList.remove('on'); hh.textContent = '21:47'; est.textContent = tr('en línea', 'online');
      if (reduce) { lock.classList.add('on'); notif.classList.add('on'); hh.textContent = '08:00'; return; }
      chat.classList.add('on');
      for (const b of bubs) {
        await wait(b.classList.contains('a') ? 500 : 1100); if (run.stop) return;
        if (b.classList.contains('a')) {
          est.textContent = tr('escribiendo…', 'typing…'); body.appendChild(typing); typing.classList.add('on');
          await wait(1400); if (run.stop) return;
          typing.classList.remove('on'); est.textContent = tr('en línea', 'online');
        }
        b.classList.add('on');
        if (b.querySelector('.hm').textContent === '21:48') hh.textContent = '21:48';
      }
      await wait(3500); if (run.stop) return;
      chat.classList.remove('on'); lock.classList.add('on'); hh.textContent = '08:00';
      await wait(900); if (run.stop) return;
      notif.classList.add('on');
    }
  };

  const plays = {};
  const pinMode = matchMedia('(min-width:901px) and (min-height:640px)');
  document.querySelectorAll('.ejemplos [data-ej]').forEach(el => {
    let run = { stop:false };
    const play = () => { run.stop = true; run = { stop:false }; players[el.dataset.ej](el, run); };
    const entry = plays[el.dataset.ej] = { played:false, play: () => { entry.played = true; play(); }, stop: () => { run.stop = true; } };
    el.querySelector('.replay').addEventListener('click', play);
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !entry.played && (!pinMode.matches || el.classList.contains('active'))) entry.play(); }), { threshold:.45 }).observe(el);
  });
    const keys = ['docs', 'mail', 'voz'];
    const track = document.querySelector('.ej-track');
    let current = 'docs';
    function activate(k) {
      if (k === current) return;
      current = k;
      document.querySelectorAll('.ej-tab').forEach(x => { const on = x.dataset.tab === k; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      document.querySelectorAll('.ejemplos [data-ej]').forEach(r => { const on = r.dataset.ej === k; r.classList.toggle('active', on); if (!on) plays[r.dataset.ej].stop(); });
      requestAnimationFrame(() => plays[k].play());
    }
    function range() { return track.offsetHeight - track.querySelector('.ej-pin').offsetHeight; }
    function onScroll() {
      if (!pinMode.matches) return;
      const p = Math.min(Math.max(-track.getBoundingClientRect().top / range(), 0), .999);
      activate(keys[Math.floor(p * keys.length)]);
    }
    addEventListener('scroll', onScroll, { passive:true });
    document.querySelectorAll('.lang-toggle button').forEach(b => b.addEventListener('click', () => keys.forEach(k => { if (plays[k].played && (!pinMode.matches || k === current)) plays[k].play(); })));
    document.querySelectorAll('.ej-tab').forEach(t => t.addEventListener('click', () => {
      const i = keys.indexOf(t.dataset.tab);
      if (pinMode.matches) {
        const top = track.getBoundingClientRect().top + scrollY + range() * (i + .5) / keys.length;
        scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else activate(t.dataset.tab);
    }));
  })();

  // línea del método ligada al scroll
  const fill = document.getElementById('spineFill');
  const mbody = document.querySelector('.metodo-body');
  function spine(){
    if(!mbody) return;
    const r = mbody.getBoundingClientRect();
    const p = Math.min(Math.max((innerHeight*0.75 - r.top)/(r.height), 0), 1);
    fill.style.height = (p*100)+'%';
  }
  window.addEventListener('scroll', spine, { passive:true }); spine();

  // reveal general (se repite cada vez que entra/sale de pantalla)
  const io = new IntersectionObserver((es) => es.forEach(e => {
    const cls = (e.target.classList.contains('will-reveal') || e.target.classList.contains('section-margin')) ? 'reveal-in' : 'reveal';
    e.target.classList.toggle(cls, e.isIntersecting);
  }), { threshold: 0.15 });
  document.querySelectorAll('.ficha,.articulo,.declara,.no-card').forEach(el => io.observe(el));
  document.querySelectorAll('.block h2,.section-margin,.problema-cierre,.destacado,.fundador,.no-cierre').forEach(el => { if(!el.classList.contains('destacado')) el.classList.add('will-reveal'); io.observe(el); });
