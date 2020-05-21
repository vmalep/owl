import { NodeType } from "../vdom/types";
import { compileExpr, compileExprToArray } from "./expression_parser";
import {
  AST,
  ASTCallNode,
  ASTDOMNode,
  ASTEscNode,
  ASTRawNode,
  ASTSetNode,
  ASTStaticNode,
  TemplateInfo,
} from "./types";
import { parse } from "./parser";
import { QWeb } from "./qweb";
import { OwlElement } from "../components/core";
import { registerStaticNode } from "../vdom/vdom";

interface QWebVar {
  expr: string;
  hasBody: boolean;
  hasValue: boolean;
}

interface CompilerContext {
  qweb: QWeb;
  currentParent: string | null;
  code: string[];
  nextId: number;
  indentLevel: number;
  shouldProtectContext: boolean;
  shouldDefineRootContext: boolean;
  variables: { [name: string]: QWebVar };
  staticNodes: HTMLElement[];
  isDebug: boolean | "ast";
  loopIndex: number;
  path: string[];
  templateName: string;
  roots: string[];
}

function shouldDefineMultiRoot(ast: AST): boolean {
  switch (ast.type) {
    case "DOM":
    case "STATIC":
    case "T-CALL":
    case "MULTI":
    case "T-ESC":
    case "T-RAW":
    case "TEXT":
      return false;
    case "T-DEBUG":
    case "T-KEY":
      return ast.child ? shouldDefineMultiRoot(ast.child) : true;
    default:
      return true;
  }
}

export function compileTemplate(qweb: QWeb, name: string, template: string): TemplateInfo {
  const ast = parse(template);
  const ctx: CompilerContext = {
    qweb,
    currentParent: null,
    code: [],
    nextId: 1,
    indentLevel: 0,
    shouldProtectContext: false,
    shouldDefineRootContext: false,
    variables: {},
    staticNodes: [],
    isDebug: false,
    loopIndex: 0,
    path: [],
    templateName: name,
    roots: [],
  };
  const descr = name.trim().slice(0, 100).replace(/`/g, "'").replace(/\n/g, "");
  addLine(ctx, `// Template: \`${descr}\``);

  const isMulti = shouldDefineMultiRoot(ast);
  if (isMulti) {
    addLine(ctx, `let vn0 = {type: ${NodeType.Multi}, children: []};`);
    ctx.currentParent = "vn0";
  }
  generateCode(ast, ctx);
  if (ctx.shouldProtectContext) {
    ctx.code.splice(1, 0, `    ctx = Object.create(ctx);`);
  }
  if (ctx.shouldDefineRootContext) {
    ctx.code.splice(1, 0, `    const rootCtx = ctx;`);
  }
  if (isMulti) {
    addLine(ctx, `return vn0;`);
  } else if (ctx.roots.length > 1) {
    addLine(ctx, `return {type: ${NodeType.Multi}, children: ${ctx.roots}};`);
  } else {
    addLine(ctx, `return ${ctx.roots[0]};`);
  }
  // console.warn(ctx.code.join("\n"));
  const fn = new Function("ctx, metadata", ctx.code.join("\n")) as any;
  if (ctx.isDebug) {
    if (ctx.isDebug === "ast") {
      const msg = `Template: ${descr}\AST:\n${JSON.stringify(ast, null, 3)}`;
      console.log(msg);
    } else {
      const msg = `Template: ${descr}\nCompiled code:\n${fn.toString()}`;
      console.log(msg);
    }
  }
  return {
    fn,
  };
}

function generateCode(ast: AST | AST[], ctx: CompilerContext) {
  if (ast instanceof Array) {
    for (let elem of ast) {
      generateCode(elem, ctx);
    }
    return;
  }
  switch (ast.type) {
    case "DOM":
      compileDOMNode(ctx, ast);
      break;
    case "TEXT": {
      const vnode = `{type: ${NodeType.Text}, text: \`${ast.text}\`, el: null}`;
      addVNode(ctx, vnode);
      break;
    }
    case "STATIC":
      compileStaticNode(ctx, ast);
      break;
    case "T-SET":
      compileSetNode(ctx, ast);
      break;
    case "T-ESC":
      compileEscNode(ctx, ast);
      break;
    case "T-RAW":
      compileRawNode(ctx, ast);
      break;
    case "T-KEY":
      const keyId = uniqueId(ctx, "key");
      addLine(ctx, `let ${keyId} = ${compileExpr(ast.key)};`);
      const currentPath = ctx.path;
      ctx.path = currentPath.slice();
      ctx.path.splice(-1, 1, keyId);
      generateCode(ast.child, ctx);
      ctx.path = currentPath;
      break;
    case "T-IF": {
      addIf(ctx, compileExpr(ast.condition));
      generateCode(ast.child, ctx);
      ctx.indentLevel--;
      if (ast.next) {
        generateCode(ast.next, ctx);
      } else {
        addLine(ctx, "}");
      }
      break;
    }

    case "T-ELIF": {
      addLine(ctx, `} else if (${compileExpr(ast.condition)}) {`);
      ctx.indentLevel++;
      generateCode(ast.child, ctx);
      ctx.indentLevel--;
      if (ast.next) {
        generateCode(ast.next, ctx);
      } else {
        addLine(ctx, "}");
      }
      break;
    }

    case "T-ELSE": {
      addLine(ctx, `} else {`);
      ctx.indentLevel++;
      generateCode(ast.child, ctx);
      closeIf(ctx);
      break;
    }

    case "COMMENT": {
      const vnode = `{type: ${NodeType.Comment}, text: \`${ast.text}\`, el: null}`;
      addVNode(ctx, vnode);
      break;
    }
    case "MULTI": {
      const vnode = `{type: ${NodeType.Multi}, children:[]}`;
      const id = addVNode(ctx, vnode);
      withSubContext(ctx, { currentParent: id }, () => {
        generateCode(ast.children, ctx);
      });
      break;
    }
    case "T-CALL":
      compileCallNode(ctx, ast);
      break;
    case "T-FOREACH":
      {
        const colLength = uniqueId(ctx, "length");
        const colId = uniqueId(ctx);
        const varname = `i${ctx.loopIndex}`;
        addLine(ctx, `let ${colId} = ${compileExpr(ast.collection)};`);
        addLine(ctx, `let ${colLength} = ${colId}.length;`);
        addLine(ctx, `ctx = Object.create(ctx);`);
        addLine(ctx, `for (let ${varname} = 0; ${varname} < ${colLength}; ${varname}++) {`);
        ctx.indentLevel++;
        ctx.loopIndex++;
        ctx.path.push(varname);
        addLine(ctx, `ctx.${ast.varName}_first = ${varname} === 0;`);
        addLine(ctx, `ctx.${ast.varName}_last = ${varname} === ${colLength} - 1;`);
        addLine(ctx, `ctx.${ast.varName} = ${colId}[${varname}];`);
        addLine(ctx, `ctx.${ast.varName}_index = ${varname};`);
        addLine(ctx, `ctx.${ast.varName}_value = ${colId}[${varname}];`);
        generateCode(ast.child, ctx);
        ctx.indentLevel--;
        ctx.loopIndex--;
        ctx.path.pop();
        addLine(ctx, "}");
        addLine(ctx, `ctx = ctx.__proto__;`);
      }
      break;
    case "COMPONENT": {
      let id = uniqueId(ctx);
      let props: string[] = [];
      for (let p in ast.props) {
        props.push(`${p}:${compileExpr(ast.props[p])}`);
      }
      addLine(ctx, `let ${id} = {${props.join(",")}};`);
      let key = generateKey(ctx, true);
      const vnode = `this.makeComponent(${key}, metadata, "${ast.name}", ctx, ${id})`;
      addVNode(ctx, vnode);
      break;
    }
    case "T-DEBUG": {
      addLine(ctx, `debugger;`);
      ctx.isDebug = ast.ast ? "ast" : true;
      if (ast.child) {
        generateCode(ast.child, ctx);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Code generation helpers
// -----------------------------------------------------------------------------

function addIf(ctx: CompilerContext, condition: string) {
  addLine(ctx, `if (${condition}) {`);
  ctx.indentLevel++;
}

function closeIf(ctx: CompilerContext) {
  ctx.indentLevel--;
  addLine(ctx, `}`);
}

function uniqueId(ctx: CompilerContext, prefix: string = "_"): string {
  return prefix + String(ctx.nextId++);
}

function addVNode(ctx: CompilerContext, str: string): string {
  const id = uniqueId(ctx, "vn");
  addLine(ctx, `const ${id} = ${str};`);
  if (ctx.currentParent) {
    if (ctx.currentParent.startsWith("_")) {
      addLine(ctx, `${ctx.currentParent}.push(${id});`);
    } else {
      addLine(ctx, `${ctx.currentParent}.children.push(${id});`);
    }
  } else {
    ctx.roots.push(id);
  }
  return id;
}

function withSubContext(ctx: CompilerContext, subCtx: Partial<CompilerContext>, cb: Function) {
  const currentValues: Partial<CompilerContext> = {};
  for (let k in subCtx) {
    (currentValues as any)[k] = (ctx as any)[k];
    (ctx as any)[k] = (subCtx as any)[k];
  }
  cb();
  Object.assign(ctx, currentValues);
}

function addLine(ctx: CompilerContext, code: string) {
  ctx.code.push(new Array(ctx.indentLevel + 2).join("    ") + code);
}

// -----------------------------------------------------------------------------
// Compile DOM node
// -----------------------------------------------------------------------------
const letterRegexp = /^[a-zA-Z]+$/;

function objToAttr(obj: { [key: string]: string }): string {
  const attrs = Object.keys(obj).map((k) => {
    const attName = k.match(letterRegexp) ? k : '"' + k + '"';
    return `${attName}:${obj[k]}`;
  });
  return "{" + attrs.join(",") + "}";
}

function addToAttrs(attrs: { [key: string]: string }, key: string, value: string) {
  attrs[key] = key in attrs ? attrs[key] + ' + " " + ' + value : value;
}

/**
 * Todo: move this out of QWeb compiler
 */
export function handle(ev: Event, element: OwlElement, args: any, fn: string | Function) {
  if (!element.isMounted) {
    return;
  }
  if (typeof fn === "string") {
    element.instance[fn](...args, ev);
  } else {
    fn(args);
  }
}

const FNAMEREGEXP = /^[$A-Z_][0-9A-Z_$]*$/i;

function makeEventHandler(ctx: CompilerContext, eventName: string, expr: string): string {
  let args: string = "";
  const name: string = expr.replace(/\(.*\)/, function (_args) {
    args = _args.slice(1, -1);
    return "";
  });
  const isMethodCall = FNAMEREGEXP.test(name);
  if (isMethodCall) {
    if (args) {
      let id = uniqueId(ctx);
      addLine(ctx, `let ${id} = [${compileExpr(args)}];`);
      return `ev => this.handle(ev, metadata, ${id}, '${name}')`;
    } else {
      return `ev => this.handle(ev, metadata, [], '${name}')`;
    }
  } else {
    const tokens = compileExprToArray(expr);
    const capturedVars: string[] = [];
    for (let token of tokens) {
      if (token.varName) {
        capturedVars.push(`'${token.varName}':${token.value}`);
      }
    }
    let id = uniqueId(ctx);
    addLine(ctx, `let ${id} = {${capturedVars.join(",")}};`);
    return `ev => this.handle(ev, metadata, ${id}, ctx => {${compileExpr(expr)}})`;
  }
}

function compileDOMNode(ctx: CompilerContext, ast: ASTDOMNode) {
  // attributes
  const attrs = {};
  for (let attr in ast.attrs) {
    let value = ast.attrs[attr];
    if (attr.startsWith("t-att-")) {
      const id = uniqueId(ctx);
      addLine(ctx, `let ${id} = ${compileExpr(value)}`);
      addToAttrs(attrs, attr.slice(6), id);
    } else {
      addToAttrs(attrs, attr, `"${value}"`);
    }
  }
  const attrObjStr = objToAttr(attrs);
  const attrCode = attrObjStr === "{}" ? "" : `, attrs: ${attrObjStr}`;

  // classes
  let classObj = "";
  if (ast.attClass) {
    classObj = `, class: this.toClassObj(${compileExpr(ast.attClass)})`;
  }
  // handlers
  let handlers = "";
  if (Object.keys(ast.on).length) {
    let h: string[] = [];
    ctx.shouldDefineRootContext = true;
    for (let ev in ast.on) {
      h.push(`${ev}: ${makeEventHandler(ctx, ev, ast.on[ev].expr)}`);
    }
    handlers = `, on: {` + h.join(", ") + "}";
  }

  // final code
  const key = generateKey(ctx);
  const vnode = `{type: ${NodeType.DOM}, tag: "${ast.tag}", children: []${attrCode}, key: ${key}${handlers}${classObj}}`;
  const id = addVNode(ctx, vnode);
  withSubContext(ctx, { currentParent: id }, () => {
    generateCode(ast.children, ctx);
  });
}

function generateKey(ctx: CompilerContext, full: boolean = false): string {
  const pathKey = (full ? ctx.path : ctx.path.slice(-1)).map((k) => "${" + k + "}");
  return "`" + [uniqueId(ctx, "k")].concat(pathKey).join("__") + "`";
}

// -----------------------------------------------------------------------------
// Compile T-SET node
// -----------------------------------------------------------------------------

function compileSetNode(ctx: CompilerContext, ast: ASTSetNode) {
  ctx.shouldProtectContext = true;
  if (ast.value !== null) {
    addLine(ctx, `ctx.${ast.name} = ${compileExpr(ast.value)};`);
  }
  if (ast.body.length && ast.value === null) {
    let id = uniqueId(ctx);
    addLine(ctx, `let ${id} = new this.VDomArray();`);
    withSubContext(ctx, { currentParent: id }, () => {
      generateCode(ast.body, ctx);
    });
    addLine(ctx, `ctx.${ast.name} = ${id};`);
  }
  if (ast.body.length && ast.value !== null) {
    addIf(ctx, `!ctx.${ast.name}`);
    let id = uniqueId(ctx);
    addLine(ctx, `let ${id} = new this.VDomArray();`);
    withSubContext(ctx, { currentParent: id }, () => {
      generateCode(ast.body, ctx);
    });
    addLine(ctx, `ctx.${ast.name} = ${id}`);
    closeIf(ctx);
  }

  const qwebVar = ctx.variables[ast.name];
  if (qwebVar) {
    qwebVar.hasBody = qwebVar.hasBody || !!ast.body.length;
    qwebVar.hasValue = qwebVar.hasBody || ast.value !== null;
  } else {
    ctx.variables[ast.name] = {
      expr: `ctx.${ast.name}`,
      hasBody: !!ast.body.length,
      hasValue: ast.value !== null,
    };
  }
}

// -----------------------------------------------------------------------------
// Compile T-ESC node
// -----------------------------------------------------------------------------

function compileEscNode(ctx: CompilerContext, ast: ASTEscNode) {
  if (ast.expr === "0") {
    addVNode(ctx, `{type: ${NodeType.Text}, text: ctx[this.zero]}`);
    return;
  }
  const expr = compileExpr(ast.expr);
  if (ast.body.length) {
    const id = uniqueId(ctx);
    addLine(ctx, `let ${id} = ${expr}`);
    addIf(ctx, `${id} !== undefined`);
    addVNode(ctx, `{type: ${NodeType.Text}, text: ${id}, el: null}`);
    ctx.indentLevel--;
    addLine(ctx, `} else {`);
    ctx.indentLevel++;
    generateCode(ast.body, ctx);
    closeIf(ctx);
  } else {
    if (ast.expr in ctx.variables) {
      const qwebVar = ctx.variables[ast.expr];
      if (!qwebVar.hasBody && !qwebVar.hasValue) {
        return;
      }
    }
    const vnode = `{type: ${NodeType.Text}, text: ${expr}, el: null}`;
    addVNode(ctx, vnode);
  }
}

// -----------------------------------------------------------------------------
// Compile T-RAW node
// -----------------------------------------------------------------------------

function compileRawNode(ctx: CompilerContext, ast: ASTRawNode) {
  if (ast.expr === "0") {
    addVNode(ctx, `ctx[this.zero]`);

    return;
  }
  const expr = compileExpr(ast.expr);
  if (ast.body.length) {
    const id = uniqueId(ctx);
    addLine(ctx, `let ${id} = ${expr}`);
    addIf(ctx, `${id} !== undefined`);
    const vnode = `{type: ${NodeType.Multi}, children: this.htmlToVDOM(${expr})}`;
    addVNode(ctx, vnode);
    ctx.indentLevel--;
    addLine(ctx, `} else {`);
    ctx.indentLevel++;
    generateCode(ast.body, ctx);
    closeIf(ctx);
    return;
  }
  if (ast.expr in ctx.variables) {
    // this is a variable that was already defined, with a body
    const qwebVar = ctx.variables[ast.expr];
    if (qwebVar.hasBody && qwebVar.hasValue) {
      const vnode = `{type: ${NodeType.Multi}, children: this.htmlToVDOM(${qwebVar.expr})}`;
      addVNode(ctx, vnode);
    } else {
      const vnode = `{type: ${NodeType.Multi}, children: ${qwebVar.expr}}`;
      addVNode(ctx, vnode);
    }
  } else {
    // if (ctx.currentParent === "tree") {
    const vnode = `{type: ${NodeType.Multi}, children: this.htmlToVDOM(${expr})}`;
    addVNode(ctx, vnode);
  }
}

// -----------------------------------------------------------------------------
// Compile T-CALL node
// -----------------------------------------------------------------------------

function compileCallNode(ctx: CompilerContext, ast: ASTCallNode) {
  if (ast.children.length) {
    addLine(ctx, `ctx = Object.create(ctx);`);
    const id = uniqueId(ctx, "vn");
    addLine(ctx, `let ${id} = {type: ${NodeType.Multi}, children: new this.VDomArray()};`);
    // const id = addVNode(ctx, vnode);
    // addLine(ctx, `const ${id} = new this.VDomArray();;`);
    withSubContext(ctx, { currentParent: id }, () => {
      generateCode(ast.children, ctx);
    });
    addLine(ctx, `ctx[this.zero] = ${id};`);
  }
  const vnode = `this.callTemplate("${ast.template}", ctx, metadata)`;

  addVNode(ctx, vnode);
  if (ast.children.length) {
    addLine(ctx, `ctx = ctx.__proto__;`);
  }
}

// -----------------------------------------------------------------------------
// Compile static nodes
// -----------------------------------------------------------------------------

function compileStaticNode(ctx: CompilerContext, ast: ASTStaticNode) {
  const el = makeEl(ast.child) as HTMLElement;
  const id = registerStaticNode(ctx.templateName, el);
  const vnode = `{type: ${NodeType.Static}, id: ${id}, template: "${ctx.templateName}"}`;
  addVNode(ctx, vnode);
}

function makeEl(ast: AST): HTMLElement | Text | Comment {
  switch (ast.type) {
    case "DOM": {
      const el = document.createElement(ast.tag);
      const attrs = ast.attrs;
      for (let attr in attrs) {
        el.setAttribute(attr, attrs[attr]);
      }
      for (let child of ast.children) {
        el.appendChild(makeEl(child));
      }
      return el;
    }
    case "TEXT": {
      return document.createTextNode(ast.text);
    }
    case "COMMENT": {
      return document.createComment(ast.text);
    }
  }
  throw new Error("Something is wrong..." + ast.type);
}
