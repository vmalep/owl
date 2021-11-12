import { getCurrent } from "./component/component_node";

export interface Env {
  [key: string]: any;
}

/**
 * This hook is useful as a building block for some customized hooks, that may
 * need a reference to the env of the component calling them.
 */
export function useEnv<E extends Env>(): E {
  return getCurrent()!.component.env as any;
}

/**
 * This hook is a simple way to let components use a sub environment.  Note that
 * like for all hooks, it is important that this is only called in the
 * constructor method.
 */
export function useSubEnv(nextEnv: Env) {
    const node = getCurrent()!;
    node.nextEnv = Object.freeze(Object.assign({}, node.nextEnv, nextEnv));
}
