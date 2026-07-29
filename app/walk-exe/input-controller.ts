export type WalkInputAction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "sprint"
  | "crouch";

export type InputSlice = {
  durationSeconds: number;
  forward: number;
  strafe: number;
  sprint: boolean;
  crouch: boolean;
};

export type InputAxesSnapshot = Omit<InputSlice, "durationSeconds">;

export type InputControllerSnapshot = InputAxesSnapshot & {
  sampled: InputAxesSnapshot;
  activeSources: string[];
  pendingTransitions: number;
  lastTransitionAt: number | null;
};

type InputTransition = {
  sequence: number;
  timestampMs: number;
  action: WalkInputAction;
  source: string;
  pressed: boolean;
};

type ActionSources = Record<WalkInputAction, Set<string>>;

const ACTIONS: readonly WalkInputAction[] = [
  "forward",
  "backward",
  "left",
  "right",
  "sprint",
  "crouch",
];

const EPSILON_MS = 1e-7;

function createActionSources(): ActionSources {
  return {
    forward: new Set<string>(),
    backward: new Set<string>(),
    left: new Set<string>(),
    right: new Set<string>(),
    sprint: new Set<string>(),
    crouch: new Set<string>(),
  };
}

function finiteTimestamp(timestampMs: number) {
  return Number.isFinite(timestampMs) ? Math.max(0, timestampMs) : 0;
}

function axesFromSources(sources: ActionSources): InputAxesSnapshot {
  return {
    forward:
      Number(sources.forward.size > 0) - Number(sources.backward.size > 0),
    strafe: Number(sources.right.size > 0) - Number(sources.left.size > 0),
    sprint: sources.sprint.size > 0,
    crouch: sources.crouch.size > 0,
  };
}

function equalAxes(first: InputAxesSnapshot, second: InputAxesSnapshot) {
  return (
    first.forward === second.forward &&
    first.strafe === second.strafe &&
    first.sprint === second.sprint &&
    first.crouch === second.crouch
  );
}

function applyTransition(sources: ActionSources, transition: InputTransition) {
  if (transition.pressed) {
    sources[transition.action].add(transition.source);
  } else {
    sources[transition.action].delete(transition.source);
  }
}

export function walkInputActionForCode(
  code: string,
): WalkInputAction | null {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      return "forward";
    case "KeyS":
    case "ArrowDown":
      return "backward";
    case "KeyA":
    case "ArrowLeft":
      return "left";
    case "KeyD":
    case "ArrowRight":
      return "right";
    case "ShiftLeft":
    case "ShiftRight":
      return "sprint";
    case "ControlLeft":
    case "ControlRight":
      return "crouch";
    default:
      return null;
  }
}

/**
 * Keeps browser input on the same monotonic timeline as the fixed simulation.
 * Press/release transitions are replayed inside each fixed window, so a short
 * tap contributes only its real duration and a release never creates a tail.
 */
export class WalkInputController {
  private readonly liveSources = createActionSources();
  private readonly sampledSources = createActionSources();
  private transitions: InputTransition[] = [];
  private nextSequence = 1;
  private consumedUntilMs: number | null = null;
  private lastTransitionAt: number | null = null;

  press(
    action: WalkInputAction,
    source: string,
    timestampMs: number,
  ): boolean {
    return this.setPressed(action, source, true, timestampMs);
  }

  release(
    action: WalkInputAction,
    source: string,
    timestampMs: number,
  ): boolean {
    return this.setPressed(action, source, false, timestampMs);
  }

  releaseSource(source: string, timestampMs: number): boolean {
    let changed = false;
    for (const action of ACTIONS) {
      if (this.liveSources[action].has(source)) {
        changed =
          this.setPressed(action, source, false, timestampMs) || changed;
      }
    }
    return changed;
  }

  reset(timestampMs: number) {
    const timestamp = finiteTimestamp(timestampMs);
    const releases: Array<{
      action: WalkInputAction;
      source: string;
    }> = [];
    for (const action of ACTIONS) {
      for (const source of this.liveSources[action]) {
        releases.push({ action, source });
      }
    }
    for (const release of releases) {
      this.setPressed(release.action, release.source, false, timestamp);
    }
  }

  consumeWindow(startMs: number, endMs: number): InputSlice[] {
    let start = finiteTimestamp(startMs);
    let end = Math.max(start, finiteTimestamp(endMs));
    this.sortTransitions();

    if (this.consumedUntilMs === null) {
      this.consumedUntilMs = start;
    }

    if (start < this.consumedUntilMs) {
      start = this.consumedUntilMs;
      end = Math.max(start, end);
    } else if (start > this.consumedUntilMs) {
      this.applyTransitionsThrough(start);
      this.consumedUntilMs = start;
    }

    const slices: InputSlice[] = [];
    let cursor = start;
    let processed = 0;

    while (processed < this.transitions.length) {
      const transition = this.transitions[processed];
      if (transition.timestampMs > end + EPSILON_MS) break;

      const transitionAt = Math.max(
        cursor,
        Math.min(end, transition.timestampMs),
      );
      this.pushSlice(slices, cursor, transitionAt);
      applyTransition(this.sampledSources, transition);
      cursor = transitionAt;
      processed += 1;
    }

    if (processed > 0) {
      this.transitions.splice(0, processed);
    }
    this.pushSlice(slices, cursor, end);
    this.consumedUntilMs = end;

    if (slices.length === 0) {
      const axes = axesFromSources(this.sampledSources);
      slices.push({ durationSeconds: 0, ...axes });
    }
    return slices;
  }

  getSnapshot(): InputControllerSnapshot {
    const live = axesFromSources(this.liveSources);
    const sampled = axesFromSources(this.sampledSources);
    const activeSources: string[] = [];
    for (const action of ACTIONS) {
      for (const source of this.liveSources[action]) {
        activeSources.push(`${action}:${source}`);
      }
    }
    activeSources.sort();
    return {
      ...live,
      sampled,
      activeSources,
      pendingTransitions: this.transitions.length,
      lastTransitionAt: this.lastTransitionAt,
    };
  }

  private setPressed(
    action: WalkInputAction,
    source: string,
    pressed: boolean,
    timestampMs: number,
  ) {
    const normalizedSource = source.trim();
    if (!normalizedSource) return false;
    const active = this.liveSources[action].has(normalizedSource);
    if (active === pressed) return false;

    if (pressed) {
      this.liveSources[action].add(normalizedSource);
    } else {
      this.liveSources[action].delete(normalizedSource);
    }

    const timestamp = Math.max(
      this.consumedUntilMs ?? 0,
      finiteTimestamp(timestampMs),
    );
    this.transitions.push({
      sequence: this.nextSequence,
      timestampMs: timestamp,
      action,
      source: normalizedSource,
      pressed,
    });
    this.nextSequence += 1;
    this.lastTransitionAt = timestamp;
    return true;
  }

  private sortTransitions() {
    this.transitions.sort(
      (first, second) =>
        first.timestampMs - second.timestampMs ||
        first.sequence - second.sequence,
    );
  }

  private applyTransitionsThrough(timestampMs: number) {
    let processed = 0;
    while (processed < this.transitions.length) {
      const transition = this.transitions[processed];
      if (transition.timestampMs > timestampMs + EPSILON_MS) break;
      applyTransition(this.sampledSources, transition);
      processed += 1;
    }
    if (processed > 0) {
      this.transitions.splice(0, processed);
    }
  }

  private pushSlice(
    slices: InputSlice[],
    startMs: number,
    endMs: number,
  ) {
    const durationSeconds = Math.max(0, endMs - startMs) / 1000;
    if (durationSeconds <= EPSILON_MS / 1000) return;
    const axes = axesFromSources(this.sampledSources);
    const previous = slices.at(-1);
    if (previous && equalAxes(previous, axes)) {
      previous.durationSeconds += durationSeconds;
      return;
    }
    slices.push({ durationSeconds, ...axes });
  }
}
