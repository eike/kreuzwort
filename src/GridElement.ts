export default class GridElement extends HTMLElement {
    get row(): number {
        return Array.prototype.indexOf.call(this.parentElement?.parentElement?.children, this.parentElement);
    }

    get column(): number {
        return Array.prototype.indexOf.call(this.parentElement?.children, this);
    }
}