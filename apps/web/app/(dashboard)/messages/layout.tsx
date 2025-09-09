// app/(dashboard)/messages/layout.tsx
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full overflow-hidden">{children}</div>;
}
