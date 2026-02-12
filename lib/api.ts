import { supabase } from "./supabaseClient";

/**
 * Simplified API Fetch Wrapper (Anon Key Only)
 *
 * 1. No user authentication checks.
 * 2. Uses the Anon Key for authorization directly.
 * 3. Constructs robust URLs.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
    // 1. Construct URL
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${baseUrl}/functions/v1/${cleanPath}`;

    // 2. Prepare Headers (Anon Key Only)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`, // Directly use Anon Key as requested
        ...(options.headers || {}),
    };

    try {
        const res = await fetch(url, {
            ...options,
            headers,
        });

        // 3. Handle Response
        if (!res.ok) {
            let errorMessage = `API Error: ${res.status} ${res.statusText}`;
            try {
                const body = await res.json();
                if (body && typeof body === 'object') {
                    if (body.error) {
                        errorMessage = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
                    } else if (body.message) {
                        errorMessage = typeof body.message === 'string' ? body.message : JSON.stringify(body.message);
                    }
                }
            } catch (e) {
                // If JSON parsing fails, try reading text
                try {
                    const text = await res.text();
                    if (text) errorMessage = text;
                } catch (textError) {
                    // Ignore text read error
                }
            }
            throw new Error(errorMessage);
        }

        return await res.json();
    } catch (error: any) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

/**
 * API Object Export
 */
export const api = {
    // -------------------------
    // Job Creation / Generation
    // -------------------------

    createJob: async (payload: any) => {
        return apiFetch("/create-job", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    // -------------------------
    // OpenAI Generation (Image & Video)
    // -------------------------

    generateOpenAI: async (payload: { type: 'image' | 'video', prompt: string }) => {
        return apiFetch("/generate-openai", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    // Legacy Aliases
    openaiImage: async (payload: { prompt: string }) => {
        return api.generateOpenAI({
            type: 'image',
            prompt: payload.prompt
        });
    },

    openaiVideo: async (payload: { prompt: string }) => {
        return api.generateOpenAI({
            type: 'video',
            prompt: payload.prompt
        });
    },

    // -------------------------
    // Other Endpoints
    // -------------------------

    generateNanoBanana: async (payload: any) => {
        return apiFetch("/generate-nano-banana", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    openaiChat: async (payload: any) => {
        return apiFetch("/generate-openai", {
            method: "POST",
            body: JSON.stringify({ type: "chat", ...payload }),
        });
    },

    getJobStatus: async (jobId: string) => {
        return apiFetch(`/get-job-status?id=${jobId}`, {
            method: "GET",
        });
    },

    communityPublish: async (payload: any) => {
        return apiFetch("/community-publish", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    adminCredits: async (payload: any) => {
        return apiFetch("/admin-credits", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    stripeWebhook: async (_payload: any) => {
        return { received: true };
    },
};