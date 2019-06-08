import { assign } from "./util";
import options from "./options";

export function createElement(type, props, children) {
    // make shallow copy of props
    props = assign({}, props);

    // workaround for rest parameter syntax
    if (arguments.length > 3) {
        children = [children];
        for (let i = 3; i < arguments.length; i++) {
            children.push(arguments[i]);
        }
    }

    if (children != null) {
        props.children = children;
    }

    // populate default props
    if (type !== null && type.defaultProps !== null) {
        for (let i in type.defaultProps) {
            if (props[i] === undefined) {
                props[i] = type.defaultProps[i];
            }
        }
    }

    const ref = props.ref;
    const key = props.key;
    // @QUESTION: Why do we delete ref and key?
    if (ref != null) delete props.ref;
    if (key != null) delete props.key;

    return createVNode(type, props, key, ref);
}

export function createVNode(type, props, key, ref) {
    const vnode = {
        type,
        props,
        key,
        ref,
        _children: null,
        _dom: null,
        _lastDomChild: null,
        _component: null,
        constructor: undefined
    };

    // For hooks; vnode
    if (options.vnode) {
        options.vnode(vnode);
    }

    return vnode;
}

export function createRef() {
    return {};
}

export function Fragment(props) {
    return props.children;
}

// Coerce an unstrusted value into a VNode
export function coerceToVNode(possibleVNode) {
    if (
        possibleVNode == null ||
        typeof possibleVNode === "boolean"
    ) {
        return null;
    }

    if (
        typeof possibleVNode === "string" ||
        typeof possibleVNode === "number"
    ) {
        return createVNode(null, possibleVNode, null, null);
    }

    // Clone vnode if it has already been used
    if (
        possibleVNode._dom != null ||
        possibleVNode._component != null
    ) {
        const vnode = createVNode(
            possibleVNode.type,
            possibleVNode.props,
            possibleVNode.key,
            null
        );
        vnode._dom = possibleVNode._dom;
        return vnode;
    }
    return possibleVNode;
}