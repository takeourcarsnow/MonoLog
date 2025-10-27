"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { renderCaption } from "@/src/lib/hashtags";
import { Calendar, Image, MessageCircle, ChevronDown } from "lucide-react";
import { OptimizedImage } from "@/app/components/OptimizedImage";
import type { WeekReviewStats } from "@/src/lib/types";

export default function WeekReviewPage() {
  const [stats, setStats] = useState<WeekReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());

  const toggleCaptionExpansion = (postId: string) => {
    setExpandedCaptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const weekStats = await api.weekReviewStats();
        // Sort recent posts by creation date ascending
        weekStats.recentPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setStats(weekStats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load week review');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    // Allow body scrolling on week-review page
    document.body.classList.add('week-review-page-scroll');
    document.documentElement.classList.add('week-review-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('week-review-page-scroll');
      document.documentElement.classList.remove('week-review-page-scroll');
    };
  }, []);

  if (loading) {
    return (
      <div className="week-review-page">
        <div className="loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="week-review-page">
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const StatCard = ({ icon, title, value }: { icon: React.ReactNode; title: string; value: string | number }) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
    </div>
  );

  return (
    <div className="week-review-page">
      <div className="stats-grid">
        <StatCard
          icon={<Calendar size={20} />}
          title="Posts"
          value={stats.totalPosts}
        />

        <StatCard
          icon={<Image size={20} />}
          title="Photos"
          value={stats.totalImages}
        />

        <StatCard
          icon={<MessageCircle size={20} />}
          title="Comments Made"
          value={stats.commentsMade}
        />

        <StatCard
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z" />
            </svg>
          }
          title="Music Links"
          value={stats.spotifyLinks}
        />
      </div>

      {stats.recentPosts.length > 0 && (
        <div className="highlight-section">
          <div className="top-posts">
            {stats.recentPosts.map((post, index) => {
              const weekday = new Date(post.created_at).toLocaleDateString('en-US', { weekday: 'long' });
              return (
                <div key={post.id} className="top-post-item">
                  <div className="weekday-section">
                    <div className="post-rank">{weekday.slice(0, 3)}</div>
                    <div className="post-date">
                      {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <Link href={`/post/${post.id}`}>
                    <div className="post-thumbnail">
                        {post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url ? (
                        <OptimizedImage
                          src={(post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url) || ""}
                          alt=""
                          width={48}
                          height={48}
                          sizes="48px"
                          loading="lazy"
                          placeholder="empty"
                          unoptimized={false}
                        />
                      ) : (
                        <div className="no-image">📷</div>
                      )}
                    </div>
                  </Link>
                  <div className="post-info">
                    <div 
                      className="post-caption" 
                      onClick={() => !expandedCaptions.has(post.id) && toggleCaptionExpansion(post.id)}
                      style={{ cursor: !expandedCaptions.has(post.id) && post.caption.length > 100 ? 'pointer' : 'default' }}
                    >
                      <div className={`caption-content ${expandedCaptions.has(post.id) ? 'expanded' : 'collapsed'}`}>
                        <div className="caption-inner">
                          {renderCaption(post.caption)}
                        </div>
                        {post.caption.length > 100 && (
                          <div className="caption-fade"></div>
                        )}
                      </div>
                      {post.caption.length > 100 && expandedCaptions.has(post.id) && (
                        <button
                          className="caption-read-more"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleCaptionExpansion(post.id);
                          }}
                          aria-label="Show less"
                        >
                          <ChevronDown
                            size={14}
                            className={`read-more-icon rotated`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.totalPosts === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No posts this week</h3>
          <p>Start sharing your daily moments to see your weekly summary here!</p>
        </div>
      )}
    </div>
  );
}