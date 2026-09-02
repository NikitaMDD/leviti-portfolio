export function getSpectrum(data: Uint8Array, bandCount: number): number[] {
    const bands: number[] = [];
    const step = data.length / bandCount;
    for (let b = 0; b < bandCount; b++) {
        const from = Math.floor(b * step);
        const to = Math.floor((b + 1) * step);
        if (to <= from) {
            bands.push(0);
            continue;
        }
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i];
        bands.push(sum / (to - from) / 255);
    }
    return bands;
}

export function createEnvelope(attack = 0.4, release = 0.08) {
    let value = 0;
    return (target: number) => {
        if (!Number.isFinite(target)) return value;
        value += (target - value) * (target > value ? attack : release);
        return value;
    };
}

export function boost(value: number, power = 1.6) {
    return Math.pow(Math.max(0, Math.min(1, value)), power);
}