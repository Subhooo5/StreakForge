export function optimizePathData(d: string): string {
  let optimized = d.replace(/,/g, ' ');

  optimized = optimized.replace(/\s+/g, ' ');

  optimized = optimized.replace(/\s*([mlhvcstaz])\s*/gi, '$1');

  optimized = optimized.trim();

  optimized = optimized.replace(/[-+]?\d+\.\d+/g, (m) => {
    const val = parseFloat(m);
    let s = val.toFixed(2);
    if (s.indexOf('.') !== -1) {
      s = s.replace(/0+$/, '');
      s = s.replace(/\.$/, '');
    }
    s = s.replace(/^(-?)0\./, '$1.');
    return s;
  });

  optimized = optimized.replace(/\s+(?=-)/g, '');

  return optimized;
}

export function minifyCSS(css: string): string {
  let min = css.replace(/\/\*[\s\S]*?\*\//g, '');
  min = min.replace(/\s+/g, ' ');
  min = min.replace(/\s*([{};])\s*/g, '$1');
  return min.trim();
}

export function stripComments(html: string): string {
  let result = '';
  let i = 0;
  while (i < html.length) {
    if (html.slice(i, i + 4) === '<!--') {
      const endIdx = html.indexOf('-->', i + 4);
      if (endIdx !== -1) {
        i = endIdx + 3;
        continue;
      }
    }
    result += html[i];
    i++;
  }
  return result;
}

export function optimizeSVG(svg: string): string {
  if (!svg) return '';

  const styleBlocks: string[] = [];
  const textBlocks: string[] = [];
  const placeholderPrefix = `sf-placeholder-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

  let processed = svg.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, content) => {
    const minifiedCss = minifyCSS(content);
    styleBlocks.push(`<style${attrs}>${minifiedCss}</style>`);
    return `<${placeholderPrefix}-style-${styleBlocks.length - 1}/>`;
  });

  processed = processed.replace(
    /<(text|desc|title)([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag, attrs, content) => {
      textBlocks.push(`<${tag}${attrs}>${content}</${tag}>`);
      return `<${placeholderPrefix}-text-${textBlocks.length - 1}/>`;
    }
  );

  processed = stripComments(processed);

  processed = processed.replace(/[-+]?\d+\.\d{3,}\b/g, (m) => {
    const val = parseFloat(m);
    let s = val.toFixed(2);
    if (s.indexOf('.') !== -1) {
      s = s.replace(/0+$/, '');
      s = s.replace(/\.$/, '');
    }
    s = s.replace(/^(-?)0\./, '$1.');
    return s;
  });

  processed = processed.replace(/d="([^"]+)"/g, (match, p1) => `d="${optimizePathData(p1)}"`);
  processed = processed.replace(/d='([^']+)'/g, (match, p1) => `d='${optimizePathData(p1)}'`);

  processed = processed.replace(/\s+/g, ' ');

  processed = processed.replace(/>\s+</g, '><');

  processed = processed.replace(/\s*(?=\/>|>)/g, '');

  processed = processed.replace(/<\s+/g, '<');

  styleBlocks.forEach((block, index) => {
    const placeholder = `<${placeholderPrefix}-style-${index}/>`;
    processed = processed.replace(placeholder, block);
  });

  textBlocks.forEach((block, index) => {
    const placeholder = `<${placeholderPrefix}-text-${index}/>`;
    processed = processed.replace(placeholder, block);
  });

  return processed.trim();
}
