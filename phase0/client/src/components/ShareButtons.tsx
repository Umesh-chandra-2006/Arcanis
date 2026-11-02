import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useNameGate } from "@/components/NameDialog";
import { Button } from "@/components/ui/button";
import { shareUrlFor } from "@/lib/share";
import { discordText, shareText, whatsappUrl, xUrl } from "@shared/share-links";
import { Check, Copy, MessageCircle, MessageSquare, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";

type Channel = "copy" | "twitter" | "whatsapp" | "discord" | "native";

/**
 * Sharing a spell the player owns (task M5). The link always carries their
 * referral code, and a share asks for a mage name first (Master Doc 18.2).
 */
export function ShareButtons({ spellId, spellName, className }: { spellId: string; spellName: string; className?: string }) {
  const { isAuthenticated } = useAuth();
  const myCode = trpc.referrals.myCode.useQuery(undefined, { enabled: isAuthenticated, staleTime: Infinity });
  const track = trpc.analytics.track.useMutation();
  const { gate, dialog } = useNameGate();
  const [copied, setCopied] = useState<"link" | "discord" | null>(null);
  const url = shareUrlFor(spellId, myCode.data?.code);
  const canShareNatively = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const record = (channel: Channel) => track.mutate({ eventType: "share_clicked", metadata: { spellId, channel } }, { onError: () => {} });

  const copy = async (text: string, which: "link" | "discord", channel: Channel) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error("Could not copy that. Your browser blocked it.");
      return;
    }
    record(channel);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const open = (href: string, channel: Channel) => {
    record(channel);
    window.open(href, "_blank", "noopener");
  };

  const shareNatively = async () => {
    record("native");
    try {
      await navigator.share({ title: spellName, text: shareText(spellName), url });
    } catch {
      // Closing the share sheet rejects; nothing is wrong.
    }
  };

  return (
    <div className={className ?? "flex flex-wrap items-center justify-center gap-3"}>
      {dialog}
      {canShareNatively && (
        <Button onClick={() => gate(shareNatively)}>
          <Share2 /> Share
        </Button>
      )}
      <Button variant="outline" onClick={() => gate(() => open(whatsappUrl(spellName, url), "whatsapp"))}>
        <MessageCircle /> WhatsApp
      </Button>
      <Button variant="outline" onClick={() => gate(() => open(xUrl(spellName, url), "twitter"))}>
        <Twitter /> Post on X
      </Button>
      <Button variant="outline" onClick={() => gate(() => copy(discordText(spellName, url), "discord", "discord"))}>
        {copied === "discord" ? <Check /> : <MessageSquare />} {copied === "discord" ? "Copied" : "Discord"}
      </Button>
      <Button variant="outline" onClick={() => gate(() => copy(url, "link", "copy"))}>
        {copied === "link" ? <Check /> : <Copy />} {copied === "link" ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
