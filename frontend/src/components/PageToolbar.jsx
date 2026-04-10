import React from 'react';
import { Form, Button, InputGroup, Stack } from 'react-bootstrap';

/**
 * Common toolbar for list pages.
 * Centralizes Search, Filters (Archives), and Main Actions (New, CSV).
 * New button is now on the left as requested.
 */
const PageToolbar = ({
    searchTerm,
    onSearchChange,
    searchPlaceholder = "Rechercher...",
    showArchived,
    onArchivedChange,
    onCsvClick,
    onNewClick,
    newLabel = "Nouveau",
    extraActions = null
}) => {
    return (
        <div className="card border-0 shadow-sm p-3 mb-4 rounded-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">

                {/* Left side: New Button & Search */}
                <div className="d-flex align-items-center gap-3 w-100 w-md-auto flex-grow-1">
                    {/* Primary Action Button - Leftmost */}
                    {onNewClick && (
                        <Button
                            variant="accent"
                            onClick={onNewClick}
                            className="rounded-3 px-3 d-flex align-items-center gap-2 shadow-sm text-white text-nowrap"
                        >
                            <i className="fas fa-plus"></i>
                            <span className="d-none d-sm-inline">{newLabel}</span>
                            <span className="d-inline d-sm-none">Ajouter</span>
                        </Button>
                    )}

                    {/* Search Field */}
                    <div className="w-100" style={{ maxWidth: '400px' }}>
                        <InputGroup className="bg-muted rounded-3 border-1 border-light">
                            <InputGroup.Text className="bg-transparent border-0 ps-3">
                                <i className="fas fa-magnifying-glass text-muted"></i>
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="bg-transparent border-0 py-2 shadow-none"
                            />
                        </InputGroup>
                    </div>
                </div>

                {/* Right side: Filters & Actions */}
                <div className="d-flex flex-wrap align-items-center justify-content-end gap-3 w-100 w-md-auto">

                    {/* Archive Switch */}
                    {onArchivedChange !== undefined && (
                        <div className="px-3 py-1 rounded-pill border d-flex align-items-center bg-white">
                            <Form.Check
                                type="switch"
                                id="header-show-archived"
                                label={<small className="fw-semibold text-muted">Archives</small>}
                                checked={showArchived}
                                onChange={(e) => onArchivedChange(e.target.checked)}
                                className="mb-0"
                            />
                        </div>
                    )}

                    <Stack direction="horizontal" gap={2}>
                        {/* CSV / Data Actions */}
                        {onCsvClick && (
                            <Button
                                variant="outline-secondary"
                                onClick={onCsvClick}
                                className="rounded-3 px-3 d-flex align-items-center gap-2 border-dashed shadow-sm-hover bg-white border-secondary-subtle"
                                title="Import / Export des données"
                            >
                                <i className="fas fa-file-export text-muted"></i>
                                <span className="d-none d-lg-inline fw-medium py-1">Import / Export</span>
                                <span className="d-lg-none fw-medium">Importer/Exporter</span>
                            </Button>
                        )}


                        {/* Extra Actions */}
                        {extraActions}
                    </Stack>
                </div>
            </div>
        </div>
    );
};

export default PageToolbar;
