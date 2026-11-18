// Applies the saved theme before the page paints (no flash). Dark is the default.
(function () {
  try {
    var t = localStorage.getItem('mistera-theme');
    var light = t === 'light';
    var el = document.documentElement;
    el.classList.toggle('dark', !light);
    el.style.colorScheme = light ? 'light' : 'dark';
  } catch (e) { document.documentElement.classList.add('dark'); }
})();
