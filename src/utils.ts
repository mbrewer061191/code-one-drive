import { Case } from './types';

export const getCaseTimeStatus = (c: Case): 'ontime' | 'nearing-due' | 'overdue' | 'closed' => {
    if (c.status === 'CLOSED') {
        return 'closed';
    }

    const deadline = new Date(c.complianceDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare against the start of today

    if (isNaN(deadline.getTime())) {
        return 'ontime'; // Default for safety if date is invalid
    }

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'overdue';
    }
    if (diffDays <= 3) {
        return 'nearing-due';
    }
    return 'ontime';
};

// --- Custom Street Sorting Logic ---

export const STREET_ORDER = [
    // West to East
    'main', 'vine', 'quincy', 'river', 'cherry', 'maple', 'walnut', 'cedar', 'elm',
    'mickey mantle',
    'l st',
    'mcbee',
    'meadowlark',
    'm st',
    // North to South
    '6th', '5th', '4th', '3rd', '2nd', '1st', 'commerce', 'a st', 'b st', 'c st',
    'doug furnas',
].map(s => s.toLowerCase());

/**
 * Parses a full street address into its numeric part and a clean name.
 * @param address The full street address string.
 * @returns An object with the street number and cleaned name.
 */
function parseAddress(address: string): { number: number; name: string } {
    const lowerAddress = address.toLowerCase().trim();
    // Match an optional house number at the beginning of the string.
    const match = lowerAddress.match(/^(?:(\d+)\s+)?(.*)/);

    if (match) {
        const number = match[1] ? parseInt(match[1], 10) : 0;
        // Clean up the street name by removing common suffixes for better matching.
        let name = match[2]
            .replace(/\s(st|street|blvd|boulevard|ave|avenue|ln|lane|rt|route|rd|road)$/i, '')
            .trim();

        // Handle known aliases for streets.
        if (name.includes('route 66') || name.includes('rt 66')) name = 'mickey mantle';
        if (name.includes('d st')) name = 'doug furnas';

        return { number, name };
    }

    // Fallback for addresses that don't match (e.g., no number).
    return { number: 0, name: lowerAddress };
}

/**
 * Compares two street addresses for sorting based on a predefined geographical order.
 * @param addressA The first address.
 * @param addressB The second address.
 * @returns A number for use in Array.prototype.sort().
 */
export const compareStreets = (addressA: string, addressB: string): number => {
    const parsedA = parseAddress(addressA);
    const parsedB = parseAddress(addressB);

    const indexA = STREET_ORDER.findIndex(street => parsedA.name.includes(street));
    const indexB = STREET_ORDER.findIndex(street => parsedB.name.includes(street));

    // Both streets are in the custom order list.
    if (indexA !== -1 && indexB !== -1) {
        if (indexA !== indexB) {
            return indexA - indexB; // Sort by the custom order first.
        }
        return parsedA.number - parsedB.number; // Then sort by street number.
    }

    // Only A is in the custom list, so it comes first.
    if (indexA !== -1) return -1;

    // Only B is in the custom list, so it comes first.
    if (indexB !== -1) return 1;

    // Neither is in the custom list, so fall back to alphabetical sort by name, then by number.
    const nameCompare = parsedA.name.localeCompare(parsedB.name, undefined, { numeric: true });
    if (nameCompare !== 0) {
        return nameCompare;
    }
    return parsedA.number - parsedB.number;
};

/**
 * A wrapper around fetch that includes a timeout.
 * @param url The URL to fetch.
 * @param options Fetch options.
 * @param timeout The timeout in milliseconds (default: 15000).
 * @returns A Promise that resolves to the Response object.
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 15000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms: ${url}`);
        }
        throw error;
    }
}
