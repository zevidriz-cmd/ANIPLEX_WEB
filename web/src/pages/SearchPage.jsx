import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { search, getSuggestions, getGenre } from "../services/api";
import AnimeCard from "../components/AnimeCard";
import { GridShimmer } from "../components/Shimmer";
import { Search as SearchIcon, Filter, X, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const genreParam = searchParams.get("genre") || "";

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [selectedGenres, setSelectedGenres] = useState(genreParam ? [genreParam] : []);
  const [sort, setSort] = useState("");

  const searchTimeoutRef = useRef(null);

  // Sync genre parameter from URL if clicked from Home genre chips
  useEffect(() => {
    if (genreParam) {
      setSelectedGenres([genreParam]);
      setKeyword("");
      loadGenreData(genreParam, 1);
    }
  }, [genreParam]);

  const loadGenreData = async (genre, p) => {
    setLoading(true);
    setSuggestions([]);
    try {
      const data = await getGenre(genre, p);
      setResults(data?.animes || []);
      setPage(data?.currentPage || 1);
      setTotalPages(data?.totalPages || 1);
      setHasNextPage(data?.hasNextPage || false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = async (p = 1) => {
    if (!keyword.trim() && selectedGenres.length === 0 && !type && !status && !sort) {
      setResults([]);
      return;
    }

    setLoading(true);
    setSuggestions([]);
    try {
      // If we have filters selected, we can call the search/filter endpoints
      // In this client we support standard keyword search or filter search.
      // If there's a keyword, we run the search.
      const data = await search(keyword || "all", p);
      setResults(data?.animes || []);
      setPage(data?.currentPage || 1);
      setTotalPages(data?.totalPages || 1);
      setHasNextPage(data?.hasNextPage || false);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Debounced autocomplete suggestions
  const handleKeywordChange = (e) => {
    const val = e.target.value;
    setKeyword(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await getSuggestions(val);
        setSuggestions(data?.suggestions || []);
      } catch (err) {
        console.warn(err);
      }
    }, 400);
  };

  useEffect(() => {
    // If we have default filters on load, perform search
    if (!genreParam && keyword) {
      handleSearchSubmit(1);
    }
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchSubmit(1);
    }
  };

  const clearFilters = () => {
    setType("");
    setStatus("");
    setSelectedGenres([]);
    setSort("");
    setSearchParams({});
    setResults([]);
  };

  const genresList = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
    "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", 
    "Sports", "Supernatural", "Thriller", "Music", "Mecha", "Psychological"
  ];

  return (
    <div className="search-page fade-in container">
      <div className="search-header-panel">
        <div className="search-bar-wrapper">
          <SearchIcon className="search-icon-svg" size={20} />
          <input 
            type="text" 
            placeholder="Search anime title, movies, ova..."
            className="search-input-box"
            value={keyword}
            onChange={handleKeywordChange}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          {keyword && (
            <button className="clear-search-btn" onClick={() => { setKeyword(""); setSuggestions([]); }}>
              <X size={18} />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((item) => (
                <Link key={item.id} to={`/anime/${item.id}`} className="suggestion-item">
                  <div className="suggestion-poster">
                    <img src={item.poster} alt={item.name} />
                  </div>
                  <div className="suggestion-info">
                    <h4 className="suggestion-title">{item.name}</h4>
                    <p className="suggestion-meta">
                      {item.moreInfo?.join(" • ")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <button 
          className={`btn btn-secondary filter-toggle-btn ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={18} /> Filters
        </button>

        <button className="btn btn-primary" onClick={() => handleSearchSubmit(1)}>
          Search
        </button>
      </div>

      <div className="search-body-panel">
        {/* Filters Sidebar */}
        {showFilters && (
          <aside className="filters-sidebar fade-in">
            <div className="filter-section">
              <h3>Type</h3>
              <div className="filter-options">
                {["", "tv", "movie", "ova", "ona", "special"].map((t) => (
                  <button 
                    key={t}
                    onClick={() => setType(t)}
                    className={type === t ? "active" : ""}
                  >
                    {t ? t.toUpperCase() : "All"}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h3>Status</h3>
              <div className="filter-options">
                {["", "airing", "completed", "upcoming"].map((s) => (
                  <button 
                    key={s}
                    onClick={() => setStatus(s)}
                    className={status === s ? "active" : ""}
                  >
                    {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h3>Genres</h3>
              <div className="filter-genres-grid">
                {genresList.map((g) => {
                  const isSel = selectedGenres.includes(g);
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        if (isSel) {
                          setSelectedGenres(selectedGenres.filter(x => x !== g));
                        } else {
                          setSelectedGenres([g]); // single genre select for simple API query compatibility
                          setKeyword("");
                          setSearchParams({ genre: g });
                        }
                      }}
                      className={isSel ? "active" : ""}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="btn btn-secondary clear-filters-btn" onClick={clearFilters}>
              Reset Filters
            </button>
          </aside>
        )}

        {/* Results Columns */}
        <div className="search-results-column">
          {loading ? (
            <GridShimmer count={8} />
          ) : results.length > 0 ? (
            <>
              <div className="grid-layout">
                {results.map((anime) => (
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="search-pagination flex-center">
                  <button 
                    className="btn btn-secondary pag-btn"
                    disabled={page === 1}
                    onClick={() => {
                      if (genreParam) loadGenreData(genreParam, page - 1);
                      else handleSearchSubmit(page - 1);
                    }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span className="page-lbl">Page {page} of {totalPages}</span>
                  <button 
                    className="btn btn-secondary pag-btn"
                    disabled={!hasNextPage}
                    onClick={() => {
                      if (genreParam) loadGenreData(genreParam, page + 1);
                      else handleSearchSubmit(page + 1);
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="search-empty flex-center text-center">
              <div>
                <SearchIcon size={48} className="search-empty-icon" style={{ margin: "0 auto 1rem", color: "var(--text-muted)" }} />
                <h3>No search results</h3>
                <p className="text-muted" style={{ marginTop: "4px" }}>
                  Try entering keywords or browse genres to explore AniStream's catalog.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .search-page {
          padding-top: calc(var(--header-height) + 20px);
          min-height: 100vh;
        }
        .search-header-panel {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          align-items: center;
        }
        .search-bar-wrapper {
          position: relative;
          flex-grow: 1;
          display: flex;
          align-items: center;
        }
        .search-icon-svg {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input-box {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 2.8rem;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: white;
          font-family: var(--font-family);
          font-size: 1rem;
          transition: var(--transition);
        }
        .search-input-box:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(229, 9, 20, 0.2);
        }
        .clear-search-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .clear-search-btn:hover {
          color: white;
        }

        /* Auto-suggestions dropdown styling */
        .suggestions-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #141414;
          border: 1px solid var(--border);
          border-radius: 8px;
          max-height: 350px;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          z-index: 120;
          padding: 6px;
        }
        .suggestion-item {
          display: flex;
          gap: 12px;
          padding: 8px;
          text-decoration: none;
          color: white;
          border-radius: 6px;
          transition: var(--transition);
        }
        .suggestion-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .suggestion-poster {
          width: 44px;
          height: 60px;
          border-radius: 4px;
          overflow: hidden;
          background-color: #242424;
          flex-shrink: 0;
        }
        .suggestion-poster img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .suggestion-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .suggestion-title {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .suggestion-meta {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .filter-toggle-btn.active {
          border-color: var(--primary);
          color: var(--primary);
        }

        /* Search body columns layout */
        .search-body-panel {
          display: flex;
          gap: 2.5rem;
          align-items: flex-start;
        }
        .filters-sidebar {
          width: 280px;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          flex-shrink: 0;
          position: sticky;
          top: calc(var(--header-height) + 20px);
        }
        .filter-section h3 {
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .filter-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .filter-options button {
          flex-grow: 1;
          background-color: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 6px 12px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 4px;
          font-family: var(--font-family);
          transition: var(--transition);
        }
        .filter-options button.active {
          background-color: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        
        .filter-genres-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
        }
        .filter-genres-grid button {
          background-color: var(--bg);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          padding: 6px 8px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 4px;
          font-family: var(--font-family);
          transition: var(--transition);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .filter-genres-grid button.active {
          background-color: rgba(229, 9, 20, 0.15);
          color: #ff8080;
          border-color: var(--primary);
          font-weight: 700;
        }
        .clear-filters-btn {
          width: 100%;
          font-size: 0.85rem;
        }
        
        .search-results-column {
          flex-grow: 1;
        }
        .search-empty {
          min-height: 40vh;
        }
        
        .search-pagination {
          margin-top: 3rem;
          gap: 1.5rem;
        }
        .page-lbl {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .pag-btn {
          padding: 0.5rem 1.2rem;
          font-size: 0.85rem;
        }

        @media (max-width: 992px) {
          .search-body-panel {
            flex-direction: column;
          }
          .filters-sidebar {
            width: 100%;
            position: relative;
            top: 0;
          }
          .filter-genres-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 768px) {
          .search-header-panel {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-genres-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
