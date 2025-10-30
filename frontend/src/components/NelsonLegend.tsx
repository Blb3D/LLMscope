const RULES = [
  { id: "R1", text: "1 point beyond 3σ" },
  { id: "R2", text: "9 points on same side of mean" },
  { id: "R3", text: "6 points increasing/decreasing" },
];

export default function NelsonLegend() {
  return (
    <div style={{ fontSize: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Nelson Rules</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {RULES.map(r => (
          <li key={r.id}>
            <span style={{ display: "inline-block", width: 28, fontFamily: "monospace" }}>{r.id}</span>
            {" — "}{r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
