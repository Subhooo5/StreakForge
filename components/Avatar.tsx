interface AvatarProps {
  src?: string | null;
  initial: string;
  tint: string;
  size: number;
  pending?: boolean;
  alt?: string;
}

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
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
