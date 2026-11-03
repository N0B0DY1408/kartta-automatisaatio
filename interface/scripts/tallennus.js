const tallennusNappi = document.getElementById('tallenna');

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

tallennusNappi.addEventListener('click', function() {

    const suunnitelmanNimi = prompt('Anna suunnitelmalle nimi:');

    if (!suunnitelmanNimi || !suunnitelmanNimi.trim()) {
        return;
    }

    // Collect the complete plan using our function
    const planData = suunnitelmaData(suunnitelmanNimi.trim());

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
    downloadLink.download = suunnitelmanNimi.trim() + ".json";

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


// Restore the saved plan from IndexedDB
async function restorePlanFromDatabase() {

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

        // Restore vendors
        planData.kojut.forEach(function (koju) {

            const position = L.latLng(
                koju.coordinates.lat,
                koju.coordinates.lng
            );

            createKoju(koju.number, koju.name, position);

            kojumäärä = Math.max(kojumäärä, koju.number + 1);
        });

        // Restore parking areas
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

            parkingCounter = Math.max(parkingCounter, area.number + 1);
        });

        // Restore map view
        map.setView(
            [planData.map.center.lat, planData.map.center.lng],
            planData.map.zoom
        );

        if (typeof map.setBearing === "function") {
            map.setBearing(planData.map.bearing || 0);
        }

        console.log("Plan restored from IndexedDB:", planData);

    } catch (error) {
        console.error("Failed to restore plan:", error);
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

    try {
        const suunnitelmaData = JSON.parse(event.target.result);

        rotationWasEnabled = map.pm.globalRotateModeEnabled();

        if (rotationWasEnabled) {
            map.pm.disableGlobalRotateMode();
        }
            if (
                suunnitelmaData.version !== 1 ||
                !Array.isArray(suunnitelmaData.kojut) ||
                !Array.isArray(suunnitelmaData.parkit) ||
                !suunnitelmaData.map
            ) {
                throw new Error("Valittu tiedosto ei toimi.");
            }

            clearCurrentPlan();

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

            // Recreate parking areas using the shared creation function
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

                // Keep the next parking number unique
                parkingCounter = Math.max(
                    parkingCounter,
                    area.number + 1
                );

            });

            map.setView(
                [suunnitelmaData.map.center.lat, suunnitelmaData.map.center.lng],
                suunnitelmaData.map.zoom
            );

            if (typeof map.setBearing === "function") {
                map.setBearing(suunnitelmaData.map.bearing || 0);
            }

            if (rotationWasEnabled) {
            map.pm.enableGlobalRotateMode();
        }

            console.log("Suunnitelma tuotu:", suunnitelmaData);
        alert("Suunnitelma ladattu onnistuneesti!");

    } catch (error) {
        console.error("Virhe suunnitelmaa lataaessa:", error);
        alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");

    } finally {
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

restorePlanFromDatabase();