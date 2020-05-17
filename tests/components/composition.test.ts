import { Component, mount, useState, xml } from "../../src/index";
import { qweb } from "../../src/qweb/qweb";
import { makeTestFixture, nextTick } from "../helpers";

//------------------------------------------------------------------------------
// Setup and helpers
//------------------------------------------------------------------------------

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("component composition", () => {
  describe("basic properties", () => {
    test("a functional component inside another", async () => {
      const Child = {
        template: xml`<div>simple vnode</div>`,
      };
      const Parent = {
        template: xml`<span><Child/></span>`,
        setup() {
          return { Child };
        },
      };

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a functional component inside another, alternate definition", async () => {
      const Child = {
        template: xml`<div>simple vnode</div>`,
      };
      const Parent = {
        template: xml`<span><Child/></span>`,
        components: { Child },
      };

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("props are passed from parent to child", async () => {
      const Child = {
        template: xml`<div><t t-esc="props.value"/></div>`,
      };
      const Parent = {
        template: xml`<span><Child value="v"/></span>`,
        setup() {
          return { Child, v: 123 };
        },
      };

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>123</div></span>");
    });

    test("a class component inside a function component", async () => {
      class Child extends Component {
        static template = xml`<div>simple vnode</div>`;
      }

      const Parent = {
        template: xml`<span><Child/></span>`,
        setup() {
          return { Child };
        },
      };
      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a class component inside a function component, alternate definition", async () => {
      class Child extends Component {
        static template = xml`<div>simple vnode</div>`;
      }

      const Parent = {
        template: xml`<span><Child/></span>`,
        components: { Child },
      };
      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a function component inside a class component", async () => {
      const Child = {
        template: xml`<div>simple vnode</div>`,
      };

      class Parent extends Component {
        static template = xml`<span><Child/></span>`;
        Child = Child;
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a function component inside a class component, alternate definition", async () => {
      const Child = {
        template: xml`<div>simple vnode</div>`,
      };

      class Parent extends Component {
        static template = xml`<span><Child/></span>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a class component inside a class component", async () => {
      class Child extends Component {
        static template = xml`<div>simple vnode</div>`;
      }

      class Parent extends Component {
        static template = xml`<span><Child/></span>`;
        Child = Child;
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a class component inside a class component, alternate definition", async () => {
      class Child extends Component {
        static template = xml`<div>simple vnode</div>`;
      }

      class Parent extends Component {
        static template = xml`<span><Child/></span>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
    });

    test("a class component with state inside a class component", async () => {
      class Child extends Component {
        static template = xml`<button t-esc="state.value" t-on-click="state.value++" />`;
        state = useState({ value: 1 });
      }

      class Parent extends Component {
        static template = xml`<span><Child/></span>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      fixture.querySelector("button")!.click();
      await nextTick();
      expect(fixture.innerHTML).toBe("<span><button>2</button></span>");
    });

    test("a function component with state inside a function component", async () => {
      const Child = {
        template: xml`<button t-esc="state.value" t-on-click="state.value++" />`,
        setup() {
          return { state: useState({ value: 1 }) };
        },
      };

      const Parent = {
        template: xml`<span><Child/></span>`,
        components: { Child },
      };

      await mount(Parent, fixture);
      fixture.querySelector("button")!.click();
      await nextTick();
      expect(fixture.innerHTML).toBe("<span><button>2</button></span>");
    });
  });

  describe("various update scenarios", () => {
    test("reconciliation alg is not confused in some specific situation", async () => {
      // in this test, we set t-key to 4 because it was in conflict with the
      // template id corresponding to the first child.
      class Child extends Component {
        static template = xml`<span>child</span>`;
      }

      class Parent extends Component {
        static template = xml`
              <div>
                  <Child />
                  <Child t-key="4"/>
              </div>
            `;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<div><span>child</span><span>child</span></div>");
    });

    test("reconciliation alg works for t-foreach in t-foreach", async () => {
      // const warn = console.warn;
      // console.warn = () => {};
      class Child extends Component {
        static template = xml`<div><t t-esc="props.blip"/></div>`;
      }

      class Parent extends Component {
        static template = xml`
              <div>
                  <t t-foreach="state.s" t-as="section">
                      <t t-foreach="section.blips" t-as="blip">
                        <Child blip="blip"/>
                      </t>
                  </t>
              </div>`;
        static components = { Child };
        state = { s: [{ blips: ["a1", "a2"] }, { blips: ["b1"] }] };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<div><div>a1</div><div>a2</div><div>b1</div></div>");
      expect(qweb.compiledTemplates[Parent.template].fn.toString()).toMatchSnapshot();
    });

    test("reconciliation alg works for t-foreach in t-foreach, 2", async () => {
      class Child extends Component {
        static template = xml`<div><t t-esc="props.row + '_' + props.col"/></div>`;
      }

      class Parent extends Component {
        static template = xml`
              <div>
                <p t-foreach="state.rows" t-as="row" t-key="row">
                  <p t-foreach="state.cols" t-as="col" t-key="col">
                    <Child row="row" col="col"/>
                  </p>
                </p>
              </div>`;
        static components = { Child };
        state = useState({ rows: [1, 2], cols: ["a", "b"] });
      }

      const parent = await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe(
        "<div><p><p><div>1_a</div></p><p><div>1_b</div></p></p><p><p><div>2_a</div></p><p><div>2_b</div></p></p></div>"
      );
      parent.state.rows = [2, 1];
      await nextTick();
      expect(fixture.innerHTML).toBe(
        "<div><p><p><div>2_a</div></p><p><div>2_b</div></p></p><p><p><div>1_a</div></p><p><div>1_b</div></p></p></div>"
      );
    });

    test("same t-keys in two different places", async () => {
      class Child extends Component {
        static template = xml`<span><t t-esc="props.blip"/></span>`;
      }

      class Parent extends Component {
        static template = xml`
              <div>
                  <div><Child t-key="1" blip="'1'"/></div>
                  <div><Child t-key="1" blip="'2'"/></div>
              </div>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe(
        "<div><div><span>1</span></div><div><span>2</span></div></div>"
      );
      expect(qweb.compiledTemplates[Parent.template].fn.toString()).toMatchSnapshot();
    });

    test("t-key on a component with t-if, and a sibling component", async () => {
      class Child extends Component {
        static template = xml`<span>child</span>`;
      }

      class Parent extends Component {
        static template = xml`
              <div>
                <Child t-if="false" t-key="'str'"/>
                <Child/>
              </div>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(fixture.innerHTML).toBe("<div><span>child</span></div>");
      expect(qweb.compiledTemplates[Parent.template].fn.toString()).toMatchSnapshot();
    });
  });
});
