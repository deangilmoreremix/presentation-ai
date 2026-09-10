import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { clearPresentationChat } from "@/app/_actions/notebook/presentation/clearPresentationChat";

/**
 * Hook: clear a presentation's agent chat.
 *
 * Calls the `clearPresentationChat` server action (which authenticates
 * the caller and returns success) and surfaces errors via a sonner
 * toast. The actual clearing of the visible chat messages is handled
 * by the caller via `useChat.setMessages([])` after this mutation
 * resolves.
 */
export function useClearPresentationChat() {
  const { mutate: clearChatMutation, isPending } = useMutation({
    mutationFn: (presentationId: string) =>
      clearPresentationChat(presentationId),
    onError: () => {
      toast.error("Failed to clear presentation chat");
    },
  });
  return { clearChat: clearChatMutation, isPending };
}
