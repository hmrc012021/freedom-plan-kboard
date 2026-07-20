// Accent color is a PERSONAL, per-device preference -- stored only in this
// browser's localStorage, never written to Supabase. It overrides the
// signature "K" accent used for nav, badges, and highlights throughout the
// app; the underlying hit/amber status colors are untouched.
//
// The storage/apply mechanism itself lives in @freedom-plan/ui so every
// Freedom Plan app shares the exact same implementation; only the presets
// and CSS variable name below are K-Board-specific.

import { createAccentPreference, type AccentPreset } from '@freedom-plan/ui';

export type { AccentPreset };

// presets[0] is the fallback whenever nothing is stored yet, so it must
// match index.css's --color-k default (#22C55E) -- otherwise a first-time
// visitor's inline style override (applied on every boot in main.tsx)
// silently fights the CSS default and nothing looks like it changed.
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'green', label: 'Green (original)', swatch: '#22C55E', vars: { 'color-k': '#22C55E' } },
  { id: 'cyan', label: 'Cyan', swatch: '#22D3EE', vars: { 'color-k': '#22D3EE' } },
  { id: 'amber', label: 'Amber', swatch: '#F59E0B', vars: { 'color-k': '#F59E0B' } },
  { id: 'pink', label: 'Pink', swatch: '#EC4899', vars: { 'color-k': '#EC4899' } },
  { id: 'violet', label: 'Violet', swatch: '#A78BFA', vars: { 'color-k': '#A78BFA' } },
  { id: 'red', label: 'Red', swatch: '#F87171', vars: { 'color-k': '#F87171' } },
];

const { getStoredAccentId, applyAccent } = createAccentPreference({
  storageKey: 'kboard-accent',
  presets: ACCENT_PRESETS,
});

export { getStoredAccentId, applyAccent };
