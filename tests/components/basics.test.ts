import { mount, render } from "../../src";
import { xml, makeTestFixture, snapshotEverything, nextTick } from "../helpers";

let fixture: HTMLElement;

snapshotEverything();
beforeEach(() => {
  fixture = makeTestFixture();
});

describe("basics", () => {
  test("can mount a simple component", async () => {
    
    function Test() {
      const template = xml`<span>simple vnode</span>`;
      return () => render(template);
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("<span>simple vnode</span>");
  });

  // test("has no el after creation", async () => {
  //   let el: any = null;
  //   class Test extends Component {
  //     static template = xml`<span>simple</span>`;
  //     setup() {
  //       el = this.el;
  //     }
  //   }

  //   await mount(Test, fixture);
  //   expect(el).toBeNull();
  // });

  // test("cannot mount on a documentFragment", async () => {
  //   class SomeWidget extends Component {
  //     static template = xml`<div>content</div>`;
  //   }
  //   let error;
  //   try {
  //     await mount(SomeWidget, document.createDocumentFragment() as any);
  //   } catch (e) {
  //     error = e;
  //   }
  //   expect(error).toBeDefined();
  //   expect(error.message).toBe("Cannot mount component: the target is not a valid DOM element");
  // });

  // test("can mount a simple component with props", async () => {
  //   class Test extends Component {
  //     static template = xml`<span><t t-esc="props.value"/></span>`;
  //   }

  //   const app = new App(Test, { value: 3 });
  //   const component = await app.mount(fixture);

  //   expect(fixture.innerHTML).toBe("<span>3</span>");
  //   expect(component.el).toEqual(fixture.querySelector("span"));
  // });

  test("can mount a component with just some text", async () => {
    
    function Test() {
      const template = xml`just text`;
      return () => render(template);
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("just text");
  });

  test("can mount a component with no text", async () => {
    function Test() {
      const template = xml`<t></t>`;
      return () => render(template);
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("");
  });

  test("can mount a component with dynamic text", async () => {
    function Test() {
      const template = xml`<t t-esc="value"/>`;
      return () => render(template, { value: 3 });
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("3");
  });

  test("can mount a simple component with multiple roots", async () => {
    
    function Test() {
      const template = xml`<span></span><div></div>`;
      return () => render(template);
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("<span></span><div></div>");
  });

  test("component with dynamic content can be updated", async () => {
    
    function Test(node: any) {
      const template = xml`
        <button t-on-click="inc">
          <t t-esc="value"/>
        </button>`;
      let value = 1;

      const inc = () => {
        value++;
        node.render();
      };
      return () => render(template, { value, inc });
    }

    await mount(Test, fixture);

    expect(fixture.innerHTML).toBe("<button>1</button>");

    fixture.querySelector("button")!.click();
    await nextTick();
    expect(fixture.innerHTML).toBe("<button>2</button>");
  });

  // test("updating a component with t-foreach as root", async () => {
  //   class Test extends Component {
  //     static template = xml`
  //       <t t-foreach="items" t-as="item" t-key="item">
  //         <t t-esc="item"/>
  //       </t>`;
  //     items = ["one", "two", "three"];
  //   }

  //   const component = await mount(Test, fixture);

  //   expect(fixture.innerHTML).toBe("onetwothree");
  //   component.items = ["two", "three", "one"];
  //   await component.render();
  //   expect(fixture.innerHTML).toBe("twothreeone");
  // });

  // test("props is set on root component", async () => {
  //   expect.assertions(2);
  //   const p = {};
  //   class Test extends Component {
  //     static template = xml`<span>simple vnode</span>`;
  //     setup() {
  //       expect(this.props).toBe(p);
  //     }
  //   }

  //   const app = new App(Test, p);
  //   await app.mount(fixture);
  // });

  // test("some simple sanity checks (el/status)", async () => {
  //   expect.assertions(4);
  //   class Test extends Component {
  //     static template = xml`<span>simple vnode</span>`;
  //     setup() {
  //       expect(this.el).toBe(null);
  //       expect(status(this)).toBe("new");
  //     }
  //   }

  //   const test = await mount(Test, fixture);
  //   expect(status(test)).toBe("mounted");
  // });

  // test("throws if mounting on target=null", async () => {
  //   class Test extends Component {
  //     static template = xml`<span>simple vnode</span>`;
  //   }

  //   let error;
  //   try {
  //     await mount(Test, null as any);
  //   } catch (e) {
  //     error = e;
  //   }
  //   expect(error).toBeDefined();
  //   expect(error.message).toBe("Cannot mount component: the target is not a valid DOM element");
  // });

  // test("a component cannot be mounted in a detached node", async () => {
  //   class Test extends Component {
  //     static template = xml`<div/>`;
  //   }
  //   let error;
  //   try {
  //     await mount(Test, document.createElement("div"));
  //   } catch (e) {
  //     error = e;
  //   }
  //   expect(error).toBeDefined();
  //   expect(error.message).toBe("Cannot mount a component on a detached dom node");
  // });

  // test("crashes if it cannot find a template", async () => {
  //   class Test extends Component {
  //     static template = "wrongtemplate";
  //   }

  //   let error;
  //   try {
  //     await mount(Test, fixture);
  //   } catch (e) {
  //     error = e;
  //   }
  //   expect(error).toBeDefined();
  //   expect(error.message).toBe('Missing template: "wrongtemplate"');
  // });

  // test("class component with dynamic text", async () => {
  //   class Test extends Component {
  //     static template = xml`<span>My value: <t t-esc="value"/></span>`;

  //     value = 42;
  //   }

  //   await mount(Test, fixture);
  //   expect(fixture.innerHTML).toBe("<span>My value: 42</span>");
  // });

  // test("Multi root component", async () => {
  //   class Test extends Component {
  //     static template = xml`<span>1</span>text<span>2</span>`;

  //     value = 42;
  //   }

  //   await mount(Test, fixture);
  //   expect(fixture.innerHTML).toBe(`<span>1</span>text<span>2</span>`);
  // });

  test("a component inside a component", async () => {
    function Child() {
      const template = xml`<div>simple vnode</div>`;
      return () => render(template);
    }

    function Parent() {
      const template = xml`<span><Child/></span>`;

      return () => render(template, { Child });
    }

    await mount(Parent, fixture);
    expect(fixture.innerHTML).toBe("<span><div>simple vnode</div></span>");
  });

  // test("a class component inside a class component, no external dom", async () => {
  //   class Child extends Component {
  //     static template = xml`<div>simple vnode</div>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child/>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
  // });

  // test("simple component with a dynamic text", async () => {
  //   class Test extends Component {
  //     static template = xml`<div><t t-esc="value" /></div>`;
  //     value = 3;
  //   }

  //   const test = await mount(Test, fixture);
  //   expect(fixture.innerHTML).toBe("<div>3</div>");
  //   test.value = 5;
  //   await test.render();
  //   expect(fixture.innerHTML).toBe("<div>5</div>");
  // });

  // test("simple component, useState", async () => {
  //   class Test extends Component {
  //     static template = xml`<div><t t-esc="state.value" /></div>`;
  //     state = useState({ value: 3 });
  //   }

  //   const test = await mount(Test, fixture);
  //   expect(fixture.innerHTML).toBe("<div>3</div>");
  //   test.state.value = 5;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div>5</div>");
  // });

  // test("two child components", async () => {
  //   class Child extends Component {
  //     static template = xml`<div>simple vnode</div>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child/><Child/>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div>simple vnode</div><div>simple vnode</div>");
  // });

  // test("class parent, class child component with props", async () => {
  //   class Child extends Component {
  //     static template = xml`<div><t t-esc="props.value" /></div>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child value="42" />`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div>42</div>");
  // });

  // test("parent, child and grandchild", async () => {
  //   class GrandChild extends Component {
  //     static template = xml`<div>hey</div>`;
  //   }

  //   class Child extends Component {
  //     static template = xml`<GrandChild />`;
  //     static components = { GrandChild };
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child/>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div>hey</div>");
  // });

  // test("zero or one child components", async () => {
  //   class Child extends Component {
  //     static template = xml`<div>simple vnode</div>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child t-if="state.hasChild"/>`;
  //     static components = { Child };
  //     state = useState({ hasChild: false });
  //   }

  //   const parent = await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("");
  //   parent.state.hasChild = true;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div>simple vnode</div>");
  // });

  // test("can be clicked on and updated", async () => {
  //   class Counter extends Component {
  //     static template = xml`
  //     <div><t t-esc="state.counter"/><button t-on-click="state.counter++">Inc</button></div>`;
  //     state = useState({
  //       counter: 0,
  //     });
  //   }

  //   const counter = await mount(Counter, fixture);
  //   expect(fixture.innerHTML).toBe("<div>0<button>Inc</button></div>");
  //   const button = (<HTMLElement>counter.el).getElementsByTagName("button")[0];
  //   button.click();
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div>1<button>Inc</button></div>");
  // });

  // test("can handle empty props", async () => {
  //   class Child extends Component {
  //     static template = xml`<span><t t-esc="props.val"/></span>`;
  //   }
  //   class Parent extends Component {
  //     static template = xml`<div><Child val=""/></div>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div><span></span></div>");
  // });

  // test("child can be updated", async () => {
  //   class Child extends Component {
  //     static template = xml`<t t-esc="props.value"/>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child value="state.counter"/>`;
  //     static components = { Child };
  //     state = useState({
  //       counter: 0,
  //     });
  //   }

  //   const parent = await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("0");

  //   parent.state.counter = 1;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("1");
  // });

  // test("higher order components parent and child", async () => {
  //   class ChildA extends Component {
  //     static template = xml`<div>a</div>`;
  //   }
  //   class ChildB extends Component {
  //     static template = xml`<span>b</span>`;
  //   }
  //   class Child extends Component {
  //     static template = xml`<ChildA t-if="props.child==='a'"/><ChildB t-else=""/>`;
  //     static components = { ChildA, ChildB };
  //   }

  //   class Parent extends Component {
  //     static template = xml`<Child child="state.child" />`;
  //     static components = { Child };

  //     state = useState({ child: "a" });
  //   }

  //   const parent = await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe(`<div>a</div>`);
  //   parent.state.child = "b";
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe(`<span>b</span>`);
  // });

  // test("three level of components with collapsing root nodes", async () => {
  //   class GrandChild extends Component {
  //     static template = xml`<div>2</div>`;
  //   }
  //   class Child extends Component {
  //     static components = { GrandChild };
  //     static template = xml`<GrandChild/>`;
  //   }
  //   class Parent extends Component {
  //     static components = { Child };
  //     static template = xml`<Child></Child>`;
  //   }

  //   await mount(Parent, fixture);

  //   expect(fixture.innerHTML).toBe("<div>2</div>");
  // });

  // test("do not remove previously rendered dom if not necessary", async () => {
  //   class SomeComponent extends Component {
  //     static template = xml`<div/>`;
  //   }
  //   const widget = await mount(SomeComponent, fixture);
  //   expect(fixture.innerHTML).toBe(`<div></div>`);
  //   widget.el!.appendChild(document.createElement("span"));
  //   expect(fixture.innerHTML).toBe(`<div><span></span></div>`);
  //   await widget.render();
  //   expect(fixture.innerHTML).toBe(`<div><span></span></div>`);
  // });

  // test("do not remove previously rendered dom if not necessary, variation", async () => {
  //   class SomeComponent extends Component {
  //     static template = xml`<div><h1>h1</h1><span><t t-esc="state.value"/></span></div>`;
  //     state = useState({ value: 1 });
  //   }
  //   const comp = await mount(SomeComponent, fixture);
  //   expect(fixture.innerHTML).toBe(`<div><h1>h1</h1><span>1</span></div>`);
  //   comp.el!.querySelector("h1")!.appendChild(document.createElement("p"));
  //   expect(fixture.innerHTML).toBe("<div><h1>h1<p></p></h1><span>1</span></div>");

  //   comp.state.value++;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div><h1>h1<p></p></h1><span>2</span></div>");
  // });

  // test("reconciliation alg is not confused in some specific situation", async () => {
  //   // in this test, we set t-key to 4 because it was in conflict with the
  //   // template id corresponding to the first child.
  //   class Child extends Component {
  //     static template = xml`<span>child</span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //           <Child />
  //           <Child t-key="4"/>
  //       </div>
  //     `;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div><span>child</span><span>child</span></div>");
  // });

  // test("same t-keys in two different places", async () => {
  //   class Child extends Component {
  //     static template = xml`<span><t t-esc="props.blip"/></span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //           <div><Child t-key="1" blip="'1'"/></div>
  //           <div><Child t-key="1" blip="'2'"/></div>
  //       </div>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div><div><span>1</span></div><div><span>2</span></div></div>");
  // });

  // test("t-key on a component with t-if, and a sibling component", async () => {
  //   class Child extends Component {
  //     static template = xml`<span>child</span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //         <Child t-if="false" t-key="'str'"/>
  //         <Child/>
  //       </div>`;
  //     static components = { Child };
  //   }

  //   await mount(Parent, fixture);
  //   expect(fixture.innerHTML).toBe("<div><span>child</span></div>");
  // });

  // test("widget after a t-foreach", async () => {
  //   class SomeComponent extends Component {
  //     static template = xml`<div/>`;
  //   }

  //   class Test extends Component {
  //     static template = xml`<div><t t-foreach="Array(2)" t-as="elem" t-key="elem_index">txt</t><SomeComponent/></div>`;
  //     static components = { SomeComponent };
  //   }

  //   await mount(Test, fixture);
  //   expect(fixture.innerHTML).toBe("<div>txttxt<div></div></div>");
  // });

  // test("t-if works with t-component", async () => {
  //   class Child extends Component {
  //     static template = xml`<span>hey</span>`;
  //   }
  //   class Parent extends Component {
  //     static template = xml`<div><Child t-if="state.flag"/></div>`;
  //     static components = { Child };
  //     state = useState({ flag: true });
  //   }

  //   const parent = await mount(Parent, fixture);

  //   expect(fixture.innerHTML).toBe("<div><span>hey</span></div>");

  //   parent.state.flag = false;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div></div>");

  //   parent.state.flag = true;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div><span>hey</span></div>");
  // });

  // test("t-else works with t-component", async () => {
  //   class Child extends Component {
  //     static template = xml`<span>hey</span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //         <div t-if="state.flag">somediv</div>
  //         <Child t-else=""/>
  //       </div>`;
  //     static components = { Child };
  //     state = useState({ flag: true });
  //   }

  //   const parent = await mount(Parent, fixture);

  //   expect(fixture.innerHTML).toBe("<div><div>somediv</div></div>");

  //   parent.state.flag = false;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div><span>hey</span></div>");
  // });

  // test("t-elif works with t-component", async () => {
  //   class Child extends Component {
  //     static template = xml`<span>hey</span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //         <div t-if="state.flag">somediv</div>
  //         <Child t-elif="!state.flag" />
  //       </div>`;
  //     static components = { Child };
  //     state = useState({ flag: true });
  //   }

  //   const parent = await mount(Parent, fixture);

  //   expect(fixture.innerHTML).toBe("<div><div>somediv</div></div>");

  //   parent.state.flag = false;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div><span>hey</span></div>");
  // });

  // test("t-else with empty string works with t-component", async () => {
  //   class Child extends Component {
  //     static template = xml`<span>hey</span>`;
  //   }

  //   class Parent extends Component {
  //     static template = xml`
  //       <div>
  //         <div t-if="state.flag">somediv</div>
  //         <Child t-else="" />
  //       </div>`;
  //     static components = { Child };
  //     state = useState({ flag: true });
  //   }

  //   const parent = await mount(Parent, fixture);

  //   expect(fixture.innerHTML).toBe("<div><div>somediv</div></div>");

  //   parent.state.flag = false;
  //   await nextTick();
  //   expect(fixture.innerHTML).toBe("<div><span>hey</span></div>");
  // });
});
