import { useState } from "react";

const LEGAL_FRAMEWORK = `
Tu es un expert en droit du commerce électronique français. Analyse la description du site e-commerce fournie et évalue sa conformité légale selon le droit français.

Évalue les 6 catégories suivantes et pour chaque point, donne : "conforme", "non_conforme", ou "inconnu" (si l'information n'est pas disponible dans la description).

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "score_global": <nombre entre 0 et 100>,
  "resume": "<2-3 phrases de synthèse>",
  "categories": [
    {
      "id": "mentions_legales",
      "titre": "Mentions légales (LCEN 2004)",
      "description": "Article 6 III LCEN",
      "points": [
        { "label": "Nom/dénomination sociale et adresse", "statut": "conforme|non_conforme|inconnu", "detail": "..." },
        { "label": "Numéro de téléphone et email", "statut": "...", "detail": "..." },
        { "label": "Directeur de publication", "statut": "...", "detail": "..." },
        { "label": "Hébergeur (nom, adresse, téléphone)", "statut": "...", "detail": "..." },
        { "label": "Capital social et n° RCS (personnes morales)", "statut": "...", "detail": "..." }
      ]
    },
    {
      "id": "info_precontractuelle",
      "titre": "Information précontractuelle (L111-1 C.conso)",
      "description": "Obligation d'info avant conclusion du contrat",
      "points": [
        { "label": "Caractéristiques essentielles des produits/services", "statut": "...", "detail": "..." },
        { "label": "Prix TTC affiché clairement", "statut": "...", "detail": "..." },
        { "label": "Délai ou date de livraison", "statut": "...", "detail": "..." },
        { "label": "Coordonnées complètes du vendeur", "statut": "...", "detail": "..." },
        { "label": "Information sur les garanties légales", "statut": "...", "detail": "..." },
        { "label": "Médiateur de la consommation mentionné", "statut": "...", "detail": "..." }
      ]
    },
    {
      "id": "cgv",
      "titre": "CGV & Conditions contractuelles (R111-1)",
      "description": "Conditions Générales de Vente accessibles",
      "points": [
        { "label": "CGV accessibles avant conclusion du contrat", "statut": "...", "detail": "..." },
        { "label": "Modalités de paiement précisées", "statut": "...", "detail": "..." },
        { "label": "Modalités de livraison et d'exécution", "statut": "...", "detail": "..." },
        { "label": "Traitement des réclamations", "statut": "...", "detail": "..." },
        { "label": "Archivage des contrats ≥120€ pendant 10 ans (L213-1)", "statut": "...", "detail": "..." }
      ]
    },
    {
      "id": "retractation",
      "titre": "Droit de rétractation (L221-18 C.conso)",
      "description": "14 jours calendaires pour vente à distance",
      "points": [
        { "label": "Mention du délai de rétractation de 14 jours", "statut": "...", "detail": "..." },
        { "label": "Formulaire de rétractation fourni (Annexe R221-1)", "statut": "...", "detail": "..." },
        { "label": "Point de départ du délai précisé (réception du bien)", "statut": "...", "detail": "..." },
        { "label": "Frais de retour à la charge du consommateur précisés", "statut": "...", "detail": "..." },
        { "label": "Exceptions au droit de rétractation mentionnées (L221-28)", "statut": "...", "detail": "..." },
        { "label": "Remboursement sous 14 jours garanti", "statut": "...", "detail": "..." }
      ]
    },
    {
      "id": "garanties",
      "titre": "Garanties légales (L217-3 & art. 1641 C.civ.)",
      "description": "Garantie de conformité et vices cachés",
      "points": [
        { "label": "Garantie légale de conformité mentionnée (2 ans)", "statut": "...", "detail": "..." },
        { "label": "Garantie des vices cachés mentionnée (art. 1641)", "statut": "...", "detail": "..." },
        { "label": "Extension de garantie de 6 mois après réparation (L217-13)", "statut": "...", "detail": "..." },
        { "label": "Garantie commerciale en écrit si proposée (L217-22)", "statut": "...", "detail": "..." }
      ]
    },
    {
      "id": "donnees_personnelles",
      "titre": "Protection des données (RGPD / CNIL)",
      "description": "Loi Informatique et Libertés 1978 + RGPD",
      "points": [
        { "label": "Politique de confidentialité accessible", "statut": "...", "detail": "..." },
        { "label": "Information sur la collecte de données", "statut": "...", "detail": "..." },
        { "label": "Droits des utilisateurs (accès, rectification, suppression)", "statut": "...", "detail": "..." },
        { "label": "Conservation des données bancaires conforme (recommandation CNIL)", "statut": "...", "detail": "..." },
        { "label": "Gestion des cookies conforme", "statut": "...", "detail": "..." }
      ]
    }
  ],
  "recommandations": ["<recommandation 1>", "<recommandation 2>", "<recommandation 3>"]
}
`;

const STATUS_CONFIG = {
  conforme: { label: "Conforme", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "✓" },
  non_conforme: { label: "Non conforme", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "✗" },
  inconnu: { label: "Non vérifié", color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "?" },
};

const CAT_ICONS = {
  mentions_legales: "⚖️",
  info_precontractuelle: "📋",
  cgv: "📄",
  retractation: "↩️",
  garanties: "🛡️",
  donnees_personnelles: "🔒",
};

export default function App() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCat, setExpandedCat] = useState(null);
  const [step, setStep] = useState("input"); // input | result

  const analyze = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: LEGAL_FRAMEWORK,
          messages: [{ role: "user", content: `Voici la description du site e-commerce à analyser :\n\n${description}` }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setStep("result");
      setExpandedCat(parsed.categories[0]?.id || null);
    } catch (e) {
      setError("Erreur lors de l'analyse. Vérifie ta description et réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (s) => s >= 75 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";
  const getScoreLabel = (s) => s >= 75 ? "Bon niveau de conformité" : s >= 50 ? "Conformité partielle" : "Conformité insuffisante";

  const countByStatus = (cat, status) => cat.points.filter(p => p.statut === status).length;

  const styles = {
    app: { minHeight: "100vh", background: "#0f172a", fontFamily: "'Georgia', serif", color: "#f1f5f9", padding: "0" },
    header: { background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", borderBottom: "1px solid #334155", padding: "2rem 2rem 1.5rem", textAlign: "center" },
    badge: { display: "inline-block", background: "#b8960020", border: "1px solid #b89600", color: "#d4af37", fontSize: "0.65rem", letterSpacing: "0.15em", padding: "0.25rem 0.75rem", borderRadius: "2px", marginBottom: "0.75rem", textTransform: "uppercase" },
    h1: { fontSize: "clamp(1.4rem, 4vw, 2rem)", fontWeight: "400", color: "#f8fafc", margin: "0 0 0.4rem", letterSpacing: "-0.01em" },
    subtitle: { color: "#94a3b8", fontSize: "0.85rem", margin: 0 },
    container: { maxWidth: "820px", margin: "0 auto", padding: "2rem 1rem" },
    card: { background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "1.5rem", marginBottom: "1rem" },
    label: { display: "block", color: "#94a3b8", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" },
    textarea: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: "6px", color: "#f1f5f9", fontFamily: "'Georgia', serif", fontSize: "0.9rem", padding: "0.875rem", minHeight: "160px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: "1.6" },
    hint: { color: "#64748b", fontSize: "0.75rem", marginTop: "0.5rem" },
    btn: { display: "block", width: "100%", background: "linear-gradient(135deg, #1d4ed8, #1e40af)", border: "none", color: "white", fontFamily: "'Georgia', serif", fontSize: "0.95rem", letterSpacing: "0.03em", padding: "0.875rem", borderRadius: "6px", cursor: "pointer", marginTop: "1rem", transition: "opacity .2s" },
    btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
    scoreBlock: { background: "#0f172a", borderRadius: "8px", padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem", border: "1px solid #1e3a5f" },
    scoreNum: { fontSize: "3.5rem", fontWeight: "700", lineHeight: 1 },
    scoreSub: { color: "#94a3b8", fontSize: "0.8rem", marginTop: "0.25rem" },
    resume: { color: "#cbd5e1", fontSize: "0.88rem", lineHeight: "1.7", marginTop: "0.75rem", borderTop: "1px solid #1e293b", paddingTop: "0.75rem" },
    catGrid: { display: "grid", gap: "0.75rem" },
    catCard: { background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", overflow: "hidden" },
    catHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", cursor: "pointer", userSelect: "none" },
    catLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
    catIcon: { fontSize: "1.25rem" },
    catTitle: { fontSize: "0.9rem", fontWeight: "600", color: "#f1f5f9" },
    catMeta: { display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.2rem" },
    pill: (color, bg) => ({ fontSize: "0.65rem", background: bg, color, border: `1px solid ${color}30`, borderRadius: "3px", padding: "0.1rem 0.4rem" }),
    chevron: (open) => ({ color: "#64748b", transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", fontSize: "0.75rem" }),
    pointsList: { borderTop: "1px solid #334155" },
    point: (status) => ({ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid #0f172a", background: STATUS_CONFIG[status]?.bg + "08" }),
    pointIcon: (status) => ({ width: "18px", height: "18px", borderRadius: "50%", background: STATUS_CONFIG[status]?.bg, border: `1.5px solid ${STATUS_CONFIG[status]?.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.65rem", color: STATUS_CONFIG[status]?.color, fontWeight: "700", marginTop: "1px" }),
    pointLabel: { fontSize: "0.85rem", color: "#e2e8f0", fontWeight: "500" },
    pointDetail: { fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem", lineHeight: "1.5" },
    reco: { background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "1.25rem" },
    recoTitle: { color: "#d4af37", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" },
    recoItem: { display: "flex", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: "1.5" },
    backBtn: { background: "transparent", border: "1px solid #334155", color: "#94a3b8", fontFamily: "'Georgia', serif", fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderRadius: "4px", cursor: "pointer", marginBottom: "1.25rem" },
    loader: { textAlign: "center", padding: "3rem" },
    dot: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#d4af37", margin: "0 3px", animation: "bounce 1.2s infinite" },
    legend: { display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.75rem" },
    legendItem: (color) => ({ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color }),
  };

  const examples = [
    "Notre boutique en ligne vend des vêtements. Nous affichons les prix TTC, une page 'mentions légales' avec notre SIREN, adresse et hébergeur OVH. Nos CGV mentionnent un délai de retour de 30 jours mais pas de formulaire de rétractation officiel. Nous n'avons pas de politique de confidentialité distincte.",
    "Site de vente de logiciels en téléchargement. Mentions légales présentes avec dirigeant et hébergeur. CGV accessibles. Pas de droit de rétractation car produits numériques téléchargeables. Aucune information sur les garanties légales. Politique cookies présente, RGPD non détaillé.",
  ];

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        textarea:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px #3b82f620; }
        button:hover:not(:disabled) { opacity: 0.9; }
        .cat-card:hover { border-color: #4b5563 !important; }
      `}</style>

      <div style={styles.header}>
        <div style={styles.badge}>Droit Français du E-commerce</div>
        <h1 style={styles.h1}>Auditeur de Conformité E-commerce</h1>
        <p style={styles.subtitle}>Analyse automatique selon LCEN 2004 · Code de la consommation · RGPD</p>
      </div>

      <div style={styles.container}>
        {step === "input" && (
          <div style={styles.card}>
            <label style={styles.label}>Description du site e-commerce à auditer</label>
            <textarea
              style={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={`Décrivez les éléments présents sur votre site e-commerce :
• Mentions légales (nom, adresse, SIREN, hébergeur...)
• Informations produits et prix
• CGV (conditions de vente, livraison, retours...)
• Droit de rétractation et formulaire
• Garanties proposées
• Politique de confidentialité et cookies

Exemple : "Notre site vend des bijoux artisanaux. Nous affichons..."`}
            />
            <p style={styles.hint}>💡 Plus la description est détaillée, plus l'audit sera précis.</p>
            {examples.map((ex, i) => (
              <div key={i} style={{ marginTop: "0.5rem" }}>
                <button
                  onClick={() => setDescription(ex)}
                  style={{ background: "transparent", border: "1px solid #334155", color: "#64748b", fontFamily: "'Georgia', serif", fontSize: "0.72rem", padding: "0.3rem 0.6rem", borderRadius: "4px", cursor: "pointer" }}
                >
                  Exemple {i + 1}
                </button>
              </div>
            ))}
            {error && <p style={{ color: "#f87171", fontSize: "0.82rem", marginTop: "0.75rem" }}>⚠ {error}</p>}
            <button
              style={{ ...styles.btn, ...(loading || !description.trim() ? styles.btnDisabled : {}) }}
              onClick={analyze}
              disabled={loading || !description.trim()}
            >
              {loading ? "Analyse en cours…" : "Lancer l'audit de conformité →"}
            </button>
          </div>
        )}

        {loading && (
          <div style={styles.loader}>
            <div>
              <span style={{ ...styles.dot, animationDelay: "0s" }} />
              <span style={{ ...styles.dot, animationDelay: ".2s" }} />
              <span style={{ ...styles.dot, animationDelay: ".4s" }} />
            </div>
            <p style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "1rem" }}>Analyse juridique en cours…</p>
          </div>
        )}

        {result && step === "result" && (
          <>
            <button style={styles.backBtn} onClick={() => { setStep("input"); setResult(null); }}>← Nouvel audit</button>

            <div style={styles.scoreBlock}>
              <div style={{ ...styles.scoreNum, color: getScoreColor(result.score_global) }}>{result.score_global}/100</div>
              <div style={{ color: getScoreColor(result.score_global), fontSize: "0.85rem", fontWeight: "600", marginTop: "0.25rem" }}>{getScoreLabel(result.score_global)}</div>
              <div style={styles.legend}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <span key={k} style={styles.legendItem(v.color)}><span>{v.icon}</span> {v.label}</span>
                ))}
              </div>
              <p style={styles.resume}>{result.resume}</p>
            </div>

            <div style={styles.catGrid}>
              {result.categories.map(cat => {
                const isOpen = expandedCat === cat.id;
                const nOk = countByStatus(cat, "conforme");
                const nKo = countByStatus(cat, "non_conforme");
                const nUnk = countByStatus(cat, "inconnu");
                return (
                  <div key={cat.id} style={styles.catCard} className="cat-card">
                    <div style={styles.catHeader} onClick={() => setExpandedCat(isOpen ? null : cat.id)}>
                      <div style={styles.catLeft}>
                        <span style={styles.catIcon}>{CAT_ICONS[cat.id]}</span>
                        <div>
                          <div style={styles.catTitle}>{cat.titre}</div>
                          <div style={styles.catMeta}>
                            <span style={styles.pill(STATUS_CONFIG.conforme.color, STATUS_CONFIG.conforme.bg)}>✓ {nOk}</span>
                            {nKo > 0 && <span style={styles.pill(STATUS_CONFIG.non_conforme.color, STATUS_CONFIG.non_conforme.bg)}>✗ {nKo}</span>}
                            {nUnk > 0 && <span style={styles.pill(STATUS_CONFIG.inconnu.color, STATUS_CONFIG.inconnu.bg)}>? {nUnk}</span>}
                          </div>
                        </div>
                      </div>
                      <span style={styles.chevron(isOpen)}>▼</span>
                    </div>
                    {isOpen && (
                      <div style={styles.pointsList}>
                        {cat.points.map((pt, idx) => {
                          const cfg = STATUS_CONFIG[pt.statut] || STATUS_CONFIG.inconnu;
                          return (
                            <div key={idx} style={styles.point(pt.statut)}>
                              <div style={styles.pointIcon(pt.statut)}>{cfg.icon}</div>
                              <div>
                                <div style={styles.pointLabel}>{pt.label}</div>
                                {pt.detail && <div style={styles.pointDetail}>{pt.detail}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {result.recommandations?.length > 0 && (
              <div style={{ ...styles.reco, marginTop: "1rem" }}>
                <div style={styles.recoTitle}>📌 Recommandations prioritaires</div>
                {result.recommandations.map((r, i) => (
                  <div key={i} style={styles.recoItem}><span style={{ color: "#d4af37", flexShrink: 0 }}>{i + 1}.</span> {r}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
