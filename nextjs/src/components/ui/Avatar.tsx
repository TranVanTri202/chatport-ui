import type { AccountStatus, AvatarSpec } from "@/types";

const STATUS_DOT: Record<AccountStatus, string> = {
  online: "var(--accent)",
  syncing: "#f5b042",
  offline: "#5a6470",
  expired: "var(--danger)",
};

interface AvatarProps {
  readonly spec: Pick<AvatarSpec, "hue" | "initials" | "img">;
  readonly size?: number;
  readonly status?: AccountStatus;
}

/** Tonal avatar tile. Renders an uploaded image when present, else initials. */
export function Avatar({ spec, size = 40, status }: AvatarProps): JSX.Element {
  const { hue, initials, img } = spec;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="grid place-items-center overflow-hidden font-semibold"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          fontSize: size * 0.36,
          color: `hsl(${hue} 30% 74%)`,
          background: img
            ? `center/cover no-repeat url("${img}")`
            : `linear-gradient(145deg, hsl(${hue} 22% 27%), hsl(${hue} 24% 18%))`,
          border: `1px solid hsl(${hue} 22% 32% / .5)`,
        }}
      >
        {img ? "" : initials}
      </div>
      {status ? (
        <span
          className="absolute rounded-full"
          style={{
            right: -1,
            bottom: -1,
            width: size * 0.28,
            height: size * 0.28,
            background: STATUS_DOT[status],
            border: "2.5px solid var(--surface-0)",
          }}
        />
      ) : null}
    </div>
  );
}
