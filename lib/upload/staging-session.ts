export type StagingSession<T> = {
  baseline: T;
  staged: T | null;
};

export type StagingAdapter<T> = {
  empty(): T;
  hasValue(value: T): boolean;
  equals(a: T, b: T): boolean;
};

export type StagingEffects<T> = {
  delete(value: T): void | Promise<void>;
};

export function createEmptyStagingSession<T>(adapter: StagingAdapter<T>): StagingSession<T> {
  return {
    baseline: adapter.empty(),
    staged: null,
  };
}

export function beginStagingSession<T>(
  initialBaseline: T,
  adapter: StagingAdapter<T>,
): StagingSession<T> {
  return {
    baseline: initialBaseline,
    staged: null,
  };
}

export function clearStaged<T>(session: StagingSession<T>): void {
  session.staged = null;
}

export function stageUpload<T>(
  session: StagingSession<T>,
  value: T,
  adapter: StagingAdapter<T>,
): void {
  session.staged = adapter.hasValue(value) ? value : null;
}

export function getReplaced<T>(
  previous: T,
  next: T,
  adapter: StagingAdapter<T>,
): T | null {
  if (!adapter.hasValue(previous)) return null;
  if (adapter.equals(previous, next)) return null;
  return previous;
}

export function rollbackStagingSession<T>(
  session: StagingSession<T>,
  adapter: StagingAdapter<T>,
  effects: StagingEffects<T>,
): void {
  if (!session.staged) {
    clearStaged(session);
    return;
  }
  const stagedToDelete = getReplaced(session.staged, session.baseline, adapter);
  if (stagedToDelete) {
    void effects.delete(stagedToDelete);
  }
  clearStaged(session);
}

export function commitStagingBaseline<T>(
  session: StagingSession<T>,
  nextBaseline: T,
  adapter: StagingAdapter<T>,
): T | null {
  const replacedBaseline = getReplaced(session.baseline, nextBaseline, adapter);
  session.baseline = nextBaseline;
  clearStaged(session);
  return replacedBaseline;
}
