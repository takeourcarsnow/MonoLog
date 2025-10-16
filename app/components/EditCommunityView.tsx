"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/app/components/Button";
import Link from "next/link";
import { compressImage } from "@/src/lib/image";
import { getSupabaseClient, getAccessToken } from "@/src/lib/api/client";
import { AuthRequired } from "./AuthRequired";
import { AuthForm } from "./AuthForm";
import type { HydratedCommunity } from "@/src/lib/types";

export function EditCommunityView() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [community, setCommunity] = useState<HydratedCommunity | null>(null);
  const [communityLoading, setCommunityLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch (e) {
        // User not authenticated
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const loadCommunity = async () => {
      if (!slug) return;
      try {
        setCommunityLoading(true);
        const communityData = await api.getCommunity(slug);
        if (!communityData) {
          setError('Community not found');
          return;
        }
        setCommunity(communityData);
        setName(communityData.name);
        setDescription(communityData.description);
        if (communityData.imageUrl) {
          setImagePreview(communityData.imageUrl);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load community');
      } finally {
        setCommunityLoading(false);
      }
    };
    loadCommunity();
  }, [slug]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress the image
      const compressed = await compressImage(file);
      setImageFile(file);
      setImagePreview(compressed);
    } catch (err) {
      setError("Failed to process image");
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !imagePreview) return null;

    try {
      const sb = getSupabaseClient();
      const token = await getAccessToken(sb);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          dataUrl: imagePreview,
          filename: imageFile.name
        })
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return result.publicUrl;
    } catch (err) {
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Upload image if selected
      let imageUrl: string | undefined = undefined;
      if (imageFile) {
        imageUrl = await uploadImage() || undefined;
      } else if (imagePreview && !imageFile) {
        // Keep existing image if no new file selected but preview exists
        imageUrl = imagePreview;
      }

      await api.updateCommunity(slug, {
        name: name.trim(),
        description: description.trim(),
        imageUrl
      });

      router.push(`/communities/${community?.slug}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to update community');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || communityLoading) {
    return (
      <div className="content">
        <div className="content-body">
          <div className="card max-w-2xl">
            <div className="animate-pulse space-y-6">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthRequired>
        <AuthForm onClose={async () => {
          const user = await api.getCurrentUser();
          setCurrentUser(user);
        }} />
      </AuthRequired>
    );
  }

  if (!community) {
    return (
      <div className="content">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{error || 'Community not found'}</p>
            <Link href="/communities">
              <Button>Back to Communities</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is the creator
  if (community.creator.id !== currentUser.id) {
    return (
      <div className="content">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">You can only edit communities you created</p>
            <Link href={`/communities/${community.slug}`}>
              <Button>Back to Community</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="content-header">
        <div className="text-center w-full">
          <h1 className="content-title">Edit Community</h1>
          <p className="content-subtitle">Update your community details</p>
        </div>
      </div>
      <div className="content-body">
        <div className="card max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="sr-only">
                Community Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Enter community name"
                maxLength={50}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{name.length}/50 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="sr-only">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md resize-none bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                placeholder="Describe what this community is about"
                rows={4}
                maxLength={500}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{description.length}/500 characters</p>
            </div>

            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Community Image (optional)
              </label>
              <input
                type="file"
                id="image"
                accept="image/*"
                onChange={handleImageSelect}
                className="w-full p-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Community preview"
                    className="w-32 h-32 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={!name.trim() || !description.trim() || loading} loading={loading}>
                Update Community
              </Button>
              <Link href={`/communities/${community.slug}`}>
                <Button variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}