

import React, { useState, useMemo } from 'react';
import { Property, Case } from '../types';
import { compareStreets, generateId } from '../utils';
import { dataService } from '../dataService';

const PropertyEditor: React.FC<{
    property: Property;
    onSave: (property: Property) => void;
    onCancel: () => void;
}> = ({ property, onSave, onCancel }) => {
    const [edited, setEdited] = useState(property);

    const handleChange = (field: keyof Property, value: any) => {
        setEdited(prev => ({ ...prev, [field]: value }));
    };

    const handleOwnerChange = (field: keyof Property['ownerInfo'], value: string) => {
        setEdited(prev => ({ ...prev, ownerInfo: { ...prev.ownerInfo, [field]: value } }));
    };
    
    const handleResidentChange = (field: keyof Property['residentInfo'], value: string) => {
        setEdited(prev => ({ ...prev, residentInfo: { ...prev.residentInfo, [field]: value } }));
    };

    return (
        <div className="card-editor">
            <div className="form-group">
                <label>Street Address</label>
                <input value={edited.streetAddress} onChange={e => handleChange('streetAddress', e.target.value)} />
            </div>
            <h4 style={{marginTop: '1.5rem'}}>Owner Information</h4>
            <div className="form-group">
                <label>Owner Name</label>
                <input value={edited.ownerInfo.name} onChange={e => handleOwnerChange('name', e.target.value)} />
            </div>
            <div className="form-group">
                <label>Owner Mailing Address</label>
                <textarea value={edited.ownerInfo.mailingAddress} onChange={e => handleOwnerChange('mailingAddress', e.target.value)} />
            </div>
            <div className="form-group">
                <label>Owner Phone</label>
                <input value={edited.ownerInfo.phone} onChange={e => handleOwnerChange('phone', e.target.value)} />
            </div>
             <h4 style={{marginTop: '1.5rem'}}>Resident Information</h4>
             <div className="form-group">
                <label>Resident Name</label>
                <input value={edited.residentInfo.name} onChange={e => handleResidentChange('name', e.target.value)} />
            </div>
            <div className="form-group">
                <label>Resident Phone</label>
                <input value={edited.residentInfo.phone} onChange={e => handleResidentChange('phone', e.target.value)} />
            </div>
            <div className="button-group" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="button secondary-action" onClick={onCancel}>Cancel</button>
                <button className="button primary-action" onClick={() => onSave(edited)}>Save Changes</button>
            </div>
        </div>
    );
};

const PropertyDirectory: React.FC<{
    cases: Case[];
    properties: Property[];
    onSelectCase: (caseId: string) => void;
    onSaveProperty: (property: Property) => void;
    onDeleteProperty: (propertyId: string) => void;
}> = ({ cases, properties, onSelectCase, onSaveProperty, onDeleteProperty }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isArchiving, setIsArchiving] = useState(false);
    const [archiveProgress, setArchiveProgress] = useState('');
    const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

    const filteredProperties = useMemo(() => {
        const sorted = [...properties].sort((a, b) => compareStreets(a.streetAddress, b.streetAddress));
        if (!searchTerm) return sorted;
        const lowerSearch = searchTerm.toLowerCase();
        return sorted.filter(p =>
            p.streetAddress.toLowerCase().includes(lowerSearch) ||
            p.ownerInfo.name?.toLowerCase().includes(lowerSearch)
        );
    }, [properties, searchTerm]);
    
    const handleDownloadFullArchive = async () => {
        if (!window.confirm("Download Full Archive? This will gather photos and documents for ALL properties and may take several minutes. Please do not close the tab.")) return;
        setIsArchiving(true);
        setArchiveProgress('Starting archive...');
        try {
            await dataService.downloadFullArchive(filteredProperties, cases, (msg) => setArchiveProgress(msg));
            setArchiveProgress('Download started.');
        } catch (e: any) {
            alert(`Archive failed: ${e.message}`);
            setArchiveProgress('');
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDownloadPropertyArchive = async (prop: Property, linkedCases: Case[]) => {
        if (!window.confirm(`Download all records for ${prop.streetAddress}?`)) return;
        setIsArchiving(true);
        setArchiveProgress(`Archiving ${prop.streetAddress}...`);
        try {
            await dataService.downloadPropertyArchive(prop, linkedCases);
            setArchiveProgress('');
        } catch (e: any) {
            alert(`Archive failed: ${e.message}`);
        } finally {
            setIsArchiving(false);
        }
    };
    
    const handleSave = (prop: Property) => {
        onSaveProperty(prop);
        setEditingPropertyId(null);
    };

    const handleAddNew = () => {
        const newProp: Property = {
            id: `prop-${generateId()}`,
            streetAddress: '',
            ownerInfo: { name: '', mailingAddress: '', phone: '' },
            residentInfo: { name: '', phone: '' },
            isVacant: false,
            dilapidationNotes: ''
        };
        onSaveProperty(newProp);
        setEditingPropertyId(newProp.id);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this property record?")) {
            onDeleteProperty(id);
        }
    };

    return (
        <div className="tab-content">
            <div className="card" style={{backgroundColor: '#f0f7ff', borderColor: 'var(--secondary-color)'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    <h3 style={{margin: 0}}>Data Management</h3>
                    <div className="button-group">
                        <button className="button primary-action" onClick={handleAddNew}>Add New Property</button>
                        <button className="button secondary-action" onClick={handleDownloadFullArchive} disabled={isArchiving}>
                            {isArchiving ? <span className="loader" /> : 'Download Archive (ZIP)'}
                        </button>
                    </div>
                    {archiveProgress && <div className="status-message ok" style={{marginTop: '0.5rem'}}>{archiveProgress}</div>}
                </div>
            </div>

            <div className="search-bar">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search by address or owner..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            
            {filteredProperties.length > 0 ? (
                filteredProperties.map(prop => {
                    const linkedCases = cases.filter(c => c.address.street.toLowerCase() === prop.streetAddress.toLowerCase());
                    if (editingPropertyId === prop.id) {
                        return <div key={prop.id} className="card editing"><PropertyEditor property={prop} onSave={handleSave} onCancel={() => setEditingPropertyId(null)} /></div>
                    }
                    return (
                        <div key={prop.id} className="card" style={{marginTop: '1.5rem'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                    <h3 style={{marginTop: 0, marginBottom: '0.25rem'}}>{prop.streetAddress}</h3>
                                    <span style={{color: 'var(--dark-gray)'}}>Owner: {prop.ownerInfo.name || 'N/A'}</span>
                                </div>
                                <div className="button-group">
                                    <button className="button" onClick={() => setEditingPropertyId(prop.id)}>Edit</button>
                                </div>
                            </div>
                            <div className="note" style={{marginTop: '1rem'}}>
                                <p><strong>Mailing Address:</strong> {prop.ownerInfo.mailingAddress || 'N/A'}</p>
                                <p><strong>Owner Phone:</strong> {prop.ownerInfo.phone || 'N/A'}</p>
                            </div>
                            
                            <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                                <button 
                                    className="button secondary-action" 
                                    style={{fontSize: '0.85rem', padding: '0.5rem 1rem'}}
                                    onClick={() => handleDownloadPropertyArchive(prop, linkedCases)}
                                    disabled={isArchiving}
                                >
                                    Download Records (ZIP)
                                </button>
                                 <button className="button danger-action" style={{fontSize: '0.85rem', padding: '0.5rem 1rem'}} onClick={() => handleDelete(prop.id)}>Delete Property</button>
                            </div>
                            
                            {linkedCases.length > 0 && (
                                <>
                                    <h4 style={{marginTop: '1.5rem'}}>Linked Cases ({linkedCases.length})</h4>
                                    {linkedCases.map(c => (
                                        <div key={c.id} className="report-case-item" onClick={() => onSelectCase(c.id)} style={{cursor: 'pointer'}}>
                                            <div className="info"><strong>{c.caseId}:</strong> {c.violation.type}</div>
                                            <div className="details">
                                                <span><strong>Created:</strong> {c.dateCreated}</span>
                                                <span><strong>Status:</strong> {c.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="card empty-state" style={{marginTop: '1.5rem'}}>
                    <p>{searchTerm ? 'No properties match your search.' : 'No properties found.'}</p>
                </div>
            )}
        </div>
    );
};

export default PropertyDirectory;