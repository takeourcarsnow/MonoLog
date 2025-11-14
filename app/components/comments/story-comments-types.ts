// Shared types for story comments
export const STORY_COMMENT_MAX = 500;

export type StoryComment = {
  id: string;
  text: string;
  createdAt: string;
  parentId?: string;
  user: any;
  realId?: string;
};

export type StoryCommentContext = {
  comments: StoryComment[];
  currentUser: any | null;
  replyingTo: string | null;
  replyText: string;
  commentRemaining: number;
  toast: any;
  storyId: string;
  load: (force?: boolean) => Promise<void>;
  addComment: (bodyText: string, parentId?: string) => Promise<void>;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  setSending: (sending: boolean) => void;
  setConfirmingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setComments: React.Dispatch<React.SetStateAction<StoryComment[]>>;
  setCachedComments: (storyId: string, comments: StoryComment[]) => void;
  notifyCount: (n: number) => void;
  sending: boolean;
  confirmingIds: Set<string>;
  router: any;
  replyError: string | null;
  setReplyError: (error: string | null) => void;
};

export type StoryCommentsProps = {
  storyId: string;
  onCountChange?: (n: number) => void;
};