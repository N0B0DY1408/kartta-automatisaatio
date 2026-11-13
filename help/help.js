document.getElementById("openDocx").addEventListener("click", async function () {
    try {
        await window.planStorage.openHelpFile("ohjeet.docx");
    } catch (error) {
        alert("Käyttöohjetta ei voitu avata: " + error.message);
    }
});

document.getElementById("openPdf").addEventListener("click", async function () {
    try {
        await window.planStorage.openHelpFile("qrkoodi.pdf");
    } catch (error) {
        alert("PDF-tiedostoa ei voitu avata: " + error.message);
    }
});