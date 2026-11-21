// Round avatar with the person's initials. The colour is picked from the
// name, so the same person always gets the same colour.

const COLORS = ["#4f46e5", "#0891b2", "#db2777", "#ea580c", "#16a34a", "#7c3aed", "#0d9488"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorFor(name),
      }}
    >
      {initials(name)}
    </span>
  );
}

// "Unassigned" shows a dashed empty circle instead of initials
export function Person({ name, empty = false }: { name: string; empty?: boolean }) {
  return (
    <span className="person">
      {empty ? <span className="avatar avatar-empty" /> : <Avatar name={name} size={24} />}
      <span className={empty ? "text-muted" : ""}>{name}</span>
    </span>
  );
}

export default Avatar;
