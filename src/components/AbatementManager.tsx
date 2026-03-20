
import React, { useState, useEffect } from 'react';
import { Case, PhotoWithMeta, AbatementDetails, EvidencePhoto } from '../types';
import { dataService, generateStatementOfCostDocument, generateNoticeOfLienDocument, generateCertificateOfLienDocument } from '../dataService';
import CameraView from './CameraView';

const AbatementManager: React.FC<{ caseData: Case; onUpdate: (updatedCase: Case) => void; }> = ({ caseData, onUpdate }) => {
    const [details, setDetails] = useState<AbatementDetails>(caseData.abatement || {});
    const [tempBeforePhotos, setTempBeforePhotos] = useState<PhotoWithMeta[]>([]);
    const [tempAfterPhotos, setTempAfterPhotos] = useState<PhotoWithMeta[]>([]);
    const [showCamera, setShowCamera] = useState<'before' | 'after' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [overrideTimer, setOverrideTimer] = useState(false);

    // Navigation Step logic
    const getActiveStep = () => {
        if (details.certificateOfLienDocUrl || details.status === 'LIEN_CERTIFIED') return 4;
        if (details.noticeOfLienDocUrl || details.status === 'LIEN_FILED') return 4; // Advance to timer view if filed
        if (details.statementOfCostDocUrl || details.status === 'STATEMENT_FILED') return 3;
        return 1;
    };

    const currentProcessStep = getActiveStep();
    const [viewStep, setViewStep] = useState(currentProcessStep);

    useEffect(() => {
        setViewStep(currentProcessStep);
    }, [currentProcessStep]);

    // Timer Calculation
    const getDaysRemaining = () => {
        if (!details.noticeOfLienDate) return 30;
        const start = new Date(details.noticeOfLienDate);
        const now = new Date();
        start.setHours(0,0,0,0);
        now.setHours(0,0,0,0);
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, 30 - diffDays);
    };

    const daysRemaining = getDaysRemaining();
    const isTimerDone = daysRemaining === 0;

    const updateDetails = (updates: Partial<AbatementDetails>) => {
        const newDetails = { ...details, ...updates };
        setDetails(newDetails);
    };

    const saveStepPhotos = async (type: 'before' | 'after') => {
        const photosToUpload = type === 'before' ? tempBeforePhotos : tempAfterPhotos;
        if (photosToUpload.length === 0) return;
        setIsSaving(true);
        setError('');
        try {
            const uploaded = await dataService.uploadAbatementPhotos(photosToUpload, caseData.caseId, type);
            const existing = details.photos?.[type] || [];
            const newDetails = { ...details, photos: { ...details.photos, [type]: [...existing, ...uploaded] } };
            setDetails(newDetails);
            onUpdate({ ...caseData, abatement: newDetails });
            if (type === 'before') setTempBeforePhotos([]);
            else setTempAfterPhotos([]);
        } catch(e: any) {
            setError(`Upload failed: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async (docType: 'statement' | 'lien' | 'certificate') => {
        setIsSaving(true);
        setError('');
        setMessage('');
        try {
            let updatedCase = { ...caseData, abatement: { ...details } };
            const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            let result;

            if (docType === 'statement') {
                const { hours, employees } = details.costDetails || { hours: 0, employees: 0 };
                const total = (hours * employees * 25) + 50;
                updatedCase.abatement.costDetails = { type: 'mowing', hours, employees, rate: 25, adminFee: 50, total };
                updatedCase.abatement.statementOfCostDate = today;
                updatedCase.abatement.status = 'STATEMENT_FILED';
                result = await generateStatementOfCostDocument(updatedCase);
                updatedCase.abatement.statementOfCostDocUrl = result.docUrl;
                setViewStep(3); // Advance to Lien Filing
            } 
            else if (docType === 'lien') {
                updatedCase.abatement.status = 'LIEN_FILED';
                updatedCase.abatement.noticeOfLienDate = today;
                result = await generateNoticeOfLienDocument(updatedCase);
                updatedCase.abatement.noticeOfLienDocUrl = result.docUrl;
                setViewStep(4); // Advance to Timer
            }
            else if (docType === 'certificate') {
                updatedCase.abatement.status = 'LIEN_CERTIFIED';
                result = await generateCertificateOfLienDocument(updatedCase);
                updatedCase.abatement.certificateOfLienDocUrl = result.docUrl;
                updatedCase.status = 'CONTINUAL_ABATEMENT';
            }

            setDetails(updatedCase.abatement);
            onUpdate(updatedCase);
            if (result) {
                window.open(result.docUrl, '_blank');
            }
            setMessage(`${docType.toUpperCase()} generated successfully.`);
        } catch (e: any) {
            setError(`Action failed: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="card" style={{ borderLeft: '6px solid var(--abatement-color)' }}>
            {showCamera && <CameraView mode="single-case" onCancel={() => setShowCamera(null)} onDone={(p) => {
                if (showCamera === 'before') setTempBeforePhotos(prev => [...prev, ...p]);
                else setTempAfterPhotos(prev => [...prev, ...p]);
                setShowCamera(null);
            }} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ color: 'var(--abatement-color)', margin: 0 }}>Abatement Process</h2>
                <button 
                    className="button secondary-action" 
                    style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={() => {
                        if (window.confirm("Mark this case as CLOSED? This will remove it from the active abatement list.")) {
                            onUpdate({ ...caseData, status: 'CLOSED' });
                        }
                    }}
                >
                    Close Case
                </button>
            </div>

            <div className="stepper">
                {[
                    { label: 'Document', step: 1 },
                    { label: 'Statement', step: 2 },
                    { label: 'Lien', step: 3 },
                    { label: 'Certify', step: 4 }
                ].map(s => (
                    <div key={s.step} className={`step ${viewStep === s.step ? 'active' : ''} ${currentProcessStep > s.step ? 'completed' : ''}`} onClick={() => setViewStep(s.step)}>
                        <div className="step-circle">{currentProcessStep > s.step ? '✓' : s.step}</div>
                        <div className="step-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
            {message && <div className="success-message" style={{marginBottom: '1rem'}}>{message}</div>}

            {viewStep === 1 && (
                <div className="tab-content">
                    <h3>Step 1: Document Work</h3>
                    <div className="form-group">
                        <label>Work Date</label>
                        <input type="date" value={details.workDate || ''} onChange={e => updateDetails({ workDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Hours Worked</label>
                        <input type="number" step="0.25" value={details.costDetails?.hours || ''} onChange={e => updateDetails({ costDetails: { ...details.costDetails, type: 'mowing', hours: +e.target.value, employees: details.costDetails?.employees || 1, rate: 25, adminFee: 50, total: 0 }})} />
                    </div>
                    
                    <h4>Photos</h4>
                    <div className="button-group">
                        <button className="button secondary-action" onClick={() => setShowCamera('before')}>Take "Before" Photos</button>
                        <button className="button secondary-action" onClick={() => setShowCamera('after')}>Take "After" Photos</button>
                    </div>
                    {(tempBeforePhotos.length > 0 || tempAfterPhotos.length > 0) && (
                        <button className="button primary-action" onClick={() => { saveStepPhotos('before'); saveStepPhotos('after'); }} style={{marginTop: '1rem'}}>Upload New Photos</button>
                    )}
                    
                    <button className="button full-width" onClick={() => setViewStep(2)} disabled={!details.workDate} style={{marginTop: '2rem'}}>Continue to Statement &rarr;</button>
                </div>
            )}

            {viewStep === 2 && (
                <div className="tab-content">
                    <h3>Step 2: Statement of Cost</h3>
                    <div className="info-box" style={{ marginBottom: '1.5rem' }}>
                        <p><strong>Work Date:</strong> {details.workDate}</p>
                        <p><strong>Labor:</strong> {details.costDetails?.hours} hrs x {details.costDetails?.employees} emp @ $25/hr</p>
                        <p><strong>Admin Fee:</strong> $50.00</p>
                        <p style={{fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem'}}>TOTAL: ${(((details.costDetails?.hours || 0) * (details.costDetails?.employees || 0) * 25) + 50).toFixed(2)}</p>
                    </div>
                    <button className="button primary-action full-width" onClick={() => handleGenerate('statement')} disabled={isSaving}>
                        {/* FIX: Changed undefined 'isGenerating' to 'isSaving' state variable. */}
                        {isSaving ? <span className="loader"/> : 'Generate & Save Statement of Cost'}
                    </button>
                    {details.statementOfCostDocUrl && (
                        <button className="button secondary-action full-width" onClick={() => setViewStep(3)} style={{marginTop: '1rem'}}>Filing Information &rarr;</button>
                    )}
                </div>
            )}

            {viewStep === 3 && (
                <div className="tab-content">
                    <h3>Step 3: File Notice of Lien</h3>
                    <p className="helper-text">Enter legal details required for the Notice of Lien document.</p>
                    <div className="form-group">
                        <label>Legal Description</label>
                        <textarea value={details.propertyInfo?.legalDescription || ''} onChange={e => updateDetails({ propertyInfo: {...details.propertyInfo, legalDescription: e.target.value}})} placeholder="Lot X, Block Y..."></textarea>
                    </div>
                    <button className="button primary-action full-width" onClick={() => handleGenerate('lien')} disabled={isSaving || !details.propertyInfo?.legalDescription}>
                        {isSaving ? <span className="loader"/> : 'Generate Notice of Lien'}
                    </button>
                </div>
            )}

            {viewStep === 4 && (
                <div className="tab-content">
                    <h3>Step 4: Certificate of Lien</h3>
                    
                    {details.status === 'LIEN_CERTIFIED' && (
                        <div className="info-box" style={{ marginBottom: '1.5rem', borderLeftColor: 'var(--success-color)' }}>
                            <p><strong>Lien Certified:</strong> The property is currently under continual abatement.</p>
                            <button 
                                className="button secondary-action full-width" 
                                style={{ marginTop: '1rem' }}
                                onClick={() => {
                                    if (window.confirm("Release this lien? This should only be done if the debt has been paid to the City.")) {
                                        const updatedCase = { 
                                            ...caseData, 
                                            status: 'CLOSED' as const,
                                            abatement: { ...details, status: 'LIEN_RELEASED' as const }
                                        };
                                        onUpdate(updatedCase);
                                    }
                                }}
                            >
                                Release Lien & Close Case
                            </button>
                        </div>
                    )}

                    {!details.certificateOfLienDocUrl ? (
                        <>
                            <div className="timer-card">
                                <div className="timer-count">{daysRemaining}</div>
                                <div className="timer-label">{isTimerDone ? 'Ready to Certify' : 'Days Remaining in Waiting Period'}</div>
                                {details.noticeOfLienDate && <div style={{marginTop: '1rem', fontSize: '0.8rem', opacity: 0.7}}>Filing Date: {details.noticeOfLienDate}</div>}
                            </div>
                            
                            {!isTimerDone && !overrideTimer && (
                                <div className="warning-box" style={{textAlign: 'center', marginBottom: '1rem', border: '1px solid var(--warning-color)', padding: '1rem', borderRadius: 'var(--radius-md)'}}>
                                    <p>State law requires a 30-day waiting period from the date the Notice of Lien was filed before certifying.</p>
                                    <button className="button secondary-action" style={{marginTop: '1rem', padding: '0.25rem 0.5rem', minHeight: 'auto', fontSize: '0.8rem'}} onClick={() => setOverrideTimer(true)}>Admin Override</button>
                                </div>
                            )}

                            <button className="button primary-action full-width" onClick={() => handleGenerate('certificate')} disabled={isSaving || (!isTimerDone && !overrideTimer)}>
                                {isSaving ? <span className="loader"/> : 'Generate Certificate of Lien'}
                            </button>
                        </>
                    ) : (
                        <div className="success-message">
                            <h4>Process Complete</h4>
                            <p>Certificate of Lien was generated. Property is now marked for Continual Abatement.</p>
                            <a href={details.certificateOfLienDocUrl} target="_blank" rel="noreferrer" className="button full-width" style={{marginTop: '1rem'}}>View Certified Lien</a>
                        </div>
                    )}
                </div>
            )}
            <div className="button-group" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                    className="button secondary-action full-width" 
                    onClick={() => {
                        if (window.confirm("Mark this case as CLOSED? This will remove it from the active abatement list.")) {
                            onUpdate({ ...caseData, status: 'CLOSED' });
                        }
                    }}
                >
                    Close Case (Complied / Paid)
                </button>
            </div>
        </div>
    );
};

export default AbatementManager;
