const julkaiseKarttaNappi = document.getElementById("julkaiseKartta");

const reservationSettingsDialog =
    document.getElementById("reservationSettingsDialog");

const reservationsEnabledInput =
    document.getElementById("reservationsEnabled");


function requestPublishCode() {
    const dialog = document.getElementById("publishCodeDialog");
    const input = document.getElementById("publishCodeInput");

    input.value = "";
    dialog.showModal();

    return new Promise(function (resolve) {

        dialog.addEventListener("close", function () {

            if (dialog.returnValue !== "publish") {
                resolve(null);
                return;
            }

            const code = input.value;
            input.value = "";

            resolve(code);

        }, { once: true });
    });
}

function requestReservationSettings() {
    const codeInput =
        document.getElementById("reservationCodeInput");

    const confirmInput =
        document.getElementById("reservationCodeConfirmInput");

    reservationsEnabledInput.checked = false;
    codeInput.value = "";
    confirmInput.value = "";

    reservationSettingsDialog.showModal();

    return new Promise(function (resolve) {
        reservationSettingsDialog.addEventListener("close", function () {
            if (reservationSettingsDialog.returnValue !== "continue") {
                resolve(null);
                return;
            }

            const enabled = reservationsEnabledInput.checked;
            const code = codeInput.value;
            const confirmation = confirmInput.value;

            if (enabled && !code.trim()) {
                alert("Varauskoodi ei voi jättää tyhjäksi.");
                resolve(null);
                return;
            }

            if (enabled && code !== confirmation) {
                alert("Varauskoodit eivät täsmää.");
                resolve(null);
                return;
            }

            resolve({
                enabled: enabled,
                code: enabled ? code : null
            });
        }, { once: true });
    });
}


julkaiseKarttaNappi.addEventListener("click", async function () {

    const valinta = document.getElementById("suunnitelmaValinta");
    const suunnitelmanNimi = valinta.value;

    if (!suunnitelmanNimi) {
        alert("Valitse ensin julkaistava suunnitelma.");
        return;
    }

    const vahvistus = confirm(
        "Haluatko julkaista suunnitelman '" + suunnitelmanNimi +
        "'?\n\nJulkaisu korvaa aiemmin julkaistun kartan."
    );

    if (!vahvistus) {
        return;
    }

    try {

        // Pyydetään käyttäjältä julkaisukoodi
        const publishCode = await requestPublishCode();

        if (publishCode === null) {
            return;
        }

        const reservationSettings = await requestReservationSettings();

        if (reservationSettings === null) return;

        if (!publishCode.trim()) {
            throw new Error("Julkaisukoodi ei voi olla tyhjä.");
        }

        julkaiseKarttaNappi.disabled = true;
        julkaiseKarttaNappi.textContent = "Julkaistaan...";

        if (suunnitelmanNimi === currentPlanName) {
            await finishAutosaveBeforeClose();
        }

        // Lähetetään suunnitelman nimi ja julkaisukoodi pääprosessille
        const tulos = await window.planStorage.publishPlan(
            suunnitelmanNimi,
            publishCode
        );

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