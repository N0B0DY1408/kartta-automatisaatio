const kytkin = document.getElementById("nakymaSwitch");

const tavallinenNakyma = document.getElementById("tavallinenNakyma");

const alueNakyma = document.getElementById("alueNakyma");

const nakymaTeksti = document.getElementById("nakymaTeksti");

const naytaKojutKytkin = document.getElementById("naytaKojut");

const naytaParkitKytkin = document.getElementById("naytaParkit");


// Näkymän vaihtaminen
kytkin.addEventListener("change", function () {

    if (kytkin.checked) {

        // Alueiden suunnittelunäkymä
        tavallinenNakyma.style.display = "none";
        alueNakyma.style.display = "block";

        nakymaTeksti.textContent = "Alueiden suunnittelu";

        naytaAlueet(true);

    } else {

        // Lopetetaan alueiden piirtäminen näkymästä poistuttaessa
        if (alueidenPiirtoKaynnissa) {
            vaihdaAlueidenPiirtotila();
        }

        // Tavallinen karttanäkymä
        tavallinenNakyma.style.display = "block";
        alueNakyma.style.display = "none";

        nakymaTeksti.textContent = "Tavallinen kartta";

        naytaAlueet(false);

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
    const kojut = document.querySelectorAll(".koju");

    kojut.forEach(koju => {
        const number = koju.querySelector("p").textContent.toLowerCase();
        const title = koju.querySelector("h3").textContent.toLowerCase();

        const searchText = number + " " + title;

        if (searchText.includes(searchValue)) {
            koju.style.display = "";
        } else {
            koju.style.display = "none";
        }
    });

    // Avataan tai suljetaan kojuryhmät hakutulosten perusteella.
    const ryhmat = document.querySelectorAll(
        "#kojuAlueRyhmaContainer details, #alueettomatKojutRyhma"
    );

    ryhmat.forEach(ryhma => {
        const loytyyTuloksia = Array.from(
            ryhma.querySelectorAll(".koju")
        ).some(koju => koju.style.display !== "none");

        if (searchValue === "") {
            ryhma.open = true;
        } else {
            ryhma.open = loytyyTuloksia;
        }
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