import { Block, Blocks as BaseBlocks } from "./bdom";
import { BNode } from "./b_node";
import { compileTemplate } from "./compiler";
import { UTILS } from "./template_utils";

// export { App, Component };

// export function useComponent(): Component {
//   const current = getCurrent();
//   return current!.component;
// }

// export { EventBus } from "./event_bus";
// export {
//   onDestroyed, onMounted, onPatched,
//   onRender, onWillPatch, onWillStart, onWillUnmount,
//   onWillUpdateProps
// } from "./lifecycle_hooks";
// export { Memo } from "./misc/memo";
// export { Portal } from "./misc/portal";
// export { useState } from "./reactivity";
// export { useRef } from "./refs";
// export { status } from "./status";
// // export { xml } from "./tags";

export const __info__ = {};

// -----------------------------------------------------------------------------
// Tag xml
// -----------------------------------------------------------------------------

const Blocks = {
  ...BaseBlocks,
  BNode,
};

export function xml(strings: TemplateStringsArray, ...args: any[]) {
  const value = String.raw(strings, ...args);
  return compileTemplate(value)(Blocks, UTILS);
}

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

export type ComponentClosure = () => Block;

export type Component = (node: BNode) => ComponentClosure;

export async function mount(C: Component, target: HTMLElement): Promise<void> {
  if (!(target instanceof HTMLElement)) {
    throw new Error("Cannot mount component: the target is not a valid DOM element");
  }
  if (!document.body.contains(target)) {
    throw new Error("Cannot mount a component on a detached dom node");
  }
  const node = new BNode(C, {});
  return node.mountComponent(target);
}
