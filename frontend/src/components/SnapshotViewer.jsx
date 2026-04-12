import React from 'react';
import { Card, Badge, Table } from 'react-bootstrap';

const SnapshotViewer = ({ snapshot }) => {
    if (!snapshot) return null;

    // Snapshot can come from API as { payload: { ...tree } }
    const payload = snapshot.payload || snapshot.snapshot_payload || snapshot;

    const renderMaterials = (mc) => {
        const entries = mc && typeof mc === 'object' ? Object.entries(mc) : [];
        if (entries.length === 0) return <span className="text-muted">-</span>;
        return (
            <div className="d-flex flex-wrap gap-2">
                {entries.map(([k, v]) => (
                    <Badge key={k} bg="light" className="text-dark border">
                        {k}: {v}%
                    </Badge>
                ))}
            </div>
        );
    };

    const renderCertifs = (certs) => {
        const arr = Array.isArray(certs) ? certs : [];
        if (arr.length === 0) return <span className="text-muted">-</span>;
        return (
            <div className="d-flex flex-wrap gap-2">
                {arr.map((c) => (
                    <Badge key={c} bg="secondary">{c}</Badge>
                ))}
            </div>
        );
    };

    const renderNode = (node, depth = 0) => {
        if (!node) return null;
        const components = Array.isArray(node.components) ? node.components : [];
        return (
            <Card className="mb-3" style={{ marginLeft: depth ? depth * 12 : 0 }}>
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                            <h5 className="mb-1">{node.name}</h5>
                            <div className="text-muted small">
                                {node.manufacturer ? <>Fabricant: <strong>{node.manufacturer}</strong></> : 'Fabricant: -'}
                                {' · '}
                                {node.origin_country ? <>Origine: <strong>{node.origin_country}</strong></> : 'Origine: -'}
                                {' · '}
                                {node.gtin ? <>GTIN: <code>{node.gtin}</code></> : 'GTIN: -'}
                            </div>
                        </div>
                        {node.supplier_submitted && (
                            <Badge bg="success">Soumis fournisseur</Badge>
                        )}
                    </div>

                    {node.description && (
                        <div className="mt-3">
                            <div className="fw-medium">Description</div>
                            <div className="text-muted" style={{ whiteSpace: 'pre-wrap' }}>{node.description}</div>
                        </div>
                    )}

                    <div className="mt-3">
                        <Table bordered size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td style={{ width: '220px' }} className="bg-body-tertiary">Composition matérielle</td>
                                    <td>{renderMaterials(node.material_composition)}</td>
                                </tr>
                                <tr>
                                    <td className="bg-body-tertiary">Certifications</td>
                                    <td>{renderCertifs(node.certifications)}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>

                {components.length > 0 && (
                    <Card.Footer className="bg-body">
                        <div className="fw-medium mb-2">Composants ({components.length})</div>
                        {components.map((child) => (
                            <div key={child.id} className="mb-2">
                                {renderNode(child, depth + 1)}
                            </div>
                        ))}
                    </Card.Footer>
                )}
            </Card>
        );
    };

    return (
        <div>
            {renderNode(payload, 0)}
        </div>
    );
};

export default SnapshotViewer;

