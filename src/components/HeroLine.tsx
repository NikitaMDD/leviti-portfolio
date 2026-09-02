import { useStore } from "@nanostores/react";
import { MeshGradient } from "@paper-design/shaders-react";
import { audioSpectrum } from "../stores/player";
import { boost } from "../lib/audioReactivity";

const heroColors = [
    "#1A2C30", // Black Pearl
    "#0E6873", // Blue Lagoon
    "#61413C", // Copper
    "#FE7E3C", // Burnt Orange
    "#E4201B", // Lust
    "#111214",
];

export default function HeroLine() {
    const spectrum = useStore(audioSpectrum);
    const [b0, b1, b2, b3, b4, b5] = spectrum.length === 6 ? spectrum : [0, 0, 0, 0, 0, 0];

    const bass = (boost(b0) + boost(b1)) / 2;
    const mid = (boost(b2) + boost(b3)) / 2;
    const treble = (boost(b4) + boost(b5)) / 2;

    return (
        <MeshGradient
            colors={heroColors}
            distortion={0.8 + bass * 0.9}
            swirl={0.4 + mid * 0.6}
            grainMixer={0.2 + treble * 0.2}
            grainOverlay={0.2 + treble * 0.4}
            speed={0.25 + bass * 0.6}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
    );
}