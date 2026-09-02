import { atom } from "nanostores";

export interface Track {
    url: string;
    title: string;
}

export const currentTrack = atom<Track | null>(null);
export const isPlaying = atom(false);
export const audioSpectrum = atom<number[]>([0, 0, 0, 0, 0, 0]);

export function playTrack(track: Track) {
    currentTrack.set(track);
    isPlaying.set(true);
}

export function togglePlay() {
    isPlaying.set(!isPlaying.get());
}

export const playback = atom({ current: 0, duration: 0 });