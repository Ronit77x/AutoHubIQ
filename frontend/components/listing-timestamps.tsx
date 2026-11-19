const format = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  timeZone: "Asia/Kolkata", hour12: true,
});

export default function ListingTimestamps({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  return <div className="mt-3 space-y-1 text-xs text-slate-500">
    <p>Created: <time dateTime={createdAt}>{format.format(new Date(createdAt))} IST</time></p>
    <p>Last updated: <time dateTime={updatedAt}>{format.format(new Date(updatedAt))} IST</time></p>
  </div>;
}
