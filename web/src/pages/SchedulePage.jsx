import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getSchedules, resolveMAL, search, STREAM_PROXY_BASE } from "../services/api";
import { Calendar, Clock, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export default function SchedulePage() {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dynamic 7-day tabs generator
  const generateDayTabs = () => {
    const tabs = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      
      let label = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (i === 0) label = "Today";
      if (i === 1) label = "Tomorrow";
      
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      tabs.push({ dateString: dateStr, displayDay: label, displayDate });
    }
    return tabs;
  };

  const dayTabs = generateDayTabs();
  const [selectedDate, setSelectedDate] = useState(dayTabs[0].dateString);

  // Resolving ID states
  const [resolvingId, setResolvingId] = useState(false);
  const [resolvingMsg, setResolvingMsg] = useState("");

  // Fetch airing schedule with Jikan fallback
  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      setScheduleData([]);
      try {
        let data = [];
        try {
          const res = await getSchedules(selectedDate);
          data = res?.scheduledAnimes || [];
        } catch (err) {
          console.warn("Primary schedules endpoint failed, trying Jikan fallback:", err);
        }

        if (data.length === 0) {
          const [year, month, day] = selectedDate.split("-").map(Number);
          const date = new Date(year, month - 1, day);
          const dayIndex = date.getDay();
          const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          const dayName = weekdays[dayIndex];
          
          let jikanRes = await fetch(`${STREAM_PROXY_BASE}/api.jikan.moe/v4/schedules?filter=${dayName}`).catch(() => null);
          if (!jikanRes || !jikanRes.ok) {
            jikanRes = await fetch(`https://api.jikan.moe/v4/schedules?filter=${dayName}`).catch(() => null);
          }

          if (jikanRes && jikanRes.ok) {
            const jikanData = await jikanRes.json();
            data = (jikanData?.data || []).map(item => {
              const airTime = item.broadcast?.time || "Airing Today";
              return {
                id: `mal-${item.mal_id}`, // Flag it as MAL ID for resolution on click
                name: item.title_english || item.title,
                time: airTime,
                episode: item.episodes || "?",
                poster: item.images?.jpg?.image_url || ""
              };
            });
          }
        }

        setScheduleData(data);
      } catch (err) {
        console.error("Schedule loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [selectedDate]);

  // Click handler to resolve MAL IDs to HiAnime streaming IDs on-the-fly
  const handleAnimeClick = async (e, item) => {
    if (!item.id.startsWith("mal-")) {
      return; // Standard routing (HiAnime ID is already correct)
    }

    e.preventDefault();
    setResolvingId(true);
    setResolvingMsg(`Connecting to stream for "${item.name}"...`);

    const malId = item.id.substring(4); // Remove "mal-" prefix
    try {
      // 1. Resolve via cached MAL ID database on the proxy worker
      const resolveRes = await resolveMAL(malId);
      if (resolveRes && resolveRes.anikotoId) {
        setResolvingId(false);
        navigate(`/anime/${resolveRes.anikotoId}`);
        return;
      }
    } catch (err) {
      console.warn("resolveMAL failed, searching by keyword title:", err);
    }

    try {
      // 2. Fallback to Search API matching
      const searchRes = await search(item.name);
      if (searchRes && searchRes.animes && searchRes.animes.length > 0) {
        const matchId = searchRes.animes[0].id;
        setResolvingId(false);
        navigate(`/anime/${matchId}`);
        return;
      }
    } catch (err) {
      console.warn("Search fallback resolution failed:", err);
    }

    // 3. Double-fallback: Redirect directly to Search page with prefilled title
    setResolvingId(false);
    navigate(`/search?keyword=${encodeURIComponent(item.name)}`);
  };

  return (
    <div className="schedule-page fade-in container">
      {/* Search-to-play Resolution Overlay */}
      {resolvingId && (
        <div className="resolution-overlay flex-center">
          <div className="resolution-box text-center">
            <Loader2 size={44} className="spin-icon text-primary" style={{ margin: "0 auto 1.2rem" }} />
            <h3>Resolving Stream Source</h3>
            <p className="text-muted">{resolvingMsg}</p>
          </div>
        </div>
      )}

      <div className="schedule-header">
        <h1 className="page-title"><Calendar size={24} className="text-primary" /> Airing Schedule</h1>
        <p className="text-muted">Estimated episode release schedule for the week</p>
      </div>

      {/* Day Tabs Horizontal Scroll Selector */}
      <div className="schedule-tabs-container">
        <div className="schedule-tabs-wrapper">
          {dayTabs.map((tab) => (
            <button
              key={tab.dateString}
              className={`schedule-tab-btn ${selectedDate === tab.dateString ? "active" : ""}`}
              onClick={() => setSelectedDate(tab.dateString)}
            >
              <span className="tab-day">{tab.displayDay}</span>
              <span className="tab-date">{tab.displayDate}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="schedule-loading flex-center">
          <RefreshCw size={36} className="spin-icon text-primary" />
        </div>
      ) : scheduleData.length > 0 ? (
        <div className="schedule-list">
          {scheduleData.map((item) => (
            <div key={item.id} className="schedule-item-card">
              <div className="schedule-poster">
                {item.poster ? (
                  <img src={item.poster} alt={item.name} loading="lazy" />
                ) : (
                  <div className="poster-fallback-char flex-center">
                    <span>{item.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="schedule-details">
                <Link 
                  to={`/anime/${item.id}`} 
                  onClick={(e) => handleAnimeClick(e, item)}
                  className="anime-link-title"
                >
                  {item.name}
                </Link>
                <div className="schedule-meta-info">
                  <span className="air-time"><Clock size={14} /> {item.time}</span>
                  <span className="air-ep">Episode {item.episode}</span>
                  {item.id.startsWith("mal-") && <span className="fallback-badge">Fallback (MAL)</span>}
                </div>
              </div>
              <div className="schedule-action-btn">
                <Link 
                  to={`/anime/${item.id}`} 
                  onClick={(e) => handleAnimeClick(e, item)}
                  className="btn btn-secondary btn-sm"
                >
                  Watch Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="schedule-empty text-center flex-center">
          <div>
            <AlertTriangle size={54} className="empty-icon text-muted" style={{ margin: "0 auto 1.5rem" }} />
            <h2>No Airing Episodes Found</h2>
            <p className="text-muted">
              Try selecting another date or check your connection.
            </p>
          </div>
        </div>
      )}

      <style>{`
        .schedule-page {
          padding-top: calc(var(--header-height) + 20px);
          min-height: 100vh;
          position: relative;
        }
        .schedule-header {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .schedule-header p {
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        /* 7-Day tabs styles */
        .schedule-tabs-container {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 2rem;
          scrollbar-width: none;
          padding: 4px 0;
        }
        .schedule-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .schedule-tabs-wrapper {
          display: flex;
          gap: 10px;
          min-width: max-content;
        }
        .schedule-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          min-width: 100px;
          font-family: var(--font-family);
          transition: var(--transition);
        }
        .schedule-tab-btn:hover {
          background-color: #1a1a1a;
          color: white;
          border-color: #3b3b3b;
        }
        .schedule-tab-btn.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(229, 9, 20, 0.3);
        }
        .tab-day {
          font-size: 0.85rem;
          font-weight: 700;
        }
        .tab-date {
          font-size: 0.7rem;
          opacity: 0.8;
          margin-top: 2px;
        }

        .schedule-loading {
          min-height: 40vh;
        }
        .schedule-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 800px;
          margin: 0 auto 2rem;
        }
        .schedule-item-card {
          display: flex;
          align-items: center;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 18px;
          gap: 1.2rem;
          transition: var(--transition);
        }
        .schedule-item-card:hover {
          border-color: #333;
          transform: translateY(-1px);
          background-color: #1a1a1a;
        }
        .schedule-poster {
          width: 50px;
          height: 70px;
          border-radius: 4px;
          overflow: hidden;
          background-color: #242424;
          flex-shrink: 0;
        }
        .schedule-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .poster-fallback-char {
          width: 100%;
          height: 100%;
          font-weight: 800;
          color: #555;
          font-size: 1.5rem;
        }
        .schedule-details {
          flex-grow: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .anime-link-title {
          color: white;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: inline-block;
        }
        .anime-link-title:hover {
          color: var(--primary);
        }
        .schedule-meta-info {
          display: flex;
          gap: 10px;
          align-items: center;
          font-size: 0.8rem;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }
        .air-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }
        .air-ep {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.75rem;
        }
        .fallback-badge {
          background-color: rgba(245, 166, 35, 0.15);
          color: #f5a623;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.75rem;
        }
        .btn-sm {
          padding: 0.4rem 1rem;
          font-size: 0.8rem;
        }
        .schedule-empty {
          min-height: 40vh;
        }

        /* Loading resolution overlay */
        .resolution-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 9999;
        }
        .resolution-box {
          background-color: #141414;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 30px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .resolution-box h3 {
          color: white;
          font-size: 1.2rem;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}
