"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { renderMentions } from "@/src/lib/mentions";
import { Calendar, Image, Music, MessageCircle, ChevronDown } from "lucide-react";
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
          icon={<Music size={20} />}
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
                  <div className="post-rank">{weekday.slice(0, 3)}</div>
                  <Link href={`/post/${post.id}`}>
                    <div className="post-thumbnail">
                      {post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url ? (
                        <img
                          src={post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <div className="no-image">📷</div>
                      )}
                    </div>
                  </Link>
                  <div className="post-info">
                    <div className="post-caption" onClick={(e) => e.stopPropagation()}>
                      <div className={`caption-content ${expandedCaptions.has(post.id) ? 'expanded' : 'collapsed'}`}>
                        <div className="caption-inner">
                          {renderMentions(post.caption)}
                        </div>
                        {post.caption.length > 100 && (
                          <div className="caption-fade"></div>
                        )}
                      </div>
                      {post.caption.length > 100 && (
                        <button
                          className="caption-read-more"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleCaptionExpansion(post.id);
                          }}
                          aria-label={expandedCaptions.has(post.id) ? "Show less" : "Read more"}
                        >
                          {expandedCaptions.has(post.id) ? "Show less" : "Read more"}
                          <ChevronDown
                            size={14}
                            className={`read-more-icon ${expandedCaptions.has(post.id) ? 'rotated' : ''}`}
                          />
                        </button>
                      )}
                    </div>
                    <div className="post-stats">
                      <span className="date">
                        {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
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