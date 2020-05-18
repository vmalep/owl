/**
 * Make this a simple object???
 */

import { VNode } from "../vdom/types";
import { OwlElement } from "./core";

export class Fiber {
  static nextId: number = 1;

  id = Fiber.nextId++;
  root: Fiber;
  isCompleted: boolean = false;
  counter: number = 0;
  vnode: VNode | null;
  elem: OwlElement;
  next: Fiber | null = null;

  constructor(elem: OwlElement, parent: Fiber | null, vnode: VNode | null) {
    this.elem = elem;
    this.root = parent || this;
    if (parent) {
      parent.next = this;
    }
    this.vnode = vnode;
  }
}
