import { EMPTY_OBJ, EMPTY_ARR } from "./constants";
import { commitRoot } from "./diff/index";
import { diffChildren } from "./diff/children";
import options from "./options";
import { Fragment, createElement } from "./create-element";

export function render(
    vnode,
    parentDom,
    replaceNode
) {
    // Hooks parentDom
    if (options.root) {
        options.root(vnode, parentDom);
    }
    const oldVNode = parentDom._children;
    vnode = createElement(Fragment, null, [vnode]);


    const newParentVNode = replaceNode ?
        vnode :
        (parentDom._children = vnode);
    const context = EMPTY_OBJ;
    const isSvg = parentDom.ownerSVGElement !== undefined;
    const exessDomChildren = replaceNode ?
        [replaceNode] :
        oldVNode ?
            null :
            EMPTY_ARR.slice.call(parentDom.childNodes);
    const mounts = [];
    const ancestorComponent = vnode;
    const oldDom = replaceNode || EMPTY_OBJ;
    diffChildren(
        parentDom,
        newParentVNode,
        oldVNode,
        context,
        isSvg,
        exessDomChildren,
        mounts,
        ancestorComponent,
        oldDom
    );
    commitRoot(mounts, vnode);
};