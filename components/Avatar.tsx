interface AvatarProps {
  /** GitHub avatar URL, already present in the same payload as the username. */
  src?: string | null;
  /** Fallback letter, shown while there is no image to paint. */
  initial: string;
  /** Deterministic gradient behind the image. */
  tint: string;
  size: number;
  /** `true` while the batch this row belongs to is still resolving. */
  pending?: boolean;
  alt?: string;
}

/**
 * Contributor avatar.
 *
 * Rendered as an eager `<img>` rather than a lazy one or a CSS background: both
 * of those defer the request until after layout, which is what made avatars
 * trickle in behind usernames that had already painted. The URL arrives in the
 * same payload as the username, so the request can start as soon as the row
 * exists, and `fetchPriority="high"` keeps it ahead of decorative work.
 *
 * `pending` renders a neutral skeleton circle — never a broken-image icon —
 * for the window before the batch resolves.
 */
export default function Avatar({ src, initial, tint, size, pending, alt = '' }: AvatarProps) {
  const box: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    flex: 'none',
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700,
    fontSize: `${Math.max(11, Math.round(size * 0.38))}px`,
    color: '#fff',
  };

  if (pending) {
    return (
      <div
        aria-hidden="true"
        style={{
          ...box,
          background: 'color-mix(in srgb,var(--soft) 18%,transparent)',
          animation: 'sf-pulse 1.4s ease-in-out infinite',
        }}
      />
    );
  }

  return (
    <div style={{ ...box, background: tint }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            // Drop back to the tinted initial rather than a broken-image glyph.
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
