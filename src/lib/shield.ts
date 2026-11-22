// Light "view-source / DevTools" deterrent for the public site (production builds only).
//
// HONEST LIMIT: a website's front-end code is always delivered to the visitor's browser, so nobody can make it
// impossible to read - this only stops casual snooping (right-click, F12, Ctrl+U, Ctrl+Shift+I, opening DevTools
// on a desktop). What actually protects the site is that no secret ever lives in the front-end: the service-role
// key, admin checks and login information all stay on the server (the /api functions), and the API refuses
// everything the signed-in user is not allowed to see.
const BLOCKED_CTRL = new Set(['u', 's', 'p']); // view source, save, print
const BLOCKED_CTRL_SHIFT = new Set(['i', 'j', 'c', 'k']); // DevTools panels

export function installShield(onDevtools: (open: boolean) => void): () => void {
  const onContext = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return; // keep paste / spell-check in text fields
    e.preventDefault();
  };
  const onKey = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F12' || (mod && e.shiftKey && BLOCKED_CTRL_SHIFT.has(k)) || (mod && !e.shiftKey && BLOCKED_CTRL.has(k)) || (e.metaKey && e.altKey && ['i', 'j', 'u'].includes(k))) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onDrag = (e: DragEvent) => { if ((e.target as HTMLElement | null)?.tagName === 'IMG') e.preventDefault(); };

  // Docked DevTools make the window's outer size larger than the page's inner size. Phones/tablets are skipped.
  const desktop = () => !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && window.matchMedia('(pointer: fine)').matches;
  let last = false;
  const check = () => {
    if (!desktop()) return;
    const open = window.outerWidth - window.innerWidth > 200 || window.outerHeight - window.innerHeight > 220;
    if (open !== last) { last = open; onDevtools(open); }
  };
  const timer = window.setInterval(check, 1200);
  window.addEventListener('resize', check);
  document.addEventListener('contextmenu', onContext);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('dragstart', onDrag);
  check();
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('resize', check);
    document.removeEventListener('contextmenu', onContext);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('dragstart', onDrag);
  };
}
