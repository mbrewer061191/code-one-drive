import React, { useState } from 'react';
import { generateId } from '../utils';
import { PhotoWithMeta } from '../types';
import CameraView from './CameraView';

interface AlleyPatrolProps {
    pendingCases: {id: string, photos: PhotoWithMeta[]}[];
    onSetPendingCases: React.Dispatch<React.SetStateAction<{id: string, photos: PhotoWithMeta[]}[]>>;
    onCreateCase: (patrolCase: {id: string, photos: PhotoWithMeta[]}) => void;
}

const AlleyPatrol: React.FC<AlleyPatrolProps> = ({ pendingCases, onSetPendingCases, onCreateCase }) => {
    const [isCapturing, setIsCapturing] = useState(pendingCases.length === 0);

    const handleSaveSet = (photos: PhotoWithMeta[]) => {
        if (photos.length > 0) {
            onSetPendingCases(prev => [...prev, { id: generateId(), photos }]);
        }
    };
    
    const handleFinishPatrol = (finalPhotos: PhotoWithMeta[]) => {
        handleSaveSet(finalPhotos);
        setIsCapturing(false);
    };

    if (isCapturing) {
        return <CameraView mode="patrol" onSaveSet={handleSaveSet} onFinishPatrol={handleFinishPatrol} />;
    }

    return (
        <div className="tab-content">
            <div className="card">
                <h2>Patrol Captures ({pendingCases.length})</h2>
                <p className="helper-text">Photos captured during your patrol. Select a set to create a new case file for it.</p>
                {pendingCases.length === 0 && <p style={{marginTop: '1rem'}}>No pending captures. You can start a new patrol.</p>}
                <div className="report-case-list" style={{marginTop: '1rem', gap: '0.75rem'}}>
                    {pendingCases.map(pCase => (
                        <div key={pCase.id} className="case-item" style={{display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'default'}}>
                            <div className="photo-thumbnail" style={{width: '60px', height: '60px', paddingTop: 0, flexShrink: 0}}>
                                <img src={pCase.photos[0].dataUrl} alt="Capture preview" />
                            </div>
                            <div className="case-info" style={{flexGrow: 1}}>
                                <strong>{pCase.photos.length} photos captured</strong>
                                <span>Ready to create case file</span>
                            </div>
                            <button className="button" onClick={() => onCreateCase(pCase)}>Create Case</button>
                        </div>
                    ))}
                </div>
                <button className="button primary-action full-width" style={{marginTop: '1.5rem'}} onClick={() => setIsCapturing(true)}>Start New Patrol</button>
            </div>
        </div>
    );
};

export default AlleyPatrol;