// Save a named plan to the Electron file system
async function savePlan(planId, planData) {

    const planName = planData.name || planId;

    if (!planName || typeof planName !== "string") {
        throw new Error("Suunnitelman nimi puuttuu.");
    }

    return await window.planStorage.savePlan(
        planName,
        planData
    );
}


// Load a specific plan
async function loadPlan(planId) {

    return await window.planStorage.loadPlan(planId);
}


// Get all saved plans
async function getAllPlans() {

    const planNames = await window.planStorage.listPlans();

    return planNames.map(function (name) {
        return {
            id: name,
            name: name
        };
    });
}


// Delete a specific plan
async function deletePlan(planId) {

    return await window.planStorage.deletePlan(planId);
}


// Compatibility functions for the existing application
async function saveCurrentPlan(planData) {

    return savePlan(planData.name, planData);
}


async function loadCurrentPlan() {

    return loadPlan(currentPlanName);
}