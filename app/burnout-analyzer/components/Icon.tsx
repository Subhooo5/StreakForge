export const ICO_PATHS: Record<string, string> = {
  bus: 'M3 6.5 8 2l5 4.5M4 6v6h8V6M6.5 12V9h3v3',
  conc: 'M8 2v6l4 2M8 8 4 10',
  clock: 'M8 2.5V8l3 2',
  drop: 'M8 1c1 2.5-1 3.5-1 5.5C7 8 8 8.6 8 8.6S9.2 7.8 9.5 6c1.3 1 2.5 2.6 2.5 4.6A4 4 0 0 1 4 10.6C4 7 7 5 8 1Z',
  shield: 'M8 1.6 13 4v4c0 3.2-2.2 5.6-5 6.4C5.2 13.6 3 11.2 3 8V4l5-2.4Z',
  rotate: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3',
  users: 'M5 6a2 2 0 1 0 0-.01M11 6a2 2 0 1 0 0-.01M2 13a3.5 3.5 0 0 1 6-2M8 11a3.5 3.5 0 0 1 6 2',
  calendar: 'M3 3h10v10H3zM3 6h10M6 1.5v3M10 1.5v3',
  spark: 'M8 1.6 9.4 6 14 7.4 9.4 8.8 8 13.4 6.6 8.8 2 7.4 6.6 6 8 1.6Z',
  bot: 'M5.5 6h5A1.5 1.5 0 0 1 12 7.5v3A1.5 1.5 0 0 1 10.5 12h-5A1.5 1.5 0 0 1 4 10.5v-3A1.5 1.5 0 0 1 5.5 6ZM8 3.5V6M6.3 9v.01M9.7 9v.01M2 8.5v2M14 8.5v2',
};

interface IconProps {
  name: string;
  color?: string;
  size?: number;
}

export default function Icon({ name, color, size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color || 'currentColor'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICO_PATHS[name] || ICO_PATHS.shield} />
    </svg>
  );
}
