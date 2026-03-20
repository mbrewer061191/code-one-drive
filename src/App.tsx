


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getConfig } from './config';
import { dataService } from './dataService';
import { Case, View, Property, PhotoWithMeta, EvidencePhoto, ComplaintLogEntry } from './types';
import { getTaxRollProperties } from './propertyData'; // Import the new data source
import AdminView from './components/Admin';
import CaseList from './components/CaseList';
import NewCaseForm from './components/NewCaseForm';
import CaseDetails from './components/CaseDetails';
import TemplateManager from './components/TemplateManager';
import ComplaintLog from './components/ComplaintLog';
import Reports from './components/Reports';
import { getCaseTimeStatus } from './utils';
import PropertyDirectory from './components/PropertyDirectory';
import AbatementReport from './components/AbatementReport';
import { initialAddressState, initialOwnerState, initialViolationState, VIOLATIONS_LIST, COMPLIANCE_DAYS } from './constants';
import DailyTasks from './components/DailyTasks';
import AlleyPatrol from './components/AlleyPatrol';
import { savePendingPatrolCases, loadPendingPatrolCases } from './patrolService';
import AnimalControlDashboard from './components/AnimalControlDashboard';
import { checkAndRotatePatrol } from './dailyTaskService';
import MailingView from './components/MailingView';
import CitationPage from './components/CitationPage';

console.log("App.tsx: Module loading...");

const COMPLAINT_LOG_KEY = 'complaint-logs-v1';

type AppStatus = 'LOADING' | 'NEEDS_CONFIG' | 'READY' | 'ERROR';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("App Error Boundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'sans-serif' }}>
                    <h2>Something went wrong in App.</h2>
                    <p>{this.state.error?.message}</p>
                    <pre style={{ textAlign: 'left', background: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const App: React.FC = () => {
    console.log("App component: Initializing state...");
    const [appStatus, setAppStatus] = useState<AppStatus>('LOADING');
    const [view, setView] = useState<View>('TASKS');
    const [activeTab, setActiveTab] = useState('tasks');

    const [cases, setCases] = useState<Case[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [complaintLogs, setComplaintLogs] = useState<ComplaintLogEntry[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isInitialCheck = useRef(true);
    const [showAbatementReport, setShowAbatementReport] = useState(false);

    const [draftCase, setDraftCase] = useState<(Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null>(null);
    const [pendingPatrolCases, setPendingPatrolCases] = useState<{ id: string, photos: PhotoWithMeta[] }[]>(loadPendingPatrolCases());

    useEffect(() => {
        console.log("App mounted, status:", appStatus);
        checkAndRotatePatrol();
    }, []);

    useEffect(() => {
        savePendingPatrolCases(pendingPatrolCases);
    }, [pendingPatrolCases]);

    useEffect(() => {
        try {
            const storedLogsReal = localStorage.getItem(COMPLAINT_LOG_KEY);
            if (storedLogsReal) {
                setComplaintLogs(JSON.parse(storedLogsReal));
            }
        } catch (error) {
            console.error("Failed to load complaint logs from local storage:", error);
        }
    }, []);

    const handleUpdateLogs = (updatedLogs: ComplaintLogEntry[]) => {
        setComplaintLogs(updatedLogs);
        try {
            localStorage.setItem(COMPLAINT_LOG_KEY, JSON.stringify(updatedLogs));
        } catch (error) {
            console.error("Failed to save complaint logs to local storage:", error);
        }
    };


    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const addDebug = (msg: string) => setDebugInfo(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${msg}`]);

    const checkConfiguration = useCallback(async () => {
        addDebug("Checking configuration...");
        setAppStatus('LOADING');
        setError(null);

        // Safety timeout: if config check takes > 10s, show error with escape hatch
        const timeoutId = setTimeout(() => {
            if (appStatus === 'LOADING') {
                console.warn("Configuration check timed out.");
                addDebug("Timeout reached!");
                setError("Configuration check is taking longer than expected. You can try to force the Admin setup if you are stuck.");
                setAppStatus('ERROR');
            }
        }, 15000);

        try {
            addDebug("Calling getConfig...");
            const config = await getConfig(isInitialCheck.current);
            clearTimeout(timeoutId);
            isInitialCheck.current = false;
            addDebug(`Config loaded: ClientID=${!!config?.google?.clientId}, FileID=${!!config?.google?.fileId}`);

            if (config?.google?.clientId && config.google.fileId) {
                addDebug("Config ready, setting app status to READY");
                setAppStatus('READY');
                if (view === 'ADMIN') {
                    setView('TASKS');
                    setActiveTab('tasks');
                }
            } else {
                addDebug("Config incomplete, setting app status to NEEDS_CONFIG");
                setAppStatus('NEEDS_CONFIG');
                setView('ADMIN');
                setActiveTab('admin');
            }
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error("Config check failed:", err);
            addDebug(`Error: ${err.message || 'Unknown'}`);
            setError(`Failed to load configuration: ${err.message || 'Unknown error'}`);
            setAppStatus('ERROR');
        }
    }, [view, appStatus]);

    useEffect(() => {
        const handleGlobalError = (event: ErrorEvent) => {
            console.error("Global error caught:", event.error);
            addDebug(`Global Error: ${event.message}`);
        };
        window.addEventListener('error', handleGlobalError);

        // Only run on mount or when explicitly triggered
        if (isInitialCheck.current) {
            checkConfiguration();
        }

        return () => window.removeEventListener('error', handleGlobalError);
    }, []);


    const loadData = useCallback(() => {
        if (appStatus === 'READY') {
            console.log("App READY, loading data...");
            setIsLoading(true);
            setError(null);

            try {
                const baseProperties = getTaxRollProperties();
                console.log("Tax roll properties loaded:", baseProperties.length);

                dataService.getAllData()
                    .then(({ cases, properties: savedProperties }) => {
                        console.log("Remote data loaded:", cases?.length, savedProperties?.length);
                        // Merge tax roll data with user-saved data
                        const mergedProperties: Property[] = [];
                        const savedPropertiesMap = new Map<string, Property>();

                        (savedProperties || []).forEach(p => {
                            savedPropertiesMap.set(p.streetAddress.toLowerCase(), p);
                        });

                        baseProperties.forEach(baseProp => {
                            const savedProp = savedPropertiesMap.get(baseProp.streetAddress.toLowerCase());
                            if (savedProp) {
                                mergedProperties.push(savedProp);
                                savedPropertiesMap.delete(baseProp.streetAddress.toLowerCase());
                            } else {
                                mergedProperties.push(baseProp);
                            }
                        });

                        mergedProperties.push(...Array.from(savedPropertiesMap.values()));

                        setProperties(mergedProperties);
                        setCases(cases);
                    })
                    .catch(err => {
                        console.error("Failed to load data from service:", err);
                        setError(`Failed to load data: ${err.message}`);
                    })
                    .finally(() => setIsLoading(false));
            } catch (e: any) {
                console.error("Error during data loading process:", e);
                setError(`Error during data loading: ${e.message}`);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [appStatus]);


    useEffect(() => { loadData(); }, [loadData]);

    const handleSetupComplete = () => {
        checkConfiguration();
    };

    const handleSelectCase = (caseId: string) => { setSelectedCaseId(caseId); setView('DETAILS'); };

    // Helper to generate the auto-incrementing Case Number: MM-NNN-YY
    const generateNextCaseId = () => {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(-2);

        const monthPrefix = `${mm}-`;
        const yearSuffix = `-${yy}`;

        const monthCases = cases.filter(c =>
            c.caseId.startsWith(monthPrefix) && c.caseId.endsWith(yearSuffix)
        );

        let nextNum = 1;
        if (monthCases.length > 0) {
            const nums = monthCases.map(c => {
                const parts = c.caseId.split('-');
                return parts.length === 3 ? parseInt(parts[1], 10) : 0;
            }).filter(n => !isNaN(n));

            if (nums.length > 0) {
                nextNum = Math.max(...nums) + 1;
            }
        }

        const nnn = String(nextNum).padStart(3, '0');
        return `${mm}-${nnn}-${yy}`;
    };

    const handleNewCase = () => {
        if (!draftCase) {
            setDraftCase({
                id: `draft-${Date.now()}`,
                caseId: generateNextCaseId(), // Automatically set the next ID
                address: initialAddressState,
                ownerInfo: initialOwnerState,
                violation: initialViolationState,
                ownerInfoStatus: 'KNOWN',
                isVacant: false,
                _tempPhotos: []
            });
        }
        setView('NEW');
        setActiveTab('new');
    };

    const handleCancelNew = () => {
        if (draftCase && (draftCase._tempPhotos?.length || 0) > 0) {
            if (!window.confirm("Are you sure you want to cancel? Any photos you've taken will be lost.")) {
                return;
            }
        }
        setDraftCase(null);
        setView('TASKS');
        setActiveTab('tasks');
    };

    const handleCreateCaseFromPatrol = (patrolCase: { id: string, photos: PhotoWithMeta[] }) => {
        setDraftCase({
            id: `draft-${Date.now()}`,
            caseId: generateNextCaseId(),
            address: initialAddressState,
            ownerInfo: initialOwnerState,
            violation: initialViolationState,
            ownerInfoStatus: 'KNOWN',
            isVacant: false,
            _tempPhotos: patrolCase.photos,
        });
        setPendingPatrolCases(prev => prev.filter(p => p.id !== patrolCase.id));
        setView('NEW');
        setActiveTab('new');
    };

    const handleBackToList = () => { setSelectedCaseId(null); setView('TASKS'); setActiveTab('tasks'); };

    const handleSaveCase = (draftToSave: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] })) => {
        const today = new Date(), deadline = new Date();
        deadline.setDate(today.getDate() + COMPLIANCE_DAYS);
        const formatDate = (d: Date) => d.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const finalViolation = draftToSave.violation?.type === 'Other (Manual Entry)'
            ? draftToSave.violation
            : VIOLATIONS_LIST.find(v => v.type === draftToSave.violation?.type) || initialViolationState;

        const tempCase: Case = {
            id: draftToSave.id || self.crypto.randomUUID(),
            caseId: (draftToSave.caseId || '').trim(),
            status: 'ACTIVE',
            dateCreated: formatDate(today),
            complianceDeadline: formatDate(deadline),
            address: draftToSave.address || initialAddressState,
            ownerInfo: draftToSave.ownerInfo || initialOwnerState,
            ownerInfoStatus: draftToSave.ownerInfoStatus || 'KNOWN',
            violation: finalViolation,
            isVacant: draftToSave.isVacant || false,
            evidence: { notes: [{ date: formatDate(today), text: "Case created." }], photos: [] },
            notices: [],
        };

        setCases(prev => [tempCase, ...prev]);
        setDraftCase(null);
        setError(null);

        setSelectedCaseId(tempCase.id);
        setView('DETAILS');
        setActiveTab('all');

        (async () => {
            try {
                const uploadedPhotos: EvidencePhoto[] = await dataService.uploadCasePhotos(draftToSave._tempPhotos || [], tempCase);
                const finalCase = { ...tempCase, evidence: { ...tempCase.evidence, photos: uploadedPhotos } };

                // FIX: Removed second argument from saveCase call as it's not expected by the function.
                await dataService.saveCase(finalCase);

                const allData = await dataService.getAllData();
                setCases(allData.cases);

            } catch (e: any) {
                console.error("Background save failed:", e);
                setError(`CRITICAL ERROR: Failed to save case "${tempCase.caseId}". Error: ${e.message}. Please check your connection and try again.`);
                setCases(prev => prev.filter(c => c.id !== tempCase.id));
                setDraftCase(draftToSave);
                setSelectedCaseId(null);
                setView('NEW');
                setActiveTab('new');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        })();
    };

    const handleUpdateCase = async (caseData: Case) => {
        setIsLoading(true);
        setError(null);
        try {
            // FIX: Removed second argument from saveCase call as it's not expected by the function.
            await dataService.saveCase(caseData);
            const allData = await dataService.getAllData();
            setCases(allData.cases);
        } catch (e: any) {
            setError(`Failed to save case: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCase = async (caseId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // FIX: Removed second argument from deleteCase call as it's not expected by the function.
            await dataService.deleteCase(caseId);
            const allData = await dataService.getAllData();
            setCases(allData.cases);
            setView('TASKS');
            setActiveTab('tasks');
            setSelectedCaseId(null);
        } catch (e: any) {
            setError(`Failed to delete case: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProperty = async (propData: Property) => {
        setIsLoading(true);
        setError(null);
        try {
            // FIX: Removed second argument from saveProperty call. The data service should handle its own state.
            await dataService.saveProperty(propData);
            loadData();
        } catch (e: any) {
            setError(`Failed to save property: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProperty = async (propId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // FIX: Removed second argument from deleteProperty call. The data service should handle its own state.
            await dataService.deleteProperty(propId);
            loadData();
        } catch (e: any) {
            setError(`Failed to delete property: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const changeTab = (tab: string, targetView: View) => {
        setActiveTab(tab);
        setView(targetView);
        setSelectedCaseId(null);
        if (tab !== 'abatement') {
            setShowAbatementReport(false);
        }
    };

    const selectedCase = cases.find(c => c.id === selectedCaseId);

    const abatementCases = cases.filter(c => c.status === 'PENDING_ABATEMENT');
    const continualAbatementCases = cases.filter(c => c.status === 'CONTINUAL_ABATEMENT');
    const dueCases = cases.filter(c => getCaseTimeStatus(c) === 'overdue' && c.status !== 'CLOSED' && c.status !== 'PENDING_ABATEMENT');

    const renderContent = () => {
        if (appStatus === 'LOADING') {
            return (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loader" style={{ margin: 'auto', borderTopColor: 'var(--primary-color)', borderLeftColor: 'var(--primary-color)' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Initializing application...</p>
                    {debugInfo.length > 0 && (
                        <div style={{
                            textAlign: 'left', fontSize: '0.7rem', fontFamily: 'monospace',
                            background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px',
                            marginTop: '1rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto',
                            maxHeight: '150px', overflow: 'auto', border: '1px solid #ddd'
                        }}>
                            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd', marginBottom: '0.25rem' }}>Debug Logs:</div>
                            {debugInfo.map((info, i) => <div key={i}>{info}</div>)}
                        </div>
                    )}
                    <button
                        onClick={() => { setAppStatus('NEEDS_CONFIG'); setView('ADMIN'); }}
                        style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.6, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                        Skip to Admin Setup
                    </button>
                </div>
            );
        }

        if (appStatus === 'ERROR' || (error && appStatus !== 'READY')) {
            return (
                <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', marginBottom: '1rem' }}>
                        <AlertTriangle size={48} style={{ margin: '0 auto' }} />
                    </div>
                    <h3>Initialization Error</h3>
                    <p>{error || 'An unexpected error occurred during startup.'}</p>
                    {debugInfo.length > 0 && (
                        <div style={{
                            textAlign: 'left', fontSize: '0.7rem', fontFamily: 'monospace',
                            background: '#f5f5f5', padding: '0.5rem', borderRadius: '4px',
                            marginTop: '1rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto',
                            maxHeight: '150px', overflow: 'auto', border: '1px solid #ddd'
                        }}>
                            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd', marginBottom: '0.25rem' }}>Debug Logs:</div>
                            {debugInfo.map((info, i) => <div key={i}>{info}</div>)}
                        </div>
                    )}
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="button" onClick={() => checkConfiguration()}>Retry</button>
                        <button className="button secondary-action" onClick={() => { setAppStatus('NEEDS_CONFIG'); setView('ADMIN'); setError(null); }}>Go to Admin</button>
                    </div>
                </div>
            );
        }

        if (appStatus === 'NEEDS_CONFIG') return <AdminView onSetupComplete={handleSetupComplete} />;

        if (isLoading && (view === 'LIST' || view === 'TASKS' || view === 'PROPERTIES')) {
            return (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loader" style={{ margin: 'auto', borderTopColor: 'var(--primary-color)', borderLeftColor: 'var(--primary-color)' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Updating data...</p>
                </div>
            );
        }

        switch (view) {
            case 'TASKS': return <DailyTasks cases={cases} onSelectCase={handleSelectCase} />;
            case 'DETAILS': return selectedCase ? <CaseDetails caseData={selectedCase} onBack={handleBackToList} onUpdate={handleUpdateCase} onDelete={handleDeleteCase} /> : <p>Case not found.</p>;
            case 'NEW': return <NewCaseForm onSave={handleSaveCase} onCancel={handleCancelNew} properties={properties} draftCase={draftCase} onUpdateDraft={setDraftCase} />;
            case 'ADMIN': return <AdminView onSetupComplete={handleSetupComplete} />;
            case 'TEMPLATES': return <TemplateManager />;
            case 'LOG': return <ComplaintLog logs={complaintLogs} onUpdateLogs={handleUpdateLogs} />;
            case 'PROPERTIES': return <PropertyDirectory cases={cases} properties={properties} onSelectCase={handleSelectCase} onSaveProperty={handleSaveProperty} onDeleteProperty={handleDeleteProperty} />;
            case 'REPORTS': return <Reports cases={cases} />;
            case 'CITATION': return <CitationPage onBack={() => { setView('TASKS'); setActiveTab('tasks'); }} />;
            case 'PATROL': return <AlleyPatrol pendingCases={pendingPatrolCases} onSetPendingCases={setPendingPatrolCases} onCreateCase={handleCreateCaseFromPatrol} />;
            case 'ANIMAL_CONTROL': return <AnimalControlDashboard logs={complaintLogs} onUpdateLogs={handleUpdateLogs} />;
            case 'MAIL': return <MailingView cases={cases} />;
            case 'LIST': default:
                if (activeTab === 'due') {
                    return <CaseList cases={dueCases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="due" />;
                }
                if (activeTab === 'abatement') {
                    return showAbatementReport
                        ? <AbatementReport cases={abatementCases} onBack={() => setShowAbatementReport(false)} />
                        : <CaseList cases={abatementCases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="abatement" onGenerateReport={() => setShowAbatementReport(true)} />;
                }
                if (activeTab === 'continual-abatement') {
                    return <CaseList cases={continualAbatementCases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="continual-abatement" />;
                }
                return <CaseList cases={cases} onSelectCase={handleSelectCase} onNewCase={handleNewCase} listType="all" />;
        }
    };

    return (
        <ErrorBoundary>
            <div className="app-container">
                <header className="app-header no-print">
                    <div className="header-side">
                        <button
                            className="patrol-btn"
                            onClick={() => { setView('PATROL'); setActiveTab('patrol'); }}
                        >
                            Patrol
                        </button>
                    </div>
                    <h1>Commerce Code Enf.</h1>
                    <div className="header-side"></div>
                </header>
                <nav className="main-nav no-print">
                    <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => changeTab('tasks', 'TASKS')}>Tasks</button>
                    <button className={activeTab === 'all' ? 'active' : ''} onClick={() => changeTab('all', 'LIST')}>Cases</button>
                    <button className={activeTab === 'due' ? 'active' : ''} onClick={() => changeTab('due', 'LIST')}>Due</button>
                    <button className={activeTab === 'abatement' ? 'active' : ''} onClick={() => changeTab('abatement', 'LIST')}>Abatement</button>
                    <button className={activeTab === 'mail' ? 'active' : ''} onClick={() => changeTab('mail', 'MAIL')}>Mail</button>
                    <button className={activeTab === 'continual-abatement' ? 'active' : ''} onClick={() => changeTab('continual-abatement', 'LIST')}>Continual</button>
                    <button className={activeTab === 'properties' ? 'active' : ''} onClick={() => changeTab('properties', 'PROPERTIES')}>Directory</button>
                    <button className={activeTab === 'log' ? 'active' : ''} onClick={() => changeTab('log', 'LOG')}>Logs</button>
                    <button className={activeTab === 'animal' ? 'active' : ''} onClick={() => changeTab('animal', 'ANIMAL_CONTROL')}>Animal</button>
                    <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => changeTab('reports', 'REPORTS')}>Reports</button>
                    <button className={activeTab === 'citation' ? 'active' : ''} onClick={() => changeTab('citation', 'CITATION')}>Quick Citation</button>
                    <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => changeTab('admin', 'ADMIN')}>Admin</button>
                    <button className={activeTab === 'templates' ? 'active' : ''} onClick={() => changeTab('templates', 'TEMPLATES')}>Templates</button>
                </nav>
                <main className="main-content">
                    {renderContent()}
                </main>
            </div>
        </ErrorBoundary>
    );
};

export default App;