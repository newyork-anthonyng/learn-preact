import { coerceToVNode } from "../create-element";
import { diff, unmount, applyRef } from "./index";
import { EMPTY_ARR, EMPTY_OBJ } from "../constants";
import { removeNode } from "../util";

/**
 * 
 * @param parentDom the DOM element whose children are being diffed
 * @param newParentVNode the new virtual node whose children are diffed against old parent vritual node
 * @param oldParentVNode  the old virtual node whose children are diffed against new parent virtual node
 * @param context 
 * @param isSvg 
 * @param excessDomChildren 
 * @param mounts the list of components that have mounted
 * @param ancestorComponent the direct parent component of the ones being diffed
 * @param oldDom the current attached DOM that new DOM elements should be placed around.
 * It's likely `null` on first render (except when hydrating). 
 */
export function diffChildren(
    parentDom,
    newParentVNode,
    oldParentVNode,
    context,
    isSvg,
    excessDomChildren,
    mounts,
    ancestorComponent,
    oldDom
) {
    // an array of vnodes
    const newChildren = newParentVNode._children ||
        toChildArray(
            newParentVNode.props.children,
            newParentVNode._children = [],
            coerceToVNode,
            true
        );
    const oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;
    // @NOTE: domElement._children holds onto vnodes
    const oldChildrenLength = oldChildren.length;

    // oldDom is set to the first dom element of excessDomChildren or oldChildren
    const isFirstRender = oldDom === EMPTY_OBJ;
    if (isFirstRender) {
        oldDom = null;
        if (excessDomChildren != null) {
            // @QUESTION: What does this do?
            for (let i = 0; !oldDom && i < excessDomChildren.length; i++) {
                oldDom = excessDomChildren[i];
            }
        } else {
            for (let i = 0; !oldDom && i < oldChildrenLength; i++) {
                oldDom = oldChildren[i] && oldChildren[i]._dom;
            }
        }
    }

    let childVNode;
    let oldVNode;
    let refs;
    let firstChildDom;
    let newDom;
    let sibDom;
    // look tjhrough oldChildren for elements with the same key in newChildren
    // delete those elements from oldChildren
    for (let i = 0; i < newChildren.length; i++) {
        childVNode = newChildren[i] = coerceToVNode(newChildren[i]);

        if (childVNode != null) {
            oldVNode = oldChildren[i];

            // check if we find corresponding element in oldChildren
            // set it to `undefined` if we do find it
            if (
                oldVNode === null ||
                (oldVNode && childVNode.key == oldVNode.key && childVNode.type === oldVNode.type)
            ) {
                oldChildren[i] = undefined;
            } else {
                for (let j = 0; j < oldChildrenLength; j++) {
                    oldVNode = oldChildren[j];
                    if (
                        oldVNode &&
                        childVNode.key === oldVNode.key &&
                        childVNode.type === oldVNode.type
                    ) {
                        oldChildren[j] = undefined;
                        break;
                    }
                    oldVNode = null;
                }
            }

            oldVNode = oldVNode || EMPTY_OBJ;

            // Morph the old element
            newDom = diff(
                parentDom,
                childVNode,
                oldVNode,
                context,
                isSvg,
                excessDomChildren,
                mounts,
                ancestorComponent,
                null,
                oldDom
            );

            if (childVNode.ref && oldVNode.ref !== childVNode.ref) {
                (refs || (refs = [])).push(
                    childVNode.ref,
                    childVNode._component || newDom
                )
            }

            if (newDom != null) {
                if (firstChildDom == null) {
                    firstChildDom = newDom;
                }

                if (childVNode._lastDomChild != null) {
                    newDom = childVNode._lastDomChild;
                } else if (
                    excessDomChildren == oldVNode ||
                    newDom != oldDom ||
                    newDom.parentNode == null
                ) {
                    outer: if (
                        oldDom == null ||
                        oldDom.parentNode !== parentDom
                    ) {
                        parentDom.appendChild(newDom);
                    } else {
                        for (sibDom = oldDom, let j = 0; (sibDom = sibDom.nextSibling) && j < oldChildrenLength; j += 2) {
                            if (sibDom == newDom) {
                                break outer;
                            }
                        }
                        parentDom.insertBefore(newDom, oldDom);
                    }
                }

                oldDom = newDom.nextSibling;

                if (typeof newParentVNode.type == "function") {
                    newParentVNode._lastDomChild = newDom;
                }
            }
        }
    }

    newParentVNode._dom = firstChildDom;

    if (
        excessDomChildren != null &&
        typeof newParentVNode.type !== "function"
    ) {
        for (let i = excessDomChildren.length; i--;) {
            if (excessDomChildren[i] != null) {
                removeNode(excessDomChildren[i]);
            }
        }
    }

    for (let i = oldChildrenLength; i--;) {
        if (oldChildren[i] != null) {
            unmount(oldChildren[i], ancestorComponent);
        }
    }

    if (refs) {
        for (let i = 0; i < refs.length; i++) {
            applyRef(refs[i], refs[++i], ancestorComponent);
        }
    }
};

/**
 * 
 * @param children The unflattened children of a virtual node
 * @param flattened A flat array of children to modify
 * @param map A function that is applied on each child if `vnode` is not null
 * @param keepHoles Whether to coerce `undefined` to `null`
 */
export function toChildArray(children, flattened, map, keepHoles) {
    if (flattened == null) {
        flattened = [];
    }

    if (
        children == null ||
        typeof children === "boolean"
    ) {
        if (keepHoles) {
            flattened.push(null);
        }
    } else if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            toChildArray(children[i], flattened, map, keepHoles);
        }
    } else {
        flattened.push(map ? map(children) : children);
    }

    return flattened;
}