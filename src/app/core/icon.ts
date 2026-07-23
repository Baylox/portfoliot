import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'github'
  | 'linkedin'
  | 'mail'
  | 'external'
  | 'folder'
  | 'server'
  | 'layout'
  | 'database'
  | 'compass'
  | 'shield'
  | 'check'
  | 'grid'
  | 'disc'
  | 'sound-on'
  | 'sound-off'
  | 'arrow-down';

/**
 * Icônes SVG inline (traits type Feather) — aucune dépendance externe.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--icon-size.px]': 'size()' },
  styles: `
    :host {
      display: inline-flex;
      width: var(--icon-size);
      height: var(--icon-size);
      flex-shrink: 0;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  template: `
    @switch (name()) {
      @case ('github') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"
          />
        </svg>
      }
      @case ('linkedin') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      }
      @case ('mail') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      }
      @case ('external') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
        </svg>
      }
      @case ('folder') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
          />
        </svg>
      }
      @case ('server') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <path d="M6 6h.01M6 18h.01" />
        </svg>
      }
      @case ('layout') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      }
      @case ('database') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14a9 3 0 0 0 18 0V5" />
          <path d="M3 12a9 3 0 0 0 18 0" />
        </svg>
      }
      @case ('compass') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m16.2 7.8-2 6.3-6.4 2.1 2-6.3z" />
        </svg>
      }
      @case ('grid') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      }
      @case ('shield') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10Z" />
        </svg>
      }
      @case ('check') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      }
      @case ('disc') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      }
      @case ('sound-on') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
        </svg>
      }
      @case ('sound-off') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" />
          <path d="m16 9 5 5m0-5-5 5" />
        </svg>
      }
      @case ('arrow-down') {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14m7-7-7 7-7-7" />
        </svg>
      }
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20, { transform: Number });
}
