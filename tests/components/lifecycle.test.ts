import { Component, mount, xml } from "../../src/index";
import { makeTestFixture } from "../helpers";

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

describe("component lifecycle methods and hooks", () => {
  test("ccomponent: willStart hook is called", async () => {
    let willstart = false;
    class Test extends Component {
      static template = xml`<div/>`;
      async willStart() {
        willstart = true;
      }
    }
    await mount(Test, fixture);
    expect(willstart).toBe(true);
  });

  test("fcomponent: setup method is properly waited before rendering", async () => {
    const Test = {
      template: xml`<div t-esc="val"/>`,
      async setup() {
        return { val: "value" };
      },
    };

    await mount(Test, fixture);
    expect(fixture.innerHTML).toBe("<div>value</div>");
  });

  test("ccomponent: mounted hook is not called if not in DOM", async () => {
    let mounted = false;
    class Test extends Component {
      static template = xml`<div/>`;
      async mounted() {
        mounted = true;
      }
    }
    const target = document.createElement("div");
    await mount(Test, target);
    expect(mounted).toBe(false);
  });

  test("ccomponent: mounted hook is called if mounted in DOM", async () => {
    let mounted = false;
    class Test extends Component {
      static template = xml`<div/>`;
      async mounted() {
        mounted = true;
      }
    }
    await mount(Test, fixture);
    expect(mounted).toBe(true);
  });

  test("mounted hook is called on subcomponents, in proper order", async () => {
    const steps: any[] = [];

    class Child extends Component {
      static template = xml`<div/>`;
      mounted() {
        expect(document.body.contains(this.el)).toBe(true);
        steps.push("child:mounted");
      }
    }

    class Test extends Component {
      static template = xml`<div><Child /></div>`;
      static components = { Child };
      mounted() {
        steps.push("parent:mounted");
      }
    }
    await mount(Test, fixture);
    expect(steps).toEqual(["child:mounted", "parent:mounted"]);
  });
});
