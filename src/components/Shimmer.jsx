import React from "react";

export function CardShimmer() {
  return (
    <div className="shimmer-card-loading">
      <div className="shimmer-poster shimmer"></div>
      <div className="shimmer-text shimmer"></div>
      <div className="shimmer-subtext shimmer"></div>
      <style>{`
        .shimmer-card-loading {
          background-color: var(--bg-card);
          border-radius: 8px;
          padding-bottom: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .shimmer-poster {
          width: 100%;
          padding-top: 142%;
        }
        .shimmer-text {
          height: 14px;
          width: 80%;
          margin: 0 10px;
          border-radius: 3px;
        }
        .shimmer-subtext {
          height: 10px;
          width: 50%;
          margin: 0 10px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export function GridShimmer({ count = 6 }) {
  return (
    <div className="grid-layout">
      {Array.from({ length: count }).map((_, i) => (
        <CardShimmer key={i} />
      ))}
    </div>
  );
}

export function BillboardShimmer() {
  return (
    <div className="billboard-shimmer-loading shimmer">
      <style>{`
        .billboard-shimmer-loading {
          width: 100%;
          height: 70vh;
          margin-bottom: 2rem;
          background-color: var(--bg-card);
        }
      `}</style>
    </div>
  );
}

export function DetailsShimmer() {
  return (
    <div className="details-shimmer container">
      <div className="banner-placeholder shimmer"></div>
      <div className="info-placeholder">
        <div className="poster-placeholder shimmer"></div>
        <div className="meta-placeholder">
          <div className="title-placeholder shimmer"></div>
          <div className="stats-placeholder shimmer"></div>
          <div className="desc-placeholder shimmer"></div>
        </div>
      </div>
      <style>{`
        .details-shimmer {
          padding-top: calc(var(--header-height) + 20px);
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .banner-placeholder {
          width: 100%;
          height: 350px;
          border-radius: 12px;
        }
        .info-placeholder {
          display: flex;
          gap: 2rem;
        }
        .poster-placeholder {
          width: 220px;
          height: 310px;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .meta-placeholder {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .title-placeholder {
          height: 32px;
          width: 60%;
          border-radius: 4px;
        }
        .stats-placeholder {
          height: 20px;
          width: 30%;
          border-radius: 3px;
        }
        .desc-placeholder {
          height: 120px;
          width: 100%;
          border-radius: 6px;
        }
        @media (max-width: 768px) {
          .info-placeholder {
            flex-direction: column;
            align-items: center;
          }
          .poster-placeholder {
            width: 160px;
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
}
