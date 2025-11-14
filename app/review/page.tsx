"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { renderCaption } from "@/lib/hashtags";
import { Calendar, Image, MessageCircle, ChevronDown, ChartBar, ChevronLeft, ChevronRight, Users, MessageSquare, Camera } from "lucide-react";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import type { WeekReviewStats, MonthReviewStats } from "@/lib/types";
import { WeekReviewSkeleton } from "@/app/components/week-review/WeekReviewSkeleton";
import { StatCard } from "@/app/components/ui/StatCard";

type ReviewType = 'week' | 'month';

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialType = searchParams.get('type') === 'month' ? 'month' : 'week';
  const [reviewType, setReviewType] = useState<ReviewType>(initialType);
  const [stats, setStats] = useState<WeekReviewStats | MonthReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());

  // Allow body scrolling for review page
  useEffect(() => {
    document.body.classList.add('review-page');
    return () => document.body.classList.remove('review-page');
  }, []);

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
        if (reviewType === 'week') {
          const weekStats = await api.weekReviewStats();
          // Sort recent posts by creation date ascending
          weekStats.recentPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setStats(weekStats);
        } else {
          const monthStats = await api.monthReviewStats();
          // Sort recent posts by creation date ascending for timeline view
          monthStats.recentPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setStats(monthStats);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${reviewType} review`);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [reviewType]);

  if (loading) {
    return <WeekReviewSkeleton />;
  }

  if (error) {
    return (
      <div className="review-page">
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const isWeekReview = reviewType === 'week';
  const weekStats = stats as WeekReviewStats;
  const monthStats = stats as MonthReviewStats;

  return (
    <div className="review-page">
      <div className="review-header">
        <h1>{isWeekReview ? 'Week' : 'Month'} in Review</h1>
        <p>Your activity summary for the past {isWeekReview ? '7' : '30'} days</p>
        
        <div className="review-toggle">
          <button
            className={`toggle-btn ${reviewType === 'week' ? 'active' : ''}`}
            onClick={() => {
              setReviewType('week');
              router.replace('/review', { scroll: false });
            }}
          >
            Week
          </button>
          <button
            className={`toggle-btn ${reviewType === 'month' ? 'active' : ''}`}
            onClick={() => {
              setReviewType('month');
              router.replace('/review?type=month', { scroll: false });
            }}
          >
            Month
          </button>
        </div>
      </div>

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

        {!isWeekReview && (
          <>
            <StatCard
              icon={<Users size={20} />}
              title="Communities Joined"
              value={monthStats.communitiesJoined}
            />

            <StatCard
              icon={<MessageSquare size={20} />}
              title="Threads Created"
              value={monthStats.threadsCreated}
            />

            <StatCard
              icon={<Camera size={20} />}
              title="Stories Created"
              value={monthStats.storiesCreated}
            />

            <StatCard
              icon={<ChartBar size={20} />}
              title="Avg Posts/Day"
              value={monthStats.averagePostsPerDay}
            />
          </>
        )}
      </div>

      {!isWeekReview && (
        <div className="insights-section">
          <h2>Insights</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">
                <Calendar size={24} />
              </div>
              <div className="insight-content">
                <h3>Most Active Day</h3>
                <p>{monthStats.mostActiveDay}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.recentPosts.length > 0 && (
        <div className="highlight-section">
          <h2>{isWeekReview ? 'Recent Activity' : 'Recent Posts'}</h2>
          {isWeekReview ? (
            <div className="top-posts">
              {weekStats.recentPosts.map((post, index) => {
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
                            alt="Post thumbnail"
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
          ) : (
            <div className="recent-posts">
              {monthStats.recentPosts.map((post, index) => {
                const date = new Date(post.created_at);
                const formattedDate = date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short'
                });
                return (
                  <div key={post.id} className="recent-post-item">
                    <div className="post-date">{formattedDate}</div>
                    <Link href={`/post/${post.id}`}>
                      <div className="post-thumbnail">
                        {post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url ? (
                          <OptimizedImage
                            src={(post.thumbnail_urls?.[0] || post.thumbnail_url || post.image_urls?.[0] || post.image_url) || ""}
                            alt="Post thumbnail"
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
          )}
        </div>
      )}

      {stats.totalPosts === 0 && (
        <div className="empty-state">
          <div className="empty-icon">
            <ChartBar size={48} style={{ color: 'var(--muted)' }} />
          </div>
          <h3>No posts this {isWeekReview ? 'week' : 'month'}</h3>
          <p>Start sharing your daily moments to see your {isWeekReview ? 'weekly' : 'monthly'} summary here!</p>
        </div>
      )}
    </div>
  );
}