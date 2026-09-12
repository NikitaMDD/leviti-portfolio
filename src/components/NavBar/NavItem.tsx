import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import classes from './NavBar.module.css';

const easeInOutQuint = (t: number) =>
    t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;

interface NavItemProps {
    label: string;
    active?: boolean;
    onClick: () => void;
}

export const NavItem = ({
    label,
    active = false,
    onClick,
}: NavItemProps) => {
    const fillRef = useRef<HTMLSpanElement>(null);
    const lineRef = useRef<HTMLSpanElement>(null);

    // head - общий передний край (гонит и заливку текста, и линию на входе)
    // tail - задний край линии, двигается только на выходе, "съедая" линию с А к Б
    // textHead - прогресс заливки текста; на выходе едет отдельно от head обратно к 0
    const wave = useRef({ head: 0, tail: 0, textHead: 0 });

    // активная секция держит заливку залитой и без ховера — эти два рефа не
    // дают активности и наведению перебивать друг друга рассинхронизированными твинами
    const isHovering = useRef(false);
    const activeRef = useRef(active);
    const isFirstRender = useRef(true);

    const applyStyles = () => {
        const { head, tail, textHead } = wave.current;
        if (fillRef.current) {
            fillRef.current.style.clipPath = `inset(0 ${100 - textHead}% 0 0)`;
        }
        if (lineRef.current) {
            lineRef.current.style.clipPath = `inset(0 ${100 - head}% 0 ${tail}%)`;
        }
    };

    const fillIn = (duration = 0.5) => {
        gsap.killTweensOf(wave.current);
        wave.current.tail = 0;

        gsap.to(wave.current, {
            head: 100,
            textHead: 100,
            duration,
            ease: easeInOutQuint,
            onUpdate: applyStyles,
        });
    };

    const fillOut = (duration = 0.45) => {
        gsap.killTweensOf(wave.current);
        const frozenHead = wave.current.head;

        gsap.to(wave.current, {
            tail: frozenHead,
            duration,
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
            duration: duration - 0.1,
            ease: easeInOutQuint,
            onUpdate: applyStyles,
        });
    };

    // при смене активной секции по ходу скролла — анимированно, но не мешая ховеру;
    // на самом первом рендере (в т.ч. активная секция при загрузке страницы) — мгновенно,
    // без анимации, чтобы не было вспышки "заливки" в момент маунта
    useEffect(() => {
        activeRef.current = active;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (active) {
                wave.current = { head: 100, tail: 0, textHead: 100 };
                applyStyles();
            }
            return;
        }

        if (isHovering.current) return;
        if (active) {
            fillIn(0.5);
        } else {
            fillOut(0.45);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    const handleEnter = () => {
        isHovering.current = true;
        fillIn();
    };

    const handleLeave = () => {
        isHovering.current = false;
        // активная секция остаётся залитой после ухода курсора — это и есть active-стиль
        if (activeRef.current) {
            fillIn(0.3);
        } else {
            fillOut();
        }
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
