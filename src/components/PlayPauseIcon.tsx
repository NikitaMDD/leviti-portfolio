import { useEffect, useRef } from "react";
import { interpolate } from "polymorph-js";

const PAUSE_PATH = "M6 4 H10 V20 H6 Z M14 4 H18 V20 H14 Z";
const PLAY_PATH = "M6 4 L20 12 L6 20 Z";

const rawMorph = interpolate([PAUSE_PATH, PLAY_PATH]);

// polymorph-js не защищается от offset чуть меньше 0 (только чуть больше 1) —
// на погрешности плавающей точки это ловит "items[flr] is not a function".
// Зажимаем диапазон сами, на своей стороне.
function morph(offset: number) {
	return rawMorph(Math.max(0, Math.min(1, offset)));
}

interface Props {
	playing: boolean;
	size?: number;
}

export default function PlayPauseIcon({ playing, size = 20 }: Props) {
	const pathRef = useRef<SVGPathElement>(null);
	const offsetRef = useRef(playing ? 0 : 1);
	const rafRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		const target = playing ? 0 : 1;
		const start = offsetRef.current;
		const startTime = performance.now();
		const duration = 220;

		if (rafRef.current) cancelAnimationFrame(rafRef.current);

		function tick(now: number) {
			const t = Math.min(1, (now - startTime) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			const value = start + (target - start) * eased;
			offsetRef.current = value;
			pathRef.current?.setAttribute("d", morph(value));
			if (t < 1) rafRef.current = requestAnimationFrame(tick);
		}
		rafRef.current = requestAnimationFrame(tick);

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, [playing]);

	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-title)">
			<path ref={pathRef} d={morph(offsetRef.current)} />
		</svg>
	);
}
