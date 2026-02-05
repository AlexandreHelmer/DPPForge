import React, { useState } from 'react';
import { Table, Form, InputGroup, Pagination } from 'react-bootstrap';

/**
 * Reusable component for tables with searching and pagination.
 * @param {Array} items - All items to display
 * @param {Array} columns - Column definitions [{ header: 'Name', key: 'name', render: (val, item) => ... }]
 * @param {string} searchPlaceholder - Placeholder for the search input
 * @param {string} emptyMessage - Message when no items match the filter
 * @param {number} pageSize - Items per page
 */
const ListTable = ({
    items = [],
    columns = [],
    searchPlaceholder = "Rechercher...",
    emptyMessage = "Aucun résultat trouvé",
    pageSize = 10
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Dynamic filtering
    const filteredItems = items.filter(item => {
        const searchString = JSON.stringify(Object.values(item)).toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

    // Reset pagination when search changes
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="list-table-container">
            <div className="mb-3">
                <InputGroup className="max-w-400">
                    <InputGroup.Text className="bg-white border-end-0">
                        <i className="fas fa-search text-muted"></i>
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="border-start-0 ps-0"
                    />
                </InputGroup>
            </div>

            <div className="card border-0 shadow-sm overflow-hidden">
                <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`py-3 ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="border-top-0">
                        {paginatedItems.length > 0 ? (
                            paginatedItems.map((item, rowIdx) => (
                                <tr key={item.id || rowIdx} className="align-middle">
                                    {columns.map((col, colIdx) => (
                                        <td key={colIdx} className={col.className || ''}>
                                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="text-center p-5 text-muted">
                                    <i className="fas fa-search-minus display-4 mb-3 d-block opacity-25"></i>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>

                {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                        <div className="small text-muted">
                            Affichage de {startIndex + 1} à {Math.min(startIndex + pageSize, filteredItems.length)} sur {filteredItems.length} éléments
                        </div>
                        <Pagination className="mb-0">
                            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />

                            {[...Array(totalPages)].map((_, i) => (
                                <Pagination.Item
                                    key={i + 1}
                                    active={i + 1 === currentPage}
                                    onClick={() => setCurrentPage(i + 1)}
                                >
                                    {i + 1}
                                </Pagination.Item>
                            )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}

                            <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                        </Pagination>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListTable;
