import { IS_NON_DIMENSIONAL, EMPTY_OBJ } from "../constants";
import { assign } from "../util";

export function diffProps(
    dom,
    newProps,
    oldProps,
    isSvg
) {
    let i;
    const keys = Object.keys(newProps).sort();

    for (i = 0; i < keys.length; i++) {
        const k = keys[i];

        if (
            k !== "children" &&
            k !== "key" &&
            (!oldProps || 
                ((k === "value" || k === "checked") ? dom : oldProps)[k] !== newProps[k])
        ) {
            setProperty(dom, k, newProps[k], oldProps[k], isSvg);
        }
    }

    // get rid of lingering oldProps;
    for (i in oldProps) {
        if (i !== "children" && i !== "key" && !(i in newProps)) {
            setProperty(dom, i, null, oldProps[i], isSvg);
        }
    }
}

function setProperty(
    dom,
    name,
    value,
    oldValue,
    isSvg
) {
    name = isSvg ? 
        (name === "className" ? "class" : name) :
        (name === "class" ? "className" : name);

    if (name === "style") {
        const set = assign(assign({}, oldValue), value);
        for (let i in set) {
            // if style property has not changed
            if ((value || EMPTY_OBJ)[i] === (oldValue || EMPTY_OBJ)[i]) {
                continue;
            }

            dom.style.setProperty(
                (i[0] === "-" && i[1] === "-") ?
                    i :
                    i.replace(CAMEL_REG, "-$&"),
                    (value && (i in value)) ?
                        (typeof set[i] === "number" && IS_NON_DIMENSIONAL.test(i) === false) ?
                        set[i] + "px" :
                        set[i]
                    : ""
            )
        }
    } else if (name[0] === "o" && name[1] === "n") {
        let useCapture = name !== (name = name.replace(/Capture$/, ""));
        let nameLower = name.toLowerCase();
        name = (nameLower in dom ? nameLower : name).slice(2);

        if (value) {
            if (!oldValue) {
                dom.addEventListener(name, eventProxy, useCapture);
            }
        } else {
            dom.removeEventListener(name, eventProxy, useCapture);
        }
        (dom._listeners || (dom._listeners = {}))[name] = value;
    } else if (
        name !== "list" &&
        name !== "tagName" &&
        !isSvg &&
        (name in dom)
    ) {
        dom[name] = (value == null) ? "" : value;
    } else if (
        typeof value !== "function" &&
        name !== "dangerouslySetInnerHTML"
    ) {
        if (name !== (name = name.replace(/^xlink:?/, ""))) {
            if (value == null || value === false) {
                dom.removeAttributeNS(XLINK_NS, name.toLowerCase());
            } else {
                dom.setAttributeNS(XLINK_NS, name.toLowerCase(), value);
            }
        } else if (value == null || value === false) {
            dom.removeAttribute(name);
        } else {
            dom.setAttribute(name, value);
        }
    }
}

function eventProxy(e) {
    return this._listeners[e.type](options.event ? options.event(e) : e);
}