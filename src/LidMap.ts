class Lid {
    lightType : string;
    lightStart : string;

    constructor(lightTypeOrString : string, lightStart? : string) {
        if (lightStart) {
            this.lightType = lightTypeOrString;
            this.lightStart = lightStart;
        } else {
            let parts = lightTypeOrString.split("-");
            this.lightStart = parts[0];
            this.lightType = parts[1];
        }
    }

    toString() {
        return `${this.lightStart}-${this.lightType}`;
    }
    
    equals(lid: Lid) {
        return lid.toString() === this.toString();
    }
}

class LidMap<V> {
    #map : Map<string, V>;

    constructor(public defaultFactory? : () => V) {
        this.#map = new Map();
    }

    public get(key : Lid) : V | undefined {
        let val = this.#map.get(key.toString());
        if (val) return val;

        if (this.defaultFactory) {
            let newVal = this.defaultFactory();
            this.#map.set(key.toString(), newVal);
            return newVal;
        }

        return undefined;
    }

    public set(key : Lid, val : V) {
        this.#map.set(key.toString(), val);
    }
}