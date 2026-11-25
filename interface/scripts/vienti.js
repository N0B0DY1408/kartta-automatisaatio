
const vieSuunnitelmaNappi = document.getElementById("vie");

vieSuunnitelmaNappi.addEventListener("click", async function () {

    try {
        // Muodostetaan aktiivisen suunnitelman tiedot
        const planData = suunnitelmaData(currentPlanName);

        console.log("JSON-vientiin lähtevät tiedot:", planData);

        // Pyydetään Electronia viemään JSON-tiedosto
        const tulos = await window.planStorage.exportPlan(planData);

        if (tulos.canceled) {
            return;
        }

        if (tulos.success) {
            updateSaveStatus("saved", "Suunnitelma viety onnistuneesti!");
            alert("Suunnitelma viety onnistuneesti!");
        }

    } catch (error) {
        console.error("Suunnitelman vienti epäonnistui:", error);

        alert(
            "Suunnitelman vienti epäonnistui: " + error.message
        );
    }
});
