export const overwriteMerge = (destinationArray: any[], sourceArray: any[], options: any): any[] => sourceArray;

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export const mergeArr = (objValue: [], srcValue: []): (any[] | undefined) => {
    if (Array.isArray(objValue)) {
        return objValue.concat(srcValue);
    }
}

export const valToString = (val: any): string => {
    const t = typeof val;
    if(t === 'boolean') {
        return val === true ? '1' : '0';
    }
    return val.toString();
}

export const intersect = (a: Array<any>, b: Array<any>) => {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    return Array.from(intersection);
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
