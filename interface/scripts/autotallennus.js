
let autosaveTimer = null;
const autosaveDelay = 1000;
let autosavePaused = false;

function scheduleAutosave() {
    if (autosavePaused) return;

    clearTimeout(autosaveTimer);

    updateSaveStatus("saving", "Muutoksia tallennetaan...");

    autosaveTimer = setTimeout(async function () {
        try {
            const planData = suunnitelmaData(currentPlanName);

            await savePlan(currentPlanId, planData);

            updateSaveStatus("saved", "kaikki muutokset tallennettu");
            console.log("Autosave completed:", new Date().toLocaleTimeString());

        } catch (error) {
            updateSaveStatus("error", "Tallennus epäonnistui");
            console.error("Autosave failed:", error);
        }
    }, autosaveDelay);
}

function updateSaveStatus(status, message) {
    const statusElement = document.getElementById("saveStatus");

    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = status;
}