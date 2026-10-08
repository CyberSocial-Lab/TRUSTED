# Consent Management – Data Model

## Overview

The Consent Management Service manages research requests involving one or more hospitals.

A dataPortal submits a research request. Each involved hospital independently approves or rejects the request.

The request:

- remains `PENDING` while hospital decisions are missing;
- becomes `REJECTED` immediately when one hospital rejects it;
- becomes `APPROVED` when all hospitals approve it;
- becomes `EXPIRED` when the review deadline is exceeded.

For the initial demo, each hospital has one registered public key. Key rotation and public-key history are outside the current scope.

## Entities

### dataPortal

Represents the person or organisation submitting a research request.

## Hospital

Represents a hospital or data-owning organisation.

### Fields

| Field          | Type              |
| -------------- | ----------------- |
| id             | Integer           |
| name           | String            |
| country        | String(2)         |
| organizationId | String            |
| status         | ACTIVE / INACTIVE |
| publicKey      | Text              |
| createdAt      | Date              |
| updatedAt      | Date              |

### Notes

- `country` uses ISO 3166-1 alpha-2.
- `status` can be `ACTIVE` or `INACTIVE`.
- The Consent Management Service stores only the public key.
- Private keys remain inside the hospital environment.

Represents a hospital or data-owning organisation involved in research requests.

For the demo, the hospital directly stores its current public key and signature configuration.

### ResearchRequest

Represents a study or data-access request submitted by a dataPortal.

### HospitalDecision

Represents the decision made by one hospital for one research request.

A hospital can submit only one decision for the same research request.

## Relationships

- One dataPortal can submit many ResearchRequests.
- One ResearchRequest can involve many Hospitals.
- One Hospital can participate in many ResearchRequests.
- HospitalDecision represents the relationship between ResearchRequest and Hospital.

## Main constraints

- `ResearchRequest.status`: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`
- `HospitalDecision.status`: `PENDING`, `APPROVED`, `REJECTED`
- The pair `(researchRequestId, hospitalId)` must be unique.
- Rejection justification is mandatory when a hospital rejects a request.
- Private keys are never stored by the Consent Management Service.
