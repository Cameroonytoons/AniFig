export function compareAnimations(a, b) {
    if (a.type !== b.type || a.duration !== b.duration || a.easing !== b.easing) {
        return false;
    }
    const aProps = Object.entries(a.properties);
    const bProps = Object.entries(b.properties);
    if (aProps.length !== bProps.length) {
        return false;
    }
    return aProps.every(([key, value]) => {
        const bValue = b.properties[key];
        return bValue &&
            value.from === bValue.from &&
            value.to === bValue.to;
    });
}
export function generateAnimationCSS(animation) {
    const { duration, easing, properties } = animation;
    const transforms = [];
    const styles = [];
    Object.entries(properties).forEach(([key, value]) => {
        switch (key) {
            case 'x':
                transforms.push(`translateX(${value.to}px)`);
                styles.push(`transform-origin: left center`);
                break;
            case 'y':
                transforms.push(`translateY(${value.to}px)`);
                styles.push(`transform-origin: center top`);
                break;
            case 'scale':
                transforms.push(`scale(${value.to})`);
                styles.push(`transform-origin: center center`);
                break;
            case 'rotation':
                transforms.push(`rotate(${value.to}deg)`);
                styles.push(`transform-origin: center center`);
                break;
            case 'opacity':
                styles.push(`opacity: ${value.to}`);
                break;
        }
    });
    const cssTransform = transforms.length > 0 ? `transform: ${transforms.join(' ')};` : '';
    const cssStyles = styles.join(';');
    const keyframeAnimation = generateKeyframes(animation);
    return `
    ${keyframeAnimation}
    animation: customAnimation ${duration}ms ${easing} forwards;
    ${cssTransform}
    ${cssStyles}
  `;
}
function generateKeyframes(animation) {
    const { properties } = animation;
    let fromTransforms = [];
    let fromStyles = [];
    let toTransforms = [];
    let toStyles = [];
    Object.entries(properties).forEach(([key, value]) => {
        switch (key) {
            case 'x':
                fromTransforms.push(`translateX(${value.from}px)`);
                toTransforms.push(`translateX(${value.to}px)`);
                break;
            case 'y':
                fromTransforms.push(`translateY(${value.from}px)`);
                toTransforms.push(`translateY(${value.to}px)`);
                break;
            case 'scale':
                fromTransforms.push(`scale(${value.from})`);
                toTransforms.push(`scale(${value.to})`);
                break;
            case 'rotation':
                fromTransforms.push(`rotate(${value.from}deg)`);
                toTransforms.push(`rotate(${value.to}deg)`);
                break;
            case 'opacity':
                fromStyles.push(`opacity: ${value.from}`);
                toStyles.push(`opacity: ${value.to}`);
                break;
        }
    });
    const fromTransform = fromTransforms.length > 0 ? `transform: ${fromTransforms.join(' ')};` : '';
    const toTransform = toTransforms.length > 0 ? `transform: ${toTransforms.join(' ')};` : '';
    return `
    @keyframes customAnimation {
      from {
        ${fromTransform}
        ${fromStyles.join(';')}
      }
      to {
        ${toTransform}
        ${toStyles.join(';')}
      }
    }
  `;
}
export function interpolateValue(from, to, progress) {
    return from + (to - from) * progress;
}
export function generateTransitionKeyframes(animation, steps = 60) {
    const { duration, properties } = animation;
    const keyframes = [];
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const time = progress * duration;
        const values = {};
        Object.entries(properties).forEach(([key, { from, to }]) => {
            values[key] = interpolateValue(from, to, progress);
        });
        keyframes.push({ time, values });
    }
    return keyframes;
}
//# sourceMappingURL=utils.js.map