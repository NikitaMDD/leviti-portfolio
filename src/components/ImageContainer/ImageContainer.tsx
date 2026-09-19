import React from 'react';
import classes from "./ImageContainer.module.css"

interface ImageContainerProps {
    src: string;
    description?: string;
    alt?: string;
    objectPosition?: string;
}

export const ImageContainer = ({
    src,
    alt,
    description,
    objectPosition,
}: ImageContainerProps) => {
    return (
        <div className={`${classes.imageWrapper} js-about-photo`}>
            <img src={src} alt={alt} style={objectPosition ? { objectPosition } : undefined} />
            {
                description ?
                    <div className={classes.photoClue}>
                        <span className={classes.photoClueDot} />
                        {description}
                    </div>
                    : null
            }
            <div className={classes.scrollHint} aria-hidden="true">
                <div className={classes.scrollHintPill}>
                    <svg className={classes.scrollHintArrow} width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 3.5 L5 7 L8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
        </div>
    );
};