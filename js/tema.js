(function () {
    let t = null;
    try { t = localStorage.getItem('niai-theme'); } catch (e) {}
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
