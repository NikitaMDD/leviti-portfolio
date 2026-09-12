import React, { useEffect, useState } from 'react';
import classes from './NavBar.module.css';
import {NavItem} from "./NavItem.tsx";

interface NavBarProps {
    links: string[];
}

export const NavBar = ({
    links,
}: NavBarProps) => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const handleActive = (e: Event) => {
            const { index } = (e as CustomEvent<{ index: number }>).detail;
            setActiveIndex(index);
        };
        window.addEventListener('nav:active', handleActive);
        return () => window.removeEventListener('nav:active', handleActive);
    }, []);

    const handleClick = (index: number)=> {
        window.dispatchEvent(
            new CustomEvent('nav:goto', { detail: {index} } )
        );
    }

    return (
        <nav className={classes.navBar}>
            <span id="navbar-logo-slot" className={classes.navBarLogoSlot}/>
            <div className={classes.navLinks}>
                {links.map((link, i) => (
                    <NavItem
                        key={link}
                        label={link}
                        active={activeIndex === i}
                        onClick={() => handleClick(i)}
                    />
                ))}
            </div>
        </nav>
    );
};