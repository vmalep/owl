import { Block } from "./block";

// -----------------------------------------------------------------------------
//  Static Block
// -----------------------------------------------------------------------------

export class BStatic extends Block {
  static el: ChildNode;

  firstChildNode(): ChildNode | null {
    return this.el;
  }

  toString(): string {
    const div = document.createElement("div");
    this.mount(div, [], []);
    return div.innerHTML;
  }

  mountBefore(anchor: ChildNode) {
    this.el = (this.constructor as any).el.cloneNode(true);
    anchor.before(this.el!);
  }

  moveBefore(anchor: ChildNode) {
    anchor.before(this.el!);
  }

  update() {}

  patch() {}

  remove() {
    this.el!.remove();
  }
}
