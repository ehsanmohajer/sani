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

// --- HELPER FUNCTION TO GET CALENDLY EVENT TYPE URI ---
async function getEventTypeUri() {
  try {
    console.log("[DEBUG] Attempting to get Event Type URI...");
    console.log(`[DEBUG] Using Calendly Key starting with: ${CALENDLY_API_KEY.substring(0, 8)}...`);

    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        Authorization: `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to fetch user from Calendly. Status: ${userResponse.status}. Body: ${errorText}`);
    }

    const userData = await userResponse.json();
    const userUri = userData.resource.uri;
    console.log(`[DEBUG] Successfully fetched user URI: ${userUri}`);

    // ✅ Get event types for the user
    const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, {
      headers: {
        Authorization: `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventTypesResponse.ok) {
      const errorText = await eventTypesResponse.text();
      throw new Error(`Failed to fetch event types. Status: ${eventTypesResponse.status}. Body: ${errorText}`);
    }

    const eventTypesData = await eventTypesResponse.json();
    console.log(`[DEBUG] Found ${eventTypesData.collection.length} event types for user.`);

    const eventSlug = CALENDLY_EVENT_LINK.split('/').pop();
    console.log(`[DEBUG] Searching for event slug: '${eventSlug}'`);

    const eventType = eventTypesData.collection.find(et => et.slug === eventSlug);
    if (!eventType) {
      const foundSlugs = eventTypesData.collection.map(et => et.slug).join(', ');
      console.error(`[DEBUG] Event slug '${eventSlug}' NOT FOUND. Available slugs: [${foundSlugs}]`);
      throw new Error(`Event type with slug '${eventSlug}' not found.`);
    }

    console.log(`[DEBUG] Successfully found event type URI: ${eventType.uri}`);
    return eventType.uri;

  } catch (error) {
    console.error("[DEBUG] Error in getEventTypeUri:", error);
    throw error;
  }
}

// --- CALENDLY SCHEDULING FUNCTIONS ---
async function getAvailableTimes() {
  try {
    console.log("[DEBUG] Generating scheduling link for available times...");
    const eventTypeUri = await getEventTypeUri();

    const bookingResponse = await fetch('https://api.calendly.com/scheduling_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner: eventTypeUri,
        owner_type: "EventType",
        max_event_count: 1
      })
    });

    if (!bookingResponse.ok) {
      const errorText = await bookingResponse.text();
      throw new Error(`Failed to generate scheduling link. Status: ${bookingResponse.status}. Body: ${errorText}`);
    }

    const bookingData = await bookingResponse.json();
    const bookingUrl = bookingData.resource.booking_url;
    console.log(`[DEBUG] Scheduling link generated: ${bookingUrl}`);

    return `Here is the scheduling link to pick a time: ${bookingUrl}`;

  } catch (error) {
    console.error("[DEBUG] Error in getAvailableTimes:", error.message);
    return "I'm sorry, I cannot fetch available times right now. Please use this link to schedule: " + CALENDLY_EVENT_LINK;
  }
}

async function bookMeeting({ dateTime, userEmail, userName }) {
  try {
    console.log("[DEBUG] Creating scheduling link for booking...");
    const eventTypeUri = await getEventTypeUri();

    const bookingResponse = await fetch('https://api.calendly.com/scheduling_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner: eventTypeUri,
        owner_type: "EventType",
        max_event_count: 1
      })
    });

    if (!bookingResponse.ok) throw new Error('Failed to create Calendly booking link.');

    const bookingData = await bookingResponse.json();
    const bookingUrl = bookingData.resource.booking_url;

    const finalUrl = `${bookingUrl}?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}`;
    console.log(`[DEBUG] Final booking URL: ${finalUrl}`);

    return `Great! I've prepared a booking link for you to confirm the time: ${finalUrl}. Ehsan has also been notified of your request.`;

  } catch (error) {
    console.error("Error booking Calendly meeting:", error.message);
    return "I'm sorry, there was an error with the booking system. Please use this link to book directly: " + CALENDLY_EVENT_LINK;
  }
}

// --- LEAD CAPTURE FUNCTION ---
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
      await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject: subject, html: body });
      console.log("Lead capture email sent successfully.");
    } catch (error) {
      console.error("Error sending lead capture email:", error);
    }
  }
}

// --- TOOLS DECLARATION FOR AI ---
const tools = [
  {
    functionDeclarations: [
      {
        name: "getAvailableTimes",
        description: "Gets Ehsan's next 5 available meeting slots via Calendly."
      },
      {
        name: "bookMeeting",
        description: "Books a meeting in Ehsan's calendar using Calendly link.",
        parameters: {
          type: "OBJECT",
          properties: {
            dateTime: { type: "STRING", description: "The ISO 8601 string of the chosen date and time." },
            userEmail: { type: "STRING", description: "User's email address." },
            userName: { type: "STRING", description: "User's full name." }
          },
          required: ["dateTime", "userEmail", "userName"]
        }
      }
    ]
  }
];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", tools });

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async function(event, context) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { message } = JSON.parse(event.body);
    if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };

    await captureLead(message);

    const knowledgeBase = `
    You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
    You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
    Your goal is to help potential clients, collaborators, and organizations understand his skills and encourage them to connect or book a consultation.
    Your goal is to help potential clients, collaborators, and organizations understand his skills and encourage them to connect or book a consultation.
    Use the following information to answer questions. Do not make up information. If you don't know the answer, say "I don't have that information, but I can ask Ehsan to get back to you."
    Use the following information to answer questions. Do not make up information. If you don't know the answer, say "I don't have that information, but I can ask Ehsan to get back to you."
    When asked to book a meeting, you MUST first use the getAvailableTimes tool, present the options to the user, and after they choose one, you MUST ask for their full name and email address before using the bookMeeting tool.
    When asked to book a meeting, you MUST first use the getAvailableTimes tool, present the options to the user, and after they choose one, you MUST ask for their full name and email address before using the bookMeeting tool.
    **ABOUT EHSAN (SANI) MOHAJER:**
    **ABOUT EHSAN (SANI) MOHAJER:**
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences.He combines hands-on software development expertise with project management skills to deliver agile, innovative, and user-centered digital solutions. With a background in AI, robotics, and digital strategy, Ehsan thrives at the intersection of technology, business innovation, and community development.
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences.He combines hands-on software development expertise with project management skills to deliver agile, innovative, and user-centered digital solutions. With a background in AI, robotics, and digital strategy, Ehsan thrives at the intersection of technology, business innovation, and community development.
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences.
    - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at Kehittämisyhtiö Witas Oy in Central Finland and a Master’s student in Full-Stack Software Development at JAMK University of Applied Sciences.
    - **Core Identity:** A creative problem solver, developer, and AI enthusiast who bridges the gap between business needs and technical execution—turning complex ideas into practical, scalable solutions.
    - **Core Identity:** A creative problem solver, developer, and AI enthusiast who bridges the gap between business needs and technical execution—turning complex ideas into practical, scalable solutions.
    // ... (rest of your knowledge base)
    // ... (rest of your knowledge base)
    **CURRENT ROLE & WORK:**
    **CURRENT ROLE & WORK:**
    - **Project Specialist, Witas Oy (2025–Present):**
    - **Project Specialist, Witas Oy (2025–Present):**
      • Building and strengthening relationships with local stakeholders in Viitasaari and Central Finland.  
      • Building and strengthening relationships with local stakeholders in Viitasaari and Central Finland.  
      • Conducting on-site company visits to map challenges and deliver tailored solutions.  
      • Conducting on-site company visits to map challenges and deliver tailored solutions.  
      • Driving digital transformation projects that empower small businesses and rural entrepreneurs.  
      • Driving digital transformation projects that empower small businesses and rural entrepreneurs.  
      • Applying agile project management to ensure real-world impact.  
      • Applying agile project management to ensure real-world impact.  
    - **Student Intern, Digikeskus (2024–2025):**
    - **Student Intern, Digikeskus (2024–2025):**
      • Supported local companies with digital adoption.  
      • Supported local companies with digital adoption.  
      • Explored AI use cases for small businesses.  
      • Explored AI use cases for small businesses.  
      • Participated in innovation and community-based projects.  
      • Participated in innovation and community-based projects.  
    **EDUCATION:**
    **EDUCATION:**
    - **Master of Science, Full-Stack Software Development (2023–2026), JAMK University of Applied Sciences, Finland**
    - **Master of Science, Full-Stack Software Development (2023–2026), JAMK University of Applied Sciences, Finland**
      • Focus areas: Front-end (HTML, CSS, JavaScript, React), Back-end (Node.js, Express.js), Cloud (AWS, Azure), DevOps (Docker, CI/CD), Agile methods.  
      • Focus areas: Front-end (HTML, CSS, JavaScript, React), Back-end (Node.js, Express.js), Cloud (AWS, Azure), DevOps (Docker, CI/CD), Agile methods.  
      • Activities: Hackathons, coding challenges, open-source contributions, tech talks, developer meetups.  
      • Activities: Hackathons, coding challenges, open-source contributions, tech talks, developer meetups.  
    - **Finnish Language Studies (B1), StaffPoint Oy (2022–2023).**
    - **Finnish Language Studies (B1), StaffPoint Oy (2022–2023).**
    - **Other Studies:** AI fundamentals (Elements of AI, Building AI, Responsible AI), Ethics in AI, Business strategy & startup consulting.
    - **Other Studies:** AI fundamentals (Elements of AI, Building AI, Responsible AI), Ethics in AI, Business strategy & startup consulting.
    **TECHNICAL SKILLS:**
    **TECHNICAL SKILLS:**
    - **Front-End Development:** HTML, CSS, JavaScript, React, Tailwind CSS, Bootstrap.  
    - **Front-End Development:** HTML, CSS, JavaScript, React, Tailwind CSS, Bootstrap.  
    - **Back-End Development:** Node.js, Express.js, RESTful APIs.  
    - **Back-End Development:** Node.js, Express.js, RESTful APIs.  
    - **UI/UX Design:** Figma, Adobe XD, user-centered design.  
    - **UI/UX Design:** Figma, Adobe XD, user-centered design.  
    - **Web & Mobile Development:** Responsive and interactive applications.  
    - **Web & Mobile Development:** Responsive and interactive applications.  
    - **CMS & SEO:** WordPress customization, SEO optimization, digital marketing.  
    - **CMS & SEO:** WordPress customization, SEO optimization, digital marketing.  
    - **DevOps & Cloud:** Docker, CI/CD pipelines, AWS, Azure.  
    - **DevOps & Cloud:** Docker, CI/CD pipelines, AWS, Azure.  
    - **AI & Robotics:** AI agent development, LLM integration, problem-solving with AI, SLAM, ROS, electromechanical modeling.  
    - **AI & Robotics:** AI agent development, LLM integration, problem-solving with AI, SLAM, ROS, electromechanical modeling.  
    - **Other Tools:** Git/GitHub, research & ideation methods, agile project management.  
    - **Other Tools:** Git/GitHub, research & ideation methods, agile project management.  
    **PROJECTS & INITIATIVES:**
    **PROJECTS & INITIATIVES:**
    - **Full-Stack Weblog Application for Students** (Node.js, Express.js, JS).  
    - **Full-Stack Weblog Application for Students** (Node.js, Express.js, JS).  
    - **Internship Tracker** (Tailwind, JS, Node.js, Express.js, MongoDB).  
    - **Internship Tracker** (Tailwind, JS, Node.js, Express.js, MongoDB).  
    - **AI/Robotics Work:** Electromechanical modeling, robot dynamics, SLAM research, AI problem-solving agents.  
    - **AI/Robotics Work:** Electromechanical modeling, robot dynamics, SLAM research, AI problem-solving agents.  
    - **Community Innovation Projects:** Active at Digikeskus Viitasaari, enabling rural businesses to explore and adopt AI.  
    - **Community Innovation Projects:** Active at Digikeskus Viitasaari, enabling rural businesses to explore and adopt AI.  
    **VALUES & INTERESTS:**
    **VALUES & INTERESTS:**
    - Passionate about **AI for real-world impact**, **startup and business strategy**, and **using technology to empower small communities**.  
    - Passionate about **AI for real-world impact**, **startup and business strategy**, and **using technology to empower small communities**.  
    - Interested in **problem solving, innovation, and ideation for new business models**.  
    - Interested in **problem solving, innovation, and ideation for new business models**.  
    - Believes in **lifelong learning** and growing at the intersection of creativity, engineering, and digital transformation.  
    - Believes in **lifelong learning** and growing at the intersection of creativity, engineering, and digital transformation.  
    **LANGUAGES:**
    **LANGUAGES:**
    - English (Professional Working Proficiency).  
    - English (Professional Working Proficiency).  
    - Finnish (Limited Working Proficiency, B1).  
    - Finnish (Limited Working Proficiency, B1).  
    - Persian (Native).  
    - Persian (Native).  
    **UPCOMING EVENTS & NEWS:**
    **UPCOMING EVENTS & NEWS:**
    - **Event:** AI Hackathon at Viitasaari.  
    - **Event:** AI Hackathon at Viitasaari.  
    - **Date:** October 25–26, 2025.  
    - **Date:** October 25–26, 2025.  
    - **Role:** Mentor and judge for the AI/ML category.  
    - **Role:** Mentor and judge for the AI/ML category.  
    - **Description:** A key innovation event in Central Finland where developers, students, and entrepreneurs co-create AI-powered products and services.  
    - **Description:** A key innovation event in Central Finland where developers, students, and entrepreneurs co-create AI-powered products and services.  
    - **Availability:** Open for **new consulting and project collaborations from November 2025 onward**, with focus areas in AI strategy, chatbot development, full-stack applications, and digital innovation.
    - **Availability:** Open for **new consulting and project collaborations from November 2025 onward**, with focus areas in AI strategy, chatbot development, full-stack applications, and digital innovation.
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: knowledgeBase }] },
        { role: "model", parts: [{ text: "Understood. I am ready to assist and can schedule meetings using my tools." }] }
      ]
    });

    let result = await chat.sendMessage(message);

    while (true) {
      const functionCalls = result.response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) break;

      const toolResults = [];
      for (const call of functionCalls) {
        let apiResult;
        if (call.name === "getAvailableTimes") apiResult = await getAvailableTimes();
        else if (call.name === "bookMeeting") apiResult = await bookMeeting(call.args);
        toolResults.push({ functionName: call.name, response: { result: apiResult } });
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
