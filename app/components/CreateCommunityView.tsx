"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Button } from "@/app/components/Button";
import Link from "next/link";

export function CreateCommunityView() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      const community = await api.createCommunity({
        name: name.trim(),
        description: description.trim()
      });
      router.push(`/communities/${community.id}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="content-header">
        <h1 className="content-title">Create Community</h1>
        <p className="content-subtitle">Start a new community for discussions</p>
      </div>
      <div className="content-body">
        <div className="card max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Community Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter community name"
                maxLength={50}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{name.length}/50 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Describe what this community is about"
                rows={4}
                maxLength={500}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{description.length}/500 characters</p>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={!name.trim() || !description.trim() || loading} loading={loading}>
                Create Community
              </Button>
              <Link href="/communities">
                <Button variant="ghost">Cancel</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}