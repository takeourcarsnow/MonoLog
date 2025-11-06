// Shared types for comments
export const COMMENT_MAX = 500;

export type Comment = {
  id: string;
  text: string;
  createdAt: string;
  parentId?: string;
  user: any;
  realId?: string;
};

export type CommentContext = {
  comments: Comment[];
  currentUser: any | null;
  replyingTo: string | null;
  replyText: string;
  commentRemaining: number;
  toast: any;
  postId: string;
  load: (force?: boolean) => Promise<void>;
  addComment: (bodyText: string, parentId?: string) => Promise<void>;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  setSending: (sending: boolean) => void;
  setConfirmingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  setCachedComments: (postId: string, comments: Comment[]) => void;
  notifyCount: (n: number) => void;
  sending: boolean;
  confirmingIds: Set<string>;
  router: any;
  replyError: string | null;
  setReplyError: (error: string | null) => void;
};

export type CommentsProps = {
  postId: string;
  onCountChange?: (n: number) => void;
};