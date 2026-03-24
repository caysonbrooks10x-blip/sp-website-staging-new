import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const payload = await request.json();
        const { amount, plan, description } = payload;

        console.log("Mock purchase success:", payload);

        
        

        return NextResponse.json({
            success: true,
            message: `Successfully processed ${plan} plan for ${amount} credits.`,
            addedCredits: amount
        });
    } catch (error: any) {
        console.error("Error processing admin credits:", error);
        return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
    }
}
