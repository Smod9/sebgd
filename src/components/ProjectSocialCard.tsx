export function ProjectSocialCard({ title, description, tags }: { title: string; description: string; tags: string[] }) {
  const voice = /articulation|speak/i.test(title);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", color: "#1d1d1f", padding: "56px 64px", fontFamily: "sans-serif", border: "1px solid #e5e5ea" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#6e6e73", fontSize: 20 }}>
        <span>Sebastien Gouin-Davis</span><span>{tags.slice(0, 2).join(" / ")}</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
          <div style={{ display: "flex", fontSize: title.length > 32 ? 54 : 72, lineHeight: 1.08, fontWeight: 700, letterSpacing: "-3px" }}>{title.slice(0, 90)}</div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.5, marginTop: 24, color: "#6e6e73" }}>{description.slice(0, 160)}</div>
        </div>
        <svg width="210" height="210" viewBox="0 0 210 210" fill="none">
          {voice ? [40, 80, 130, 190, 140, 90, 45].map((height, index) => <rect key={index} x={index * 29 + 4} y={(210 - height) / 2} width="10" height={height} rx="5" fill="#1d1d1f" />) : <g>
            <path d="M30 30H105V105H180M30 180H105V105" stroke="#1d1d1f" strokeWidth="4" />
            <circle cx="30" cy="30" r="13" fill="white" stroke="#1d1d1f" strokeWidth="4" />
            <circle cx="30" cy="180" r="13" fill="white" stroke="#1d1d1f" strokeWidth="4" />
            <circle cx="180" cy="105" r="13" fill="white" stroke="#1d1d1f" strokeWidth="4" />
            <circle cx="105" cy="105" r="8" fill="#1d1d1f" />
          </g>}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#6e6e73", borderTop: "1px solid #e5e5ea", paddingTop: 20 }}><span>Projects & experiments</span><span>sebgd.com</span></div>
    </div>
  );
}
