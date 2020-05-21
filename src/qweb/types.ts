import { QWeb } from "./qweb";
import { VRootNode, VNode } from "../vdom/types";

export interface RenderContext {
  [key: string]: any;
}

export interface TemplateInfo {
  fn: (this: QWeb["utils"], context: RenderContext, extra: any) => VNode;
}

export interface QWebTemplate {
  createRoot(): VRootNode;
  render(context: RenderContext, extra: any): VNode;
}

// -----------------------------------------------------------------------------
// AST Type definition
// -----------------------------------------------------------------------------

interface Handler {
  expr: string;
}

export type Key = string;

export interface ASTDOMNode {
  type: "DOM";
  tag: string;
  children: AST[];
  attrs: { [name: string]: string };
  on: { [event: string]: Handler };
  attClass?: string;
  attfClass?: string;
}

export interface ASTStaticNode {
  type: "STATIC";
  child: AST;
}

export interface ASTComponentNode {
  type: "COMPONENT";
  name: string;
  props: { [name: string]: string };
}

export interface ASTKeyNode {
  type: "T-KEY";
  key: Key;
  child: AST;
}

export interface ASTTextNode {
  type: "TEXT";
  text: string;
}

export interface ASTEscNode {
  type: "T-ESC";
  expr: string;
  body: AST[];
}

export interface ASTRawNode {
  type: "T-RAW";
  expr: string;
  body: AST[];
}

export interface ASTCommentNode {
  type: "COMMENT";
  text: string;
}

export interface ASTMultiNode {
  type: "MULTI";
  children: AST[];
}

export interface ASTIfNode {
  type: "T-IF";
  condition: string;
  child: AST;
  next: ASTElifNode | ASTElseNode | null;
}

export interface ASTElifNode {
  type: "T-ELIF";
  condition: string;
  child: AST;
  next: ASTElifNode | ASTElseNode | null;
}

export interface ASTElseNode {
  type: "T-ELSE";
  child: AST;
}

export interface ASTSetNode {
  type: "T-SET";
  name: string;
  value: string | null;
  body: AST[];
}

export interface ASTForeachNode {
  type: "T-FOREACH";
  collection: string;
  varName: string;
  child: AST;
}

export interface ASTCallNode {
  type: "T-CALL";
  template: string;
  children: AST[];
}

export interface ASTDebugNode {
  type: "T-DEBUG";
  child: AST | null;
  ast?: boolean;
}
// TODO: add and support nodes of types "BLOCK":

export type AST =
  | ASTDOMNode
  | ASTStaticNode
  | ASTTextNode
  | ASTEscNode
  | ASTRawNode
  | ASTSetNode
  | ASTCommentNode
  | ASTMultiNode
  | ASTIfNode
  | ASTElifNode
  | ASTElseNode
  | ASTComponentNode
  | ASTForeachNode
  | ASTCallNode
  | ASTKeyNode
  | ASTDebugNode;
