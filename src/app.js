import { createElement, render } from "./preact/index";
console.log("%cHello World", "background-color: tomato; color: white; font-size: 24px;");

const vnode = createElement(
    "h1",
    {
        id: "foo-bar"
    },
    "Hello World"
);

console.log(vnode);
render(vnode, document.body);