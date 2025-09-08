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

// --- SIMPLIFIED CALENDLY FUNCTIONS ---
async function getAvailableTimes() {
  console.log("[DEBUG] Returning Calendly link for booking...");
  return `Great! Here’s Ehsan’s Calendly link to choose a time that works for you: ${CALENDLY_EVENT_LINK}. Once you’ve booked, please provide your full name and email so we can confirm your meeting.`;
}

async function bookMeeting({ userName, userEmail }) {
  console.log("[DEBUG] Booking via Calendly API disabled. Returning direct link.");
  return `You can finalize your meeting directly here: ${CALENDLY_EVENT_LINK}?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}`;
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
    const body = `<p>Hi Ehsan,</p><p>Your AI assistant captured a new lead from your website.</p><p><strong>Contact Info:</strong> ${contactInfo}</p><p><strong>Message:</strong> "${message}"</p>`;

    try {
      await resend.emails.send({ from: 'onboarding@resend.dev', to: 'ehsanmohajer066@gmail.com', subject, html: body });
      console.log("Lead capture email sent successfully.");
    } catch (error) {
      console.error("Error sending lead capture email:", error);
    }
  }
}

// --- AI TOOLS ---
const tools = [
  {
    functionDeclarations: [
      { name: "getAvailableTimes", description: "Shares Ehsan's Calendly link for booking a 30-minute meeting." },
      { 
        name: "bookMeeting", 
        description: "Provides the Calendly link to finalize a meeting.", 
        parameters: { 
          type: "OBJECT", 
          properties: { 
            userName: { type: "STRING", description: "User's full name." }, 
            userEmail: { type: "STRING", description: "User's email address." } 
          }, 
          required: ["userName", "userEmail"] 
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
        { role: "model", parts: [{ text: "Understood. I am ready to assist and can share the Calendly link." }] }
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
