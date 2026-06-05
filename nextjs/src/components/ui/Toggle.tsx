interface ToggleProps {
  readonly on: boolean;
  readonly onChange: (next: boolean) => void;
  readonly disabled?: boolean;
}

export function Toggle({ on, onChange, disabled = false }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className="relative shrink-0 rounded-full transition-colors disabled:opacity-40"
      style={{ width: 34, height: 20, background: on ? "var(--accent)" : "var(--surface-3)" }}
    >
      <span
        className="absolute rounded-full transition-[left]"
        style={{
          top: 3,
          left: on ? 17 : 3,
          width: 14,
          height: 14,
          background: on ? "#0a1f16" : "var(--muted)",
        }}
      />
    </button>
  );
}
