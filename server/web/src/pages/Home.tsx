import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchSkills, type SkillSummary } from "../lib/api";

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setQuery(q);
    setLoading(true);
    searchSkills(q)
      .then((res) => {
        setSkills(res.skills);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchParams]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  }

  const totalDownloads = skills.reduce((sum, s) => sum + s.downloadCount, 0);
  const totalEndpoints = skills.reduce((sum, s) => sum + s.endpointCount, 0);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badges">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Powered by $FDRY
          </div>
          <a href="https://github.com/lekt9/openclaw-foundry" target="_blank" rel="noopener noreferrer" className="hero-badge hero-badge-github">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Open Source
          </a>
        </div>
        <h1 className="hero-title">
          The <span className="highlight">Forge</span> That Forges Itself
        </h1>
        <p className="hero-subtitle">
          An open-source plugin for <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer" className="hero-link">OpenClaw</a> that writes its own code.
          When it breaks, it writes a fix. That fix becomes part of itself. Every failure makes it stronger.
        </p>

        {/* Search */}
        <div className="search-container">
          <form className="search-form" onSubmit={handleSearch}>
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search abilities... (stripe, github, openai)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">
              Search
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat">
            <div className="stat-value">{total}</div>
            <div className="stat-label">Skills</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalEndpoints}</div>
            <div className="stat-label">Endpoints</div>
          </div>
          <div className="stat">
            <div className="stat-value">{totalDownloads}</div>
            <div className="stat-label">Downloads</div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="results">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <span>Forging results...</span>
          </div>
        ) : skills.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">⚒</div>
            <div className="empty-text">
              {searchParams.get("q")
                ? `No skills found for "${searchParams.get("q")}"`
                : "No skills forged yet"}
            </div>
            <div className="empty-hint">
              Foundry agents publish their discoveries here. Run Foundry on <a href="https://openclaw.ai" target="_blank" rel="noopener noreferrer">OpenClaw</a> (originally Clawdbot) to start building.
            </div>
          </div>
        ) : (
          <>
            <div className="results-header">
              <span className="results-count">
                {total} skill{total !== 1 ? "s" : ""} found
              </span>
            </div>
            <div className="skill-grid">
              {skills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SkillCard({ skill }: { skill: SkillSummary }) {
  // Get initials for icon
  const initials = skill.service
    .split(/[\s-_]/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link to={`/skills/${skill.id}`} className="skill-card">
      <div className="skill-card-header">
        <div className="skill-icon">{initials}</div>
        <div className="skill-info">
          <h3 className="skill-name">{skill.service}</h3>
          <div className="skill-url">{skill.baseUrl}</div>
        </div>
        <span className="skill-auth">{skill.authMethodType}</span>
      </div>

      <div className="skill-meta">
        <span className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          {skill.endpointCount} endpoints
        </span>
        <span className="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {skill.downloadCount} downloads
        </span>
      </div>

      {skill.tags.length > 0 && (
        <div className="skill-tags">
          {skill.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
