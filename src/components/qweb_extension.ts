import { qweb } from "../qweb/qweb";
import { RenderContext } from "../qweb/types";
import { VRootNode } from "../vdom/types";
import { Component } from "./component";
import { createCComponent, createFComponent, OwlElement } from "./core";

const { utils } = qweb;

utils.makeComponent = function (
  parent: OwlElement,
  name: string,
  context: RenderContext,
  props: any
): VRootNode {
  const definition = context[name] || parent.components[name];
  const isClass = definition.prototype instanceof Component;
  let component = isClass
    ? createCComponent(definition, props, {})
    : createFComponent(definition, props, {});
  parent.children[1] = component; // hum
  return component.vnode!;
};
