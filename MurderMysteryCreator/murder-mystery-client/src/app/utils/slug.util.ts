/**
 * Utility functions for creating URL-friendly slugs from device names
 */

/**
 * Creates a slug from device type and owner name
 * Example: "iPhone" + "Maria" -> "iphone-maria"
 */
export function createDeviceSlug(deviceType: string, ownerName: string): string {
    const typeSlug = deviceType.toLowerCase().replace(/\s+/g, '-');
    const ownerSlug = ownerName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
    
    return `${typeSlug}-${ownerSlug}`;
}

/** Known device types with correct casing for API matching */
const DEVICE_TYPE_MAP: Record<string, string> = {
    'iphone': 'iPhone',
    'android': 'Android',
    'laptop': 'Laptop'
};

/**
 * Parses a device slug to extract device type and owner name
 * Example: "iphone-maria" -> { deviceType: "iPhone", ownerName: "Maria" }
 */
export function parseDeviceSlug(slug: string): { deviceType: string; ownerName: string } | null {
    const parts = slug.split('-');
    if (parts.length < 2) return null;
    
    // First part is device type - use exact casing for API (iPhone, Android, Laptop)
    const typeLower = parts[0].toLowerCase();
    const deviceType = DEVICE_TYPE_MAP[typeLower] ?? (parts[0].charAt(0).toUpperCase() + parts[0].slice(1));
    
    // Rest is owner name
    const ownerName = parts.slice(1).join(' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return { deviceType, ownerName };
}
