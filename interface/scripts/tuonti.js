
const lataanappi = document.getElementById("Tuo");
const lataaInput = document.getElementById("TuoInput");

lataanappi.addEventListener("click", function () {
    lataaInput.click();
});


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
        !Array.isArray(plan.kojupaikat) ||
        !Array.isArray(plan.parkit)
    ) {
        throw new Error("kojupaikka tai parkki data ongelma.");
    }

    // Alueet ovat vapaaehtoisia vanhoissa suunnitelmissa.
    if (plan.alueet === undefined) {
        plan.alueet = [];
    }

    if (!Array.isArray(plan.alueet)) {
        throw new Error("alueiden tiedot ovat virheelliset.");
    }

    const areaIds = new Set();

    plan.alueet.forEach(function (area, index) {

        if (!isObject(area)) {
            throw new Error("Virhe alueen kohdalla " + index);
        }

        if (
            typeof area.id !== "string" ||
            area.id.trim() === ""
        ) {
            throw new Error("Alueelta puuttuu tunniste.");
        }

        if (areaIds.has(area.id)) {
            throw new Error("Alueen tunniste on jo käytössä.");
        }

        areaIds.add(area.id);

        if (
            typeof area.kirjain !== "string" ||
            area.kirjain.trim() === ""
        ) {
            throw new Error("Alueen kirjain puuttuu.");
        }

        if (
            typeof area.vari !== "string" ||
            !/^#[0-9A-Fa-f]{6}$/.test(area.vari)
        ) {
            throw new Error("Alueen väri on virheellinen.");
        }

        if (
            !Array.isArray(area.koordinaatit) ||
            area.koordinaatit.length < 3
        ) {
            throw new Error("Alueen pitää sisältää vähintään kolme koordinaattia.");
        }

        area.koordinaatit.forEach(function (corner) {
            validateCoordinates(
                corner,
                "Alue " + area.kirjain
            );
        });
    });

    const kojupaikkaNumbers = new Set();

    plan.kojupaikat.forEach(function (paikka, index) {

        if (!isObject(paikka)) {
            throw new Error("Virhe kojupaikan kohdalla " + index);
        }

        if (
            !Number.isInteger(paikka.number) ||
            paikka.number < 1
        ) {
            throw new Error("Virhe kojupaikan numeron kanssa.");
        }

        if (kojupaikkaNumbers.has(paikka.number)) {
            throw new Error("Kojupaikan numero on jo käytössä.");
        }

        kojupaikkaNumbers.add(paikka.number);

        validateCoordinates(
            paikka.center,
            "Kojupaikka " + paikka.number
        );

        if (
            !Number.isFinite(paikka.width) ||
            paikka.width <= 0 ||
            !Number.isFinite(paikka.height) ||
            paikka.height <= 0
        ) {
            throw new Error("Kojupaikan mitat ovat virheelliset.");
        }

        if (!Number.isFinite(paikka.rotation)) {
            throw new Error("Kojupaikan kierto on virheellinen.");
        }
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

lataaInput.addEventListener("change", function () {

    const file = lataaInput.files[0];

    if (!file) {
        return;
    }

    
    const reader = new FileReader();

    reader.onload = async function (event) {

        let rotationWasEnabled = false;

        // Pause autosaving while the plan is being imported
        autosavePaused = true;

        let tuontiOnnistui = false;

        try {
            const suunnitelmaData = JSON.parse(event.target.result);

            validatePlanData(suunnitelmaData);

            rotationWasEnabled = map.pm.globalRotateModeEnabled();

            if (rotationWasEnabled) {
                map.pm.disableGlobalRotateMode();
            }

            clearCurrentPlan();

            // Palautetaan fyysiset kojupaikat
            suunnitelmaData.kojupaikat.forEach(function (paikka) {

                const keskipiste = L.latLng(
                    paikka.center.lat,
                    paikka.center.lng
                );

                luoKojupaikka(
                    paikka.number,
                    keskipiste,
                    paikka
                );

                kojupaikkaMaara = Math.max(
                    kojupaikkaMaara,
                    paikka.number + 1
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

            // Palautetaan JSON-tiedoston alueet
            if (Array.isArray(suunnitelmaData.alueet)) {

                suunnitelmaData.alueet.forEach(function (area) {

                    const koordinaatit = area.koordinaatit.map(function (point) {
                        return L.latLng(point.lat, point.lng);
                    });

                    luoAlue(
                        area.id,
                        area.kirjain,
                        area.vari,
                        koordinaatit
                    );

                });

            }

            // Päivitetään alueiden kojupaikkanumerointi
            paivitaAlueidenKojupaikkaNumerot();

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
            currentPlanId = suunnitelmaData.id || crypto.randomUUID();

            localStorage.setItem(
                "viimeksiAktiivinenSuunnitelma",
                currentPlanName
            );

            console.log("Suunnitelma tuotu:", suunnitelmaData);
            alert("Suunnitelma ladattu onnistuneesti!");

            tuontiOnnistui = true;

        } catch (error) {
            console.error("Virhe suunnitelmaa lataaessa:", error);
            alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");

        } finally {

            // Käynnistetään automaattitallennus uudelleen
            autosavePaused = false;

            if (tuontiOnnistui) {
                scheduleAutosave();
            }

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