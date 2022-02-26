import Lid from "./Lid.js";

type CellEvents = {
    contentChanged : string;
}
class CellInfo implements Emitter<CellEvents> {
    _contents : string = "";

    get contents() { return this._contents; }
    set contents(newContents) {
        this._contents = newContents;
        this.emit('contentChanged', newContents);
    }

    public isPennedIn() : boolean {
        return this.contents !== "";
    }

    listeners : { [K in keyof CellEvents] : Array<any>; } = { 
        contentChanged: [],
    };
    on<K extends EventKey<CellEvents>>(key : K, fn : EventReceiver<CellEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CellEvents>>(key : K, fn : EventReceiver<CellEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CellEvents>>(key : K, params : CellEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}


type LightEvents = {
    contentChanged : Light;
    focus : { light : Light, index : number, internalMove : boolean };
    blur : { light : Light };
}

export class Light implements Emitter<LightEvents> {
    #cellInfos : CellInfo[] = [];
    clue : Element | null = null;
    #lid : Lid;
    nextLight : Light | null = null;
    previousLight : Light | null = null;

    constructor(lid : Lid) {
        this.#lid = lid;
    }

    public set cellInfos(cellInfos : CellInfo[]) {
        this.#cellInfos = cellInfos;

        for (let cellInfo of cellInfos) {
            cellInfo.on('contentChanged', this.cellChanged.bind(this));
        }
    }

    public get cellInfos() { return this.#cellInfos; }

    public get length() { return this.#cellInfos.length; }

    public get lid() { return this.#lid; }

    public getCell(index : number) : CellInfo {
        return modIndex(this.#cellInfos, index);
    }

    public cellChanged(newContent : string) {
        this.emit('contentChanged', this);
    }
    
    listeners : { [K in keyof LightEvents] : Array<any>; } = { 
        contentChanged: [],
        focus: [],
        blur: [],
    };
    on<K extends EventKey<LightEvents>>(key : K, fn : EventReceiver<LightEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<LightEvents>>(key : K, fn : EventReceiver<LightEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<LightEvents>>(key : K, params : LightEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}

export function mod(a : number, m : number) : number {
    return (a % m + m) % m;
}

function modIndex<T>(array : Array<T>, index : number) {
    return array[mod(index, array.length)];
}

type Cursor = { light : Light, index : number }

type CrosswordEvents = {
    cursorMoved : { cursor : Cursor }
}

// This is an unfortunate hack. It is due to the following two conflicting
// goals:
// 1. We don’t want accidental srolling when moving through the crossword
//    (iOS seems to ignore the "preventScroll" option on focus calls).
//    To ensure this, we want to place the input elements with 
//    "position: fixed" in the center of the screen.
// 2. We want to use the next/previous buttons on the iOS keyboard to move 
//    through the clues. This requires setting up next and previous inputs
//    to move to. However, if there are several crosswords on the page,
//    this still doesn’t work because the inputs for several crosswords would
//    overlap and iOS uses the visual order for these buttons.
// By sharing the input elements between the crosswords, this can be avoided.
// TODO: This whole tabbing business messes with keyboard navigation (and other
// forms on the page. Maybe there is a better solution?)
var globalForm : { form : HTMLFormElement, prevInput : HTMLInputElement, input : HTMLInputElement, nextInput : HTMLInputElement, currentCrossword : Crossword<any> | null } | null = null;

// A crossword where lights have identifiers of type L and cells have identifiers of type C.
export default class Crossword<C> extends HTMLElement implements Emitter<CrosswordEvents> {
    lights : Map<string, Light>;
    cells : Map<C, CellInfo>;
    cursor : Cursor | null;
    endLights : { first : Light, last : Light } | null;
    mostRecentLight : Light | null;

    constructor() {
        super();
        this.lights = new Map();
        this.cells = new Map();
        this.cursor = null;
        this.endLights = null;
        this.mostRecentLight = null;

        let shadow = this.attachShadow({ mode: 'closed' });

        let style = document.createElement('style');
        style.textContent = `
        form {
            position: fixed;
            top: 40%;
            left: 0px;
            opacity: 5%;
        }
        input {
            display: block;
        }
        input:focus {
            background-color: red;
        }
        `;
        shadow.appendChild(style);

        if (!globalForm) {
            let form = document.createElement('form');
            let prevInput = document.createElement('input');
            form.appendChild(prevInput);
            let input = document.createElement('input');
            form.appendChild(input);
            let nextInput = document.createElement('input');
            form.appendChild(nextInput);
            shadow.appendChild(form);
            globalForm = { form, prevInput, input, nextInput, currentCrossword: null };
        }

        shadow.appendChild(document.createElement('slot'));

        globalForm.input.addEventListener('keydown', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (e.key === 'Backspace') {
                if (!this.cursor) return;
                let cellInfo = this.cursor.light.getCell(this.cursor.index - 1);
                cellInfo.contents = "";
                this.cursor.index--;
                this.cursor.light.emit('focus', { light: this.cursor.light, index: this.cursor.index, internalMove: true });
                e.preventDefault();
            } else if (e.key.length === 1) {
                if (!this.cursor) return;
                let cellInfo = this.cursor.light.getCell(this.cursor.index);
                cellInfo.contents = e.key.toUpperCase();
                this.cursor.index++;
                this.cursor.light.emit('focus', { light: this.cursor.light, index: this.cursor.index, internalMove: true });
                e.preventDefault();
            }
        });

        globalForm.input.addEventListener('blur', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            this.mostRecentLight = this.cursor?.light ?? null;
            this.setCursor(null);
        });

        globalForm.nextInput.addEventListener('focus', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (!this.mostRecentLight) return;
            this.setCursor(this.mostRecentLight.nextLight?.lid ?? null);
        });
        globalForm.prevInput.addEventListener('focus', (e) => {
            if (globalForm?.currentCrossword !== this) return;
            if (!this.mostRecentLight) return;
            this.setCursor(this.mostRecentLight.previousLight?.lid ?? null);
        });
    }

    public setCellsForLight(lid : Lid, cells : C[]) {
        let light = this.getLight(lid);
        let cellInfos = cells.map((cell) => this.getOrAddCell(cell));
        light.cellInfos = cellInfos;
    }

    public getLight(lid : Lid) : Light {
        let light = this.lights.get(lid.toString());
        if (light) return light;

        let newLight = new Light(lid);
        this.lights.set(lid.toString(), newLight);
        newLight.on('focus', (e) => {
            this.emit('cursorMoved', { cursor: { light: e.light, index: e.index } })
            globalForm?.input.focus();
            if (globalForm) globalForm.currentCrossword = this;
        });
        return newLight;
    }
        
    public getOrAddCell(cell : C) : CellInfo {
        var cellInfo = this.cells.get(cell);
        if (cellInfo !== undefined) {
            return cellInfo;
        } else {
            let cellInfo = new CellInfo();
            this.cells.set(cell, cellInfo);
            return cellInfo;
        }
    }

    public chainLight(lid : Lid) {
        let light = this.getLight(lid);
        if (!this.endLights) {
            light.nextLight = light;
            light.previousLight = light;
            this.endLights = { first: light, last: light};
            return;
        }

        this.endLights.first.previousLight = light;
        light.nextLight = this.endLights.first;
        this.endLights.last.nextLight = light;
        light.previousLight = this.endLights.last;
        this.endLights.last = light;
    }

    public setCursor(lid : Lid | null, index? : number) {
        var internalMove = false;
        if (this.cursor) {
            if (lid === null) {
                this.cursor.light.emit('blur', { light: this.cursor.light });
                return;
            }
            if (this.cursor.light.lid.equals(lid)) {
                internalMove = true;
            } else {
                this.cursor.light.emit('blur', { light: this.cursor.light });
            }
        }

        if (lid === null) return;
        let light = this.getLight(lid);
        if (index === undefined) {
            index = 0;
            for (var i = 0; i < light.cellInfos.length; i++) {
                if (!light.cellInfos[i].isPennedIn()) {
                    index = i;
                    break;
                }
            }
        }

        this.cursor = { light, index };
        this.cursor.light.emit('focus', { light, index, internalMove });
    }

    listeners : { [K in keyof CrosswordEvents] : Array<any>; } = { 
        cursorMoved: []
    };
    on<K extends EventKey<CrosswordEvents>>(key : K, fn : EventReceiver<CrosswordEvents[K]>) {
        this.listeners[key].push(fn);
    }
    off<K extends EventKey<CrosswordEvents>>(key : K, fn : EventReceiver<CrosswordEvents[K]>) {
        this.listeners[key] = this.listeners[key].filter(f => f !== fn);
    }
    emit<K extends EventKey<CrosswordEvents>>(key : K, params : CrosswordEvents[K]) {
        this.listeners[key].forEach(fn => {
            fn(params);
        });
    }
}