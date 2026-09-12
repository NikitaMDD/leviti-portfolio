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
        </div>
    );
};