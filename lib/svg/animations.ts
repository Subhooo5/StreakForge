const TOWER_BASE_Y = 10;

export function getTowerAnimationCSS(
  entrance: 'rise' | 'fade' | 'slide' | 'wave' | 'bounce' | 'none' = 'rise',
  scale = 1.0
): string {
  if (entrance === 'none') {
    return `
      .sf-tower { transform: scaleY(1); opacity: 1; }
    `;
  }

  let baseStyles = '';
  let keyframes = '';

  if (entrance === 'rise') {
    const baseY = Math.round(TOWER_BASE_Y * scale * 100) / 100;
    baseStyles = `
      transform: scaleY(0);
      transform-origin: 0 ${baseY}px;
      animation: grow-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;
    keyframes = `
      @keyframes grow-up {
        from { transform: scaleY(0); }
        to   { transform: scaleY(1); }
      }
    `;
  } else if (entrance === 'fade') {
    baseStyles = `
      opacity: 0;
      animation: fade-in 1.2s ease-out forwards;
    `;
    keyframes = `
      @keyframes fade-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `;
  } else if (entrance === 'slide') {
    const slideOffset = Math.round(-20 * scale * 100) / 100;
    baseStyles = `
      opacity: 0;
      transform: translateY(${slideOffset}px);
      animation: slide-down 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;
    keyframes = `
      @keyframes slide-down {
        from { opacity: 0; transform: translateY(${slideOffset}px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
  } else if (entrance === 'wave') {
    const baseY = Math.round(TOWER_BASE_Y * scale * 100) / 100;
    baseStyles = `
      transform: scaleY(0);
      transform-origin: 0 ${baseY}px;
      animation: wave-up 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;
    keyframes = `
      @keyframes wave-up {
        0%   { transform: scaleY(0); }
        50%  { transform: scaleY(1.15); }
        100% { transform: scaleY(1); }
      }
    `;
  } else if (entrance === 'bounce') {
    const slideOffset = Math.round(-40 * scale * 100) / 100;
    const bounce1 = Math.round(-10 * scale * 100) / 100;
    const bounce2 = Math.round(-4 * scale * 100) / 100;
    baseStyles = `
      opacity: 0;
      transform: translateY(${slideOffset}px);
      animation: bounce-in 1.2s cubic-bezier(0.28, 0.84, 0.42, 1) forwards;
    `;
    keyframes = `
      @keyframes bounce-in {
        0%   { opacity: 0; transform: translateY(${slideOffset}px); }
        50%  { opacity: 1; transform: translateY(0); }
        70%  { transform: translateY(${bounce1}px); }
        85%  { transform: translateY(0); }
        92%  { transform: translateY(${bounce2}px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `;
  }

  return `
    .sf-tower {
      ${baseStyles}
    }
    ${keyframes}
    @media (prefers-reduced-motion: reduce) {
      .sf-tower { animation: none !important; transform: scaleY(1) translateY(0) !important; opacity: 1 !important; }
    }
  `;
}
