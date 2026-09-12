import { useRef } from 'react';
import gsap from 'gsap';
import classes from './NavBar.module.css';

const easeInOutQuint = (t: number) =>
    t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;

interface NavItemProps {
    label: string;
    onClick: () => void;
}

export const NavItem = ({
    label,
    onClick,
}: NavItemProps) => {
    const fillRef = useRef<HTMLSpanElement>(null);
    const lineRef = useRef<HTMLSpanElement>(null);

    // head - общий передний край (гонит и заливку текста, и линию на входе)
    // tail - задний край линии, двигается только на выходе, "съедая" линию с А к Б
    // textHead - прогресс заливки текста; на выходе едет отдельно от head обратно к 0
    const wave = useRef({ head: 0, tail: 0, textHead: 0 });

    const applyStyles = () => {
        const { head, tail, textHead } = wave.current;
        if (fillRef.current) {
            fillRef.current.style.clipPath = `inset(0 ${100 - textHead}% 0 0)`;
        }
        if (lineRef.current) {
            lineRef.current.style.clipPath = `inset(0 ${100 - head}% 0 ${tail}%)`;
        }
    };

    const handleEnter = () => {
        gsap.killTweensOf(wave.current);
        wave.current.tail = 0;

        gsap.to(wave.current, {
            head: 100,
            textHead: 100,
            duration: 0.5,
            ease: easeInOutQuint,
            onUpdate: applyStyles,
        });
    };

    const handleLeave = () => {
        gsap.killTweensOf(wave.current);
        const frozenHead = wave.current.head;

        gsap.to(wave.current, {
            tail: frozenHead,
            duration: 0.45,
            ease: easeInOutQuint,
            onUpdate: applyStyles,
            onComplete: () => {
                wave.current.head = 0;
                wave.current.tail = 0;
                applyStyles();
            },
        });

        gsap.to(wave.current, {
            textHead: 0,
            duration: 0.35,
            ease: easeInOutQuint,
            onUpdate: applyStyles,
        });
    };

    return (
        <div
            className={classes.navBarItem}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            onClick={onClick}
        >
            <span className={classes.label}>{label}</span>
            <span ref={fillRef} className={classes.labelFill} aria-hidden="true">
                  {label}
            </span>
            <span ref={lineRef} className={classes.underline} />
        </div>
    );
}