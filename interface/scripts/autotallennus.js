let autosaveTimer = null;
const autosaveDelay = 1000;
let autosavePaused = false;

let autosavePending = false;
let autosaveInProgress = null;
let autosaveVersion = 0;

function scheduleAutosave() {
    if (autosavePaused) return;

    autosaveVersion++;
    autosavePending = true;

    clearTimeout(autosaveTimer);

    updateSaveStatus("saving", "Muutoksia tallennetaan...");

    autosaveTimer = setTimeout(function () {
        savePendingChanges().catch(function (error) {
            console.error("Autosave failed:", error);
        });
    }, autosaveDelay);
}


// Tallentaa odottavat muutokset
async function savePendingChanges() {

    // Jos tallennus on jo käynnissä, odotetaan sen valmistumista.
    if (autosaveInProgress) {
        await autosaveInProgress;
        return savePendingChanges();
    }

    if (!autosavePending) return;

    clearTimeout(autosaveTimer);
    autosaveTimer = null;

    const versionToSave = autosaveVersion;

    const saveOperation = async function () {
        const planData = suunnitelmaData(currentPlanName);

        await savePlan(currentPlanId, planData);

        // Merkitään tallennetuksi vain se versio,
        // joka todella tallennettiin.
        if (autosaveVersion === versionToSave) {
            autosavePending = false;
        }

        updateSaveStatus("saved", "Kaikki muutokset tallennettu");

        console.log(
            "Autosave completed:",
            new Date().toLocaleTimeString()
        );
    };

    autosaveInProgress = saveOperation();

    try {
        await autosaveInProgress;
    } catch (error) {
        updateSaveStatus("error", "Tallennus epäonnistui");
        throw error;
    } finally {
        autosaveInProgress = null;
    }
}


// Viimeistelee tallennukset ennen ohjelman sulkemista
async function finishAutosaveBeforeClose() {

    clearTimeout(autosaveTimer);
    autosaveTimer = null;

    if (autosaveInProgress) {
        await autosaveInProgress;
    }

    if (autosavePending) {
        await savePendingChanges();
    }

    console.log("Kaikki odottavat tallennukset on viimeistelty.");
}


function updateSaveStatus(status, message) {
    const statusElement = document.getElementById("saveStatus");

    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = status;
}

// Käsitellään Electronin lähettämä sulkemispyyntö
window.planStorage.onPrepareClose(async function () {

    try {
        // Viimeistellään kaikki odottavat tallennukset
        await finishAutosaveBeforeClose();

        // Ilmoitetaan Electronille, että tallennukset ovat valmiit
        await window.planStorage.confirmClose();

    } catch (error) {

        console.error("Sulkemisen viimeistely epäonnistui:", error);

        // Perutaan sulkemisyritys, jotta käyttäjä voi yrittää uudelleen
        await window.planStorage.cancelClose();

        alert(
            "Ohjelmaa ei suljettu, koska tallennuksen viimeistely epäonnistui.\n\n" +
            error.message
        );
    }
});