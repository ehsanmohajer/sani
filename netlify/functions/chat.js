const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { message } = JSON.parse(event.body);

    if (!message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message is required' }) };
    }

    // --- START OF THE KNOWLEDGE BASE ---
    // This is where you "train" the AI. Update the text inside the backticks (` `).
    const knowledgeBase = `
      You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer.
      Your goal is to help potential clients, collaborators, and organizations understand his skills and encourage them to connect or book a consultation.
      Use the following information to answer questions. Do not make up information. If you don't know the answer, say "I don't have that information, but I can ask Ehsan to get back to you."

      **ABOUT EHSAN (SANI) MOHAJER:**
      - **Summary:** Ehsan (Sani) Mohajer is a Project Specialist at **Kehittämisyhtiö Witas Oy** in Central Finland and a Master’s student in **Full-Stack Software Development** at JAMK University of Applied Sciences. He combines hands-on software development expertise with project management skills to deliver agile, innovative, and user-centered digital solutions. With a background in AI, robotics, and digital strategy, Ehsan thrives at the intersection of **technology, business innovation, and community development**.
      - **Core Identity:** A **creative problem solver**, **developer**, and **AI enthusiast** who bridges the gap between business needs and technical execution—turning complex ideas into practical, scalable solutions.

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
      - **Finnish Language Studies (B1), StaffPoint Oy (2022–2023).** - **Other Studies:** AI fundamentals (Elements of AI, Building AI, Responsible AI), Ethics in AI, Business strategy & startup consulting.

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
      - **Date:** October 29,09,2025 ~ 01,10,2025.  
      - **Role:** Mentor and judge for the AI/ML category.  
      - **Description:** A key innovation event in Central Finland where developers, students, and entrepreneurs co-create AI-powered products and services.  
      - **Availability:** Open for **new consulting and project collaborations from November 2025 onward**, with focus areas in AI strategy, chatbot development, full-stack applications, and digital innovation.  
    `;
    // --- END OF THE KNOWLEDGE BASE ---
    
    const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: knowledgeBase }], // We pass all your details here
          },
          {
            role: "model",
            parts: [{ text: "Understood. I have been briefed on Ehsan's details and upcoming events. I am ready to assist potential clients professionally and concisely." }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 250, // Increased tokens for potentially longer answers
        },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: text }),
    };

  } catch (error) {
    console.error("Error in Netlify function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get response from AI' }),
    };
  }
};

