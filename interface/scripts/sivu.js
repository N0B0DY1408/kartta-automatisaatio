const kytkin = document.getElementById("nakymaSwitch");

const tavallinenNakyma = document.getElementById("tavallinenNakyma");

const kojupaikkaMuokkausNakyma = document.getElementById("kojupaikkaMuokkausSisalto");

const alueNakyma = document.getElementById("alueNakyma");

const nakymaTeksti = document.getElementById("nakymaTeksti");

const naytaKojutKytkin = document.getElementById("naytaKojut");

const naytaParkitKytkin = document.getElementById("naytaParkit");

// Kojupaikan muokkausnäkymän kentät.
const valitunKojupaikanTiedot = document.getElementById("valitunKojupaikanTiedot");

const muokkausKojuNumero = document.getElementById("muokkausKojuNumero");

const muokkausKojuNimi = document.getElementById("muokkausKojuNimi");

const muokkausKojuLeveys = document.getElementById("muokkausKojuLeveys");

const muokkausKojuKorkeus = document.getElementById("muokkausKojuKorkeus");

const muokkausKojuRotaatiokulma = document.getElementById("muokkausKojuRotaatiokulma");

let kojupaikanSiirtoKaynnissa = false;


// Näkymän vaihtaminen
kytkin.addEventListener("change", function () {

    const valittuNakyma = Number(kytkin.value);

    // Piilotetaan tavallinen ja alueiden suunnittelunäkymä.
    tavallinenNakyma.style.display = "none";
    kojupaikkaMuokkausNakyma.style.display = "none";
    alueNakyma.style.display = "none";

    // Jos poistutaan alueiden suunnittelunäkymästä,
    // lopetetaan mahdollinen alueiden piirtäminen.
    if (valittuNakyma !== 1) {

        if (alueidenPiirtoKaynnissa) {
            vaihdaAlueidenPiirtotila();
        }

        naytaAlueet(false);
    }

    // Tavallinen karttanäkymä
    if (valittuNakyma === 0) {

        tavallinenNakyma.style.display = "";

        nakymaTeksti.textContent = "Tavallinen kartta";
    }

    // Alueiden suunnittelunäkymä
    else if (valittuNakyma === 1) {

        alueNakyma.style.display = "block";

        nakymaTeksti.textContent = "Alueiden suunnittelu";

        naytaAlueet(true);
    }

    setTimeout(function () {
        map.invalidateSize();
    }, 100);

});


// Kojut kartalla päälle / pois
naytaKojutKytkin.addEventListener("change", function () {
    naytaKojut(naytaKojutKytkin.checked);
});


// Parkkipaikat kartalla päälle / pois
naytaParkitKytkin.addEventListener("change", function () {
    naytaParkit(naytaParkitKytkin.checked);
});


const searchInput = document.getElementById("haku");

searchInput.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase().trim();
    const kojuElementit = document.querySelectorAll(".koju");

    kojuElementit.forEach(koju => {
        const number = koju.querySelector("p").textContent.toLowerCase();
        const title = koju.querySelector("h3").textContent.toLowerCase();

        const kojuData = Array.from(kojupaikat.values()).find(data =>
            data.element === koju
        );

        const alueNumero = kojuData?.alueNumero?.toString() || "";

        const searchText = number + " " + title + " " + alueNumero;

        koju.style.display = searchText.includes(searchValue) ? "" : "none";
    });

    const ryhmat = document.querySelectorAll(
        "#kojuAlueRyhmaContainer details, #alueettomatKojutRyhma"
    );

    ryhmat.forEach(ryhma => {
        const loytyyTuloksia = Array.from(
            ryhma.querySelectorAll(".koju")
        ).some(koju => koju.style.display !== "none");

        ryhma.open = searchValue === "" || loytyyTuloksia;
    });
});


const ohjeetButton = document.getElementById("avaaOhjeet");

ohjeetButton.addEventListener("click", function () {
    window.planStorage.openHelp();
});

const alueidenPiirtoPainike = document.getElementById("alueidenPiirto");

alueidenPiirtoPainike.addEventListener("click", function () {

    vaihdaAlueidenPiirtotila();

    if (alueidenPiirtoKaynnissa) {
        alueidenPiirtoPainike.textContent = "Lopeta alueiden piirtäminen";
    } else {
        alueidenPiirtoPainike.textContent = "Piirrä alueita";
    }

});

// KEHITYSTILAN VÄRIEN KÄÄNTÖ
document.addEventListener("DOMContentLoaded", async function () {

    try {
        const settings = await window.appSettings.getSettings();

        if (settings.isDevInvertEnabled) {

            // Käännetään värit automaattisesti
            document.body.classList.add("inverted");

            // Näytetään kehittäjän värien kääntöpainike
            const button = document.getElementById("devInvertButton");

            if (button) {
                button.hidden = false;
            }
        }

    } catch (error) {
        console.error("Kehitystilan asetusten lataaminen epäonnistui:", error);
    }
});