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
// The model is initialized without tools, making it simpler
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// --- LEAD CAPTURE FUNCTION (Unchanged) ---
async function captureLead(message) {
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const foundEmail = message.match(emailRegex);
  const foundPhone = message.match(phoneRegex);

  if (foundEmail || foundPhone) {
    const contactInfo = foundEmail ? `Email: ${foundEmail[0]}` : `Phone: ${foundPhone[0]}`;
    const subject = `New Lead Captured from Your Portfolio Bot!`;
    const body = `<p>Hi Ehsan,</p><p>Your AI assistant captured a new lead from your website.</p><p><strong>Contact Info:</strong> ${contactInfo}</p><p><strong>Message:</strong> "${message}"</p>`;

    try {
      await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject, html: body });
      console.log("Lead capture email sent successfully.");
    } catch (error) {
      console.error("Error sending lead capture email:", error);
    }
  }
}

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async function(event, context) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { message } = JSON.parse(event.body);
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };

    await captureLead(message);

    // --- KNOWLEDGE BASE (Simplified with Direct Booking Link) ---
    const knowledgeBase = `
    You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
    Your goal is to help potential clients understand his skills and encourage them to connect.

    **CRITICAL RULE FOR BOOKING A MEETING:**
    - If the user's message contains any of the following words: "book", "call", "schedule", "meeting", "appointment", your one and only response MUST be this exact sentence: "Of course! You can see Ehsan's live availability and book a time that works for you using this link: ${CALENDLY_EVENT_LINK}"
    - You must not ask for their name or email. You must not mention tools. You must only provide the link.

    **ABOUT EHSAN (Sani) MOHAJER:**
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences.
    - **Core Identity:** A creative problem solver, developer, and AI enthusiast who bridges the gap between business needs and technical execution.
    
    // ... (The rest of your knowledge base with your professional details)
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: knowledgeBase }] },
        { role: "model", parts: [{ text: "Understood. I will answer questions based on my knowledge base. If asked to book a meeting, I will provide the direct Calendly link as instructed." }] }
      ]
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const text = response.text();

    return { statusCode: 200, headers, body: JSON.stringify({ reply: text }) };

  } catch (error) {
    console.error("Error in Netlify function:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get response from AI' }) };
  }
};
