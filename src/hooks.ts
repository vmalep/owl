import { reactive } from "./reactive";
import { core, render } from "./components/index";

export function useState<T>(state: T): T {
  let component = core.current!;
  return reactive(state, () => render(component));
}
