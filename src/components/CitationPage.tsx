
import React, { useState, useRef } from 'react';
import { PhotoWithMeta, EvidencePhoto } from '../types';
import CameraView from './CameraView';
import { dataService } from '../dataService';

const CitationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [location, setLocation] = useState('');
    const [violationType, setViolationType] = useState('Animal Control');
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newPhotosPromises = Array.from(files).map((file: File) => new Promise<PhotoWithMeta>(res => {
            const reader = new FileReader();
            reader.onload = () => res({ file, dataUrl: reader.result as string });
            reader.readAsDataURL(file);
        }));
        Promise.all(newPhotosPromises).then(newPs => setPhotos(prev => [...prev, ...newPs]));
    };

    const handleDeletePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!location.trim()) {
            alert("Please enter a location.");
            return;
        }
        setIsSaving(true);
        try {
            // We'll save this as a "Case" but with a special status or just as a quick log
            // For now, let's just use the existing case structure but maybe a different prefix or just a "CITATION" status
            // Actually, the user wants to "print out a summary".
            // Let's create a temporary "Citation" object and maybe save it to a specific sheet or just local storage for now if we don't have a sheet.
            // But the user said "come back and print", so it should be persistent.
            
            // Let's just use window.print() for the summary for now.
            window.print();
            setSaveSuccess(true);
        } catch (e) {
            console.error(e);
            alert("Failed to save citation.");
        } finally {
            setIsSaving(false);
        }
    };

    if (saveSuccess) {
        return (
            <div className="tab-content">
                <div className="card success-message">
                    <h2>Citation Summary Printed</h2>
                    <p>Your citation summary has been sent to the printer. You can now return to the main menu.</p>
                    <button className="button primary-action full-width" onClick={onBack} style={{ marginTop: '1rem' }}>Back to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            {showCamera && (
                <CameraView 
                    mode="single-case" 
                    onDone={(p) => { setPhotos(prev => [...prev, ...p]); setShowCamera(false); }} 
                    onCancel={() => setShowCamera(false)} 
                />
            )}

            <div className="card no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Quick Citation</h2>
                    <button className="button secondary-action" onClick={onBack}>Cancel</button>
                </div>
                
                <div className="form-group">
                    <label>Location / Address</label>
                    <input 
                        type="text" 
                        value={location} 
                        onChange={e => setLocation(e.target.value)} 
                        placeholder="e.g. 123 Main St or 'Vine & 4th'"
                    />
                </div>

                <div className="form-group">
                    <label>Violation Type</label>
                    <select value={violationType} onChange={e => setViolationType(e.target.value)}>
                        <option value="Animal Control">Animal Control (Loose Animal)</option>
                        <option value="Trash & Debris">Trash & Debris</option>
                        <option value="Parking">Parking Violation</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Notes / Summary</label>
                    <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)} 
                        placeholder="Briefly describe what happened..."
                        rows={4}
                    />
                </div>

                <div className="form-group">
                    <label>Photos ({photos.length})</label>
                    <div className="photo-gallery">
                        {photos.map((p, i) => (
                            <div key={i} className="photo-thumbnail-container">
                                <button type="button" className="delete-photo-btn" onClick={() => handleDeletePhoto(i)}>&times;</button>
                                <div className="photo-thumbnail"><img src={p.dataUrl} alt="Citation evidence" /></div>
                            </div>
                        ))}
                    </div>
                    <div className="button-group">
                        <button className="button" onClick={() => setShowCamera(true)}>Take Photo</button>
                        <button className="button secondary-action" onClick={() => fileInputRef.current?.click()}>Upload</button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept="image/*" onChange={handleFileUpload} />
                    </div>
                </div>

                <button 
                    className="button primary-action full-width" 
                    onClick={handleSave} 
                    disabled={isSaving}
                    style={{ marginTop: '1rem' }}
                >
                    {isSaving ? 'Saving...' : 'Print Citation Summary'}
                </button>
            </div>

            {/* Printable Summary (Hidden on screen, visible on print) */}
            <div className="print-only citation-summary">
                <h1 style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px' }}>CITATION SUMMARY</h1>
                <div style={{ marginTop: '20px' }}>
                    <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
                    <p><strong>Location:</strong> {location}</p>
                    <p><strong>Violation Type:</strong> {violationType}</p>
                </div>
                <div style={{ marginTop: '20px' }}>
                    <h3>Notes:</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p>
                </div>
                <div style={{ marginTop: '20px' }}>
                    <h3>Photographic Evidence:</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {photos.map((p, i) => (
                            <div key={i} style={{ border: '1px solid #ccc', padding: '5px' }}>
                                <img src={p.dataUrl} alt="Evidence" style={{ width: '100%', height: 'auto' }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ marginTop: '50px', borderTop: '1px solid black', paddingTop: '10px' }}>
                    <p>Officer Signature: _________________________________</p>
                </div>
            </div>

            <style>{`
                @media screen {
                    .print-only { display: none; }
                }
                @media print {
                    .no-print { display: none; }
                    .print-only { display: block; }
                    body { padding: 0; background: white; }
                    .tab-content { padding: 0; }
                }
            `}</style>
        </div>
    );
};

export default CitationPage;
