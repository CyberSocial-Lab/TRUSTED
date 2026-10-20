# Hospital Simulator — TrustED Use Case 2

## Overview

The Hospital Simulator is a demonstration application for **TrustED Use Case 2 (UC2)**. It illustrates a scenario in which a researcher submits a study access request and the selected hospitals receive it for review.

The simulator works together with the **Consent Management Service**, also referred to as the Consent Manager. The two applications are separate projects and must both be running for the complete demonstration.

The researcher's submission can be simulated using **Postman**. A dedicated researcher frontend is not required for this workflow.

The Hospital Simulator consists of:

- A **backend**, which receives study-request notifications through HTTP webhooks, stores the received requests in memory, and exposes APIs for the hospital interface.
- A **frontend**, which provides the hospital-facing interface for viewing and reviewing received requests.

## Demonstration workflow

1. A researcher submits a study request to the Consent Manager using Postman.
2. The Consent Manager processes and stores the request and identifies the requested hospitals.
3. The Consent Manager sends a webhook notification to each selected hospital's endpoint in the simulator.
4. The simulator backend stores the received request in the corresponding hospital's in-memory collection.
5. The user opens the simulator frontend to inspect the requests for that hospital.
6. The simulator also provides backend endpoints for submitting a hospital decision and revoking a previously granted decision.

The Consent Manager additionally publishes RabbitMQ notifications. RabbitMQ delivery and webhook delivery are reported separately. The simulator backend shown in this demonstration receives requests through **webhooks**.

## Components and addresses

| Component | Purpose | Address from the host PC |
|---|---|---|
| Consent Manager | Receives researcher submissions and coordinates hospital notifications | http://localhost:3000 |
| PostgreSQL | Stores Consent Manager data | Host port configured in Docker Compose |
| RabbitMQ | Provides message-broker functionality | localhost:5672 |
| RabbitMQ management interface | Allows inspection of the broker | http://localhost:15672 |
| Hospital Simulator backend | Receives webhooks and exposes hospital APIs | http://localhost:4001 |
| Hospital Simulator frontend | Displays the hospital interface | URL printed by `npm run dev` |

The simulator backend uses port **4001** by default, unless the `PORT` environment variable overrides it.

## Prerequisites

Before starting, make sure that:

- Docker and Docker Compose are installed and Docker is running.
- Node.js and npm are installed in versions compatible with both projects. The simulator backend uses the native `fetch` API.
- Postman is installed.
- Both the Consent Manager and Hospital Simulator projects are available locally.
- The Consent Manager environment configuration is available.
- Its database schema and demonstration records have already been initialized using the project's migration and seed procedure.

The sample request requires an active researcher with ID `1` and active hospitals with organization IDs `123-ABC` and `456-ABC`. Related public-key records must also exist.

Starting containers does not by itself guarantee that migrations and seeders have run. This guide focuses on running an initialized demonstration environment.

### Command locations

Run each npm command in the directory containing the relevant `package.json`.

| Command | Working directory |
|---|---|
| `docker compose ...` | Consent Manager directory containing the Compose file |
| `npm start` for the Consent Manager | Consent Manager backend directory containing its `package.json` — `src` in the project discussed here |
| `npm run start` for the simulator | Hospital Simulator backend directory |
| `npm run dev` for the simulator | Hospital Simulator frontend directory |

The commands below assume those scripts are defined in the corresponding projects. Keep a separate terminal for each locally running server.

## 1. Start the Consent Manager

Choose **one** of the following execution modes.

The supplied Compose file includes a service named `backend`, as well as `postgres` and `rabbitmq`. Therefore, an unqualified `docker compose up` already starts the Consent Manager backend. Do not subsequently start a second instance with `npm start` on the same port.

### Option A — Consent Manager backend in Docker

From the directory containing the Compose file, run:

```bash
docker compose up
```

On the first run, or after changing backend source code, explicitly build the image:

```bash
docker compose up --build
```

To run in the background instead:

```bash
docker compose up -d --build
```

This starts:

- PostgreSQL.
- RabbitMQ.

The Consent Manager is accessible from Postman at:

```text
http://localhost:3000
```


Inside Docker, the backend connects to PostgreSQL at `postgres:5432` and RabbitMQ at `rabbitmq:5672`. Broker credentials configured in the backend must match those configured for RabbitMQ.


In a separate terminal, open the Consent Manager backend directory. Install dependencies on the first run:

```bash
npm install
```

Configure the local backend to connect to:

- PostgreSQL on `localhost`, using the **published host port**.
- RabbitMQ on `localhost:5672`.

For example, if PostgreSQL is published as `5433:5432`, the local backend must use port `5433`. The container's internal database port remains `5432`.

Keep the database name and credentials consistent with the running containers. Ensure the local Node process actually loads the intended environment variables.

Then start the Consent Manager:

```bash
npm start
```

Wait for its startup message:

```text
[HTTP] Server running on http://localhost:3000
```

## 2. Start the Hospital Simulator backend

Open another terminal in the Hospital Simulator backend directory.

Install dependencies on the first run:

```bash
npm install
```

Start the backend:

```bash
npm run start
```

Keep this terminal open throughout the demonstration.

The simulator backend defaults to:

```text
PORT=4001
CONSENT_MANAGEMENT_URL=http://localhost:3000
```

The Consent Manager URL is used when the simulator sends decisions back to the Consent Manager. It is correct for both options above because the simulator runs on the host PC and the Consent Manager is accessible through port 3000.

### Verify the simulator is running

Open the following address in a browser:

[http://localhost:4001/health](http://localhost:4001/health)

Expected response:

```json
{
  "status": "ok",
  "service": "hospital-simulator"
}
```

This confirms that the backend is reachable from the PC. It does not yet confirm that the Consent Manager container can reach it.

## 3. Configure hospital webhook URLs

Webhook URLs are stored in the Consent Manager database, in the `webhookUrl` column of the `hospitals` table.

Select the addresses that match your execution mode:


## 4. Start the Hospital Simulator frontend

Open another terminal in the Hospital Simulator frontend directory.

Install dependencies on the first run:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the URL printed by Vite in the terminal. Use the actual printed address, since the port depends on the project's configuration and port availability.

The frontend must reach the simulator backend at `http://localhost:4001`, either directly or through the project's configured Vite proxy.

A frontend build is not required for this development workflow. Building the frontend does not start the simulator backend.

## 5. Submit a researcher request with Postman

With all required services running, create a new HTTP request in Postman.

### Request settings

- **Method:** `POST`
- **URL:** [http://localhost:3000/study-requests](http://localhost:3000/study-requests)
- **Header:** `Content-Type: application/json`
- **Body:** select **raw**, then **JSON**.

Paste the following example into the request body:

```json
{
  "researcher_id": 1,
  "request_payload": {
    "request_id": "REQ-TEST-005",
    "form_type": "DATA_ACCESS_APPLICATION",
    "study": {
      "study_id": "STUDY-TEST-002",
      "title": "Test study request",
      "language": "en",
      "expires_at": "2026-11-10T18:00:00.000Z"
    },
    "requested_data_owners": [
      {
        "owner_id": "123-ABC",
        "country_code": "PT",
        "dataset_id": "DATASET-001"
      },
      {
        "owner_id": "456-ABC",
        "country_code": "SP",
        "dataset_id": "DATASET-001"
      }
    ],
    "purpose_of_use": {
      "purpose": "scientific_research",
      "description": "Request created to test the consent management flow"
    },
    "acknowledgements": {
      "terms_accepted": true
    }
  },
  "applicant_signature": {
    "public_key_id": "researcher-key-1",
    "signature_algorithm": "RSA-SHA256",
    "signed_payload_hash": "test-hash",
    "signature_value": "test-signature",
    "signed_at": "2026-08-04T18:30:00.000Z"
  }
}
```

### Before sending

- **Researcher:** `researcher_id: 1` must identify an existing active researcher.
- **Request identifier:** use a new `request_id` for each new submission, such as `REQ-TEST-006` for the next test. The identifier must be unique.
- **Expiration:** `expires_at` must be in the future when the request is submitted. Update the sample date if necessary.
- **Hospitals:** the owner IDs must match existing active hospital records.
- **Signature:** the supplied hash and signature are test placeholders, not a valid cryptographic signature. They are suitable only for a demonstration configuration that accepts such placeholders. If verification is enforced, provide a valid signature and matching key and payload.
- **Country code:** the example preserves the supplied `SP` value. If the integration validates ISO 3166-1 alpha-2 codes, use `ES` for Spain.

Click **Send**.

## 6. Verify that hospitals received the request

### Check the Consent Manager response

A successful creation returns HTTP **201** and a response containing:

- `message`: `Study request created successfully`.
- `studyRequest`: the stored request and its identifier.
- `rabbitMqNotifications`: RabbitMQ publication results.
- `webhookNotifications`: hospital webhook delivery results.

For the sample request, which targets two hospitals, successful webhook delivery should look like:

```json
{
  "webhookNotifications": {
    "delivered": 2,
    "errors": []
  }
}
```

A successfully created study request does not necessarily mean that every notification was delivered. Always inspect the notification results.

### Check the simulator terminal

The simulator backend should print messages such as:

```text
[Hospital 1] Webhook received
[Hospital 2] Webhook received
```

### Check the simulator APIs directly

Open:

- Hospital 1: [http://localhost:4001/hospitals/1/api/study-requests](http://localhost:4001/hospitals/1/api/study-requests)
- Hospital 2: [http://localhost:4001/hospitals/2/api/study-requests](http://localhost:4001/hospitals/2/api/study-requests)

Each endpoint returns an array of requests received by that hospital.

An empty array, `[]`, means that the queried simulator instance currently has no stored requests for that hospital.

### Check the frontend

Open the simulator frontend and select the relevant hospital. The received request should be available for inspection. Refresh the view if it does not update automatically.

If the API contains the request but the frontend does not display it, inspect the browser's Network tab to verify the requested backend URL, hospital ID, HTTP status and response.

## 7. Optional: submit a hospital decision

The simulator backend exposes this endpoint:

```text
POST http://localhost:4001/hospitals/1/api/study-requests/<studyRequestId>/decision
```

Replace `<studyRequestId>` with the numeric ID returned by the Consent Manager, such as `34`. Do not use the external string `REQ-TEST-005` in this path.

To grant access:

```json
{
  "decision": "GRANTED"
}
```

To deny access:

```json
{
  "decision": "DENIED",
  "justification": "Dataset unavailable"
}
```

The request must already exist in the simulator's memory and have a pending decision. The simulator forwards the decision to the Consent Manager.

A previously granted decision can be revoked through:

```text
POST http://localhost:4001/hospitals/1/api/study-requests/<studyRequestId>/revoke
```

The provided simulator implementation uses placeholder signatures for decisions and revocations, so acceptance depends on the Consent Manager's demonstration configuration.

## Data persistence

The two applications store data differently:

- **Consent Manager:** uses PostgreSQL. With the configured Docker volume, its data persists across normal container restarts.
- **Hospital Simulator:** uses in-memory collections. Restarting its backend clears the received requests and local decision state.

After restarting the simulator, submit a new test request to populate it again. Previously received requests are not automatically restored from PostgreSQL by the supplied simulator code.
