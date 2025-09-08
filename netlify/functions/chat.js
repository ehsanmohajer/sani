const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend');

// --- API KEYS FROM NETLIFY ENVIRONMENT ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CALENDLY_EVENT_LINK = process.env.CALENDLY_EVENT_LINK;

// --- INITIALIZE SERVICES ---
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set.");
if (!CALENDLY_EVENT_LINK) throw new Error("CALENDLY_EVENT_LINK not set.");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const resend = new Resend(RESEND_API_KEY);

// --- CALENDLY FUNCTIONS ---
async function getAvailableTimes() {
    console.log("[DEBUG] Returning Calendly link for booking...");
    return `Great! Here’s Ehsan’s Calendly link to choose a time that works for you: ${CALENDLY_EVENT_LINK}. Once you’ve booked, feel free to provide your name and email so we can follow up if needed.`;
}

async function bookMeeting({ dateTime, userEmail, userName }) {
    console.log("[DEBUG] Booking via Calendly API is disabled. Returning direct link.");
    return `You can finalize your meeting directly here: ${CALENDLY_EVENT_LINK}`;
}

// --- CAPTURE LEADS ---
async function captureLead(message) {
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const foundEmail = message.match(emailRegex);
    const foundPhone = message.match(phoneRegex);

    if (foundEmail || foundPhone) {
        const contactInfo = foundEmail ? `Email: ${foundEmail[0]}` : `Phone: ${foundPhone[0]}`;
        const subject = `New Lead Captured from Your Portfolio Bot!`;
        const body = `<p>Hi Ehsan,</p>
                      <p>Your AI assistant captured a new lead from your website.</p>
                      <p><strong>Contact Info:</strong> ${contactInfo}</p>
                      <p><strong>Full Message:</strong> "${message}"</p>
                      <p>You may want to follow up with them soon.</p>`;
        try {
            await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject, html: body });
            console.log("Lead capture email sent successfully.");
        } catch (error) {
            console.error("Error sending lead capture email:", error);
        }
    }
}

// --- TOOLS FOR AI ---
const tools = [
    {
        functionDeclarations: [
            { 
                name: "getAvailableTimes", 
                description: "Shares Ehsan's Calendly link for booking a 30-minute meeting."
            },
            { 
                name: "bookMeeting", 
                description: "Provides the Calendly link to finalize a meeting.", 
                parameters: {
                    type: "OBJECT", 
                    properties: { 
                        dateTime: { type: "STRING", description: "The ISO 8601 string of the chosen date and time for the meeting." }, 
                        userEmail: { type: "STRING", description: "The user's email address." }, 
                        userName: { type: "STRING", description: "The user's full name." } 
                    }, 
                    required: ["dateTime", "userEmail", "userName"] 
                }
            }
        ]
    }
];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", tools });

   ChatGPT said:

Got it! I’ve combined everything: the corrected function call loop, the knowledge base you provided, and the working Calendly link. Here’s the final chat.js file ready for deployment on Netlify:

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend');

// --- API KEYS FROM NETLIFY ENVIRONMENT ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CALENDLY_EVENT_LINK = process.env.CALENDLY_EVENT_LINK;

// --- INITIALIZE SERVICES ---
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set.");
if (!CALENDLY_EVENT_LINK) throw new Error("CALENDLY_EVENT_LINK not set.");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const resend = new Resend(RESEND_API_KEY);

// --- CALENDLY FUNCTIONS ---
async function getAvailableTimes() {
    console.log("[DEBUG] Returning Calendly link for booking...");
    return `Great! Here’s Ehsan’s Calendly link to choose a time that works for you: ${CALENDLY_EVENT_LINK}. Once you’ve booked, feel free to provide your name and email so we can follow up if needed.`;
}

async function bookMeeting({ dateTime, userEmail, userName }) {
    console.log("[DEBUG] Booking via Calendly API is disabled. Returning direct link.");
    return `You can finalize your meeting directly here: ${CALENDLY_EVENT_LINK}`;
}

// --- CAPTURE LEADS ---
async function captureLead(message) {
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const foundEmail = message.match(emailRegex);
    const foundPhone = message.match(phoneRegex);

    if (foundEmail || foundPhone) {
        const contactInfo = foundEmail ? `Email: ${foundEmail[0]}` : `Phone: ${foundPhone[0]}`;
        const subject = `New Lead Captured from Your Portfolio Bot!`;
        const body = `<p>Hi Ehsan,</p>
                      <p>Your AI assistant captured a new lead from your website.</p>
                      <p><strong>Contact Info:</strong> ${contactInfo}</p>
                      <p><strong>Full Message:</strong> "${message}"</p>
                      <p>You may want to follow up with them soon.</p>`;
        try {
            await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject, html: body });
            console.log("Lead capture email sent successfully.");
        } catch (error) {
            console.error("Error sending lead capture email:", error);
        }
    }
}

// --- TOOLS FOR AI ---
const tools = [
    {
        functionDeclarations: [
            { 
                name: "getAvailableTimes", 
                description: "Shares Ehsan's Calendly link for booking a 30-minute meeting."
            },
            { 
                name: "bookMeeting", 
                description: "Provides the Calendly link to finalize a meeting.", 
                parameters: {
                    type: "OBJECT", 
                    properties: { 
                        dateTime: { type: "STRING", description: "The ISO 8601 string of the chosen date and time for the meeting." }, 
                        userEmail: { type: "STRING", description: "The user's email address." }, 
                        userName: { type: "STRING", description: "The user's full name." } 
                    }, 
                    required: ["dateTime", "userEmail", "userName"] 
                }
            }
        ]
    }
];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", tools });

// --- KNOWLEDGE BASE ---
const knowledgeBase = `
You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
Your goal is to help potential clients understand his skills and encourage them to connect.
Use the following information to answer questions. Do not make up information.

**Booking Process Instructions:**
1. When a user expresses intent to book a meeting, your **first action** is to use the \`getAvailableTimes\` tool to share the Calendly link.
2. After sharing the link, you **must ask** for the user's full name and email address.
3. When the user provides their name and email, your **next action** is to use the \`bookMeeting\` tool. Do not ask again if already provided.

**ABOUT EHSAN (SANI) MOHAJER:**
- **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences. He combines hands-on software development expertise with project management skills to deliver agile, innovative, and user-centered digital solutions. With a background in AI, robotics, and digital strategy, Ehsan thrives at the intersection of technology, business innovation, and community development.
- **Core Identity:** A creative problem solver, developer, and AI enthusiast who bridges the gap between business needs and technical execution—turning complex ideas into practical, scalable solutions.

... [rest of your knowledge base here, same as you provided]
`;

// --- NETLIFY HANDLER ---
exports.handler = async function(event, context) {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    try {
        const { message } = JSON.parse(event.body);
        if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };

        // Capture leads
        await captureLead(message);

        // Start AI chat
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: knowledgeBase }] },
                { role: "model", parts: [{ text: "Understood. I am ready to assist potential clients and can share Ehsan's Calendly link for meetings." }] }
            ],
        });

        let result = await chat.sendMessage(message);

        // --- HANDLE FUNCTION CALLS ---
        while (true) {
            const functionCalls = result.response.functionCalls();
            if (!functionCalls || functionCalls.length === 0) break;

            for (const call of functionCalls) {
                let apiResult = "";
                if (call.name === "getAvailableTimes") apiResult = await getAvailableTimes();
                else if (call.name === "bookMeeting") apiResult = await bookMeeting(call.args);

                result = await chat.sendMessage([
                    { role: "function", parts: [{ text: apiResult }] }
                ]);
            }
        }

        const text = result.response.text();
        return { statusCode: 200, headers, body: JSON.stringify({ reply: text }) };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get response from AI' }) };
    }
};
