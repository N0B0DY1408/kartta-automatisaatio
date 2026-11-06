const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs/promises");

// Suunnitelmien tallennuskansio
const plansFolder = path.join(__dirname, "Suunnitelmat");

// Varmistetaan, että tallennuskansio on olemassa
async function ensurePlansFolder() {
    await fs.mkdir(plansFolder, { recursive: true });
}

// Tarkistetaan suunnitelman nimi
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

// Muodostetaan tiedostopolku
function getPlanPath(name) {
    const safeName = validatePlanName(name);
    return path.join(plansFolder, safeName + ".json");
}


// TALLENNA SUUNNITELMA
ipcMain.handle("save-plan", async function (event, name, data) {
    try {
        await ensurePlansFolder();

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
    await ensurePlansFolder();

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


// SOVELLUKSEN IKKUNA
function createWindow() {
    const mainWindow = new BrowserWindow({
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
}

app.whenReady().then(createWindow);

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});