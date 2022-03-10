export default class Lid {
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

    toInternalLid() {
        return `${this.lightStart}-${this.lightType}`;
    }
    
    equals(lid: Lid) {
        return lid.toInternalLid() === this.toInternalLid();
    }
}
