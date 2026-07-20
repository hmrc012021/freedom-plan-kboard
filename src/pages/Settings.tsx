import { useState } from 'react';
import { Check } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ACCENT_PRESETS, applyAccent, getStoredAccentId } from '@/lib/accentPreference';

export default function Settings() {
  const [accentId, setAccentId] = useState(getStoredAccentId());

  function handleAccentPick(id: string) {
    applyAccent(id);
    setAccentId(id);
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-md rounded-md border border-line bg-bg-elevated p-4">
        <h2 className="mb-1 font-display text-sm font-semibold text-text">Appearance</h2>
        <p className="mb-3.5 text-[12.5px] text-text-muted">
          Accent color is personal to this device — it's saved in your browser only, not shared with
          anyone else who has access to K-Board.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button key={preset.id} onClick={() => handleAccentPick(preset.id)} title={preset.label} className="flex flex-col items-center gap-1.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-bg-elevated transition-all"
                style={{
                  background: preset.swatch,
                  ['--tw-ring-color' as string]: accentId === preset.id ? preset.swatch : 'transparent',
                }}
              >
                {accentId === preset.id && <Check size={15} className="text-bg drop-shadow" />}
              </span>
              <span className="text-[10.5px] text-text-muted">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
