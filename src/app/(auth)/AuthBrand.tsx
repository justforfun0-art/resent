export default function AuthBrand() {
  return (
    <div className="mb-6 flex items-center justify-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-black shadow-lg shadow-fuchsia-500/40">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 7l9 6 9-6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-2xl font-semibold tracking-tight gradient-text">
        Resent
      </span>
    </div>
  );
}
