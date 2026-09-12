import React from 'react';
import classes from './NavBar.module.css';
import {NavItem} from "./NavItem.tsx";

interface NavBarProps {
    links: string[];
}

export const NavBar = ({
    links,
}: NavBarProps) => {

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
                        onClick={() => handleClick(i)}
                    />
                ))}
            </div>
        </nav>
    );
};