"use client";

import { useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/app/components/Button";
import Link from "next/link";

export function CreateCommunityView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      let imageUrl: string | undefined;
      if (imageFile) {
        // Convert file to data URL
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise((resolve, reject) => {
          reader.onload = resolve;
          reader.onerror = reject;
        });
        const dataUrl = reader.result as string;

        // Upload to storage
        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl })
        });
        if (!uploadRes.ok) throw new Error('Failed to upload image');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      const community = await api.createCommunity({
        name: name.trim(),
        description: description.trim(),
        imageUrl
      });
      router.push(`/communities/${community.slug}`);
    } catch (e: any) {
      setError(e?.message || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div style={{ maxWidth: '42rem', margin: '1rem auto', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid var(--border)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Enter community name"
          maxLength={50}
          required
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '0.25rem', resize: 'none', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Describe what this community is about"
          rows={4}
          maxLength={500}
          required
        />

        <div>
          {!imagePreview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'block',
                margin: '0 auto 0.5rem auto',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-elev)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Upload Community Image
            </button>
          )}
          {imagePreview && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '0.25rem', border: '1px solid var(--border)', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <Button type="submit" variant="ghost" disabled={!name.trim() || !description.trim() || loading} loading={loading}>
            Create Community
          </Button>
          <Link href="/communities">
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}