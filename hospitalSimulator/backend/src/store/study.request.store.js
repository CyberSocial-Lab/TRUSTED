"use strict";

/*
 * hospitalsStore = Map<
 *   hospitalId,
 *   Map<studyRequestId, studyRequest>
 * >
 */
const hospitalsStore = new Map();

function getHospitalStore(hospitalId) {
    const normalizedHospitalId = String(hospitalId);

    if (!hospitalsStore.has(normalizedHospitalId)) {
        hospitalsStore.set(normalizedHospitalId, new Map());
    }

    return hospitalsStore.get(normalizedHospitalId);
}

module.exports = {
    hospitalsStore,
    getHospitalStore,
};
