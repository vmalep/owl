import { Component, mount, xml, useState } from "../../src/index";
import { makeTestFixture, nextTick } from "../helpers";
import { FComponent } from "../../src/components/core";
import { qweb } from "../../src/qweb/qweb";

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

describe("basic component properties", () => {
  describe("mounting components", () => {
    test("can mount a simple functional component", async () => {
      const Test = {
        template: xml`<div>simple vnode</div>`,
      };

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
      expect(qweb.compiledTemplates[Test.template].fn).toMatchSnapshot();
    });

    test("can mount a simple class component", async () => {
      class Test extends Component {
        static template = xml`<div>simple vnode</div>`;
      }

      const test = await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
      expect(test).toBeInstanceOf(Component);

      const div = fixture.querySelector("div");
      expect(div).toBeDefined();
      expect(test.el).toBe(div);
    });

    test("return value of mount contains the result of setup", async () => {
      const obj = {};
      const Test = {
        template: xml`<div>simple vnode</div>`,
        setup() {
          return obj;
        },
      };

      const test = await mount(Test, fixture);
      test.__owl__;
      expect((test as any).__proto__).toBe(obj);
      expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
    });

    // ---------------------------------------------------------------------------
    // only a text node
    // ---------------------------------------------------------------------------
    test("functional component, just a text node", async () => {
      const Test = {
        template: xml`simple text node`,
      };
      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("simple text node");
    });

    test("class component, text node", async () => {
      class Test extends Component {
        static template = xml`simple text node`;
      }

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("simple text node");
    });

    // ---------------------------------------------------------------------------
    // multiroot content
    // ---------------------------------------------------------------------------

    test("simple functional component, multiroot", async () => {
      const Test = {
        template: xml`<div>a</div><div>b</div>`,
      };

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
    });

    test("simple class component, multiroot", async () => {
      class Test extends Component {
        static template = xml`<div>a</div><div>b</div>`;
      }

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>a</div><div>b</div>");
    });

    // ---------------------------------------------------------------------------
    // simple mounting operation, dynamic content
    // ---------------------------------------------------------------------------

    test("functional component with dynamic content", async () => {
      const Test = {
        template: xml`<div>Hello <t t-esc="name"/></div>`,
        setup() {
          return { name: "Alex" };
        },
      };

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
    });

    test("class component with dynamic content", async () => {
      class Test extends Component {
        static template = xml`<div>Hello <t t-esc="name"/></div>`;
        name = "Alex";
      }

      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>Hello Alex</div>");
    });

    test("mounting  Component without template throw errors (*)", async () => {
      let e: Error | null = null;
      try {
        await mount(Component, fixture);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
      expect(e!.message).toBe('Component "Component" does not have a template defined!');
    });

    test("mounting a function Component without template throw errors (*)", async () => {
      let e: Error | null = null;
      const Test = {};
      try {
        await mount(Test as any, fixture);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
      expect(e!.message).toBe(
        'Component "Anonymous Function Component" does not have a template defined!'
      );
    });

    test("mounting a Class Component without template throw error (*)", async () => {
      class D extends Component {}
      let e: Error | null = null;
      try {
        await mount(D, fixture);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
      expect(e!.message).toBe('Component "D" does not have a template defined!');
    });

    test("mounting a Class Component  with a static template key not registered (*)", async () => {
      class D extends Component {
        static template = `<div>abc</div>`;
      }

      let e: Error | null = null;
      try {
        await mount(D, fixture);
      } catch (error) {
        e = error;
      }
      expect(e).toBeDefined();
      expect(e!.message).toBe(
        'Cannot find template with name "<div>abc</div>". Maybe you should register it with "xml" helper.'
      );
    });

    test("props is set on root class Components", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }
      const test = await mount(Test, fixture);
      expect(test.props).toEqual({});
    });

    test("functional component: props is received in setup function", async () => {
      expect.assertions(1);
      const Test = {
        template: xml`<div></div>`,
        setup(props: any) {
          expect(props).toEqual({});
        },
      };

      await mount(Test, fixture);
    });

    test("env is set on root class component (*)", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }
      const test = await mount(Test, fixture);
      expect(test.env).toEqual({});
    });

    test("env is set on root fcomponent (*)", async () => {
      expect.assertions(1);

      const Test: FComponent = {
        template: xml`<div></div>`,
        setup(props, env) {
          expect(env).toEqual({});
        },
      };
      await mount(Test, fixture);
    });

    test("configured env is set on root class component (*)", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }
      const env = { a: 1 };
      const test = await mount(Test, fixture, { env });
      expect(test.env).toEqual(env);
    });

    test("configured env is set on root fcomponent (*)", async () => {
      expect.assertions(2);
      const env = { a: 1 };

      const Test = {
        template: xml`<div></div>`,
        setup(props: any, env: any) {
          expect(env).toBe(env);
        },
      };
      const test = await mount(Test, fixture, { env });
      expect(test.env).toBe(env);
    });

    test("can give props to class component with mount method", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }
      const p = { a: 1 };
      const test = await mount(Test, fixture, { props: p });
      expect(test.props).toBe(p);
    });

    test("can give props to fcomponent with mount method", async () => {
      expect.assertions(1);
      const p = { a: 1 };

      const Test = {
        template: xml`<div></div>`,
        setup(props: any) {
          expect(props).toBe(p);
        },
      };

      await mount(Test, fixture, { props: p });
    });

    test("class component has no el after creation", async () => {
      expect.assertions(2);
      class Test extends Component {
        static template = xml`<div></div>`;
        constructor(props: any, env: any) {
          super(props, env);
          expect(this.el).toBeNull();
        }
      }
      const test = await mount(Test, fixture);
      expect(test.el).not.toBe(null);
    });

    test("class component can be mounted in a div", async () => {
      class SomeWidget extends Component {
        static template = xml`<div>content</div>`;
      }
      await mount(SomeWidget, fixture);
      expect(fixture.innerHTML).toBe("<div>content</div>");
    });

    test("fcomponent can be mounted in a div", async () => {
      const Test = {
        template: xml`<div>content</div>`,
      };
      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>content</div>");
    });

    test("class component can be mounted on a documentFragment, then mounted in a div", async () => {
      class Test extends Component {
        static template = xml`<div>content</div>`;
      }
      const fragment = document.createDocumentFragment();
      const test = await mount(Test, fragment);
      expect(fixture.innerHTML).toBe("");
      const result = await mount(test, fixture);
      expect(fixture.innerHTML).toBe("<div>content</div>");
      expect(result).toBe(test);
    });

    test("fcomponent can be mounted on a documentFragment, then mounted in a div", async () => {
      const Test = {
        template: xml`<div>content</div>`,
      };
      const fragment = document.createDocumentFragment();
      const test = await mount(Test, fragment);
      expect(fixture.innerHTML).toBe("");
      await mount(test, fixture);
      expect(fixture.innerHTML).toBe("<div>content</div>");
    });

    test("class component: display a nice error message if mounted on a non existing node", async () => {
      class Test extends Component {
        static template = xml`<div>content</div>`;
      }
      let error;
      try {
        await mount(Test, null as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe(
        "Component 'Test' cannot be mounted: the target is not a valid DOM node.\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)"
      );
    });

    test("fcomponent: display a nice message if mounted on a non existing node", async () => {
      const Test = {
        template: xml`<div>content</div>`,
      };
      let error;
      try {
        await mount(Test, null as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe(
        "Component 'No Name' cannot be mounted: the target is not a valid DOM node.\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)"
      );
    });

    test("class component: display a nice message if mounted on an invalid node (*)", async () => {
      class Test extends Component {
        static template = xml`<div>content</div>`;
      }
      let error;
      try {
        await mount(Test, {} as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe(
        "Component 'Test' cannot be mounted: the target is not a valid DOM node.\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)"
      );
    });

    test("fcomponent: display a nice message if mounted on an invalid node (*)", async () => {
      const Test = {
        template: xml`<div>content</div>`,
      };
      let error;
      try {
        await mount(Test, {} as any);
      } catch (e) {
        error = e;
      }
      expect(error).toBeDefined();
      expect(error.message).toBe(
        "Component 'No Name' cannot be mounted: the target is not a valid DOM node.\nMaybe the DOM is not ready yet? (in that case, you can use owl.utils.whenReady)"
      );
    });

    test("ccomponent: can be clicked on and updated", async () => {
      class Counter extends Component {
        static template = xml`
          <div>
            <t t-esc="state.counter"/>
            <button t-on-click="state.counter++">Inc</button>
          </div>`;
        state = useState({
          counter: 0,
        });
      }

      await mount(Counter, fixture);

      expect(fixture.innerHTML).toBe("<div>0<button>Inc</button></div>");
      fixture.querySelector("button")!.click();
      await nextTick();
      expect(fixture.innerHTML).toBe("<div>1<button>Inc</button></div>");
    });

    test("fcomponent: can be clicked on and updated", async () => {
      const Counter = {
        template: xml`
          <div>
            <t t-esc="state.counter"/><button t-on-click="state.counter++">Inc</button>
          </div>`,
        setup() {
          const state = useState({ counter: 0 });
          return { state };
        },
      };

      await mount(Counter, fixture);
      expect(fixture.innerHTML).toBe("<div>0<button>Inc</button></div>");
      fixture.querySelector("button")!.click();
      await nextTick();
      expect(fixture.innerHTML).toBe("<div>1<button>Inc</button></div>");
    });

    test("ccomponent: can handle empty props", async () => {
      class Child extends Component {
        static template = xml`<span><t t-esc="props.val"/></span>`;
      }
      class Parent extends Component {
        static template = xml`<div><Child val=""/></div>`;
        static components = { Child };
      }

      await mount(Parent, fixture);
      expect(qweb.compiledTemplates[Parent.template].fn.toString()).toMatchSnapshot();
      expect(fixture.innerHTML).toBe("<div><span></span></div>");
    });

    test("fcomponent: can handle empty props", async () => {
      const Child = {
        template: xml`<span><t t-esc="props.val"/></span>`,
      };
      const Parent = {
        template: xml`<div><Child val=""/></div>`,
        components: { Child },
      };

      await mount(Parent, fixture);
      expect(qweb.compiledTemplates[Parent.template].fn.toString()).toMatchSnapshot();
      expect(fixture.innerHTML).toBe("<div><span></span></div>");
    });

    test("ccomponent: can access env in template (*)", async () => {
      class Test extends Component {
        static template = xml`<span><t t-esc="env.val"/></span>`;
      }

      await mount(Test, fixture, { env: { val: 3 } });
      expect(fixture.innerHTML).toBe("<span>3</span>");
    });

    test("fcomponent: can access env in template (*)", async () => {
      const Test = {
        template: xml`<span><t t-esc="env.val"/></span>`,
      };

      await mount(Test, fixture, { env: { val: 3 } });
      expect(fixture.innerHTML).toBe("<span>3</span>");
    });

    test("ccomponents are flagged mounted if in dom (*)", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }

      const target = document.createElement("div");
      const test1 = await mount(Test, target);
      expect(test1.__owl__!.isMounted).toBe(false);
      const test2 = await mount(Test, fixture);
      expect(test2.__owl__!.isMounted).toBe(true);
    });

    test("fcomponents are flagged mounted if in dom (*)", async () => {
      const Test = {
        template: xml`<div></div>`,
      };

      const target = document.createElement("div");
      const test1 = await mount(Test, target);
      expect(test1.__owl__.isMounted).toBe(false);
      const test2 = await mount(Test, fixture);
      expect(test2.__owl__.isMounted).toBe(true);
    });

    test("ccomponent: cannot be clicked on and updated if not in DOM", async () => {
      class Counter extends Component {
        static template = xml`
          <div>
            <t t-esc="state.counter"/>
            <button t-on-click="increment">Inc</button>
          </div>`;
        state = useState({
          counter: 0,
        });
        increment() {
          this.state.counter++;
        }
      }

      const target = document.createElement("div");
      const counter = await mount(Counter, target);
      expect(target.innerHTML).toBe("<div>0<button>Inc</button></div>");
      const button = target.getElementsByTagName("button")[0];
      button.click();
      await nextTick();
      expect(target.innerHTML).toBe("<div>0<button>Inc</button></div>");
      expect(counter.state.counter).toBe(0);
    });

    test("fcomponent: cannot be clicked on and updated if not in DOM", async () => {
      const Counter = {
        template: xml`
          <div>
            <t t-esc="state.counter"/>
            <button t-on-click="state.counter++">Inc</button>
          </div>`,
        setup() {
          return { state: useState({ counter: 0 }) };
        },
      };

      const target = document.createElement("div");
      const counter = await mount(Counter, target);
      expect(target.innerHTML).toBe("<div>0<button>Inc</button></div>");
      const button = target.querySelector("button")!;
      button.click();
      await nextTick();
      expect(target.innerHTML).toBe("<div>0<button>Inc</button></div>");
      expect(counter.state.counter).toBe(0);
    });

    test("ccomponent with style and classname", async () => {
      class Test extends Component {
        static template = xml`
          <div style="font-weight:bold;" class="some-class">world</div>
        `;
      }
      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe(
        `<div style="font-weight:bold;" class="some-class">world</div>`
      );
    });

    test("fcomponent with style and classname", async () => {
      const Test = {
        template: xml`
          <div style="font-weight:bold;" class="some-class">world</div>`,
      };
      await mount(Test, fixture);
      expect(fixture.innerHTML).toBe(
        `<div style="font-weight:bold;" class="some-class">world</div>`
      );
    });

    test("ccomponent: keeps a reference to env", async () => {
      class Test extends Component {
        static template = xml`<div></div>`;
      }
      const env = { a: 3 };
      const test = await mount(Test, fixture, { env });
      expect(test.env).toBe(env);
    });
  });

  describe("rerendering components", () => {
    test("ccomponent: render method wait until rendering is done", async () => {
      class Test extends Component {
        static template = xml`<div><t t-esc="state.drinks"/></div>`;
        state = { drinks: 1 };
      }
      const test = await mount(Test, fixture);
      expect(fixture.innerHTML).toBe("<div>1</div>");

      test.state.drinks = 2;

      const renderPromise = test.render();
      expect(fixture.innerHTML).toBe("<div>1</div>");
      await renderPromise;
      expect(fixture.innerHTML).toBe("<div>2</div>");
    });

    test("ccomponent: do not remove previously rendered dom if not necessary", async () => {
      class Test extends Component {
        static template = xml`<div/>`;
      }
      const test = await mount(Test, fixture);
      expect(fixture.innerHTML).toBe(`<div></div>`);

      test.el!.appendChild(document.createElement("span"));
      expect(fixture.innerHTML).toBe(`<div><span></span></div>`);
      await test.render();
      expect(fixture.innerHTML).toBe(`<div><span></span></div>`);
    });
  });
});
