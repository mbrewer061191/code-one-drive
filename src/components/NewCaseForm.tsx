
import React, { useState, useEffect, useRef } from 'react';
import { Case, PhotoWithMeta, EvidencePhoto, Property } from '../types';
import { initialAddressState, initialOwnerState, initialViolationState, VIOLATIONS_LIST, COMPLIANCE_DAYS } from '../constants';
import { analyzePhotoWithAI } from '../aiService';
import { dataService } from '../dataService';
import CameraView from './CameraView';

interface NewCaseFormProps {
    onSave: (draftCase: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] })) => void;
    onCancel: () => void;
    properties: Property[];
    draftCase: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null;
    onUpdateDraft: (draft: (Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) | null) => void;
}

const NewCaseForm: React.FC<NewCaseFormProps> = ({ onSave, onCancel, properties, draftCase, onUpdateDraft }) => {
    // UI-specific state
    const [showCamera, setShowCamera] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiError, setAiError] = useState('');
    const [isSaving, setIsSaving] = useState(false); 
    const [lookupMessage, setLookupMessage] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const formTopRef = useRef<HTMLDivElement>(null);
    
    const caseId = draftCase?.caseId || '';
    const address = draftCase?.address || initialAddressState;
    const owner = draftCase?.ownerInfo || initialOwnerState;
    const ownerUnknown = draftCase?.ownerInfoStatus === 'UNKNOWN';
    const violation = draftCase?.violation || initialViolationState;
    const isVacant = draftCase?.isVacant || false;
    const photos = draftCase?._tempPhotos || [];
    const violationManual = (violation.type === 'Other (Manual Entry)' && draftCase?.violation) || initialViolationState;
    
    const updateDraft = (updates: Partial<Case> & { _tempPhotos?: PhotoWithMeta[] }) => {
        if (draftCase) {
            onUpdateDraft({ ...draftCase, ...updates });
        }
    };

    const handleDeletePhotoFromDraft = (index: number) => {
        const newPhotos = photos.filter((_, i) => i !== index);
        updateDraft({ _tempPhotos: newPhotos });
    };

    const handleAddressLookup = () => {
        const trimmedAddress = address.street.trim();
        if (!trimmedAddress) {
            setLookupMessage('Please enter an address to look up.');
            return;
        }
        const foundProperty = properties.find(p => p.streetAddress.toLowerCase() === trimmedAddress.toLowerCase());
        
        if (foundProperty) {
            const updates: Partial<Case> = {
                ownerInfo: { ...initialOwnerState, ...foundProperty.ownerInfo },
                isVacant: foundProperty.isVacant,
                ownerInfoStatus: 'KNOWN'
            };
            updateDraft(updates);
            setLookupMessage('Success: Info pre-filled from directory.');
        } else {
            setLookupMessage('Info: No existing property found for this address.');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newPhotosPromises = Array.from(files).map((file: File) => {
            return new Promise<PhotoWithMeta>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve({
                        file,
                        dataUrl: reader.result as string
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(newPhotosPromises).then(newPhotos => {
            updateDraft({ _tempPhotos: [...photos, ...newPhotos] });
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draftCase) return;
        
        const errors: string[] = [];
        
        // Auto-trim strings to avoid hidden space errors
        const cleanCaseId = (draftCase.caseId || '').trim();
        const cleanAddress = (address.street || '').trim();
        const finalViolation = violation.type === 'Other (Manual Entry)' ? violationManual : violation;

        // RELAXED VALIDATION: Allow saving without owner info initially.
        // It's common to open a case on-site before knowing who owns it.
        if (!cleanCaseId) errors.push("Case Number is required.");
        if (!cleanAddress) errors.push("Property Street Address is required.");
        if (finalViolation.type === 'Select a Violation...') errors.push("Violation Type must be selected.");

        if (errors.length > 0) {
            setValidationErrors(errors);
            // Scroll to top to show error list clearly
            formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        setValidationErrors([]);
        setIsSaving(true);
        
        // Final trim update before passing up
        onSave({
            ...draftCase,
            caseId: cleanCaseId,
            address: { ...address, street: cleanAddress }
        });
    };

    const handleViolationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = VIOLATIONS_LIST.find(v => v.type === e.target.value) || initialViolationState;
        updateDraft({ violation: selected });
    };

    const handleAnalyzePhoto = async () => {
        const photoToAnalyze = photos[0]?.file;
        if (!photoToAnalyze) {
            setAiError('Please take or upload at least one photo before using AI analysis.');
            return;
        }
        setIsAnalyzing(true);
        setAiError('');
        try {
            const result = await analyzePhotoWithAI(photoToAnalyze);
            const updates: Partial<Case> = {};
            if (result.address?.street) updates.address = { ...address, street: result.address.street };
            if (result.violation) updates.violation = result.violation;
            updateDraft(updates);
        } catch (e: any) {
            setAiError(`AI Analysis Failed: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    return (
        <div ref={formTopRef}>
        {isSaving && (
            <div className="loading-overlay">
                <div className="loader" />
                <h3 style={{color: 'var(--primary-dark)'}}>Processing & Saving...</h3>
                <p>Uploading photos and creating records. Please wait.</p>
            </div>
        )}

        {showCamera && <CameraView 
            mode="single-case"
            onDone={(p) => { 
                updateDraft({ _tempPhotos: [...photos, ...p] });
                setShowCamera(false); 
            }} 
            onCancel={() => setShowCamera(false)} 
        />}
        
        <form onSubmit={handleSubmit} className="tab-content" noValidate>
            {validationErrors.length > 0 && (
                <div className="error-message" style={{ borderLeft: '8px solid var(--danger-color)', boxShadow: 'var(--shadow-md)' }}>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--danger-color)' }}>Missing Required Information</h3>
                    <ul style={{ paddingLeft: '1.25rem' }}>
                        {validationErrors.map((err, i) => <li key={i} style={{fontWeight: 'bold'}}>{err}</li>)}
                    </ul>
                </div>
            )}

            <div className="card">
                <h2>Property & Photos</h2>
                 <div className="form-group">
                    <label>Case Number (Auto-Generated)</label>
                    <input 
                        type="text" 
                        value={caseId} 
                        onChange={e => updateDraft({ caseId: e.target.value })} 
                        className={validationErrors.some(e => e.includes('Case Number')) ? 'invalid' : ''}
                        placeholder="MM-NNN-YY"
                    />
                    <p className="helper-text">Format: Month - Seq - Year (e.g. 03-001-24)</p>
                </div>
                 <div className="form-group">
                    <label>Street Address</label>
                    <div className="input-with-button">
                        <input 
                            type="text" 
                            value={address.street} 
                            onChange={e => { updateDraft({ address: {...address, street: e.target.value}}); setLookupMessage(''); }} 
                            className={validationErrors.some(e => e.includes('Street Address')) ? 'invalid' : ''}
                            placeholder="123 Main St"
                        />
                        <button type="button" className="button" onClick={handleAddressLookup}>Look up</button>
                    </div>
                    {lookupMessage && <p className={`helper-text ${lookupMessage.startsWith('Success') ? 'success-message' : 'info-box'}`} style={{padding: '0.5rem', marginTop: '0.5rem'}}>{lookupMessage}</p>}
                </div>
                <div className="form-group"><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}><input type="checkbox" checked={isVacant} onChange={e => updateDraft({ isVacant: e.target.checked })} style={{width: '1.2rem', height: '1.2rem'}} /> Mark as vacant</label></div>
                
                <h4>Evidence Photos ({photos.length})</h4>
                <div className="photo-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', margin: '1rem 0' }}>
                    {photos.map((p, i) => (
                        <div key={i} className="photo-thumbnail-container">
                            <button 
                                type="button" 
                                className="delete-photo-btn" 
                                onClick={() => handleDeletePhotoFromDraft(i)}
                                aria-label="Remove photo"
                            >
                                &times;
                            </button>
                            <div className="photo-thumbnail" style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <img src={p.dataUrl} alt={`Evidence photo ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="button-group" style={{marginTop: '1rem'}}>
                    <button type="button" className="button" onClick={() => setShowCamera(true)}>Open Camera</button>
                    <button type="button" className="button secondary-action" onClick={() => fileInputRef.current?.click()}>Upload File</button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleFileUpload} />
                    <button type="button" className="button secondary-action" onClick={handleAnalyzePhoto} disabled={isAnalyzing || photos.length === 0}>{isAnalyzing ? <span className="loader"/> : 'Analyze with AI'}</button>
                </div>
                {aiError && <p className="error-message" style={{marginTop: '1rem'}}>{aiError}</p>}
            </div>

            <div className="card">
                <h2>Owner Information (Optional)</h2>
                <div className="form-group"><label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}><input type="checkbox" checked={ownerUnknown} onChange={e => updateDraft({ ownerInfoStatus: e.target.checked ? 'UNKNOWN' : 'KNOWN' })} style={{width: '1.2rem', height: '1.2rem'}} /> Owner information is unknown</label></div>
                <div className="form-group">
                    <label>Owner Name</label>
                    <input 
                        type="text" 
                        value={owner.name} 
                        onChange={e => updateDraft({ ownerInfo: {...owner, name: e.target.value}})} 
                        disabled={ownerUnknown} 
                    />
                </div>
                <div className="form-group">
                    <label>Mailing Address</label>
                    <textarea 
                        value={owner.mailingAddress} 
                        onChange={e => updateDraft({ ownerInfo: {...owner, mailingAddress: e.target.value}})} 
                        disabled={ownerUnknown} 
                        style={{minHeight: '80px'}}
                    ></textarea>
                </div>
            </div>

            <div className="card">
                <h2>Violation Details</h2>
                <div className="form-group">
                    <label>Violation Type</label>
                    <select 
                        value={violation.type} 
                        onChange={handleViolationChange}
                        className={validationErrors.some(e => e.includes('Violation Type')) ? 'invalid' : ''}
                    >
                        <option value="Select a Violation...">Select a Violation...</option>
                        {VIOLATIONS_LIST.filter(v => v.type !== 'Select a Violation...').map(v => <option key={v.type} value={v.type}>{v.type}</option>)}
                    </select>
                </div>
                {violation.type !== 'Select a Violation...' && (
                    <div className="info-box">
                        <p><strong>Ordinance:</strong> {violation.ordinance || 'N/A'}</p>
                        <p><strong>Description:</strong> {violation.description || 'N/A'}</p>
                    </div>
                )}
            </div>

            <div className="button-group" style={{ justifyContent: 'flex-end', paddingBottom: '2rem'}}>
                <button type="button" className="button secondary-action" onClick={onCancel}>Cancel</button>
                <button type="submit" className="button primary-action" style={{ padding: '0 2rem' }}>Save Case</button>
            </div>
        </form>
        </div>
    );
};

export default NewCaseForm;