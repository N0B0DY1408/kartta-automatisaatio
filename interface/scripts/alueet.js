function luoAlue(id, kirjain, vari, koordinaatit, layer = null) {

    if (!layer) {
        layer = L.polygon(koordinaatit);
    }

    layer.setStyle({
        color: vari,
        fillColor: vari,
        fillOpacity: 0.2,
        weight: 2
    });

    const alueData = {
        id: id,
        kirjain: kirjain,
        vari: vari,
        koordinaatit: koordinaatit,
        layer: layer,
        element: null
    };

    // Lisätään alue kartalle, jos alueiden näkymä on käytössä.
    if (naytaAlueetKartalla) {
        layer.addTo(map);
    }

    alueet.set(id, alueData);

    // Luodaan alueelle oma kojuryhmä tavalliseen näkymään.
    const kojuRyhmanDetails = document.createElement("details");
    kojuRyhmanDetails.className = "kojuAlueRyhmä";
    kojuRyhmanDetails.open = true;

    // Alueen otsikko, jota painamalla ryhmän voi avata tai sulkea.
    const kojuRyhmanOtsikko = document.createElement("summary");
    kojuRyhmanOtsikko.textContent = `Alue ${kirjain}`;

    // Säiliö alueen kojujen korteille.
    const kojuLista = document.createElement("div");
    kojuLista.className = "kojuAlueLista";

    kojuRyhmanDetails.append(
        kojuRyhmanOtsikko,
        kojuLista
    );

    // Tallennetaan kojusäiliö alueen tietoihin.
    alueData.kojuRyhmanElement = kojuRyhmanDetails;
    alueData.kojuListaElement = kojuLista;

    // Lisätään ryhmä sivupaneeliin.
    document.getElementById("kojuAlueRyhmaContainer")
        .appendChild(kojuRyhmanDetails);

    // Luodaan alueelle oma elementti sivupaneeliin.
    const alueDiv = document.createElement("div");
    alueDiv.className = "alue";

    alueData.element = alueDiv;

    const otsikko = document.createElement("h3");
    otsikko.textContent = `Alue ${kirjain}`;

    const variTieto = document.createElement("p");
    variTieto.textContent = `Väri: ${vari}`;

    const kojuMaara = document.createElement("p");
    kojuMaara.className = "alueKojuMaara";
    kojuMaara.textContent = "Kojupaikat: 0 kpl";

    alueData.kojuMaaraElement = kojuMaara;

    
    const variNayte = document.createElement("button");
    variNayte.className = "alueVariNayte";
    variNayte.type = "button";
    variNayte.title = "Vaihda alueen väri";
    

    variNayte.style.backgroundColor = vari;

    const variValitsin = document.createElement("input");
    variValitsin.type = "color";
    variValitsin.value = vari;
    variValitsin.style.display = "none";

    // Avataan värivalitsin värinäytettä painamalla.
    variNayte.addEventListener("click", function () {
        variValitsin.click();
    });

    // Päivitetään alueen väri valinnan jälkeen.
    variValitsin.addEventListener("input", function () {

        const uusiVari = variValitsin.value;

        // Päivitetään alueen tiedot.
        alueData.vari = uusiVari;

        // Päivitetään karttapolygonin väri.
        layer.setStyle({
            color: uusiVari,
            fillColor: uusiVari
        });

        // Päivitetään sivupaneelin värinäyte.
        variNayte.style.backgroundColor = uusiVari;

        // Päivitetään värin tekstimuotoinen tieto.
        variTieto.textContent = `Väri: ${uusiVari}`;

        // Tarkistetaan kaikkien kojupaikkojen alueet ja värit.
        kojupaikat.forEach(function (paikka) {
            paivitaKojupaikanAlue(paikka);
        });

        scheduleAutosave();
    });


    const poistaButton = document.createElement("button");
    poistaButton.textContent = "Poista alue";

    poistaButton.addEventListener("click", function () {

        // Lopetetaan alueiden piirtäminen ennen poistamista.
        if (alueidenPiirtoKaynnissa) {
            vaihdaAlueidenPiirtotila();
        }

        map.removeLayer(layer);

        alueDiv.remove();

        alueet.delete(id);

        scheduleAutosave();
    });

    alueDiv.append(
        otsikko,
        kojuMaara,
        variTieto,
        variNayte,
        variValitsin,
        poistaButton
    );

    document.getElementById("alueLista").appendChild(alueDiv);

    // Alueen korostaminen kartalla sivupaneelin kautta.
    alueDiv.addEventListener("mouseenter", function () {
        layer.openPopup();
    });

    alueDiv.addEventListener("mouseleave", function () {
        layer.closePopup();
    });

    // Tarkistetaan kaikkien olemassa olevien kojupaikkojen alueet.
    kojupaikat.forEach(function (paikka) {
        paivitaKojupaikanAlue(paikka);
    });

    scheduleAutosave();

    return alueData;
}


function etsiAlueKoordinaateilla(koordinaatit) {

    let loydettyAlue = null;

    alueet.forEach(function (alue) {

        const pisteet = alue.koordinaatit;

        let sisalla = false;

        for (
            let i = 0, j = pisteet.length - 1;
            i < pisteet.length;
            j = i++
        ) {

            const xi = pisteet[i].lng;
            const yi = pisteet[i].lat;

            const xj = pisteet[j].lng;
            const yj = pisteet[j].lat;

            const leikkaa =
                ((yi > koordinaatit.lat) !== (yj > koordinaatit.lat)) &&
                (
                    koordinaatit.lng <
                    (xj - xi) *
                    (koordinaatit.lat - yi) /
                    (yj - yi) + xi
                );

            if (leikkaa) {
                sisalla = !sisalla;
            }
        }

        if (sisalla) {
            loydettyAlue = alue;
        }

    });

    return loydettyAlue;
}

function siirraKojupaikkaOikeaanRyhmään(paikkaData) {

    let kohdeLista;

    if (paikkaData.alueId) {

        const alue = alueet.get(paikkaData.alueId);

        if (alue && alue.kojuListaElement) {
            kohdeLista = alue.kojuListaElement;
        }

    } else {
        kohdeLista = document.getElementById("alueettomatKojutLista");
    }

    if (!kohdeLista || !paikkaData.element) return;

    // Etsitään ensimmäinen kortti, jonka järjestysnumero
    // on suurempi kuin tämän kojupaikan.
    const seuraavaKortti = Array.from(kohdeLista.children).find(
        function (element) {

            const toinenPaikka = kojupaikat.get(
                Number(element.dataset.number)
            );

            return toinenPaikka &&
                toinenPaikka !== paikkaData &&
                Number.isFinite(toinenPaikka.alueelleLisattyJarjestys) &&
                toinenPaikka.alueelleLisattyJarjestys >
                    paikkaData.alueelleLisattyJarjestys;
        }
    );

    // Lisätään kortti oikeaan kohtaan listassa.
    kohdeLista.insertBefore(
        paikkaData.element,
        seuraavaKortti || null
    );
}

function paivitaKojupaikanAlue(paikkaData) {

    // Etsitään alue kojupaikan keskipisteen perusteella.
    const loydettyAlue = etsiAlueKoordinaateilla(
        paikkaData.center
    );

    // Selvitetään kojupaikan uusi alue.
    const uusiAlueId = loydettyAlue ? loydettyAlue.id : null;

    // Annetaan uusi järjestysnumero vain, jos alue vaihtuu
    // tai kojupaikalla ei vielä ole aluekohtaista järjestysnumeroa.
    if (
        uusiAlueId !== paikkaData.alueId ||
        (uusiAlueId !== null && paikkaData.alueelleLisattyJarjestys == null)
    ) {

        if (uusiAlueId !== null) {

            const jarjestysNumerot = Array.from(kojupaikat.values())
                .filter(function (paikka) {
                    return paikka !== paikkaData &&
                        paikka.alueId === uusiAlueId &&
                        Number.isFinite(paikka.alueelleLisattyJarjestys);
                })
                .map(function (paikka) {
                    return paikka.alueelleLisattyJarjestys;
                });

            paikkaData.alueelleLisattyJarjestys =
                jarjestysNumerot.length > 0
                    ? Math.max(...jarjestysNumerot) + 1
                    : 1;

        } else {
            paikkaData.alueelleLisattyJarjestys = null;
        }
    }

    if (loydettyAlue) {

        paikkaData.alueId = loydettyAlue.id;
        paikkaData.alueTunnus = loydettyAlue.kirjain;

        // Päivitetään kojupaikan väri alueen väriksi.
        paikkaData.layer.setStyle({
            color: loydettyAlue.vari,
            fillColor: loydettyAlue.vari
        });

    } else {

        paikkaData.alueId = null;
        paikkaData.alueTunnus = null;

        // Palautetaan oletusväri.
        paikkaData.layer.setStyle({
            color: "#3388ff",
            fillColor: "#3388ff"
        });
    }
    // Päivitetään kojupaikan kortin sijainti oikeaan ryhmään.
    siirraKojupaikkaOikeaanRyhmään(paikkaData);
}

window.testaaAlueenTunnistus = function () {

    alueet.forEach(function (alue) {

        const keskipiste = alue.layer.getBounds().getCenter();

        const loydetty = etsiAlueKoordinaateilla(keskipiste);

        console.log(
            `Alue ${alue.kirjain}:`,
            loydetty ? loydetty.kirjain : "Ei tunnistettu"
        );

    });

    // Tarkistetaan kaikkien olemassa olevien kojupaikkojen alueet.
    kojupaikat.forEach(function (paikka) {
        paivitaKojupaikanAlue(paikka);
    });

};

function paivitaAlueidenKojupaikkaMaarat() {

    alueet.forEach(function (alue) {

        let maara = 0;

        kojupaikat.forEach(function (paikka) {

            if (paikka.alueId === alue.id) {
                maara++;
            }

        });

        if (alue.kojuMaaraElement) {
            alue.kojuMaaraElement.textContent =
                `Kojupaikat: ${maara} kpl`;
        }

    });
}

function paivitaAlueidenKojupaikkaNumerot() {

    // Käydään jokainen alue läpi.
    alueet.forEach(function (alue) {

        // Haetaan kyseisen alueen kojupaikat.
        const alueenKojupaikat = Array.from(kojupaikat.values())
            .filter(function (paikka) {
                return paikka.alueId === alue.id;
            });

        // Järjestetään kojupaikat alueelle saapumisjärjestyksen mukaan.
        alueenKojupaikat.sort(function (a, b) {
            return a.alueelleLisattyJarjestys -
                b.alueelleLisattyJarjestys;
        });

        // Annetaan alueen sisäiset numerot.
        alueenKojupaikat.forEach(function (paikka, index) {

            paikka.alueNumero = index + 1;

            if (paikka.alueNumeroDisplay) {
                paikka.alueNumeroDisplay.textContent =
                    `Alue ${alue.kirjain} / ${paikka.alueNumero}`;
            }

        });

    });

    // Alueettomilla kojupaikoilla ei ole aluekohtaista numeroa.
    kojupaikat.forEach(function (paikka) {

        if (paikka.alueId === null) {
            paikka.alueNumero = null;

            if (paikka.alueNumeroDisplay) {
                paikka.alueNumeroDisplay.textContent =
                    "Alueen numero: -";
            }
        }

    });
}