// Resources belong to one simulator, including textures temporarily detached
// from a material. Forget replaced resources as soon as they are disposed.
export class ResourceScope {
    resources = new Set();
    own(resource) {
        if (!resource || this.resources.has(resource)) return resource;
        if (resource.isObject3D) {
            resource.traverse(node => {
                if (node.geometry) this.own(node.geometry);
                for (const material of [node.material].flat()) this.own(material);
            });
            return resource;
        }
        if (typeof resource.dispose !== 'function') return resource;
        this.resources.add(resource);
        const forget = () => {
            this.resources.delete(resource);
            resource.removeEventListener?.('dispose', forget);
        };
        resource.addEventListener?.('dispose', forget);
        if (resource.isMaterial) {
            for (const value of Object.values(resource)) if (value?.isTexture) this.own(value);
        }
        return resource;
    }
    dispose() {
        const errors = [];
        for (const resource of this.resources) {
            try { resource.dispose(); } catch (error) { errors.push(error); }
        }
        this.resources.clear();
        if (errors.length) throw new AggregateError(errors, 'Resource cleanup failed');
    }
}
