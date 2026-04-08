# DPPForge

DPPForge is a web platform for creating and managing EU-aligned Digital Product Passports (DPP).

It targets manufacturers, brands, and organizations that need to collect product and component data, structure it into a robust model (including JSON-LD), and publish product information through a Digital Twin that can be accessed via QR code.

Website: https://www.dppforge.com

## What this repository contains

- `backend/`: Django backend (API, authentication, data model, admin and business logic)
- `frontend/`: React web application (user interface)

## Key capabilities

- Organization-oriented accounts and authentication
- Product and component management
- Completion workflow to validate and freeze product data when ready
- QR code generation for product instances
- Public product pages (Digital Twin) reachable from QR codes

## Development setup (high level)

Backend (Django):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/app/manage.py migrate
python backend/app/manage.py runserver 0.0.0.0:8001
```

Frontend (React):

```bash
cd frontend
npm install
# configure environment via a local .env file (not committed)
npm start
```

## Security and configuration notes

Environment-specific configuration must not be committed to the repository.
Use local `.env` files or your deployment platform secrets, and keep credentials and API keys out of Git history.
