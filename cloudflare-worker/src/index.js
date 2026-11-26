
const ALLOWED_ORIGINS = [
    "https://kartta-automatisaatio.pages.dev",
    "http://localhost",
    "http://127.0.0.1"
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mt

// Muuntaa tavutaulukon URL-turvalliseen Base64-muotoon.
function bytesToBase64Url(bytes) {
    let binary = "";

    for (const byte of new Uint8Array(bytes)) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

// Muodostaa IP-osoitteesta yksisuuntaisen tiivisteen.
async function hashClientIp(ip) {
    const data = new TextEncoder().encode(ip);

    const hash = await crypto.subtle.digest(
        "SHA-256",
        data
    );

    return bytesToBase64Url(hash);
}

// Hajauttaa varauskoodin satunnaisella suolalla.
async function hashReservationCode(code) {
    const iterations = 210000;
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(code),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const hash = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256"
        },
        key,
        256
    );

    return [
        "pbkdf2",
        iterations,
        bytesToBase64Url(salt),
        bytesToBase64Url(hash)
    ].join("$");
}

// Tarkistaa annetun varauskoodin tallennettua hajautusta vasten.
async function verifyReservationCode(code, storedHash) {
    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
        return false;
    }

    const iterations = Number(parts[1]);

    if (
        !Number.isInteger(iterations) ||
        iterations < 100000 ||
        iterations > 1000000
    ) {
        return false;
    }

    function base64UrlToBytes(value) {
        const base64 = value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const binary = atob(
            base64 + "=".repeat((4 - base64.length % 4) % 4)
        );

        return Uint8Array.from(
            binary,
            character => character.charCodeAt(0)
        );
    }

    const salt = base64UrlToBytes(parts[2]);
    const expectedHash = base64UrlToBytes(parts[3]);

    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(code),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const actualHash = new Uint8Array(
        await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: "SHA-256"
            },
            key,
            256
        )
    );

    if (actualHash.length !== expectedHash.length) {
        return false;
    }

    let difference = 0;

    for (let i = 0; i < actualHash.length; i++) {
        difference |= actualHash[i] ^ expectedHash[i];
    }

    return difference === 0;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const requestOrigin = request.headers.get("Origin");

        const allowedOrigin = ALLOWED_ORIGINS.includes(requestOrigin)
            ? requestOrigin
            : ALLOWED_ORIGINS[0];

        const corsHeaders = {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Vary": "Origin"
        };

        // Selain tarkistaa joskus palvelimen sallitut yhteydet etukäteen.
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // Julkinen reitti: haetaan viimeisin suunnitelma.
        if (url.pathname === "/plan" && request.method === "GET") {
            const plan = await env.PLANS.get("active-plan.json");

            if (!plan) {
                return Response.json(
                    { error: "Julkaistua suunnitelmaa ei löytynyt." },
                    { status: 404, headers: corsHeaders }
                );
            }

            return new Response(plan, {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control": "no-store"
                }
            });
        }

        // Suunnitelman julkaiseminen.
        if (url.pathname === "/publish" && request.method === "POST") {
            const authorization = request.headers.get("Authorization");
            const expected = `Bearer ${env.PUBLISH_CODE}`;

            if (!env.PUBLISH_CODE || authorization !== expected) {
                return Response.json(
                    { error: "Julkaisukoodi on virheellinen." },
                    { status: 401 }
                );
            }

            const contentLength = Number(
                request.headers.get("Content-Length") || 0
            );

            if (contentLength > MAX_FILE_SIZE) {
                return Response.json(
                    { error: "Suunnitelma on liian suuri." },
                    { status: 413 }
                );
            }

                        let payload;

            try {
                const body = await request.text();

                if (new TextEncoder().encode(body).length > MAX_FILE_SIZE) {
                    return Response.json(
                        { error: "Suunnitelma on liian suuri." },
                        { status: 413, headers: corsHeaders }
                    );
                }

                payload = JSON.parse(body);
            } catch {
                return Response.json(
                    { error: "Lähetetty suunnitelma ei ole kelvollista JSON-dataa." },
                    { status: 400, headers: corsHeaders }
                );
            }

            const plan = payload?.plan;
            const reservationSettings = payload?.reservationSettings;

                        if (
                !plan ||
                typeof plan !== "object" ||
                Array.isArray(plan) ||
                typeof plan.id !== "string" ||
                !plan.id.trim() ||
                !Array.isArray(plan.kojupaikat)
            ) {
                return Response.json(
                    {
                        error: "Suunnitelman tietorakenne ei kelpaa."
                    },
                    { status: 400, headers: corsHeaders }
                );
            }

            if (
                !reservationSettings ||
                typeof reservationSettings.enabled !== "boolean" ||
                (
                    reservationSettings.enabled &&
                    (
                        typeof reservationSettings.code !== "string" ||
                        !reservationSettings.code.trim()
                    )
                )
            ) {
                return Response.json(
                    {
                        error: "Varausasetukset eivät ole kelvolliset."
                    },
                    { status: 400, headers: corsHeaders }
                );
            }

                        // Tallennetaan varausasetukset D1-tietokantaan.
            if (reservationSettings.enabled) {
                const codeHash = await hashReservationCode(
                    reservationSettings.code
                );

                await env.DB.prepare(`
                    INSERT INTO events (
                        id,
                        plan_id,
                        access_code_hash,
                        enabled
                    )
                    VALUES (?, ?, ?, 1)
                    ON CONFLICT(plan_id) DO UPDATE SET
                        access_code_hash = excluded.access_code_hash,
                        enabled = 1
                `).bind(
                    plan.id,
                    plan.id,
                    codeHash
                ).run();

            } else {
                // Jos varaukset poistetaan käytöstä,
                // suljetaan aiempi varausmahdollisuus.
                await env.DB.prepare(`
                    UPDATE events
                    SET enabled = 0
                    WHERE plan_id = ?
                `).bind(plan.id).run();
            }

            // Julkaistaan vain suunnitelma julkiseen tallennukseen.
            await env.PLANS.put(
                "active-plan.json",
                JSON.stringify(plan)
            );

            return Response.json({
                success: true,
                message: "Suunnitelma julkaistiin onnistuneesti."
            });
        }

                // Varauskoodin tarkistaminen.
        if (url.pathname === "/reservation/access" && request.method === "POST") {
            let data;

            try {
                data = await request.json();
            } catch {
                return Response.json(
                    { error: "Virheellinen pyyntö." },
                    { status: 400, headers: corsHeaders }
                );
            }

            const { planId, code } = data;

            if (
                typeof planId !== "string" ||
                typeof code !== "string" ||
                !code.trim()
            ) {
                return Response.json(
                    { error: "Suunnitelman tunniste tai varauskoodi puuttuu." },
                    { status: 400, headers: corsHeaders }
                );
            }

            const event = await env.DB.prepare(`
                SELECT id, access_code_hash
                FROM events
                WHERE plan_id = ? AND enabled = 1
            `).bind(planId).first();

            if (!event) {

                            // Rajoitetaan varauskoodin kokeilukertoja.
            const clientIp = request.headers.get("CF-Connecting-IP");

            if (!clientIp) {
                return Response.json(
                    { error: "Yhteyden tietoja ei voitu tarkistaa." },
                    { status: 503, headers: corsHeaders }
                );
            }

            const ipHash = await hashClientIp(clientIp);
            const now = Math.floor(Date.now() / 1000);
            const windowStart = now - 900;

            const attempt = await env.DB.prepare(`
                INSERT INTO reservation_access_attempts (
                    event_id,
                    ip_hash,
                    window_start,
                    attempts
                )
                VALUES (?, ?, ?, 1)
                ON CONFLICT(event_id, ip_hash) DO UPDATE SET
                    window_start = CASE
                        WHEN reservation_access_attempts.window_start <= ?
                        THEN excluded.window_start
                        ELSE reservation_access_attempts.window_start
                    END,
                    attempts = CASE
                        WHEN reservation_access_attempts.window_start <= ?
                        THEN 1
                        ELSE reservation_access_attempts.attempts + 1
                    END
                RETURNING attempts
            `).bind(
                event.id,
                ipHash,
                now,
                windowStart,
                windowStart
            ).first();

            if (attempt.attempts > 5) {
                return Response.json(
                    {
                        error: "Liian monta yritystä. Yritä uudelleen 15 minuutin kuluttua."
                    },
                    { status: 429, headers: corsHeaders }
                );
            }
            
                return Response.json(
                    { error: "Varausmahdollisuutta ei löytynyt." },
                    { status: 404, headers: corsHeaders }
                );
            }

            // Varauskoodin tarkistus lisätään seuraavassa vaiheessa.
                        // Tarkistetaan varauskoodi.
            const validCode = await verifyReservationCode(
                code,
                event.access_code_hash
            );

            if (!validCode) {
                return Response.json(
                    { error: "Varauskoodi on virheellinen." },
                    { status: 401, headers: corsHeaders }
                );
            }

            return Response.json(
                {
                    success: true,
                    eventId: event.id
                },
                { headers: corsHeaders }
            );
        }

        return Response.json(
            { error: "Tuntematon osoite tai pyyntö." },
            { status: 404 }
        );
    }
};
