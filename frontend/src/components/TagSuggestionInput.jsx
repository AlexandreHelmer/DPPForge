import React, { useMemo, useState } from 'react';
import { Button, Form, InputGroup, ListGroup } from 'react-bootstrap';

const TagSuggestionInput = ({
    tags = [],
    suggestions = [],
    onAdd,
    onRemove,
    placeholder = 'Rechercher ou saisir...',
    disabled = false,
}) => {
    const [value, setValue] = useState('');
    const [open, setOpen] = useState(false);

    const normalizedTags = useMemo(
        () => tags.map((tag) => tag.toLowerCase()),
        [tags]
    );

    const filteredSuggestions = useMemo(() => {
        const term = value.trim().toLowerCase();
        if (!term) return [];
        return suggestions
            .filter((item) => !normalizedTags.includes(item.toLowerCase()))
            .filter((item) => item.toLowerCase().includes(term))
            .slice(0, 8);
    }, [value, suggestions, normalizedTags]);

    const addTag = (raw) => {
        const tag = (raw || '').trim();
        if (!tag || disabled) return;
        if (normalizedTags.includes(tag.toLowerCase())) return;
        onAdd(tag);
        setValue('');
        setOpen(false);
    };

    const handleInputChange = (e) => {
        const next = e.target.value;
        setValue(next);
        setOpen(true);

        const exactSuggestion = suggestions.find(
            (item) => item.toLowerCase() === next.trim().toLowerCase()
        );
        if (exactSuggestion) addTag(exactSuggestion);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            addTag(value);
        }
    };

    return (
        <>
            {tags.length > 0 && (
                <div className="mb-2">
                    {tags.map((tag) => (
                        <span key={tag} className="selected-chip">
                            {tag}
                            {!disabled && (
                                <span className="remove-btn" onClick={() => onRemove(tag)}>×</span>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {!disabled && (
                <div className="position-relative">
                    <InputGroup>
                        <InputGroup.Text>
                            <i className="fas fa-magnifying-glass"></i>
                        </InputGroup.Text>
                        <Form.Control
                            type="text"
                            value={value}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setOpen(true)}
                            onBlur={() => setTimeout(() => setOpen(false), 120)}
                            placeholder={placeholder}
                            data-enter-add="true"
                        />
                        <Button variant="outline-primary" onClick={() => addTag(value)} type="button">
                            <i className="fas fa-plus"></i>
                        </Button>
                    </InputGroup>

                    {open && filteredSuggestions.length > 0 && (
                        <ListGroup className="position-absolute w-100 shadow-sm z-3 mt-1" role="listbox">
                            {filteredSuggestions.map((item) => (
                                <ListGroup.Item
                                    key={item}
                                    action
                                    onMouseDown={() => addTag(item)}
                                    role="option"
                                >
                                    {item}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </div>
            )}
        </>
    );
};

export default TagSuggestionInput;
