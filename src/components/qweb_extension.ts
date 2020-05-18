import { qweb } from "../qweb/qweb";
import { RenderContext } from "../qweb/types";
import { VRootNode } from "../vdom/types";
import { Component } from "./component";
import { createCComponent, createFComponent, OwlElement, renderToFiber } from "./core";

const { utils } = qweb;

utils.makeComponent = function (
  key: string,
  parent: OwlElement,
  name: string,
  context: RenderContext,
  props: any
): VRootNode {
  if (key in parent.children) {
    // update situation
    const comp = parent.children[key];
    comp.instance.props = props;
    renderToFiber(comp, parent.fiber);
    return comp.vnode!;
  }
  // new component creation
  const definition = context[name] || parent.components[name];
  const isClass = definition.prototype instanceof Component;
  let component = isClass
    ? createCComponent(definition, props, {})
    : createFComponent(definition, props, {});
  parent.children[key] = component;
  return component.vnode!;
};
