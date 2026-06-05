import { ChatView } from "@/components/chat/ChatView";

interface ChatPageProps {
  readonly searchParams: { readonly account?: string };
}

/** Route: "/chat" — messages workspace (optionally deep-linked to ?account=ID). */
export default function ChatPage({ searchParams }: ChatPageProps): JSX.Element {
  return <ChatView initialAccountId={searchParams.account} />;
}
