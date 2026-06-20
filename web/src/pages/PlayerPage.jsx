import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { getAnimeDetail, getEpisodes, getStreamSources, getSkipTimes, getDirectStream } from "../services/api";
import VideoPlayer from "../components/VideoPlayer";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";

export default function PlayerPage() {
  const { animeId, episodeId } = useParams();
  const [searchParams] = useSearchParams();
  const audioCategory = searchParams.get("audio") || "sub"; // 'sub' or 'dub'
  
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animeDetail, setAnimeDetail] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [selectedServer, setSelectedServer] = useState("hd-1");
  
  // Stream & Skip times
  const [streamData, setStreamData] = useState(null);
  const [directStream, setDirectStream] = useState(null);
  const [skipTimes, setSkipTimes] = useState(null);
  const [initialSavedProgress, setInitialSavedProgress] = useState(0);

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);
      setError("");
      try {
        // 1. Load anime detail and episodes
        const [detailData, epData] = await Promise.all([
          getAnimeDetail(animeId),
          getEpisodes(animeId)
        ]);

        setAnimeDetail(detailData);
        setEpisodes(epData?.episodes || []);

        const ep = epData?.episodes?.find(e => e.episodeId === episodeId);
        setCurrentEpisode(ep);

        // 2. Fetch watch history from Firestore to get initial saved progress
        if (currentUser && activeProfile) {
          const docRef = doc(db, "users", currentUser.uid, "profiles", activeProfile.id, "history", animeId);
          const histSnap = await getDoc(docRef);
          if (histSnap.exists()) {
            const hist = histSnap.data();
            if (hist.episodeId === episodeId) {
              setInitialSavedProgress(hist.progressPosition || 0);
            } else {
              setInitialSavedProgress(0);
            }
          } else {
            setInitialSavedProgress(0);
          }
        }

        // 3. Fetch stream sources
        const stream = await getStreamSources(episodeId, selectedServer, audioCategory);
        setStreamData(stream);

        try {
          const direct = await getDirectStream(episodeId, selectedServer, audioCategory);
          setDirectStream(direct);
        } catch (err) {
          console.warn("Direct stream extraction failed, falling back to iframe:", err);
          setDirectStream(null);
        }

        // 4. Fetch AniSkip times if MAL ID is available
        const malId = detailData?.anime?.info?.malId;
        if (malId && malId !== "0" && ep) {
          const skip = await getSkipTimes(malId, ep.number);
          if (skip) {
            // Map AniSkip response to intro/outro format
            const opSegment = skip.find(s => s.result_type === "op");
            const edSegment = skip.find(s => s.result_type === "ed");
            
            setSkipTimes({
              intro: opSegment ? { start: opSegment.interval.start, end: opSegment.interval.end } : null,
              outro: edSegment ? { start: edSegment.interval.start, end: edSegment.interval.end } : null
            });
          }
        }
      } catch (err) {
        console.error("Player page loading error:", err);
        setError("Failed to extract video streams. Please try another episode or server.");
      } finally {
        setLoading(false);
      }
    }
    loadPlayer();
  }, [animeId, episodeId, audioCategory, selectedServer, currentUser, activeProfile]);

  const handleProgressSave = async (progressMs, durationMs) => {
    if (!currentUser || !activeProfile || !animeDetail || !currentEpisode) return;

    try {
      const isNearEnd = (durationMs > 0) && (progressMs / durationMs >= 0.90 || (durationMs - progressMs) <= 120000);
      
      const currentIndex = episodes.findIndex(e => e.episodeId === episodeId);
      
      let finalEpisodeId = episodeId;
      let finalEpisodeNumber = currentEpisode.number;
      let finalEpisodeTitle = currentEpisode.title || `Episode ${currentEpisode.number}`;
      let finalProgress = progressMs;
      let finalDuration = durationMs;

      // If near end (90%+ watched), automatically prep next episode
      if (isNearEnd && currentIndex !== -1 && currentIndex < episodes.length - 1) {
        const nextEp = episodes[currentIndex + 1];
        finalEpisodeId = nextEp.episodeId;
        finalEpisodeNumber = nextEp.number;
        finalEpisodeTitle = nextEp.title || `Episode ${nextEp.number}`;
        finalProgress = 0;
        finalDuration = 0; // Clean start
      }

      const data = {
        animeId,
        animeTitle: animeDetail.anime.info.name,
        poster: animeDetail.anime.info.poster,
        episodeId: finalEpisodeId,
        episodeNumber: finalEpisodeNumber,
        episodeTitle: finalEpisodeTitle,
        progressPosition: finalProgress,
        totalDuration: finalDuration,
        updatedAt: Date.now()
      };

      const docRef = doc(db, "users", currentUser.uid, "profiles", activeProfile.id, "history", animeId);
      await setDoc(docRef, data);
    } catch (e) {
      console.warn("Error saving progress to Firestore:", e);
    }
  };

  const handleEpisodeEnded = () => {
    const autoplaySetting = localStorage.getItem("anistream_autoplay") !== "false";
    if (autoplaySetting) {
      const currentIndex = episodes.findIndex(e => e.episodeId === episodeId);
      if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
        const nextEp = episodes[currentIndex + 1];
        navigate(`/watch/${animeId}/${nextEp.episodeId}?audio=${audioCategory}`);
        return;
      }
    }
    navigate(`/anime/${animeId}`);
  };

  // Extract M3U8 source link
  const hlsSource = directStream ? directStream.hlsUrl : streamData?.sources?.find(s => s.type === "hls" || s.url.includes(".m3u8"))?.url;
  const embedFallback = streamData?.videoUrl || (streamData?.sources?.[0]?.url);

  // Setup skip ranges (prefer AniSkip, fallback to streamData intro/outro)
  const skipIntroRange = skipTimes?.intro || (directStream ? directStream.intro : streamData?.intro);
  const skipOutroRange = skipTimes?.outro || (directStream ? directStream.outro : streamData?.outro);

  return (
    <div className="player-screen-page">
      <div className="container player-nav-back">
        <Link to={`/anime/${animeId}`} className="back-link">
          <ArrowLeft size={16} /> Back to info
        </Link>
      </div>

      <div className="container player-wrapper-block">
        {loading ? (
          <div className="player-loading-placeholder flex-center">
            <div className="text-center">
              <RefreshCw size={44} className="spin-icon" style={{ margin: "0 auto 1rem" }} />
              <h3>Scraping stream sources...</h3>
              <p className="text-muted">Extracting secure links and subtitles</p>
            </div>
          </div>
        ) : error ? (
          <div className="player-error-placeholder flex-center text-center">
            <div>
              <AlertTriangle size={48} className="error-icon" style={{ margin: "0 auto 1rem" }} />
              <h2>Stream Extraction Failed</h2>
              <p className="text-muted" style={{ margin: "0.5rem 0 1.5rem" }}>{error}</p>
              <div className="flex-center" style={{ gap: "1rem" }}>
                <Link to={`/anime/${animeId}`} className="btn btn-secondary">
                  Back to Details
                </Link>
                <button onClick={() => window.location.reload()} className="btn btn-primary">
                  Retry Extraction
                </button>
              </div>
            </div>
          </div>
        ) : (
          <VideoPlayer 
            src={hlsSource}
            tracks={directStream ? directStream.tracks : (streamData?.tracks || [])}
            intro={skipIntroRange}
            outro={skipOutroRange}
            initialTime={initialSavedProgress}
            onProgress={handleProgressSave}
            onEnded={handleEpisodeEnded}
            embedUrl={embedFallback}
            animeTitle={animeDetail?.anime?.info?.name}
            episodeNumber={currentEpisode?.number || 1}
            onBack={() => navigate(`/anime/${animeId}`)}
          />
        )}
      </div>

      {/* Server Selector Bar */}
      {!loading && !error && (
        <div className="container server-selector-bar">
          <span className="server-label">Change Server:</span>
          <div className="server-buttons">
            {[
              { id: "hd-1", name: "Server 1 (HD-1)" },
              { id: "rapidcloud", name: "Server 2 (RapidCloud)" },
              { id: "megastream", name: "Server 3 (MegaStream)" }
            ].map((srv) => (
              <button
                key={srv.id}
                className={`server-btn ${selectedServer === srv.id ? "active" : ""}`}
                onClick={() => setSelectedServer(srv.id)}
              >
                {srv.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Up Next / Episode Navigation in Player */}
      {!loading && !error && currentEpisode && (
        <div className="container player-episodes-navigation">
          <h3>Episodes List</h3>
          <div className="navigation-episodes-list">
            {episodes.map(ep => (
              <Link 
                key={ep.episodeId}
                to={`/watch/${animeId}/${ep.episodeId}?audio=${audioCategory}`}
                className={`nav-ep-btn ${ep.episodeId === episodeId ? "active" : ""}`}
              >
                Ep {ep.number}
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .player-screen-page {
          padding-top: 20px;
          padding-bottom: 4rem;
          min-height: 100vh;
          background: #050505;
        }
        .server-selector-bar {
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .server-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .server-buttons {
          display: flex;
          gap: 8px;
        }
        .server-btn {
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: var(--font-family);
          font-size: 0.85rem;
          font-weight: 600;
          transition: var(--transition);
        }
        .server-btn:hover {
          background-color: #242424;
          color: white;
          border-color: #444;
        }
        .server-btn.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .player-nav-back {
          margin-bottom: 12px;
        }
        .back-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: var(--transition);
        }
        .back-link:hover {
          color: white;
        }
        .player-wrapper-block {
          width: 100%;
        }
        .player-loading-placeholder, .player-error-placeholder {
          width: 100%;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          background-color: var(--bg-card);
          border-radius: 8px;
          border: 1px solid var(--border);
          position: relative;
        }
        .player-loading-placeholder > div, .player-error-placeholder > div {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
        }
        .error-icon {
          color: var(--primary);
        }

        .player-episodes-navigation {
          margin-top: 2rem;
        }
        .player-episodes-navigation h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: white;
        }
        .navigation-episodes-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .nav-ep-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 38px;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-weight: 700;
          font-size: 0.85rem;
          text-decoration: none;
          border-radius: 4px;
          transition: var(--transition);
        }
        .nav-ep-btn:hover {
          background-color: #242424;
          color: white;
          border-color: #444;
        }
        .nav-ep-btn.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        @media (max-width: 768px) {
          .player-screen-page {
            padding-top: 0;
            padding-bottom: 2rem;
          }
          .player-nav-back {
            display: none !important;
          }
          .player-wrapper-block {
            padding: 0 !important;
          }
          .player-container {
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .server-selector-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            margin-top: 1rem;
          }
          .server-buttons {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 4px;
            scrollbar-width: none;
          }
          .server-buttons::-webkit-scrollbar {
            display: none;
          }
          .server-btn {
            flex: 0 0 auto;
            font-size: 0.8rem;
            padding: 6px 12px;
          }
          .player-episodes-navigation {
            margin-top: 1.5rem;
          }
          .navigation-episodes-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
            gap: 8px;
          }
          .nav-ep-btn {
            width: 100%;
            height: 36px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
