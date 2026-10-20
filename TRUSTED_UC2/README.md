# TrustED — Use Case 2 Demo

This repository contains two applications used to demonstrate TrustED Use Case 2: a researcher submits a study access request, and the selected hospitals receive and review it.

## Repository contents

### Consent Management

The Consent Management service receives study requests, stores them in PostgreSQL, and manages hospital decisions and the request lifecycle. It notifies the selected hospitals through HTTP webhooks and publishes events through RabbitMQ.

### Hospital Simulator

The Hospital Simulator provides a backend and a frontend for simulating the hospitals participating in the demonstration. It receives study requests from the Consent Management service and allows users to view them and submit hospital decisions.

## Clone the repository

Replace the example URL with the actual repository URL:

```bash
git clone https://github.com/<owner>/<repository>.git
cd <repository>
```

Both application folders are included in the clone.

## Run the demonstration

Follow the README inside each application folder for installation, configuration, and startup instructions.

1. Start the Consent Management service and its PostgreSQL and RabbitMQ dependencies.
2. Start the Hospital Simulator backend.
3. Start the Hospital Simulator frontend.
4. Submit a researcher request using Postman:

   ```text
   POST http://localhost:3000/study-requests
   ```

   Use the sample JSON body provided in the Hospital Simulator README.

5. Open the simulator frontend to view the request at the selected hospitals and test their decisions.

If the Consent Management backend runs in Docker and the simulator runs on the host PC, configure the hospital webhook URLs using `host.docker.internal` as explained in the application README.

## What you can test

- Submission of a study access request.
- Delivery of notifications to the selected hospitals.
- Display of received requests in the hospital interface.
- Submission of hospital approval or rejection decisions.
- Revocation of a previously granted hospital decision.

The simulator stores received requests in memory. Restarting its backend clears those requests.