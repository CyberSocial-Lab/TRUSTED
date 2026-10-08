import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:4001";

function App() {
    const [hospitalId, setHospitalId] = useState("1");
    const [studyRequests, setStudyRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submittingId, setSubmittingId] = useState(null);
    const [error, setError] = useState("");

    const endpoint = useMemo(
        () =>
            `${API_BASE_URL}/hospitals/${hospitalId}/api/study-requests`,
        [hospitalId],
    );

    async function loadStudyRequests() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(
                    `Unable to load requests: HTTP ${response.status}`,
                );
            }

            const data = await response.json();
            setStudyRequests(data);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    async function submitDecision(
        studyRequestId,
        decision,
    ) {
        let justification = null;

        if (decision === "DENIED") {
            justification = window.prompt(
                "Enter the reason for denying this study request:",
            );

            if (!justification?.trim()) {
                return;
            }
        }

        setSubmittingId(studyRequestId);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/hospitals/${hospitalId}/api/study-requests/${studyRequestId}/decision`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        decision,
                        justification:
                            decision === "DENIED"
                                ? justification.trim()
                                : null,
                    }),
                },
            );

            const responseBody = await response
                .json()
                .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    responseBody?.error ||
                        `Unable to submit decision: HTTP ${response.status}`,
                );
            }

            await loadStudyRequests();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSubmittingId(null);
        }
    }

    async function revokeDecision(studyRequestId) {
    setSubmittingId(studyRequestId);
    setError("");

    try {
        const response = await fetch(
            `${API_BASE_URL}/hospitals/${hospitalId}/api/study-requests/${studyRequestId}/revoke`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );

        const responseBody = await response
            .json()
            .catch(() => null);

        if (!response.ok) {
            throw new Error(
                responseBody?.error ||
                    `Unable to revoke decision: HTTP ${response.status}`,
            );
        }

        await loadStudyRequests();
    } catch (requestError) {
        setError(requestError.message);
    } finally {
        setSubmittingId(null);
    }
}

    useEffect(() => {
        loadStudyRequests();
    }, [endpoint]);

    return (
        <main className="page">
            <header className="header">
                <div>
                    <p className="eyebrow">
                        Hospital Simulator
                    </p>

                    <h1>Study requests</h1>

                    <p className="subtitle">
                        Requests received through the hospital
                        webhook.
                    </p>
                </div>

                <div className="controls">
                    <label htmlFor="hospitalId">
                        Hospital
                    </label>

                    <select
                        id="hospitalId"
                        value={hospitalId}
                        onChange={(event) =>
                            setHospitalId(
                                event.target.value,
                            )
                        }
                    >
                        <option value="1">
                            Hospital 1
                        </option>

                        <option value="2">
                            Hospital 2
                        </option>

                        <option value="3">
                            Hospital 3
                        </option>
                    </select>

                    <button
                        type="button"
                        onClick={loadStudyRequests}
                        disabled={loading}
                    >
                        {loading
                            ? "Loading..."
                            : "Refresh"}
                    </button>
                </div>
            </header>

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

            {!loading &&
                studyRequests.length === 0 && (
                    <section className="empty-state">
                        <h2>
                            No study requests received
                        </h2>

                        <p>
                            Send a webhook to Hospital{" "}
                            {hospitalId} and refresh this
                            page.
                        </p>
                    </section>
                )}

            <section className="grid">
                {studyRequests.map(
                    (studyRequest) => {
                        const decisionStatus =
                            studyRequest.decisionStatus ??
                            "PENDING";

                        const isPending =
                            decisionStatus === "PENDING";

                        const isSubmitting =
                            submittingId ===
                            studyRequest.studyRequestId;

                        return (
                            <article
                                className="card"
                                key={
                                    studyRequest.studyRequestId
                                }
                            >
                                <div className="card-header">
                                    <div>
                                        <p className="request-id">
                                            {studyRequest.requestId ??
                                                `Request ${studyRequest.studyRequestId}`}
                                        </p>

                                        <h2>
                                            {studyRequest.title ??
                                                "Untitled study request"}
                                        </h2>
                                    </div>

                                    <span
                                        className={`status status-${decisionStatus.toLowerCase()}`}
                                    >
                                        {decisionStatus}
                                    </span>
                                </div>

                                <dl>
                                    <div>
                                        <dt>Study ID</dt>

                                        <dd>
                                            {studyRequest.studyId ??
                                                "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            Study request ID
                                        </dt>

                                        <dd>
                                            {
                                                studyRequest.studyRequestId
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Expires at</dt>

                                        <dd>
                                            {studyRequest.expiresAt
                                                ? new Date(
                                                      studyRequest.expiresAt,
                                                  ).toLocaleString()
                                                : "—"}
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>Received at</dt>

                                        <dd>
                                            {studyRequest.receivedAt
                                                ? new Date(
                                                      studyRequest.receivedAt,
                                                  ).toLocaleString()
                                                : "—"}
                                        </dd>
                                    </div>

                                    {studyRequest.decidedAt && (
                                        <div>
                                            <dt>
                                                Decided at
                                            </dt>

                                            <dd>
                                                {new Date(
                                                    studyRequest.decidedAt,
                                                ).toLocaleString()}
                                            </dd>
                                        </div>
                                    )}

                                    {studyRequest.justification && (
                                        <div>
                                            <dt>
                                                Justification
                                            </dt>

                                            <dd>
                                                {
                                                    studyRequest.justification
                                                }
                                            </dd>
                                        </div>
                                    )}
                                </dl>

<div className="actions">
    {isPending && (
        <>
            <button
                type="button"
                className="grant-button"
                disabled={isSubmitting}
                onClick={() =>
                    submitDecision(
                        studyRequest.studyRequestId,
                        "GRANTED",
                    )
                }
            >
                {isSubmitting ? "Submitting..." : "Grant"}
            </button>

            <button
                type="button"
                className="deny-button"
                disabled={isSubmitting}
                onClick={() =>
                    submitDecision(
                        studyRequest.studyRequestId,
                        "DENIED",
                    )
                }
            >
                Deny
            </button>
        </>
    )}

    {decisionStatus === "GRANTED" && (
        <button
            type="button"
            className="revoke-button"
            disabled={isSubmitting}
            onClick={() =>
                revokeDecision(
                    studyRequest.studyRequestId,
                )
            }
        >
            {isSubmitting ? "Revoking..." : "Revoke"}
        </button>
    )}
</div>
                            </article>
                        );
                    },
                )}
            </section>
        </main>
    );
}

export default App;