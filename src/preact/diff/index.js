import options from "../options";
import { enqueueRender, Component } from "../component";
import { removeNode, assign } from "../util";
import { toChildArray, diffChildren } from "./children";
import { EMPTY_OBJ } from "../constants";
import { diffProps } from "./props";

export function diff(
    parentDom,
    newVNode,
    oldVNode,
    context,
    isSvg,
    excessDomChildren,
    mounts,
    force,
    oldDom
) {
    let c, tmp, isNew, oldProps, oldState, snapshot, newType = newVNode.type, clearProccessingException;

    if (newVNode.constructor !== undefined) return null;

    // For diff hook
    if (tmp = options.diff) {
        tmp(newVNode);
    }

    try {
        outer: if (typeof newType === "function") {
            tmp = newType.contextType;
            let provider = tmp && context[tmp._id];
            let cctx = tmp ? (provider ? provider.props.value : tmp._defaultValue) : context;

            // Get existing component
            if (oldVNode._component) {
                c = newVNode._component = oldVNode._component;
                clearProccessingException = c._processingException = c._pendingError;
            } else {
                if (newType.prototype && newType.prototype.render) {
                    newVNode._component = c = new newType(newVNode.props, cctx);
                } else {
                    newVNode._component = c = new Component(newVNode.props, cctx);
                    c.constructor = newType;
                    c.render = doRender;
                }
                if (provider) provider.sub(c);

                c.props = newVNode.props;
                if (!c.state) c.state = {};
                c.context = cctx;
                c._context = context;
                isNew = c._dirty = true;
                c._renderCallbacks = [];
            }

            if (c._nextState == null) {
                c._nextState = c.state;
            }

            if (newType.getDerivedStateFromProps != null) {
                assign(
                    c._nextState == c.state ?
                        (c._nextState = assign({}, c._nextState)) :
                        c._nextState,
                    c._nextState,
                    newType.getDerivedStateFromProps(newVNode.props, c._nextState)
                );
            }

            if (isNew) {
                if (
                    newType.getDerivedStateFromProps == null &&
                    c.componentWillMount != null
                ) {
                    c.componentWillMount();
                }

                if (c.componentDidMount != null) {
                    mounts.push(c);
                }
            } else {
                if (
                    newType.getDerivedStateFromProps == null &&
                    force == null &&
                    c.componentWillReceiveProps != null
                ) {
                    c.componentWillReceiveProps(newVNode.props, cctx);
                }

                if (
                    !force &&
                    c.shouldComponentUpdate != null &&
                    c.shouldComponentUpdate(newVNode.props, c._nextState, cctx) === false
                ) {
                    c.props = newVNode.props;
                    c.state = c._nextState;
                    c._dirty = false;
                    c._vnode = newVNode;
                    newVNode._dom = oldVNode._dom;
                    newVNode._lastDomChild = oldVNode._lastDomChild;
                    newVNode._children = oldVNode._children;
                    break outer;
                }

                if (c.componentWillUpdate != null) {
                    c.componentWillUpdate(newVNode.props, c._nextState, cctx);
                }
            }

            oldProps = c.props;
            oldState = c.state;
            c.context = cctx;
            c.props = newVNode.props;
            c.state = c._nextState;

            if (tmp = options.render) {
                tmp(newVNode);
            }

            c._dirty = false;

            try {
                tmp = c.render(c.props, c.state, c.context);
                let isTopLevelFragment = (tmp != null) && (tmp.type == Fragment) && (tmp.key == null);
                toChildArray(isTopLevelFragment ? tmp.props.children : tmp, newVnode._children = [], coerceToVNode, true);
            } catch(e) {
                if ((tmp = options.catchRender) && tmp(e, newVNode)) return;
                throw e;
            }

            if (c.getChildContext != null) {
                context = assign(assign({}, context), c.getChildContext());
            }

            if (!isNew && c.getSnapshotBeforeUpdate != null) {
                snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
            }

            diffChildren(parentDom, newVnode, oldVNode, context, isSvg, excessDomChildren, mounts, oldDom);

            c.base = newVNode._dom;
            c._vnode = newVNode;
            c._parentDom = parentDom;

            while (tmp = c._renderCallbacks.pop()) {
                tmp.call(c);
            }

            if (
                !isNew &&
                oldProps != null &&
                c.componentDidUpdate != null
            ) {
                c.componentDidUpdate(oldProps, oldState, snapshot);
            }
        } else {
            newVNode._dom = diffElementNodes(
                oldVNode._dom,
                newVNode,
                oldVNode,
                context,
                isSvg,
                excessDomChildren,
                mounts
            );
        }

        if (clearProccessingException) {
            c._pendingError = c._processingException = null;
        }

        if (tmp = options.diffed) {
            tmp(newVNode);
        }
    } catch(e) {
        catchErrorInComponent(e, newVNode._parent);
    }

    return newVNode._dom;
}

export function unmount(vnode, ancestorComponent, skipRemove) {
    let r;

    if (options.unmount) {
        options.unmount(vnode);
    }

    if (r = vnode.ref) {
        applyRef(r, null, ancestorComponent);
    }

    let dom;
    if (!skipRemove && vnode._lastDomChild == null) {
        skipRemove = (dom = vnode._dom) != null;
    }

    vnode._dom = vnode._lastDomChild = null;

    if ((r = vnode._component) != null) {
        if (r.componentWillUnmount) {
            try {
                r.componentWillUnmount();
            } catch (e) {
                catchErrorInComponent(e, ancestorComponent);
            }
        }

        r.base = r._parentDom = null;
    }

    if (r = vnode._children) {
        for (let i = 0; i < r.length; i++) {
            if (r[i]) {
                unmount(r[i], ancestorComponent, skipRemove);
            }
        }
    }

    if (dom != null) {
        removeNode(dom);
    }
}

export function applyRef(ref, value, ancestorComponent) {
    try {
        if (typeof ref == "function") {
            ref(value);
        } else {
            ref.current = value;
        }
    } catch(e) {
        catchErrorInComponent(e, ancestorComponent);
    }
}

function catchErrorInComponent(error, component) {
    if (options.catchError) {
        options.catchError(error, component);
    }

    for (; component; component = component._ancestorComponent) {
        if (!component._processingException) {
            try {
                if (
                    component.constructor &&
                    component.constructor.getDerivedStateFromError != null
                ) {
                    component.setState(component.constructor.getDerivedStateFromError(error));
                } else if (component.componentDidCatch != null) {
                    component.componentDidCatch(error);
                } else {
                    continue;
                }
                return enqueueRender(component._pendingError = component);
            } catch(e) {
                error = e;
            }
        }
    }

    throw error;
}

function diffElementNodes(
    dom,
    newVNode,
    oldVNode,
    context,
    isSvg,
    excessDomChildren,
    mounts
) {
    let i;
    let oldProps = oldVNode.props;
    let newProps = newVNode.props;

    isSvg = newVNode.type === "svg" || isSvg;

    if (dom == null && excessDomChildren != null) {
        for (i = 0; i < excessDomChildren.length; i++) {
            const child = excessDomChildren[i];
            // Node Type info
            // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
            if (
                child != null &&
                (newVNode.type === null ? child.nodeType === 3 : child.localName === newVNode.type)
            ) {
                dom = child;
                excessDomChildren[i] = null;
                break;
            }
        }
    }

    if (dom == null) {
        if (newVNode.type === null) {
            return document.createTextNode(newProps);
        }
        dom = isSvg ?
            document.createElementNS('http://www.w3.org/2000/svg', newVNode.type) :
            document.createElement(newVNode.type);
        excessDomChildren = null;
    }

    if (newVNode.type === null) {
        if (oldProps != newProps) {
            dom.data = newProps;
        }
    } else {
        if (
            excessDomChildren != null &&
            dom.childNodes != null
        ) {
            excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
        }

        if (newVNode !== oldVNode) {
            let oldProps = oldVNode.props || EMPTY_OBJ;
            let newProps = newVNode.props;

            let oldHtml = oldProps.dangerouslySetInnerHTML;
            let newHtml = newProps.dangerouslySetInnerHTML;
            if (
                (newHtml || oldHtml) &&
                excessDomChildren == null
            ) {
                if (
                    !newHtml ||
                    !oldHtml ||
                    newHtml.__html != oldHtml.__html
                ) {
                    dom.innerHTML = (newHtml && newHtml.__html) || "";
                }
            }

            if (newProps.multiple) {
                dom.multiple = newProps.multiple;
            }

            diffChildren(dom, newVNode, oldVNode, context, newVNode.type==='foreignObject' ? false : isSvg, excessDomChildren, mounts, EMPTY_OBJ);
            diffProps(dom, newProps, oldProps, isSvg);
        }
    }
}

export function commitRoot(mounts, root) {
    let c;
    while ((c = mounts.pop())) {
        try {
            c.componentDidMount();
        } catch(e) {
            catchErrorInComponent(e, c._vnode._parent);
        }
    }

    if (options._commit) options._commit(root);
}