import React, { useState, useRef } from 'react';
import { Overlay, Popover, Button } from 'react-bootstrap';

/**
 * Small reusable "?" help tip.
 * Usage: <HelpTip title="..." content="..." />
 */
const HelpTip = ({ title = 'Aide', content }) => {
    const [show, setShow] = useState(false);
    const target = useRef(null);

    return (
        <>
            <Button
                ref={target}
                type="button"
                variant="link"
                className="p-0 ms-2 align-baseline"
                onClick={() => setShow(!show)}
                aria-label="Afficher l'aide"
                title="Aide"
            >
                <i className="fas fa-circle-question"></i>
            </Button>

            <Overlay target={target.current} show={show} placement="right" rootClose onHide={() => setShow(false)}>
                <Popover>
                    <Popover.Header as="h3">{title}</Popover.Header>
                    <Popover.Body>
                        {typeof content === 'string' ? <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div> : content}
                    </Popover.Body>
                </Popover>
            </Overlay>
        </>
    );
};

export default HelpTip;

