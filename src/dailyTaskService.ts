import { Case, MailingItem } from './types';
import { STREET_ORDER } from './utils';

const getTodayKey = () => `daily-tasks-${new Date().toISOString().split('T')[0]}`;
const PATROL_TRACKER_KEY = 'patrol-tracker';
const DAILY_TASKS_PREFIX = 'daily-tasks-';
const CERT_MAIL_QUEUE_KEY = 'cert-mail-queue-v2';

interface PatrolState {
    lastCompletedIndex: number;
    lastRotationDate?: string;
}

export interface DailyProgress {
    completedStreets: string[];
    completedCaseTasks: {
        [caseId: string]: ('notice' | 'envelope')[];
    };
}

// Clear old daily task data from previous days to keep localStorage clean.
const clearOldTaskData = () => {
    const todayKey = getTodayKey();
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(DAILY_TASKS_PREFIX) && key !== todayKey) {
            localStorage.removeItem(key);
        }
    });
};

/**
 * Retrieves the persistent patrol state (which street index to start from).
 * This state persists across multiple days.
 */
export const getPatrolState = (): PatrolState => {
    try {
        const stored = localStorage.getItem(PATROL_TRACKER_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse patrol state", e); }
    return { lastCompletedIndex: -1 }; // Start before the first index on first run
};

/**
 * Saves the persistent patrol state.
 */
export const savePatrolState = (state: PatrolState) => {
    localStorage.setItem(PATROL_TRACKER_KEY, JSON.stringify(state));
};

/**
 * Retrieves the progress for the current day only (e.g., checked-off streets).
 * Automatically clears out data from previous days.
 */
export const getTodaysProgress = (): DailyProgress => {
    clearOldTaskData();
    try {
        const stored = localStorage.getItem(getTodayKey());
        if (stored) return JSON.parse(stored);
    } catch (e) { console.error("Failed to parse today's progress", e); }
    return { completedStreets: [], completedCaseTasks: {} };
};

/**
 * Saves the progress for the current day.
 */
export const saveTodaysProgress = (progress: DailyProgress) => {
    localStorage.setItem(getTodayKey(), JSON.stringify(progress));
};

/**
 * Advances the persistent patrol index to the next block of streets.
 */
export const advancePatrol = (streetListLength: number) => {
    let state = getPatrolState();
    let newIndex = state.lastCompletedIndex + 3;
    if (newIndex >= streetListLength) {
        newIndex = 0; // Loop back to the start
    }
    state.lastCompletedIndex = newIndex;
    savePatrolState(state);

    // Also reset completed streets for the new patrol set for today
    const progress = getTodaysProgress();
    progress.completedStreets = [];
    saveTodaysProgress(progress);
};

/**
 * Checks if the date has changed since the last rotation. 
 * If it is a new day, it automatically rotates the patrol.
 */
export const checkAndRotatePatrol = () => {
    console.log("dailyTaskService: checkAndRotatePatrol called");
    const state = getPatrolState();
    const today = new Date().toISOString().split('T')[0];

    if (state.lastRotationDate !== today) {
        // Advance the patrol index
        advancePatrol(STREET_ORDER.length);
        
        // Update the state with the new date so we don't rotate again today
        const newState = getPatrolState();
        newState.lastRotationDate = today;
        savePatrolState(newState);
    }
};

/**
 * Marks a street as patrolled or not for the current day.
 */
export const markStreetComplete = (streetName: string, isComplete: boolean) => {
    const progress = getTodaysProgress();
    if (isComplete) {
        if (!progress.completedStreets.includes(streetName)) {
            progress.completedStreets.push(streetName);
        }
    } else {
        progress.completedStreets = progress.completedStreets.filter(s => s !== streetName);
    }
    saveTodaysProgress(progress);
};

/**
 * Marks a specific task for a case as complete or incomplete for the day.
 */
export const setTaskComplete = (caseId: string, taskType: 'notice' | 'envelope', isComplete: boolean) => {
    const progress = getTodaysProgress();
    if (!progress.completedCaseTasks[caseId]) {
        progress.completedCaseTasks[caseId] = [];
    }

    const taskList = progress.completedCaseTasks[caseId];
    const hasTask = taskList.includes(taskType);

    if (isComplete && !hasTask) {
        taskList.push(taskType);
    } else if (!isComplete && hasTask) {
        progress.completedCaseTasks[caseId] = taskList.filter(t => t !== taskType);
    }
    
    saveTodaysProgress(progress);
};

/**
 * Marks a specific task for a case (like 'notice' or 'envelope') as complete for the day.
 */
export const markTaskComplete = (caseId: string, taskType: 'notice' | 'envelope') => {
    setTaskComplete(caseId, taskType, true);
};

// --- Certificate of Mail Queue ---

export const getCertMailQueue = (): MailingItem[] => {
    try {
        const stored = localStorage.getItem(CERT_MAIL_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse cert mail queue", e);
        return [];
    }
};

const saveCertMailQueue = (queue: MailingItem[]) => {
    localStorage.setItem(CERT_MAIL_QUEUE_KEY, JSON.stringify(queue));
};

export const addToCertMailQueue = (caseData: Case) => {
    const queue = getCertMailQueue();
    
    // Add owner if not already in queue
    const ownerExists = queue.some(item => item.caseId === caseData.id && item.recipient === 'owner');
    if (!ownerExists) {
        queue.push({ caseId: caseData.id, recipient: 'owner' });
    }

    // Add occupant if addresses differ and not already in queue
    const ownerMailing = (caseData.ownerInfo.mailingAddress || '').trim().toLowerCase();
    const propertyAddress = (caseData.address.street || '').trim().toLowerCase();
    
    if (ownerMailing && propertyAddress && !ownerMailing.includes(propertyAddress)) {
        const occupantExists = queue.some(item => item.caseId === caseData.id && item.recipient === 'occupant');
        if (!occupantExists) {
            queue.push({ caseId: caseData.id, recipient: 'occupant' });
        }
    }

    saveCertMailQueue(queue);
};

export const removeFromCertMailQueue = (caseId: string, recipient: 'owner' | 'occupant') => {
    let queue = getCertMailQueue();
    queue = queue.filter(item => !(item.caseId === caseId && item.recipient === recipient));
    saveCertMailQueue(queue);
};

export const clearCertMailQueue = () => {
    localStorage.removeItem(CERT_MAIL_QUEUE_KEY);
};