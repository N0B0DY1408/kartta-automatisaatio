function testaaKojupaikka() {

    const keskipiste = map.getCenter();

    const kulmat = laskeKojupaikanKulmat(keskipiste, 6, 6);

    const testialue = L.polygon(kulmat, {
        color: "#ff0000",
        weight: 4,
        fillColor: "#ff3333",
        fillOpacity: 0.45
    }).addTo(map);

    console.log("Kojupaikan kulmat:", kulmat);

    console.log(
        "Kartan rotaatio:",
        map.getBearing()
    );

    return testialue;
}

function luoKojupaikka(number, keskipiste, palautettuData = null) {

    // Käytetään tallennettuja kulmapisteitä, jos kojupaikka palautetaan.
    // Muussa tapauksessa luodaan uusi 3 x 3 metrin kojupaikka.
    const kulmat = palautettuData?.coordinates
        ? palautettuData.coordinates.map(function (piste) {
            return L.latLng(piste.lat, piste.lng);
        })
        : laskeKojupaikanKulmat(
            keskipiste,
            3,
            3
        );

    // Luodaan kojupaikan suorakulmio.
    const layer = L.polygon(kulmat, {
        color: "#3388ff",
        weight: 3,
        fillColor: "#3388ff",
        fillOpacity: 0.35
    });

    if (naytaKojutKartalla) {
        layer.addTo(map);
    }

    // Estetään yksittäisten kulmapisteiden muokkaaminen.
    // Siirtäminen ja kiertäminen otetaan käyttöön
    // myöhemmin erillisessä muokkausnäkymässä.
    if (layer.pm) {
        layer.pm.setOptions({
            allowRotation: true,
            allowEditing: true,
            draggable: true,
            hideMiddleMarkers: true,
            addVertexOn: null,
            removeVertexOn: "contextmenu"
        });
    }

    const paikkaData = {
        id: palautettuData?.id ?? crypto.randomUUID(),

        number: number,

        center: palautettuData?.center
            ? L.latLng(
                palautettuData.center.lat,
                palautettuData.center.lng
            )
            : L.latLng(keskipiste.lat, keskipiste.lng),

        width: palautettuData?.width ?? 3,
        height: palautettuData?.height ?? 3,
        rotation: palautettuData?.rotation ?? 0,

        layer: layer,
        coordinates: kulmat,

        alueId: palautettuData?.alueId ?? null,
        alueTunnus: palautettuData?.alueTunnus ?? null,
        alueNumero: palautettuData?.alueNumero ?? null,
        alueelleLisattyJarjestys: palautettuData?.alueelleLisattyJarjestys ?? null,

        status: palautettuData?.status ?? "available",

        varaus: palautettuData?.varaus ?? null
    };

    kojupaikat.set(number, paikkaData);

    // Luodaan kojupaikalle kortti sivupaneeliin.
    luoKojupaikanKortti(paikkaData);

    // Tunnistetaan kojupaikan alue ja päivitetään sen väri.
    paivitaKojupaikanAlue(paikkaData);

    // Kojupaikan valinta muokkausnäkymässä.
    layer.on("click", function (event) {
        valitseKojupaikka(paikkaData, event);
    });

    layer.on("pm:edit", function () {
        paivitaKoordinaatit(paikkaData, layer);
    });

    layer.on("pm:dragend", function () {

        // Päivitetään kojupaikan uusi keskipiste.
        paikkaData.center = L.latLngBounds(
            layer.getLatLngs()[0]
        ).getCenter();

        paivitaKoordinaatit(paikkaData, layer);

        // Päivitetään kojupaikan alue ja väri uuden sijainnin perusteella.
        paivitaKojupaikanAlue(paikkaData);

        // Päivitetään aluekohtaiset kojupaikkanumerot.
        paivitaAlueidenKojupaikkaNumerot();

        // Siirretään myös sivukahvat uuteen sijaintiin.
        const kahvat = kojupaikanKokokahvat.get(
            paikkaData.number
        );

        if (kahvat) {

            const sivupisteet = laskeKojupaikanSivukahvat(
                paikkaData
            );

            Object.entries(kahvat).forEach(function ([sivu, kahva]) {
                kahva.setLatLng(sivupisteet[sivu]);
            });
        }

        // Tallennetaan kojupaikan uusi sijainti ja alue.
        scheduleAutosave();

    });

    layer.on("pm:rotateend", function () {
        paivitaKoordinaatit(paikkaData, layer);
    });

    scheduleAutosave();

    console.log("Kojupaikka luotu:", paikkaData);

    return paikkaData;
}

function paivitaKoordinaatit(paikkaData, layer) {

    paikkaData.coordinates = layer.getLatLngs()[0].map(function (piste) {
        return L.latLng(piste.lat, piste.lng);
    });

    paikkaData.center = L.latLngBounds(
        paikkaData.coordinates
    ).getCenter();

}

function valitseKojupaikka(paikkaData, event = null) {

    if (Number(kytkin.value) !== 0) return;

    // Estetään kartan oma klikkaustapahtuma.
    if (event?.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
    }

    const edellinenValinta = valittuKojupaikka;

    // Poistetaan edellinen valinta.
    if (edellinenValinta) {

        edellinenValinta.layer.pm.disable();
        edellinenValinta.layer.pm.disableLayerDrag();

        paivitaKojupaikanAlue(edellinenValinta);

        const vanhatKahvat = kojupaikanKokokahvat.get(
            edellinenValinta.number
        );

        if (vanhatKahvat) {
            Object.values(vanhatKahvat).forEach(function (kahva) {
                map.removeLayer(kahva);
            });

            kojupaikanKokokahvat.delete(edellinenValinta.number);
        }
    }

    kojupaikanSiirtoKaynnissa = false;

    // Poistetaan korttien vanhat korostukset.
    document.querySelectorAll(".koju").forEach(function (kortti) {
        kortti.classList.remove("valittuKojupaikka");
    });

    // Asetetaan uusi valinta.
    valittuKojupaikka = paikkaData;

    paikkaData.element?.classList.add("valittuKojupaikka");

    // Luodaan kokokahvat.
    const kahvat = luoKojupaikanKokokahvat(paikkaData);

    Object.values(kahvat).forEach(function (kahva) {
        kahva.addTo(map);
    });

    // Sallitaan kojupaikan siirtäminen.
    if (paikkaData.layer.pm) {
        paikkaData.layer.pm.enableLayerDrag();
        kojupaikanSiirtoKaynnissa = true;
    }

    // Piilotetaan muokkaustiedot tavallisen valinnan aikana.
    valitunKojupaikanTiedot.style.display = "none";

    // Korostetaan kartalla valittu kojupaikka.
    paikkaData.layer.setStyle({
        color: "#ffcc00",
        weight: 4,
        fillColor: "#ffcc00",
        fillOpacity: 0.5
    });
}

function paivitaKojupaikanMitat(paikkaData) {

    const uusiLeveys = Number(muokkausKojuLeveys.value);
    const uusiKorkeus = Number(muokkausKojuKorkeus.value);

    // Tarkistetaan, että mitat ovat kelvollisia.
    if (
        !Number.isFinite(uusiLeveys) ||
        !Number.isFinite(uusiKorkeus) ||
        uusiLeveys < 0.5 ||
        uusiKorkeus < 0.5
    ) {
        return;
    }

    // Lasketaan nykyisen suorakulmion keskipiste.
    const keskipiste = paikkaData.center;

    // Lasketaan uudet kulmapisteet.
    const uudetKulmat = laskeKojupaikanKulmat(
        keskipiste,
        uusiLeveys,
        uusiKorkeus,
        paikkaData.rotation
    );

    // Päivitetään suorakulmio kartalla.
    paikkaData.layer.setLatLngs(uudetKulmat);

    // Päivitetään tallennetut tiedot.
    paikkaData.width = uusiLeveys;
    paikkaData.height = uusiKorkeus;
    paikkaData.coordinates = uudetKulmat;

    // Päivitetään myös sivukahvojen sijainnit.
    const kahvat = kojupaikanKokokahvat.get(
        paikkaData.number
    );

    if (kahvat) {

        const sivupisteet = laskeKojupaikanSivukahvat(
            paikkaData
        );

        Object.entries(kahvat).forEach(function ([sivu, kahva]) {
            kahva.setLatLng(sivupisteet[sivu]);
        });
    }

    scheduleAutosave();

}

muokkausKojuLeveys.addEventListener("change", function () {

    if (!valittuKojupaikka) return;

    paivitaKojupaikanMitat(valittuKojupaikka);

});

muokkausKojuKorkeus.addEventListener("change", function () {

    if (!valittuKojupaikka) return;

    paivitaKojupaikanMitat(valittuKojupaikka);

});

muokkausKojuRotaatiokulma.addEventListener("change", function () {

    if (!valittuKojupaikka) return;

    const uusiRotaatiokulma = Number(
        muokkausKojuRotaatiokulma.value
    );

    if (!Number.isFinite(uusiRotaatiokulma)) {
        return;
    }

    const paikkaData = valittuKojupaikka;

    // Tallennetaan uusi kiertokulma.
    paikkaData.rotation = uusiRotaatiokulma;

    // Säilytetään nykyinen keskipiste.
    const keskipiste = paikkaData.center;

    // Lasketaan uudet kulmat.
    const uudetKulmat = laskeKojupaikanKulmat(
        keskipiste,
        paikkaData.width,
        paikkaData.height,
        paikkaData.rotation
    );

    // Päivitetään suorakulmio.
    paikkaData.layer.setLatLngs(uudetKulmat);

    paikkaData.coordinates = uudetKulmat;

    // Päivitetään myös sivukahvojen sijainnit.
    const kahvat = kojupaikanKokokahvat.get(
        paikkaData.number
    );

    if (kahvat) {

        const sivupisteet = laskeKojupaikanSivukahvat(
            paikkaData
        );

        Object.entries(kahvat).forEach(function ([sivu, kahva]) {
            kahva.setLatLng(sivupisteet[sivu]);
        });
    }

    scheduleAutosave();

});

function luoKojupaikanKortti(paikkaData) {

    const paikkaDiv = document.createElement("div");
    paikkaDiv.className = "koju";
    paikkaDiv.dataset.number = paikkaData.number;

    const numeroDisplay = document.createElement("h3");
    numeroDisplay.textContent = `Kojupaikka #${paikkaData.number}`;

    const alueNumeroDisplay = document.createElement("p");
    alueNumeroDisplay.textContent = "Alueen numero: -";

    const tilaDisplay = document.createElement("p");
    tilaDisplay.textContent = "Tila: Vapaa";

    paikkaData.element = paikkaDiv;
    paikkaData.alueNumeroDisplay = alueNumeroDisplay;
    paikkaData.tilaDisplay = tilaDisplay;

    // Muokkauspainike.
    const muokkaaButton = document.createElement("button");
    muokkaaButton.textContent = "Muokkaa";
    muokkaaButton.className = "kojuMuokkaaButton";

    muokkaaButton.addEventListener("click", function (event) {

        event.stopPropagation();

        valitseKojupaikka(paikkaData);

        valitunKojupaikanTiedot.style.display = "block";

        muokkausKojuNumero.textContent = paikkaData.number;
        muokkausKojuLeveys.value = paikkaData.width;
        muokkausKojuKorkeus.value = paikkaData.height;
        muokkausKojuRotaatiokulma.value = paikkaData.rotation;

    });

    // Poistopainike.
    const poistaButton = document.createElement("button");
    poistaButton.textContent = "Poista";

    paikkaDiv.append(
        numeroDisplay,
        alueNumeroDisplay,
        tilaDisplay,
        muokkaaButton,
        poistaButton
    );
    
    // Kortin klikkaaminen valitsee kojupaikan kartalta.
    paikkaDiv.addEventListener("click", function (event) {

        // Painikkeiden klikkaukset käsitellään erikseen.
        if (event.target.closest("button")) return;

        valitseKojupaikka(paikkaData);

    });

    // Sijoitetaan kortti oikeaan alueeseen.
    siirraKojupaikkaOikeaanRyhmään(paikkaData);

    // Kortin hover korostaa kartalla olevaa paikkaa.
    paikkaDiv.addEventListener("mouseenter", function () {
        paikkaData.layer.openPopup();
    });

    paikkaDiv.addEventListener("mouseleave", function () {
        paikkaData.layer.closePopup();
    });

    // Poistetaan kojupaikka.
    poistaButton.addEventListener("click", function () {

        map.removeLayer(paikkaData.layer);
        paikkaDiv.remove();

        const kahvat = kojupaikanKokokahvat.get(
            paikkaData.number
        );

        if (kahvat) {
            Object.values(kahvat).forEach(function (kahva) {
                map.removeLayer(kahva);
            });

            kojupaikanKokokahvat.delete(paikkaData.number);
        }

        if (valittuKojupaikka === paikkaData) {
            valittuKojupaikka = null;
            valitunKojupaikanTiedot.style.display = "none";
        }

        kojupaikat.delete(paikkaData.number);

        paivitaAlueidenKojupaikkaMaarat();
        paivitaAlueidenKojupaikkaNumerot();

        scheduleAutosave();
    });

}