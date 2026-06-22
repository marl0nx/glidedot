import { watchEffect, toValue, type MaybeRefOrGetter } from 'vue'

export function useThemeBackground(themeRef: MaybeRefOrGetter<string>, customBgRef: MaybeRefOrGetter<string>) {
  if (import.meta.server) return

  watchEffect(() => {
    const theme = toValue(themeRef) || 'dark'
    const customBg = toValue(customBgRef) || '#111111'

    let el = document.getElementById('glide-custom-bg')
    if (!el) {
      el = document.createElement('style')
      el.id = 'glide-custom-bg'
      document.head.appendChild(el)
    }

    if (theme === 'dark') {
      el.innerHTML = ''
      return
    }

    let css = ''
    if (theme === 'light') {
      css = `
        :root, :host {
          --color-white: #09090b;
          --color-black: #ffffff;
          --color-neutral-950: #ffffff;
          --color-neutral-900: #f5f5f5;
          --color-neutral-800: #e5e5e5;
          --color-neutral-700: #d4d4d4;
          --color-neutral-600: #a3a3a3;
          --color-neutral-500: #737373;
          --color-neutral-400: #525252;
          --color-neutral-300: #404040;
          --color-neutral-200: #262626;
          --color-neutral-100: #171717;
          --color-neutral-50: #0a0a0a;

          --color-zinc-950: #ffffff;
          --color-zinc-900: #f5f5f5;
          --color-zinc-800: #e5e5e5;
          --color-zinc-700: #d4d4d4;
          --color-zinc-600: #a3a3a3;
          --color-zinc-500: #737373;
          --color-zinc-400: #525252;
          --color-zinc-300: #404040;
          --color-zinc-200: #262626;
          --color-zinc-100: #171717;
          --color-zinc-50: #0a0a0a;

          --ui-bg: var(--color-zinc-950);
          --ui-bg-elevated: var(--color-zinc-900);
          --ui-bg-accent: var(--color-zinc-800);
          --ui-bg-inverted: var(--color-zinc-50);
          --ui-text: var(--color-zinc-100);
          --ui-text-muted: var(--color-zinc-400);
          --ui-text-highlighted: var(--color-white);
          --ui-text-inverted: var(--color-black);
          --ui-border: var(--color-zinc-800);
          --ui-border-elevated: var(--color-zinc-700);

          color-scheme: light;
        }
      `
    } else if (theme === 'coffee') {
      css = `
        :root, :host {
          --color-white: #2c2012;
          --color-black: #fcf9f2;
          --color-neutral-950: #fcf9f2;
          --color-neutral-900: #f3ece1;
          --color-neutral-800: #e5dac7;
          --color-neutral-700: #d3c4ac;
          --color-neutral-600: #b9a589;
          --color-neutral-500: #9e8768;
          --color-neutral-400: #826b4c;
          --color-neutral-300: #6a5539;
          --color-neutral-200: #423220;
          --color-neutral-100: #2c2012;
          --color-neutral-50: #1a1209;

          --color-zinc-950: #fcf9f2;
          --color-zinc-900: #f3ece1;
          --color-zinc-800: #e5dac7;
          --color-zinc-700: #d3c4ac;
          --color-zinc-600: #b9a589;
          --color-zinc-500: #9e8768;
          --color-zinc-400: #826b4c;
          --color-zinc-300: #6a5539;
          --color-zinc-200: #423220;
          --color-zinc-100: #2c2012;
          --color-zinc-50: #1a1209;

          --ui-bg: var(--color-zinc-950);
          --ui-bg-elevated: var(--color-zinc-900);
          --ui-bg-accent: var(--color-zinc-800);
          --ui-bg-inverted: var(--color-zinc-50);
          --ui-text: var(--color-zinc-100);
          --ui-text-muted: var(--color-zinc-400);
          --ui-text-highlighted: var(--color-white);
          --ui-text-inverted: var(--color-black);
          --ui-border: var(--color-zinc-800);
          --ui-border-elevated: var(--color-zinc-700);

          color-scheme: light;
        }
      `
    } else if (theme === 'custom') {
      const hex = customBg.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) || 0
      const g = parseInt(hex.substr(2, 2), 16) || 0
      const b = parseInt(hex.substr(4, 2), 16) || 0
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      const isLight = luminance > 0.5
      
      if (isLight) {
          css = `
            :root, :host {
              --color-white: #111111;
              --color-black: #ffffff;
              --color-neutral-950: color-mix(in srgb, ${customBg} 50%, white);
              --color-neutral-900: ${customBg};
              --color-neutral-800: color-mix(in srgb, ${customBg} 95%, black);
              --color-neutral-700: color-mix(in srgb, ${customBg} 85%, black);
              --color-neutral-600: color-mix(in srgb, ${customBg} 75%, black);
              --color-neutral-500: color-mix(in srgb, ${customBg} 60%, black);
              --color-neutral-400: color-mix(in srgb, ${customBg} 50%, black);
              --color-neutral-300: color-mix(in srgb, ${customBg} 40%, black);
              --color-neutral-200: color-mix(in srgb, ${customBg} 30%, black);
              --color-neutral-100: color-mix(in srgb, ${customBg} 20%, black);
              --color-neutral-50: color-mix(in srgb, ${customBg} 10%, black);

              --color-zinc-950: color-mix(in srgb, ${customBg} 50%, white);
              --color-zinc-900: ${customBg};
              --color-zinc-800: color-mix(in srgb, ${customBg} 95%, black);
              --color-zinc-700: color-mix(in srgb, ${customBg} 85%, black);
              --color-zinc-600: color-mix(in srgb, ${customBg} 75%, black);
              --color-zinc-500: color-mix(in srgb, ${customBg} 60%, black);
              --color-zinc-400: color-mix(in srgb, ${customBg} 50%, black);
              --color-zinc-300: color-mix(in srgb, ${customBg} 40%, black);
              --color-zinc-200: color-mix(in srgb, ${customBg} 30%, black);
              --color-zinc-100: color-mix(in srgb, ${customBg} 20%, black);
              --color-zinc-50: color-mix(in srgb, ${customBg} 10%, black);

              --ui-bg: var(--color-zinc-900);
              --ui-bg-elevated: var(--color-zinc-800);
              --ui-bg-accent: var(--color-zinc-700);
              --ui-bg-inverted: var(--color-zinc-50);
              --ui-text: var(--color-zinc-100);
              --ui-text-muted: var(--color-zinc-400);
              --ui-text-highlighted: var(--color-white);
              --ui-text-inverted: var(--color-black);
              --ui-border: var(--color-zinc-800);
              --ui-border-elevated: var(--color-zinc-700);

              color-scheme: light;
            }
          `
      } else {
          css = `
            :root, :host {
              --color-white: #ffffff;
              --color-black: #000000;
              --color-neutral-950: color-mix(in srgb, ${customBg} 50%, black);
              --color-neutral-900: ${customBg};
              --color-neutral-800: color-mix(in srgb, ${customBg} 90%, white);
              --color-neutral-700: color-mix(in srgb, ${customBg} 80%, white);
              --color-neutral-600: color-mix(in srgb, ${customBg} 70%, white);
              --color-neutral-500: color-mix(in srgb, ${customBg} 60%, white);
              --color-neutral-400: color-mix(in srgb, ${customBg} 50%, white);
              --color-neutral-300: color-mix(in srgb, ${customBg} 40%, white);
              --color-neutral-200: color-mix(in srgb, ${customBg} 30%, white);
              --color-neutral-100: color-mix(in srgb, ${customBg} 20%, white);
              --color-neutral-50: color-mix(in srgb, ${customBg} 10%, white);

              --color-zinc-950: color-mix(in srgb, ${customBg} 50%, black);
              --color-zinc-900: ${customBg};
              --color-zinc-800: color-mix(in srgb, ${customBg} 90%, white);
              --color-zinc-700: color-mix(in srgb, ${customBg} 80%, white);
              --color-zinc-600: color-mix(in srgb, ${customBg} 70%, white);
              --color-zinc-500: color-mix(in srgb, ${customBg} 60%, white);
              --color-zinc-400: color-mix(in srgb, ${customBg} 50%, white);
              --color-zinc-300: color-mix(in srgb, ${customBg} 40%, white);
              --color-zinc-200: color-mix(in srgb, ${customBg} 30%, white);
              --color-zinc-100: color-mix(in srgb, ${customBg} 20%, white);
              --color-zinc-50: color-mix(in srgb, ${customBg} 10%, white);

              --ui-bg: var(--color-zinc-900);
              --ui-bg-elevated: var(--color-zinc-800);
              --ui-bg-accent: var(--color-zinc-700);
              --ui-bg-inverted: var(--color-zinc-50);
              --ui-text: var(--color-zinc-100);
              --ui-text-muted: var(--color-zinc-400);
              --ui-text-highlighted: var(--color-white);
              --ui-text-inverted: var(--color-black);
              --ui-border: var(--color-zinc-800);
              --ui-border-elevated: var(--color-zinc-700);

              color-scheme: dark;
            }
          `
      }
    }

    el.innerHTML = css
  })
}
