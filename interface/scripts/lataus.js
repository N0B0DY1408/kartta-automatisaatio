function clearCurrentPlan() {

    for (const koju of kojut.values()) {
        map.removeLayer(koju.marker);
        koju.element.remove();
    }

    for (const area of parkit.values()) {
        map.removeLayer(area.layer);
        area.element.remove();
    }

    alueet.forEach(function (area) {
        map.removeLayer(area.layer);
    });

    alueet.clear();

    document.getElementById("kojuAlueRyhmaContainer").innerHTML = "";

    kojut.clear();
    parkit.clear();

    kojumäärä = 1;
    parkingCounter = 1;
}


async function restorePlanFromDatabase(planName = currentPlanName) {

    autosavePaused = true;

    try {

        // Pysäytetään odottava automaattitallennuksen ajastin
        clearTimeout(autosaveTimer);
        autosaveTimer = null;

        // Odotetaan mahdollisen tallennuksen valmistumista
        if (autosaveInProgress) {
            await autosaveInProgress;
        }

        // Tallennetaan vielä mahdolliset odottavat muutokset
        if (autosavePending) {
            await savePendingChanges();
        }

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

        localStorage.setItem("viimeksiAktiivinenSuunnitelma", currentPlanName);

        // Palautetaan kojut kartalle
        planData.kojut.forEach(function (koju) {

            const position = L.latLng(
                koju.coordinates.lat,
                koju.coordinates.lng
            );

            createKoju(koju.number, koju.name, position);

            const palautettuKoju = kojut.get(koju.number);

            if (palautettuKoju) {
                palautettuKoju.alueId = koju.alueId || null;
                palautettuKoju.alueTunnus = koju.alueTunnus || null;
            }

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

        // Palautetaan suunnitelman alueet
        if (Array.isArray(planData.alueet)) {

            planData.alueet.forEach(function (area) {

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

        paivitaAlueidenKojuNumerot();

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


const viimeksiAktiivinenSuunnitelma =
    localStorage.getItem("viimeksiAktiivinenSuunnitelma");

if (viimeksiAktiivinenSuunnitelma) {
    restorePlanFromDatabase(viimeksiAktiivinenSuunnitelma);
}