"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Props = {
  postId: string;
  onCountChange?: (n: number) => void;
};

export function Comments({ postId, onCountChange }: Props) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const list = await api.getComments(postId);
    setComments(list);
    onCountChange?.(list.length);
  };

  useEffect(() => { load(); }, [postId]);

  return (
    <div>
      <div className="comment-list">
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <img className="comment-avatar" src={c.user?.avatarUrl || ""} alt={c.user?.displayName || "User"} />
            <div className="comment-body">
              <div className="comment-head">
                <span className="author">{c.user?.displayName || "User"}</span>
                <span className="dim">{new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="comment-box" style={{ marginTop: 8 }}>
        <input
          className="input"
          type="text"
          placeholder="Add a comment…"
          aria-label="Add a comment"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              if (!text.trim()) return;
              setSending(true);
              await api.addComment(postId, text);
              setText("");
              await load();
              setSending(false);
            }
          }}
        />
        <button
          className="btn primary"
          onClick={async () => {
            if (!text.trim()) return;
            setSending(true);
            await api.addComment(postId, text);
            setText("");
            await load();
            setSending(false);
          }}
          disabled={sending}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}