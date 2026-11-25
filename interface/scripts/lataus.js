function clearCurrentPlan() {

    for (const area of parkit.values()) {
        map.removeLayer(area.layer);
        area.element.remove();
    }

    // Poistetaan fyysiset kojupaikat ja niiden kokokahvat.
    for (const paikka of kojupaikat.values()) {

        map.removeLayer(paikka.layer);

        if (paikka.element) {
            paikka.element.remove();
        }

        const kahvat = kojupaikanKokokahvat.get(paikka.number);

        if (kahvat) {
            Object.values(kahvat).forEach(function (kahva) {
                map.removeLayer(kahva);
            });

            kojupaikanKokokahvat.delete(paikka.number);
        }
    }

    // Nollataan kojupaikan valinta ja muokkausnäkymä.
    valittuKojupaikka = null;
    valitunKojupaikanTiedot.style.display = "none";

    alueet.forEach(function (area) {
        map.removeLayer(area.layer);

        if (area.element) {
            area.element.remove();
        }
    });

    alueet.clear();

    document.getElementById("kojuAlueRyhmaContainer").innerHTML = "";
    document.getElementById("alueLista").innerHTML = "";

    kojupaikat.clear();
    parkit.clear();

    kojupaikkaMaara = 1;
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
            !Array.isArray(planData.kojupaikat) ||
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

        // Palautetaan fyysiset kojupaikat kartalle.
        if (Array.isArray(planData.kojupaikat)) {

            planData.kojupaikat.forEach(function (paikka) {

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
        }

        paivitaAlueidenKojupaikkaNumerot();

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