export class Store {
    constructor() {
        this.animations = new Map();
        this.initialized = false;
        this.initializationPromise = null;
        this.INIT_TIMEOUT = 5000; // 5 seconds timeout
        this.cleanupHandlers = [];
    }
    async init() {
        console.log('Store: Starting initialization');
        if (this.initialized) {
            console.log('Store: Already initialized');
            return;
        }
        if (this.initializationPromise) {
            console.log('Store: Using existing initialization promise');
            return this.initializationPromise;
        }
        this.initializationPromise = new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.error('Store: Initialization timed out');
                this.cleanup();
                this.initialized = false;
                reject(new Error('Store initialization timed out'));
            }, this.INIT_TIMEOUT);
            try {
                console.log('Store: Loading stored animations');
                const stored = await figma.clientStorage.getAsync('animations');
                if (stored) {
                    console.log('Store: Processing stored animations');
                    Object.entries(stored).forEach(([key, value]) => {
                        this.animations.set(key, value);
                    });
                    console.log(`Store: Loaded ${this.animations.size} animations`);
                }
                this.initialized = true;
                clearTimeout(timeoutId);
                console.log('Store: Initialization completed successfully');
                resolve();
            }
            catch (error) {
                console.error('Store: Initialization failed:', error);
                clearTimeout(timeoutId);
                this.cleanup();
                this.initialized = false;
                reject(error);
            }
        });
        return this.initializationPromise;
    }
    cleanup() {
        console.log('Store: Running cleanup');
        this.cleanupHandlers.forEach(handler => {
            try {
                handler();
            }
            catch (error) {
                console.error('Store: Cleanup handler failed:', error);
            }
        });
        this.cleanupHandlers = [];
        this.animations.clear();
    }
    getAnimation(name) {
        this.checkInitialization();
        return this.animations.get(name);
    }
    setAnimation(name, preset) {
        this.checkInitialization();
        if (!this.validateAnimation(preset)) {
            throw new Error('Invalid animation preset');
        }
        if (this.animations.has(name)) {
            throw new Error(`Animation "${name}" already exists`);
        }
        this.animations.set(name, preset);
        this.persist();
    }
    updateAnimation(name, preset) {
        this.checkInitialization();
        if (!this.validateAnimation(preset)) {
            throw new Error('Invalid animation preset');
        }
        if (!this.animations.has(name)) {
            throw new Error(`Animation "${name}" does not exist`);
        }
        this.animations.set(name, preset);
        this.persist();
    }
    deleteAnimation(name) {
        this.checkInitialization();
        if (!this.animations.has(name)) {
            throw new Error(`Animation "${name}" does not exist`);
        }
        this.animations.delete(name);
        this.persist();
    }
    getAnimationsByGroup(group) {
        this.checkInitialization();
        return Array.from(this.animations.entries())
            .filter(([_, preset]) => preset.group === group);
    }
    searchAnimations(query) {
        this.checkInitialization();
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
        if (!type || !duration || !easing || !properties) {
            console.warn('Store: Invalid animation - missing required fields');
            return false;
        }
        if (duration <= 0 || duration > 10000) {
            console.warn('Store: Invalid animation - duration out of range');
            return false;
        }
        switch (type) {
            case 'fade':
                if (!properties.opacity) {
                    console.warn('Store: Invalid fade animation - missing opacity');
                    return false;
                }
                return properties.opacity.from >= 0 &&
                    properties.opacity.to >= 0 &&
                    properties.opacity.from <= 1 &&
                    properties.opacity.to <= 1;
            case 'slide':
                const hasValidPosition = ('x' in properties || 'y' in properties) &&
                    (((_a = properties.x) === null || _a === void 0 ? void 0 : _a.from) !== undefined || ((_b = properties.y) === null || _b === void 0 ? void 0 : _b.from) !== undefined) &&
                    (((_c = properties.x) === null || _c === void 0 ? void 0 : _c.to) !== undefined || ((_d = properties.y) === null || _d === void 0 ? void 0 : _d.to) !== undefined);
                if (!hasValidPosition) {
                    console.warn('Store: Invalid slide animation - invalid position properties');
                }
                return hasValidPosition;
            case 'scale':
                if (!properties.scale) {
                    console.warn('Store: Invalid scale animation - missing scale');
                    return false;
                }
                return properties.scale.from > 0 &&
                    properties.scale.to > 0;
            case 'rotate':
                const hasValidRotation = 'rotation' in properties &&
                    properties.rotation !== undefined;
                if (!hasValidRotation) {
                    console.warn('Store: Invalid rotate animation - missing rotation');
                }
                return hasValidRotation;
            default:
                console.warn('Store: Invalid animation type:', type);
                return false;
        }
    }
    async persist() {
        try {
            const data = Object.fromEntries(this.animations);
            await figma.clientStorage.setAsync('animations', data);
            console.log('Store: Successfully persisted animations');
        }
        catch (error) {
            console.error('Store: Failed to persist animations:', error);
            throw error;
        }
    }
    checkInitialization() {
        if (!this.initialized) {
            console.error('Store: Attempted to use store before initialization');
            throw new Error('Store not initialized. Call init() first.');
        }
    }
    getAllAnimations() {
        this.checkInitialization();
        return Array.from(this.animations.entries());
    }
    getAnimationCount() {
        this.checkInitialization();
        return this.animations.size;
    }
    isInitialized() {
        return this.initialized;
    }
}
//# sourceMappingURL=store.js.map