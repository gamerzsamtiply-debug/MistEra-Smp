import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brush, Check, Loader2, Move, Undo2, Trash2, ZoomIn } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { cn } from '@project/components/lib/utils';

export interface AspectOption { label: string; value: number | null } // null = keep the picture's own shape
export const ALBUM_ASPECTS: AspectOption[] = [{ label: 'Original', value: null }, { label: '1:1', value: 1 }, { label: '4:5', value: 4 / 5 }, { label: '16:9', value: 16 / 9 }];

interface Stroke { color: string; size: number; pts: { x: number; y: number }[] }

const COLORS = ['#ffffff', '#111111', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
const MAX_BYTES = 5 * 1024 * 1024;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Small photo editor shown before an image is uploaded: move + zoom to crop, and a brush to draw on the picture.
 * Everything happens in the browser; the result is handed back as a new File.
 *  - aspect: fixed crop shape (e.g. 1 for a profile photo, 3 for a banner); `aspects` lets the person choose one.
 *  - outMax: longest side of the finished picture in pixels.
 */
export default function ImageEditor({ file, aspect = null, aspects, outMax = 1600, title = 'Edit your picture', onCancel, onDone, onSkip }: {
  file: File;
  aspect?: number | null;
  aspects?: AspectOption[];
  outMax?: number;
  title?: string;
  onCancel: () => void;
  onDone: (edited: File) => void;
  /** Lets the person upload the picture exactly as it is. */
  onSkip?: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [asp, setAsp] = useState<number | null>(aspect);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null); // image pixel shown in the middle of the frame
  const [tool, setTool] = useState<'move' | 'brush'>('move');
  const [color, setColor] = useState(COLORS[2]);
  const [brush, setBrush] = useState(8);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const strokes = useRef<Stroke[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drawing = useRef<Stroke | null>(null);
  const pinch = useRef(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { setImg(im); setCenter({ x: im.naturalWidth / 2, y: im.naturalHeight / 2 }); };
    im.onerror = () => setLoadErr(true);
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Size of the finished picture (the "frame").
  const frame = useMemo(() => {
    if (!img) return { w: 1, h: 1 };
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (asp == null) { const s = Math.min(1, outMax / Math.max(iw, ih)); return { w: Math.max(1, Math.round(iw * s)), h: Math.max(1, Math.round(ih * s)) }; }
    return asp >= 1 ? { w: outMax, h: Math.round(outMax / asp) } : { w: Math.round(outMax * asp), h: outMax };
  }, [img, asp, outMax]);

  const cover = img ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight) : 1;
  const scale = cover * zoom;

  const fit = useCallback((c: { x: number; y: number }, sc: number) => {
    if (!img) return c;
    const hw = frame.w / (2 * sc), hh = frame.h / (2 * sc);
    return { x: clamp(c.x, hw, img.naturalWidth - hw), y: clamp(c.y, hh, img.naturalHeight - hh) };
  }, [img, frame]);

  const paint = useCallback((target: HTMLCanvasElement, c: { x: number; y: number }) => {
    if (!img) return;
    const g = target.getContext('2d');
    if (!g) return;
    g.fillStyle = '#000'; g.fillRect(0, 0, target.width, target.height);
    const sw = frame.w / scale, sh = frame.h / scale;
    g.drawImage(img, c.x - sw / 2, c.y - sh / 2, sw, sh, 0, 0, frame.w, frame.h);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of strokes.current) {
      g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = s.size;
      if (s.pts.length === 1) { g.beginPath(); g.arc(s.pts[0].x, s.pts[0].y, s.size / 2, 0, Math.PI * 2); g.fill(); continue; }
      g.beginPath(); g.moveTo(s.pts[0].x, s.pts[0].y);
      for (const p of s.pts.slice(1)) g.lineTo(p.x, p.y);
      g.stroke();
    }
  }, [img, frame, scale]);

  const cur = img && center ? fit(center, scale) : null;
  useEffect(() => { if (canvas.current && cur) paint(canvas.current, cur); }, [paint, cur?.x, cur?.y, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeZoom = (z: number) => {
    const nz = clamp(z, 1, 5);
    setZoom(nz);
    if (center) setCenter(fit(center, cover * nz));
  };
  const changeAspect = (v: number | null) => { setAsp(v); setZoom(1); if (img) setCenter({ x: img.naturalWidth / 2, y: img.naturalHeight / 2 }); };

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * frame.w, y: ((e.clientY - r.top) / r.height) * frame.h };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drawing.current = null;
      return;
    }
    if (tool === 'brush') {
      const p = pos(e);
      drawing.current = { color, size: (brush * frame.w) / 400, pts: [p] };
      strokes.current.push(drawing.current);
      setTick((t) => t + 1);
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !cur) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) { // two fingers: pinch to zoom
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current > 0 && d > 0) changeZoom(zoom * (d / pinch.current));
      pinch.current = d;
      return;
    }
    if (tool === 'brush' && drawing.current) { drawing.current.pts.push(pos(e)); setTick((t) => t + 1); return; }
    if (tool === 'move') {
      const r = canvas.current!.getBoundingClientRect();
      const k = frame.w / r.width / scale;
      setCenter(fit({ x: cur.x - (e.clientX - prev.x) * k, y: cur.y - (e.clientY - prev.y) * k }, scale));
    }
  };
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
    drawing.current = null;
  };
  const onWheel = (e: React.WheelEvent) => changeZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));

  const undo = () => { strokes.current.pop(); setTick((t) => t + 1); };
  const clear = () => { strokes.current = []; setTick((t) => t + 1); };

  const apply = async () => {
    if (!img || !cur) return;
    setBusy(true);
    try {
      const out = document.createElement('canvas');
      out.width = frame.w; out.height = frame.h;
      paint(out, cur);
      const png = file.type === 'image/png';
      const type = png ? 'image/png' : 'image/jpeg';
      let blob: Blob | null = null;
      for (const q of png ? [1] : [0.92, 0.82, 0.7, 0.55]) {
        blob = await new Promise<Blob | null>((res) => out.toBlob(res, type, q));
        if (blob && blob.size <= MAX_BYTES) break;
      }
      if (!blob) throw new Error('encode');
      onDone(new File([blob], `${file.name.replace(/\.\w+$/, '') || 'image'}${png ? '.png' : '.jpg'}`, { type }));
    } catch {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Drag to move, pinch or use the slider to zoom, or switch to the brush to draw.</DialogDescription></DialogHeader>
        {loadErr ? <p className="text-sm text-destructive">This picture could not be opened. Please choose another one.</p> : !img ? (
          <div className="grid h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <canvas
              ref={canvas} width={frame.w} height={frame.h}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}
              className={cn('mx-auto block max-h-[46vh] max-w-full touch-none rounded-lg bg-black', tool === 'brush' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing')}
            />
            {aspects && aspects.length > 1 && (
              <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label="Crop shape">
                {aspects.map((a) => <Button key={a.label} type="button" size="sm" variant={asp === a.value ? 'default' : 'secondary'} onClick={() => changeAspect(a.value)}>{a.label}</Button>)}
              </div>
            )}
            <div className="flex items-center justify-center gap-2" role="group" aria-label="Tool">
              <Button type="button" size="sm" variant={tool === 'move' ? 'default' : 'secondary'} onClick={() => setTool('move')}><Move className="mr-1.5 h-4 w-4" />Move & crop</Button>
              <Button type="button" size="sm" variant={tool === 'brush' ? 'default' : 'secondary'} onClick={() => setTool('brush')}><Brush className="mr-1.5 h-4 w-4" />Brush</Button>
            </div>
            <label className="flex items-center gap-3 text-sm"><ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="sr-only">Zoom</span>
              <input type="range" min={1} max={5} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-primary" />
            </label>
            {tool === 'brush' && (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn('h-7 w-7 rounded-full border border-border transition', color === c && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} style={{ background: c }} />)}
                </div>
                <label className="flex items-center gap-3 text-sm"><span className="w-14 shrink-0 text-muted-foreground">Size</span><input type="range" min={2} max={40} value={brush} onChange={(e) => setBrush(Number(e.target.value))} className="h-2 w-full cursor-pointer accent-primary" /></label>
                <div className="flex justify-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={undo} disabled={!strokes.current.length}><Undo2 className="mr-1.5 h-4 w-4" />Undo</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={clear} disabled={!strokes.current.length}><Trash2 className="mr-1.5 h-4 w-4" />Clear</Button>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          {onSkip && <Button type="button" variant="ghost" onClick={onSkip} disabled={busy}>Use original</Button>}
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={apply} disabled={busy || !img}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
