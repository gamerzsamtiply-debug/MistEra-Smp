/** A random, anonymous id kept in this browser so one person is counted as one visitor. */
export function visitorId(): string {
  try {
    let v = localStorage.getItem('mistera-vid');
    if (!v || !/^[A-Za-z0-9_-]{8,64}$/.test(v)) {
      v = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/[^A-Za-z0-9_-]/g, '');
      localStorage.setItem('mistera-vid', v);
    }
    return v;
  } catch {
    return `t${Math.random().toString(36).slice(2, 14)}`;
  }
}
