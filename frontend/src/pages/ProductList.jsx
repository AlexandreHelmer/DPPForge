import React, { useState, useEffect } from 'react';
import { Button, Badge, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { productsService } from '../services/products';
import ListTable from '../components/ListTable';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await productsService.getProducts();
            setProducts(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error('Erreur lors du chargement des produits', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce produit ? (Uniquement possible si non verrouillé)')) {
            try {
                await productsService.deleteProduct(id);
                loadProducts();
            } catch (err) {
                alert(err.response?.data?.[0] || 'Erreur lors de la suppression');
            }
        }
    };

    const handleArchive = async (id, unarchive = false) => {
        const actionName = unarchive ? 'désarchiver' : 'archiver';
        if (window.confirm(`Voulez-vous vraiment ${actionName} ce produit ?`)) {
            try {
                if (unarchive) {
                    await productsService.unarchiveProduct(id);
                } else {
                    await productsService.archiveProduct(id);
                }
                loadProducts();
            } catch (err) {
                alert(`Erreur lors de l'archivage`);
            }
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            DRAFT: { bg: 'secondary', text: 'Brouillon' },
            COMPLETE: { bg: 'success', text: 'Complet' },
            LOCKED: { bg: 'primary', text: 'Verrouillé' },
        };
        const badge = badges[status] || badges.DRAFT;
        return <Badge bg={badge.bg}>{badge.text}</Badge>;
    };

    const columns = [
        {
            header: 'Modèle',
            key: 'name',
            className: 'px-4',
            render: (val, item) => (
                <>
                    <div className="fw-bold">{val}</div>
                    <div className="small text-muted">{item.brand || 'Marque non spécifiée'}</div>
                </>
            )
        },
        {
            header: 'GTIN',
            key: 'gtin',
            render: (val) => <code>{val || <span className="text-muted opacity-50 italic">Sans GTIN</span>}</code>
        },
        { header: 'Catégorie', key: 'category' },
        {
            header: 'Composants',
            key: 'component_count',
            render: (val) => <Badge bg="light" className="text-dark border">{val || 0}</Badge>
        },
        {
            header: 'Digital Twins',
            key: 'instance_count',
            render: (val) => <Badge bg="light" className="text-primary border">{val || 0}</Badge>
        },
        {
            header: 'Statut',
            key: 'status',
            render: (val) => getStatusBadge(val)
        },
        {
            header: 'Actions',
            key: 'id',
            className: 'text-end px-4',
            render: (id, item) => (
                <div className="d-flex justify-content-end gap-1">
                    <Button
                        as={Link}
                        to={`/products/edit/${id}`}
                        variant="link"
                        className="text-decoration-none fw-bold text-accent"
                    >
                        {item.status === 'LOCKED' ? 'Visualiser' : 'Éditer'}
                    </Button>

                    {item.status !== 'LOCKED' && (
                        <Button
                            variant="link"
                            className="text-danger text-decoration-none"
                            onClick={() => handleDelete(id)}
                            aria-label="Supprimer le produit"
                        >
                            <i className="fas fa-trash-can"></i>
                        </Button>
                    )}

                    <Button
                        variant="link"
                        className="text-secondary text-decoration-none"
                        onClick={() => handleArchive(id, item.is_archived)}
                        title={item.is_archived ? "Désarchiver" : "Archiver"}
                        aria-label={item.is_archived ? "Désarchiver" : "Archiver"}
                    >
                        <i className={`fas ${item.is_archived ? 'fa-box-open' : 'fa-box-archive'}`}></i>
                    </Button>
                </div>
            )
        }
    ];

    const filteredProducts = products.filter(p => showArchived ? p.is_archived : !p.is_archived);

    if (loading) return <div className="text-center p-5">Chargement de votre catalogue...</div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="mb-0">Catalogue Produits</h1>
                    <p className="text-muted mb-0">Gérez vos modèles et accédez au Digital Product Passport.</p>
                </div>
                <div className="header-actions">
                    <Form.Check
                        type="switch"
                        id="show-archived"
                        label="Voir les archives"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                        className="mb-0"
                    />
                    <Button as={Link} to="/products/new" variant="accent" className="text-white shadow-sm">
                        <i className="fas fa-plus me-1"></i> Nouveau Produit
                    </Button>
                </div>
            </div>

            <ListTable
                items={filteredProducts}
                columns={columns}
                searchPlaceholder="Rechercher un modèle, GTIN, marque..."
                emptyMessage={showArchived ? "Aucun produit archivé" : "Aucun produit actif"}
            />
        </div>
    );
};

export default ProductList;
