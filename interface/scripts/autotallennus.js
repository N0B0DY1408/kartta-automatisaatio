
let autosaveTimer = null;
const autosaveDelay = 1000;

function scheduleAutosave() {

    clearTimeout(autosaveTimer);

    autosaveTimer = setTimeout(async function () {

        try {

            const planData = suunnitelmaData("Autosave");

            await saveCurrentPlan(planData);

            console.log("Autosave completed:", new Date().toLocaleTimeString());

        } catch (error) {

            console.error("Autosave failed:", error);

        }

    }, autosaveDelay);
}
