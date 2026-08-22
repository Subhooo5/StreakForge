"use client";

import { useState } from "react";

export type HoverProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  base?: React.CSSProperties;
  hover?: React.CSSProperties;
  href?: string;
  target?: string;
  rel?: string;
  title?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Hover({ as = "div", base, hover, children, ...rest }: HoverProps) {
  const [h, setH] = useState(false);
  const Tag = as as React.ElementType;
  return (
    <Tag {...rest} style={{ ...base, ...(h ? hover : undefined) }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {children}
    </Tag>
  );
}

export default Hover;
