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
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const handleActive = (e: Event) => {
            const { index } = (e as CustomEvent<{ index: number }>).detail;
            setActiveIndex(index);
        };
        window.addEventListener('nav:active', handleActive);
        return () => window.removeEventListener('nav:active', handleActive);
    }, []);

    // пока открыто мобильное меню — блокируем скролл/свайпы за оверлеем
    // и сообщаем странице (page-shell в index.astro), что надо отъехать влево
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        window.dispatchEvent(new CustomEvent('nav:menu', { detail: { open: menuOpen } }));
        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    const handleClick = (index: number)=> {
        setMenuOpen(false);
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
            <button
                type="button"
                className={`${classes.burger} ${menuOpen ? classes.burgerOpen : ''}`}
                aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
            >
                <span />
                <span />
            </button>
            <div
                className={`${classes.mobileMenu} ${menuOpen ? classes.mobileMenuOpen : ''}`}
                aria-hidden={!menuOpen}
                data-mobile-menu
            >
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