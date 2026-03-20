import { PhotoWithMeta } from './types';

const PENDING_PATROL_CASES_KEY = 'pending-patrol-cases-v1';

// Helper to convert a dataURL string into a Blob object
function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error('Invalid dataURL');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Could not parse mime type from dataURL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Helper to convert a Blob object into a File object
function blobToFile(theBlob: Blob, fileName: string): File {
    const b: any = theBlob;
    b.lastModifiedDate = new Date();
    b.name = fileName;
    return <File>theBlob;
}

// Defines a serializable format for storing photo metadata in localStorage
interface SerializablePhoto {
    dataUrl: string;
    name: string;
    type: string;
}
interface SerializablePatrolCase {
    id: string;
    photos: SerializablePhoto[];
}

/**
 * Saves the current list of pending patrol cases to localStorage.
 * Converts File objects to a serializable format.
 * @param cases The array of pending patrol cases with PhotoWithMeta objects.
 */
export const savePendingPatrolCases = (cases: { id: string; photos: PhotoWithMeta[] }[]): void => {
    try {
        const serializableCases: SerializablePatrolCase[] = cases.map(c => ({
            id: c.id,
            photos: c.photos.map(p => ({
                dataUrl: p.dataUrl,
                name: p.file.name,
                type: p.file.type,
            })),
        }));
        localStorage.setItem(PENDING_PATROL_CASES_KEY, JSON.stringify(serializableCases));
    } catch (error) {
        console.error("Failed to save pending patrol cases to local storage:", error);
    }
};

/**
 * Loads and reconstructs pending patrol cases from localStorage.
 * Converts the serializable format back into PhotoWithMeta objects with File objects.
 * @returns An array of pending patrol cases.
 */
export const loadPendingPatrolCases = (): { id: string; photos: PhotoWithMeta[] }[] => {
    try {
        const stored = localStorage.getItem(PENDING_PATROL_CASES_KEY);
        if (!stored) return [];

        const serializableCases: SerializablePatrolCase[] = JSON.parse(stored);
        
        return serializableCases.map(c => ({
            id: c.id,
            photos: c.photos.map(p => {
                const blob = dataURLtoBlob(p.dataUrl);
                const file = blobToFile(blob, p.name);
                return { file, dataUrl: p.dataUrl };
            }),
        }));

    } catch (error) {
        console.error("Failed to load pending patrol cases from local storage:", error);
        // If parsing fails, remove the corrupted data to prevent future errors.
        localStorage.removeItem(PENDING_PATROL_CASES_KEY);
        return [];
    }
};
