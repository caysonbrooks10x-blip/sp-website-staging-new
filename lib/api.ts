

export async function apiFetch(path: string, options: RequestInit = {}) {
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "/api";
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    const url = `${baseUrl}/${cleanPath}`;

    
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    try {
        const res = await fetch(url, {
            ...options,
            headers,
        });

        
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
                
                try {
                    const text = await res.text();
                    if (text) errorMessage = text;
                } catch (textError) {
                    
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


export const api = {
    
    
    

    createJob: async (payload: any) => {
        return apiFetch("/create-job", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    
    
    

    generateOpenAI: async (payload: { type: 'image' | 'video', prompt: string }) => {
        return apiFetch("/generate-openai", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    
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
