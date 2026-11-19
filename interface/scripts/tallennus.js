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
            },
            alueId: vendor.alueId || null,
            alueTunnus: vendor.alueTunnus || null
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
        alueet: Array.from(alueet.values()).map(function (area) {

            return {
                id: area.id,
                kirjain: area.kirjain,
                vari: area.vari,

                koordinaatit: area.layer.getLatLngs()[0].map(function (point) {
                    return {
                        lat: point.lat,
                        lng: point.lng
                    };
                })
            };

        }),
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