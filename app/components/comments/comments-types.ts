// Shared types for comments
export const COMMENT_MAX = 500;

export type Comment = {
  id: string;
  text: string;
  createdAt: string;
  parentId?: string;
  user: any;
};

export type CommentContext = {
  comments: Comment[];
  newCommentId: string | null;
  removingIds: Set<string>;
  currentUser: any | null;
  replyingTo: string | null;
  replyText: string;
  commentRemaining: number;
  sendAnim: 'following-anim' | null;
  toast: any;
  postId: string;
  load: (force?: boolean) => Promise<void>;
  doOptimisticAdd: (bodyText: string, parentId?: string) => Promise<void>;
  setReplyingTo: (id: string | null) => void;
  setReplyText: (text: string) => void;
  setSending: (sending: boolean) => void;
  setSendAnim: (anim: 'following-anim' | null) => void;
  setConfirmingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  confirmTimers: React.MutableRefObject<Map<string, number>>;
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  setCachedComments: (postId: string, comments: Comment[]) => void;
  notifyCount: (n: number) => void;
  setRemovingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
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