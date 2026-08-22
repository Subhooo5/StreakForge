interface SegButtonProps {
  label: string;
  activeBg: string;
  activeColor: string;
  onClick: () => void;
  flex?: string;
  fontSize?: string;
  padding?: string;
}

export default function SegButton({ label, activeBg, activeColor, onClick, flex = '1', fontSize = '13px', padding = '9px' }: SegButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{ flex, padding, borderRadius: '9px', fontSize, fontWeight: 600, background: activeBg, color: activeColor, transition: 'background .16s', fontFamily: "'Space Grotesk',system-ui,sans-serif" }}
    >
      {label}
    </button>
  );
}
