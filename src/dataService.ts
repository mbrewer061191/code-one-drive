
import { getActiveProvider } from './config';
import { microsoftDataService } from './microsoftGraphService';

export const getAllData = () => microsoftDataService.getAllData();
export const saveCase = (caseData: any) => microsoftDataService.saveCase(caseData);
export const deleteCase = (caseId: string) => microsoftDataService.deleteCase(caseId);
export const saveProperty = (propData: any) => microsoftDataService.saveProperty(propData);
export const deleteProperty = (propId: string) => microsoftDataService.deleteProperty(propId);
export const uploadCasePhotos = (photos: any[], caseData: any) => microsoftDataService.uploadCasePhotos(photos, caseData);
export const uploadFollowUpPhotos = (photos: any[], caseData: any) => microsoftDataService.uploadFollowUpPhotos(photos, caseData);
export const uploadAbatementPhotos = (photos: any[], caseId: string, type: 'before' | 'after') => microsoftDataService.uploadAbatementPhotos(photos, caseId, type);
export const generateNoticeDocument = (purpose: any, caseData: any) => microsoftDataService.generateNoticeDocument(purpose, caseData);
export const generateCertificateOfMail = (cases: any[]) => microsoftDataService.generateCertificateOfMail(cases);
export const generateEnvelopeDocument = (caseData: any, recipient: 'owner' | 'occupant') => microsoftDataService.generateEnvelopeDocument(caseData, recipient);
export const generateStatementOfCostDocument = (caseData: any) => microsoftDataService.generateStatementOfCostDocument(caseData);
export const generateNoticeOfLienDocument = (caseData: any) => microsoftDataService.generateNoticeOfLienDocument(caseData);
export const generateCertificateOfLienDocument = (caseData: any) => microsoftDataService.generateCertificateOfLienDocument(caseData);
export const saveComplaintLog = (entry: any) => microsoftDataService.saveComplaintLog(entry);
export const downloadFullArchive = (properties: any[], cases: any[], onProgress?: (msg: string) => void) => microsoftDataService.downloadFullArchive(properties, cases, onProgress);
export const downloadPropertyArchive = (property: any, cases: any[]) => microsoftDataService.downloadPropertyArchive(property, cases);
export const downloadCourtPacket = (caseData: any) => microsoftDataService.downloadCourtPacket(caseData);
export const testConnection = () => microsoftDataService.testConnection();

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
    generateStatementOfCostDocument,
    generateNoticeOfLienDocument,
    generateCertificateOfLienDocument,
    saveComplaintLog,
    downloadFullArchive,
    downloadPropertyArchive,
    downloadCourtPacket,
    testConnection,
};
