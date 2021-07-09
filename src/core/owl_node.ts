import type { App } from "./app";
import type { Block } from "../bdom";
import { ChildFiber, MountFiber, RootFiber } from "./fibers";
import type { Component } from "./component";

export const enum STATUS {
  NEW,
  WILLSTARTED, // willstart has been called
  CREATED, // after first render is complete
  MOUNTED, // is ready, and in DOM. It has a valid el
  UNMOUNTED, // has a valid el, but is no longer in DOM
  DESTROYED,
}

let currentNode: OwlNode | null = null;

export function getCurrent(): OwlNode | null {
  return currentNode;
}

export class OwlNode {
  app: App;
  bdom: null | Block = null;
  component: Component;
  fiber: ChildFiber | RootFiber | null = null;
  status: STATUS = STATUS.NEW;
  renderFn: Function;
  children: { [key: string]: OwlNode } = {};

  constructor(app: App, C: typeof Component, props: any) {
    this.app = app;
    currentNode = this;
    const component = new C(props, app.env, this);
    component.setup();
    this.component = component;
    this.renderFn = app.getTemplate(C.template).bind(null, component);
  }

  mount(target: any) {
    const fiber = new MountFiber(this, target);
    this.app.scheduler.addFiber(fiber);
    this._render(fiber);
    return fiber.promise.then(() => this.component);
  }

  render() {
    const fiber = new RootFiber(this);
    this.app.scheduler.addFiber(fiber);
    this._render(fiber);
    return fiber.promise;
  }

  async initiateRender(fiber: ChildFiber) {
    await Promise.resolve(); // should be willStart stuff
    this._render(fiber);
  }

  _render(fiber: ChildFiber | RootFiber) {
    this.fiber = fiber;
    fiber.bdom = this.renderFn();
    fiber.root.counter--;
  }
}