enum CellHighlight {
    None,
    CurrentWord,
    CursorBefore,
    CursorAfter,
}

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

// A crossword where lights have identifiers of type L and cells have identifiers of type C.
export default class Crossword<C> extends HTMLElement implements Emitter<CrosswordEvents> {
    lights : Map<string, Light>;
    cells : Map<C, CellInfo>;
    cursor : Cursor | null;

    constructor() {
        super();
        this.lights = new Map();
        this.cells = new Map();
        this.cursor = null;

        this.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!this.cursor) return;
                let cellInfo = this.cursor.light.getCell(this.cursor.index - 1);
                cellInfo.contents = "";
                this.cursor.index--;
                this.cursor.light.emit('focus', { light: this.cursor.light, index: this.cursor.index, internalMove: true });
                /*this.emit('cursorMoved', { cursor: this.cursor, light: light });*/
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
        newLight.on('focus', (e) => this.emit('cursorMoved', { cursor: { light: e.light, index: e.index } }));
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