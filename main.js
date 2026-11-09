const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const { spawn } = require("child_process");

// Käyttäjän omien tietojen tallennussijainti
const appDataFolder = app.getPath("userData");

const plansFolder = path.join(appDataFolder, "Suunnitelmat");
const backupFolder = path.join(appDataFolder, "varmuuskopiot");

let mainWindow = null;

let isClosing = false;
let closeConfirmed = false;
let closeCancelled = false;


// LUODAAN TARVITTAVAT KANSIOT
async function ensureDataFolders() {
    await fs.mkdir(plansFolder, { recursive: true });
    await fs.mkdir(backupFolder, { recursive: true });
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
            );s

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


// SULKEMISEN VAHVISTUS
ipcMain.handle("confirm-close", function () {
    closeConfirmed = true;
});


// SULKEMISEN PERUUTUS
ipcMain.handle("cancel-close", function () {
    closeCancelled = true;
});


// SOVELLUKSEN IKKUNA
async function createWindow() {

    await ensureDataFolders();

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