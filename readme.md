How to RUN ::

Backend -

cd backend

  python3 -m venv .venv
  source .venv/bin/activate

  pip install -r requirements.txt

  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  Backend URLs:

  - API health: http://localhost:8000/
  - Swagger docs: http://localhost:8000/docs

Frontend

  cd frontend

  npm install
  npm run dev -- --port 5173

  Frontend URL:

  - http://localhost:5173/

