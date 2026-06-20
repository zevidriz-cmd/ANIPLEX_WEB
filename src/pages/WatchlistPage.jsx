import React, { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import AnimeCard from "../components/AnimeCard";
import { GridShimmer } from "../components/Shimmer";
import { Bookmark, Film } from "lucide-react";
import { Link } from "react-router-dom";

export default function WatchlistPage() {
  const { currentUser } = useAuth();
  const { activeProfile } = useProfile();
  
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    if (!currentUser || !activeProfile) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "users", currentUser.uid, "profiles", activeProfile.id, "watchlist"),
        orderBy("addedAt", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWatchlist(list);
    } catch (e) {
      console.error("Error fetching watchlist:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [currentUser, activeProfile]);

  const handleRemove = async (animeId) => {
    if (!currentUser || !activeProfile) return;
    const docRef = doc(db, "users", currentUser.uid, "profiles", activeProfile.id, "watchlist", animeId);
    try {
      await deleteDoc(docRef);
      setWatchlist(watchlist.filter(item => item.id !== animeId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="watchlist-page fade-in container">
      <div className="watchlist-header">
        <h1 className="page-title"><Bookmark size={24} fill="var(--primary)" color="var(--primary)" /> My Watchlist</h1>
        {!loading && watchlist.length > 0 && (
          <span className="count-badge">{watchlist.length} Series Saved</span>
        )}
      </div>

      {loading ? (
        <GridShimmer count={6} />
      ) : watchlist.length > 0 ? (
        <div className="grid-layout">
          {watchlist.map((item) => (
            <AnimeCard 
              key={item.id}
              id={item.id}
              name={item.name}
              poster={item.poster}
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : (
        <div className="watchlist-empty text-center flex-center">
          <div>
            <Bookmark size={54} className="empty-icon" style={{ margin: "0 auto 1.5rem" }} />
            <h2>Your Watchlist is empty</h2>
            <p className="text-muted" style={{ margin: "0.5rem 0 1.5rem" }}>
              Explore and add anime to your watchlist to track your favorite shows here!
            </p>
            <Link to="/" className="btn btn-primary">
              Browse Anime
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .watchlist-page {
          padding-top: calc(var(--header-height) + 20px);
          min-height: 100vh;
        }
        .watchlist-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .count-badge {
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .watchlist-empty {
          min-height: 50vh;
        }
        .empty-icon {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
