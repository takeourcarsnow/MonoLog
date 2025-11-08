import { createContext, useContext, ReactNode } from 'react';
import type { HydratedPost } from '@/lib/types';

interface PostContextType {
  post: HydratedPost;
  setPost: (post: HydratedPost) => void;
  // Add other shared state as needed
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children, post, setPost }: { children: ReactNode; post: HydratedPost; setPost: (post: HydratedPost) => void }) {
  return (
    <PostContext.Provider value={{ post, setPost }}>
      {children}
    </PostContext.Provider>
  );
}

export function usePostContext() {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error('usePostContext must be used within a PostProvider');
  }
  return context;
}