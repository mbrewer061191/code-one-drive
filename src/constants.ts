
import { Case } from './types';

export const initialAddressState = { street: '', city: 'Commerce', province: 'OK', postalCode: '74339' };
export const initialOwnerState = { name: '', mailingAddress: '', phone: '' };
export const initialViolationState: Case['violation'] = { type: 'Select a Violation...', ordinance: '', description: '', correctiveAction: '', noticeClause: '' };
export const COMPLIANCE_DAYS = 10;
export const GOOGLE_CONSOLE_URL = 'https://console.cloud.google.com/apis/credentials';
export const GOOGLE_API_LIBRARY_URL = 'https://console.cloud.google.com/apis/library';
export const GOOGLE_CONSENT_URL = 'https://console.cloud.google.com/apis/credentials/consent';
export const EVIDENCE_PHOTO_FOLDER_NAME = 'Code Enforcement Records';

export const VIOLATIONS_LIST: Case['violation'][] = [
  { type: 'Select a Violation...', ordinance: '', description: '', correctiveAction: '', noticeClause: '' },
  { type: "Tall Grass / Weeds", ordinance: "Sec. 26-92", description: "Vegetation (grass, weeds) exceeding 12 inches in height on the property.", correctiveAction: "Mow the entire property and remove all cuttings. Ensure grass and weeds are maintained below 12 inches.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-92, property owners are required to cut and remove all weeds, grass, or other rank, uncultivated vegetation which has attained a height of more than twelve (12) inches." },
  { type: "Trash & Debris Accumulation", ordinance: "Sec. 26-92", description: "Accumulation of refuse, litter, ashes, leaves, debris, paper, or other discarded materials on the property.", correctiveAction: "Remove all trash, debris, and refuse from the property and dispose of it in a lawful manner.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-92, it is declared a nuisance and unlawful to permit the accumulation of refuse, litter, or any other discarded materials on any property." },
  { type: "Inoperable / Abandoned Vehicle", ordinance: "Sec. 26-145", description: "An inoperable motor vehicle, not duly tagged for at least 90 days, or left in a public area for more than 48 hours.", correctiveAction: "Remove the vehicle from the property or bring it into operable condition with current registration.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-145, any inoperable, dismantled, or abandoned motor vehicle on any property is declared a public nuisance and must be removed." },
  { type: "Dilapidated Structure", ordinance: "Sec. 26-119", description: "A building or structure in a state of decay or partial ruin, creating a hazard to public health, safety, or welfare.", correctiveAction: "Repair the structure to meet city code standards or demolish and remove the structure and all debris.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-119, any building or structure which is dilapidated, unsafe, or hazardous is declared a public nuisance and must be repaired or demolished." },
  { type: "Unsecured / Open Structure", ordinance: "Sec. 26-119", description: "A vacant structure that is unsecured, open to entry, or has broken windows/doors, creating a safety hazard.", correctiveAction: "Secure all openings, including doors and windows, with boarding or repairs to prevent unauthorized entry.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-119, the owner is required to board and secure the structure to prevent unauthorized access and potential hazards." },
  { type: "Obstruction of Public Way", ordinance: "Sec. 34-19", description: "An obstruction (e.g., vehicle, object, material, structure, fence) left on a street, alley, sidewalk, or other public way, blocking free passage.", correctiveAction: "Remove the obstruction from the public way immediately to allow for free and convenient passage.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 34-19, it is unlawful to obstruct in any manner any street, alley, sidewalk or other public way by leaving or permitting to remain thereon any vehicle, object, material, structure, fence or other obstruction of any kind." },
  { type: "Obstructed Sight Triangle", ordinance: "Sec. 34-24", description: "A sign, fence, structure, or overgrown vegetation is located within the sight triangle of a street intersection, obstructing the view of traffic.", correctiveAction: "Remove the obstruction from the sight triangle area to ensure clear visibility for drivers and pedestrians.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 34-24, no fence, wall, hedge, or other structure or planting shall be maintained in such a location as to obstruct vision at street intersections." },
  { type: "Obstructed View / Traffic Hazard", ordinance: "Sec. 34-26(a)", description: "Trees, shrubs, plants, or other obstructions on a property that block the view of drivers at intersections, creating a traffic hazard.", correctiveAction: "Remove or trim the trees, shrubs, or other obstruction to restore clear visibility for drivers at intersections.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 34-26(a), property owners are required to remove any trees, shrubs, plants, or other obstructions that create a traffic hazard by obstructing the view of drivers at intersections." },
  { type: "Improper Tree/Shrub Trimming Over Public Way", ordinance: "Sec. 34-26(b)", description: "Trees or shrubbery overhanging a public street or sidewalk that do not meet clearance requirements (less than 15 feet above a roadway or 8 feet above a sidewalk), obstructing passage.", correctiveAction: "Trim all trees and shrubbery overhanging the public right-of-way to provide a minimum clearance of 15 feet above any street or alley and 8 feet above any sidewalk.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 34-26(b), you are required to trim trees and shrubbery to ensure that the lowest branches are no lower than fifteen (15) feet above the roadway of a street or alley, and eight (8) feet above the sidewalk, to allow for free and convenient passage." },
  { type: "Open Burning", ordinance: "Sec. 14-31", description: "Unauthorized burning of trash, leaves, or other materials.", correctiveAction: "Immediately extinguish the fire. Dispose of materials properly. Only clean, dry wood can be burned in an approved container.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 14-31, open burning of refuse or other combustible material is prohibited without a permit." },
  { type: "Public Nuisance", ordinance: "Sec. 26-92", description: "Any act or condition which annoys, injures or endangers the comfort, repose, health or safety of the public (e.g., excessive noise, offensive odors).", correctiveAction: "Cease the activity or correct the condition causing the nuisance.", noticeClause: "Pursuant to City of Commerce Ordinance Sec. 26-92, it is unlawful for any person to cause, permit, maintain or allow the creation or maintenance of a nuisance." },
  { type: 'Other (Manual Entry)', ordinance: '', description: '', correctiveAction: '', noticeClause: '' },
];

export const COMMON_NOTES = [
    "Spoke with owner", "Phone call with owner", "Left voicemail", "Left door hanger", "No change observed", 
    "Violation corrected", "Property vacant", "Unable to contact resident",
    "Posted notice on door", "Took photos of violation"
];

export const FOLLOW_UP_NOTES = [
    "Compliance met - closing case", "Extension granted", "Owner contacted", 
    "Phone call with owner", "Left voicemail",
    "Will re-inspect in 7 days", "Forwarding for abatement", "Citation issued"
];

export const DOG_DESCRIPTORS = [
    "Pit Bull", "Labrador", "German Shepherd", "Chihuahua", "Boxer", "Husky", "Heeler",
    "Mixed Breed", "Black", "White", "Brown", "Tan", "Spotted", "Brindle"
];

export const DOG_BEHAVIORS = [
    "Running at large", "Barking excessively", "Aggressive", 
    "Chasing cars", "No collar/tags", "Bit a person", "Bit another animal"
];
