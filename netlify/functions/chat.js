const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend');

// --- API KEYS FROM NETLIFY ENVIRONMENT ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
const CALENDLY_EVENT_LINK = process.env.CALENDLY_EVENT_LINK;

// --- INITIALIZE SERVICES ---
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not set.");
if (!CALENDLY_API_KEY) throw new Error("CALENDLY_API_KEY not set.");
if (!CALENDLY_EVENT_LINK) throw new Error("CALENDLY_EVENT_LINK not set.");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const resend = new Resend(RESEND_API_KEY);

// --- HELPER FUNCTION TO GET CALENDLY EVENT TYPE URI (V2) ---
async function getEventTypeUri() {
    try {
        // 1. Get the user's URI from Calendly's API
        const userResponse = await fetch('https://api.calendly.com/v2/users/me', {
            headers: { 'Authorization': `Bearer ${CALENDLY_API_KEY}` }
        });
        if (!userResponse.ok) throw new Error('Failed to fetch user from Calendly.');
        const userData = await userResponse.json();
        const userUri = userData.resource.uri;

        // 2. Get the user's available event types
        const eventTypesResponse = await fetch(`https://api.calendly.com/v2/event_types?user=${userUri}`, {
             headers: { 'Authorization': `Bearer ${CALENDLY_API_KEY}` }
        });
        if (!eventTypesResponse.ok) throw new Error('Failed to fetch event types from Calendly.');
        const eventTypesData = await eventTypesResponse.json();

        // 3. Find the specific event type by its unique name (slug) from your event link
        const eventSlug = CALENDLY_EVENT_LINK.split('/').pop();
        const eventType = eventTypesData.collection.find(et => et.slug === eventSlug);
        if (!eventType) throw new Error(`Event type with slug '${eventSlug}' not found.`);

        return eventType.uri;
    } catch (error) {
        console.error("Error getting Calendly Event Type URI:", error);
        throw error;
    }
}

// --- CALENDLY SCHEDULING FUNCTIONS (V2 API) ---
async function getAvailableTimes() {
  try {
    const eventTypeUri = await getEventTypeUri();
    const startTime = new Date().toISOString();
    const params = new URLSearchParams({
        start_time: startTime,
        event_type: eventTypeUri
    });

    const slotsResponse = await fetch(`https://api.calendly.com/v2/event_type_available_times?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CALENDLY_API_KEY}` }
    });

    if (!slotsResponse.ok) throw new Error('Failed to fetch available times from Calendly V2 API.');
    const slotsData = await slotsResponse.json();
    
    // Return the first 5 available time slots
    return slotsData.collection.slice(0, 5).map(slot => slot.start_time);
  } catch (error) {
    console.error("Error getting Calendly times:", error.message);
    return "I'm sorry, I'm having trouble accessing the calendar right now. Please try again in a moment.";
  }
}

async function bookMeeting({ dateTime, userEmail, userName }) {
    try {
        const eventTypeUri = await getEventTypeUri();
        const bookingResponse = await fetch('https://api.calendly.com/v2/scheduling_links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CALENDLY_API_KEY}` },
            body: JSON.stringify({
                max_event_count: 1,
                owner: eventTypeUri,
                owner_type: "EventType"
            })
        });

        if (!bookingResponse.ok) throw new Error('Failed to create Calendly booking link.');
        const bookingData = await bookingResponse.json();
        const bookingUrl = bookingData.resource.booking_url;

        // Pre-fill the user's details in the link for a smoother experience
        const finalUrl = `${bookingUrl}?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}`;

        return `Great! I've prepared a booking link for you to confirm the time. Please use this to finalize your meeting: ${finalUrl}. Ehsan has also been notified of your request.`;
    } catch (error) {
        console.error("Error booking Calendly meeting:", error.message);
        return "I'm sorry, there was an error with the booking system. Please use this link to book directly: " + CALENDLY_EVENT_LINK;
    }
}


// --- LEAD CAPTURE HELPER FUNCTION ---
async function captureLead(message) {
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const foundEmail = message.match(emailRegex);
  const foundPhone = message.match(phoneRegex);
  if (foundEmail || foundPhone) {
    const contactInfo = foundEmail ? `Email: ${foundEmail[0]}` : `Phone: ${foundPhone[0]}`;
    const subject = `New Lead Captured from Your Portfolio Bot!`;
    const body = `<p>Hi Ehsan,</p><p>Your AI assistant captured a new lead from your website.</p><p><strong>Contact Info:</strong> ${contactInfo}</p><p><strong>Full Message:</strong> "${message}"</p><p>You may want to follow up with them soon.</p>`;
    try {
      await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject: subject, html: body, });
      console.log("Lead capture email sent successfully.");
    } catch (error) {
      console.error("Error sending lead capture email:", error);
    }
  }
}

// --- DEFINE TOOLS FOR THE GEMINI MODEL ---
const tools = [ { functionDeclarations: [ { name: "getAvailableTimes", description: "Gets Ehsan's next 5 available 30-minute meeting slots from his live calendar." }, { name: "bookMeeting", description: "Books a 30-minute meeting in Ehsan's calendar for a user by generating a confirmation link.", parameters: { type: "OBJECT", properties: { dateTime: { type: "STRING", description: "The ISO 8601 string of the chosen date and time for the meeting." }, userEmail: { type: "STRING", description: "The user's email address." }, userName: { type: "STRING", description: "The user's full name." }, }, required: ["dateTime", "userEmail", "userName"], }, }, ], }, ];

// --- INITIALIZE THE MODEL WITH TOOLS ---
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", tools: tools });

// --- MAIN SERVERLESS FUNCTION ---
exports.handler = async function (event, context) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { message } = JSON.parse(event.body);
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };

    // Run lead capture on every message
    await captureLead(message);

    // --- YOUR FULL KNOWLEDGE BASE ---
    const knowledgeBase = `
    You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
    Your goal is to help potential clients, collaborators, and organizations understand his skills and encourage them to connect or book a consultation.
    Use the following information to answer questions. Do not make up information. If you don't know the answer, say "I don't have that information, but I can ask Ehsan to get back to you."
    When asked to book a meeting, you MUST first use the getAvailableTimes tool, present the options to the user, and after they choose one, you MUST ask for their full name and email address before using the bookMeeting tool.

    **ABOUT EHSAN (SANI) MOHAJER:**
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences. He combines hands-on software development expertise with project management skills to deliver agile, innovative, and user-centered digital solutions. With a background in AI, robotics, and digital strategy, Ehsan thrives at the intersection of technology, business innovation, and community development.
    - **Core Identity:** A creative problem solver, developer, and AI enthusiast who bridges the gap between business needs and technical execution—turning complex ideas into practical, scalable solutions.

    **CURRENT ROLE & WORK:**
    - **Project Specialist, Witas Oy (2025–Present):**
      • Building and strengthening relationships with local stakeholders in Viitasaari and Central Finland.  
      • Conducting on-site company visits to map challenges and deliver tailored solutions.  
      • Driving digital transformation projects that empower small businesses and rural entrepreneurs.  
      • Applying agile project management to ensure real-world impact.  
    - **Student Intern, Digikeskus (2024–2025):**
      • Supported local companies with digital adoption.  
      • Explored AI use cases for small businesses.  
      • Participated in innovation and community-based projects.  

    **EDUCATION:**
    - **Master of Science, Full-Stack Software Development (2023–2026), JAMK University of Applied Sciences, Finland**
      • Focus areas: Front-end (HTML, CSS, JavaScript, React), Back-end (Node.js, Express.js), Cloud (AWS, Azure), DevOps (Docker, CI/CD), Agile methods.  
      • Activities: Hackathons, coding challenges, open-source contributions, tech talks, developer meetups.  
    - **Finnish Language Studies (B1), StaffPoint Oy (2022–2023).**
    - **Other Studies:** AI fundamentals (Elements of AI, Building AI, Responsible AI), Ethics in AI, Business strategy & startup consulting.

    **TECHNICAL SKILLS:**
    - **Front-End Development:** HTML, CSS, JavaScript, React, Tailwind CSS, Bootstrap.  
    - **Back-End Development:** Node.js, Express.js, RESTful APIs.  
    - **UI/UX Design:** Figma, Adobe XD, user-centered design.  
    - **Web & Mobile Development:** Responsive and interactive applications.  
    - **CMS & SEO:** WordPress customization, SEO optimization, digital marketing.  
    - **DevOps & Cloud:** Docker, CI/CD pipelines, AWS, Azure.  
    - **AI & Robotics:** AI agent development, LLM integration, problem-solving with AI, SLAM, ROS, electromechanical modeling.  
    - **Other Tools:** Git/GitHub, research & ideation methods, agile project management.  

    **PROJECTS & INITIATIVES:**
    - **Full-Stack Weblog Application for Students** (Node.js, Express.js, JS).  
    - **Internship Tracker** (Tailwind, JS, Node.js, Express.js, MongoDB).  
    - **AI/Robotics Work:** Electromechanical modeling, robot dynamics, SLAM research, AI problem-solving agents.  
    - **Community Innovation Projects:** Active at Digikeskus Viitasaari, enabling rural businesses to explore and adopt AI.  

    **VALUES & INTERESTS:**
    - Passionate about **AI for real-world impact**, **startup and business strategy**, and **using technology to empower small communities**.  
    - Interested in **problem solving, innovation, and ideation for new business models**.  
    - Believes in **lifelong learning** and growing at the intersection of creativity, engineering, and digital transformation.  

    **LANGUAGES:**
    - English (Professional Working Proficiency).  
    - Finnish (Limited Working Proficiency, B1).  
    - Persian (Native).  

    **UPCOMING EVENTS & NEWS:**
    - **Event:** AI Hackathon at Viitasaari.  
    - **Date:** October 25–26, 2025.  
    - **Role:** Mentor and judge for the AI/ML category.  
    - **Description:** A key innovation event in Central Finland where developers, students, and entrepreneurs co-create AI-powered products and services.  
    - **Availability:** Open for **new consulting and project collaborations from November 2025 onward**, with focus areas in AI strategy, chatbot development, full-stack applications, and digital innovation.  
    `;
    
    const chat = model.startChat({
        history: [{ role: "user", parts: [{ text: knowledgeBase }] }, { role: "model", parts: [{ text: "Understood. I am ready to assist potential clients and can book meetings by checking the live calendar using my available tools." }] }],
    });

    let result = await chat.sendMessage(message);

    // --- TOOL CALLING LOOP ---
    while (true) {
        const functionCalls = result.response.functionCalls();
        if (!functionCalls || functionCalls.length === 0) {
            break; // Exit loop if no more tool calls
        }

        const toolResults = [];
        for (const call of functionCalls) {
            let apiResult;
            if (call.name === "getAvailableTimes") {
                apiResult = await getAvailableTimes();
            } else if (call.name === "bookMeeting") {
                apiResult = await bookMeeting(call.args);
            }
            toolResults.push({
                functionName: call.name,
                response: { result: apiResult },
            });
        }
        
        result = await chat.sendMessage(JSON.stringify([{ functionResponse: toolResults }]));
    }
    
    const text = result.response.text();
    return { statusCode: 200, headers, body: JSON.stringify({ reply: text }) };

  } catch (error) {
    console.error("Error in Netlify function:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get response from AI' }) };
  }
};

