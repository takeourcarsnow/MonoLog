import { useState } from "react";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import { dedupe } from "@/lib/requestDeduplication";
import type { Story } from "@/lib/types";

export function useStoryUpload(userId: string, setHasActiveStories: (has: boolean) => void, setOwnStories: (stories: Story[]) => void) {
  const [storyUploading, setStoryUploading] = useState(false);

  const handleStoryChangeFromFile = async (file: File) => {
    setStoryUploading(true);
    setHasActiveStories(true); // Optimistic update
    try {
      const dataUrl = await compressImage(file);
      const parts = dataUrl.split(',');
      const meta = parts[0];
      const mime = meta.split(':')[1].split(';')[0];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const processedFile = new File([u8arr], `${uid()}.jpg`, { type: mime });

      const sb = getSupabaseClient();
      const userObj = await api.getCurrentUser();
      if (!userObj) throw new Error("Not logged in");
      const uploaderId = userObj.id;
      if (!uploaderId) throw new Error("Cannot determine user id for story upload");
      const path = `stories/${uploaderId}/${processedFile.name}`;
      const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, processedFile, { upsert: true, contentType: processedFile.type, cacheControl: 'public, max-age=31536000, immutable' });
      if (uploadErr) throw uploadErr;
      const urlRes = sb.storage.from("posts").getPublicUrl(path);
      const publicUrl = urlRes.data.publicUrl;

      await api.createStory({ mediaUrl: publicUrl, mediaType: 'image' });

      // Refresh stories
      const stories = await dedupe(`getActiveStoriesForUser:${userId}`, () => api.getActiveStoriesForUser(userId));
      setHasActiveStories(stories.length > 0);
      setOwnStories(stories);
    } catch (e: any) {
      console.warn(e?.message || "Failed to upload story");
      // Refresh to correct state on failure
      try {
        const stories = await dedupe(`getActiveStoriesForUser:${userId}`, () => api.getActiveStoriesForUser(userId));
        setHasActiveStories(stories.length > 0);
        setOwnStories(stories);
      } catch (_) {
        // ignore
      }
    } finally {
      setStoryUploading(false);
    }
  };

  const handleLiveCameraCapture = async (blob: Blob) => {
    setStoryUploading(true);
    try {
      const file = new File([blob], `story-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await handleStoryChangeFromFile(file);
    } catch (e: any) {
      console.warn(e?.message || "Failed to process camera capture");
      setStoryUploading(false);
    }
  };

  return { storyUploading, handleStoryChangeFromFile, handleLiveCameraCapture };
}