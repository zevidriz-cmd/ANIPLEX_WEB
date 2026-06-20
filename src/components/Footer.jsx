import React from "react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <p>&copy; {new Date().getFullYear()} AniStream. All rights reserved.</p>
        <p className="footer-credits">
          Made for personal anime streaming. Synced with AniStream Mobile.
        </p>
      </div>
      <style>{`
        .footer {
          border-top: 1px solid var(--border);
          padding: 2rem 0;
          margin-top: 4rem;
          color: var(--text-muted);
          font-size: 0.85rem;
          text-align: center;
        }
        .footer-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .footer-credits {
          font-size: 0.75rem;
          opacity: 0.7;
        }
      `}</style>
    </footer>
  );
}
