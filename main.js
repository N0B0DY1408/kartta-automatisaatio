const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");

// Cloudflare Worker -julkaisupalvelun osoite
const workerUrl = "https://kartta-julkaisupalvelu.tuikkamatias.workers.dev";

// Käyttäjän omien tietojen tallennussijainti
const appDataFolder = app.getPath("userData");

// Julkisen sivuston muokattava kansio
const publicViewFolder = path.join(appDataFolder, "public-view");

const plansFolder = path.join(appDataFolder, "Suunnitelmat");
const backupFolder = path.join(appDataFolder, "varmuuskopiot");

let mainWindow = null;

// Tunnistetaan start.ps1:n kautta käynnistetty kehitystila
const isDevInvertEnabled = process.env.KARTTA_DEV_INVERT === "1";

// Välitetään kehitystilan asetukset käyttöliittymälle
ipcMain.handle("get-app-settings", function () {
    return {
        isDevInvertEnabled: isDevInvertEnabled
    };
});

let isClosing = false;
let closeConfirmed = false;
let closeCancelled = false;
let helpWindow = null;


// LUODAAN TARVITTAVAT KANSIOT
async function ensureDataFolders() {
    await fs.mkdir(plansFolder, { recursive: true });
    await fs.mkdir(backupFolder, { recursive: true });
}

// LUODAAN JULKISEN SIVUSTON KANSIO
async function ensurePublicViewFolder() {

    const sourceFolder = app.isPackaged
        ? path.join(process.resourcesPath, "public-view")
        : path.join(__dirname, "public-view");

    try {
        await fs.access(publicViewFolder);

    } catch (error) {

        if (error.code !== "ENOENT") {
            throw error;
        }

        await fs.cp(sourceFolder, publicViewFolder, {
            recursive: true
        });

        console.log("Julkisen sivuston tiedostot kopioitu AppData-kansioon.");
    }
}


// TARKISTETAAN SUUNNITELMAN NIMI
function validatePlanName(name) {
    if (typeof name !== "string" || !name.trim()) {
        throw new Error("Suunnitelman nimi puuttuu.");
    }

    // Sallitaan vain turvalliset tiedostonimet
    if (!/^[a-zA-Z0-9åäöÅÄÖ _-]+$/.test(name)) {
        throw new Error("Suunnitelman nimessä on kiellettyjä merkkejä.");
    }

    return name.trim();
}


// MUODOSTETAAN TIEDOSTOPOLKU
function getPlanPath(name) {
    const safeName = validatePlanName(name);

    return path.join(plansFolder, safeName + ".json");
}

console.log("Electronin arkkitehtuuri:", process.arch);

// SUORITETAAN POWERSHELL-VARMUUSKOPIOINTI
function runBackup() {
    return new Promise(function (resolve, reject) {

        const backupScript = app.isPackaged
            ? path.join(process.resourcesPath, "powershell", "backup.ps1")
            : path.join(__dirname, "powershell", "backup.ps1");

        // Selvitetään Windowsin järjestelmäkansion sijainti
        const windowsFolder = process.env.SystemRoot || "C:\\Windows";

        // Valitaan PowerShellin polku Electronin arkkitehtuurin perusteella
        const powershellPath = process.arch === "ia32"
            ? path.join(
                windowsFolder,
                "Sysnative",
                "WindowsPowerShell",
                "v1.0",
                "powershell.exe"
            )
            : path.join(
                windowsFolder,
                "System32",
                "WindowsPowerShell",
                "v1.0",
                "powershell.exe"
            );

        const powershell = spawn(
            powershellPath,
            [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                backupScript,
                appDataFolder
            ],
            {
            cwd: appDataFolder,
            windowsHide: true
            }
        );

        powershell.on("error", function (error) {
            reject(error);
        });

        powershell.on("close", function (code) {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        "Varmuuskopiointi epäonnistui. PowerShellin palautuskoodi: " + code
                    )
                );
            }
        });
    });
}



// TALLENNA SUUNNITELMA
ipcMain.handle("save-plan", async function (event, name, data) {
    try {
        await ensureDataFolders();

        const filePath = getPlanPath(name);

        const jsonData = JSON.stringify(data, null, 4);

        await fs.writeFile(filePath, jsonData, "utf8");

        return {
            success: true,
            message: "Suunnitelma tallennettu."
        };

    } catch (error) {
        console.error("Tallennusvirhe:", error);
        throw error;
    }
});


// LATAA SUUNNITELMA
ipcMain.handle("load-plan", async function (event, name) {
    const filePath = getPlanPath(name);

    try {
        const jsonData = await fs.readFile(filePath, "utf8");

        return JSON.parse(jsonData);

    } catch (error) {
        if (error.code === "ENOENT") {
            return null;
        }

        console.error("Latausvirhe:", error);
        throw error;
    }
});


// LISTAA SUUNNITELMAT
ipcMain.handle("list-plans", async function () {
    await ensureDataFolders();

    const files = await fs.readdir(plansFolder, {
        withFileTypes: true
    });

    return files
        .filter(function (file) {
            return file.isFile() && file.name.endsWith(".json");
        })
        .map(function (file) {
            return file.name.replace(/\.json$/i, "");
        });
});


// POISTA SUUNNITELMA
ipcMain.handle("delete-plan", async function (event, name) {
    const filePath = getPlanPath(name);

    try {
        await fs.unlink(filePath);

        return {
            success: true,
            message: "Suunnitelma poistettu."
        };

    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                success: false,
                message: "Suunnitelmaa ei löytynyt."
            };
        }

        console.error("Poistovirhe:", error);
        throw error;
    }
});

// VIE SUUNNITELMA JSON-TIEDOSTOKSI
ipcMain.handle("export-plan", async function (event, planData) {

    try {
        if (
            !planData ||
            typeof planData !== "object" ||
            !Array.isArray(planData.kojupaikat) ||
            !Array.isArray(planData.parkit)
        ) {
            throw new Error("Suunnitelman tiedot ovat virheelliset.");
        }

        const defaultName = validatePlanName(planData.name);

        const { canceled, filePath } = await dialog.showSaveDialog(
            mainWindow,
            {
                title: "Vie suunnitelma",
                defaultPath: defaultName + ".json",
                filters: [
                    {
                        name: "JSON-tiedosto",
                        extensions: ["json"]
                    }
                ]
            }
        );

        if (canceled || !filePath) {
            return {
                success: false,
                canceled: true
            };
        }

        const jsonData = JSON.stringify(planData, null, 4);

        await fs.writeFile(filePath, jsonData, "utf8");

        return {
            success: true,
            message: "Suunnitelma viety onnistuneesti."
        };

    } catch (error) {
        console.error("Vientivirhe:", error);
        throw error;
    }
});


// SULKEMISEN VAHVISTUS
ipcMain.handle("confirm-close", function () {
    closeConfirmed = true;
});


// SULKEMISEN PERUUTUS
ipcMain.handle("cancel-close", function () {
    closeCancelled = true;
});



ipcMain.handle("publish-plan", async function (event, planName, publishCode) {
    try {
        // Tarkistetaan suunnitelman nimi
        const safeName = validatePlanName(planName);

        // Tarkistetaan julkaisukoodi
        if (
            typeof publishCode !== "string" ||
            !publishCode.trim()
        ) {
            throw new Error("Julkaisukoodi puuttuu.");
        }

        // Luetaan suunnitelma käyttäjän omasta AppData-kansiosta
        const filePath = getPlanPath(safeName);
        const jsonData = await fs.readFile(filePath, "utf8");

        // Tarkistetaan, että tiedosto sisältää kelvollista JSON-dataa
        let plan;

        try {
            plan = JSON.parse(jsonData);
        } catch {
            throw new Error("Suunnitelman JSON-tiedosto ei ole kelvollinen.");
        }

        // Tarkistetaan suunnitelman perusrakenne
        if (
            !plan ||
            typeof plan !== "object" ||
            !plan.map ||
            !plan.map.center ||
            !Array.isArray(plan.kojupaikat)
        ) {
            throw new Error("Suunnitelman tietorakenne ei kelpaa julkaistavaksi.");
        }

        // Tarkistetaan tiedoston koko
        const fileSize = Buffer.byteLength(jsonData, "utf8");

        if (fileSize > 2 * 1024 * 1024) {
            throw new Error("Suunnitelma on liian suuri julkaistavaksi.");
        }

        // Lähetetään suunnitelma Cloudflare Workerille
        const response = await fetch(
            `${workerUrl}/publish`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${publishCode}`
                },

                body: jsonData,
                signal: AbortSignal.timeout(30000)
            }
        );

        // Luetaan palvelimen vastaus
        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error("Julkaisupalvelin palautti virheellisen vastauksen.");
        }

        // Tarkistetaan julkaisun onnistuminen
        if (!response.ok) {
            throw new Error(
                result.error || `Julkaisu epäonnistui. HTTP ${response.status}`
            );
        }

        return {
            success: true,
            message: result.message || "Suunnitelma julkaistiin onnistuneesti."
        };

    } catch (error) {
        console.error("Julkaisuvirhe:", error);

        throw new Error(error.message || "Julkaisu epäonnistui.");
    }
});


// AVATAAN OHJEIKKUNA
ipcMain.handle("open-help", function () {

    if (helpWindow && !helpWindow.isDestroyed()) {
        helpWindow.focus();
        return;
    }

    const helpFolder = app.isPackaged
        ? path.join(process.resourcesPath, "help")
        : path.join(__dirname, "help");

    helpWindow = new BrowserWindow({
        width: 850,
        height: 750,
        minWidth: 600,
        minHeight: 500,
        parent: mainWindow,
        modal: false,
        autoHideMenuBar: true,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    helpWindow.loadFile(path.join(helpFolder, "index.html"));

    helpWindow.on("closed", function () {
        helpWindow = null;
    });
});


// AVATAAN OHJETIEDOSTO
ipcMain.handle("open-help-file", async function (event, fileName) {

    const allowedFiles = [
        "ohjeet.pdf",
        "qrkoodi.pdf"
    ];

    if (!allowedFiles.includes(fileName)) {
        throw new Error("Tuntematon ohjetiedosto.");
    }

    const helpFolder = app.isPackaged
        ? path.join(process.resourcesPath, "help")
        : path.join(__dirname, "help");

    const filePath = path.join(helpFolder, fileName);

    await fs.access(filePath);

    const result = await shell.openPath(filePath);

    if (result) {
        throw new Error("Tiedoston avaaminen epäonnistui: " + result);
    }

    return {
        success: true
    };
});

// SOVELLUKSEN IKKUNA
async function createWindow() {

    await ensureDataFolders();
    await ensurePublicViewFolder();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(
        path.join(__dirname, "interface", "index.html")
    );

    mainWindow.on("close", function (event) {

        if (closeConfirmed) {
            return;
        }

        event.preventDefault();

        if (isClosing) {
            return;
        }

        isClosing = true;
        closeCancelled = false;

        mainWindow.webContents.send("prepare-close");

        const closeCheck = setInterval(async function () {

            if (closeCancelled) {
                clearInterval(closeCheck);
                isClosing = false;
                return;
            }

            if (closeConfirmed) {
                clearInterval(closeCheck);

                try {
                    console.log(
                        "Tallennukset viimeistelty. Aloitetaan varmuuskopiointi."
                    );

                    await runBackup();

                    console.log("Varmuuskopiointi onnistui.");

                    mainWindow.close();

                } catch (error) {
                    console.error("Varmuuskopiointi epäonnistui:", error);

                    closeConfirmed = false;
                    isClosing = false;

                    if (mainWindow && !mainWindow.isDestroyed()) {

                        const { response } = await dialog.showMessageBox(
                            mainWindow,
                            {
                                type: "warning",
                                title: "Varmuuskopiointi epäonnistui",

                                message: "Varmuuskopiointia ei voitu suorittaa.",
                                detail: error.message,

                                buttons: [
                                    "Yritä uudelleen",
                                    "Sulje ilman varmuuskopiota",
                                    "Peruuta sulkeminen"
                                ],

                                defaultId: 0,
                                cancelId: 2
                            }
                        );

                        if (response === 0) {
                            // Yritetään sulkemista ja varmuuskopiointia uudelleen
                            mainWindow.close();

                        } else if (response === 1) {
                            // Suljetaan ilman varmuuskopiota
                            closeConfirmed = true;
                            mainWindow.close();

                        } else {
                            // Jatketaan ohjelman käyttöä
                            console.log("Sulkeminen peruutettu.");
                        }
                    }
                }
            }

        }, 100);
    });
}


// KÄYNNISTETÄÄN SOVELLUS
app.whenReady()
    .then(createWindow)
    .catch(function (error) {
        console.error("Sovelluksen käynnistäminen epäonnistui:", error);
        app.quit();
    });


// SULJETAAN SOVELLUS KÄYTTÖJÄRJESTELMÄN MUKAISESTI
app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});