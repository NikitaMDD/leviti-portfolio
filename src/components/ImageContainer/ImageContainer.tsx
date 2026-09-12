import React from 'react';
import classes from "./ImageContainer.module.css"

interface ImageContainerProps {
    src: string;
    description?: string;
    alt?: string;
}

export const ImageContainer = ({
    src,
    alt,
    description,
}: ImageContainerProps) => {
    return (
        <div className={`${classes.imageWrapper} js-about-photo`}>
            <img src={src} alt={alt} />
            {
                description ?
                    <div className={classes.photoClue}>
                        {description}
                    </div>
                    : null
            }
        </div>
    );
};