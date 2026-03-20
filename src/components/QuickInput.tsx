import React from 'react';

interface QuickInputProps {
    label?: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    multiline?: boolean;
    required?: boolean;
    separator?: string;
}

const QuickInput: React.FC<QuickInputProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder, 
    multiline, 
    required,
    separator 
}) => {
    const handleChipClick = (option: string) => {
        // Determine default separator based on input type if not provided
        const effectiveSeparator = separator !== undefined 
            ? separator 
            : (multiline ? '\n' : ', ');

        if (!value) {
            onChange(option);
        } else {
            // Check if we need to append separator
            const valTrimmed = value.trim();
            // If separator is newline, we might want a newline before
            const needsSep = valTrimmed.length > 0 && !value.endsWith(effectiveSeparator.trim());
            
            onChange(`${value}${needsSep ? effectiveSeparator : ''}${option}`);
        }
    };

    return (
        <div className="form-group quick-input-container">
            {label && <label>{label}</label>}
            {multiline ? (
                <textarea 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    placeholder={placeholder}
                    required={required}
                />
            ) : (
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    placeholder={placeholder}
                    required={required}
                />
            )}
            {options.length > 0 && (
                <div className="quick-options">
                    {options.map(opt => (
                        <button 
                            key={opt} 
                            type="button" 
                            className="chip" 
                            onClick={() => handleChipClick(opt)}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuickInput;