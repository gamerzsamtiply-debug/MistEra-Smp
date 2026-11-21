import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { setSfxEnabled, sfx, sfxEnabled } from '../lib/sfx';

/** Turns the soft interface sounds on or off (remembered in this browser). */
export default function SoundToggle() {
  const [on, setOn] = useState(sfxEnabled());
  const toggle = () => { const next = !on; setSfxEnabled(next); setOn(next); if (next) sfx.pop(); };
  return (
    <Button size="icon" variant="ghost" onClick={toggle} aria-label={on ? 'Turn sounds off' : 'Turn sounds on'} aria-pressed={on} title={on ? 'Sounds on' : 'Sounds off'}>
      {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </Button>
  );
}
