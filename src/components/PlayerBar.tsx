import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { audioSpectrum, currentTrack, isPlaying, playback, togglePlay } from "../stores/player.ts";
import { getSpectrum, createEnvelope } from "../lib/audioReactivity";
import { formatTime } from "../lib/format";
import PlayPauseIcon from "./PlayPauseIcon";

export default function PlayerBar() {
    const track = useStore(currentTrack);
    const playing = useStore(isPlaying);
    const { current, duration } = useStore(playback);
    const [expanded, setExpanded] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const lastPushRef = useRef(0);
    const lastValuesRef = useRef<number[]>([0, 0, 0, 0, 0, 0]);

    const BAND_COUNT = 6;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const envelopes = Array.from({ length: BAND_COUNT }, () => createEnvelope());
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        let raf: number;

        function tick() {
            if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(data);
                const raw = getSpectrum(data, BAND_COUNT);
                const smoothed = raw.map((v, i) => envelopes[i](v));

                const now = performance.now();
                const last = lastValuesRef.current;
                const changedEnough = smoothed.some((v, i) => Math.abs(v - last[i]) > 0.02);

                if (now - lastPushRef.current > 150 && changedEnough) {
                    audioSpectrum.set(smoothed);
                    lastValuesRef.current = smoothed;
                    lastPushRef.current = now;
                }
            }
            raf = requestAnimationFrame(tick);
        }
        tick();

        return () => {
            cancelAnimationFrame(raf);
            ctx.close();
        };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !track) return;
        if (audio.src !== track.url) audio.src = track.url;
        if (playing) {
            audioCtxRef.current?.resume();
            audio.play();
        } else audio.pause();
    }, [track, playing]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        function handleTimeUpdate() {
            playback.set({ current: audio.currentTime, duration: audio.duration || 0 });
        }
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("durationchange", handleTimeUpdate);
        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("durationchange", handleTimeUpdate);
        };
    }, []);

    const progressPercent = duration > 0 ? (current / duration) * 100 : 0;

    return (
        <div
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 16, zIndex: 50 }}
        >
            <audio ref={audioRef} />

            {track && (
                <input
                    type="range"
                    className={`leviti-seek${expanded ? " is-expanded" : ""}`}
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={current}
                    onChange={(e) => {
                        const audio = audioRef.current;
                        if (audio) audio.currentTime = Number(e.target.value);
                    }}
                    style={
                        {
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: expanded ? 72 : 0,
                            width: "100%",
                            height: expanded ? 16 : 3,
                            margin: 0,
                            transition: "bottom 0.25s ease, height 0.25s ease",
                            "--seek-progress": `${progressPercent}%`,
                        } as React.CSSProperties
                    }
                />
            )}

            <style>{`
                .leviti-seek {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                    cursor: pointer;
                }

                .leviti-seek::-webkit-slider-runnable-track {
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        var(--color-burnt-orange) var(--seek-progress, 0%),
                        transparent var(--seek-progress, 0%)
                    );
                }

                .leviti-seek::-moz-range-track {
                    height: 100%;
                    background: transparent;
                }
                .leviti-seek::-moz-range-progress {
                    height: 100%;
                    background: var(--color-burnt-orange);
                }

                .leviti-seek::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: var(--color-burnt-orange);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .leviti-seek.is-expanded::-webkit-slider-thumb {
                    opacity: 1;
                }

                .leviti-seek::-moz-range-thumb {
                    width: 15px;
                    height: 25px;
                    border: none;
                    background: var(--color-burnt-orange);
                    opacity: 0;
                    border-radius: 0px;
                    transition: all 0.2s ease-in-out;
                    cursor: grab;
                    border-radius: 2px;
                }
                .leviti-seek::-moz-range-thumb:hover {
                    width: 20px;
                    height: 35px;
                }
                .leviti-seek::-moz-range-thumb:active {
                    width: 20px;
                    height: 35px;
                    cursor: grabbing;
                }
                .leviti-seek.is-expanded::-moz-range-thumb {
                    opacity: 1;
                }
            `}</style>

            {track && (
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-4)",
                        padding: "var(--space-4) var(--space-5)",
                        background: "var(--color-black-pearl)",
                        borderTop: "1px solid var(--color-copper)",
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-title)",
                        transform: expanded ? "translateY(0)" : "translateY(100%)",
                        transition: "transform 0.25s ease",
                    }}
                >
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span>{track.title}</span>
                            <span style={{ fontSize: 12, color: "var(--color-title)" }}>
                                {formatTime(current)} / {formatTime(duration)}
                            </span>
                        </div>
                        <button
                            onClick={togglePlay}
                            aria-label={playing ? "Пауза" : "Воспроизвести"}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                            }}
                        >
                            <PlayPauseIcon playing={playing} />
                        </button>
                    </>
                </div>
            )}
        </div>
    );
}