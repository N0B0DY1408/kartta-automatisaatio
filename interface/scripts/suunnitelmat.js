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
        autosaveTimer = null;

        // Odotetaan mahdollisen keskeneräisen tallennuksen valmistumista
        if (autosaveInProgress) {
            await autosaveInProgress;
        }

        // Tallennetaan vielä mahdolliset odottavat muutokset
        if (autosavePending) {
            await savePendingChanges();
        }

        // Tyhjennetään nykyinen kartta vasta tallennusten jälkeen
        clearCurrentPlan();

        // Asetetaan uusi suunnitelma aktiiviseksi
        currentPlanName = uusiNimi;
        currentPlanId = crypto.randomUUID();

        localStorage.setItem("viimeksiAktiivinenSuunnitelma", currentPlanName);

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