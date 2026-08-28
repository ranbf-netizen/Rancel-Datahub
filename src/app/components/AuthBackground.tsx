// Subtle, lightweight animated background for the login / register pages.
// Pure CSS (drifting blurred gradient blobs) — no JS loop, so it stays smooth
// and battery-friendly on low-end phones. Sits behind the form.
export default function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="animate-auth-blob absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="animate-auth-blob absolute right-[-60px] top-1/3 h-80 w-80 rounded-full bg-mtn/20 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="animate-auth-blob absolute bottom-[-80px] left-1/4 h-72 w-72 rounded-full bg-telecel/15 blur-3xl"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}
