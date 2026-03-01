# Union Pay Calculator

AI-assisted timesheet analysis for IBEW Local 1245 employees covered by the Pinnacle Powers labor agreement. The application verifies pay calculations against union contract rules and answers plain-language questions about specific timesheets.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Calculator Functionality](#calculator-functionality)
3. [AI Process](#ai-process)
4. [Architecture](#architecture)
5. [Prerequisites](#prerequisites)
6. [GCP Setup](#gcp-setup)
7. [Service Account Permissions](#service-account-permissions)
8. [Configuration](#configuration)
9. [Local Development](#local-development)
10. [Deployment](#deployment)

---

## Application Overview

The app has four sections:

| Route | Purpose |
|-------|---------|
| `/calculator` | Load a timesheet and see each job classified by pay type with totals |
| `/chat` (Ask Gemini) | Ask plain-language questions about a loaded timesheet |
| `/docs` (Rules & Docs) | Upload, edit, and delete contract documents; trigger Vertex AI re-index |
| `/about` | Explains how the system works |

---

## Calculator Functionality

The calculator applies IBEW Local 1245 pay rules mechanically to timesheet data pulled from a Cloud SQL (PostgreSQL) database.

### Pay Classifications

| Code | Meaning | Rate |
|------|---------|------|
| ST | Standard Time | 1× |
| PT | Premium Time | 1.5× |
| DT | Double Time | 2× |

### Standard Time Window (STW)

- Default: **6:00 AM – 2:00 PM** (configurable per company config)
- Extends by **+30 minutes** when a lunch break is taken
- Hours inside the STW on a regularly scheduled workday are ST

### Shift Types

- **RS (Regularly Scheduled)** — normal workday shift
- **ES (Emergency / call-out)** — unplanned call-out outside normal schedule

### Premium Time Triggers

PT applies when any of the following are true:

1. Work falls on a **weekend or holiday** → all hours are DT
2. **ES shift, first 4 hours** → PT regardless of time of day
3. **RS pre-shift work ≥ 6 hours before start** → all hours are PT
4. **ES post-STW with no 8-hour break** → PT
5. **RS pre-shift < 6 hours** → PT for the pre-shift portion only
6. Hours **outside the STW** on a normal RS shift → PT
7. Hours exceeding the **8-hour ST cap** → excess is PT

### Missed Meal Penalties

- **RS shifts:** penalty triggers after 10.5 hours, then every 4.5 hours after that
- **ES shifts:** penalty triggers every 4.5 hours from shift start

### Subsistence

- One subsistence payment per employee per calendar day
- Applies when total hours worked exceed the configured threshold (default: 0.5 h)
- Enforced with a `UNIQUE(employee_id, award_date)` constraint to prevent duplicates

---

## AI Process

The AI stack uses three components in sequence:

### 1. Document Library (Google Cloud Storage)

Union contract documents (PDF, text) are stored in the `union-rules-docs` GCS bucket. Administrators manage this library from the **Rules & Docs** page. After uploading or editing documents, clicking **Sync to AI** triggers a re-index.

### 2. Vertex AI Search (Discovery Engine)

When a user asks a question, the API first calls the Discovery Engine search endpoint. It searches **only** the `union-rules-docs` data store and returns the most relevant document excerpts — typically the specific contract clauses that apply to the question.

This avoids the context-length problem of sending the entire contract with every request, and ensures answers are grounded in the actual agreement rather than the public internet.

### 3. Gemini (Google AI reasoning)

The retrieved excerpts are combined with the specific timesheet data and passed to Gemini (`gemini-2.0-flash`). Gemini reasons over the provided context and returns a precise, numeric answer referencing the actual contract language.

### Data Flow

```
User question + timesheet
        │
        ▼
Vertex AI Search ──► relevant contract excerpts
        │
        ▼
Gemini (excerpts + timesheet JSON as context)
        │
        ▼
Plain-language answer with arithmetic and rule citations
```

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17+ (standalone components, Signals) |
| Backend | ASP.NET Core 8 Web API (C#) |
| Database | Google Cloud SQL — PostgreSQL 16 |
| AI Search | Google Vertex AI Search (Discovery Engine) |
| AI Reasoning | Google Gemini via Vertex AI (`gemini-2.0-flash`) |
| Document Storage | Google Cloud Storage (`union-rules-docs` bucket) |
| Container Registry | Google Artifact Registry |
| Hosting | Google Cloud Run (single container: nginx + Kestrel via supervisord) |

---

## Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI authenticated
- Docker (for local builds)
- .NET 8 SDK
- Node.js 20 + Angular CLI

---

## GCP Setup

### 1. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  discoveryengine.googleapis.com \
  aiplatform.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### 2. Create GCS Bucket

```bash
gsutil mb -l us-west1 gs://union-rules-docs
```

### 3. Create Vertex AI Search Data Store

1. GCP Console → **Agent Builder** → **Data Stores** → Create
2. Select **Cloud Storage** as the source
3. Point to `gs://union-rules-docs/*`
4. Content type: **Unstructured documents**
5. Note the **Data Store ID** from the URL after creation

### 4. Create Vertex AI Search Engine

1. **Agent Builder** → **Apps** → Create
2. Type: **Search**
3. Link to the data store created above
4. Note the **Engine ID** (used in `VertexAiService` as `union-rules-search`)

### 5. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --project=YOUR_PROJECT_ID
```

### 6. Create Cloud SQL Instance

```bash
gcloud sql instances create union-pay-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-west1 \
  --project=YOUR_PROJECT_ID
```

---

## Service Account Permissions

All API calls use a single service account (referenced in `VertexAi:ServiceAccountPath`). The account requires the following roles:

### Project-Level IAM Roles

| Role | Purpose |
|------|---------|
| `roles/discoveryengine.editor` | Import documents into the data store (Sync to AI), manage index |
| `roles/discoveryengine.viewer` | Search the data store (Ask Gemini) |
| `roles/aiplatform.user` | Call Gemini via Vertex AI (`aiplatform.endpoints.predict`) |
| `roles/storage.objectCreator` | Upload files to GCS bucket from the API |

```bash
SA="your-service-account@your-project.iam.gserviceaccount.com"
PROJECT="your-project-id"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" --role="roles/discoveryengine.editor"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" --role="roles/discoveryengine.viewer"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:$SA" --role="roles/storage.objectCreator"
```

### Bucket-Level IAM (Required for Delete)

`objectCreator` does not include delete. Grant `objectAdmin` directly on the bucket:

```bash
gsutil iam ch serviceAccount:$SA:roles/storage.objectAdmin gs://union-rules-docs
```

> **Note:** `objectAdmin` on the bucket supersedes the project-level `objectCreator` for that bucket. You can remove the project-level `objectCreator` if the service account only needs access to this one bucket.

### Minimum Individual Permissions (if not using predefined roles)

If you prefer fine-grained permissions instead of predefined roles:

| Permission | Required For |
|-----------|-------------|
| `discoveryengine.documents.import` | Sync to AI |
| `discoveryengine.documents.get` | Search |
| `discoveryengine.documents.list` | Search |
| `aiplatform.endpoints.predict` | Gemini (Ask Gemini, Chat) |
| `storage.objects.create` | Upload files |
| `storage.objects.get` | Download / serve files |
| `storage.objects.list` | List files in docs page |
| `storage.objects.delete` | Delete files from docs page |

---

## Configuration

### `appsettings.json` (production defaults)

```json
{
  "Gemini": {
    "ProjectId": "your-gcp-project-id"
  },
  "VertexAi": {
    "ServiceAccountPath": "/app/creds/vertexai.json",
    "DataStoreId": "your-discovery-engine-data-store-id"
  }
}
```

### `appsettings.Development.json`

```json
{
  "Gemini": {
    "ProjectId": "your-gcp-project-id",
    "ServiceAccountPath": "../../creds/service-account.json"
  },
  "VertexAi": {
    "ServiceAccountPath": "../../creds/vertexai.json",
    "DataStoreId": "your-discovery-engine-data-store-id"
  }
}
```

Place service account JSON files at:
- `creds/vertexai.json` — used by VertexAiService and DocsService
- `creds/service-account.json` — used by GeminiService

The `Dockerfile` copies `creds/vertexai.json` into the image at `/app/creds/vertexai.json`. **Do not commit credential files to source control.**

### Angular Environment (`client/src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  chatServer: '',                        // empty = relative URLs (proxied by ng serve)
  googleClientId: 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com'
};
```

---

## Local Development

### Start the API

```bash
cd server/UnionRulesApi
dotnet run --launch-profile dev
# Runs on http://0.0.0.0:8080 with ASPNETCORE_ENVIRONMENT=Development
```

### Start the Angular Dev Server

```bash
cd client
npm install
ng serve
# Proxies /api/* to http://localhost:8080 via proxy.conf.json
```

Open http://localhost:4200.

---

## Deployment

### Build and Push Docker Image

```bash
PROJECT=your-project-id
IMAGE=us-central1-docker.pkg.dev/$PROJECT/docker-repo/timesheet-calculator:latest

gcloud auth configure-docker us-central1-docker.pkg.dev
docker build -t $IMAGE .
docker push $IMAGE
```

### Deploy to Cloud Run

```bash
gcloud run deploy timesheet-calculator \
  --image $IMAGE \
  --project $PROJECT \
  --region us-west1 \
  --allow-unauthenticated
```

### Re-index Documents After Content Changes

After uploading or editing documents in the **Rules & Docs** page, click **Sync to AI** to trigger a full re-index. The Discovery Engine import runs asynchronously; the index is typically updated within 2–5 minutes.

Alternatively, run the shell script directly on a machine with `gcloud` credentials:

```bash
bash scripts/reindex-docs.sh
```
