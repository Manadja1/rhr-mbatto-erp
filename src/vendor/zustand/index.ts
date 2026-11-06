import { useSyncExternalStore } from "react";

export type SetState<T> = (
  partial: T | Partial<T> | ((state: T) => T | Partial<T>),
  replace?: boolean
) => void;

export type GetState<T> = () => T;

export type Subscribe<T> = (listener: (state: T, prevState: T) => void) => () => void;

export interface StoreApi<T> {
  setState: SetState<T>;
  getState: GetState<T>;
  subscribe: Subscribe<T>;
}

export type StateCreator<T> = (
  set: SetState<T>,
  get: GetState<T>,
  api: StoreApi<T>
) => T;

export type UseBoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  setState: SetState<T>;
  getState: GetState<T>;
  subscribe: Subscribe<T>;
};

function createStoreImpl<T extends object>(createState: StateCreator<T>): UseBoundStore<T> {
  let state: T;
  const listeners = new Set<(state: T, prevState: T) => void>();

  const setState: SetState<T> = (partial, replace) => {
    const nextState =
      typeof partial === "function"
        ? (partial as (state: T) => T | Partial<T>)(state)
        : partial;

    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = replace
        ? (nextState as T)
        : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };

  const getState: GetState<T> = () => state;

  const subscribe: Subscribe<T> = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const api: StoreApi<T> = { setState, getState, subscribe };
  state = createState(setState, getState, api);

  const useBoundStore = (<U = T>(selector?: (state: T) => U): U => {
    const select = selector || ((s: T) => s as unknown as U);
    return useSyncExternalStore(
      subscribe,
      () => select(getState()),
      () => select(getState())
    );
  }) as UseBoundStore<T>;

  Object.assign(useBoundStore, api);
  return useBoundStore;
}

export function create<T extends object>(): (
  initializer: StateCreator<T>
) => UseBoundStore<T>;
export function create<T extends object>(
  initializer: StateCreator<T>
): UseBoundStore<T>;
export function create<T extends object>(
  initializer?: StateCreator<T>
): UseBoundStore<T> | ((init: StateCreator<T>) => UseBoundStore<T>) {
  if (initializer) {
    return createStoreImpl(initializer);
  }
  return (init: StateCreator<T>) => createStoreImpl(init);
}

