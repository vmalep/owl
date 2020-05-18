import { qweb } from "../qweb/qweb";
import { QWebTemplate } from "../qweb/types";
import { VRootNode } from "../vdom/types";
import { buildTree, patch } from "../vdom/vdom";
import { Component } from "./component";
import { Fiber } from "./fiber";
import { scheduler } from "./scheduler";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface FComponent<T = any, Env = any> {
  template: string;
  components?: { [key: string]: FComponent<any> | CComponent };
  name?: string;
  setup?: (props: any, env: Env) => T | Promise<T> | void;
}

export type CComponent = typeof Component;

export type CInstance<Props = any, Env = any> = Component<Props, Env>;

export type FInstance<T = {}, Env = any> = T & {
  __owl__: OwlElement<T>;
  props: any;
  env: Env;
};

export interface OwlElement<T = any> {
  fiber: Fiber | null;
  name: string;
  components: { [key: string]: FComponent<T> | CComponent };
  isMounted: boolean;
  instance: FInstance<T> | CInstance | null;
  vnode: VRootNode | null;
  qweb: QWebTemplate;
  isReady: Promise<void> | null;
  children: { [key: string]: OwlElement };
}

// -----------------------------------------------------------------------------
// core object
// -----------------------------------------------------------------------------
export const core = {
  current: null as null | OwlElement,
};

// -----------------------------------------------------------------------------
// Mount
// -----------------------------------------------------------------------------
export type MountTarget = HTMLElement | DocumentFragment;

export interface MountConfig<Env = any> {
  props?: Object;
  env?: Env;
}

export function mount<C extends CComponent>(
  Comp: C,
  target: MountTarget,
  config?: MountConfig
): Promise<InstanceType<C>>;
export function mount(
  comp: CInstance,
  target: MountTarget,
  config?: MountConfig
): Promise<CInstance>;
export function mount<T, Env>(
  Comp: FComponent<T>,
  target: MountTarget,
  config?: MountConfig<Env>
): Promise<FInstance<T extends {} ? T : {}, Env>>;
export function mount<T, Env>(
  comp: FInstance,
  target: MountTarget,
  config?: MountConfig<Env>
): Promise<FInstance<T extends {} ? T : {}, Env>>;
export async function mount(
  info: any,
  target: MountTarget,
  config: MountConfig = {}
): Promise<CInstance | FInstance> {
  if (!(target instanceof HTMLElement || target instanceof DocumentFragment)) {
    const name =
      info instanceof Component ? info.constructor.name : (info as any).name || "No Name";
    let message = `Component '${name}' cannot be mounted: the target is not a valid DOM node.`;
    message += `\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)`;
    throw new Error(message);
  }
  if (info instanceof Component) {
    // this is a CInstance
    const elem = info.__owl__!;
    return scheduler.addFiber(elem.fiber!).then(() => {
      target.appendChild(info.el!);
      return info;
    });
  }
  let element: OwlElement;
  let props = config.props || {};
  let env = config.env || {};
  if (info.prototype instanceof Component || info === Component) {
    // this is a CComponent (Class Component)
    element = createCComponent(info, props, env);
  } else if ("__owl__" in info) {
    // this is a CInstance or a FInstance
    element = info.__owl__;
  } else {
    // this is a FComponent
    element = createFComponent(info, props, env);
  }
  return scheduler.addFiber(element.fiber!).then(() => {
    const fragment = document.createDocumentFragment();
    buildTree(element.vnode!, (fragment as any) as HTMLElement);
    target.appendChild(fragment);
    if (document.body.contains(target)) {
      mountTree(element);
    }
    return element.instance!;
  });
}

function mountTree(element: OwlElement) {
  for (let k in element.children) {
    mountTree(element.children[k]);
  }
  element.isMounted = true;
  if (element.instance.mounted) {
    element.instance.mounted();
  }
}

// -----------------------------------------------------------------------------
// Component creation
// -----------------------------------------------------------------------------

export function createFComponent(fn: FComponent, props: any, env: any): OwlElement {
  let template: string = fn.template;
  const name = fn.name || "Anonymous Function Component";
  if (!template) {
    throw new Error(`Component "${name}" does not have a template defined!`);
  }
  const qtemplate = qweb.getTemplate(template);
  const elem: OwlElement = {
    fiber: null,
    name,
    instance: null,
    isMounted: false,
    vnode: null,
    components: fn.components || {},
    qweb: qtemplate,
    isReady: null,
    children: {},
  };
  core.current = elem;

  if (fn.setup) {
    const result = fn.setup(props, env);
    const prom = result instanceof Promise ? result : Promise.resolve(result);
    elem.isReady = prom.then((result) => {
      let instance = result ? Object.create(result) : {};
      instance.props = props;
      instance.__owl__ = elem;
      instance.env = env;
      elem.instance = instance;
    });
  } else {
    const instance: FInstance = { props, env, __owl__: elem };
    elem.instance = instance;
    elem.isReady = Promise.resolve();
  }

  startComponent(elem);
  return elem;
}

export function createCComponent<C extends typeof Component>(
  C: C,
  props: any,
  env: any
): OwlElement {
  let template: string = C.template;
  if (!template) {
    throw new Error(`Component "${C.name}" does not have a template defined!`);
  }
  const qtemplate = qweb.getTemplate(template);
  const elem: OwlElement = {
    fiber: null,
    name: C.name,
    instance: null,
    isMounted: false,
    vnode: null,
    components: C.components,
    qweb: qtemplate,
    isReady: null,
    children: {},
  };
  core.current = elem;
  const component = new C(props, env) as InstanceType<C>;
  component.__owl__ = elem;
  elem.instance = component;
  elem.isReady = component.willStart();
  startComponent(elem);
  return elem;
}

// -----------------------------------------------------------------------------
// starting Components
// -----------------------------------------------------------------------------

async function startComponent(elem: OwlElement) {
  const vnode = elem.qweb.createRoot();
  vnode.hooks.create = (el) => (elem.instance.el = el);
  const fiber = new Fiber(elem, null, vnode);
  fiber.root.counter++;
  elem.fiber = fiber;
  elem.vnode = vnode;
  await elem.isReady!;
  elem.qweb.render(vnode, elem.instance, elem);
  fiber.root.counter--;
}

export function renderToFiber(elem: OwlElement, parentFiber: Fiber | null): Fiber {
  const newRoot = elem.qweb.createRoot();
  const fiber = new Fiber(elem, parentFiber, newRoot);
  elem.fiber = fiber;
  fiber.root.counter++;
  new Promise((resolve) => {
    elem.qweb.render(newRoot, elem.instance!, elem);
    fiber.root.counter--;
    resolve();
  });
  return fiber;
}
// -----------------------------------------------------------------------------
// render
// -----------------------------------------------------------------------------

export function render(elem: OwlElement): Promise<void> {
  let fiber = renderToFiber(elem, null);
  return scheduler.addFiber(fiber).then(() => {
    patch(elem.vnode!, fiber.vnode!);
    while (fiber.next) {
      fiber = fiber.next;
      patch(fiber.elem.vnode!, fiber.vnode!);
    }
  });
}
