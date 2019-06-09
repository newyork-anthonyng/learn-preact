import options from "../options";
import { enqueueRender } from "../component";
import { removeNode } from "../util";

export function diff() {

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