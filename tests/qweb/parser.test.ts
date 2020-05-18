import { parse } from "../../src/qweb/parser";
import { AST, ASTDOMNode } from "../../src/qweb/types";

function structure(node: AST): any {
  switch (node.type) {
    case "T-KEY":
    case "STATIC":
    case "T-FOREACH":
      return { type: node.type, child: structure(node.child) };
    case "MULTI":
    case "T-CALL":
    case "DOM":
      return { type: node.type, children: node.children.map(structure) };
    case "T-ESC":
    case "T-RAW":
    case "T-SET":
      return { type: node.type, children: node.body.map(structure) };
    case "T-IF":
    case "T-ELIF":
      return {
        type: "T-IF",
        child: structure(node.child),
        next: node.next ? structure(node.next) : null,
      };
    case "T-ELSE":
      return { type: node.type, child: structure(node.child) };
    case "T-DEBUG":
      return { type: node.type, child: node.child ? structure(node.child) : null };
    default:
      return { type: node.type };
  }
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("qweb parser", () => {
  test("remove multi node from ast if they  have 1 child", () => {
    const ast = parse("<t>text</t>");
    expect(ast).toEqual({ type: "TEXT", text: "text" });
  });

  test("recursively remove multi node from ast if they  have 1 child", () => {
    const ast = parse("<t><t><t>text</t></t></t>");
    expect(ast).toEqual({ type: "TEXT", text: "text" });
  });

  test("flatten multi node tree", () => {
    const ast = parse("<t><t><t>text1</t></t><t>text2</t></t>");
    expect(ast).toEqual({
      type: "MULTI",
      children: [
        { type: "TEXT", text: "text1" },
        { type: "TEXT", text: "text2" },
      ],
    });
  });

  test("can detect simple static node", () => {
    const ast = parse("<div>text</div>");
    expect(structure(ast)).toEqual({
      type: "STATIC",
      child: { type: "DOM", children: [{ type: "TEXT" }] },
    });
  });

  test("can detect static node with static children", () => {
    const ast = parse("<div>abc<p>def</p></div>");
    expect(structure(ast)).toEqual({
      type: "STATIC",
      child: {
        type: "DOM",
        children: [{ type: "TEXT" }, { type: "DOM", children: [{ type: "TEXT" }] }],
      },
    });
  });

  test("template with t-if and static sub node", () => {
    const ast = parse(`<div t-if="condition">abc</div>`);
    expect(structure(ast)).toEqual({
      type: "T-IF",
      child: {
        type: "STATIC",
        child: { type: "DOM", children: [{ type: "TEXT" }] },
      },
      next: null,
    });
  });

  test("template with dom node and t-if inside", () => {
    const ast = parse(`<div><t t-if="condition">abc</t></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-IF",
          child: { type: "TEXT" },
          next: null,
        },
      ],
    });
  });

  test("dom node and t-call inside", () => {
    const ast = parse(`<div><t t-call="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-CALL",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-esc inside", () => {
    const ast = parse(`<div><t t-esc="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-ESC",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-esc inside, alternate version", () => {
    const ast = parse(`<div t-esc="blabla"/>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-ESC",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-raw inside", () => {
    const ast = parse(`<div><t t-raw="blabla"/></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-RAW",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-raw inside, alternate version", () => {
    const ast = parse(`<div t-raw="blabla"/>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-RAW",
          children: [],
        },
      ],
    });
  });

  test("dom node and t-foreach inside", () => {
    const ast = parse(`<div><t t-foreach="items" t-as="item" t-key="item.id"><span/></t></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "T-FOREACH",
          child: {
            type: "T-KEY",
            child: { type: "STATIC", child: { type: "DOM", children: [] } },
          },
        },
      ],
    });
  });

  test("dom node and component inside", () => {
    const ast = parse(`<div><MyComponent /></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "COMPONENT",
        },
      ],
    });
  });

  test("dom node with a dom node with a component inside", () => {
    const ast = parse(`<div><div><MyComponent /></div></div>`);
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [
        {
          type: "DOM",
          children: [{ type: "COMPONENT" }],
        },
      ],
    });
  });

  test("dom node and component with props", () => {
    const ast = parse(`<div><MyComponent a="valueA" b="valueB" /></div>`);
    const compNode = (ast as any).children[0];
    expect(compNode).toEqual({
      type: "COMPONENT",
      name: "MyComponent",
      props: { a: "valueA", b: "valueB" },
    });
  });

  test("dom node and component with t-key", () => {
    const ast = parse(`<div><MyComponent t-key="blip" /></div>`);
    const compNode = (ast as any).children[0];
    expect(compNode).toEqual({
      type: "T-KEY",
      key: "blip",
      child: {
        type: "COMPONENT",
        name: "MyComponent",
        props: {},
      },
    });
  });

  test("dom node with dynamic attribute", () => {
    const ast = parse(`<div t-att-foo="'bar'"/>`) as ASTDOMNode;
    expect(structure(ast)).toEqual({
      type: "DOM",
      children: [],
    });
    expect(ast.attrs).toEqual({ "t-att-foo": "'bar'" });
  });

  test("dom node with class attribute", () => {
    const ast = parse(`<div class="abc"><t t-esc="hey"/></div>`) as ASTDOMNode;
    expect(ast.attrs).toEqual({ class: "abc" });
    expect(ast.attClass).toEqual("");
    expect(ast.attfClass).toEqual("");
  });

  test("dom node with class and t-att-class attribute", () => {
    const ast = parse(`<div class="abc" t-att-class="d"><t t-esc="hey"/></div>`) as ASTDOMNode;
    expect(ast.attrs).toEqual({ class: "abc" });
    expect(ast.attClass).toEqual("d");
    expect(ast.attfClass).toEqual("");
  });

  test("t with t-debug", () => {
    const ast = parse(`<t t-debug=""/>`) as ASTDOMNode;
    expect(ast).toEqual({ type: "T-DEBUG", child: null, ast: false });
  });

  test("t with t-debug=ast", () => {
    const ast = parse(`<t t-debug="ast"/>`) as ASTDOMNode;
    expect(ast).toEqual({ type: "T-DEBUG", child: null, ast: true });
  });

  test("div with t-debug", () => {
    const ast = parse(`<div t-debug=""/>`) as ASTDOMNode;
    expect(structure(ast)).toEqual({
      type: "T-DEBUG",
      child: { type: "STATIC", child: { type: "DOM", children: [] } },
    });
  });

  test("t-key on div", () => {
    const ast = parse(`<div t-key="abc"/>`);
    expect(structure(ast)).toEqual({
      type: "T-KEY",
      child: { type: "STATIC", child: { type: "DOM", children: [] } },
    });
  });

  test("t-key on t foreach", () => {
    const ast = parse(`
        <t t-foreach="items" t-as="item" t-key="item.id">
          <div><t t-esc="item.title"/></div>
        </t>`);
    expect(structure(ast)).toEqual({
      type: "T-FOREACH",
      child: { type: "T-KEY", child: { type: "DOM", children: [{ type: "T-ESC", children: [] }] } },
    });
  });

  test("t-key on span foreach", () => {
    const ast = parse(`
        <span t-foreach="items" t-as="item" t-key="item.id">
          <div><t t-esc="item.title"/></div>
        </span>`);
    expect(structure(ast)).toEqual({
      type: "T-FOREACH",
      child: {
        type: "T-KEY",
        child: {
          type: "DOM",
          children: [{ type: "DOM", children: [{ type: "T-ESC", children: [] }] }],
        },
      },
    });
  });
});
