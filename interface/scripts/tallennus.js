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

    let suunnitelmanNimi = currentPlanName;

    // Kysytään nimi vain ensimmäisellä tallennuskerralla
    if (!suunnitelmanNimi || suunnitelmanNimi === "Untitled plan") {
        suunnitelmanNimi = await kysyTallennusNimi();
    }

    if (!suunnitelmanNimi) {
        return;
    }

    try {
        // Asetetaan suunnitelman nimi nykyiseksi nimeksi
        currentPlanName = suunnitelmanNimi;

        // Kerätään suunnitelman tiedot
        const planData = suunnitelmaData(currentPlanName);

        // Tallennetaan nykyiseen tiedostoon
        const tulos = await savePlan(currentPlanName, planData);

        if (tulos.success) {
            updateSaveStatus("saved", "Suunnitelma tallennettu!");
            console.log("Suunnitelma tallennettu:", planData);
        }

    } catch (error) {
        updateSaveStatus("error", "Tallennus epäonnistui");
        console.error("Tallennusvirhe:", error);
        alert("Tallennus epäonnistui: " + error.message);
    }
});


const julkaiseKarttaNappi = document.getElementById("julkaiseKartta");

julkaiseKarttaNappi.addEventListener("click", async function () {

    const valinta = document.getElementById("suunnitelmaValinta");
    const suunnitelmanNimi = valinta.value;

    // Tarkistetaan, että suunnitelma on valittu
    if (!suunnitelmanNimi) {
        alert("Valitse ensin julkaistava suunnitelma.");
        return;
    }

    // Varmistetaan käyttäjän valinta
    const vahvistus = confirm(
        "Haluatko julkaista suunnitelman '" + suunnitelmanNimi +
        "'?\n\nJulkaisu korvaa aiemmin julkaistun kartan."
    );

    if (!vahvistus) {
        return;
    }

    try {
        julkaiseKarttaNappi.disabled = true;
        julkaiseKarttaNappi.textContent = "Julkaistaan...";

        // Jos julkaistava suunnitelma on aktiivinen,
        // viimeistellään sen odottavat automaattitallennukset.
        if (suunnitelmanNimi === currentPlanName) {
            await finishAutosaveBeforeClose();
        }

        // Käynnistetään PowerShell-julkaisu
        const tulos = await window.planStorage.publishPlan(suunnitelmanNimi);

        if (!tulos.success) {
            throw new Error(tulos.message || "Julkaisu epäonnistui.");
        }

        console.log("Suunnitelma julkaistu:", suunnitelmanNimi);

        alert(
            "Kartta julkaistiin onnistuneesti!\n\n" +
            "Julkaistu suunnitelma: " + suunnitelmanNimi
        );

    } catch (error) {
        console.error("Kartanjulkaisu epäonnistui:", error);

        alert(
            "Karttaa ei voitu julkaista.\n\n" +
            error.message
        );

    } finally {
        julkaiseKarttaNappi.disabled = false;
        julkaiseKarttaNappi.textContent = "Julkaise kartta";
    }
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
function kysyTallennusNimi(oletusNimi = currentPlanName) {
    return new Promise(function (resolve) {
        const dialog = document.getElementById("savePlanDialog");
        const input = document.getElementById("savePlanNameInput");

        input.value = oletusNimi || "";

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
async function restorePlanFromDatabase(planName = currentPlanName) {

    autosavePaused = true;

    try {
        // Haetaan nimellä valittu suunnitelma
        const planData = await loadPlan(planName);

        if (!planData) {
            console.log("Suunnitelmaa ei löytynyt:", planName);
            return false;
        }

        // Tarkistetaan suunnitelman perustiedot ennen kartan tyhjentämistä
        if (
            planData.version !== 1 ||
            !Array.isArray(planData.kojut) ||
            !Array.isArray(planData.parkit) ||
            !planData.map ||
            !planData.map.center ||
            typeof planData.map.zoom !== "number"
        ) {
            throw new Error("Suunnitelman tiedot ovat virheellisessä muodossa.");
        }

        // Tyhjennetään vanha kartta vasta onnistuneen tarkistuksen jälkeen
        clearCurrentPlan();

        // Asetetaan valittu suunnitelma aktiiviseksi
        currentPlanName = planData.name || planName;
        currentPlanId = currentPlanName;

        // Palautetaan kojut kartalle
        planData.kojut.forEach(function (koju) {

            const position = L.latLng(
                koju.coordinates.lat,
                koju.coordinates.lng
            );

            createKoju(koju.number, koju.name, position);

            kojumäärä = Math.max(kojumäärä, koju.number + 1);
        });

        // Palautetaan parkkialueet kartalle
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

        // Palautetaan kartan näkymä
        map.setView(
            [planData.map.center.lat, planData.map.center.lng],
            planData.map.zoom
        );

        if (typeof map.setBearing === "function") {
            map.setBearing(planData.map.bearing || 0);
        }

        console.log("Suunnitelma ladattu:", planData);

        updateSaveStatus("saved", "Suunnitelma ladattu: " + currentPlanName);

        return true;

    } catch (error) {
        console.error("Suunnitelman lataaminen epäonnistui:", error);
        alert("Suunnitelman lataaminen epäonnistui: " + error.message);

        return false;

    } finally {
        autosavePaused = false;
        console.log("Automaattitallennus jatkuu.");
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

const uusiSuunnitelmaNappi = document.getElementById("uusiSuunnitelma");

uusiSuunnitelmaNappi.addEventListener("click", async function () {

    // Kysytään uuden suunnitelman nimi
    const uusiNimi = await kysyTallennusNimi("");

    if (!uusiNimi) {
        return;
    }

    // Tarkistetaan nimen sallittu muoto
    if (!/^[a-zA-Z0-9åäöÅÄÖ _-]+$/.test(uusiNimi)) {
        alert("Suunnitelman nimessä on kiellettyjä merkkejä.");
        return;
    }

    try {
        // Tarkistetaan, onko samanniminen suunnitelma jo olemassa
        const suunnitelmat = await getAllPlans();

        const nimiOnKaytossa = suunnitelmat.some(function (plan) {
            return plan.name.toLowerCase() === uusiNimi.toLowerCase();
        });

        if (nimiOnKaytossa) {
            alert("Samanniminen suunnitelma on jo olemassa. Valitse toinen nimi.");
            return;
        }

        // Keskeytetään automaattitallennus alustamisen ajaksi
        autosavePaused = true;
        clearTimeout(autosaveTimer);

        // Tyhjennetään nykyinen kartta
        clearCurrentPlan();

        // Asetetaan uusi suunnitelma aktiiviseksi
        currentPlanName = uusiNimi;
        currentPlanId = uusiNimi;

        // Luodaan uuden suunnitelman tiedot
        const planData = suunnitelmaData(uusiNimi);

        // Tallennetaan uusi tyhjä suunnitelma
        const tulos = await savePlan(uusiNimi, planData);

        if (!tulos.success) {
            throw new Error("Uuden suunnitelman tallennus epäonnistui.");
        }

        updateSaveStatus("saved", "Uusi suunnitelma luotu!");

        console.log("Uusi suunnitelma luotu:", planData);

    } catch (error) {
        console.error("Uuden suunnitelman luontivirhe:", error);
        alert("Uuden suunnitelman luominen epäonnistui: " + error.message);

    } finally {
        // Käynnistetään automaattitallennus uudelleen
        autosavePaused = false;
        await paivitaSuunnitelmaLista();
    }
});

async function paivitaSuunnitelmaLista() {

    const valinta = document.getElementById("suunnitelmaValinta");

    try {
        // Haetaan kaikki tallennetut suunnitelmat
        const suunnitelmat = await getAllPlans();

        // Tyhjennetään vanha lista
        valinta.innerHTML = "";

        // Lisätään oletusvalinta
        const oletus = document.createElement("option");
        oletus.value = "";
        oletus.textContent = "Valitse suunnitelma";
        valinta.appendChild(oletus);

        // Lisätään suunnitelmat valintalistaan
        suunnitelmat.forEach(function (plan) {

            const vaihtoehto = document.createElement("option");

            vaihtoehto.value = plan.name;
            vaihtoehto.textContent = plan.name;

            valinta.appendChild(vaihtoehto);
        });

    } catch (error) {
        console.error("Suunnitelmien hakeminen epäonnistui:", error);
    }
}

const avaaSuunnitelmaNappi = document.getElementById("avaaSuunnitelma");

avaaSuunnitelmaNappi.addEventListener("click", async function () {

    const valinta = document.getElementById("suunnitelmaValinta");
    const suunnitelmanNimi = valinta.value;

    if (!suunnitelmanNimi) {
        alert("Valitse ensin avattava suunnitelma.");
        return;
    }

    const onnistui = await restorePlanFromDatabase(suunnitelmanNimi);

    if (onnistui) {
        await paivitaSuunnitelmaLista();
        console.log("Avattu suunnitelma:", suunnitelmanNimi);
    }
});

paivitaSuunnitelmaLista();