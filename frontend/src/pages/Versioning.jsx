import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, InputGroup, Modal } from 'react-bootstrap';
import PageToolbar from '../components/PageToolbar';
import ListTable from '../components/ListTable';
import SnapshotViewer from '../components/SnapshotViewer';
import { productsService } from '../services/products';

const Versioning = () => {
    const [products, setProducts] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [renameModalShow, setRenameModalShow] = useState(false);
    const [renameSnapshotId, setRenameSnapshotId] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const [deleteModalShow, setDeleteModalShow] = useState(false);
    const [deleteSnapshotId, setDeleteSnapshotId] = useState(null);

    const [viewerModalShow, setViewerModalShow] = useState(false);
    const [viewerSnapshot, setViewerSnapshot] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [p, s] = await Promise.all([
                    productsService.getProducts(),
                    productsService.getSnapshots(),
                ]);
                const ps = Array.isArray(p) ? p : p.results || [];
                const ss = Array.isArray(s) ? s : s.results || [];
                setProducts(ps);
                setSnapshots(ss);
                if (!selectedProductId && ps.length > 0) setSelectedProductId(ps[0].id);
            } catch (e) {
                setError('Erreur lors du chargement des versions.');
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredSnapshots = useMemo(() => {
        if (!selectedProductId) return [];
        return snapshots
            .filter((s) => s.main_product === selectedProductId)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [snapshots, selectedProductId]);

    const openRename = (snap) => {
        setRenameSnapshotId(snap.id);
        setRenameValue(snap.name || '');
        setRenameModalShow(true);
    };

    const submitRename = async (e) => {
        e.preventDefault();
        try {
            const updated = await productsService.renameSnapshot(renameSnapshotId, renameValue);
            setSnapshots((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setRenameModalShow(false);
        } catch {
            setError('Impossible de renommer la version.');
        }
    };

    const openDelete = (snap) => {
        setDeleteSnapshotId(snap.id);
        setDeleteModalShow(true);
    };

    const confirmDelete = async () => {
        try {
            await productsService.deleteSnapshot(deleteSnapshotId);
            setSnapshots((prev) => prev.filter((s) => s.id !== deleteSnapshotId));
            setDeleteModalShow(false);
        } catch {
            setError('Impossible de supprimer la version.');
        }
    };

    const openViewer = (snap) => {
        setViewerSnapshot(snap);
        setViewerModalShow(true);
    };

    const columns = [
        {
            header: 'Version',
            key: 'created_at',
            render: (val, item) => (
                <div>
                    <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-bold text-start"
                        onClick={() => openViewer(item)}
                        title="Visualiser"
                    >
                        {item.name ? item.name : <span className="text-muted">(sans nom)</span>}
                    </button>
                    <div className="small text-muted">
                        {val ? new Date(val).toLocaleString('fr-FR') : ''}
                    </div>
                </div>
            )
        },
        {
            header: 'Produit',
            key: 'main_product_name',
            render: (val) => val || <span className="text-muted">-</span>
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end',
            render: (_id, item) => (
                <div className="d-flex justify-content-end gap-2">
                    <Button
                        size="sm"
                        variant="link"
                        className="text-secondary text-decoration-none"
                        onClick={() => openRename(item)}
                        title="Renommer"
                    >
                        <i className="fas fa-pen"></i>
                    </Button>
                    <Button
                        size="sm"
                        variant="link"
                        className="text-primary text-decoration-none"
                        onClick={() => openViewer(item)}
                        title="Visualiser"
                    >
                        <i className="fas fa-eye"></i>
                    </Button>
                    <Button
                        size="sm"
                        variant="link"
                        className="text-danger text-decoration-none"
                        onClick={() => openDelete(item)}
                        title="Supprimer"
                    >
                        <i className="fas fa-trash-can"></i>
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="animate-fade-in pb-5">
            <div className="page-header mb-4">
                <div>
                    <h1 className="mb-0">Versioning</h1>
                    <p className="text-muted mb-0">Gérer les Snapshots (versions immuables) des produits.</p>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <PageToolbar
                searchTerm={''}
                onSearchChange={() => { }}
                hideSearch={true}
                leftContent={(
                    <InputGroup style={{ maxWidth: '520px' }}>
                        <InputGroup.Text><i className="fas fa-box"></i></InputGroup.Text>
                        <Form.Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Form.Select>
                    </InputGroup>
                )}
                rightContent={(
                    <Badge bg="light" className="text-dark border">
                        {filteredSnapshots.length} version(s)
                    </Badge>
                )}
            />

            <Card className="shadow-sm">
                <Card.Body>
                    <ListTable
                        items={filteredSnapshots}
                        columns={columns}
                        emptyMessage={loading ? 'Chargement...' : 'Aucune version pour ce produit.'}
                        compact
                        hideSearch={true}
                    />
                </Card.Body>
            </Card>

            {/* Rename modal */}
            <Modal show={renameModalShow} onHide={() => setRenameModalShow(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Renommer la version</Modal.Title>
                </Modal.Header>
                <Form onSubmit={submitRename}>
                    <Modal.Body>
                        <Form.Group>
                            <Form.Label>Nom</Form.Label>
                            <Form.Control value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Ex: V1 - validation juridique" />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="light" onClick={() => setRenameModalShow(false)}>Annuler</Button>
                        <Button type="submit" variant="primary">Enregistrer</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete confirm modal */}
            <Modal show={deleteModalShow} onHide={() => setDeleteModalShow(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Supprimer la version</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-0">Êtes-vous sûr de vouloir supprimer ce Snapshot ?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setDeleteModalShow(false)}>Annuler</Button>
                    <Button variant="danger" onClick={confirmDelete}>Supprimer</Button>
                </Modal.Footer>
            </Modal>

            {/* Viewer modal */}
            <Modal show={viewerModalShow} onHide={() => setViewerModalShow(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Visualiser Snapshot {viewerSnapshot?.name ? `— ${viewerSnapshot.name}` : ''}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <SnapshotViewer snapshot={viewerSnapshot} />
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default Versioning;
