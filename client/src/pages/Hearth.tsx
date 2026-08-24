import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Panel } from "@/components/game/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SpellCard } from "@/components/game/spell-card";
import { mapSpellToCardProps } from "@/lib/adapters";
import { toast } from "sonner";
import { Flame, Loader2, Trash2, Send, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hearth() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedSpellId, setSelectedSpellId] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // tRPC queries & mutations
  const utils = trpc.useUtils();
  const postsQuery = trpc.hearth.listPosts.useQuery({ limit: 25, offset: 0 });
  const libraryQuery = trpc.lab.getLibrary.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const createPostMutation = trpc.hearth.createPost.useMutation({
    onSuccess: () => {
      toast.success("Post published to The Hearth!");
      setContent("");
      setSelectedSpellId("");
      setValidationError(null);
      utils.hearth.listPosts.invalidate();
    },
    onError: (error) => {
      setValidationError(error.message);
      toast.error(error.message);
    },
  });

  const deletePostMutation = trpc.hearth.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted.");
      utils.hearth.listPosts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setValidationError("Post content cannot be empty.");
      return;
    }
    if (trimmed.length > 500) {
      setValidationError("Post exceeds the 500 character limit.");
      return;
    }

    createPostMutation.mutate({
      content: trimmed,
      attachedSpellId: selectedSpellId || undefined,
    });
  };

  const userSpells = libraryQuery.data?.userSpells || [];
  const selectedSpell = userSpells.find((s: any) => s.id === selectedSpellId);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Flame size={28} className="text-primary animate-pulse" />
          <h1 className="font-serif text-3xl font-bold tracking-wide">The Hearth</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          The global communication feed of Arcanis. Share thoughts, duel experiences, and spellcraft across all realms.
        </p>
      </div>

      {/* Post Composer */}
      {user && (
        <Panel title="Kindle a Post">
          <form onSubmit={handlePublish} className="space-y-4 pt-1">
            <div className="relative">
              <Textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="What whispers through the ley lines tonight? Write a message to all mages..."
                rows={4}
                className="bg-background/80 border-border focus:border-primary text-sm resize-none pr-12"
              />
              <span
                className={`absolute bottom-2.5 right-3 font-mono text-[11px] ${
                  content.length > 450 ? "text-amber-400 font-semibold" : "text-muted-foreground"
                }`}
              >
                {content.length}/500
              </span>
            </div>

            {/* Error Notification */}
            {validationError && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Attach Spell Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary shrink-0" />
                <label htmlFor="attach-spell-select" className="text-xs text-muted-foreground font-medium">Attach Spell Card:</label>
                <select
                  id="attach-spell-select"
                  aria-label="Attach Spell Card"
                  value={selectedSpellId}
                  onChange={(e) => setSelectedSpellId(e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">None (Text only)</option>
                  {userSpells.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.element} • {s.tier})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={createPostMutation.isPending || !content.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs px-5 py-2 flex items-center gap-2"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Publish Post
                  </>
                )}
              </Button>
            </div>

            {/* Attached Spell Preview */}
            {selectedSpell && (
              <div className="mt-3 p-3 rounded-md border border-primary/30 bg-secondary/30 flex items-center gap-4">
                <SpellCard spell={mapSpellToCardProps(selectedSpell as any)} size="sm" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-primary">{selectedSpell.name}</p>
                  <p className="text-muted-foreground line-clamp-2 italic">
                    "{selectedSpell.loreLine || selectedSpell.flavorText}"
                  </p>
                </div>
              </div>
            )}
          </form>
        </Panel>
      )}

      {/* Global Stream Feed */}
      <Panel title="Global Chronicle Feed">
        {postsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : !postsQuery.data?.posts || postsQuery.data.posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            The Hearth is quiet. Be the first mage to kindle a post!
          </p>
        ) : (
          <div className="space-y-4 pt-1">
            <AnimatePresence>
              {postsQuery.data.posts.map((post: any) => {
                const isAuthor = user?.id === post.author.id;
                const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 rounded-md border border-border bg-card/60 space-y-3 relative group"
                  >
                    {/* Author & Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-secondary text-xs font-bold text-primary">
                          {post.author.username?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold leading-none">{post.author.username}</p>
                          <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
                        </div>
                      </div>

                      {/* Author Delete Option */}
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => deletePostMutation.mutate({ postId: post.id })}
                          disabled={deletePostMutation.isPending}
                          title="Delete Post"
                          aria-label="Delete Post"
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors opacity-70 group-hover:opacity-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 font-serif">
                      {post.content}
                    </p>

                    {/* Attached Spell Card */}
                    {post.attachedSpell && (
                      <div className="pt-2">
                        <SpellCard spell={mapSpellToCardProps(post.attachedSpell)} size="sm" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Panel>
    </div>
  );
}
