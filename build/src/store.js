export class Store {
    constructor() {
        this.animations = new Map();
    }
    async init() {
        try {
            console.log('Initializing Store');
            const stored = await figma.clientStorage.getAsync('animations');
            console.log('Retrieved stored animations:', stored ? 'Found' : 'None');
            if (stored) {
                Object.entries(stored).forEach(([key, value]) => {
                    console.log(`Loading animation: ${key}`);
                    this.animations.set(key, value);
                });
            }
            console.log('Store initialization completed');
        }
        catch (error) {
            console.error('Error initializing store:', error);
            throw error;
        }
    }
    getAnimation(name) {
        return this.animations.get(name);
    }
    setAnimation(name, preset) {
        // Validate animation parameters
        if (!this.validateAnimation(preset)) {
            throw new Error('Invalid animation preset');
        }
        // Check for existing animation
        if (this.animations.has(name)) {
            throw new Error(`Animation "${name}" already exists`);
        }
        this.animations.set(name, preset);
        this.persist();
    }
    updateAnimation(name, preset) {
        // Validate animation parameters
        if (!this.validateAnimation(preset)) {
            throw new Error('Invalid animation preset');
        }
        // Check if animation exists
        if (!this.animations.has(name)) {
            throw new Error(`Animation "${name}" does not exist`);
        }
        this.animations.set(name, preset);
        this.persist();
    }
    deleteAnimation(name) {
        if (!this.animations.has(name)) {
            throw new Error(`Animation "${name}" does not exist`);
        }
        this.animations.delete(name);
        this.persist();
    }
    getAnimationsByGroup(group) {
        return Array.from(this.animations.entries())
            .filter(([_, preset]) => preset.group === group);
    }
    searchAnimations(query) {
        const lowercaseQuery = query.toLowerCase();
        return Array.from(this.animations.entries())
            .filter(([name, preset]) => {
            var _a, _b;
            return name.toLowerCase().includes(lowercaseQuery) ||
                ((_a = preset.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(lowercaseQuery)) ||
                ((_b = preset.group) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(lowercaseQuery));
        });
    }
    validateAnimation(preset) {
        var _a, _b, _c, _d;
        const { type, duration, easing, properties } = preset;
        // Validate required fields
        if (!type || !duration || !easing || !properties) {
            return false;
        }
        // Validate duration
        if (duration <= 0 || duration > 10000) {
            return false;
        }
        // Validate properties based on type
        switch (type) {
            case 'fade':
                if (!properties.opacity)
                    return false;
                return properties.opacity.from >= 0 &&
                    properties.opacity.to >= 0 &&
                    properties.opacity.from <= 1 &&
                    properties.opacity.to <= 1;
            case 'slide':
                return ('x' in properties || 'y' in properties) &&
                    (((_a = properties.x) === null || _a === void 0 ? void 0 : _a.from) !== undefined || ((_b = properties.y) === null || _b === void 0 ? void 0 : _b.from) !== undefined) &&
                    (((_c = properties.x) === null || _c === void 0 ? void 0 : _c.to) !== undefined || ((_d = properties.y) === null || _d === void 0 ? void 0 : _d.to) !== undefined);
            case 'scale':
                if (!properties.scale)
                    return false;
                return properties.scale.from > 0 &&
                    properties.scale.to > 0;
            case 'rotate':
                return 'rotation' in properties &&
                    properties.rotation !== undefined;
            default:
                return false;
        }
    }
    async persist() {
        const data = Object.fromEntries(this.animations);
        await figma.clientStorage.setAsync('animations', data);
    }
    getAllAnimations() {
        return Array.from(this.animations.entries());
    }
    getAnimationCount() {
        return this.animations.size;
    }
}
//# sourceMappingURL=store.js.map