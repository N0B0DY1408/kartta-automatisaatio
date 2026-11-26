
const ALLOWED_ORIGINS = [
    "https://kartta-automatisaatio.pages.dev",
    "http://localhost",
    "http://127.0.0.1"
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 Mt

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

            let plan;

            try {
                const body = await request.text();

                if (new TextEncoder().encode(body).length > MAX_FILE_SIZE) {
                    return Response.json(
                        { error: "Suunnitelma on liian suuri." },
                        { status: 413 }
                    );
                }

                plan = JSON.parse(body);
            } catch {
                return Response.json(
                    { error: "Lähetetty suunnitelma ei ole kelvollista JSON-dataa." },
                    { status: 400 }
                );
            }

            if (
                !plan ||
                typeof plan !== "object" ||
                Array.isArray(plan)
            ) {
                return Response.json(
                    { error: "Suunnitelman tietorakenne ei kelpaa." },
                    { status: 400 }
                );
            }

            await env.PLANS.put(
                "active-plan.json",
                JSON.stringify(plan)
            );

            return Response.json({
                success: true,
                message: "Suunnitelma julkaistiin onnistuneesti."
            });
        }

        return Response.json(
            { error: "Tuntematon osoite tai pyyntö." },
            { status: 404 }
        );
    }
};
