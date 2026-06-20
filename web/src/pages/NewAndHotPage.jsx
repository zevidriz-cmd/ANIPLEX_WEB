import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getHome, getSchedules, resolveMAL, search, STREAM_PROXY_BASE } from "../services/api";
import AnimeCard from "../components/AnimeCard";
import { GridShimmer } from "../components/Shimmer";
import { Flame, Calendar, Clock, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export default function NewAndHotPage() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState("trending"); // 'trending' or 'schedule'
  
  // Trending data states
  const [trendingList, setTrendingList] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Schedule states (copied & adapted from SchedulePage.jsx)
  const [scheduleData, setScheduleData] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  
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
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(dayTabs[0].dateString);

  // Resolving ID states
  const [resolvingId, setResolvingId] = useState(false);
  const [resolvingMsg, setResolvingMsg] = useState("");

  // 1. Fetch Trending
  useEffect(() => {
    if (activeSubTab !== "trending") return;
    async function loadTrending() {
      setTrendingLoading(true);
      try {
        const homeData = await getHome();
        setTrendingList(homeData?.trendingAnimes || []);
      } catch (err) {
        console.error("Error loading trending new & hot:", err);
      } finally {
        setTrendingLoading(false);
      }
    }
    loadTrending();
  }, [activeSubTab]);

  // 2. Fetch Schedule
  useEffect(() => {
    if (activeSubTab !== "schedule") return;
    async function loadSchedule() {
      setScheduleLoading(true);
      setScheduleData([]);
      try {
        let data = [];
        try {
          const res = await getSchedules(selectedScheduleDate);
          data = res?.scheduledAnimes || [];
        } catch (err) {
          console.warn("Primary schedules failed, trying Jikan:", err);
        }

        if (data.length === 0) {
          const [year, month, day] = selectedScheduleDate.split("-").map(Number);
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
                id: `mal-${item.mal_id}`,
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
        console.error("Schedule load error in New & Hot:", err);
      } finally {
        setScheduleLoading(false);
      }
    }
    loadSchedule();
  }, [activeSubTab, selectedScheduleDate]);

  // Click handler to resolve MAL IDs to HiAnime streaming IDs on-the-fly
  const handleAnimeClick = async (e, item) => {
    if (!item.id.startsWith("mal-")) {
      return;
    }

    e.preventDefault();
    setResolvingId(true);
    setResolvingMsg(`Connecting to stream for "${item.name}"...`);

    const malId = item.id.substring(4);
    try {
      const resolveRes = await resolveMAL(malId);
      if (resolveRes && resolveRes.anikotoId) {
        setResolvingId(false);
        navigate(`/anime/${resolveRes.anikotoId}`);
        return;
      }
    } catch (err) {
      console.warn("resolveMAL failed, searching title:", err);
    }

    try {
      const searchRes = await search(item.name);
      if (searchRes && searchRes.animes && searchRes.animes.length > 0) {
        const matchId = searchRes.animes[0].id;
        setResolvingId(false);
        navigate(`/anime/${matchId}`);
        return;
      }
    } catch (err) {
      console.warn("Search matching failed:", err);
    }

    setResolvingId(false);
    navigate(`/search?keyword=${encodeURIComponent(item.name)}`);
  };

  return (
    <div className="new-hot-page fade-in container">
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

      {/* Main Tab Controls */}
      <div className="new-hot-tabs-header">
        <button 
          onClick={() => setActiveSubTab("trending")}
          className={`tab-toggle-btn ${activeSubTab === "trending" ? "active" : ""}`}
        >
          <Flame size={18} /> Trending Now
        </button>
        <button 
          onClick={() => setActiveSubTab("schedule")}
          className={`tab-toggle-btn ${activeSubTab === "schedule" ? "active" : ""}`}
        >
          <Calendar size={18} /> Airing Schedule
        </button>
      </div>

      {/* Trending Tab Content */}
      {activeSubTab === "trending" && (
        <div className="trending-tab-content">
          <div className="tab-title-row">
            <h2>🔥 Trending Globally</h2>
            <p className="text-muted">The most watched anime episodes right now</p>
          </div>
          
          {trendingLoading ? (
            <GridShimmer count={6} />
          ) : trendingList.length > 0 ? (
            <div className="grid-layout">
              {trendingList.map((anime) => (
                <AnimeCard 
                  key={anime.id}
                  id={anime.id}
                  name={anime.name}
                  poster={anime.poster}
                  type={anime.type}
                  episodes={anime.episodes}
                  rating={anime.rate}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state text-center">
              <AlertTriangle size={48} className="text-muted" />
              <p>No trending items found.</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab Content */}
      {activeSubTab === "schedule" && (
        <div className="schedule-tab-content">
          <div className="tab-title-row">
            <h2>📅 Airing Schedule</h2>
            <p className="text-muted">Estimated episode release times for the week</p>
          </div>

          {/* 7-Day tabs scroll selector */}
          <div className="schedule-tabs-container">
            <div className="schedule-tabs-wrapper">
              {dayTabs.map((tab) => (
                <button
                  key={tab.dateString}
                  className={`schedule-tab-btn ${selectedScheduleDate === tab.dateString ? "active" : ""}`}
                  onClick={() => setSelectedScheduleDate(tab.dateString)}
                >
                  <span className="tab-day">{tab.displayDay}</span>
                  <span className="tab-date">{tab.displayDate}</span>
                </button>
              ))}
            </div>
          </div>

          {scheduleLoading ? (
            <div className="schedule-loading flex-center" style={{ minHeight: "30vh" }}>
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
            <div className="schedule-empty text-center flex-center" style={{ minHeight: "30vh" }}>
              <div>
                <AlertTriangle size={44} className="empty-icon text-muted" style={{ margin: "0 auto 1rem" }} />
                <h3>No Airing Episodes Found</h3>
                <p className="text-muted">Select another day or try again later.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .new-hot-page {
          padding-top: calc(var(--header-height) + 20px);
          padding-bottom: 5rem;
          min-height: 100vh;
          position: relative;
        }

        .new-hot-tabs-header {
          display: flex;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 4px;
          width: fit-content;
          margin: 0 auto 2rem;
          gap: 4px;
        }
        .tab-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 24px;
          border-radius: 26px;
          border: none;
          background: none;
          color: var(--text-secondary);
          font-family: var(--font-family);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: var(--transition);
        }
        .tab-toggle-btn.active {
          background-color: var(--primary);
          color: white;
          box-shadow: 0 4px 12px rgba(229, 9, 20, 0.3);
        }

        .tab-title-row {
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .tab-title-row h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
        }
        .tab-title-row p {
          font-size: 0.85rem;
          margin-top: 2px;
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
