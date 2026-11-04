const tallennusNappi = document.getElementById('tallenna');

let currentPlanName = "Untitled plan";

let currentPlanId = "current";

function suunnitelmaData(planName) {

    // Collect all vendors
    const kojuData = Array.from(kojut.values()).map(function (vendor) {

        // Get the marker's current position
        const position = vendor.marker.getLatLng();

        return {
            number: vendor.number,
            name: vendor.name,
            coordinates: {
                lat: position.lat,
                lng: position.lng
            }
        };
    });

    // Collect all parking areas
    const parkkiData = Array.from(parkit.values()).map(function (area) {

        // Get the parking area's actual corners
        const corners = area.layer.getLatLngs()[0];

        return {
            number: area.number,
            name: area.name,
            entrance: area.entrance,
            exit: area.exit,

            coordinates: corners.map(function (corner) {
                return {
                    lat: corner.lat,
                    lng: corner.lng
                };
            })
        };
    });

    // Collect the current map view
    const mapData = {
        center: {
            lat: map.getCenter().lat,
            lng: map.getCenter().lng
        },
        zoom: map.getZoom(),
        bearing: map.getBearing()
    };

    // Return the complete plan
    return {
        version: 1,
        name: planName,
        kojut: kojuData,
        parkit: parkkiData,
        map: mapData
    };
}

tallennusNappi.addEventListener('click', async function() {

    const suunnitelmanNimi = await kysyTallennusNimi();

    if (!suunnitelmanNimi) {
        return;
    }

    // Update the current plan name
    currentPlanName = suunnitelmanNimi;

    // Collect the complete plan using our function
    const planData = suunnitelmaData(suunnitelmanNimi);

    // Convert the plan into JSON text
    const jsonData = JSON.stringify(planData, null, 4);

    // Create a downloadable file
    const file = new Blob(
        [jsonData],
        { type: "application/json" }
    );

    // Create a temporary download address
    const downloadLink = document.createElement("a");

    downloadLink.href = URL.createObjectURL(file);
    downloadLink.download = suunnitelmanNimi + ".json";

    downloadLink.click();

    // Release the temporary address
    URL.revokeObjectURL(downloadLink.href);

    console.log("Suunnitelma tallennettu:", planData);
});


function clearCurrentPlan() {

    for (const koju of kojut.values()) {
        map.removeLayer(koju.marker);
        koju.element.remove();
    }

    for (const area of parkit.values()) {
        map.removeLayer(area.layer);
        area.element.remove();
    }

    kojut.clear();
    parkit.clear();

    kojumäärä = 1;
    parkingCounter = 1;
}



function validatePlanData(plan) {

    function isObject(value) {
        return value !== null &&
            typeof value === "object" &&
            !Array.isArray(value);
    }

    function validateCoordinates(coordinates, description) {

        if (!isObject(coordinates)) {
            throw new Error(description + ": sijaintitiedot puuttuvat.");
        }

        if (
            !Number.isFinite(coordinates.lat) ||
            !Number.isFinite(coordinates.lng)
        ) {
            throw new Error(description + ": väärä sijainti.");
        }

        if (
            coordinates.lat < -900 ||
            coordinates.lat > 900 ||
            coordinates.lng < -1800 ||
            coordinates.lng > 1800
        ) {
            throw new Error(description + ": sijaintitiedot ovat alueen ulkopuolella.");
        }
    }
    if (!isObject(plan)) {
        throw new Error("suunnitelman data ongelma.");
    }

    if (plan.version !== 1) {
        throw new Error("suunnitelma versio ei ole tuettu.");
    }

    if (typeof plan.name !== "string") {
        throw new Error("suunnitelman nimi puuttuu tai on virheellinen.");
    }

    if (
        !Array.isArray(plan.kojut) ||
        !Array.isArray(plan.parkit)
    ) {
        throw new Error("koju tai parkki data ongelma.");
    }

    const vendorNumbers = new Set();

    plan.kojut.forEach(function (vendor, index) {

        if (!isObject(vendor)) {
            throw new Error("virhe kojun kohdalla " + index);
        }

        if (
            !Number.isInteger(vendor.number) ||
            vendor.number < 1
        ) {
            throw new Error("virhen kojun numeron kanssa.");
        }

        if (vendorNumbers.has(vendor.number)) {
            throw new Error("kojun numero on jo käytössä.");
        }

        vendorNumbers.add(vendor.number);

        if (typeof vendor.name !== "string") {
            throw new Error("virhe kojun nimen kanssa.");
        }

        validateCoordinates(
            vendor.coordinates,
            "Vendor " + vendor.number
        );
    });

    const parkingNumbers = new Set();

    plan.parkit.forEach(function (area, index) {

        if (!isObject(area)) {
            throw new Error("väärä parkki alue " + index);
        }

        if (
            !Number.isInteger(area.number) ||
            area.number < 1
        ) {
            throw new Error("virhe parkki alueen numeron kanssa.");
        }

        if (parkingNumbers.has(area.number)) {
            throw new Error("parkin numero on jo käytössä.");
        }

        parkingNumbers.add(area.number);

        if (
            typeof area.name !== "string" ||
            typeof area.entrance !== "string" ||
            typeof area.exit !== "string"
        ) {
            throw new Error("virhe parkki alueen tietojen kanssa.");
        }

        if (
            !Array.isArray(area.coordinates) ||
            area.coordinates.length < 3
        ) {
            throw new Error("virhe parkki alueen koordinaattien kanssa.");
        }

        area.coordinates.forEach(function (corner) {
            validateCoordinates(
                corner,
                "Parking area " + area.number
            );
        });
    });

    if (!isObject(plan.map) || !isObject(plan.map.center)) {
        throw new Error("virhen kartan kanssa.");
    }

    validateCoordinates(plan.map.center, "Map center");

    if (
        !Number.isFinite(plan.map.zoom) ||
        plan.map.zoom < 0 ||
        plan.map.zoom > 30
    ) {
        throw new Error("virhe kartan zoomin kanssa.");
    }

    if (!Number.isFinite(plan.map.bearing)) {
        throw new Error("virhe kartan suunnan kanssa.");
    }

    return true;
}

function kysyTallennusNimi() {
    return new Promise(function (resolve) {
        const dialog = document.getElementById("savePlanDialog");
        const input = document.getElementById("savePlanNameInput");

        input.value = currentPlanName || "";

        dialog.addEventListener("close", function () {
            if (dialog.returnValue === "save") {
                const name = input.value.trim();
                resolve(name || null);
            } else {
                resolve(null);
            }
        }, { once: true });

        dialog.showModal();
        input.focus();
    });
}

async function restorePlanFromDatabase() {

    autosavePaused = true;

    try {
        const planData = await loadCurrentPlan();

        if (!planData) {
            console.log("No saved plan to restore.");
            return;
        }

        if (
            planData.version !== 1 ||
            !Array.isArray(planData.kojut) ||
            !Array.isArray(planData.parkit) ||
            !planData.map
        ) {
            throw new Error("Saved plan has an invalid format.");
        }

        clearCurrentPlan();

        planData.kojut.forEach(function (koju) {

            const position = L.latLng(
                koju.coordinates.lat,
                koju.coordinates.lng
            );

            createKoju(koju.number, koju.name, position);

            kojumäärä = Math.max(kojumäärä, koju.number + 1);
        });

        planData.parkit.forEach(function (area) {

            const corners = area.coordinates.map(function (corner) {
                return L.latLng(corner.lat, corner.lng);
            });

            luoparkki(
                area.number,
                area.name,
                area.entrance,
                area.exit,
                null,
                corners
            );

            parkingCounter = Math.max(
                parkingCounter,
                area.number + 1
            );
        });

        map.setView(
            [planData.map.center.lat, planData.map.center.lng],
            planData.map.zoom
        );

        if (typeof map.setBearing === "function") {
            map.setBearing(planData.map.bearing || 0);
        }

        currentPlanName = planData.name || "Untitled plan";

        console.log("Plan restored from IndexedDB:", planData);

    } catch (error) {
        console.error("Failed to restore plan:", error);

    } finally {
        autosavePaused = false;
        console.log("Autosave resumed.");
    }
}

for (const koju of kojut.values()) {
    map.removeLayer(koju.marker);
    koju.element.remove();
}

for (const area of parkit.values()) {
    map.removeLayer(area.layer);
    area.element.remove();
}

kojut.clear();
parkit.clear();

kojumäärä = 1;
parkingCounter = 1;


const lataanappi = document.getElementById("Tuo");
const lataaInput = document.getElementById("TuoInput");

lataanappi.addEventListener("click", function () {
    lataaInput.click();
});

lataaInput.addEventListener("change", function () {

    const file = lataaInput.files[0];

    if (!file) {
        return;
    }

    
const reader = new FileReader();

reader.onload = function (event) {

    let rotationWasEnabled = false;

    // Pause autosaving while the plan is being imported
    autosavePaused = true;

    try {
        const suunnitelmaData = JSON.parse(event.target.result);

        validatePlanData(suunnitelmaData);

        rotationWasEnabled = map.pm.globalRotateModeEnabled();

        if (rotationWasEnabled) {
            map.pm.disableGlobalRotateMode();
        }

        clearCurrentPlan();

        // Restore vendors
        suunnitelmaData.kojut.forEach(function (koju) {

            const position = L.latLng(
                koju.coordinates.lat,
                koju.coordinates.lng
            );

            createKoju(
                koju.number,
                koju.name,
                position
            );

            kojumäärä = Math.max(
                kojumäärä,
                koju.number + 1
            );
        });

        // Restore parking areas
        suunnitelmaData.parkit.forEach(function (area) {

            const corners = area.coordinates.map(function (corner) {
                return L.latLng(corner.lat, corner.lng);
            });

            luoparkki(
                area.number,
                area.name,
                area.entrance,
                area.exit,
                null,
                corners
            );

            parkingCounter = Math.max(
                parkingCounter,
                area.number + 1
            );
        });

        // Restore map view
        map.setView(
            [
                suunnitelmaData.map.center.lat,
                suunnitelmaData.map.center.lng
            ],
            suunnitelmaData.map.zoom
        );

        if (typeof map.setBearing === "function") {
            map.setBearing(suunnitelmaData.map.bearing || 0);
        }

        currentPlanName = suunnitelmaData.name || "Untitled plan";

        console.log("Suunnitelma tuotu:", suunnitelmaData);
        alert("Suunnitelma ladattu onnistuneesti!");

    } catch (error) {
        console.error("Virhe suunnitelmaa lataaessa:", error);
        alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");

    } finally {

        // Resume autosaving
        autosavePaused = false;

        // Restore rotation mode if it was previously enabled
        if (rotationWasEnabled) {
            map.pm.enableGlobalRotateMode();
        }

        lataaInput.value = "";
    }
};


    reader.onerror = function () {
        alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");
        lataaInput.value = "";
    };

    reader.readAsText(file);
});


async function testSaveToDatabase() {

    const planData = suunnitelmaData("Database test");

    try {
        await saveCurrentPlan(planData);
        console.log("Plan saved to IndexedDB:", planData);
    } catch (error) {
        console.error("Failed to save plan:", error);
    }
}


// Test loading the plan from IndexedDB
async function testLoadFromDatabase() {

    try {
        const planData = await loadCurrentPlan();

        if (planData) {
            console.log("Plan loaded from IndexedDB:", planData);
        } else {
            console.log("No saved plan found.");
        }

    } catch (error) {
        console.error("Failed to load plan:", error);
    }
}

restorePlanFromDatabase()