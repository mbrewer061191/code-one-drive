
import { getActiveProvider } from './config';
import { dataService as googleDataService } from './googleSheetsService';
import { microsoftDataService } from './microsoftGraphService';

export const getAllData = () => getActiveProvider() === 'microsoft' ? microsoftDataService.getAllData() : googleDataService.getAllData();
export const saveCase = (caseData: any) => getActiveProvider() === 'microsoft' ? microsoftDataService.saveCase(caseData) : googleDataService.saveCase(caseData);
export const deleteCase = (caseId: string) => getActiveProvider() === 'microsoft' ? microsoftDataService.deleteCase(caseId) : googleDataService.deleteCase(caseId);
export const saveProperty = (propData: any) => getActiveProvider() === 'microsoft' ? microsoftDataService.saveProperty(propData) : googleDataService.saveProperty(propData);
export const deleteProperty = (propId: string) => getActiveProvider() === 'microsoft' ? microsoftDataService.deleteProperty(propId) : googleDataService.deleteProperty(propId);
export const uploadCasePhotos = (photos: any[], caseData: any) => getActiveProvider() === 'microsoft' ? microsoftDataService.uploadCasePhotos(photos, caseData) : googleDataService.uploadCasePhotos(photos, caseData);
export const uploadFollowUpPhotos = (photos: any[], caseData: any) => getActiveProvider() === 'microsoft' ? microsoftDataService.uploadFollowUpPhotos(photos, caseData) : googleDataService.uploadFollowUpPhotos(photos, caseData);
export const uploadAbatementPhotos = (photos: any[], caseId: string, type: 'before' | 'after') => getActiveProvider() === 'microsoft' ? microsoftDataService.uploadAbatementPhotos(photos, caseId, type) : googleDataService.uploadAbatementPhotos(photos, caseId, type);
export const generateNoticeDocument = (purpose: any, caseData: any) => getActiveProvider() === 'microsoft' ? microsoftDataService.generateNoticeDocument(purpose, caseData) : (googleDataService as any).generateNoticeDocument(purpose, caseData);
export const generateCertificateOfMail = (cases: any[]) => getActiveProvider() === 'microsoft' ? microsoftDataService.generateCertificateOfMail(cases) : (googleDataService as any).generateCertificateOfMail(cases);
export const generateEnvelopeDocument = (caseData: any, recipient: 'owner' | 'occupant') => getActiveProvider() === 'microsoft' ? microsoftDataService.generateEnvelopeDocument(caseData, recipient) : (googleDataService as any).generateEnvelopeDocument(caseData, recipient);
export const testConnection = () => getActiveProvider() === 'microsoft' ? microsoftDataService.testConnection() : googleDataService.testConnection();

export const dataService = {
    getAllData,
    saveCase,
    deleteCase,
    saveProperty,
    deleteProperty,
    uploadCasePhotos,
    uploadFollowUpPhotos,
    uploadAbatementPhotos,
    generateNoticeDocument,
    generateCertificateOfMail,
    generateEnvelopeDocument,
    testConnection,
};
