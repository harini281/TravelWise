export default function AuthBar({ user, onLogout, onOpenSignIn }) {
  if (!user)
    return (
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={onOpenSignIn}
      >
        Sign In
      </button>
    );
  return (
    <div className="tw-actions">
      <span style={{ fontSize: ".85rem", color: "var(--text-primary)" }}>
        {user.fullName || user.username}
      </span>
      <span className="badge badge-info">{user.role}</span>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={onLogout}
        title="Sign out of account"
      >
        Sign Out
      </button>
    </div>
  );
}
