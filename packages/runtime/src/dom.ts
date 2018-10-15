import { DI, IContainer, IResolver, PLATFORM } from '@aurelia/kernel';
import { ICustomElement } from '.';

export interface INodeLike {
  readonly firstChild: INode | null;
  readonly lastChild: INode | null;
  readonly childNodes: ArrayLike<INode>;
}

export interface INode extends INodeLike {
  readonly parentNode: INode | null;
  readonly nextSibling: INode | null;
  readonly previousSibling: INode | null;
  readonly content?: INode;
}

/*@internal*/
export class AuMarker implements INode {
  public get parentNode(): INode {
    return this.nextSibling.parentNode;
  }
  public nextSibling: INode;
  public previousSibling: INode = null;
  public content?: INode;
  public firstChild: INode = null;
  public lastChild: INode = null;
  public childNodes: ArrayLike<INode> = PLATFORM.emptyArray;

  constructor(next: INode) {
    this.nextSibling = next;
  }
  // tslint:disable-next-line:no-empty
  public remove(): void { }
}

export interface ICustomElementHost extends INode {
  $customElement?: ICustomElement;
}

export const INode = DI.createInterface<INode>().noDefault();

export interface IRenderLocation extends ICustomElementHost { }


export const IRenderLocation = DI.createInterface<IRenderLocation>().noDefault();

/**
 * Represents a DocumentFragment
 */
export interface INodeSequence extends INodeLike {
  /**
   * The nodes of this sequence.
   */
  childNodes: ReadonlyArray<INode>;

  /**
   * Find all instruction targets in this sequence.
   */
  findTargets(): ArrayLike<INode> | ReadonlyArray<INode>;

  /**
   * Insert this sequence as a sibling before refNode
   */
  insertBefore(refNode: INode): void;

  /**
   * Append this sequence as a child to parent
   */
  appendTo(parent: INode): void;

  /**
   * Remove this sequence from its parent.
   */
  remove(): void;
}

export interface INodeObserver {
  disconnect(): void;
}

export const DOM = {
  createNodeSequenceFactory(markupOrNode: string | INode): () => INodeSequence {
    let fragment: DocumentFragment;
    if (DOM.isNodeInstance(markupOrNode)) {
      if (markupOrNode.content !== undefined) {
        fragment = markupOrNode.content as DocumentFragment;
      } else {
        fragment = DOM.createFragment() as DocumentFragment;;
        DOM.appendChild(fragment, markupOrNode);
      }
    } else {
      const template = DOM.createTemplate();
      (<Element>template).innerHTML = markupOrNode;
      fragment = template.content as DocumentFragment;
    }
    const childNodes = fragment.childNodes;
    if (childNodes.length === 2) {
      const target = childNodes[0] as Element;
      if (target.nodeName === 'AU-MARKER') {
        const text = childNodes[1];
        if (text.nodeType === 3 && text.textContent === ' ') {
          // tslint:disable-next-line:typedef
          return (function() {
            return new TextNodeSequence(<Text>text.cloneNode(false));
          }).bind(undefined);
        }
      }
    }
    // tslint:disable-next-line:typedef
    return (function() {
      return new FragmentNodeSequence(<DocumentFragment>fragment.cloneNode(true));
    }).bind(undefined);
  },

  createElement(name: string): INode {
    return document.createElement(name);
  },

  createText(text: string): INode {
    return document.createTextNode(text);
  },

  createNodeObserver(target: INode, callback: MutationCallback, options: MutationObserverInit) {
    const observer = new MutationObserver(callback);
    observer.observe(target as Node, options);
    return observer;
  },

  attachShadow(host: INode, options: ShadowRootInit): INode {
    return (host as Element).attachShadow(options);
  },

  /*@internal*/
  createTemplate(): INode {
    return document.createElement('template');
  },

  /*@internal*/
  createFragment(): INode {
    return document.createDocumentFragment();
  },

  cloneNode(node: INode, deep?: boolean): INode {
    return (<Node>node).cloneNode(deep !== false); // use true unless the caller explicitly passes in false
  },

  migrateChildNodes(currentParent: INode, newParent: INode): void {
    const append = DOM.appendChild;
    while (currentParent.firstChild) {
      append(newParent, currentParent.firstChild);
    }
  },

  isNodeInstance(potentialNode: any): potentialNode is INode {
    return potentialNode instanceof Node;
  },

  isElementNodeType(node: INode): boolean {
    return (<Node>node).nodeType === 1;
  },

  isTextNodeType(node: INode): boolean {
    return (<Node>node).nodeType === 3;
  },

  remove(node: INodeLike): void {
    if ((<Element>node).remove) {
      (<Element>node).remove();
    } else {
      (<Element>node).parentNode.removeChild(<any>node);
    }
  },

  replaceNode(newChild: INode, oldChild: INode): void {
    if (oldChild.parentNode) {
      (<Node>oldChild.parentNode).replaceChild(<Node>newChild, <Node>oldChild);
    }
  },

  appendChild(parent: INode, child: INode): void {
    (<Node>parent).appendChild(<Node>child);
  },

  insertBefore(nodeToInsert: INode, referenceNode: INode): void {
    (<Node>referenceNode.parentNode).insertBefore(<Node>nodeToInsert, <Node>referenceNode);
  },

  getAttribute(node: INode, name: string): any {
    return (<Element>node).getAttribute(name);
  },

  setAttribute(node: INode, name: string, value: any): void {
    (<Element>node).setAttribute(name, value);
  },

  removeAttribute(node: INode, name: string): void {
    (<Element>node).removeAttribute(name);
  },

  hasClass(node: INode, className: string): boolean {
    return (<Element>node).classList.contains(className);
  },

  addClass(node: INode, className: string): void {
    (<Element>node).classList.add(className);
  },

  removeClass(node: INode, className: string): void {
    (<Element>node).classList.remove(className);
  },

  addEventListener(eventName: string, subscriber: any, publisher?: INode, options?: any) {
    (<Node>publisher || document).addEventListener(eventName, subscriber, options);
  },

  removeEventListener(eventName: string, subscriber: any, publisher?: INode, options?: any) {
    (<Node>publisher || document).removeEventListener(eventName, subscriber, options);
  },

  isAllWhitespace(node: INode): boolean {
    if ((<any>node).auInterpolationTarget === true) {
      return false;
    }
    const text = (node as Node).textContent;
    const len = text.length;
    let i = 0;
    // for perf benchmark of this compared to the regex method: http://jsben.ch/p70q2 (also a general case against using regex)
    while (i < len) {
      // charCodes 0-0x20(32) can all be considered whitespace (non-whitespace chars in this range don't have a visual representation anyway)
      if (text.charCodeAt(i) > 0x20) {
        return false;
      }
      i++;
    }
    return true;
  },

  treatAsNonWhitespace(node: INode): void {
    // see isAllWhitespace above
    (<any>node).auInterpolationTarget = true;
  },

  convertToRenderLocation(node: INode): IRenderLocation {
    const location = document.createComment('au-loc');
    // let this throw if node does not have a parent
    (<Node>node.parentNode).replaceChild(location, <any>node);
    return location;
  },

  registerElementResolver(container: IContainer, resolver: IResolver): void {
    container.registerResolver(INode, resolver);
    container.registerResolver(Element, resolver);
    container.registerResolver(HTMLElement, resolver);
    container.registerResolver(SVGElement, resolver);
  }
};

// This is an implementation of INodeSequence that represents "no DOM" to render.
// It's used in various places to avoid null and to encode
// the explicit idea of "no view".
const emptySequence: INodeSequence = {
  firstChild: null,
  lastChild: null,
  childNodes: PLATFORM.emptyArray,
  findTargets() { return PLATFORM.emptyArray; },
  insertBefore(refNode: INode): void {},
  appendTo(parent: INode): void {},
  remove(): void {}
};

export const NodeSequence = {
  empty: emptySequence
};

/**
 * An specialized INodeSequence with optimizations for text (interpolation) bindings
 * The contract of this INodeSequence is:
 * - the previous element is an `au-marker` node
 * - text is the actual text node
 */
export class TextNodeSequence implements INodeSequence {
  public firstChild: Text;
  public lastChild: Text;
  public childNodes: Text[];

  private targets: [INode];

  constructor(text: Text) {
    this.firstChild = text;
    this.lastChild = text;
    this.childNodes = [text];
    this.targets = [new AuMarker(text)];
  }

  public findTargets(): ArrayLike<INode> {
    return this.targets;
  }

  public insertBefore(refNode: Node): void {
    refNode.parentNode.insertBefore(this.firstChild, refNode);
  }

  public appendTo(parent: Node): void {
    parent.appendChild(this.firstChild);
  }

  public remove(): void {
    this.firstChild.remove()
  }
}

// This is the most common form of INodeSequence.
// Every custom element or template controller whose node sequence is based on an HTML template
// has an instance of this under the hood. Anyone who wants to create a node sequence from
// a string of markup would also receive an instance of this.
// CompiledTemplates create instances of FragmentNodeSequence.
/*@internal*/
export class FragmentNodeSequence implements INodeSequence {
  public firstChild: Node;
  public lastChild: Node;
  public childNodes: Node[];

  private fragment: DocumentFragment;

  constructor(fragment: DocumentFragment) {
    this.fragment = fragment;
    this.firstChild = fragment.firstChild;
    this.lastChild = fragment.lastChild;
    this.childNodes = PLATFORM.toArray(fragment.childNodes);
  }

  public findTargets(): ArrayLike<Node> {
    return this.fragment.querySelectorAll('.au');
  }

  public insertBefore(refNode: Node): void {
    refNode.parentNode.insertBefore(this.fragment, refNode);
  }

  public appendTo(parent: Node): void {
    parent.appendChild(this.fragment);
  }

  public remove(): void {
    const fragment = this.fragment;
    let current = this.firstChild;

    if (current.parentNode !== fragment) {
      // this bind is a small perf tweak to minimize member accessors
      const append = fragment.appendChild.bind(fragment);
      const end = this.lastChild;
      let next: Node;

      while (current) {
        next = current.nextSibling;
        append(current);

        if (current === end) {
          break;
        }

        current = next;
      }
    }
  }
}
